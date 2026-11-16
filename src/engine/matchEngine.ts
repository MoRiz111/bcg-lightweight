import { db } from '../db/database';
import type {
  BallEvent,
  BatterInningsCard,
  BowlerInningsCard,
  Innings,
  Match,
  MatchFormat,
  Player,
} from '../types/cricket';
import { rollBallOutcome, rollDrsOverturn } from './probabilities';

function buildInnings(
  inningsNumber: 1 | 2 | 3 | 4,
  battingTeamId: string,
  bowlingTeamId: string,
  battingXI: Player[],
  bowlingXI: Player[],
  activeWicketkeeperId: string,
  format: MatchFormat,
  target?: number
): Innings {
  const battingCard: Record<string, BatterInningsCard> = {};
  battingXI.forEach((p) => {
    battingCard[p.id] = {
      playerId: p.id,
      name: p.name,
      runs: 0,
      balls: 0,
      fours: 0,
      sixes: 0,
      isOut: false,
    };
  });

  const bowlingCard: Record<string, BowlerInningsCard> = {};
  bowlingXI.forEach((p) => {
    bowlingCard[p.id] = {
      playerId: p.id,
      name: p.name,
      overs: 0,
      ballsBowled: 0,
      maidens: 0,
      runsConceded: 0,
      wickets: 0,
      currentOverRuns: 0,
    };
  });

  return {
    inningsNumber,
    battingTeamId,
    bowlingTeamId,
    runs: 0,
    wickets: 0,
    overs: 0,
    ballsInCurrentOver: 0,
    target,
    extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0, total: 0 },
    drsRemaining: format === 'TEST' ? 3 : 2,
    battingCard,
    bowlingCard,
    battingOrder: battingXI.map((p) => p.id),
    bowlingOrder: [], // Populated strictly when a bowler actually bowls a ball
    activeWicketkeeperId,
  };
}

// Pre-selects the next bowler in spells:
// 1. After Over 1: selects designated 2nd opening bowler (B2)
// 2. Subsequent overs: alternates back to the other-end spell partner (previousOverBowlerId) if they still have overs left
// 3. If spell partner hit their over quota (4 in T20 / 10 in ODI): picks randomly from eligible BOWLER / ALL_ROUNDER players
export async function getNextSpellBowler(
  match: Match,
  justFinishedBowlerId: string,
  otherEndBowlerId?: string
): Promise<string> {
  const innings = match.inningsList[match.inningsList.length - 1];
  const openingPair =
    innings.bowlingTeamId === match.teamAId
      ? match.openingBowlersA
      : match.openingBowlersB;

  const maxOvers = match.state.isSuperOver
    ? 1
    : match.format === 'T20'
    ? 4
    : match.format === 'ODI'
    ? 10
    : 999;

  const isEligible = (playerId?: string): playerId is string => {
    if (!playerId) return false;
    if (playerId === justFinishedBowlerId) return false;
    if (playerId === innings.activeWicketkeeperId) return false;
    const card = innings.bowlingCard[playerId];
    if (!card) return false;
    return Math.floor(card.ballsBowled / 6) < maxOvers;
  };

  // 1. Going into Over 2: pre-select designated 2nd opening bowler if eligible
  if (match.state.currentOver === 1 && isEligible(openingPair?.[1])) {
    return openingPair[1];
  }

  // 2. Continue the spell from the other end (e.g., Starc -> Hazlewood -> Starc) if quota remains
  if (isEligible(otherEndBowlerId)) {
    return otherEndBowlerId;
  }

  // 3. Spell partner finished their quota (or is unavailable): pick randomly from eligible BOWLER / ALL_ROUNDER
  const allPlayers = await db.players.toArray();
  const playerMap = new Map(allPlayers.map((p) => [p.id, p]));

  const eligibleCards = Object.values(innings.bowlingCard).filter((b) =>
    isEligible(b.playerId)
  );

  const specialistAndAllRounders = eligibleCards.filter((b) => {
    const role = playerMap.get(b.playerId)?.role;
    return role === 'BOWLER' || role === 'ALL_ROUNDER';
  });

  const pool =
    specialistAndAllRounders.length > 0
      ? specialistAndAllRounders
      : eligibleCards;

  if (pool.length === 0) return justFinishedBowlerId;
  return pool[Math.floor(Math.random() * pool.length)].playerId;
}

