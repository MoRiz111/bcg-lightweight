import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import {
  createTournament,
  launchTournamentFixture,
  simulateTournamentFixture,
  TOURNAMENT_PRESETS,
} from '../engine/tournamentEngine';
import type { MatchFormat, Team, Tournament } from '../types/cricket';
import { TournamentStats } from './TournamentStats';
import { TeamLogo } from './TeamLogo';

interface TournamentViewProps {
  teams: Team[];
  onPlayFixtureMatch: (matchId: string, tournamentId: string) => void;
  onViewMatchScorecard: (matchId: string, tournamentId: string) => void;
  onBackHome: () => void;
}

export function TournamentView({
  teams,
  onPlayFixtureMatch,
  onViewMatchScorecard,
  onBackHome,
}: TournamentViewProps) {
  const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(
    null
  );
  const [activeSubTab, setActiveSubTab] = useState<'STANDINGS' | 'STATS'>(
    'STANDINGS'
  );
  const [isCreating, setIsCreating] = useState(false);

  const [presetIdx, setPresetIdx] = useState(0);
  const [customName, setCustomName] = useState(TOURNAMENT_PRESETS[0].label);
  const [matchFormat, setMatchFormat] = useState<MatchFormat>('T20');
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [simulatingFixtureId, setSimulatingFixtureId] = useState<string | null>(
    null
  );

  const tournaments =
    useLiveQuery(
      () => db.tournaments.orderBy('createdAt').reverse().toArray(),
      []
    ) ?? [];

  const players = useLiveQuery(() => db.players.toArray(), []) ?? [];

  const activeTournament = useLiveQuery(
    () =>
      selectedTournamentId
        ? db.tournaments.get(selectedTournamentId)
        : undefined,
    [selectedTournamentId]
  );

  const tournamentMatches =
    useLiveQuery(
      () =>
        selectedTournamentId
          ? db.matches
              .where('tournamentId')
              .equals(selectedTournamentId)
              .toArray()
          : [],
      [selectedTournamentId]
    ) ?? [];

  const teamsMap = useMemo(
    () => Object.fromEntries(teams.map((t) => [t.id, t])),
    [teams]
  );

  const activePreset = TOURNAMENT_PRESETS[presetIdx];

  const eligibleTeams = useMemo(() => {
    if (activePreset.formatType === 'IPL') {
      return teams.filter(
        (t) => t.category === 'IPL' || t.id.startsWith('ipl_')
      );
    }
    return teams.filter(
      (t) => t.category !== 'IPL' && !t.id.startsWith('ipl_')
    );
  }, [teams, activePreset.formatType]);

  useEffect(() => {
    if (activePreset.formatType === 'IPL') {
      setSelectedTeamIds(eligibleTeams.map((t) => t.id));
    } else {
      setSelectedTeamIds(eligibleTeams.slice(0, 6).map((t) => t.id));
    }
  }, [activePreset.formatType, eligibleTeams.length]);

  const handleSelectPreset = (idx: number) => {
    setPresetIdx(idx);
    const preset = TOURNAMENT_PRESETS[idx];
    setCustomName(preset.label);
    setMatchFormat(preset.matchFormat);
  };

  const toggleTeam = (teamId: string) => {
    if (selectedTeamIds.includes(teamId)) {
      setSelectedTeamIds(selectedTeamIds.filter((id) => id !== teamId));
    } else {
      setSelectedTeamIds([...selectedTeamIds, teamId]);
    }
  };

  const handleCreate = async () => {
    if (selectedTeamIds.length < 2) return;
    const id = await createTournament(
      customName.trim() || activePreset.label,
      activePreset.formatType,
      matchFormat,
      selectedTeamIds
    );
    setIsCreating(false);
    setSelectedTournamentId(id);
    setActiveSubTab('STANDINGS');
  };

  const handlePlayLive = async (fixtureId: string) => {
    if (!activeTournament) return;
    const matchId = await launchTournamentFixture(
      activeTournament.id,
      fixtureId
    );
    onPlayFixtureMatch(matchId, activeTournament.id);
  };

  const handleSimOne = async (fixtureId: string) => {
    if (!activeTournament || simulatingFixtureId) return;
    setSimulatingFixtureId(fixtureId);
    try {
      await simulateTournamentFixture(activeTournament.id, fixtureId);
    } finally {
      setSimulatingFixtureId(null);
    }
  };

  if (isCreating) {
    return (
      <div className="min-h-screen bg-slate-950 text-white p-4 sm:p-6 max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold">Create Tournament</h1>
            <p className="text-xs text-slate-400">
              {activePreset.formatType === 'IPL'
                ? 'Round-Robin + IPL Qualifier 1 / Eliminator / Qualifier 2 / Final'
                : 'Round-Robin Group Stage + Semi-Finals + Final'}
            </p>
          </div>
          <button
            onClick={() => setIsCreating(false)}
            className="px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 cursor-pointer"
          >
            Cancel
          </button>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-5">
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
              Pre-Built Tournament Format
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {TOURNAMENT_PRESETS.map((p, idx) => (
                <button
                  key={p.formatType}
                  type="button"
                  onClick={() => handleSelectPreset(idx)}
                  className={`p-3 rounded-xl border text-left text-xs font-bold transition cursor-pointer ${
                    presetIdx === idx
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                      : 'bg-slate-950 text-slate-200 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div>{p.label}</div>
                  <div
                    className={`text-[11px] font-normal mt-0.5 ${
                      presetIdx === idx ? 'text-slate-900' : 'text-slate-400'
                    }`}
                  >
                    {p.formatType === 'IPL'
                      ? '10 IPL Franchises • Q1/Elim/Q2'
                      : `${p.matchFormat} Format`}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="text-xs uppercase tracking-wider text-slate-400 font-semibold block mb-1">
                Tournament Title
              </label>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-slate-400 font-semibold block mb-1">
                Match Format
              </label>
              <select
                value={matchFormat}
                onChange={(e) => setMatchFormat(e.target.value as MatchFormat)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
              >
                <option value="T20">T20 (20 Overs)</option>
                <option value="ODI">ODI (50 Overs)</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
                {activePreset.formatType === 'IPL'
                  ? `IPL Franchises (${selectedTeamIds.length}/${eligibleTeams.length} Selected)`
                  : `International Teams (${selectedTeamIds.length}/${eligibleTeams.length} Selected)`}
              </label>
              <button
                type="button"
                onClick={() =>
                  setSelectedTeamIds(
                    selectedTeamIds.length === eligibleTeams.length
                      ? []
                      : eligibleTeams.map((t) => t.id)
                  )
                }
                className="text-xs text-sky-400 hover:underline cursor-pointer"
              >
                {selectedTeamIds.length === eligibleTeams.length
                  ? 'Clear All'
                  : `Select All ${eligibleTeams.length}`}
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {eligibleTeams.map((t) => {
                const active = selectedTeamIds.includes(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggleTeam(t.id)}
                    className={`px-3 py-2.5 rounded-xl border text-left text-xs font-semibold transition flex items-center gap-2 cursor-pointer ${
                      active
                        ? 'bg-emerald-500/15 border-emerald-500/60 text-emerald-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <TeamLogo teamId={t.id} shortName={t.shortName} size="sm" />
                    <span className="truncate">{t.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            disabled={selectedTeamIds.length < 2}
            onClick={handleCreate}
            className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-extrabold text-sm cursor-pointer"
          >
            Generate Fixtures & Start Tournament →
          </button>
        </div>
      </div>
    );
  }

  if (activeTournament) {
    const champion = activeTournament.championTeamId
      ? teamsMap[activeTournament.championTeamId]
      : undefined;

    return (
      <div className="min-h-screen bg-slate-950 text-white p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-wider text-emerald-400 font-bold">
              {activeTournament.matchFormat} Tournament •{' '}
              {activeTournament.teamIds.length} Teams
            </div>
            <h1 className="text-2xl font-extrabold mt-0.5">
              {activeTournament.name}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveSubTab('STANDINGS')}
              className={`px-4 py-2 rounded-lg text-xs font-bold cursor-pointer ${
                activeSubTab === 'STANDINGS'
                  ? 'bg-emerald-500 text-slate-950'
                  : 'bg-slate-900 text-slate-300 border border-slate-800'
              }`}
            >
              Points Table & Fixtures
            </button>
            <button
              onClick={() => setActiveSubTab('STATS')}
              className={`px-4 py-2 rounded-lg text-xs font-bold cursor-pointer ${
                activeSubTab === 'STATS'
                  ? 'bg-emerald-500 text-slate-950'
                  : 'bg-slate-900 text-slate-300 border border-slate-800'
              }`}
            >
              📊 Stats & Player Explorer
            </button>
            <button
              onClick={() => setSelectedTournamentId(null)}
              className="px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 cursor-pointer"
            >
              ← All Tournaments
            </button>
          </div>
        </div>

        {champion && (
          <div className="bg-amber-500/15 border border-amber-500/50 rounded-2xl p-5 flex flex-col items-center justify-center gap-2">
            <div className="text-xs uppercase tracking-widest text-amber-300 font-bold">
              🏆 Tournament Champions
            </div>
            <div className="flex items-center gap-3">
              <TeamLogo
                teamId={champion.id}
                shortName={champion.shortName}
                size="lg"
              />
              <span className="text-2xl font-extrabold text-white">
                {champion.name}
              </span>
            </div>
          </div>
        )}

        {activeSubTab === 'STATS' ? (
          <TournamentStats
            tournament={activeTournament}
            matches={tournamentMatches}
            teams={teamsMap}
            players={players}
          />
        ) : (
          <>
            {/* Points Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                <span className="font-bold text-sm text-slate-100">
                  Points Table & Net Run Rate (NRR)
                </span>
                <span className="text-[11px] text-slate-400">
                  {activeTournament.formatType === 'IPL'
                    ? 'Top 2 → Qualifier 1 • #3 & #4 → Eliminator'
                    : `Top ${
                        activeTournament.pointsTable.length >= 4 ? '4' : '2'
                      } qualify for Knockouts`}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs uppercase bg-slate-950/60 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-4">#</th>
                      <th className="py-2.5 px-3">Team</th>
                      <th className="py-2.5 px-3 text-right">P</th>
                      <th className="py-2.5 px-3 text-right">W</th>
                      <th className="py-2.5 px-3 text-right">L</th>
                      <th className="py-2.5 px-3 text-right">T</th>
                      <th className="py-2.5 px-3 text-right">NRR</th>
                      <th className="py-2.5 px-4 text-right">PTS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {activeTournament.pointsTable.map((row, idx) => {
                      const team = teamsMap[row.teamId];
                      const qualifies =
                        idx <
                        (activeTournament.pointsTable.length >= 4 ? 4 : 2);
                      return (
                        <tr
                          key={row.teamId}
                          className={qualifies ? 'bg-emerald-500/5' : ''}
                        >
                          <td className="py-2.5 px-4 font-mono text-xs text-slate-400">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-slate-100">
                            <div className="flex items-center gap-2.5">
                              <TeamLogo
                                teamId={row.teamId}
                                shortName={team?.shortName ?? 'TM'}
                                size="sm"
                              />
                              <span>{team?.name ?? row.teamId}</span>
                              {qualifies && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                                  {activeTournament.formatType === 'IPL' &&
                                  idx < 2
                                    ? 'Q1'
                                    : 'Q'}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-300">
                            {row.matchesPlayed}
                          </td>
                          <td className="py-2.5 px-3 text-right text-emerald-400 font-semibold">
                            {row.wins}
                          </td>
                          <td className="py-2.5 px-3 text-right text-rose-400">
                            {row.losses}
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-400">
                            {row.ties}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-xs text-slate-200">
                            {row.netRunRate >= 0
                              ? `+${row.netRunRate.toFixed(3)}`
                              : row.netRunRate.toFixed(3)}
                          </td>
                          <td className="py-2.5 px-4 text-right font-extrabold text-white">
                            {row.points}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Fixtures List */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-800 font-bold text-sm text-slate-100">
                Fixtures & Results ({activeTournament.fixtures.length} Matches)
              </div>

              <div className="divide-y divide-slate-800/70">
                {activeTournament.fixtures.map((fix) => {
                  const tA = teamsMap[fix.teamAId];
                  const tB = teamsMap[fix.teamBId];
                  const isSimming = simulatingFixtureId === fix.id;
                  const linkedMatch = tournamentMatches.find(
                    (m) => m.id === fix.matchId
                  );

                  return (
                    <div
                      key={fix.id}
                      onClick={() => {
                        if (fix.status === 'COMPLETED' && fix.matchId) {
                          onViewMatchScorecard(
                            fix.matchId,
                            activeTournament.id
                          );
                        }
                      }}
                      className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        fix.status === 'COMPLETED' && fix.matchId
                          ? 'hover:bg-slate-800/50 cursor-pointer transition'
                          : ''
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                          <span>Match {fix.matchNumber}</span>
                          <span>•</span>
                          <span
                            className={
                              fix.stage !== 'GROUP'
                                ? 'text-amber-400 font-bold'
                                : ''
                            }
                          >
                            {fix.stage.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="text-sm font-bold text-white mt-1 flex items-center gap-2 flex-wrap">
                          <TeamLogo
                            teamId={fix.teamAId}
                            shortName={tA?.shortName ?? 'A'}
                            size="sm"
                          />
                          <span>{tA?.name ?? 'Team A'}</span>
                          <span className="text-slate-500 text-xs">vs</span>
                          <TeamLogo
                            teamId={fix.teamBId}
                            shortName={tB?.shortName ?? 'B'}
                            size="sm"
                          />
                          <span>{tB?.name ?? 'Team B'}</span>
                        </div>
                        {linkedMatch && linkedMatch.inningsList.length >= 2 && (
                          <div className="text-xs text-slate-400 mt-1 font-mono">
                            {teamsMap[linkedMatch.inningsList[0].battingTeamId]?.shortName}{' '}
                            {linkedMatch.inningsList[0].runs}/
                            {linkedMatch.inningsList[0].wickets} (
                            {linkedMatch.inningsList[0].overs} ov) •{' '}
                            {teamsMap[linkedMatch.inningsList[1].battingTeamId]?.shortName}{' '}
                            {linkedMatch.inningsList[1].runs}/
                            {linkedMatch.inningsList[1].wickets} (
                            {linkedMatch.inningsList[1].overs} ov)
                          </div>
                        )}
                        {fix.result && (
                          <div className="text-xs text-emerald-400 font-semibold mt-0.5">
                            {fix.result}
                          </div>
                        )}
                      </div>

                      <div
                        className="flex items-center gap-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {fix.status === 'COMPLETED' ? (
                          fix.matchId ? (
                            <button
                              onClick={() =>
                                onViewMatchScorecard(
                                  fix.matchId!,
                                  activeTournament.id
                                )
                              }
                              className="px-3.5 py-2 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/40 text-sky-300 text-xs font-bold cursor-pointer"
                            >
                              View Scorecard →
                            </button>
                          ) : (
                            <span className="px-3 py-1 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold">
                              Completed
                            </span>
                          )
                        ) : (
                          <>
                            <button
                              onClick={() => handlePlayLive(fix.id)}
                              className="px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs cursor-pointer"
                            >
                              {fix.status === 'LIVE'
                                ? 'Resume Live'
                                : 'Play Live'}
                            </button>
                            <button
                              disabled={Boolean(simulatingFixtureId)}
                              onClick={() => handleSimOne(fix.id)}
                              className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 font-semibold text-xs border border-slate-700 cursor-pointer"
                            >
                              {isSimming ? 'Simulating...' : 'Quick Sim'}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 sm:p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">Tournaments</h1>
          <p className="text-xs text-slate-400">
            IPL 2026 (Playoffs) • 2026 T20 WC • 2023 ODI WC
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setIsCreating(true)}
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs cursor-pointer"
          >
            + New Tournament
          </button>
          <button
            onClick={onBackHome}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 cursor-pointer"
          >
            ← Home
          </button>
        </div>
      </div>

      {tournaments.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-3">
          <div className="text-sm font-bold text-slate-200">
            No tournaments created yet
          </div>
          <p className="text-xs text-slate-400">
            Start an IPL 2026 season (with Qualifier 1, Eliminator, Qualifier 2 &
            Final) or an ICC World Cup with full stats and scorecards.
          </p>
          <button
            onClick={() => setIsCreating(true)}
            className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs cursor-pointer"
          >
            Create Your First Tournament
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {tournaments.map((t: Tournament) => {
            const doneCount = t.fixtures.filter(
              (f) => f.status === 'COMPLETED'
            ).length;
            return (
              <button
                key={t.id}
                onClick={() => {
                  setSelectedTournamentId(t.id);
                  setActiveSubTab('STANDINGS');
                }}
                className="w-full bg-slate-900 hover:bg-slate-800/80 border border-slate-800 rounded-2xl p-4 flex items-center justify-between text-left transition cursor-pointer"
              >
                <div>
                  <div className="font-bold text-base text-white">{t.name}</div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {t.matchFormat} • {t.teamIds.length} Teams • {doneCount}/
                    {t.fixtures.length} Matches Played
                  </div>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                    t.status === 'COMPLETED'
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'bg-emerald-500/20 text-emerald-300'
                  }`}
                >
                  {t.status}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}