import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, seedInitialDataIfEmpty } from './db/database';
import {
  adjustBattingOrder,
  playFullOver,
  playNextBall,
  selectNextBowler,
  startQuickMatch,
  startSuperOver,
  swapActiveWicketkeeper,
} from './engine/matchEngine';
import type { BallEvent, MatchFormat } from './types/cricket';
import { Scorecard } from './components/Scorecard';
import { MatchSetup } from './components/MatchSetup';

function formatBallChip(ev: BallEvent): { label: string; style: string } {
  if (ev.isWicket) {
    return {
      label: 'W',
      style: 'bg-rose-500/20 text-rose-300 border-rose-500/40 font-extrabold',
    };
  }
  if (ev.extrasType === 'WIDE') {
    return {
      label: `${ev.extraRuns}wd`,
      style: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    };
  }
  if (ev.extrasType === 'NO_BALL') {
    const total = ev.runs + ev.extraRuns;
    return {
      label: ev.runs > 0 ? `${total}nb` : 'nb',
      style: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    };
  }
  if (ev.extrasType === 'BYE') {
    return {
      label: `${ev.extraRuns}b`,
      style: 'bg-slate-800 text-slate-300 border-slate-700',
    };
  }
  if (ev.extrasType === 'LEG_BYE') {
    return {
      label: `${ev.extraRuns}lb`,
      style: 'bg-slate-800 text-slate-300 border-slate-700',
    };
  }
  if (ev.runs === 4) {
    return {
      label: '4',
      style: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-extrabold',
    };
  }
  if (ev.runs === 6) {
    return {
      label: '6',
      style: 'bg-purple-500/20 text-purple-300 border-purple-500/40 font-extrabold',
    };
  }
  if (ev.runs === 0) {
    return {
      label: '.',
      style: 'bg-slate-900 text-slate-400 border-slate-800',
    };
  }
  return {
    label: `${ev.runs}`,
    style: 'bg-slate-800 text-slate-100 border-slate-700',
  };
}

