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
  inningsNumber: 1 | 2,
  battingTeamId: string,
  bowlingTeamId: string,
  battingXI: Player[],
  bowlingXI: Player[],
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
  };
}

export async function startQuickMatch(
  teamAId: string,
  teamBId: string,
  format: MatchFormat = 'T20'
): Promise<string> {
  const teamAPlayers = (await db.players.where('teamId').equals(teamAId).toArray()).slice(0, 11);
  const teamBPlayers = (await db.players.where('teamId').equals(teamBId).toArray()).slice(0, 11);

  const totalOvers = format === 'T20' ? 20 : format === 'ODI' ? 50 : 90;
  const openingBowler =
    [...teamBPlayers].reverse().find((p) => p.role === 'BOWLER' || p.role === 'ALL_ROUNDER') ??
    teamBPlayers[10];

  const firstInnings = buildInnings(1, teamAId, teamBId, teamAPlayers, teamBPlayers, format);

  const matchId = `match_${Date.now()}`;
  const match: Match = {
    id: matchId,
    format,
    teamAId,
    teamBId,
    playingXIA: teamAPlayers.map((p) => p.id),
    playingXIB: teamBPlayers.map((p) => p.id),
    totalOvers,
    allowSuperOver: true,
    infiniteSuperOvers: false,
    status: 'LIVE',
    state: {
      strikerId: teamAPlayers[0].id,
      nonStrikerId: teamAPlayers[1].id,
      currentBowlerId: openingBowler.id,
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

export async function playNextBall(matchId: string): Promise<void> {
  const match = await db.matches.get(matchId);
  if (!match || match.status !== 'LIVE') return;

  const state = { ...match.state };
  const inningsIdx = match.inningsList.length - 1;
  const innings = structuredClone(match.inningsList[inningsIdx]);

  const striker = innings.battingCard[state.strikerId];
  const bowler = innings.bowlingCard[state.currentBowlerId];
  const outcome = rollBallOutcome(match.format);

  // Free hit protection: only RUN_OUT can dismiss a batter
  let isWicket = outcome.isWicket;
  if (state.isFreeHit && isWicket && outcome.dismissalType !== 'RUN_OUT') {
    isWicket = false;
  }

  // Automatic DRS check when reviews remain
  let drsOverturned = false;
  if (isWicket && innings.drsRemaining > 0 && (outcome.dismissalType === 'LBW' || outcome.dismissalType === 'CAUGHT')) {
    if (Math.random() < 0.35) {
      innings.drsRemaining -= 1;
      if (rollDrsOverturn(outcome.dismissalType)) {
        isWicket = false;
        drsOverturned = true;
      }
    }
  }

  const isLegalDelivery = outcome.extrasType !== 'WIDE' && outcome.extrasType !== 'NO_BALL';
  const totalBallRuns = outcome.runs + outcome.extraRuns;

  // Update team & extras totals
  innings.runs += totalBallRuns;
  if (outcome.extrasType === 'WIDE') innings.extras.wides += outcome.extraRuns;
  if (outcome.extrasType === 'NO_BALL') innings.extras.noBalls += outcome.extraRuns;
  if (outcome.extrasType === 'BYE') innings.extras.byes += outcome.extraRuns;
  if (outcome.extrasType === 'LEG_BYE') innings.extras.legByes += outcome.extraRuns;
  innings.extras.total += outcome.extraRuns;

  // Update batter stats
  if (outcome.extrasType !== 'WIDE') {
    striker.balls += 1;
  }
  if (!outcome.extrasType || outcome.extrasType === 'NO_BALL') {
    striker.runs += outcome.runs;
    if (outcome.runs === 4) striker.fours += 1;
    if (outcome.runs === 6) striker.sixes += 1;
  }

  // Update bowler stats
  if (outcome.extrasType !== 'BYE' && outcome.extrasType !== 'LEG_BYE') {
    bowler.runsConceded += totalBallRuns;
    bowler.currentOverRuns += totalBallRuns;
  }

  // Pick random fielder for catches/run-outs
  const fieldingIds = Object.keys(innings.bowlingCard).filter((id) => id !== bowler.playerId);
  const randomFielderId = fieldingIds[Math.floor(Math.random() * fieldingIds.length)];
  const fielderName = innings.bowlingCard[randomFielderId]?.name ?? 'Sub';

  // Handle dismissal
  let outcomeLabel = `${totalBallRuns}`;
  if (drsOverturned) {
    outcomeLabel = 'NOT OUT (DRS Overturned!)';
  } else if (isWicket) {
    innings.wickets += 1;
    striker.isOut = true;
    if (outcome.dismissalType !== 'RUN_OUT') {
      bowler.wickets += 1;
    }
    striker.dismissalText =
      outcome.dismissalType === 'CAUGHT'
        ? `c ${fielderName} b ${bowler.name}`
        : outcome.dismissalType === 'RUN_OUT'
        ? `run out (${fielderName})`
        : outcome.dismissalType === 'LBW'
        ? `lbw b ${bowler.name}`
        : `b ${bowler.name}`;

    outcomeLabel = `WICKET! (${striker.dismissalText})`;

    // Send in next batter if wickets < 10
    if (innings.wickets < 10) {
      const nextBatterId = innings.battingOrder[innings.wickets + 1];
      if (nextBatterId) {
        state.strikerId = nextBatterId;
      }
    }
  } else if (outcome.extrasType) {
    outcomeLabel = `${outcome.extraRuns}${outcome.extrasType === 'WIDE' ? 'wd' : outcome.extrasType === 'NO_BALL' ? 'nb' : 'b'}`;
  } else if (outcome.runs === 4) {
    outcomeLabel = 'FOUR!';
  } else if (outcome.runs === 6) {
    outcomeLabel = 'SIX!';
  }

  // Free hit state update
  state.isFreeHit = outcome.extrasType === 'NO_BALL';

  // Rotate strike on odd runs
  if (totalBallRuns % 2 === 1) {
    [state.strikerId, state.nonStrikerId] = [state.nonStrikerId, state.strikerId];
  }

  // Advance ball / over count on legal delivery
  const eventOver = state.currentOver;
  const eventBall = state.currentBall + 1;

  if (isLegalDelivery) {
    bowler.ballsBowled += 1;
    bowler.overs = Math.floor(bowler.ballsBowled / 6) + (bowler.ballsBowled % 6) / 10;
    innings.ballsInCurrentOver += 1;
    state.currentBall += 1;

    if (state.currentBall === 6) {
      if (bowler.currentOverRuns === 0) bowler.maidens += 1;
      bowler.currentOverRuns = 0;

      state.currentOver += 1;
      state.currentBall = 0;
      innings.overs = state.currentOver;
      innings.ballsInCurrentOver = 0;

      // End-of-over strike rotation
      [state.strikerId, state.nonStrikerId] = [state.nonStrikerId, state.strikerId];

      // Auto-rotate bowler (enforcing no consecutive overs & max overs limit)
      const maxOvers = match.format === 'T20' ? 4 : match.format === 'ODI' ? 10 : 99;
      const eligibleBowlers = Object.values(innings.bowlingCard).filter(
        (b) => b.playerId !== state.currentBowlerId && Math.floor(b.ballsBowled / 6) < maxOvers
      );
      if (eligibleBowlers.length > 0) {
        state.previousBowlerId = state.currentBowlerId;
        state.currentBowlerId =
          eligibleBowlers[Math.floor(Math.random() * eligibleBowlers.length)].playerId;
      }
    } else {
      innings.overs = state.currentOver + state.currentBall / 10;
    }
  }

  // Sync top-level MatchState
  state.totalRuns = innings.runs;
  state.wickets = innings.wickets;
  state.lastBallOutcome = `${eventOver}.${eventBall} ${bowler.name} to ${striker.name}: ${outcomeLabel}`;
  match.inningsList[inningsIdx] = innings;

  // Check innings / match completion
  const oversFinished = state.currentOver >= match.totalOvers;
  const allOut = innings.wickets >= 10;
  const targetChased = innings.target !== undefined && innings.runs >= innings.target;

  if (innings.inningsNumber === 1 && (oversFinished || allOut)) {
    // Switch to 2nd Innings
    const allPlayers = await db.players.toArray();
    const teamBPlayers = match.playingXIB.map((id) => allPlayers.find((p) => p.id === id)!);
    const teamAPlayers = match.playingXIA.map((id) => allPlayers.find((p) => p.id === id)!);
    const secondInnings = buildInnings(
      2,
      match.teamBId,
      match.teamAId,
      teamBPlayers,
      teamAPlayers,
      match.format,
      innings.runs + 1
    );
    const openingBowler2 =
      [...teamAPlayers].reverse().find((p) => p.role === 'BOWLER' || p.role === 'ALL_ROUNDER') ??
      teamAPlayers[10];

    match.inningsList.push(secondInnings);
    match.state = {
      strikerId: teamBPlayers[0].id,
      nonStrikerId: teamBPlayers[1].id,
      currentBowlerId: openingBowler2.id,
      currentOver: 0,
      currentBall: 0,
      totalRuns: 0,
      wickets: 0,
      target: innings.runs + 1,
      innings: 2,
      isFreeHit: false,
      isSuperOver: false,
      superOverCount: 0,
      lastBallOutcome: `Innings Break! Target: ${innings.runs + 1}`,
    };
  } else if (innings.inningsNumber === 2 && (targetChased || oversFinished || allOut)) {
    const teamA = await db.teams.get(match.teamAId);
    const teamB = await db.teams.get(match.teamBId);
    const firstRuns = match.inningsList[0].runs;

    if (targetChased) {
      match.status = 'COMPLETED';
      match.result = `${teamB?.name} won by ${10 - innings.wickets} wickets`;
    } else if (innings.runs < firstRuns) {
      match.status = 'COMPLETED';
      match.result = `${teamA?.name} won by ${firstRuns - innings.runs} runs`;
    } else {
      match.status = 'TIED';
      match.result = 'Match Tied!';
    }
    match.state = state;
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
    dismissalType: outcome.dismissalType,
    fielderId: isWicket ? randomFielderId : undefined,
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