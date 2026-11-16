export type MatchFormat = 'T20' | 'ODI' | 'TEST';

export type DismissalType =
  | 'BOWLED'
  | 'CAUGHT'
  | 'LBW'
  | 'RUN_OUT'
  | 'STUMPED'
  | 'HIT_WICKET';

export type ExtrasType = 'WIDE' | 'NO_BALL' | 'BYE' | 'LEG_BYE' | null;

export type BowlingStyle =
  | 'RF'   // Right-arm Fast
  | 'RFM'  // Right-arm Fast-Medium
  | 'RM'   // Right-arm Medium
  | 'LF'   // Left-arm Fast
  | 'LFM'  // Left-arm Fast-Medium
  | 'LM'   // Left-arm Medium
  | 'OB'   // Right-arm Off-Break
  | 'LB'   // Right-arm Leg-Break
  | 'SLA'  // Slow Left-arm Orthodox
  | 'LWS'; // Left-arm Wrist Spin

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
  overs: number;
  ballsBowled: number;
  maidens: number;
  wickets: number;
}

export interface Player {
  id: string;
  teamId: string;
  name: string;
  role: 'BATTER' | 'BOWLER' | 'ALL_ROUNDER' | 'WICKETKEEPER';
  bowlingStyle?: BowlingStyle;
  isCaptain?: boolean;
  isWicketkeeper?: boolean;
  batting: PlayerBattingStats;
  bowling: PlayerBowlingStats;
}

export interface Team {
  id: string;
  name: string;
  shortName: string;
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
  dismissalText?: string;
}

export interface BowlerInningsCard {
  playerId: string;
  name: string;
  overs: number;
  ballsBowled: number;
  maidens: number;
  runsConceded: number;
  wickets: number;
  currentOverRuns: number;
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
  drsRemaining: number;
  battingCard: Record<string, BatterInningsCard>;
  bowlingCard: Record<string, BowlerInningsCard>;
  battingOrder: string[];
  bowlingOrder: string[]; // Preserves chronological order in which bowlers came on
  activeWicketkeeperId: string; // Tracks who is currently keeping wickets
}

export interface BallEvent {
  id?: number;
  matchId: string;
  inningsNumber: number;
  over: number;
  ball: number;
  batsmanId: string;
  bowlerId: string;
  runs: number;
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
  previousBowlerId?: string;
  currentOver: number;
  currentBall: number;
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
  openingBowlersA: [string, string]; // [1st Bowler, 2nd Bowler] for Team A
  openingBowlersB: [string, string]; // [1st Bowler, 2nd Bowler] for Team B
  wicketkeeperAId: string;
  wicketkeeperBId: string;
  totalOvers: number;
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
  drsRemaining: number;
  battingCard: Record<string, BatterInningsCard>;
  bowlingCard: Record<string, BowlerInningsCard>;
  battingOrder: string[];
  bowlingOrder: string[];
  activeWicketkeeperId: string;
  standInReturnKeeperId?: string; // Set only when a non-keeper temporarily takes the gloves for 1 over
}