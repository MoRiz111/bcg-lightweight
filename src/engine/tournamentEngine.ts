import { db } from '../db/database';
import type {
  MatchFormat,
  PointsTableEntry,
  Tournament,
  TournamentFixture,
} from '../types/cricket';
import { playNextBall, startQuickMatch } from './matchEngine';

export interface TournamentPreset {
  formatType: Tournament['formatType'];
  label: string;
  matchFormat: MatchFormat;
  defaultTeamCount: number;
  allowGroupStageTie: boolean;
}

export const TOURNAMENT_PRESETS: TournamentPreset[] = [
  {
    formatType: 'IPL',
    label: 'Indian Premier League (IPL)',
    matchFormat: 'T20',
    defaultTeamCount: 10,
    allowGroupStageTie: true,
  },
  {
    formatType: 'T20_WC_2026',
    label: '2026 ICC T20 World Cup',
    matchFormat: 'T20',
    defaultTeamCount: 8,
    allowGroupStageTie: false,
  },
  {
    formatType: 'ODI_WC_2023',
    label: '2023 ICC ODI World Cup',
    matchFormat: 'ODI',
    defaultTeamCount: 8,
    allowGroupStageTie: false,
  },
];

// Generates round-robin fixtures using the circle rotation method so no team plays back-to-back matches
function buildRoundRobinFixtures(teamIds: string[]): TournamentFixture[] {
  const teams = [...teamIds];
  if (teams.length % 2 === 1) {
    teams.push('BYE');
  }

  const n = teams.length;
  const totalRounds = n - 1;
  const half = n / 2;
  const fixtures: TournamentFixture[] = [];
  let matchNumber = 1;
  let lastPlayedTeams = new Set<string>();

  for (let round = 0; round < totalRounds; round++) {
    const roundPairs: [string, string][] = [];

    for (let i = 0; i < half; i++) {
      const home = teams[i];
      const away = teams[n - 1 - i];
      if (home !== 'BYE' && away !== 'BYE') {
        roundPairs.push(round % 2 === 0 ? [home, away] : [away, home]);
      }
    }

    // Order matches within this round so the first match avoids teams that played at the end of the previous round
    roundPairs.sort((a, b) => {
      const aOverlap =
        (lastPlayedTeams.has(a[0]) ? 1 : 0) + (lastPlayedTeams.has(a[1]) ? 1 : 0);
      const bOverlap =
        (lastPlayedTeams.has(b[0]) ? 1 : 0) + (lastPlayedTeams.has(b[1]) ? 1 : 0);
      return aOverlap - bOverlap;
    });

    for (const [tA, tB] of roundPairs) {
      fixtures.push({
        id: `fix_${matchNumber}_${Date.now() + matchNumber}`,
        matchNumber,
        stage: 'GROUP',
        teamAId: tA,
        teamBId: tB,
        status: 'UPCOMING',
      });
      lastPlayedTeams = new Set([tA, tB]);
      matchNumber++;
    }

    // Rotate all teams except the first anchor team
    const fixed = teams[0];
    const rest = teams.slice(1);
    rest.unshift(rest.pop()!);
    teams.splice(0, teams.length, fixed, ...rest);
  }

  return fixtures;
}

export async function createTournament(
  name: string,
  formatType: Tournament['formatType'],
  matchFormat: MatchFormat,
  teamIds: string[]
): Promise<string> {
  const pointsTable: PointsTableEntry[] = teamIds.map((teamId) => ({
    teamId,
    matchesPlayed: 0,
    wins: 0,
    losses: 0,
    ties: 0,
    points: 0,
    runsScored: 0,
    oversFaced: 0,
    runsConceded: 0,
    oversBowled: 0,
    netRunRate: 0,
  }));

  const fixtures = buildRoundRobinFixtures(teamIds);
  const id = `tourn_${Date.now()}`;

  const tournament: Tournament = {
    id,
    name,
    formatType,
    matchFormat,
    teamIds,
    fixtures,
    pointsTable,
    status: 'ACTIVE',
    createdAt: Date.now(),
  };

  await db.tournaments.add(tournament);
  return id;
}

function getEffectiveNrrOvers(
  wickets: number,
  oversCompleted: number,
  ballsInCurrentOver: number,
  allottedOvers: number
): number {
  if (wickets >= 10) return allottedOvers;
  return oversCompleted + ballsInCurrentOver / 6;
}

function sortPointsTable(table: PointsTableEntry[]): PointsTableEntry[] {
  return [...table].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    return b.netRunRate - a.netRunRate;
  });
}

