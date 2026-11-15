import type { DismissalType, ExtrasType, MatchFormat } from '../types/cricket';

export interface RawBallOutcome {
  runs: number;
  extrasType: ExtrasType;
  extraRuns: number;
  isWicket: boolean;
  dismissalType?: DismissalType;
}

// T20 Pool: Exactly 120 elements (8 Wickets, 4 Triples, 15 Fours, 8 Sixes)
const T20_POOL: RawBallOutcome[] = [
  ...Array(26).fill({ runs: 0, extrasType: null, extraRuns: 0, isWicket: false }),
  ...Array(41).fill({ runs: 1, extrasType: null, extraRuns: 0, isWicket: false }),
  ...Array(12).fill({ runs: 2, extrasType: null, extraRuns: 0, isWicket: false }),
  ...Array(4).fill({ runs: 3, extrasType: null, extraRuns: 0, isWicket: false }),
  ...Array(15).fill({ runs: 4, extrasType: null, extraRuns: 0, isWicket: false }),
  ...Array(8).fill({ runs: 6, extrasType: null, extraRuns: 0, isWicket: false }),
  ...Array(4).fill({ runs: 0, extrasType: 'WIDE', extraRuns: 1, isWicket: false }),
  ...Array(1).fill({ runs: 0, extrasType: 'NO_BALL', extraRuns: 1, isWicket: false }),
  ...Array(1).fill({ runs: 0, extrasType: 'LEG_BYE', extraRuns: 1, isWicket: false }),
  ...Array(8).fill({ runs: 0, extrasType: null, extraRuns: 0, isWicket: true }),
];

// ODI Pool: Exactly 120 elements (6 Wickets, 2 Triples, 11 Fours, 3 Sixes)
const ODI_POOL: RawBallOutcome[] = [
  ...Array(42).fill({ runs: 0, extrasType: null, extraRuns: 0, isWicket: false }),
  ...Array(41).fill({ runs: 1, extrasType: null, extraRuns: 0, isWicket: false }),
  ...Array(11).fill({ runs: 2, extrasType: null, extraRuns: 0, isWicket: false }),
  ...Array(2).fill({ runs: 3, extrasType: null, extraRuns: 0, isWicket: false }),
  ...Array(11).fill({ runs: 4, extrasType: null, extraRuns: 0, isWicket: false }),
  ...Array(3).fill({ runs: 6, extrasType: null, extraRuns: 0, isWicket: false }),
  ...Array(2).fill({ runs: 0, extrasType: 'WIDE', extraRuns: 1, isWicket: false }),
  ...Array(1).fill({ runs: 0, extrasType: 'NO_BALL', extraRuns: 1, isWicket: false }),
  ...Array(1).fill({ runs: 0, extrasType: 'LEG_BYE', extraRuns: 1, isWicket: false }),
  ...Array(6).fill({ runs: 0, extrasType: null, extraRuns: 0, isWicket: true }),
];

// Test Pool: Exactly 200 elements (4 Wickets, 2 Triples, 10 Fours, 2 Sixes)
const TEST_POOL: RawBallOutcome[] = [
  ...Array(124).fill({ runs: 0, extrasType: null, extraRuns: 0, isWicket: false }),
  ...Array(44).fill({ runs: 1, extrasType: null, extraRuns: 0, isWicket: false }),
  ...Array(12).fill({ runs: 2, extrasType: null, extraRuns: 0, isWicket: false }),
  ...Array(2).fill({ runs: 3, extrasType: null, extraRuns: 0, isWicket: false }),
  ...Array(10).fill({ runs: 4, extrasType: null, extraRuns: 0, isWicket: false }),
  ...Array(2).fill({ runs: 6, extrasType: null, extraRuns: 0, isWicket: false }),
  ...Array(1).fill({ runs: 0, extrasType: 'BYE', extraRuns: 1, isWicket: false }),
  ...Array(1).fill({ runs: 0, extrasType: 'NO_BALL', extraRuns: 1, isWicket: false }),
  ...Array(4).fill({ runs: 0, extrasType: null, extraRuns: 0, isWicket: true }),
];

const DISMISSALS: DismissalType[] = [
  'CAUGHT',
  'CAUGHT',
  'BOWLED',
  'LBW',
  'RUN_OUT',
  'STUMPED',
  'HIT_WICKET',
];

export function rollBallOutcome(format: MatchFormat): RawBallOutcome {
  const pool =
    format === 'T20' ? T20_POOL : format === 'ODI' ? ODI_POOL : TEST_POOL;
  const picked = { ...pool[Math.floor(Math.random() * pool.length)] };

  if (picked.isWicket) {
    picked.dismissalType =
      DISMISSALS[Math.floor(Math.random() * DISMISSALS.length)];
  }
  return picked;
}

// ~25% chance a reviewable wicket (LBW/CAUGHT) is overturned if DRS is triggered
export function rollDrsOverturn(dismissal?: DismissalType): boolean {
  if (dismissal !== 'LBW' && dismissal !== 'CAUGHT') return false;
  return Math.random() < 0.25;
}