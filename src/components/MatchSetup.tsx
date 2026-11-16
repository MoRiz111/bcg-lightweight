import { useEffect, useState } from 'react';
import { createEmptyPlayer, db } from '../db/database';
import { startQuickMatch } from '../engine/matchEngine';
import type { MatchFormat, Player, Team } from '../types/cricket';

interface MatchSetupProps {
  teams: Team[];
  players: Player[];
  defaultFormat: MatchFormat;
  onMatchStarted: (matchId: string) => void;
  onCancel: () => void;
}

const SAMPLE_JSON_TEMPLATE = `{
  "name": "Netherlands",
  "shortName": "NED",
  "players": [
    { "name": "Scott Edwards", "role": "WICKETKEEPER", "isCaptain": true, "isWicketkeeper": true, "bowlingStyle": "RM" },
    { "name": "Max O'Dowd", "role": "BATTER", "bowlingStyle": "OB" },
    { "name": "Vikramjit Singh", "role": "ALL_ROUNDER", "bowlingStyle": "RM" },
    { "name": "Bas de Leede", "role": "ALL_ROUNDER", "bowlingStyle": "RFM" },
    { "name": "Sybrand Engelbrecht", "role": "BATTER", "bowlingStyle": "OB" },
    { "name": "Teja Nidamanuru", "role": "BATTER", "bowlingStyle": "OB" },
    { "name": "Logan van Beek", "role": "ALL_ROUNDER", "bowlingStyle": "RFM" },
    { "name": "Tim Pringle", "role": "BOWLER", "bowlingStyle": "SLA" },
    { "name": "Roelof van der Merwe", "role": "ALL_ROUNDER", "bowlingStyle": "SLA" },
    { "name": "Paul van Meekeren", "role": "BOWLER", "bowlingStyle": "RFM" },
    { "name": "Vivian Kingma", "role": "BOWLER", "bowlingStyle": "RFM" }
  ]
}`;