export default function App() {
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<MatchFormat>('T20');
  const [activeTab, setActiveTab] = useState<'LIVE' | 'SCORECARD'>('LIVE');
  const [showLineupEditor, setShowLineupEditor] = useState(false);
  const [swapBatterSource, setSwapBatterSource] = useState<string | null>(null);

  // Wicketkeeper-to-Bowler confirmation modal state
  const [keeperPromptBowlerId, setKeeperPromptBowlerId] = useState<string | null>(null);
  const [replacementKeeperId, setReplacementKeeperId] = useState<string>('');

  useEffect(() => {
    seedInitialDataIfEmpty();
  }, []);

  const teamsList = useLiveQuery(() => db.teams.toArray(), []) ?? [];
  const playersList = useLiveQuery(() => db.players.toArray(), []) ?? [];
  const recentMatches =
    useLiveQuery(
      () => db.matches.orderBy('createdAt').reverse().limit(5).toArray(),
      []
    ) ?? [];

  const match = useLiveQuery(
    () => (activeMatchId ? db.matches.get(activeMatchId) : undefined),
    [activeMatchId]
  );

  const ballEvents =
    useLiveQuery(
      () =>
        activeMatchId
          ? db.ballEvents.where('matchId').equals(activeMatchId).toArray()
          : [],
      [activeMatchId]
    ) ?? [];

  const teamsMap = useMemo(
    () => Object.fromEntries(teamsList.map((t) => [t.id, t])),
    [teamsList]
  );
  const playersMap = useMemo(
    () => Object.fromEntries(playersList.map((p) => [p.id, p])),
    [playersList]
  );

  const handleQuickStart = async () => {
    const teamA = teamsList[0]?.id ?? 'team_ind';
    const teamB = teamsList[1]?.id ?? 'team_nz';
    const id = await startQuickMatch(teamA, teamB, selectedFormat);
    setActiveMatchId(id);
    setActiveTab('LIVE');
  };

  if (!match && isSetupOpen) {
    return (
      <MatchSetup
        teams={teamsList}
        players={playersList}
        defaultFormat={selectedFormat}
        onMatchStarted={(id) => {
          setIsSetupOpen(false);
          setActiveMatchId(id);
          setActiveTab('LIVE');
        }}
        onCancel={() => setIsSetupOpen(false)}
      />
    );
  }

  if (!match) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">
              BCG Cricket Simulator
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              {teamsList.length} ICC T20I Teams Loaded • Ball-by-Ball Engine
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
              Select Format
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['T20', 'ODI', 'TEST'] as MatchFormat[]).map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => setSelectedFormat(fmt)}
                  className={`py-2.5 rounded-lg font-bold text-sm border transition cursor-pointer ${
                    selectedFormat === fmt
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                      : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {fmt}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2.5">
            <button
              onClick={() => setIsSetupOpen(true)}
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-base transition cursor-pointer"
            >
              Custom Match (Playing XI & Import)
            </button>
            <button
              onClick={handleQuickStart}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm border border-slate-700 transition cursor-pointer"
            >
              Instant Quick Match (IND vs NZ)
            </button>
          </div>

          {recentMatches.length > 0 && (
            <div className="pt-4 border-t border-slate-800 space-y-2">
              <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
                Recent Matches
              </div>
              {recentMatches.map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    setActiveMatchId(m.id);
                    setActiveTab('LIVE');
                  }}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left text-xs transition cursor-pointer"
                >
                  <div>
                    <span className="font-bold text-slate-200">
                      {teamsMap[m.teamAId]?.shortName ?? 'A'} vs{' '}
                      {teamsMap[m.teamBId]?.shortName ?? 'B'} ({m.format})
                    </span>
                    <div className="text-slate-400 mt-0.5">
                      {m.result ??
                        `Innings ${m.state.innings}: ${m.state.totalRuns}/${m.state.wickets}`}
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded font-semibold ${
                      m.status === 'LIVE'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {m.status}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  const currentInnings = match.inningsList[match.inningsList.length - 1];
  const battingTeam = teamsMap[currentInnings.battingTeamId];
  const striker = currentInnings.battingCard[match.state.strikerId];
  const nonStriker = currentInnings.battingCard[match.state.nonStrikerId];
  const bowler = currentInnings.bowlingCard[match.state.currentBowlerId];

  const isBetweenOvers =
    match.status === 'LIVE' && match.state.currentBall === 0;

  const isInningsNotStarted =
    match.state.currentOver === 0 && match.state.currentBall === 0;

  const maxOvers = match.state.isSuperOver
    ? 1
    : match.format === 'T20'
    ? 4
    : match.format === 'ODI'
    ? 10
    : 999;

  const activeKeeperId = currentInnings.activeWicketkeeperId;

  const selectableBowlers = Object.values(currentInnings.bowlingCard).filter(
    (b) =>
      b.playerId !== match.state.previousBowlerId &&
      Math.floor(b.ballsBowled / 6) < maxOvers
  );

  const fieldingXIIds = Object.keys(currentInnings.bowlingCard);
  const backupKeepersInXI = fieldingXIIds
    .map((id) => playersMap[id])
    .filter(
      (p) =>
        p &&
        p.id !== activeKeeperId &&
        (p.role === 'WICKETKEEPER' || p.isWicketkeeper)
    );
  const fallbackFieldersInXI = fieldingXIIds
    .map((id) => playersMap[id])
    .filter((p) => p && p.id !== activeKeeperId);

  const legalBallsBowled =
    match.state.currentOver * 6 + match.state.currentBall;
  const currentRunRate =
    legalBallsBowled > 0
      ? ((currentInnings.runs / legalBallsBowled) * 6).toFixed(2)
      : '0.00';

  const totalInningsBalls = match.totalOvers * 6;
  const ballsRemaining = Math.max(0, totalInningsBalls - legalBallsBowled);
  const runsNeeded =
    match.state.target !== undefined
      ? Math.max(0, match.state.target - currentInnings.runs)
      : 0;
  const requiredRunRate =
    match.state.target !== undefined && ballsRemaining > 0
      ? ((runsNeeded / ballsRemaining) * 6).toFixed(2)
      : '0.00';

  const inningsBalls = ballEvents.filter(
    (b) => b.inningsNumber === currentInnings.inningsNumber
  );

  const lastInningsBall = inningsBalls[inningsBalls.length - 1];
  const isOverJustCompleted =
    match.state.currentBall === 0 && match.state.currentOver > 0;
  const summaryOverNumber = isOverJustCompleted
    ? match.state.currentOver - 1
    : match.status !== 'LIVE' && lastInningsBall
    ? lastInningsBall.over
    : match.state.currentOver;

  const overSummaryBalls = inningsBalls.filter(
    (b) => b.over === summaryOverNumber
  );
  const overSummaryRuns = overSummaryBalls.reduce(
    (sum, b) => sum + b.runs + b.extraRuns,
    0
  );
  const overSummaryWickets = overSummaryBalls.filter((b) => b.isWicket).length;
  const overSummaryBowlerName =
    overSummaryBalls[0] && playersMap[overSummaryBalls[0].bowlerId]?.name;

  const recentBalls = [...inningsBalls].slice(-8).reverse();

  const handleBowlerDropdownChange = async (chosenBowlerId: string) => {
    if (chosenBowlerId === activeKeeperId) {
      const defaultReplacement =
        backupKeepersInXI[0]?.id ?? fallbackFieldersInXI[0]?.id ?? '';
      setReplacementKeeperId(defaultReplacement);
      setKeeperPromptBowlerId(chosenBowlerId);
      return;
    }
    await selectNextBowler(match.id, chosenBowlerId);
  };

  const confirmKeeperSwapAndBowl = async () => {
    if (!keeperPromptBowlerId || !replacementKeeperId) return;
    await swapActiveWicketkeeper(match.id, replacementKeeperId);
    await selectNextBowler(match.id, keeperPromptBowlerId);
    setKeeperPromptBowlerId(null);
  };

  const handleLineupBatterClick = async (clickedId: string) => {
    if (!swapBatterSource) {
      setSwapBatterSource(clickedId);
      return;
    }
    if (swapBatterSource !== clickedId) {
      const order = [...currentInnings.battingOrder];
      const idx1 = order.indexOf(swapBatterSource);
      const idx2 = order.indexOf(clickedId);
      if (idx1 !== -1 && idx2 !== -1) {
        [order[idx1], order[idx2]] = [order[idx2], order[idx1]];
        await adjustBattingOrder(match.id, order);
      }
    }
    setSwapBatterSource(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 sm:p-6 max-w-4xl mx-auto space-y-5">
      {/* Wicketkeeper-to-Bowler Swap Modal */}
      {keeperPromptBowlerId && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-purple-500/50 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="text-sm font-bold text-purple-300">
              🧤 Active Wicketkeeper Selected to Bowl
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              <span className="font-bold text-white">
                {playersMap[keeperPromptBowlerId]?.name}
              </span>{' '}
              is currently keeping wickets.{' '}
              {backupKeepersInXI.length > 0
                ? 'Select another wicketkeeper in the XI to take over keeping permanently for the rest of the match:'
                : 'No backup keeper is in the XI — select a stand-in fielder to keep for this over only (gloves return automatically after the over):'}
            </p>

            <div className="space-y-1.5">
              <label className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block">
                {backupKeepersInXI.length > 0
                  ? 'Select Wicketkeeper in Playing XI (Permanent)'
                  : 'Select Stand-in Keeper (1 Over Only)'}
              </label>
              <select
                value={replacementKeeperId}
                onChange={(e) => setReplacementKeeperId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
              >
                {(backupKeepersInXI.length > 0
                  ? backupKeepersInXI
                  : fallbackFieldersInXI
                ).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.role})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setKeeperPromptBowlerId(null)}
                className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmKeeperSwapAndBowl}
                className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs cursor-pointer"
              >
                Swap Keeper & Bowl
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          onClick={() => setActiveMatchId(null)}
          className="text-xs px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 cursor-pointer"
        >
          ← Home
        </button>

        <div className="flex gap-2">
          {match.status === 'LIVE' && (
            <button
              onClick={() => {
                setShowLineupEditor(!showLineupEditor);
                setSwapBatterSource(null);
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-amber-300 border border-slate-800 cursor-pointer"
            >
              {showLineupEditor ? 'Hide Lineup' : 'Batting Order'}
            </button>
          )}
          <button
            onClick={() => setActiveTab('LIVE')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
              activeTab === 'LIVE'
                ? 'bg-emerald-500 text-slate-950'
                : 'bg-slate-900 text-slate-300 border border-slate-800'
            }`}
          >
            Live Match
          </button>
          <button
            onClick={() => setActiveTab('SCORECARD')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
              activeTab === 'SCORECARD'
                ? 'bg-emerald-500 text-slate-950'
                : 'bg-slate-900 text-slate-300 border border-slate-800'
            }`}
          >
            Full Scorecard
          </button>
        </div>
      </div>

      {/* Mid-Match / Start-of-Innings Batting Order Swap Editor */}
      {showLineupEditor && match.status === 'LIVE' && (
        <div className="bg-slate-900 border border-amber-500/40 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-amber-300 font-bold">
              {isInningsNotStarted
                ? 'Adjust Batting Lineup (Openers #1 & #2 Unlocked Before First Ball)'
                : 'Swap Upcoming Batters (Click 2 Batters)'}
            </span>
            {swapBatterSource && (
              <button
                onClick={() => setSwapBatterSource(null)}
                className="text-xs text-amber-300 underline cursor-pointer"
              >
                Cancel Swap
              </button>
            )}
          </div>

          <div className="divide-y divide-slate-800 text-xs">
            {currentInnings.battingOrder.map((id, idx) => {
              const card = currentInnings.battingCard[id];
              const isLocked =
                !isInningsNotStarted &&
                (card.isOut ||
                  id === match.state.strikerId ||
                  id === match.state.nonStrikerId);
              const isSelected = swapBatterSource === id;

              return (
                <div
                  key={id}
                  onClick={() => !isLocked && handleLineupBatterClick(id)}
                  className={`py-2 px-2 flex items-center justify-between rounded ${
                    isLocked
                      ? 'text-slate-500 cursor-not-allowed'
                      : isSelected
                      ? 'bg-amber-500/20 text-amber-200 font-bold cursor-pointer'
                      : 'text-white hover:bg-slate-800 cursor-pointer'
                  }`}
                >
                  <span>
                    {idx + 1}. {card.name}
                    {id === activeKeeperId ? ' 🧤' : ''}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {isLocked
                      ? 'At Crease / Out'
                      : isSelected
                      ? 'Click another batter to swap...'
                      : 'Click to swap'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Scoreboard Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-emerald-400 font-semibold">
            <span>
              {match.state.isSuperOver
                ? `Super Over #${match.state.superOverCount}`
                : `Innings ${match.state.innings}`}
            </span>
            <span>•</span>
            <span>{match.format}</span>
            <span>•</span>
            <span className="text-slate-300">CRR: {currentRunRate}</span>
            {match.state.target !== undefined && (
              <>
                <span>•</span>
                <span className="text-amber-300">RRR: {requiredRunRate}</span>
              </>
            )}
          </div>

          <div className="text-3xl sm:text-4xl font-extrabold mt-1">
            {battingTeam?.shortName ?? 'BAT'} {currentInnings.runs}/
            {currentInnings.wickets}{' '}
            <span className="text-base sm:text-lg font-normal text-slate-400">
              ({match.state.currentOver}.{match.state.currentBall} /{' '}
              {match.totalOvers} ov)
            </span>
          </div>

          {match.state.target !== undefined && (
            <div className="text-sm text-amber-400 mt-1.5 font-semibold">
              Target: {match.state.target} • Need{' '}
              <span className="text-white font-extrabold">{runsNeeded}</span>{' '}
              runs from{' '}
              <span className="text-white font-extrabold">
                {ballsRemaining}
              </span>{' '}
              balls to win
            </div>
          )}
        </div>

        {match.status === 'LIVE' ? (
          <div className="flex gap-2.5">
            <button
              onClick={() => playNextBall(match.id)}
              className="px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-base cursor-pointer"
            >
              Play Ball
            </button>
            <button
              onClick={() => playFullOver(match.id)}
              className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-sm border border-slate-700 cursor-pointer"
            >
              Play Over
            </button>
          </div>
        ) : (
          <div className="text-left sm:text-right space-y-2">
            <div className="text-emerald-400 font-extrabold text-lg">
              {match.result}
            </div>
            <div className="flex sm:justify-end gap-2">
              {match.status === 'TIED' && match.allowSuperOver && (
                <button
                  onClick={() => startSuperOver(match.id)}
                  className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer"
                >
                  Play Super Over
                </button>
              )}
              <button
                onClick={() => {
                  setActiveMatchId(null);
                  setIsSetupOpen(true);
                }}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold cursor-pointer"
              >
                New Match
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Between-Overs / Start-of-Innings Bowler Selector */}
      {isBetweenOvers && (
        <div className="bg-sky-950/40 border border-sky-800/70 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs font-bold uppercase tracking-wider text-sky-400">
            {isInningsNotStarted
              ? `Innings ${match.state.innings} — Confirm Opening Bowler`
              : `End of Over ${match.state.currentOver} — Select Next Bowler`}
          </div>
          <select
            value={match.state.currentBowlerId}
            onChange={(e) => handleBowlerDropdownChange(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs sm:text-sm text-white"
          >
            {selectableBowlers.map((b) => {
              const p = playersMap[b.playerId];
              const isKeeper = b.playerId === activeKeeperId;
              const roleLabel =
                p?.role === 'ALL_ROUNDER'
                  ? 'AR'
                  : p?.role === 'WICKETKEEPER'
                  ? 'WK'
                  : p?.role === 'BOWLER'
                  ? 'BOWL'
                  : 'BAT';

              return (
                <option key={b.playerId} value={b.playerId}>
                  {b.name} [{roleLabel} • {p?.bowlingStyle ?? 'RM'}] ({b.overs}{' '}
                  ov, {b.wickets}-{b.runsConceded})
                  {isKeeper ? ' 🧤 (Current Keeper)' : ''}
                </option>
              );
            })}
          </select>
        </div>
      )}

      {activeTab === 'SCORECARD' ? (
        <Scorecard
          inningsList={match.inningsList}
          teams={teamsMap}
          players={playersMap}
          ballEvents={ballEvents}
          strikerId={match.state.strikerId}
          nonStrikerId={match.state.nonStrikerId}
          currentBowlerId={match.state.currentBowlerId}
          activeInningsNumber={currentInnings.inningsNumber}
          isMatchLive={match.status === 'LIVE'}
        />
      ) : (
        <>
          {/* Over Summary Strip */}
          {overSummaryBalls.length > 0 && (
            <div
              className={`rounded-xl px-4 py-3 border flex flex-wrap items-center justify-between gap-3 ${
                isOverJustCompleted
                  ? 'bg-emerald-950/30 border-emerald-500/40'
                  : 'bg-slate-900 border-slate-800'
              }`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mr-1">
                  {isOverJustCompleted
                    ? `Over ${summaryOverNumber + 1} Summary`
                    : `Over ${summaryOverNumber + 1}`}
                  {overSummaryBowlerName ? ` (${overSummaryBowlerName})` : ''}:
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {overSummaryBalls.map((ev, idx) => {
                    const chip = formatBallChip(ev);
                    return (
                      <span
                        key={ev.id ?? idx}
                        className={`px-2 py-0.5 rounded border text-xs font-mono ${chip.style}`}
                      >
                        {chip.label}
                      </span>
                    );
                  })}
                </div>
              </div>

              <div className="text-xs sm:text-sm font-bold text-slate-200 border-l border-slate-700 pl-3">
                {overSummaryRuns} {overSummaryRuns === 1 ? 'run' : 'runs'},{' '}
                {overSummaryWickets}{' '}
                {overSummaryWickets === 1 ? 'wicket' : 'wickets'}
              </div>
            </div>
          )}

          {/* Last Ball Commentary Banner */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 flex items-center gap-2">
            {match.state.isFreeHit && (
              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-xs font-bold">
                FREE HIT
              </span>
            )}
            <span>{match.state.lastBallOutcome}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2.5">
              <div className="text-xs uppercase text-slate-400 font-semibold">
                At the Crease
              </div>
              <div className="flex justify-between font-bold text-emerald-400">
                <span>
                  🏏 {striker?.name}
                  {playersMap[striker?.playerId]?.isCaptain ? ' (C)' : ''} *
                </span>
                <span>
                  {striker?.runs} ({striker?.balls})
                </span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>
                  {nonStriker?.name}
                  {playersMap[nonStriker?.playerId]?.isCaptain ? ' (C)' : ''}
                </span>
                <span>
                  {nonStriker?.runs} ({nonStriker?.balls})
                </span>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2.5">
              <div className="text-xs uppercase text-slate-400 font-semibold">
                Current Bowler
              </div>
              <div className="flex justify-between font-bold text-sky-400">
                <span>
                  ⚾ {bowler?.name}{' '}
                  <span className="text-xs font-normal text-slate-400">
                    ({playersMap[bowler?.playerId]?.bowlingStyle ?? 'RM'})
                  </span>
                </span>
                <span>
                  {bowler?.wickets}-{bowler?.runsConceded} ({bowler?.overs})
                </span>
              </div>
              <div className="flex justify-between text-xs text-slate-400">
                <span>Extras: {currentInnings.extras.total}</span>
                <span>DRS Left: {currentInnings.drsRemaining}</span>
              </div>
            </div>
          </div>

          {recentBalls.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
              <div className="text-xs uppercase text-slate-400 font-semibold">
                Recent Deliveries
              </div>
              <div className="divide-y divide-slate-800/70 text-xs">
                {recentBalls.map((ev) => (
                  <div
                    key={ev.id}
                    className={`py-2 flex items-center justify-between ${
                      ev.isWicket
                        ? 'text-rose-400 font-semibold'
                        : ev.runs === 4 || ev.runs === 6
                        ? 'text-emerald-400 font-semibold'
                        : 'text-slate-300'
                    }`}
                  >
                    <span>{ev.commentary}</span>
                    {ev.drsOverturned && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px]">
                        DRS SAVED
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}