// Synchronous helper if needed by UI components
export function getSuggestedNextBowler(match: Match): string {
  const innings = match.inningsList[match.inningsList.length - 1];
  const maxOvers = match.state.isSuperOver
    ? 1
    : match.format === 'T20'
    ? 4
    : match.format === 'ODI'
    ? 10
    : 999;

  const eligible = Object.values(innings.bowlingCard).filter(
    (b) =>
      b.playerId !== match.state.currentBowlerId &&
      b.playerId !== innings.activeWicketkeeperId &&
      Math.floor(b.ballsBowled / 6) < maxOvers
  );

  if (eligible.length === 0) return match.state.currentBowlerId;
  return eligible[0].playerId;
}

// Manual bowler change between overs (or before first ball of an innings)
export async function selectNextBowler(
  matchId: string,
  bowlerId: string
): Promise<void> {
  const match = await db.matches.get(matchId);
  if (!match || match.status !== 'LIVE') return;
  if (match.state.currentBall !== 0) return;

  // Note: previousBowlerId already holds the bowler who bowled the just-completed over;
  // overriding currentBowlerId here starts a new spell from this end without overwriting previousBowlerId
  match.state.currentBowlerId = bowlerId;
  await db.matches.put(match);
}

// Swap wicketkeeping duties when current keeper bowls:
// - If replacement is a WICKETKEEPER: permanent swap for the rest of the match
// - If replacement is NOT a wicketkeeper: temporary 1-over stand-in; original keeper gets gloves back after the over
export async function swapActiveWicketkeeper(
  matchId: string,
  newKeeperId: string
): Promise<void> {
  const match = await db.matches.get(matchId);
  if (!match) return;
  const innings = match.inningsList[match.inningsList.length - 1];
  const previousKeeperId = innings.activeWicketkeeperId;
  const replacementPlayer = await db.players.get(newKeeperId);

  const isGenuineKeeper =
    replacementPlayer?.role === 'WICKETKEEPER' ||
    Boolean(replacementPlayer?.isWicketkeeper);

  innings.activeWicketkeeperId = newKeeperId;

  if (isGenuineKeeper) {
    innings.standInReturnKeeperId = undefined;
    if (innings.bowlingTeamId === match.teamAId) {
      match.wicketkeeperAId = newKeeperId;
    } else {
      match.wicketkeeperBId = newKeeperId;
    }
  } else {
    innings.standInReturnKeeperId =
      innings.standInReturnKeeperId ?? previousKeeperId;
  }

  await db.matches.put(match);
}

// Swap/reorder batting lineup; if 0 balls bowled in innings, also updates striker & non-striker
export async function adjustBattingOrder(
  matchId: string,
  newBattingOrder: string[]
): Promise<void> {
  const match = await db.matches.get(matchId);
  if (!match || match.status !== 'LIVE') return;
  const innings = match.inningsList[match.inningsList.length - 1];
  innings.battingOrder = newBattingOrder;

  if (match.state.currentOver === 0 && match.state.currentBall === 0) {
    match.state.strikerId = newBattingOrder[0];
    match.state.nonStrikerId = newBattingOrder[1];
  }

  await db.matches.put(match);
}

