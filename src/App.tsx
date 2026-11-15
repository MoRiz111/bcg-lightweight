import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, seedInitialDataIfEmpty } from './db/database';
import { playNextBall, startQuickMatch } from './engine/matchEngine';

export default function App() {
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);

  useEffect(() => {
    seedInitialDataIfEmpty();
  }, []);

  const match = useLiveQuery(
    () => (activeMatchId ? db.matches.get(activeMatchId) : undefined),
    [activeMatchId]
  );

  const handleStart = async () => {
    const id = await startQuickMatch('team_ind', 'team_nz', 'T20');
    setActiveMatchId(id);
  };

  if (!match) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center gap-4 p-6">
        <h1 className="text-3xl font-bold tracking-tight">BCG Cricket Simulator</h1>
        <p className="text-slate-400">Local-first ball-by-ball match & tournament engine</p>
        <button
          onClick={handleStart}
          className="px-6 py-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold cursor-pointer"
        >
          Start Quick Match (IND vs NZ - T20)
        </button>
      </div>
    );
  }

  const currentInnings = match.inningsList[match.inningsList.length - 1];
  const striker = currentInnings.battingCard[match.state.strikerId];
  const nonStriker = currentInnings.battingCard[match.state.nonStrikerId];
  const bowler = currentInnings.bowlingCard[match.state.currentBowlerId];

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 max-w-3xl mx-auto space-y-6">
      {/* Scoreboard Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-emerald-400 font-semibold">
            Innings {match.state.innings} • {match.format}
          </div>
          <div className="text-4xl font-extrabold mt-1">
            {currentInnings.runs}/{currentInnings.wickets}{' '}
            <span className="text-lg font-normal text-slate-400">
              ({match.state.currentOver}.{match.state.currentBall} / {match.totalOvers} ov)
            </span>
          </div>
          {match.state.target && (
            <div className="text-sm text-amber-400 mt-1">Target: {match.state.target}</div>
          )}
        </div>

        {match.status === 'LIVE' ? (
          <button
            onClick={() => playNextBall(match.id)}
            className="px-6 py-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-lg cursor-pointer"
          >
            Play Ball
          </button>
        ) : (
          <div className="text-right">
            <div className="text-emerald-400 font-bold">{match.result}</div>
            <button
              onClick={handleStart}
              className="mt-2 px-4 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-sm cursor-pointer"
            >
              New Match
            </button>
          </div>
        )}
      </div>

      {/* Commentary Banner */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-lg px-4 py-3 text-sm text-slate-200">
        {match.state.isFreeHit && (
          <span className="mr-2 px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-semibold">
            FREE HIT
          </span>
        )}
        {match.state.lastBallOutcome}
      </div>

      {/* Active Batters & Bowler */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="text-xs uppercase text-slate-400 font-semibold">At the Crease</div>
          <div className="flex justify-between font-semibold text-emerald-400">
            <span>🏏 {striker?.name} *</span>
            <span>
              {striker?.runs} ({striker?.balls})
            </span>
          </div>
          <div className="flex justify-between text-slate-300">
            <span>{nonStriker?.name}</span>
            <span>
              {nonStriker?.runs} ({nonStriker?.balls})
            </span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="text-xs uppercase text-slate-400 font-semibold">Current Bowler</div>
          <div className="flex justify-between font-semibold text-sky-400">
            <span>⚾ {bowler?.name}</span>
            <span>
              {bowler?.wickets}-{bowler?.runsConceded} ({bowler?.overs})
            </span>
          </div>
          <div className="text-xs text-slate-400">
            DRS Reviews Left: {currentInnings.drsRemaining}
          </div>
        </div>
      </div>
    </div>
  );
}