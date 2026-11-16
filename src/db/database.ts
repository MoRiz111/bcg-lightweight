import Dexie, { type Table } from 'dexie';
import type {
  BallEvent,
  BowlingStyle,
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

export function createEmptyPlayer(
  id: string,
  teamId: string,
  name: string,
  role: Player['role'],
  flags?: {
    isCaptain?: boolean;
    isWicketkeeper?: boolean;
    isOverseas?: boolean;
    bowlingStyle?: BowlingStyle;
  }
): Player {
  return {
    id,
    teamId,
    name,
    role,
    bowlingStyle: flags?.bowlingStyle ?? 'RM',
    isCaptain: flags?.isCaptain ?? false,
    isWicketkeeper: flags?.isWicketkeeper ?? false,
    isOverseas: flags?.isOverseas ?? false,
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

let seedingPromise: Promise<void> | null = null;

export function seedInitialDataIfEmpty(): Promise<void> {
  if (seedingPromise) return seedingPromise;
  seedingPromise = runSeed().finally(() => {
    seedingPromise = null;
  });
  return seedingPromise;
}

async function runSeed(): Promise<void> {
  const teams: Team[] = [
    // 12 ICC T20I International Teams
    { id: 'team_ind', name: 'India', shortName: 'IND', category: 'INTERNATIONAL', captainId: 'ind_1', wicketkeeperId: 'ind_3' },
    { id: 'team_nz', name: 'New Zealand', shortName: 'NZ', category: 'INTERNATIONAL', captainId: 'nz_1', wicketkeeperId: 'nz_3' },
    { id: 'team_aus', name: 'Australia', shortName: 'AUS', category: 'INTERNATIONAL', captainId: 'aus_1', wicketkeeperId: 'aus_3' },
    { id: 'team_eng', name: 'England', shortName: 'ENG', category: 'INTERNATIONAL', captainId: 'eng_1', wicketkeeperId: 'eng_3' },
    { id: 'team_sa', name: 'South Africa', shortName: 'SA', category: 'INTERNATIONAL', captainId: 'sa_1', wicketkeeperId: 'sa_3' },
    { id: 'team_wi', name: 'West Indies', shortName: 'WI', category: 'INTERNATIONAL', captainId: 'wi_1', wicketkeeperId: 'wi_2' },
    { id: 'team_pak', name: 'Pakistan', shortName: 'PAK', category: 'INTERNATIONAL', captainId: 'pak_1', wicketkeeperId: 'pak_3' },
    { id: 'team_sl', name: 'Sri Lanka', shortName: 'SL', category: 'INTERNATIONAL', captainId: 'sl_1', wicketkeeperId: 'sl_2' },
    { id: 'team_afg', name: 'Afghanistan', shortName: 'AFG', category: 'INTERNATIONAL', captainId: 'afg_1', wicketkeeperId: 'afg_2' },
    { id: 'team_ban', name: 'Bangladesh', shortName: 'BAN', category: 'INTERNATIONAL', captainId: 'ban_1', wicketkeeperId: 'ban_2' },
    { id: 'team_ire', name: 'Ireland', shortName: 'IRE', category: 'INTERNATIONAL', captainId: 'ire_1', wicketkeeperId: 'ire_3' },
    { id: 'team_zim', name: 'Zimbabwe', shortName: 'ZIM', category: 'INTERNATIONAL', captainId: 'zim_1', wicketkeeperId: 'zim_3' },

    // 10 IPL Franchises (22-Member Squads)
    { id: 'ipl_rcb', name: 'Royal Challengers Bengaluru', shortName: 'RCB', category: 'IPL', captainId: 'rcb_3', wicketkeeperId: 'rcb_1' },
    { id: 'ipl_gt', name: 'Gujarat Titans', shortName: 'GT', category: 'IPL', captainId: 'gt_1', wicketkeeperId: 'gt_3' },
    { id: 'ipl_csk', name: 'Chennai Super Kings', shortName: 'CSK', category: 'IPL', captainId: 'csk_1', wicketkeeperId: 'csk_2' },
    { id: 'ipl_mi', name: 'Mumbai Indians', shortName: 'MI', category: 'IPL', captainId: 'mi_5', wicketkeeperId: 'mi_2' },
    { id: 'ipl_kkr', name: 'Kolkata Knight Riders', shortName: 'KKR', category: 'IPL', captainId: 'kkr_1', wicketkeeperId: 'kkr_2' },
    { id: 'ipl_srh', name: 'Sunrisers Hyderabad', shortName: 'SRH', category: 'IPL', captainId: 'srh_8', wicketkeeperId: 'srh_3' },
    { id: 'ipl_rr', name: 'Rajasthan Royals', shortName: 'RR', category: 'IPL', captainId: 'rr_4', wicketkeeperId: 'rr_3' },
    { id: 'ipl_dc', name: 'Delhi Capitals', shortName: 'DC', category: 'IPL', captainId: 'dc_6', wicketkeeperId: 'dc_1' },
    { id: 'ipl_pbks', name: 'Punjab Kings', shortName: 'PBKS', category: 'IPL', captainId: 'pbks_3', wicketkeeperId: 'pbks_2' },
    { id: 'ipl_lsg', name: 'Lucknow Super Giants', shortName: 'LSG', category: 'IPL', captainId: 'lsg_4', wicketkeeperId: 'lsg_4' },
  ];

  const players: Player[] = [
    // 1. India (16)
    createEmptyPlayer('ind_1', 'team_ind', 'Shreyas Iyer', 'BATTER', { isCaptain: true, bowlingStyle: 'OB' }),
    createEmptyPlayer('ind_2', 'team_ind', 'Abhishek Sharma', 'ALL_ROUNDER', { bowlingStyle: 'SLA' }),
    createEmptyPlayer('ind_3', 'team_ind', 'Sanju Samson', 'WICKETKEEPER', { isWicketkeeper: true, bowlingStyle: 'RM' }),
    createEmptyPlayer('ind_4', 'team_ind', 'Vaibhav Sooryavanshi', 'BATTER', { bowlingStyle: 'SLA' }),
    createEmptyPlayer('ind_5', 'team_ind', 'Ishan Kishan', 'WICKETKEEPER', { isWicketkeeper: true, bowlingStyle: 'RM' }),
    createEmptyPlayer('ind_6', 'team_ind', 'Tilak Varma', 'BATTER', { bowlingStyle: 'OB' }),
    createEmptyPlayer('ind_7', 'team_ind', 'Axar Patel', 'ALL_ROUNDER', { bowlingStyle: 'SLA' }),
    createEmptyPlayer('ind_8', 'team_ind', 'Shivam Dube', 'ALL_ROUNDER', { bowlingStyle: 'RM' }),
    createEmptyPlayer('ind_9', 'team_ind', 'Nitish Kumar Reddy', 'ALL_ROUNDER', { bowlingStyle: 'RFM' }),
    createEmptyPlayer('ind_10', 'team_ind', 'Naman Dhir', 'ALL_ROUNDER', { bowlingStyle: 'OB' }),
    createEmptyPlayer('ind_11', 'team_ind', 'Arshdeep Singh', 'BOWLER', { bowlingStyle: 'LFM' }),
    createEmptyPlayer('ind_12', 'team_ind', 'Bhuvneshwar Kumar', 'BOWLER', { bowlingStyle: 'RFM' }),
    createEmptyPlayer('ind_13', 'team_ind', 'Varun Chakaravarthy', 'BOWLER', { bowlingStyle: 'LB' }),
    createEmptyPlayer('ind_14', 'team_ind', 'Kuldeep Yadav', 'BOWLER', { bowlingStyle: 'LWS' }),
    createEmptyPlayer('ind_15', 'team_ind', 'Mayank Yadav', 'BOWLER', { bowlingStyle: 'RF' }),
    createEmptyPlayer('ind_16', 'team_ind', 'Prince Yadav', 'BOWLER', { bowlingStyle: 'RFM' }),

    // 2. New Zealand (16)
    createEmptyPlayer('nz_1', 'team_nz', 'Mitchell Santner', 'ALL_ROUNDER', { isCaptain: true, bowlingStyle: 'SLA' }),
    createEmptyPlayer('nz_2', 'team_nz', 'Finn Allen', 'BATTER', { bowlingStyle: 'OB' }),
    createEmptyPlayer('nz_3', 'team_nz', 'Tim Seifert', 'WICKETKEEPER', { isWicketkeeper: true, bowlingStyle: 'RM' }),
    createEmptyPlayer('nz_4', 'team_nz', 'Devon Conway', 'WICKETKEEPER', { isWicketkeeper: true, bowlingStyle: 'RM' }),
    createEmptyPlayer('nz_5', 'team_nz', 'Glenn Phillips', 'ALL_ROUNDER', { bowlingStyle: 'OB' }),
    createEmptyPlayer('nz_6', 'team_nz', 'Daryl Mitchell', 'ALL_ROUNDER', { bowlingStyle: 'RM' }),
    createEmptyPlayer('nz_7', 'team_nz', 'Mark Chapman', 'BATTER', { bowlingStyle: 'SLA' }),
    createEmptyPlayer('nz_8', 'team_nz', 'Michael Bracewell', 'ALL_ROUNDER', { bowlingStyle: 'OB' }),
    createEmptyPlayer('nz_9', 'team_nz', 'Bevon Jacobs', 'BATTER', { bowlingStyle: 'RM' }),
    createEmptyPlayer('nz_10', 'team_nz', 'Zak Foulkes', 'ALL_ROUNDER', { bowlingStyle: 'RFM' }),
    createEmptyPlayer('nz_11', 'team_nz', 'Nathan Smith', 'ALL_ROUNDER', { bowlingStyle: 'RFM' }),
    createEmptyPlayer('nz_12', 'team_nz', 'Matt Henry', 'BOWLER', { bowlingStyle: 'RFM' }),
    createEmptyPlayer('nz_13', 'team_nz', 'Lockie Ferguson', 'BOWLER', { bowlingStyle: 'RF' }),
    createEmptyPlayer('nz_14', 'team_nz', 'Adam Milne', 'BOWLER', { bowlingStyle: 'RF' }),
    createEmptyPlayer('nz_15', 'team_nz', 'Kyle Jamieson', 'BOWLER', { bowlingStyle: 'RFM' }),
    createEmptyPlayer('nz_16', 'team_nz', 'Jacob Duffy', 'BOWLER', { bowlingStyle: 'RFM' }),

    // 3. Australia (15)
    createEmptyPlayer('aus_1', 'team_aus', 'Mitchell Marsh', 'ALL_ROUNDER', { isCaptain: true, bowlingStyle: 'RFM' }),
    createEmptyPlayer('aus_2', 'team_aus', 'Travis Head', 'BATTER', { bowlingStyle: 'OB' }),
    createEmptyPlayer('aus_3', 'team_aus', 'Josh Inglis', 'WICKETKEEPER', { isWicketkeeper: true, bowlingStyle: 'RM' }),
    createEmptyPlayer('aus_4', 'team_aus', 'Glenn Maxwell', 'ALL_ROUNDER', { bowlingStyle: 'OB' }),
    createEmptyPlayer('aus_5', 'team_aus', 'Marcus Stoinis', 'ALL_ROUNDER', { bowlingStyle: 'RM' }),
    createEmptyPlayer('aus_6', 'team_aus', 'Tim David', 'BATTER', { bowlingStyle: 'OB' }),
    createEmptyPlayer('aus_7', 'team_aus', 'Cameron Green', 'ALL_ROUNDER', { bowlingStyle: 'RFM' }),
    createEmptyPlayer('aus_8', 'team_aus', 'Matthew Short', 'ALL_ROUNDER', { bowlingStyle: 'OB' }),
    createEmptyPlayer('aus_9', 'team_aus', 'Jake Fraser-McGurk', 'BATTER', { bowlingStyle: 'LB' }),
    createEmptyPlayer('aus_10', 'team_aus', 'Pat Cummins', 'BOWLER', { bowlingStyle: 'RF' }),
    createEmptyPlayer('aus_11', 'team_aus', 'Mitchell Starc', 'BOWLER', { bowlingStyle: 'LF' }),
    createEmptyPlayer('aus_12', 'team_aus', 'Adam Zampa', 'BOWLER', { bowlingStyle: 'LB' }),
    createEmptyPlayer('aus_13', 'team_aus', 'Josh Hazlewood', 'BOWLER', { bowlingStyle: 'RFM' }),
    createEmptyPlayer('aus_14', 'team_aus', 'Nathan Ellis', 'BOWLER', { bowlingStyle: 'RFM' }),
    createEmptyPlayer('aus_15', 'team_aus', 'Spencer Johnson', 'BOWLER', { bowlingStyle: 'LF' }),

    // 4. England (15)
    createEmptyPlayer('eng_1', 'team_eng', 'Harry Brook', 'BATTER', { isCaptain: true, bowlingStyle: 'RM' }),
    createEmptyPlayer('eng_2', 'team_eng', 'Phil Salt', 'WICKETKEEPER', { isWicketkeeper: true, bowlingStyle: 'RM' }),
    createEmptyPlayer('eng_3', 'team_eng', 'Jos Buttler', 'WICKETKEEPER', { isWicketkeeper: true, bowlingStyle: 'RM' }),
    createEmptyPlayer('eng_4', 'team_eng', 'Will Jacks', 'ALL_ROUNDER', { bowlingStyle: 'OB' }),
    createEmptyPlayer('eng_5', 'team_eng', 'Liam Livingstone', 'ALL_ROUNDER', { bowlingStyle: 'LB' }),
    createEmptyPlayer('eng_6', 'team_eng', 'Jacob Bethell', 'ALL_ROUNDER', { bowlingStyle: 'SLA' }),
    createEmptyPlayer('eng_7', 'team_eng', 'Sam Curran', 'ALL_ROUNDER', { bowlingStyle: 'LFM' }),
    createEmptyPlayer('eng_8', 'team_eng', 'Jamie Smith', 'WICKETKEEPER', { isWicketkeeper: true, bowlingStyle: 'RM' }),
    createEmptyPlayer('eng_9', 'team_eng', 'Ben Duckett', 'BATTER', { bowlingStyle: 'OB' }),
    createEmptyPlayer('eng_10', 'team_eng', 'Jofra Archer', 'BOWLER', { bowlingStyle: 'RF' }),
    createEmptyPlayer('eng_11', 'team_eng', 'Adil Rashid', 'BOWLER', { bowlingStyle: 'LB' }),
    createEmptyPlayer('eng_12', 'team_eng', 'Mark Wood', 'BOWLER', { bowlingStyle: 'RF' }),
    createEmptyPlayer('eng_13', 'team_eng', 'Reece Topley', 'BOWLER', { bowlingStyle: 'LFM' }),
    createEmptyPlayer('eng_14', 'team_eng', 'Gus Atkinson', 'BOWLER', { bowlingStyle: 'RF' }),
    createEmptyPlayer('eng_15', 'team_eng', 'Brydon Carse', 'BOWLER', { bowlingStyle: 'RF' }),

    // 5. South Africa (15)
    createEmptyPlayer('sa_1', 'team_sa', 'Aiden Markram', 'ALL_ROUNDER', { isCaptain: true, bowlingStyle: 'OB' }),
    createEmptyPlayer('sa_2', 'team_sa', 'Reeza Hendricks', 'BATTER', { bowlingStyle: 'OB' }),
    createEmptyPlayer('sa_3', 'team_sa', 'Heinrich Klaasen', 'WICKETKEEPER', { isWicketkeeper: true, bowlingStyle: 'OB' }),
    createEmptyPlayer('sa_4', 'team_sa', 'Tristan Stubbs', 'WICKETKEEPER', { isWicketkeeper: true, bowlingStyle: 'OB' }),
    createEmptyPlayer('sa_5', 'team_sa', 'David Miller', 'BATTER', { bowlingStyle: 'OB' }),
    createEmptyPlayer('sa_6', 'team_sa', 'Ryan Rickelton', 'WICKETKEEPER', { isWicketkeeper: true, bowlingStyle: 'RM' }),
    createEmptyPlayer('sa_7', 'team_sa', 'Marco Jansen', 'ALL_ROUNDER', { bowlingStyle: 'LF' }),
    createEmptyPlayer('sa_8', 'team_sa', 'Donovan Ferreira', 'ALL_ROUNDER', { bowlingStyle: 'OB' }),
    createEmptyPlayer('sa_9', 'team_sa', 'Patrick Kruger', 'ALL_ROUNDER', { bowlingStyle: 'RM' }),
    createEmptyPlayer('sa_10', 'team_sa', 'Kagiso Rabada', 'BOWLER', { bowlingStyle: 'RF' }),
    createEmptyPlayer('sa_11', 'team_sa', 'Anrich Nortje', 'BOWLER', { bowlingStyle: 'RF' }),
    createEmptyPlayer('sa_12', 'team_sa', 'Keshav Maharaj', 'BOWLER', { bowlingStyle: 'SLA' }),
    createEmptyPlayer('sa_13', 'team_sa', 'Tabraiz Shamsi', 'BOWLER', { bowlingStyle: 'LWS' }),
    createEmptyPlayer('sa_14', 'team_sa', 'Gerald Coetzee', 'BOWLER', { bowlingStyle: 'RF' }),
    createEmptyPlayer('sa_15', 'team_sa', 'Ottneil Baartman', 'BOWLER', { bowlingStyle: 'RFM' }),

    // 6. West Indies (15)
    createEmptyPlayer('wi_1', 'team_wi', 'Rovman Powell', 'BATTER', { isCaptain: true, bowlingStyle: 'RM' }),
    createEmptyPlayer('wi_2', 'team_wi', 'Nicholas Pooran', 'WICKETKEEPER', { isWicketkeeper: true, bowlingStyle: 'OB' }),
    createEmptyPlayer('wi_3', 'team_wi', 'Shai Hope', 'WICKETKEEPER', { isWicketkeeper: true, bowlingStyle: 'RM' }),
    createEmptyPlayer('wi_4', 'team_wi', 'Brandon King', 'BATTER', { bowlingStyle: 'RM' }),
    createEmptyPlayer('wi_5', 'team_wi', 'Shimron Hetmyer', 'BATTER', { bowlingStyle: 'RM' }),
    createEmptyPlayer('wi_6', 'team_wi', 'Sherfane Rutherford', 'BATTER', { bowlingStyle: 'RFM' }),
    createEmptyPlayer('wi_7', 'team_wi', 'Andre Russell', 'ALL_ROUNDER', { bowlingStyle: 'RF' }),
    createEmptyPlayer('wi_8', 'team_wi', 'Romario Shepherd', 'ALL_ROUNDER', { bowlingStyle: 'RFM' }),
    createEmptyPlayer('wi_9', 'team_wi', 'Roston Chase', 'ALL_ROUNDER', { bowlingStyle: 'OB' }),
    createEmptyPlayer('wi_10', 'team_wi', 'Akeal Hosein', 'BOWLER', { bowlingStyle: 'SLA' }),
    createEmptyPlayer('wi_11', 'team_wi', 'Gudakesh Motie', 'BOWLER', { bowlingStyle: 'SLA' }),
    createEmptyPlayer('wi_12', 'team_wi', 'Alzarri Joseph', 'BOWLER', { bowlingStyle: 'RF' }),
    createEmptyPlayer('wi_13', 'team_wi', 'Shamar Joseph', 'BOWLER', { bowlingStyle: 'RF' }),
    createEmptyPlayer('wi_14', 'team_wi', 'Obed McCoy', 'BOWLER', { bowlingStyle: 'LFM' }),
    createEmptyPlayer('wi_15', 'team_wi', 'Matthew Forde', 'ALL_ROUNDER', { bowlingStyle: 'RFM' }),

    // 7. Pakistan (15)
    createEmptyPlayer('pak_1', 'team_pak', 'Salman Ali Agha', 'ALL_ROUNDER', { isCaptain: true, bowlingStyle: 'OB' }),
    createEmptyPlayer('pak_2', 'team_pak', 'Babar Azam', 'BATTER', { bowlingStyle: 'OB' }),
    createEmptyPlayer('pak_3', 'team_pak', 'Mohammad Rizwan', 'WICKETKEEPER', { isWicketkeeper: true, bowlingStyle: 'RM' }),
    createEmptyPlayer('pak_4', 'team_pak', 'Fakhar Zaman', 'BATTER', { bowlingStyle: 'SLA' }),
    createEmptyPlayer('pak_5', 'team_pak', 'Saim Ayub', 'ALL_ROUNDER', { bowlingStyle: 'OB' }),
    createEmptyPlayer('pak_6', 'team_pak', 'Usman Khan', 'WICKETKEEPER', { isWicketkeeper: true, bowlingStyle: 'RM' }),
    createEmptyPlayer('pak_7', 'team_pak', 'Iftikhar Ahmed', 'ALL_ROUNDER', { bowlingStyle: 'OB' }),
    createEmptyPlayer('pak_8', 'team_pak', 'Shadab Khan', 'ALL_ROUNDER', { bowlingStyle: 'LB' }),
    createEmptyPlayer('pak_9', 'team_pak', 'Jahandad Khan', 'ALL_ROUNDER', { bowlingStyle: 'LFM' }),
    createEmptyPlayer('pak_10', 'team_pak', 'Shaheen Shah Afridi', 'BOWLER', { bowlingStyle: 'LF' }),
    createEmptyPlayer('pak_11', 'team_pak', 'Naseem Shah', 'BOWLER', { bowlingStyle: 'RF' }),
    createEmptyPlayer('pak_12', 'team_pak', 'Haris Rauf', 'BOWLER', { bowlingStyle: 'RF' }),
    createEmptyPlayer('pak_13', 'team_pak', 'Abrar Ahmed', 'BOWLER', { bowlingStyle: 'LB' }),
    createEmptyPlayer('pak_14', 'team_pak', 'Abbas Afridi', 'BOWLER', { bowlingStyle: 'RFM' }),
    createEmptyPlayer('pak_15', 'team_pak', 'Sufiyan Muqeem', 'BOWLER', { bowlingStyle: 'LWS' }),

    // 8. Sri Lanka (15)
    createEmptyPlayer('sl_1', 'team_sl', 'Charith Asalanka', 'ALL_ROUNDER', { isCaptain: true, bowlingStyle: 'OB' }),
    createEmptyPlayer('sl_2', 'team_sl', 'Kusal Mendis', 'WICKETKEEPER', { isWicketkeeper: true, bowlingStyle: 'LB' }),
    createEmptyPlayer('sl_3', 'team_sl', 'Pathum Nissanka', 'BATTER', { bowlingStyle: 'RM' }),
    createEmptyPlayer('sl_4', 'team_sl', 'Kusal Perera', 'WICKETKEEPER', { isWicketkeeper: true, bowlingStyle: 'RM' }),
    createEmptyPlayer('sl_5', 'team_sl', 'Kamindu Mendis', 'ALL_ROUNDER', { bowlingStyle: 'OB' }),
    createEmptyPlayer('sl_6', 'team_sl', 'Avishka Fernando', 'BATTER', { bowlingStyle: 'RM' }),
    createEmptyPlayer('sl_7', 'team_sl', 'Wanindu Hasaranga', 'ALL_ROUNDER', { bowlingStyle: 'LB' }),
    createEmptyPlayer('sl_8', 'team_sl', 'Dasun Shanaka', 'ALL_ROUNDER', { bowlingStyle: 'RM' }),
    createEmptyPlayer('sl_9', 'team_sl', 'Dunith Wellalage', 'ALL_ROUNDER', { bowlingStyle: 'SLA' }),
    createEmptyPlayer('sl_10', 'team_sl', 'Maheesh Theekshana', 'BOWLER', { bowlingStyle: 'OB' }),
    createEmptyPlayer('sl_11', 'team_sl', 'Matheesha Pathirana', 'BOWLER', { bowlingStyle: 'RF' }),
    createEmptyPlayer('sl_12', 'team_sl', 'Nuwan Thushara', 'BOWLER', { bowlingStyle: 'RFM' }),
    createEmptyPlayer('sl_13', 'team_sl', 'Dushmantha Chameera', 'BOWLER', { bowlingStyle: 'RF' }),
    createEmptyPlayer('sl_14', 'team_sl', 'Binura Fernando', 'BOWLER', { bowlingStyle: 'LFM' }),
    createEmptyPlayer('sl_15', 'team_sl', 'Jeffrey Vandersay', 'BOWLER', { bowlingStyle: 'LB' }),

    // 9. Afghanistan (15)
    createEmptyPlayer('afg_1', 'team_afg', 'Rashid Khan', 'BOWLER', { isCaptain: true, bowlingStyle: 'LB' }),
    createEmptyPlayer('afg_2', 'team_afg', 'Rahmanullah Gurbaz', 'WICKETKEEPER', { isWicketkeeper: true, bowlingStyle: 'RM' }),
    createEmptyPlayer('afg_3', 'team_afg', 'Ibrahim Zadran', 'BATTER', { bowlingStyle: 'RM' }),
    createEmptyPlayer('afg_4', 'team_afg', 'Sediqullah Atal', 'BATTER', { bowlingStyle: 'RM' }),
    createEmptyPlayer('afg_5', 'team_afg', 'Azmatullah Omarzai', 'ALL_ROUNDER', { bowlingStyle: 'RFM' }),
    createEmptyPlayer('afg_6', 'team_afg', 'Mohammad Nabi', 'ALL_ROUNDER', { bowlingStyle: 'OB' }),
    createEmptyPlayer('afg_7', 'team_afg', 'Gulbadin Naib', 'ALL_ROUNDER', { bowlingStyle: 'RFM' }),
    createEmptyPlayer('afg_8', 'team_afg', 'Karim Janat', 'ALL_ROUNDER', { bowlingStyle: 'RM' }),
    createEmptyPlayer('afg_9', 'team_afg', 'Mohammad Ishaq', 'WICKETKEEPER', { isWicketkeeper: true, bowlingStyle: 'RM' }),
    createEmptyPlayer('afg_10', 'team_afg', 'Noor Ahmad', 'BOWLER', { bowlingStyle: 'LWS' }),
    createEmptyPlayer('afg_11', 'team_afg', 'Fazalhaq Farooqi', 'BOWLER', { bowlingStyle: 'LFM' }),
    createEmptyPlayer('afg_12', 'team_afg', 'Naveen-ul-Haq', 'BOWLER', { bowlingStyle: 'RFM' }),
    createEmptyPlayer('afg_13', 'team_afg', 'Mujeeb Ur Rahman', 'BOWLER', { bowlingStyle: 'OB' }),
    createEmptyPlayer('afg_14', 'team_afg', 'AM Ghazanfar', 'BOWLER', { bowlingStyle: 'OB' }),
    createEmptyPlayer('afg_15', 'team_afg', 'Fareed Ahmad', 'BOWLER', { bowlingStyle: 'LFM' }),

    // 10. Bangladesh (15)
    createEmptyPlayer('ban_1', 'team_ban', 'Litton Das', 'WICKETKEEPER', { isCaptain: true, isWicketkeeper: true, bowlingStyle: 'RM' }),
    createEmptyPlayer('ban_2', 'team_ban', 'Tanzid Hasan', 'BATTER', { bowlingStyle: 'RM' }),
    createEmptyPlayer('ban_3', 'team_ban', 'Towhid Hridoy', 'BATTER', { bowlingStyle: 'OB' }),
    createEmptyPlayer('ban_4', 'team_ban', 'Jaker Ali', 'WICKETKEEPER', { isWicketkeeper: true, bowlingStyle: 'RM' }),
    createEmptyPlayer('ban_5', 'team_ban', 'Parvez Hossain Emon', 'BATTER', { bowlingStyle: 'RM' }),
    createEmptyPlayer('ban_6', 'team_ban', 'Shamim Hossain', 'ALL_ROUNDER', { bowlingStyle: 'OB' }),
    createEmptyPlayer('ban_7', 'team_ban', 'Mehidy Hasan Miraz', 'ALL_ROUNDER', { bowlingStyle: 'OB' }),
    createEmptyPlayer('ban_8', 'team_ban', 'Mahedi Hasan', 'ALL_ROUNDER', { bowlingStyle: 'OB' }),
    createEmptyPlayer('ban_9', 'team_ban', 'Rishad Hossain', 'ALL_ROUNDER', { bowlingStyle: 'LB' }),
    createEmptyPlayer('ban_10', 'team_ban', 'Taskin Ahmed', 'BOWLER', { bowlingStyle: 'RF' }),
    createEmptyPlayer('ban_11', 'team_ban', 'Mustafizur Rahman', 'BOWLER', { bowlingStyle: 'LFM' }),
    createEmptyPlayer('ban_12', 'team_ban', 'Tanzim Hasan Sakib', 'BOWLER', { bowlingStyle: 'RFM' }),
    createEmptyPlayer('ban_13', 'team_ban', 'Shoriful Islam', 'BOWLER', { bowlingStyle: 'LFM' }),
    createEmptyPlayer('ban_14', 'team_ban', 'Hasan Mahmud', 'BOWLER', { bowlingStyle: 'RFM' }),
    createEmptyPlayer('ban_15', 'team_ban', 'Nasum Ahmed', 'BOWLER', { bowlingStyle: 'SLA' }),

    // 11. Ireland (15)
    createEmptyPlayer('ire_1', 'team_ire', 'Paul Stirling', 'BATTER', { isCaptain: true, bowlingStyle: 'OB' }),
    createEmptyPlayer('ire_2', 'team_ire', 'Andrew Balbirnie', 'BATTER', { bowlingStyle: 'OB' }),
    createEmptyPlayer('ire_3', 'team_ire', 'Lorcan Tucker', 'WICKETKEEPER', { isWicketkeeper: true, bowlingStyle: 'RM' }),
    createEmptyPlayer('ire_4', 'team_ire', 'Harry Tector', 'BATTER', { bowlingStyle: 'OB' }),
    createEmptyPlayer('ire_5', 'team_ire', 'Ross Adair', 'BATTER', { bowlingStyle: 'SLA' }),
    createEmptyPlayer('ire_6', 'team_ire', 'Curtis Campher', 'ALL_ROUNDER', { bowlingStyle: 'RFM' }),
    createEmptyPlayer('ire_7', 'team_ire', 'George Dockrell', 'ALL_ROUNDER', { bowlingStyle: 'SLA' }),
    createEmptyPlayer('ire_8', 'team_ire', 'Gareth Delany', 'ALL_ROUNDER', { bowlingStyle: 'LB' }),
    createEmptyPlayer('ire_9', 'team_ire', 'Neil Rock', 'WICKETKEEPER', { isWicketkeeper: true, bowlingStyle: 'RM' }),
    createEmptyPlayer('ire_10', 'team_ire', 'Mark Adair', 'BOWLER', { bowlingStyle: 'RFM' }),
    createEmptyPlayer('ire_11', 'team_ire', 'Josh Little', 'BOWLER', { bowlingStyle: 'LFM' }),
    createEmptyPlayer('ire_12', 'team_ire', 'Barry McCarthy', 'BOWLER', { bowlingStyle: 'RFM' }),
    createEmptyPlayer('ire_13', 'team_ire', 'Craig Young', 'BOWLER', { bowlingStyle: 'RFM' }),
    createEmptyPlayer('ire_14', 'team_ire', 'Ben White', 'BOWLER', { bowlingStyle: 'LB' }),
    createEmptyPlayer('ire_15', 'team_ire', 'Matthew Humphreys', 'BOWLER', { bowlingStyle: 'SLA' }),

    // 12. Zimbabwe (15)
    createEmptyPlayer('zim_1', 'team_zim', 'Sikandar Raza', 'ALL_ROUNDER', { isCaptain: true, bowlingStyle: 'OB' }),
    createEmptyPlayer('zim_2', 'team_zim', 'Brian Bennett', 'ALL_ROUNDER', { bowlingStyle: 'OB' }),
    createEmptyPlayer('zim_3', 'team_zim', 'Clive Madande', 'WICKETKEEPER', { isWicketkeeper: true, bowlingStyle: 'RM' }),
    createEmptyPlayer('zim_4', 'team_zim', 'Tadiwanashe Marumani', 'WICKETKEEPER', { isWicketkeeper: true, bowlingStyle: 'RM' }),
    createEmptyPlayer('zim_5', 'team_zim', 'Dion Myers', 'BATTER', { bowlingStyle: 'RM' }),
    createEmptyPlayer('zim_6', 'team_zim', 'Ryan Burl', 'ALL_ROUNDER', { bowlingStyle: 'LB' }),
    createEmptyPlayer('zim_7', 'team_zim', 'Wessly Madhevere', 'ALL_ROUNDER', { bowlingStyle: 'OB' }),
    createEmptyPlayer('zim_8', 'team_zim', 'Tashinga Musekiwa', 'ALL_ROUNDER', { bowlingStyle: 'RM' }),
    createEmptyPlayer('zim_9', 'team_zim', 'Jonathan Campbell', 'BATTER', { bowlingStyle: 'LB' }),
    createEmptyPlayer('zim_10', 'team_zim', 'Blessing Muzarabani', 'BOWLER', { bowlingStyle: 'RFM' }),
    createEmptyPlayer('zim_11', 'team_zim', 'Richard Ngarava', 'BOWLER', { bowlingStyle: 'LFM' }),
    createEmptyPlayer('zim_12', 'team_zim', 'Wellington Masakadza', 'BOWLER', { bowlingStyle: 'SLA' }),
    createEmptyPlayer('zim_13', 'team_zim', 'Trevor Gwandu', 'BOWLER', { bowlingStyle: 'RFM' }),
    createEmptyPlayer('zim_14', 'team_zim', 'Tinotenda Maposa', 'BOWLER', { bowlingStyle: 'RFM' }),
    createEmptyPlayer('zim_15', 'team_zim', 'Brandon Mavuta', 'BOWLER', { bowlingStyle: 'LB' }),

    // ================= IPL 2026 FRANCHISES (22-MEMBER SQUADS) =================
    // 1. Royal Challengers Bengaluru
    createEmptyPlayer('rcb_1', 'ipl_rcb', 'Phil Salt', 'WICKETKEEPER', { isWicketkeeper: true, isOverseas: true, bowlingStyle: 'RM' }),
    createEmptyPlayer('rcb_2', 'ipl_rcb', 'Virat Kohli', 'BATTER', { bowlingStyle: 'RM' }),
    createEmptyPlayer('rcb_3', 'ipl_rcb', 'Rajat Patidar', 'BATTER', { isCaptain: true, bowlingStyle: 'OB' }),
    createEmptyPlayer('rcb_4', 'ipl_rcb', 'Venkatesh Iyer', 'ALL_ROUNDER', { bowlingStyle: 'RM' }),
    createEmptyPlayer('rcb_5', 'ipl_rcb', 'Devdutt Padikkal', 'BATTER', { bowlingStyle: 'OB' }),
    createEmptyPlayer('rcb_6', 'ipl_rcb', 'Jitesh Sharma', 'WICKETKEEPER', { isWicketkeeper: true, bowlingStyle: 'RM' }),
    createEmptyPlayer('rcb_7', 'ipl_rcb', 'Tim David', 'BATTER', { isOverseas: true, bowlingStyle: 'OB' }),
    createEmptyPlayer('rcb_8', 'ipl_rcb', 'Krunal Pandya', 'ALL_ROUNDER', { bowlingStyle: 'SLA' }),
    createEmptyPlayer('rcb_9', 'ipl_rcb', 'Bhuvneshwar Kumar', 'BOWLER', { bowlingStyle: 'RFM' }),
    createEmptyPlayer('rcb_10', 'ipl_rcb', 'Josh Hazlewood', 'BOWLER', { isOverseas: true, bowlingStyle: 'RFM' }),
    createEmptyPlayer('rcb_11', 'ipl_rcb', 'Jacob Duffy', 'BOWLER', { isOverseas: true, bowlingStyle: 'RFM' }),
    createEmptyPlayer('rcb_12', 'ipl_rcb', 'Romario Shepherd', 'ALL_ROUNDER', { isOverseas: true, bowlingStyle: 'RFM' }),
    createEmptyPlayer('rcb_13', 'ipl_rcb', 'Jacob Bethell', 'ALL_ROUNDER', { isOverseas: true, bowlingStyle: 'SLA' }),
    createEmptyPlayer('rcb_14', 'ipl_rcb', 'Nuwan Thushara', 'BOWLER', { isOverseas: true, bowlingStyle: 'RFM' }),
    createEmptyPlayer('rcb_15', 'ipl_rcb', 'Jordan Cox', 'WICKETKEEPER', { isWicketkeeper: true, isOverseas: true, bowlingStyle: 'RM' }),
    createEmptyPlayer('rcb_16', 'ipl_rcb', 'Yash Dayal', 'BOWLER', { bowlingStyle: 'LFM' }),
    createEmptyPlayer('rcb_17', 'ipl_rcb', 'Suyash Sharma', 'BOWLER', { bowlingStyle: 'LB' }),
    createEmptyPlayer('rcb_18', 'ipl_rcb', 'Rasikh Salam', 'BOWLER', { bowlingStyle: 'RFM' }),
    createEmptyPlayer('rcb_19', 'ipl_rcb', 'Swapnil Singh', 'ALL_ROUNDER', { bowlingStyle: 'SLA' }),
    createEmptyPlayer('rcb_20', 'ipl_rcb', 'Kanishk Chouhan', 'ALL_ROUNDER', { bowlingStyle: 'OB' }),
    createEmptyPlayer('rcb_21', 'ipl_rcb', 'Abhinandan Singh', 'BOWLER', { bowlingStyle: 'RFM' }),
    createEmptyPlayer('rcb_22', 'ipl_rcb', 'Vicky Ostwal', 'ALL_ROUNDER', { bowlingStyle: 'SLA' }),

    // 2. Gujarat Titans
    createEmptyPlayer('gt_1', 'ipl_gt', 'Shubman Gill', 'BATTER', { isCaptain: true, bowlingStyle: 'OB' }),
    createEmptyPlayer('gt_2', 'ipl_gt', 'Sai Sudharsan', 'BATTER', { bowlingStyle: 'LB' }),
    createEmptyPlayer('gt_3', 'ipl_gt', 'Jos Buttler', 'WICKETKEEPER', { isWicketkeeper: true, isOverseas: true, bowlingStyle: 'RM' }),
    createEmptyPlayer('gt_4', 'ipl_gt', 'Washington Sundar', 'ALL_ROUNDER', { bowlingStyle: 'OB' }),
    createEmptyPlayer('gt_5', 'ipl_gt', 'Shahrukh Khan', 'BATTER', { bowlingStyle: 'OB' }),
    createEmptyPlayer('gt_6', 'ipl_gt', 'Rahul Tewatia', 'ALL_ROUNDER', { bowlingStyle: 'LB' }),
    createEmptyPlayer('gt_7', 'ipl_gt', 'Jason Holder', 'ALL_ROUNDER', { isOverseas: true, bowlingStyle: 'RFM' }),
    createEmptyPlayer('gt_8', 'ipl_gt', 'Rashid Khan', 'ALL_ROUNDER', { isOverseas: true, bowlingStyle: 'LB' }),
    createEmptyPlayer('gt_9', 'ipl_gt', 'Kagiso Rabada', 'BOWLER', { isOverseas: true, bowlingStyle: 'RF' }),
    createEmptyPlayer('gt_10', 'ipl_gt', 'Mohammed Siraj', 'BOWLER', { bowlingStyle: 'RF' }),
    createEmptyPlayer('gt_11', 'ipl_gt', 'Prasidh Krishna', 'BOWLER', { bowlingStyle: 'RFM' }),
    createEmptyPlayer('gt_12', 'ipl_gt', 'Glenn Phillips', 'ALL_ROUNDER', { isOverseas: true, bowlingStyle: 'OB' }),
    createEmptyPlayer('gt_13', 'ipl_gt', 'Tom Banton', 'WICKETKEEPER', { isWicketkeeper: true, isOverseas: true, bowlingStyle: 'RM' }),
    createEmptyPlayer('gt_14', 'ipl_gt', 'Luke Wood', 'BOWLER', { isOverseas: true, bowlingStyle: 'LFM' }),
    createEmptyPlayer('gt_15', 'ipl_gt', 'Connor Esterhuizen', 'WICKETKEEPER', { isWicketkeeper: true, isOverseas: true, bowlingStyle: 'RM' }),
    createEmptyPlayer('gt_16', 'ipl_gt', 'Sai Kishore', 'BOWLER', { bowlingStyle: 'SLA' }),
    createEmptyPlayer('gt_17', 'ipl_gt', 'Arshad Khan', 'ALL_ROUNDER', { bowlingStyle: 'LFM' }),
    createEmptyPlayer('gt_18', 'ipl_gt', 'Anuj Rawat', 'WICKETKEEPER', { isWicketkeeper: true, bowlingStyle: 'RM' }),
    createEmptyPlayer('gt_19', 'ipl_gt', 'Kumar Kushagra', 'WICKETKEEPER', { isWicketkeeper: true, bowlingStyle: 'RM' }),
    createEmptyPlayer('gt_20', 'ipl_gt', 'Nishant Sindhu', 'ALL_ROUNDER', { bowlingStyle: 'SLA' }),
    createEmptyPlayer('gt_21', 'ipl_gt', 'Manav Suthar', 'BOWLER', { bowlingStyle: 'SLA' }),
    createEmptyPlayer('gt_22', 'ipl_gt', 'Ishant Sharma', 'BOWLER', { bowlingStyle: 'RFM' }),

    // 3. Chennai Super Kings
    createEmptyPlayer('csk_1', 'ipl_csk', 'Ruturaj Gaikwad', 'BATTER', { isCaptain: true, bowlingStyle: 'OB' }),
    createEmptyPlayer('csk_2', 'ipl_csk', 'Sanju Samson', 'WICKETKEEPER', { isWicketkeeper: true, bowlingStyle: 'RM' }),
    createEmptyPlayer('csk_3', 'ipl_csk', 'Dewald Brevis', 'BATTER', { isOverseas: true, bowlingStyle: 'LB' }),
    createEmptyPlayer('csk_4', 'ipl_csk', 'Shivam Dube', 'ALL_ROUNDER', { bowlingStyle: 'RM' }),
    createEmptyPlayer('csk_5', 'ipl_csk', 'Matthew Short', 'ALL_ROUNDER', { isOverseas: true, bowlingStyle: 'OB' }),
    createEmptyPlayer('csk_6', 'ipl_csk', 'MS Dhoni', 'WICKETKEEPER', { isWicketkeeper: true, bowlingStyle: 'RM' }),
    createEmptyPlayer('csk_7', 'ipl_csk', 'Anshul Kamboj', 'ALL_ROUNDER', { bowlingStyle: 'RFM' }),
    createEmptyPlayer('csk_8', 'ipl_csk', 'Noor Ahmad', 'BOWLER', { isOverseas: true, bowlingStyle: 'LWS' }),
    createEmptyPlayer('csk_9', 'ipl_csk', 'Matt Henry', 'BOWLER', { isOverseas: true, bowlingStyle: 'RFM' }),
    createEmptyPlayer('csk_10', 'ipl_csk', 'Khaleel Ahmed', 'BOWLER', { bowlingStyle: 'LFM' }),
    createEmptyPlayer('csk_11', 'ipl_csk', 'Rahul Chahar', 'BOWLER', { bowlingStyle: 'LB' }),
    createEmptyPlayer('csk_12', 'ipl_csk', 'Nathan Ellis', 'BOWLER', { isOverseas: true, bowlingStyle: 'RFM' }),
    createEmptyPlayer('csk_13', 'ipl_csk', 'Akeal Hosein', 'BOWLER', { isOverseas: true, bowlingStyle: 'SLA' }),
    createEmptyPlayer('csk_14', 'ipl_csk', 'Jamie Overton', 'ALL_ROUNDER', { isOverseas: true, bowlingStyle: 'RF' }),
    createEmptyPlayer('csk_15', 'ipl_csk', 'Zak Foulkes', 'ALL_ROUNDER', { isOverseas: true, bowlingStyle: 'RFM' }),
    createEmptyPlayer('csk_16', 'ipl_csk', 'Sarfaraz Khan', 'BATTER', { bowlingStyle: 'LB' }),
    createEmptyPlayer('csk_17', 'ipl_csk', 'Urvil Patel', 'WICKETKEEPER', { isWicketkeeper: true, bowlingStyle: 'RM' }),
    createEmptyPlayer('csk_18', 'ipl_csk', 'Prashant Veer', 'ALL_ROUNDER', { bowlingStyle: 'SLA' }),
    createEmptyPlayer('csk_19', 'ipl_csk', 'Kartik Sharma', 'WICKETKEEPER', { isWicketkeeper: true, bowlingStyle: 'RM' }),
    createEmptyPlayer('csk_20', 'ipl_csk', 'Mukesh Choudhary', 'BOWLER', { bowlingStyle: 'LFM' }),
    createEmptyPlayer('csk_21', 'ipl_csk', 'Shreyas Gopal', 'BOWLER', { bowlingStyle: 'LB' }),
    createEmptyPlayer('csk_22', 'ipl_csk', 'Gurjapneet Singh', 'BOWLER', { bowlingStyle: 'LFM' }),

    // 4. Mumbai Indians
    createEmptyPlayer('mi_1', 'ipl_mi', 'Rohit Sharma', 'BATTER', { bowlingStyle: 'OB' }),
    createEmptyPlayer('mi_2', 'ipl_mi', 'Ryan Rickelton', 'WICKETKEEPER', { isWicketkeeper: true, isOverseas: true, bowlingStyle: 'RM' }),
    createEmptyPlayer('mi_3', 'ipl_mi', 'Suryakumar Yadav', 'BATTER', { bowlingStyle: 'RM' }),
    createEmptyPlayer('mi_4', 'ipl_mi', 'Tilak Varma', 'BATTER', { bowlingStyle: 'OB' }),
    createEmptyPlayer('mi_5', 'ipl_mi', 'Hardik Pandya', 'ALL_ROUNDER', { isCaptain: true, bowlingStyle: 'RFM' }),
    createEmptyPlayer('mi_6', 'ipl_mi', 'Will Jacks', 'ALL_ROUNDER', { isOverseas: true, bowlingStyle: 'OB' }),
    createEmptyPlayer('mi_7', 'ipl_mi', 'Naman Dhir', 'ALL_ROUNDER', { bowlingStyle: 'OB' }),
    createEmptyPlayer('mi_8', 'ipl_mi', 'Mitchell Santner', 'ALL_ROUNDER', { isOverseas: true, bowlingStyle: 'SLA' }),
    createEmptyPlayer('mi_9', 'ipl_mi', 'Deepak Chahar', 'BOWLER', { bowlingStyle: 'RFM' }),
    createEmptyPlayer('mi_10', 'ipl_mi', 'Jasprit Bumrah', 'BOWLER', { bowlingStyle: 'RF' }),
    createEmptyPlayer('mi_11', 'ipl_mi', 'Trent Boult', 'BOWLER', { isOverseas: true, bowlingStyle: 'LFM' }),
    createEmptyPlayer('mi_12', 'ipl_mi', 'Quinton de Kock', 'WICKETKEEPER', { isWicketkeeper: true, isOverseas: true, bowlingStyle: 'RM' }),
    createEmptyPlayer('mi_13', 'ipl_mi', 'Sherfane Rutherford', 'BATTER', { isOverseas: true, bowlingStyle: 'RFM' }),
    createEmptyPlayer('mi_14', 'ipl_mi', 'Allah Ghazanfar', 'BOWLER', { isOverseas: true, bowlingStyle: 'OB' }),
    createEmptyPlayer('mi_15', 'ipl_mi', 'Corbin Bosch', 'ALL_ROUNDER', { isOverseas: true, bowlingStyle: 'RFM' }),
    createEmptyPlayer('mi_16', 'ipl_mi', 'Robin Minz', 'WICKETKEEPER', { isWicketkeeper: true, bowlingStyle: 'RM' }),
    createEmptyPlayer('mi_17', 'ipl_mi', 'Shardul Thakur', 'ALL_ROUNDER', { bowlingStyle: 'RFM' }),
    createEmptyPlayer('mi_18', 'ipl_mi', 'Raj Angad Bawa', 'ALL_ROUNDER', { bowlingStyle: 'RFM' }),
    createEmptyPlayer('mi_19', 'ipl_mi', 'Mayank Markande', 'BOWLER', { bowlingStyle: 'LB' }),
    createEmptyPlayer('mi_20', 'ipl_mi', 'Ashwani Kumar', 'BOWLER', { bowlingStyle: 'LFM' }),
    createEmptyPlayer('mi_21', 'ipl_mi', 'Atharva Ankolekar', 'ALL_ROUNDER', { bowlingStyle: 'SLA' }),
    createEmptyPlayer('mi_22', 'ipl_mi', 'Danish Malewar', 'BATTER', { bowlingStyle: 'OB' }),

    // 5. Kolkata Knight Riders
    createEmptyPlayer('kkr_1', 'ipl_kkr', 'Ajinkya Rahane', 'BATTER', { isCaptain: true, bowlingStyle: 'RM' }),
    createEmptyPlayer('kkr_2', 'ipl_kkr', 'Tim Seifert', 'WICKETKEEPER', { isWicketkeeper: true, isOverseas: true, bowlingStyle: 'RM' }),
    createEmptyPlayer('kkr_3', 'ipl_kkr', 'Angkrish Raghuvanshi', 'BATTER', { bowlingStyle: 'SLA' }),
    createEmptyPlayer('kkr_4', 'ipl_kkr', 'Cameron Green', 'ALL_ROUNDER', { isOverseas: true, bowlingStyle: 'RFM' }),
    createEmptyPlayer('kkr_5', 'ipl_kkr', 'Rinku Singh', 'BATTER', { bowlingStyle: 'OB' }),
    createEmptyPlayer('kkr_6', 'ipl_kkr', 'Ramandeep Singh', 'ALL_ROUNDER', { bowlingStyle: 'RM' }),
    createEmptyPlayer('kkr_7', 'ipl_kkr', 'Sunil Narine', 'ALL_ROUNDER', { isOverseas: true, bowlingStyle: 'OB' }),
    createEmptyPlayer('kkr_8', 'ipl_kkr', 'Harshit Rana', 'BOWLER', { bowlingStyle: 'RF' }),
    createEmptyPlayer('kkr_9', 'ipl_kkr', 'Varun Chakaravarthy', 'BOWLER', { bowlingStyle: 'LB' }),
    createEmptyPlayer('kkr_10', 'ipl_kkr', 'Matheesha Pathirana', 'BOWLER', { isOverseas: true, bowlingStyle: 'RF' }),
    createEmptyPlayer('kkr_11', 'ipl_kkr', 'Vaibhav Arora', 'BOWLER', { bowlingStyle: 'RFM' }),
    createEmptyPlayer('kkr_12', 'ipl_kkr', 'Finn Allen', 'WICKETKEEPER', { isWicketkeeper: true, isOverseas: true, bowlingStyle: 'OB' }),
    createEmptyPlayer('kkr_13', 'ipl_kkr', 'Rachin Ravindra', 'ALL_ROUNDER', { isOverseas: true, bowlingStyle: 'SLA' }),
    createEmptyPlayer('kkr_14', 'ipl_kkr', 'Rovman Powell', 'BATTER', { isOverseas: true, bowlingStyle: 'RM' }),
    createEmptyPlayer('kkr_15', 'ipl_kkr', 'Manish Pandey', 'BATTER', { bowlingStyle: 'RM' }),
    createEmptyPlayer('kkr_16', 'ipl_kkr', 'Rahul Tripathi', 'BATTER', { bowlingStyle: 'RM' }),
    createEmptyPlayer('kkr_17', 'ipl_kkr', 'Anukul Roy', 'ALL_ROUNDER', { bowlingStyle: 'SLA' }),
    createEmptyPlayer('kkr_18', 'ipl_kkr', 'Umran Malik', 'BOWLER', { bowlingStyle: 'RF' }),
    createEmptyPlayer('kkr_19', 'ipl_kkr', 'Akash Deep', 'BOWLER', { bowlingStyle: 'RFM' }),
    createEmptyPlayer('kkr_20', 'ipl_kkr', 'Kartik Tyagi', 'BOWLER', { bowlingStyle: 'RF' }),
    createEmptyPlayer('kkr_21', 'ipl_kkr', 'Tejasvi Singh', 'WICKETKEEPER', { isWicketkeeper: true, bowlingStyle: 'RM' }),
    createEmptyPlayer('kkr_22', 'ipl_kkr', 'Prashant Solanki', 'BOWLER', { bowlingStyle: 'LB' }),

    // 6. Sunrisers Hyderabad
    createEmptyPlayer('srh_1', 'ipl_srh', 'Travis Head', 'BATTER', { isOverseas: true, bowlingStyle: 'OB' }),
    createEmptyPlayer('srh_2', 'ipl_srh', 'Abhishek Sharma', 'ALL_ROUNDER', { bowlingStyle: 'SLA' }),
    createEmptyPlayer('srh_3', 'ipl_srh', 'Ishan Kishan', 'WICKETKEEPER', { isWicketkeeper: true, bowlingStyle: 'RM' }),
    createEmptyPlayer('srh_4', 'ipl_srh', 'Heinrich Klaasen', 'WICKETKEEPER', { isWicketkeeper: true, isOverseas: true, bowlingStyle: 'OB' }),
    createEmptyPlayer('srh_5', 'ipl_srh', 'Nitish Kumar Reddy', 'ALL_ROUNDER', { bowlingStyle: 'RFM' }),
    createEmptyPlayer('srh_6', 'ipl_srh', 'Liam Livingstone', 'ALL_ROUNDER', { isOverseas: true, bowlingStyle: 'LB' }),
    createEmptyPlayer('srh_7', 'ipl_srh', 'Aniket Verma', 'BATTER', { bowlingStyle: 'RM' }),
    createEmptyPlayer('srh_8', 'ipl_srh', 'Pat Cummins', 'BOWLER', { isCaptain: true, isOverseas: true, bowlingStyle: 'RF' }),
    createEmptyPlayer('srh_9', 'ipl_srh', 'Harshal Patel', 'BOWLER', { bowlingStyle: 'RFM' }),
    createEmptyPlayer('srh_10', 'ipl_srh', 'Mohammed Shami', 'BOWLER', { bowlingStyle: 'RF' }),
    createEmptyPlayer('srh_11', 'ipl_srh', 'Jaydev Unadkat', 'BOWLER', { bowlingStyle: 'LFM' }),
    createEmptyPlayer('srh_12', 'ipl_srh', 'Kamindu Mendis', 'ALL_ROUNDER', { isOverseas: true, bowlingStyle: 'OB' }),
    createEmptyPlayer('srh_13', 'ipl_srh', 'Brydon Carse', 'BOWLER', { isOverseas: true, bowlingStyle: 'RF' }),
    createEmptyPlayer('srh_14', 'ipl_srh', 'Eshan Malinga', 'BOWLER', { isOverseas: true, bowlingStyle: 'RFM' }),
    createEmptyPlayer('srh_15', 'ipl_srh', 'Abhinav Manohar', 'BATTER', { bowlingStyle: 'LB' }),
    createEmptyPlayer('srh_16', 'ipl_srh', 'Smaran Ravichandran', 'BATTER', { bowlingStyle: 'OB' }),
    createEmptyPlayer('srh_17', 'ipl_srh', 'Salil Arora', 'WICKETKEEPER', { isWicketkeeper: true, bowlingStyle: 'RM' }),
    createEmptyPlayer('srh_18', 'ipl_srh', 'Shivam Mavi', 'BOWLER', { bowlingStyle: 'RFM' }),
    createEmptyPlayer('srh_19', 'ipl_srh', 'Zeeshan Ansari', 'BOWLER', { bowlingStyle: 'LB' }),
    createEmptyPlayer('srh_20', 'ipl_srh', 'Sakib Hussain', 'BOWLER', { bowlingStyle: 'RFM' }),
    createEmptyPlayer('srh_21', 'ipl_srh', 'Krains Fuletra', 'ALL_ROUNDER', { bowlingStyle: 'LWS' }),
    createEmptyPlayer('srh_22', 'ipl_srh', 'Onkar Tarmale', 'BOWLER', { bowlingStyle: 'RFM' }),

    // 7. Rajasthan Royals
    createEmptyPlayer('rr_1', 'ipl_rr', 'Yashasvi Jaiswal', 'BATTER', { bowlingStyle: 'LB' }),
    createEmptyPlayer('rr_2', 'ipl_rr', 'Vaibhav Sooryavanshi', 'BATTER', { bowlingStyle: 'SLA' }),
    createEmptyPlayer('rr_3', 'ipl_rr', 'Dhruv Jurel', 'WICKETKEEPER', { isWicketkeeper: true, bowlingStyle: 'RM' }),
    createEmptyPlayer('rr_4', 'ipl_rr', 'Riyan Parag', 'ALL_ROUNDER', { isCaptain: true, bowlingStyle: 'OB' }),
    createEmptyPlayer('rr_5', 'ipl_rr', 'Shimron Hetmyer', 'BATTER', { isOverseas: true, bowlingStyle: 'RM' }),
    createEmptyPlayer('rr_6', 'ipl_rr', 'Ravindra Jadeja', 'ALL_ROUNDER', { bowlingStyle: 'SLA' }),
    createEmptyPlayer('rr_7', 'ipl_rr', 'Sam Curran', 'ALL_ROUNDER', { isOverseas: true, bowlingStyle: 'LFM' }),
    createEmptyPlayer('rr_8', 'ipl_rr', 'Jofra Archer', 'BOWLER', { isOverseas: true, bowlingStyle: 'RF' }),
    createEmptyPlayer('rr_9', 'ipl_rr', 'Ravi Bishnoi', 'BOWLER', { bowlingStyle: 'LB' }),
    createEmptyPlayer('rr_10', 'ipl_rr', 'Tushar Deshpande', 'BOWLER', { bowlingStyle: 'RFM' }),
    createEmptyPlayer('rr_11', 'ipl_rr', 'Sandeep Sharma', 'BOWLER', { bowlingStyle: 'RFM' }),
    createEmptyPlayer('rr_12', 'ipl_rr', 'Nandre Burger', 'BOWLER', { isOverseas: true, bowlingStyle: 'LF' }),
    createEmptyPlayer('rr_13', 'ipl_rr', 'Kwena Maphaka', 'BOWLER', { isOverseas: true, bowlingStyle: 'LF' }),
    createEmptyPlayer('rr_14', 'ipl_rr', 'Adam Milne', 'BOWLER', { isOverseas: true, bowlingStyle: 'RF' }),
    createEmptyPlayer('rr_15', 'ipl_rr', 'Donovan Ferreira', 'WICKETKEEPER', { isWicketkeeper: true, isOverseas: true, bowlingStyle: 'OB' }),
    createEmptyPlayer('rr_16', 'ipl_rr', 'Shubham Dubey', 'BATTER', { bowlingStyle: 'OB' }),
    createEmptyPlayer('rr_17', 'ipl_rr', 'Yudhvir Singh', 'ALL_ROUNDER', { bowlingStyle: 'RFM' }),
    createEmptyPlayer('rr_18', 'ipl_rr', 'Kuldeep Sen', 'BOWLER', { bowlingStyle: 'RF' }),
    createEmptyPlayer('rr_19', 'ipl_rr', 'Vignesh Puthur', 'BOWLER', { bowlingStyle: 'LWS' }),
    createEmptyPlayer('rr_20', 'ipl_rr', 'Sushant Mishra', 'BOWLER', { bowlingStyle: 'LFM' }),
    createEmptyPlayer('rr_21', 'ipl_rr', 'Brijesh Sharma', 'BOWLER', { bowlingStyle: 'RFM' }),
    createEmptyPlayer('rr_22', 'ipl_rr', 'Yash Raj Punia', 'BOWLER', { bowlingStyle: 'LB' }),

    // 8. Delhi Capitals
    createEmptyPlayer('dc_1', 'ipl_dc', 'KL Rahul', 'WICKETKEEPER', { isWicketkeeper: true, bowlingStyle: 'RM' }),
    createEmptyPlayer('dc_2', 'ipl_dc', 'Pathum Nissanka', 'BATTER', { isOverseas: true, bowlingStyle: 'RM' }),
    createEmptyPlayer('dc_3', 'ipl_dc', 'Abishek Porel', 'WICKETKEEPER', { isWicketkeeper: true, bowlingStyle: 'RM' }),
    createEmptyPlayer('dc_4', 'ipl_dc', 'Tristan Stubbs', 'WICKETKEEPER', { isWicketkeeper: true, isOverseas: true, bowlingStyle: 'OB' }),
    createEmptyPlayer('dc_5', 'ipl_dc', 'David Miller', 'BATTER', { isOverseas: true, bowlingStyle: 'OB' }),
    createEmptyPlayer('dc_6', 'ipl_dc', 'Axar Patel', 'ALL_ROUNDER', { isCaptain: true, bowlingStyle: 'SLA' }),
    createEmptyPlayer('dc_7', 'ipl_dc', 'Ashutosh Sharma', 'BATTER', { bowlingStyle: 'RM' }),
    createEmptyPlayer('dc_8', 'ipl_dc', 'Vipraj Nigam', 'ALL_ROUNDER', { bowlingStyle: 'LB' }),
    createEmptyPlayer('dc_9', 'ipl_dc', 'Mitchell Starc', 'BOWLER', { isOverseas: true, bowlingStyle: 'LF' }),
    createEmptyPlayer('dc_10', 'ipl_dc', 'Kuldeep Yadav', 'BOWLER', { bowlingStyle: 'LWS' }),
    createEmptyPlayer('dc_11', 'ipl_dc', 'T. Natarajan', 'BOWLER', { bowlingStyle: 'LFM' }),
    createEmptyPlayer('dc_12', 'ipl_dc', 'Lungi Ngidi', 'BOWLER', { isOverseas: true, bowlingStyle: 'RF' }),
    createEmptyPlayer('dc_13', 'ipl_dc', 'Dushmantha Chameera', 'BOWLER', { isOverseas: true, bowlingStyle: 'RF' }),
    createEmptyPlayer('dc_14', 'ipl_dc', 'Kyle Jamieson', 'BOWLER', { isOverseas: true, bowlingStyle: 'RFM' }),
    createEmptyPlayer('dc_15', 'ipl_dc', 'Rehan Ahmed', 'ALL_ROUNDER', { isOverseas: true, bowlingStyle: 'LB' }),
    createEmptyPlayer('dc_16', 'ipl_dc', 'Nitish Rana', 'ALL_ROUNDER', { bowlingStyle: 'OB' }),
    createEmptyPlayer('dc_17', 'ipl_dc', 'Karun Nair', 'BATTER', { bowlingStyle: 'OB' }),
    createEmptyPlayer('dc_18', 'ipl_dc', 'Sameer Rizvi', 'BATTER', { bowlingStyle: 'OB' }),
    createEmptyPlayer('dc_19', 'ipl_dc', 'Mukesh Kumar', 'BOWLER', { bowlingStyle: 'RFM' }),
    createEmptyPlayer('dc_20', 'ipl_dc', 'Auqib Dar', 'ALL_ROUNDER', { bowlingStyle: 'RFM' }),
    createEmptyPlayer('dc_21', 'ipl_dc', 'Prithvi Shaw', 'BATTER', { bowlingStyle: 'OB' }),
    createEmptyPlayer('dc_22', 'ipl_dc', 'Ajay Mandal', 'ALL_ROUNDER', { bowlingStyle: 'SLA' }),

    // 9. Punjab Kings
    createEmptyPlayer('pbks_1', 'ipl_pbks', 'Priyansh Arya', 'BATTER', { bowlingStyle: 'SLA' }),
    createEmptyPlayer('pbks_2', 'ipl_pbks', 'Prabhsimran Singh', 'WICKETKEEPER', { isWicketkeeper: true, bowlingStyle: 'RM' }),
    createEmptyPlayer('pbks_3', 'ipl_pbks', 'Shreyas Iyer', 'BATTER', { isCaptain: true, bowlingStyle: 'OB' }),
    createEmptyPlayer('pbks_4', 'ipl_pbks', 'Nehal Wadhera', 'BATTER', { bowlingStyle: 'LB' }),
    createEmptyPlayer('pbks_5', 'ipl_pbks', 'Marcus Stoinis', 'ALL_ROUNDER', { isOverseas: true, bowlingStyle: 'RM' }),
    createEmptyPlayer('pbks_6', 'ipl_pbks', 'Shashank Singh', 'ALL_ROUNDER', { bowlingStyle: 'RM' }),
    createEmptyPlayer('pbks_7', 'ipl_pbks', 'Marco Jansen', 'ALL_ROUNDER', { isOverseas: true, bowlingStyle: 'LF' }),
    createEmptyPlayer('pbks_8', 'ipl_pbks', 'Azmatullah Omarzai', 'ALL_ROUNDER', { isOverseas: true, bowlingStyle: 'RFM' }),
    createEmptyPlayer('pbks_9', 'ipl_pbks', 'Harpreet Brar', 'BOWLER', { bowlingStyle: 'SLA' }),
    createEmptyPlayer('pbks_10', 'ipl_pbks', 'Arshdeep Singh', 'BOWLER', { bowlingStyle: 'LFM' }),
    createEmptyPlayer('pbks_11', 'ipl_pbks', 'Yuzvendra Chahal', 'BOWLER', { bowlingStyle: 'LB' }),
    createEmptyPlayer('pbks_12', 'ipl_pbks', 'Lockie Ferguson', 'BOWLER', { isOverseas: true, bowlingStyle: 'RF' }),
    createEmptyPlayer('pbks_13', 'ipl_pbks', 'Xavier Bartlett', 'BOWLER', { isOverseas: true, bowlingStyle: 'RFM' }),
    createEmptyPlayer('pbks_14', 'ipl_pbks', 'Mitch Owen', 'ALL_ROUNDER', { isOverseas: true, bowlingStyle: 'RM' }),
    createEmptyPlayer('pbks_15', 'ipl_pbks', 'Cooper Connolly', 'ALL_ROUNDER', { isOverseas: true, bowlingStyle: 'SLA' }),
    createEmptyPlayer('pbks_16', 'ipl_pbks', 'Ben Dwarshuis', 'BOWLER', { isOverseas: true, bowlingStyle: 'LFM' }),
    createEmptyPlayer('pbks_17', 'ipl_pbks', 'Vishnu Vinod', 'WICKETKEEPER', { isWicketkeeper: true, bowlingStyle: 'RM' }),
    createEmptyPlayer('pbks_18', 'ipl_pbks', 'Vijaykumar Vyshak', 'BOWLER', { bowlingStyle: 'RFM' }),
    createEmptyPlayer('pbks_19', 'ipl_pbks', 'Yash Thakur', 'BOWLER', { bowlingStyle: 'RFM' }),
    createEmptyPlayer('pbks_20', 'ipl_pbks', 'Suryansh Shedge', 'ALL_ROUNDER', { bowlingStyle: 'RFM' }),
    createEmptyPlayer('pbks_21', 'ipl_pbks', 'Musheer Khan', 'ALL_ROUNDER', { bowlingStyle: 'SLA' }),
    createEmptyPlayer('pbks_22', 'ipl_pbks', 'Pravin Dubey', 'BOWLER', { bowlingStyle: 'LB' }),

    // 10. Lucknow Super Giants
    createEmptyPlayer('lsg_1', 'ipl_lsg', 'Mitchell Marsh', 'ALL_ROUNDER', { isOverseas: true, bowlingStyle: 'RFM' }),
    createEmptyPlayer('lsg_2', 'ipl_lsg', 'Aiden Markram', 'ALL_ROUNDER', { isOverseas: true, bowlingStyle: 'OB' }),
    createEmptyPlayer('lsg_3', 'ipl_lsg', 'Nicholas Pooran', 'WICKETKEEPER', { isWicketkeeper: true, isOverseas: true, bowlingStyle: 'OB' }),
    createEmptyPlayer('lsg_4', 'ipl_lsg', 'Rishabh Pant', 'WICKETKEEPER', { isCaptain: true, isWicketkeeper: true, bowlingStyle: 'RM' }),
    createEmptyPlayer('lsg_5', 'ipl_lsg', 'Ayush Badoni', 'ALL_ROUNDER', { bowlingStyle: 'OB' }),
    createEmptyPlayer('lsg_6', 'ipl_lsg', 'Abdul Samad', 'BATTER', { bowlingStyle: 'LB' }),
    createEmptyPlayer('lsg_7', 'ipl_lsg', 'Shahbaz Ahmed', 'ALL_ROUNDER', { bowlingStyle: 'SLA' }),
    createEmptyPlayer('lsg_8', 'ipl_lsg', 'Mayank Yadav', 'BOWLER', { bowlingStyle: 'RF' }),
    createEmptyPlayer('lsg_9', 'ipl_lsg', 'Mohammed Shami', 'BOWLER', { bowlingStyle: 'RF' }),
    createEmptyPlayer('lsg_10', 'ipl_lsg', 'Avesh Khan', 'BOWLER', { bowlingStyle: 'RFM' }),
    createEmptyPlayer('lsg_11', 'ipl_lsg', 'Digvesh Rathi', 'BOWLER', { bowlingStyle: 'LB' }),
    createEmptyPlayer('lsg_12', 'ipl_lsg', 'Wanindu Hasaranga', 'ALL_ROUNDER', { isOverseas: true, bowlingStyle: 'LB' }),
    createEmptyPlayer('lsg_13', 'ipl_lsg', 'Anrich Nortje', 'BOWLER', { isOverseas: true, bowlingStyle: 'RF' }),
    createEmptyPlayer('lsg_14', 'ipl_lsg', 'Josh Inglis', 'WICKETKEEPER', { isWicketkeeper: true, isOverseas: true, bowlingStyle: 'RM' }),
    createEmptyPlayer('lsg_15', 'ipl_lsg', 'Mohsin Khan', 'BOWLER', { bowlingStyle: 'LFM' }),
    createEmptyPlayer('lsg_16', 'ipl_lsg', 'Prince Yadav', 'BOWLER', { bowlingStyle: 'RFM' }),
    createEmptyPlayer('lsg_17', 'ipl_lsg', 'Arjun Tendulkar', 'ALL_ROUNDER', { bowlingStyle: 'LFM' }),
    createEmptyPlayer('lsg_18', 'ipl_lsg', 'Arshin Kulkarni', 'ALL_ROUNDER', { bowlingStyle: 'RM' }),
    createEmptyPlayer('lsg_19', 'ipl_lsg', 'M. Siddharth', 'BOWLER', { bowlingStyle: 'SLA' }),
    createEmptyPlayer('lsg_20', 'ipl_lsg', 'Akash Singh', 'BOWLER', { bowlingStyle: 'LFM' }),
    createEmptyPlayer('lsg_21', 'ipl_lsg', 'Naman Tiwari', 'BOWLER', { bowlingStyle: 'LFM' }),
    createEmptyPlayer('lsg_22', 'ipl_lsg', 'Himmat Singh', 'BATTER', { bowlingStyle: 'OB' }),
  ];

  await db.transaction('rw', db.teams, db.players, async () => {
    const existingTeams = await db.teams.toArray();
    const existingTeamMap = new Map(existingTeams.map((t) => [t.id, t]));
    const missingTeams: Team[] = [];
    const updatedTeams: Team[] = [];

    for (const t of teams) {
      const existing = existingTeamMap.get(t.id);
      if (!existing) {
        missingTeams.push(t);
      } else if (!existing.category && t.category) {
        updatedTeams.push({ ...existing, category: t.category });
      }
    }

    if (missingTeams.length > 0) await db.teams.bulkPut(missingTeams);
    if (updatedTeams.length > 0) await db.teams.bulkPut(updatedTeams);

    const existingPlayers = await db.players.toArray();

    // Purge any accidental duplicate player rows within the same team
    const seenTeamNameKeys = new Set<string>();
    const duplicateIdsToDelete: string[] = [];
    const existingPlayerMap = new Map<string, Player>();

    for (const ep of existingPlayers) {
      const dedupeKey = `${ep.teamId}::${ep.name.toLowerCase()}`;
      if (seenTeamNameKeys.has(dedupeKey)) {
        duplicateIdsToDelete.push(ep.id);
      } else {
        seenTeamNameKeys.add(dedupeKey);
        existingPlayerMap.set(ep.id, ep);
      }
    }

    if (duplicateIdsToDelete.length > 0) {
      await db.players.bulkDelete(duplicateIdsToDelete);
    }

    const newPlayers: Player[] = [];
    const updatedPlayers: Player[] = [];

    for (const p of players) {
      const existing = existingPlayerMap.get(p.id);
      if (!existing) {
        const dedupeKey = `${p.teamId}::${p.name.toLowerCase()}`;
        if (!seenTeamNameKeys.has(dedupeKey)) {
          seenTeamNameKeys.add(dedupeKey);
          newPlayers.push(p);
        }
      } else {
        const needsStyle = !existing.bowlingStyle && p.bowlingStyle;
        const needsOverseas =
          existing.isOverseas === undefined && p.isOverseas !== undefined;
        if (needsStyle || needsOverseas) {
          updatedPlayers.push({
            ...existing,
            bowlingStyle: existing.bowlingStyle ?? p.bowlingStyle,
            isOverseas: existing.isOverseas ?? p.isOverseas,
          });
        }
      }
    }

    if (newPlayers.length > 0) await db.players.bulkPut(newPlayers);
    if (updatedPlayers.length > 0) await db.players.bulkPut(updatedPlayers);
  });
}