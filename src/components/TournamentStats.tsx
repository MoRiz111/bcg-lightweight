import { useMemo, useState } from 'react';
import type { Match, Player, Team, Tournament } from '../types/cricket';

export interface TournamentPlayerRecord {
  player: Player;
  team: Team;
  matches: number;
  // Batting
  batInnings: number;
  runs: number;
  ballsFaced: number;
  notOuts: number;
  highest: number;
  highestNotOut: boolean;
  fours: number;
  sixes: number;
  thirties: number;
  fifties: number;
  hundreds: number;
  twoHundreds: number;
  batAverage: number;
  strikeRate: number;
  // Bowling
  bowlInnings: number;
  ballsBowled: number;
  oversDisplay: string;
  maidens: number;
  runsConceded: number;
  wickets: number;
  bestWickets: number;
  bestRuns: number;
  threeWickets: number;
  fourWickets: number;
  fiveWickets: number;
  economy: number;
  bowlAverage: number;
  bowlStrikeRate: number;
}

type StatSortKey =
  | 'runs'
  | 'wickets'
  | 'highest'
  | 'strikeRate'
  | 'batAverage'
  | 'sixes'
  | 'fours'
  | 'ballsFaced'
  | 'ballsBowled'
  | 'economy'
  | 'bowlAverage'
  | 'bowlStrikeRate'
  | 'maidens';

const LEADERBOARD_OPTIONS: { key: StatSortKey; label: string; badge?: string }[] = [
  { key: 'runs', label: 'Most Runs', badge: '🧡 Orange Cap' },
  { key: 'wickets', label: 'Most Wickets', badge: '💜 Purple Cap' },
  { key: 'highest', label: 'Highest Individual Score' },
  { key: 'batAverage', label: 'Best Batting Average' },
  { key: 'strikeRate', label: 'Best Batting Strike Rate' },
  { key: 'sixes', label: 'Most Sixes (6s)' },
  { key: 'fours', label: 'Most Fours (4s)' },
  { key: 'ballsFaced', label: 'Most Balls Faced' },
  { key: 'ballsBowled', label: 'Most Overs / Balls Bowled' },
  { key: 'economy', label: 'Best Economy Rate' },
  { key: 'bowlAverage', label: 'Best Bowling Average' },
  { key: 'bowlStrikeRate', label: 'Best Bowling Strike Rate' },
  { key: 'maidens', label: 'Most Maidens' },
];

interface TournamentStatsProps {
  tournament: Tournament;
  matches: Match[];
  teams: Record<string, Team>;
  players: Player[];
}

