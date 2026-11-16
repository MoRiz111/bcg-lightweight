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
  | 'RF'
  | 'RFM'
  | 'RM'
  | 'LF'
  | 'LFM'
  | 'LM'
  | 'OB'
  | 'LB'
  | 'SLA'
  | 'LWS';

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
  isOverseas?: boolean;
  batting: PlayerBattingStats;
  bowling: PlayerBowlingStats;
}

export interface Team {
  id: string;
  name: string;
  shortName: string;
  category?: 'INTERNATIONAL' | 'IPL';
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
  bowlingOrder: string[];
  activeWicketkeeperId: string;
  standInReturnKeeperId?: string;
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
  fixtureId?: string;
  format: MatchFormat;
  teamAId: string;
  teamBId: string;
  playingXIA: string[];
  playingXIB: string[];
  openingBowlersA: [string, string];
  openingBowlersB: [string, string];
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

export type TournamentStage =
  | 'GROUP'
  | 'SEMI_FINAL'
  | 'QUALIFIER_1'
  | 'ELIMINATOR'
  | 'QUALIFIER_2'
  | 'FINAL';

export interface TournamentFixture {
  id: string;
  matchNumber: number;
  stage: TournamentStage;
  teamAId: string;
  teamBId: string;
  matchId?: string;
  status: 'UPCOMING' | 'LIVE' | 'COMPLETED';
  winnerTeamId?: string;
  loserTeamId?: string;
  result?: string;
}

export interface Tournament {
  id: string;
  name: string;
  formatType: 'IPL' | 'ODI_WC_2023' | 'T20_WC_2026' | 'CUSTOM';
  matchFormat: MatchFormat;
  teamIds: string[];
  fixtures: TournamentFixture[];
  pointsTable: PointsTableEntry[];
  championTeamId?: string;
  status: 'ACTIVE' | 'COMPLETED';
  createdAt: number;
}