async function syncCareerStats(match: Match): Promise<void> {
  const allPlayers = await db.players.toArray();
  const playerMap = new Map(allPlayers.map((p) => [p.id, structuredClone(p)]));

  for (const innings of match.inningsList) {
    Object.values(innings.battingCard).forEach((card, idx) => {
      const player = playerMap.get(card.playerId);
      const didBat =
        card.balls > 0 || card.isOut || idx <= innings.wickets + 1;
      if (!player || !didBat) return;

      player.batting.runs += card.runs;
      player.batting.balls += card.balls;
      player.batting.fours += card.fours;
      player.batting.sixes += card.sixes;
      if (!card.isOut) player.batting.notOuts += 1;
      if (card.runs > player.batting.highest) player.batting.highest = card.runs;
      if (card.runs >= 200) player.batting.twoHundreds += 1;
      else if (card.runs >= 100) player.batting.hundreds += 1;
      else if (card.runs >= 50) player.batting.fifties += 1;
      else if (card.runs >= 30) player.batting.thirties += 1;
    });

    Object.values(innings.bowlingCard).forEach((card) => {
      const player = playerMap.get(card.playerId);
      if (!player || card.ballsBowled === 0) return;

      player.bowling.ballsBowled += card.ballsBowled;
      player.bowling.overs =
        Math.floor(player.bowling.ballsBowled / 6) +
        (player.bowling.ballsBowled % 6) / 10;
      player.bowling.runsConceded += card.runsConceded;
      player.bowling.maidens += card.maidens;
      player.bowling.wickets += card.wickets;
    });
  }

  await db.players.bulkPut(Array.from(playerMap.values()));
}

function getDefaultOpeningPair(xi: Player[]): [string, string] {
  const bowlers = [...xi]
    .reverse()
    .filter((p) => p.role === 'BOWLER' || p.role === 'ALL_ROUNDER');
  const b1 = bowlers[0]?.id ?? xi[xi.length - 1].id;
  const b2 = bowlers[1]?.id ?? xi[xi.length - 2].id;
  return [b1, b2];
}

export async function startQuickMatch(
  teamAId: string,
  teamBId: string,
  format: MatchFormat = 'T20',
  options?: {
    playingXIA?: string[];
    playingXIB?: string[];
    openingBowlersA?: [string, string];
    openingBowlersB?: [string, string];
    wicketkeeperAId?: string;
    wicketkeeperBId?: string;
    allowSuperOver?: boolean;
    infiniteSuperOvers?: boolean;
  }
): Promise<string> {
  const allA = await db.players.where('teamId').equals(teamAId).toArray();
  const allB = await db.players.where('teamId').equals(teamBId).toArray();

  const teamAPlayers = options?.playingXIA
    ? options.playingXIA.map((id) => allA.find((p) => p.id === id)!)
    : allA.slice(0, 11);

  const teamBPlayers = options?.playingXIB
    ? options.playingXIB.map((id) => allB.find((p) => p.id === id)!)
    : allB.slice(0, 11);

  const openingBowlersA =
    options?.openingBowlersA ?? getDefaultOpeningPair(teamAPlayers);
  const openingBowlersB =
    options?.openingBowlersB ?? getDefaultOpeningPair(teamBPlayers);

  const wicketkeeperAId =
    options?.wicketkeeperAId ??
    teamAPlayers.find((p) => p.isWicketkeeper || p.role === 'WICKETKEEPER')?.id ??
    teamAPlayers[3].id;

  const wicketkeeperBId =
    options?.wicketkeeperBId ??
    teamBPlayers.find((p) => p.isWicketkeeper || p.role === 'WICKETKEEPER')?.id ??
    teamBPlayers[3].id;

  const totalOvers = format === 'T20' ? 20 : format === 'ODI' ? 50 : 90;

  const firstInnings = buildInnings(
    1,
    teamAId,
    teamBId,
    teamAPlayers,
    teamBPlayers,
    wicketkeeperBId,
    format
  );

  const matchId = `match_${Date.now()}`;
  const match: Match = {
    id: matchId,
    format,
    teamAId,
    teamBId,
    playingXIA: teamAPlayers.map((p) => p.id),
    playingXIB: teamBPlayers.map((p) => p.id),
    openingBowlersA,
    openingBowlersB,
    wicketkeeperAId,
    wicketkeeperBId,
    totalOvers,
    allowSuperOver: options?.allowSuperOver ?? format !== 'TEST',
    infiniteSuperOvers: options?.infiniteSuperOvers ?? false,
    status: 'LIVE',
    state: {
      strikerId: teamAPlayers[0].id,
      nonStrikerId: teamAPlayers[1].id,
      currentBowlerId: openingBowlersB[0],
      currentOver: 0,
      currentBall: 0,
      totalRuns: 0,
      wickets: 0,
      innings: 1,
      isFreeHit: false,
      isSuperOver: false,
      superOverCount: 0,
      lastBallOutcome: 'Match started!',
    },
    inningsList: [firstInnings],
    createdAt: Date.now(),
  };

  await db.matches.add(match);
  return matchId;
}

