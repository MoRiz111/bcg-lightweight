import Dexie, { type Table } from 'dexie';
import type {
  BallEvent,
  Match,
  Player,
  Team,
  Tournament,
} from '../types/cricket';

export class BCGDatabase extends Dexie {
  teams!: Table<Team, string>;
  players!: Table<Player, string>;
  matches!: Table<Match, string>;
  ballEvents!: Table<BallEvent, number>;
  tournaments!: Table<Tournament, string>;

  constructor() {
    super('BCGCricketDB');

    // Only index fields you will filter or sort by in .where()
    this.version(1).stores({
      teams: 'id, name, shortName',
      players: 'id, teamId, name, role',
      matches: 'id, tournamentId, status, format, createdAt',
      ballEvents: '++id, matchId, [matchId+inningsNumber], timestamp',
      tournaments: 'id, status, createdAt',
    });
  }
}

export const db = new BCGDatabase();

// Helper to create default blank career stats
export function createEmptyPlayer(
  id: string,
  teamId: string,
  name: string,
  role: Player['role'],
  flags?: { isCaptain?: boolean; isWicketkeeper?: boolean }
): Player {
  return {
    id,
    teamId,
    name,
    role,
    isCaptain: flags?.isCaptain ?? false,
    isWicketkeeper: flags?.isWicketkeeper ?? false,
    batting: {
      runs: 0,
      balls: 0,
      fours: 0,
      sixes: 0,
      notOuts: 0,
      highest: 0,
      thirties: 0,
      fifties: 0,
      hundreds: 0,
      twoHundreds: 0,
    },
    bowling: {
      runsConceded: 0,
      overs: 0,
      ballsBowled: 0,
      maidens: 0,
      wickets: 0,
    },
  };
}

// Seeds the official 2026 IND vs NZ T20I Series squads on first launch
export async function seedInitialDataIfEmpty(): Promise<void> {
  const existingTeams = await db.teams.count();
  if (existingTeams > 0) return;

  const teams: Team[] = [
    {
      id: 'team_ind',
      name: 'India',
      shortName: 'IND',
      captainId: 'ind_1',
      wicketkeeperId: 'ind_3',
    },
    {
      id: 'team_nz',
      name: 'New Zealand',
      shortName: 'NZ',
      captainId: 'nz_1',
      wicketkeeperId: 'nz_3',
    },
  ];

  const players: Player[] = [
    // India T20I Squad (Tour of New Zealand 2026 - 16 Players)
    createEmptyPlayer('ind_1', 'team_ind', 'Shreyas Iyer', 'BATTER', { isCaptain: true }),
    createEmptyPlayer('ind_2', 'team_ind', 'Abhishek Sharma', 'ALL_ROUNDER'),
    createEmptyPlayer('ind_3', 'team_ind', 'Sanju Samson', 'WICKETKEEPER', { isWicketkeeper: true }),
    createEmptyPlayer('ind_4', 'team_ind', 'Vaibhav Sooryavanshi', 'BATTER'),
    createEmptyPlayer('ind_5', 'team_ind', 'Ishan Kishan', 'WICKETKEEPER', { isWicketkeeper: true }),
    createEmptyPlayer('ind_6', 'team_ind', 'Tilak Varma', 'BATTER'),
    createEmptyPlayer('ind_7', 'team_ind', 'Axar Patel', 'ALL_ROUNDER'),
    createEmptyPlayer('ind_8', 'team_ind', 'Shivam Dube', 'ALL_ROUNDER'),
    createEmptyPlayer('ind_9', 'team_ind', 'Nitish Kumar Reddy', 'ALL_ROUNDER'),
    createEmptyPlayer('ind_10', 'team_ind', 'Naman Dhir', 'ALL_ROUNDER'),
    createEmptyPlayer('ind_11', 'team_ind', 'Arshdeep Singh', 'BOWLER'),
    createEmptyPlayer('ind_12', 'team_ind', 'Bhuvneshwar Kumar', 'BOWLER'),
    createEmptyPlayer('ind_13', 'team_ind', 'Varun Chakaravarthy', 'BOWLER'),
    createEmptyPlayer('ind_14', 'team_ind', 'Kuldeep Yadav', 'BOWLER'),
    createEmptyPlayer('ind_15', 'team_ind', 'Mayank Yadav', 'BOWLER'),
    createEmptyPlayer('ind_16', 'team_ind', 'Prince Yadav', 'BOWLER'),

    // New Zealand T20I Squad (vs India 2026 - 16 Players)
    createEmptyPlayer('nz_1', 'team_nz', 'Mitchell Santner', 'ALL_ROUNDER', { isCaptain: true }),
    createEmptyPlayer('nz_2', 'team_nz', 'Finn Allen', 'BATTER'),
    createEmptyPlayer('nz_3', 'team_nz', 'Tim Seifert', 'WICKETKEEPER', { isWicketkeeper: true }),
    createEmptyPlayer('nz_4', 'team_nz', 'Devon Conway', 'WICKETKEEPER', { isWicketkeeper: true }),
    createEmptyPlayer('nz_5', 'team_nz', 'Glenn Phillips', 'ALL_ROUNDER'),
    createEmptyPlayer('nz_6', 'team_nz', 'Daryl Mitchell', 'ALL_ROUNDER'),
    createEmptyPlayer('nz_7', 'team_nz', 'Mark Chapman', 'BATTER'),
    createEmptyPlayer('nz_8', 'team_nz', 'Michael Bracewell', 'ALL_ROUNDER'),
    createEmptyPlayer('nz_9', 'team_nz', 'Bevon Jacobs', 'BATTER'),
    createEmptyPlayer('nz_10', 'team_nz', 'Zak Foulkes', 'ALL_ROUNDER'),
    createEmptyPlayer('nz_11', 'team_nz', 'Nathan Smith', 'ALL_ROUNDER'),
    createEmptyPlayer('nz_12', 'team_nz', 'Matt Henry', 'BOWLER'),
    createEmptyPlayer('nz_13', 'team_nz', 'Lockie Ferguson', 'BOWLER'),
    createEmptyPlayer('nz_14', 'team_nz', 'Adam Milne', 'BOWLER'),
    createEmptyPlayer('nz_15', 'team_nz', 'Kyle Jamieson', 'BOWLER'),
    createEmptyPlayer('nz_16', 'team_nz', 'Jacob Duffy', 'BOWLER'),
  ];

  await db.transaction('rw', db.teams, db.players, async () => {
    await db.teams.bulkAdd(teams);
    await db.players.bulkAdd(players);
  });
}