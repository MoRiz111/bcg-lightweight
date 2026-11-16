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

export async function seedInitialDataIfEmpty(): Promise<void> {
  const teams: Team[] = [
    { id: 'team_ind', name: 'India', shortName: 'IND', captainId: 'ind_1', wicketkeeperId: 'ind_3' },
    { id: 'team_nz', name: 'New Zealand', shortName: 'NZ', captainId: 'nz_1', wicketkeeperId: 'nz_3' },
    { id: 'team_aus', name: 'Australia', shortName: 'AUS', captainId: 'aus_1', wicketkeeperId: 'aus_3' },
    { id: 'team_eng', name: 'England', shortName: 'ENG', captainId: 'eng_1', wicketkeeperId: 'eng_3' },
    { id: 'team_sa', name: 'South Africa', shortName: 'SA', captainId: 'sa_1', wicketkeeperId: 'sa_3' },
    { id: 'team_wi', name: 'West Indies', shortName: 'WI', captainId: 'wi_1', wicketkeeperId: 'wi_2' },
    { id: 'team_pak', name: 'Pakistan', shortName: 'PAK', captainId: 'pak_1', wicketkeeperId: 'pak_3' },
    { id: 'team_sl', name: 'Sri Lanka', shortName: 'SL', captainId: 'sl_1', wicketkeeperId: 'sl_2' },
    { id: 'team_afg', name: 'Afghanistan', shortName: 'AFG', captainId: 'afg_1', wicketkeeperId: 'afg_2' },
    { id: 'team_ban', name: 'Bangladesh', shortName: 'BAN', captainId: 'ban_1', wicketkeeperId: 'ban_2' },
    { id: 'team_ire', name: 'Ireland', shortName: 'IRE', captainId: 'ire_1', wicketkeeperId: 'ire_3' },
    { id: 'team_zim', name: 'Zimbabwe', shortName: 'ZIM', captainId: 'zim_1', wicketkeeperId: 'zim_3' },
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
  ];

  await db.transaction('rw', db.teams, db.players, async () => {
    const existingTeams = await db.teams.toArray();
    const existingTeamIds = new Set(existingTeams.map((t) => t.id));
    const missingTeams = teams.filter((t) => !existingTeamIds.has(t.id));

    if (missingTeams.length > 0) {
      await db.teams.bulkAdd(missingTeams);
    }

    const existingPlayers = await db.players.toArray();
    const existingPlayerMap = new Map(existingPlayers.map((p) => [p.id, p]));
    const newPlayers: Player[] = [];
    const updatedPlayers: Player[] = [];

    for (const p of players) {
      const existing = existingPlayerMap.get(p.id);
      if (!existing) {
        newPlayers.push(p);
      } else if (!existing.bowlingStyle && p.bowlingStyle) {
        // Backfill bowlingStyle onto already-seeded players without touching stats
        updatedPlayers.push({ ...existing, bowlingStyle: p.bowlingStyle });
      }
    }

    if (newPlayers.length > 0) await db.players.bulkAdd(newPlayers);
    if (updatedPlayers.length > 0) await db.players.bulkPut(updatedPlayers);
  });
}