export async function startSuperOver(matchId: string): Promise<void> {
  const match = await db.matches.get(matchId);
  if (!match) return;

  const allPlayers = await db.players.toArray();
  const teamAPlayers = match.playingXIA.map((id) => allPlayers.find((p) => p.id === id)!);
  const teamBPlayers = match.playingXIB.map((id) => allPlayers.find((p) => p.id === id)!);

  const openerBowler = match.openingBowlersA?.[0] ?? teamAPlayers[10].id;
  const keeperA =
    match.wicketkeeperAId ??
    teamAPlayers.find((p) => p.role === 'WICKETKEEPER')?.id ??
    teamAPlayers[3].id;

  const superInnings = buildInnings(
    1,
    match.teamBId,
    match.teamAId,
    teamBPlayers,
    teamAPlayers,
    keeperA,
    'T20'
  );

  match.status = 'LIVE';
  match.totalOvers = 1;
  match.inningsList = [superInnings];
  match.state = {
    strikerId: teamBPlayers[0].id,
    nonStrikerId: teamBPlayers[1].id,
    currentBowlerId: openerBowler,
    currentOver: 0,
    currentBall: 0,
    totalRuns: 0,
    wickets: 0,
    innings: 1,
    isFreeHit: false,
    isSuperOver: true,
    superOverCount: match.state.superOverCount + 1,
    lastBallOutcome: `Super Over #${match.state.superOverCount + 1} started!`,
  };

  await db.matches.put(match);
}