export async function syncMatchToTournament(matchId: string): Promise<void> {
  const match = await db.matches.get(matchId);
  if (!match || !match.tournamentId || !match.fixtureId) return;
  if (match.status !== 'COMPLETED' && match.status !== 'TIED') return;

  const tournament = await db.tournaments.get(match.tournamentId);
  if (!tournament) return;

  const fixture = tournament.fixtures.find((f) => f.id === match.fixtureId);
  if (!fixture || fixture.status === 'COMPLETED') return;

  const inn1 = match.inningsList[0];
  const inn2 = match.inningsList[1];
  const allottedOvers = match.format === 'T20' ? 20 : 50;

  const teamA = await db.teams.get(match.teamAId);
  const teamB = await db.teams.get(match.teamBId);
  let winnerTeamId: string | undefined;

  if (match.status === 'COMPLETED' && match.result) {
    if (teamA && match.result.startsWith(teamA.name)) {
      winnerTeamId = teamA.id;
    } else if (teamB && match.result.startsWith(teamB.name)) {
      winnerTeamId = teamB.id;
    } else if (inn2 && inn2.runs > inn1.runs) {
      winnerTeamId = inn2.battingTeamId;
    } else if (inn1 && inn2 && inn1.runs > inn2.runs) {
      winnerTeamId = inn1.battingTeamId;
    }
  }

  const loserTeamId =
    winnerTeamId === match.teamAId
      ? match.teamBId
      : winnerTeamId === match.teamBId
      ? match.teamAId
      : undefined;

  fixture.status = 'COMPLETED';
  fixture.winnerTeamId = winnerTeamId;
  fixture.loserTeamId = loserTeamId;
  fixture.result = match.result;

  // 1. GROUP STAGE -> Update Points Table & NRR, then generate Playoffs when done
  if (fixture.stage === 'GROUP' && inn1 && inn2) {
    const inn1Overs = getEffectiveNrrOvers(
      inn1.wickets,
      Math.floor(inn1.overs),
      inn1.ballsInCurrentOver,
      allottedOvers
    );
    const inn2Overs = getEffectiveNrrOvers(
      inn2.wickets,
      Math.floor(inn2.overs),
      inn2.ballsInCurrentOver,
      allottedOvers
    );

    const entryA = tournament.pointsTable.find(
      (e) => e.teamId === inn1.battingTeamId
    );
    const entryB = tournament.pointsTable.find(
      (e) => e.teamId === inn2.battingTeamId
    );

    if (entryA && entryB) {
      entryA.matchesPlayed += 1;
      entryB.matchesPlayed += 1;

      entryA.runsScored += inn1.runs;
      entryA.oversFaced += inn1Overs;
      entryA.runsConceded += inn2.runs;
      entryA.oversBowled += inn2Overs;

      entryB.runsScored += inn2.runs;
      entryB.oversFaced += inn2Overs;
      entryB.runsConceded += inn1.runs;
      entryB.oversBowled += inn1Overs;

      if (!winnerTeamId) {
        entryA.ties += 1;
        entryB.ties += 1;
        entryA.points += 1;
        entryB.points += 1;
      } else if (winnerTeamId === entryA.teamId) {
        entryA.wins += 1;
        entryA.points += 2;
        entryB.losses += 1;
      } else {
        entryB.wins += 1;
        entryB.points += 2;
        entryA.losses += 1;
      }

      for (const entry of [entryA, entryB]) {
        const forRate =
          entry.oversFaced > 0 ? entry.runsScored / entry.oversFaced : 0;
        const againstRate =
          entry.oversBowled > 0 ? entry.runsConceded / entry.oversBowled : 0;
        entry.netRunRate = Number((forRate - againstRate).toFixed(3));
      }
    }

    tournament.pointsTable = sortPointsTable(tournament.pointsTable);

    const allGroupDone = tournament.fixtures
      .filter((f) => f.stage === 'GROUP')
      .every((f) => f.status === 'COMPLETED');
    const hasKnockouts = tournament.fixtures.some((f) => f.stage !== 'GROUP');

    if (allGroupDone && !hasKnockouts) {
      const nextNum = tournament.fixtures.length + 1;

      if (tournament.pointsTable.length >= 4) {
        if (tournament.formatType === 'IPL') {
          // Authentic IPL Playoff Format: Qualifier 1 (#1 vs #2) & Eliminator (#3 vs #4)
          tournament.fixtures.push(
            {
              id: `fix_q1_${Date.now()}`,
              matchNumber: nextNum,
              stage: 'QUALIFIER_1',
              teamAId: tournament.pointsTable[0].teamId,
              teamBId: tournament.pointsTable[1].teamId,
              status: 'UPCOMING',
            },
            {
              id: `fix_elim_${Date.now() + 1}`,
              matchNumber: nextNum + 1,
              stage: 'ELIMINATOR',
              teamAId: tournament.pointsTable[2].teamId,
              teamBId: tournament.pointsTable[3].teamId,
              status: 'UPCOMING',
            }
          );
        } else {
          // World Cup Knockouts: Semi-Final 1 (#1 vs #4) & Semi-Final 2 (#2 vs #3)
          tournament.fixtures.push(
            {
              id: `fix_sf1_${Date.now()}`,
              matchNumber: nextNum,
              stage: 'SEMI_FINAL',
              teamAId: tournament.pointsTable[0].teamId,
              teamBId: tournament.pointsTable[3].teamId,
              status: 'UPCOMING',
            },
            {
              id: `fix_sf2_${Date.now() + 1}`,
              matchNumber: nextNum + 1,
              stage: 'SEMI_FINAL',
              teamAId: tournament.pointsTable[1].teamId,
              teamBId: tournament.pointsTable[2].teamId,
              status: 'UPCOMING',
            }
          );
        }
      } else if (tournament.pointsTable.length >= 2) {
        tournament.fixtures.push({
          id: `fix_final_${Date.now()}`,
          matchNumber: nextNum,
          stage: 'FINAL',
          teamAId: tournament.pointsTable[0].teamId,
          teamBId: tournament.pointsTable[1].teamId,
          status: 'UPCOMING',
        });
      }
    }
  } else if (
    fixture.stage === 'QUALIFIER_1' ||
    fixture.stage === 'ELIMINATOR'
  ) {
    // IPL Playoff Progression: Loser of Qualifier 1 vs Winner of Eliminator -> Qualifier 2
    const q1 = tournament.fixtures.find((f) => f.stage === 'QUALIFIER_1');
    const elim = tournament.fixtures.find((f) => f.stage === 'ELIMINATOR');
    const hasQ2 = tournament.fixtures.some((f) => f.stage === 'QUALIFIER_2');

    if (
      !hasQ2 &&
      q1?.status === 'COMPLETED' &&
      q1.loserTeamId &&
      elim?.status === 'COMPLETED' &&
      elim.winnerTeamId
    ) {
      tournament.fixtures.push({
        id: `fix_q2_${Date.now()}`,
        matchNumber: tournament.fixtures.length + 1,
        stage: 'QUALIFIER_2',
        teamAId: q1.loserTeamId,
        teamBId: elim.winnerTeamId,
        status: 'UPCOMING',
      });
    }
  } else if (fixture.stage === 'QUALIFIER_2') {
    // IPL Final: Winner of Qualifier 1 vs Winner of Qualifier 2
    const q1 = tournament.fixtures.find((f) => f.stage === 'QUALIFIER_1');
    const hasFinal = tournament.fixtures.some((f) => f.stage === 'FINAL');

    if (!hasFinal && q1?.winnerTeamId && winnerTeamId) {
      tournament.fixtures.push({
        id: `fix_final_${Date.now()}`,
        matchNumber: tournament.fixtures.length + 1,
        stage: 'FINAL',
        teamAId: q1.winnerTeamId,
        teamBId: winnerTeamId,
        status: 'UPCOMING',
      });
    }
  } else if (fixture.stage === 'SEMI_FINAL') {
    const semiFinals = tournament.fixtures.filter(
      (f) => f.stage === 'SEMI_FINAL'
    );
    const hasFinal = tournament.fixtures.some((f) => f.stage === 'FINAL');
    if (
      !hasFinal &&
      semiFinals.length === 2 &&
      semiFinals.every((sf) => sf.status === 'COMPLETED' && sf.winnerTeamId)
    ) {
      tournament.fixtures.push({
        id: `fix_final_${Date.now()}`,
        matchNumber: tournament.fixtures.length + 1,
        stage: 'FINAL',
        teamAId: semiFinals[0].winnerTeamId!,
        teamBId: semiFinals[1].winnerTeamId!,
        status: 'UPCOMING',
      });
    }
  } else if (fixture.stage === 'FINAL' && winnerTeamId) {
    tournament.championTeamId = winnerTeamId;
    tournament.status = 'COMPLETED';
  }

  await db.tournaments.put(tournament);
}