export function TournamentStats({
  tournament,
  matches,
  teams,
  players,
}: TournamentStatsProps) {
  const [browseMode, setBrowseMode] = useState<'LEADERS' | 'TEAM_WISE'>('LEADERS');
  const [sortBy, setSortBy] = useState<StatSortKey>('runs');
  const [selectedTeamId, setSelectedTeamId] = useState<string>(
    tournament.teamIds[0] ?? ''
  );
  const [inspectedPlayerId, setInspectedPlayerId] = useState<string | null>(null);

  const playerMap = useMemo(
    () => Object.fromEntries(players.map((p) => [p.id, p])),
    [players]
  );

  // Aggregate every stat from all matches belonging to this tournament
  const records = useMemo(() => {
    const map = new Map<string, TournamentPlayerRecord>();

    // Seed all squad players from participating teams so even 0-match bench players are inspectable team-wise
    for (const p of players) {
      if (!tournament.teamIds.includes(p.teamId)) continue;
      const team = teams[p.teamId];
      if (!team) continue;
      map.set(p.id, {
        player: p,
        team,
        matches: 0,
        batInnings: 0,
        runs: 0,
        ballsFaced: 0,
        notOuts: 0,
        highest: 0,
        highestNotOut: false,
        fours: 0,
        sixes: 0,
        thirties: 0,
        fifties: 0,
        hundreds: 0,
        twoHundreds: 0,
        batAverage: 0,
        strikeRate: 0,
        bowlInnings: 0,
        ballsBowled: 0,
        oversDisplay: '0.0',
        maidens: 0,
        runsConceded: 0,
        wickets: 0,
        bestWickets: 0,
        bestRuns: 999,
        threeWickets: 0,
        fourWickets: 0,
        fiveWickets: 0,
        economy: 0,
        bowlAverage: 0,
        bowlStrikeRate: 0,
      });
    }

    for (const m of matches) {
      if (m.tournamentId !== tournament.id) continue;
      const appearedInMatch = new Set<string>();

      for (const id of [...m.playingXIA, ...m.playingXIB]) {
        appearedInMatch.add(id);
      }

      for (const inn of m.inningsList) {
        Object.values(inn.battingCard).forEach((card, idx) => {
          const rec = map.get(card.playerId);
          const didBat =
            card.balls > 0 || card.isOut || idx <= inn.wickets + 1;
          if (!rec || !didBat) return;

          rec.batInnings += 1;
          rec.runs += card.runs;
          rec.ballsFaced += card.balls;
          rec.fours += card.fours;
          rec.sixes += card.sixes;
          if (!card.isOut) rec.notOuts += 1;

          if (
            card.runs > rec.highest ||
            (card.runs === rec.highest && !card.isOut)
          ) {
            rec.highest = card.runs;
            rec.highestNotOut = !card.isOut;
          }

          if (card.runs >= 200) rec.twoHundreds += 1;
          else if (card.runs >= 100) rec.hundreds += 1;
          else if (card.runs >= 50) rec.fifties += 1;
          else if (card.runs >= 30) rec.thirties += 1;
        });

        Object.values(inn.bowlingCard).forEach((card) => {
          const rec = map.get(card.playerId);
          if (!rec || card.ballsBowled === 0) return;

          rec.bowlInnings += 1;
          rec.ballsBowled += card.ballsBowled;
          rec.maidens += card.maidens;
          rec.runsConceded += card.runsConceded;
          rec.wickets += card.wickets;

          if (card.wickets >= 5) rec.fiveWickets += 1;
          else if (card.wickets === 4) rec.fourWickets += 1;
          else if (card.wickets === 3) rec.threeWickets += 1;

          if (
            card.wickets > rec.bestWickets ||
            (card.wickets === rec.bestWickets &&
              card.runsConceded < rec.bestRuns)
          ) {
            rec.bestWickets = card.wickets;
            rec.bestRuns = card.runsConceded;
          }
        });
      }

      appearedInMatch.forEach((id) => {
        const rec = map.get(id);
        if (rec) rec.matches += 1;
      });
    }

    // Finalize derived ratios
    for (const rec of map.values()) {
      const dismissals = rec.batInnings - rec.notOuts;
      rec.batAverage =
        dismissals > 0
          ? Number((rec.runs / dismissals).toFixed(2))
          : rec.runs;
      rec.strikeRate =
        rec.ballsFaced > 0
          ? Number(((rec.runs / rec.ballsFaced) * 100).toFixed(2))
          : 0;

      rec.oversDisplay = `${Math.floor(rec.ballsBowled / 6)}.${
        rec.ballsBowled % 6
      }`;
      const trueOvers = rec.ballsBowled / 6;
      rec.economy =
        trueOvers > 0 ? Number((rec.runsConceded / trueOvers).toFixed(2)) : 0;
      rec.bowlAverage =
        rec.wickets > 0
          ? Number((rec.runsConceded / rec.wickets).toFixed(2))
          : 0;
      rec.bowlStrikeRate =
        rec.wickets > 0
          ? Number((rec.ballsBowled / rec.wickets).toFixed(1))
          : 0;
    }

    return Array.from(map.values());
  }, [tournament.id, tournament.teamIds, matches, players, teams]);

  const sortedRecords = useMemo(() => {
    if (browseMode === 'TEAM_WISE') {
      return records.filter((r) => r.team.id === selectedTeamId);
    }

    const filtered = records.filter((r) => {
      if (
        ['runs', 'highest', 'batAverage', 'strikeRate', 'sixes', 'fours', 'ballsFaced'].includes(
          sortBy
        )
      ) {
        return r.ballsFaced > 0 || r.runs > 0;
      }
      if (['bowlAverage', 'bowlStrikeRate'].includes(sortBy)) {
        return r.wickets > 0;
      }
      return r.ballsBowled > 0;
    });

    return [...filtered].sort((a, b) => {
      // Lower is better for economy, bowling average, and bowling strike rate
      if (
        sortBy === 'economy' ||
        sortBy === 'bowlAverage' ||
        sortBy === 'bowlStrikeRate'
      ) {
        return a[sortBy] - b[sortBy];
      }
      return b[sortBy] - a[sortBy];
    });
  }, [records, browseMode, selectedTeamId, sortBy]);

  const inspectedRecord = inspectedPlayerId
    ? records.find((r) => r.player.id === inspectedPlayerId)
    : undefined;

  const activeMeta = LEADERBOARD_OPTIONS.find((o) => o.key === sortBy);

  return (
    <div className="space-y-5">
      {/* Player Full Stat Modal */}
      {inspectedRecord && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg font-extrabold text-white">
                    {inspectedRecord.player.name}
                  </h3>
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-xs font-bold">
                    {inspectedRecord.team.shortName}
                  </span>
                  {inspectedRecord.player.isOverseas && (
                    <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 text-xs font-bold">
                      ✈ OS
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  {inspectedRecord.player.role} •{' '}
                  {inspectedRecord.player.bowlingStyle ?? 'RM'} •{' '}
                  {inspectedRecord.matches} Matches in {tournament.name}
                </div>
              </div>

              <button
                onClick={() => setInspectedPlayerId(null)}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 cursor-pointer"
              >
                ✕ Close
              </button>
            </div>

            {/* Tournament Batting Breakdown */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-2">
              <div className="text-xs uppercase tracking-wider font-bold text-emerald-400">
                Tournament Batting
              </div>
              <div className="grid grid-cols-4 gap-2 text-xs">
                <div>
                  <span className="text-slate-500 block">Innings</span>
                  <span className="font-bold text-white">
                    {inspectedRecord.batInnings}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Runs</span>
                  <span className="font-bold text-emerald-400">
                    {inspectedRecord.runs}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Balls</span>
                  <span className="font-bold text-white">
                    {inspectedRecord.ballsFaced}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Highest</span>
                  <span className="font-bold text-white">
                    {inspectedRecord.highest}
                    {inspectedRecord.highestNotOut ? '*' : ''}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Average</span>
                  <span className="font-bold text-white">
                    {inspectedRecord.batAverage}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Strike Rate</span>
                  <span className="font-bold text-white">
                    {inspectedRecord.strikeRate}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">4s / 6s</span>
                  <span className="font-bold text-white">
                    {inspectedRecord.fours} / {inspectedRecord.sixes}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Not Outs</span>
                  <span className="font-bold text-white">
                    {inspectedRecord.notOuts}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">30s / 50s</span>
                  <span className="font-bold text-white">
                    {inspectedRecord.thirties} / {inspectedRecord.fifties}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">100s / 200s</span>
                  <span className="font-bold text-white">
                    {inspectedRecord.hundreds} / {inspectedRecord.twoHundreds}
                  </span>
                </div>
              </div>
            </div>

            {/* Tournament Bowling Breakdown */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-2">
              <div className="text-xs uppercase tracking-wider font-bold text-sky-400">
                Tournament Bowling
              </div>
              <div className="grid grid-cols-4 gap-2 text-xs">
                <div>
                  <span className="text-slate-500 block">Innings</span>
                  <span className="font-bold text-white">
                    {inspectedRecord.bowlInnings}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Overs</span>
                  <span className="font-bold text-white">
                    {inspectedRecord.oversDisplay}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Balls</span>
                  <span className="font-bold text-white">
                    {inspectedRecord.ballsBowled}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Wickets</span>
                  <span className="font-bold text-sky-400">
                    {inspectedRecord.wickets}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Runs Given</span>
                  <span className="font-bold text-white">
                    {inspectedRecord.runsConceded}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Economy</span>
                  <span className="font-bold text-white">
                    {inspectedRecord.economy.toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Average</span>
                  <span className="font-bold text-white">
                    {inspectedRecord.wickets > 0
                      ? inspectedRecord.bowlAverage
                      : '-'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Strike Rate</span>
                  <span className="font-bold text-white">
                    {inspectedRecord.wickets > 0
                      ? inspectedRecord.bowlStrikeRate
                      : '-'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Best Figures</span>
                  <span className="font-bold text-white">
                    {inspectedRecord.bowlInnings > 0
                      ? `${inspectedRecord.bestWickets}/${inspectedRecord.bestRuns}`
                      : '-'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Maidens</span>
                  <span className="font-bold text-white">
                    {inspectedRecord.maidens}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">3W / 4W / 5W</span>
                  <span className="font-bold text-white">
                    {inspectedRecord.threeWickets} /{' '}
                    {inspectedRecord.fourWickets} /{' '}
                    {inspectedRecord.fiveWickets}
                  </span>
                </div>
              </div>
            </div>

            {/* Overall Career Snapshot (Across All Matches & Formats) */}
            <div className="bg-slate-950/70 border border-amber-500/30 rounded-xl p-3.5 space-y-1.5">
              <div className="text-[11px] uppercase tracking-wider font-bold text-amber-400">
                All-Time Overall Career (International + IPL + Custom)
              </div>
              <div className="flex flex-wrap justify-between gap-2 text-xs text-slate-300">
                <span>
                  Batting:{' '}
                  <strong className="text-white">
                    {playerMap[inspectedRecord.player.id]?.batting.runs ?? 0}{' '}
                    runs
                  </strong>{' '}
                  ({playerMap[inspectedRecord.player.id]?.batting.balls ?? 0}b,
                  HS {playerMap[inspectedRecord.player.id]?.batting.highest ?? 0})
                </span>
                <span>
                  Bowling:{' '}
                  <strong className="text-white">
                    {playerMap[inspectedRecord.player.id]?.bowling.wickets ?? 0}{' '}
                    wkts
                  </strong>{' '}
                  ({playerMap[inspectedRecord.player.id]?.bowling.overs ?? 0} ov)
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter Controls Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex gap-2">
          <button
            onClick={() => setBrowseMode('LEADERS')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold cursor-pointer ${
              browseMode === 'LEADERS'
                ? 'bg-emerald-500 text-slate-950'
                : 'bg-slate-950 text-slate-300 border border-slate-800'
            }`}
          >
            Stat Leaders
          </button>
          <button
            onClick={() => setBrowseMode('TEAM_WISE')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold cursor-pointer ${
              browseMode === 'TEAM_WISE'
                ? 'bg-emerald-500 text-slate-950'
                : 'bg-slate-950 text-slate-300 border border-slate-800'
            }`}
          >
            Team-Wise Squad Stats
          </button>
        </div>

        {browseMode === 'LEADERS' ? (
          <div className="flex items-center gap-2">
            {activeMeta?.badge && (
              <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 text-xs font-bold whitespace-nowrap">
                {activeMeta.badge}
              </span>
            )}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as StatSortKey)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs sm:text-sm text-white"
            >
              {LEADERBOARD_OPTIONS.map((opt) => (
                <option key={opt.key} value={opt.key}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <select
            value={selectedTeamId}
            onChange={(e) => setSelectedTeamId(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs sm:text-sm text-white"
          >
            {tournament.teamIds.map((tid) => (
              <option key={tid} value={tid}>
                {teams[tid]?.name ?? tid} ({teams[tid]?.shortName})
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Stats Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
          <span className="font-bold text-sm text-slate-100">
            {browseMode === 'LEADERS'
              ? activeMeta?.label
              : `${teams[selectedTeamId]?.name ?? 'Team'} — Squad Stats`}
          </span>
          <span className="text-[11px] text-slate-400">
            Click any player for full career & tournament breakdown
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm text-left">
            <thead className="text-[11px] uppercase bg-slate-950/60 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">#</th>
                <th className="py-2.5 px-3">Player</th>
                <th className="py-2.5 px-2 text-right">M</th>
                <th className="py-2.5 px-2 text-right">Runs</th>
                <th className="py-2.5 px-2 text-right">BF</th>
                <th className="py-2.5 px-2 text-right">HS</th>
                <th className="py-2.5 px-2 text-right">Avg</th>
                <th className="py-2.5 px-2 text-right">SR</th>
                <th className="py-2.5 px-2 text-right">4s/6s</th>
                <th className="py-2.5 px-2 text-right">Ov</th>
                <th className="py-2.5 px-2 text-right">Balls</th>
                <th className="py-2.5 px-2 text-right">Wkts</th>
                <th className="py-2.5 px-3 text-right">Econ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {sortedRecords.length === 0 ? (
                <tr>
                  <td
                    colSpan={13}
                    className="py-6 px-4 text-center text-slate-500 text-xs"
                  >
                    No match stats recorded yet — play or quick-sim a fixture first.
                  </td>
                </tr>
              ) : (
                sortedRecords.map((rec, idx) => (
                  <tr
                    key={rec.player.id}
                    onClick={() => setInspectedPlayerId(rec.player.id)}
                    className="hover:bg-slate-800/60 cursor-pointer transition"
                  >
                    <td className="py-2.5 px-3 font-mono text-xs text-slate-500">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="font-bold text-slate-100">
                        {rec.player.name}
                      </span>
                      <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                        {rec.team.shortName}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-right text-slate-400">
                      {rec.matches}
                    </td>
                    <td className="py-2.5 px-2 text-right font-bold text-emerald-400">
                      {rec.runs}
                    </td>
                    <td className="py-2.5 px-2 text-right text-slate-300">
                      {rec.ballsFaced}
                    </td>
                    <td className="py-2.5 px-2 text-right text-slate-200">
                      {rec.highest}
                      {rec.highestNotOut ? '*' : ''}
                    </td>
                    <td className="py-2.5 px-2 text-right text-slate-300">
                      {rec.batInnings > 0 ? rec.batAverage : '-'}
                    </td>
                    <td className="py-2.5 px-2 text-right text-slate-300">
                      {rec.ballsFaced > 0 ? rec.strikeRate : '-'}
                    </td>
                    <td className="py-2.5 px-2 text-right text-slate-400">
                      {rec.fours}/{rec.sixes}
                    </td>
                    <td className="py-2.5 px-2 text-right text-slate-300">
                      {rec.oversDisplay}
                    </td>
                    <td className="py-2.5 px-2 text-right text-slate-300">
                      {rec.ballsBowled}
                    </td>
                    <td className="py-2.5 px-2 text-right font-bold text-sky-400">
                      {rec.wickets}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-300">
                      {rec.ballsBowled > 0 ? rec.economy.toFixed(2) : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}