export async function playNextBall(matchId: string): Promise<void> {
  const match = await db.matches.get(matchId);
  if (!match || match.status !== 'LIVE') return;

  const state = { ...match.state };
  const inningsIdx = match.inningsList.length - 1;
  const innings = structuredClone(match.inningsList[inningsIdx]);
  if (!innings.bowlingOrder) innings.bowlingOrder = [];

  // Record current bowler in chronological bowlingOrder ONLY when they actually bowl a delivery
  if (!innings.bowlingOrder.includes(state.currentBowlerId)) {
    innings.bowlingOrder.push(state.currentBowlerId);
  }

  const striker = innings.battingCard[state.strikerId];
  const bowler = innings.bowlingCard[state.currentBowlerId];
  const outcome = rollBallOutcome(match.format);

  let isWicket = outcome.isWicket;
  if (state.isFreeHit && isWicket && outcome.dismissalType !== 'RUN_OUT') {
    isWicket = false;
  }

  let drsOverturned = false;
  if (
    isWicket &&
    innings.drsRemaining > 0 &&
    (outcome.dismissalType === 'LBW' || outcome.dismissalType === 'CAUGHT')
  ) {
    if (Math.random() < 0.35) {
      innings.drsRemaining -= 1;
      if (rollDrsOverturn(outcome.dismissalType)) {
        isWicket = false;
        drsOverturned = true;
      }
    }
  }

  const isLegalDelivery =
    outcome.extrasType !== 'WIDE' && outcome.extrasType !== 'NO_BALL';
  const totalBallRuns = outcome.runs + outcome.extraRuns;

  innings.runs += totalBallRuns;
  if (outcome.extrasType === 'WIDE') innings.extras.wides += outcome.extraRuns;
  if (outcome.extrasType === 'NO_BALL') innings.extras.noBalls += outcome.extraRuns;
  if (outcome.extrasType === 'BYE') innings.extras.byes += outcome.extraRuns;
  if (outcome.extrasType === 'LEG_BYE') innings.extras.legByes += outcome.extraRuns;
  innings.extras.total += outcome.extraRuns;

  if (outcome.extrasType !== 'WIDE') striker.balls += 1;
  if (!outcome.extrasType || outcome.extrasType === 'NO_BALL') {
    striker.runs += outcome.runs;
    if (outcome.runs === 4) striker.fours += 1;
    if (outcome.runs === 6) striker.sixes += 1;
  }

  if (outcome.extrasType !== 'BYE' && outcome.extrasType !== 'LEG_BYE') {
    bowler.runsConceded += totalBallRuns;
    bowler.currentOverRuns += totalBallRuns;
  }

  const allPlayersForLookup = await db.players.toArray();
  const bowlerProfile = allPlayersForLookup.find((p) => p.id === bowler.playerId);
  const isOutrightFastBowler =
    bowlerProfile?.bowlingStyle === 'RF' || bowlerProfile?.bowlingStyle === 'LF';

  let effectiveDismissal = outcome.dismissalType;
  if (isWicket && effectiveDismissal === 'STUMPED' && isOutrightFastBowler) {
    effectiveDismissal = 'CAUGHT';
  }

  const fieldingIds = Object.keys(innings.bowlingCard).filter(
    (id) => id !== bowler.playerId
  );
  const isKeeperCatch =
    effectiveDismissal === 'CAUGHT' &&
    outcome.dismissalType === 'STUMPED' &&
    isOutrightFastBowler;

  const chosenFielderId =
    effectiveDismissal === 'STUMPED' || isKeeperCatch
      ? innings.activeWicketkeeperId
      : fieldingIds[Math.floor(Math.random() * fieldingIds.length)];

  const fielderName = innings.bowlingCard[chosenFielderId]?.name ?? 'Sub';
  const isKeeperFielder = chosenFielderId === innings.activeWicketkeeperId;

  const maxWickets = state.isSuperOver ? 2 : 10;
  let outcomeLabel = `${totalBallRuns}`;

  if (drsOverturned) {
    outcomeLabel = 'NOT OUT (DRS Overturned!)';
  } else if (isWicket) {
    innings.wickets += 1;
    striker.isOut = true;
    if (effectiveDismissal !== 'RUN_OUT') bowler.wickets += 1;

    striker.dismissalText =
      effectiveDismissal === 'CAUGHT'
        ? `c ${isKeeperFielder ? '†' : ''}${fielderName} b ${bowler.name}`
        : effectiveDismissal === 'RUN_OUT'
        ? `run out (${fielderName})`
        : effectiveDismissal === 'LBW'
        ? `lbw b ${bowler.name}`
        : effectiveDismissal === 'STUMPED'
        ? `st †${fielderName} b ${bowler.name}`
        : `b ${bowler.name}`;

    outcomeLabel = `WICKET! (${striker.dismissalText})`;

    if (innings.wickets < maxWickets) {
      const nextBatterId = innings.battingOrder[innings.wickets + 1];
      if (nextBatterId) state.strikerId = nextBatterId;
    }
  } else if (outcome.extrasType) {
    outcomeLabel = `${outcome.extraRuns}${
      outcome.extrasType === 'WIDE'
        ? 'wd'
        : outcome.extrasType === 'NO_BALL'
        ? 'nb'
        : outcome.extrasType === 'BYE'
        ? 'b'
        : 'lb'
    }`;
  } else if (outcome.runs === 4) {
    outcomeLabel = 'FOUR!';
  } else if (outcome.runs === 6) {
    outcomeLabel = 'SIX!';
  }

  state.isFreeHit = outcome.extrasType === 'NO_BALL';

  if (totalBallRuns % 2 === 1) {
    [state.strikerId, state.nonStrikerId] = [state.nonStrikerId, state.strikerId];
  }

  const eventOver = state.currentOver;
  const eventBall = state.currentBall + 1;

  if (isLegalDelivery) {
    bowler.ballsBowled += 1;
    bowler.overs =
      Math.floor(bowler.ballsBowled / 6) + (bowler.ballsBowled % 6) / 10;
    innings.ballsInCurrentOver += 1;
    state.currentBall += 1;

    if (state.currentBall === 6) {
      if (bowler.currentOverRuns === 0) bowler.maidens += 1;
      bowler.currentOverRuns = 0;

      if (innings.standInReturnKeeperId) {
        innings.activeWicketkeeperId = innings.standInReturnKeeperId;
        innings.standInReturnKeeperId = undefined;
      }

      state.currentOver += 1;
      state.currentBall = 0;
      innings.overs = state.currentOver;
      innings.ballsInCurrentOver = 0;

      [state.strikerId, state.nonStrikerId] = [state.nonStrikerId, state.strikerId];

      // Capture the other-end spell partner BEFORE updating previousBowlerId
      const otherEndBowlerId = state.previousBowlerId;
      const justFinishedBowlerId = state.currentBowlerId;

      match.inningsList[inningsIdx] = innings;
      match.state = state;

      state.previousBowlerId = justFinishedBowlerId;
      state.currentBowlerId = await getNextSpellBowler(
        match,
        justFinishedBowlerId,
        otherEndBowlerId
      );
    } else {
      innings.overs = state.currentOver + state.currentBall / 10;
    }
  }

  state.totalRuns = innings.runs;
  state.wickets = innings.wickets;
  state.lastBallOutcome = `${eventOver}.${eventBall} ${bowler.name} to ${striker.name}: ${outcomeLabel}`;
  match.inningsList[inningsIdx] = innings;

  const oversFinished = state.currentOver >= match.totalOvers;
  const allOut = innings.wickets >= maxWickets;
  const targetChased =
    innings.target !== undefined && innings.runs >= innings.target;

  const isFinalInnings =
    match.format === 'TEST' && !state.isSuperOver
      ? innings.inningsNumber === 4
      : innings.inningsNumber === 2;

  if (!isFinalInnings && (oversFinished || allOut)) {
    const nextInningsNum = (innings.inningsNumber + 1) as 2 | 3 | 4;
    const allPlayers = await db.players.toArray();
    const nextBatTeamId = innings.bowlingTeamId;
    const nextBowlTeamId = innings.battingTeamId;

    const nextBatXI = (
      nextBatTeamId === match.teamAId ? match.playingXIA : match.playingXIB
    ).map((id) => allPlayers.find((p) => p.id === id)!);

    const nextBowlXI = (
      nextBowlTeamId === match.teamAId ? match.playingXIA : match.playingXIB
    ).map((id) => allPlayers.find((p) => p.id === id)!);

    const nextOpeningBowler =
      nextBowlTeamId === match.teamAId
        ? match.openingBowlersA?.[0] ?? nextBowlXI[10].id
        : match.openingBowlersB?.[0] ?? nextBowlXI[10].id;

    const nextKeeper =
      nextBowlTeamId === match.teamAId
        ? match.wicketkeeperAId
        : match.wicketkeeperBId;

    let nextTarget: number | undefined = undefined;
    if (match.format !== 'TEST' || state.isSuperOver) {
      nextTarget = innings.runs + 1;
    } else if (nextInningsNum === 4) {
      const teamARuns =
        match.inningsList[0].runs + (match.inningsList[2]?.runs ?? 0);
      const teamBRuns = match.inningsList[1].runs;
      nextTarget = teamARuns - teamBRuns + 1;
    }

    const nextInnings = buildInnings(
      nextInningsNum,
      nextBatTeamId,
      nextBowlTeamId,
      nextBatXI,
      nextBowlXI,
      nextKeeper,
      match.format,
      nextTarget
    );

    match.inningsList.push(nextInnings);
    match.state = {
      strikerId: nextBatXI[0].id,
      nonStrikerId: nextBatXI[1].id,
      currentBowlerId: nextOpeningBowler,
      currentOver: 0,
      currentBall: 0,
      totalRuns: 0,
      wickets: 0,
      target: nextTarget,
      innings: nextInningsNum,
      isFreeHit: false,
      isSuperOver: state.isSuperOver,
      superOverCount: state.superOverCount,
      lastBallOutcome: nextTarget
        ? `Innings ${nextInningsNum} begins! Target: ${nextTarget}`
        : `Innings ${nextInningsNum} begins!`,
    };
  } else if (isFinalInnings && (targetChased || oversFinished || allOut)) {
    const battingTeam = await db.teams.get(innings.battingTeamId);
    const bowlingTeam = await db.teams.get(innings.bowlingTeamId);

    const battingTotal =
      match.format === 'TEST' && !state.isSuperOver
        ? match.inningsList[1].runs + innings.runs
        : innings.runs;
    const bowlingTotal =
      match.format === 'TEST' && !state.isSuperOver
        ? match.inningsList[0].runs + match.inningsList[2].runs
        : match.inningsList[0].runs;

    match.state = state;

    if (targetChased) {
      match.status = 'COMPLETED';
      match.result = `${battingTeam?.name} won by ${maxWickets - innings.wickets} wickets`;
      await syncCareerStats(match);
    } else if (battingTotal < bowlingTotal) {
      match.status = 'COMPLETED';
      match.result = `${bowlingTeam?.name} won by ${bowlingTotal - battingTotal} runs`;
      await syncCareerStats(match);
    } else if (match.format === 'TEST' && !allOut && oversFinished) {
      match.status = 'COMPLETED';
      match.result = 'Test Match Drawn';
      await syncCareerStats(match);
    } else {
      if (match.allowSuperOver && match.infiniteSuperOvers) {
        await db.matches.put(match);
        await startSuperOver(match.id);
        return;
      }
      match.status = 'TIED';
      match.result = 'Match Tied!';
      if (!match.allowSuperOver) await syncCareerStats(match);
    }
  } else {
    match.state = state;
  }

  const ballEvent: BallEvent = {
    matchId: match.id,
    inningsNumber: innings.inningsNumber,
    over: eventOver,
    ball: eventBall,
    batsmanId: striker.playerId,
    bowlerId: bowler.playerId,
    runs: outcome.runs,
    extrasType: outcome.extrasType,
    extraRuns: outcome.extraRuns,
    isWicket,
    dismissalType: effectiveDismissal,
    fielderId: isWicket ? chosenFielderId : undefined,
    isFreeHit: state.isFreeHit,
    drsOverturned,
    commentary: state.lastBallOutcome,
    timestamp: Date.now(),
  };

  await db.transaction('rw', db.matches, db.ballEvents, async () => {
    await db.matches.put(match);
    await db.ballEvents.add(ballEvent);
  });
}

export async function playFullOver(matchId: string): Promise<void> {
  const initial = await db.matches.get(matchId);
  if (!initial || initial.status !== 'LIVE') return;
  const startOver = initial.state.currentOver;
  const startInnings = initial.state.innings;

  for (let i = 0; i < 12; i++) {
    const current = await db.matches.get(matchId);
    if (
      !current ||
      current.status !== 'LIVE' ||
      current.state.currentOver !== startOver ||
      current.state.innings !== startInnings
    ) {
      break;
    }
    await playNextBall(matchId);
  }
}