export async function launchTournamentFixture(
  tournamentId: string,
  fixtureId: string
): Promise<string> {
  const tournament = await db.tournaments.get(tournamentId);
  if (!tournament) throw new Error('Tournament not found');
  const fixture = tournament.fixtures.find((f) => f.id === fixtureId);
  if (!fixture) throw new Error('Fixture not found');

  if (fixture.matchId) return fixture.matchId;

  const isKnockout = fixture.stage !== 'GROUP';
  const allowSuperOver = isKnockout || tournament.formatType !== 'IPL';

  const matchId = await startQuickMatch(
    fixture.teamAId,
    fixture.teamBId,
    tournament.matchFormat,
    {
      allowSuperOver,
      infiniteSuperOvers: isKnockout,
    }
  );

  await db.matches.update(matchId, {
    tournamentId: tournament.id,
    fixtureId: fixture.id,
  });

  fixture.matchId = matchId;
  fixture.status = 'LIVE';
  await db.tournaments.put(tournament);

  return matchId;
}

export async function simulateTournamentFixture(
  tournamentId: string,
  fixtureId: string
): Promise<void> {
  const matchId = await launchTournamentFixture(tournamentId, fixtureId);

  for (let i = 0; i < 800; i++) {
    const current = await db.matches.get(matchId);
    if (!current || current.status === 'COMPLETED' || current.status === 'TIED') {
      break;
    }
    await playNextBall(matchId);
  }

  await syncMatchToTournament(matchId);
}