export function MatchSetup({
  teams,
  players,
  defaultFormat,
  onMatchStarted,
  onCancel,
}: MatchSetupProps) {
  const [format, setFormat] = useState<MatchFormat>(defaultFormat);
  const [teamAId, setTeamAId] = useState<string>(teams[0]?.id ?? '');
  const [teamBId, setTeamBId] = useState<string>(
    teams[1]?.id ?? teams[0]?.id ?? ''
  );

  const [xiA, setXiA] = useState<string[]>([]);
  const [xiB, setXiB] = useState<string[]>([]);

  // Opening bowlers [B1, B2] & designated Wicketkeeper for BOTH teams
  const [openBowlersA, setOpenBowlersA] = useState<[string, string]>(['', '']);
  const [openBowlersB, setOpenBowlersB] = useState<[string, string]>(['', '']);
  const [keeperA, setKeeperA] = useState<string>('');
  const [keeperB, setKeeperB] = useState<string>('');

  // Interactive selection & two-click swap state per team column
  const [selectedActionPlayerA, setSelectedActionPlayerA] = useState<string | null>(null);
  const [swapSourceA, setSwapSourceA] = useState<string | null>(null);

  const [selectedActionPlayerB, setSelectedActionPlayerB] = useState<string | null>(null);
  const [swapSourceB, setSwapSourceB] = useState<string | null>(null);

  const [superOverMode, setSuperOverMode] = useState<
    'NONE' | 'SINGLE' | 'INFINITE'
  >(defaultFormat === 'TEST' ? 'NONE' : 'SINGLE');

  // JSON Team Importer state
  const [showImport, setShowImport] = useState(false);
  const [jsonInput, setJsonInput] = useState(SAMPLE_JSON_TEMPLATE);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);

  const squadA = players.filter((p) => p.teamId === teamAId);
  const squadB = players.filter((p) => p.teamId === teamBId);

  const initDefaultsForSquad = (squad: Player[]) => {
    const defaultXI = squad.slice(0, 11);
    const bowlers = [...defaultXI]
      .reverse()
      .filter((p) => p.role === 'BOWLER' || p.role === 'ALL_ROUNDER');
    const b1 = bowlers[0]?.id ?? defaultXI[defaultXI.length - 1]?.id ?? '';
    const b2 = bowlers[1]?.id ?? defaultXI[defaultXI.length - 2]?.id ?? '';
    const wk =
      defaultXI.find((p) => p.isWicketkeeper || p.role === 'WICKETKEEPER')?.id ??
      defaultXI[2]?.id ??
      '';
    return { xiIds: defaultXI.map((p) => p.id), b1, b2, wk };
  };

  useEffect(() => {
    const { xiIds, b1, b2, wk } = initDefaultsForSquad(squadA);
    setXiA(xiIds);
    setOpenBowlersA([b1, b2]);
    setKeeperA(wk);
    setSelectedActionPlayerA(null);
    setSwapSourceA(null);
  }, [teamAId, players.length]);

  useEffect(() => {
    const { xiIds, b1, b2, wk } = initDefaultsForSquad(squadB);
    setXiB(xiIds);
    setOpenBowlersB([b1, b2]);
    setKeeperB(wk);
    setSelectedActionPlayerB(null);
    setSwapSourceB(null);
  }, [teamBId, players.length]);

  const togglePlayerInXI = (
    playerId: string,
    currentXI: string[],
    setter: (ids: string[]) => void
  ) => {
    if (currentXI.includes(playerId)) {
      setter(currentXI.filter((id) => id !== playerId));
    } else if (currentXI.length < 11) {
      setter([...currentXI, playerId]);
    }
  };

  const handleImportTeam = async () => {
    setImportError(null);
    setImportSuccess(null);
    try {
      const parsed = JSON.parse(jsonInput);
      if (
        !parsed.name ||
        !parsed.shortName ||
        !Array.isArray(parsed.players) ||
        parsed.players.length < 11
      ) {
        throw new Error(
          'JSON must include "name", "shortName", and at least 11 "players".'
        );
      }

      const teamId = `team_${parsed.shortName.toLowerCase()}_${Date.now()}`;
      const newPlayers: Player[] = parsed.players.map(
        (
          p: {
            name: string;
            role?: Player['role'];
            bowlingStyle?: Player['bowlingStyle'];
            isCaptain?: boolean;
            isWicketkeeper?: boolean;
          },
          idx: number
        ) =>
          createEmptyPlayer(
            `${teamId}_p${idx + 1}`,
            teamId,
            p.name,
            p.role ?? 'ALL_ROUNDER',
            {
              bowlingStyle: p.bowlingStyle ?? 'RM',
              isCaptain: Boolean(p.isCaptain),
              isWicketkeeper: Boolean(p.isWicketkeeper),
            }
          )
      );

      const captain = newPlayers.find((p) => p.isCaptain) ?? newPlayers[0];
      const keeper =
        newPlayers.find((p) => p.isWicketkeeper) ??
        newPlayers.find((p) => p.role === 'WICKETKEEPER') ??
        newPlayers[1];

      const newTeam: Team = {
        id: teamId,
        name: parsed.name,
        shortName: parsed.shortName.toUpperCase(),
        captainId: captain.id,
        wicketkeeperId: keeper.id,
      };

      await db.transaction('rw', db.teams, db.players, async () => {
        await db.teams.add(newTeam);
        await db.players.bulkAdd(newPlayers);
      });

      setTeamBId(teamId);
      setImportSuccess(`Imported ${newTeam.name} (${newPlayers.length} players)!`);
      setShowImport(false);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Invalid JSON format');
    }
  };

  const handleLaunchMatch = async () => {
    if (xiA.length !== 11 || xiB.length !== 11 || teamAId === teamBId) return;

    const validB1A = xiA.includes(openBowlersA[0]) ? openBowlersA[0] : xiA[10];
    const validB2A = xiA.includes(openBowlersA[1]) ? openBowlersA[1] : xiA[9];
    const validB1B = xiB.includes(openBowlersB[0]) ? openBowlersB[0] : xiB[10];
    const validB2B = xiB.includes(openBowlersB[1]) ? openBowlersB[1] : xiB[9];

    const matchId = await startQuickMatch(teamAId, teamBId, format, {
      playingXIA: xiA,
      playingXIB: xiB,
      openingBowlersA: [validB1A, validB2A],
      openingBowlersB: [validB1B, validB2B],
      wicketkeeperAId: xiA.includes(keeperA) ? keeperA : xiA[2],
      wicketkeeperBId: xiB.includes(keeperB) ? keeperB : xiB[2],
      allowSuperOver: superOverMode !== 'NONE',
      infiniteSuperOvers: superOverMode === 'INFINITE',
    });
    onMatchStarted(matchId);
  };

  const renderSquadColumn = (
    label: string,
    teamId: string,
    onChangeTeam: (id: string) => void,
    squad: Player[],
    selectedXI: string[],
    setSelectedXI: (ids: string[]) => void,
    openBowlers: [string, string],
    setOpenBowlers: (pair: [string, string]) => void,
    activeKeeperId: string,
    setActiveKeeperId: (id: string) => void,
    actionPlayerId: string | null,
    setActionPlayerId: (id: string | null) => void,
    swapSourceId: string | null,
    setSwapSourceId: (id: string | null) => void
  ) => {
    const handlePlayerRowClick = (clickedId: string) => {
      // If currently in "Swap Mode", complete the swap with the clicked batter
      if (swapSourceId) {
        if (swapSourceId !== clickedId) {
          const idx1 = selectedXI.indexOf(swapSourceId);
          const idx2 = selectedXI.indexOf(clickedId);
          if (idx1 !== -1 && idx2 !== -1) {
            const updated = [...selectedXI];
            [updated[idx1], updated[idx2]] = [updated[idx2], updated[idx1]];
            setSelectedXI(updated);
          }
        }
        setSwapSourceId(null);
        setActionPlayerId(null);
        return;
      }

      // Toggle player action menu
      setActionPlayerId(actionPlayerId === clickedId ? null : clickedId);
    };

    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block">
              {label}
            </span>
            <select
              value={teamId}
              onChange={(e) => onChangeTeam(e.target.value)}
              className="mt-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-sm font-bold text-white"
            >
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.shortName})
                </option>
              ))}
            </select>
          </div>

          <span
            className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
              selectedXI.length === 11
                ? 'bg-emerald-500/20 text-emerald-300'
                : 'bg-amber-500/20 text-amber-300'
            }`}
          >
            {selectedXI.length}/11 Selected
          </span>
        </div>

        {/* Legend & Swap Banner */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 bg-slate-950/60 px-3 py-2 rounded-lg border border-slate-800/80">
          {swapSourceId ? (
            <div className="flex items-center justify-between w-full text-amber-300 font-semibold">
              <span>
                Click any second batter to swap with{' '}
                {squad.find((p) => p.id === swapSourceId)?.name}
              </span>
              <button
                type="button"
                onClick={() => setSwapSourceId(null)}
                className="underline text-xs ml-2 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          ) : (
            <>
              <span>Click any player to Swap, Set Bowler (B1/B2), or Keeper</span>
              <span>C • 🧤 • ⚾1 • ⚾2</span>
            </>
          )}
        </div>

        {/* Batting Order (Selected XI) */}
        <div className="divide-y divide-slate-800/70 bg-slate-950/60 border border-slate-800 rounded-xl overflow-hidden">
          {selectedXI.map((id, idx) => {
            const p = squad.find((pl) => pl.id === id);
            if (!p) return null;

            const isB1 = openBowlers[0] === id;
            const isB2 = openBowlers[1] === id;
            const isKeeper = activeKeeperId === id;
            const isActionOpen = actionPlayerId === id;
            const isSwapSource = swapSourceId === id;

            return (
              <div key={id} className="transition">
                <div
                  onClick={() => handlePlayerRowClick(id)}
                  className={`px-3 py-2.5 flex items-center justify-between text-xs cursor-pointer ${
                    isSwapSource
                      ? 'bg-amber-500/20 border-l-2 border-amber-400'
                      : swapSourceId
                      ? 'hover:bg-emerald-500/10'
                      : isActionOpen
                      ? 'bg-slate-800/80'
                      : 'hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="w-5 text-slate-500 font-mono font-bold">
                      {idx + 1}.
                    </span>
                    <span className="font-semibold text-slate-100">{p.name}</span>

                    {/* Role & Bowling Style tag */}
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                      {p.role === 'ALL_ROUNDER'
                        ? 'AR'
                        : p.role === 'WICKETKEEPER'
                        ? 'WK'
                        : p.role === 'BOWLER'
                        ? 'BOWL'
                        : 'BAT'}
                      {p.bowlingStyle ? ` • ${p.bowlingStyle}` : ''}
                    </span>

                    {p.isCaptain && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                        C
                      </span>
                    )}
                    {isKeeper && (
                      <span
                        className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px] font-bold"
                        title="Assigned Wicketkeeper"
                      >
                        🧤 WK
                      </span>
                    )}
                    {isB1 && (
                      <span
                        className="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 text-[10px] font-bold"
                        title="1st Opening Bowler"
                      >
                        ⚾1
                      </span>
                    )}
                    {isB2 && (
                      <span
                        className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[10px] font-bold"
                        title="2nd Opening Bowler"
                      >
                        ⚾2
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePlayerInXI(id, selectedXI, setSelectedXI);
                    }}
                    className="ml-2 px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 cursor-pointer"
                    title="Drop to bench"
                  >
                    ✕
                  </button>
                </div>

                {/* Inline Player Action Menu */}
                {isActionOpen && !swapSourceId && (
                  <div className="px-3 py-2 bg-slate-900 border-t border-slate-800 flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setSwapSourceId(id);
                        setActionPlayerId(null);
                      }}
                      className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[11px] font-semibold cursor-pointer"
                    >
                      ⇄ Swap Position
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const nextB2 =
                          openBowlers[1] === id ? openBowlers[0] : openBowlers[1];
                        setOpenBowlers([id, nextB2]);
                        setActionPlayerId(null);
                      }}
                      className="px-2.5 py-1 rounded bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 text-[11px] font-semibold cursor-pointer"
                    >
                      ⚾1 Set 1st Bowler
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const nextB1 =
                          openBowlers[0] === id ? openBowlers[1] : openBowlers[0];
                        setOpenBowlers([nextB1, id]);
                        setActionPlayerId(null);
                      }}
                      className="px-2.5 py-1 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-[11px] font-semibold cursor-pointer"
                    >
                      ⚾2 Set 2nd Bowler
                    </button>

                    {p.role === 'WICKETKEEPER' && (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveKeeperId(id);
                          setActionPlayerId(null);
                        }}
                        className="px-2.5 py-1 rounded bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-[11px] font-semibold cursor-pointer"
                      >
                        🧤 Assign Wicketkeeper
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bench Players */}
        {squad.length > selectedXI.length && (
          <div className="space-y-1.5">
            <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
              Squad Bench (Click to add)
            </div>
            <div className="flex flex-wrap gap-1.5">
              {squad
                .filter((p) => !selectedXI.includes(p.id))
                .map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() =>
                      togglePlayerInXI(p.id, selectedXI, setSelectedXI)
                    }
                    disabled={selectedXI.length >= 11}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 disabled:opacity-40 cursor-pointer"
                  >
                    + {p.name}{' '}
                    <span className="text-slate-500">
                      ({p.role === 'ALL_ROUNDER' ? 'AR' : p.role.slice(0, 3)}
                      {p.bowlingStyle ? `/${p.bowlingStyle}` : ''})
                    </span>
                  </button>
                ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const valid =
    xiA.length === 11 && xiB.length === 11 && teamAId !== teamBId;

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">Pre-Match Setup</h1>
          <p className="text-xs text-slate-400">
            Select Playing XI, swap batting order, assign opening bowlers (⚾1/⚾2) & keeper
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowImport(!showImport)}
            className="px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-sky-400 cursor-pointer"
          >
            {showImport ? 'Close Importer' : '+ Import Team JSON'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>

      {importSuccess && (
        <div className="bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 px-4 py-2.5 rounded-xl text-xs font-semibold">
          {importSuccess}
        </div>
      )}

      {showImport && (
        <div className="bg-slate-900 border border-sky-800/60 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider font-bold text-sky-400">
              Import Custom Squad (JSON)
            </span>
            <span className="text-[11px] text-slate-400">
              Roles: BATTER | BOWLER | ALL_ROUNDER | WICKETKEEPER
            </span>
          </div>
          <textarea
            rows={8}
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-xs text-slate-200"
          />
          {importError && (
            <div className="text-xs text-rose-400 font-semibold">
              {importError}
            </div>
          )}
          <button
            type="button"
            onClick={handleImportTeam}
            className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs cursor-pointer"
          >
            Save Team to Database
          </button>
        </div>
      )}

      {/* Format & Super Over Config */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block mb-1.5">
            Match Format
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {(['T20', 'ODI', 'TEST'] as MatchFormat[]).map((fmt) => (
              <button
                key={fmt}
                type="button"
                onClick={() => {
                  setFormat(fmt);
                  if (fmt === 'TEST') setSuperOverMode('NONE');
                }}
                className={`py-2 rounded-lg text-xs font-bold border cursor-pointer ${
                  format === fmt
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                    : 'bg-slate-950 text-slate-300 border-slate-800'
                }`}
              >
                {fmt}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block mb-1.5">
            Tie-Breaker (Super Over)
          </label>
          <select
            value={superOverMode}
            disabled={format === 'TEST'}
            onChange={(e) =>
              setSuperOverMode(e.target.value as 'NONE' | 'SINGLE' | 'INFINITE')
            }
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"
          >
            <option value="SINGLE">Configurable Super Over</option>
            <option value="INFINITE">Knockout (Infinite Super Overs)</option>
            <option value="NONE">No Super Over (Allow Tie)</option>
          </select>
        </div>
      </div>

      {/* Two-Column Squad & Lineup Builder */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {renderSquadColumn(
          'Batting First (Team A)',
          teamAId,
          setTeamAId,
          squadA,
          xiA,
          setXiA,
          openBowlersA,
          setOpenBowlersA,
          keeperA,
          setKeeperA,
          selectedActionPlayerA,
          setSelectedActionPlayerA,
          swapSourceA,
          setSwapSourceA
        )}
        {renderSquadColumn(
          'Bowling First (Team B)',
          teamBId,
          setTeamBId,
          squadB,
          xiB,
          setXiB,
          openBowlersB,
          setOpenBowlersB,
          keeperB,
          setKeeperB,
          selectedActionPlayerB,
          setSelectedActionPlayerB,
          swapSourceB,
          setSwapSourceB
        )}
      </div>

      <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-2xl p-4">
        <div className="text-xs text-slate-400">
          {teamAId === teamBId
            ? 'Please select two different teams.'
            : xiA.length !== 11 || xiB.length !== 11
            ? 'Both teams must have exactly 11 players selected.'
            : 'Lineups, opening bowlers (⚾1/⚾2), and keepers locked.'}
        </div>
        <button
          type="button"
          disabled={!valid}
          onClick={handleLaunchMatch}
          className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-extrabold text-sm cursor-pointer"
        >
          Start Match →
        </button>
      </div>
    </div>
  );
}