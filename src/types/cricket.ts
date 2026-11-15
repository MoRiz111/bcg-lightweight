export type MatchFormat = 'T20' | 'ODI' | 'TEST';

export type DismissalType =
  | 'BOWLED'
  | 'CAUGHT'
  | 'LBW'
  | 'RUN_OUT'
  | 'STUMPED'
  | 'HIT_WICKET';

export type ExtrasType = 'WIDE' | 'NO_BALL' | 'BYE' | 'LEG_BYE' | null;

export interface PlayerBattingStats {
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  notOuts: number;
  highest: number;
  thirties: number;
  fifties: number;
  hundreds: number;
  twoHundreds: number;
}

export interface PlayerBowlingStats {
  runsConceded: number;
  overs: number; // e.g., 3.4 represents 3 overs and 4 balls
  ballsBowled: number;
  maidens: number;
  wickets: number;
}

export interface Player {
  id: string;
  teamId: string;
  name: string;
  role: 'BATTER' | 'BOWLER' | 'ALL_ROUNDER' | 'WICKETKEEPER';
  isCaptain?: boolean;
  isWicketkeeper?: boolean;
  batting: PlayerBattingStats;
  bowling: PlayerBowlingStats;
}

export interface Team {
  id: string;
  name: string;
  shortName: string; // e.g., "IND", "AUS", "CSK"
  captainId?: string;
  wicketkeeperId?: string;
}

export interface Extras {
  wides: number;
  noBalls: number;
  byes: number;
  legByes: number;
  total: number;
}

export interface BatterInningsCard {
  playerId: string;
  name: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  isOut: boolean;
  dismissalText?: string; // e.g., "c Kohli b Starc"
}

export interface BowlerInningsCard {
  playerId: string;
  name: string;
  overs: number;
  ballsBowled: number;
  maidens: number;
  runsConceded: number;
  wickets: number;
  currentOverRuns: number; // Helper to detect maidens at over end
}

export interface Innings {
  inningsNumber: 1 | 2 | 3 | 4;
  battingTeamId: string;
  bowlingTeamId: string;
  runs: number;
  wickets: number;
  overs: number;
  ballsInCurrentOver: number;
  target?: number;
  extras: Extras;
  drsRemaining: number; // 2 for T20/ODI, 3 for TEST
  battingCard: Record<string, BatterInningsCard>;
  bowlingCard: Record<string, BowlerInningsCard>;
  battingOrder: string[]; // Ordered list of player IDs
}

export interface BallEvent {
  id?: number; // Auto-incremented by Dexie
  matchId: string;
  inningsNumber: number;
  over: number;
  ball: number;
  batsmanId: string;
  bowlerId: string;
  runs: number; // Runs off the bat
  extrasType: ExtrasType;
  extraRuns: number;
  isWicket: boolean;
  dismissalType?: DismissalType;
  fielderId?: string;
  isFreeHit: boolean;
  drsOverturned?: boolean;
  commentary: string;
  timestamp: number;
}

export interface MatchState {
  strikerId: string;
  nonStrikerId: string;
  currentBowlerId: string;
  previousBowlerId?: string; // Enforces "no consecutive overs" rule
  currentOver: number;
  currentBall: number; // 0 to 5 legal deliveries
  totalRuns: number;
  wickets: number;
  target?: number;
  innings: 1 | 2 | 3 | 4;
  isFreeHit: boolean;
  isSuperOver: boolean;
  superOverCount: number;
  lastBallOutcome: string;
}

export interface Match {
  id: string;
  tournamentId?: string;
  format: MatchFormat;
  teamAId: string;
  teamBId: string;
  playingXIA: string[];
  playingXIB: string[];
  totalOvers: number; // 20, 50, or 90/unlimited for Test
  allowSuperOver: boolean;
  infiniteSuperOvers: boolean;
  status: 'SETUP' | 'LIVE' | 'COMPLETED' | 'TIED';
  result?: string;
  state: MatchState;
  inningsList: Innings[];
  createdAt: number;
}

export interface PointsTableEntry {
  teamId: string;
  matchesPlayed: number;
  wins: number;
  losses: number;
  ties: number;
  points: number;
  runsScored: number;
  oversFaced: number;
  runsConceded: number;
  oversBowled: number;
  netRunRate: number;
}

export interface Tournament {
  id: string;
  name: string;
  formatType: 'IPL' | 'ODI_WC_2023' | 'T20_WC_2026' | 'CUSTOM';
  matchFormat: MatchFormat;
  teamIds: string[];
  pointsTable: PointsTableEntry[];
  status: 'ACTIVE' | 'COMPLETED';
  createdAt: number;
}