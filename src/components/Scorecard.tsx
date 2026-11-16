import { useState } from 'react';
import type { BallEvent, Innings, Player, Team } from '../types/cricket';
import { TeamLogo } from './TeamLogo';

interface ScorecardProps {
  inningsList: Innings[];
  teams: Record<string, Team>;
  players: Record<string, Player>;
  ballEvents: BallEvent[];
  strikerId: string;
  nonStrikerId: string;
  currentBowlerId: string;
  activeInningsNumber: number;
  isMatchLive: boolean;
}

export function Scorecard({
  inningsList,
  teams,
  players,
  ballEvents,
  strikerId,
  nonStrikerId,
  currentBowlerId,
  activeInningsNumber,
  isMatchLive,
}: ScorecardProps) {
  const [selectedInningsIdx, setSelectedInningsIdx] = useState<number>(
    inningsList.length - 1
  );

  const safeIdx =
    selectedInningsIdx < inningsList.length
      ? selectedInningsIdx
      : inningsList.length - 1;
  const innings = inningsList[safeIdx];
  const battingTeam = teams[innings.battingTeamId];
  const bowlingTeam = teams[innings.bowlingTeamId];
  const isCurrentInnings =
    isMatchLive && innings.inningsNumber === activeInningsNumber;

  const orderedBatters = innings.battingOrder
    .map((id) => innings.battingCard[id])
    .filter(Boolean);

  const chronologicalIds = innings.bowlingOrder ?? [];
  const allBowlerCards = Object.values(innings.bowlingCard);
  const orderedBowlerIds = [
    ...chronologicalIds,
    ...allBowlerCards
      .filter((b) => !chronologicalIds.includes(b.playerId) && b.ballsBowled > 0)
      .map((b) => b.playerId),
  ];

  const activeBowlers = orderedBowlerIds
    .map((id) => innings.bowlingCard[id])
    .filter((b) => b && b.ballsBowled > 0);

  // Compute running team score at each fall of wicket: "112/4 (Batter Name, 14.2 ov)"
  let runningRuns = 0;
  let runningWickets = 0;
  const wicketsInInnings: string[] = [];

  for (const ev of ballEvents.filter(
    (e) => e.inningsNumber === innings.inningsNumber
  )) {
    runningRuns += ev.runs + ev.extraRuns;
    if (ev.isWicket) {
      runningWickets += 1;
      const batterName = players[ev.batsmanId]?.name ?? 'Batter';
      wicketsInInnings.push(
        `${runningRuns}/${runningWickets} (${batterName}, ${ev.over}.${ev.ball} ov)`
      );
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
        {inningsList.map((inn, idx) => {
          const team = teams[inn.battingTeamId];
          const isSelected = idx === safeIdx;
          return (
            <button
              key={inn.inningsNumber}
              onClick={() => setSelectedInningsIdx(idx)}
              className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2 cursor-pointer ${
                isSelected
                  ? 'bg-emerald-500 text-slate-950'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              <TeamLogo
                teamId={inn.battingTeamId}
                shortName={team?.shortName ?? 'TM'}
                size="sm"
              />
              <span>
                Inn {inn.inningsNumber} ({inn.runs}/{inn.wickets})
              </span>
            </button>
          );
        })}
      </div>

      {/* Batting Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-4 py-3 bg-slate-900/90 border-b border-slate-800 flex justify-between items-center">
          <div className="flex items-center gap-2.5 font-bold text-slate-100">
            <TeamLogo
              teamId={innings.battingTeamId}
              shortName={battingTeam?.shortName ?? 'BAT'}
              size="sm"
            />
            <span>{battingTeam?.name ?? 'Batting'} — Batting</span>
          </div>
          <span className="text-sm text-slate-400">
            {innings.runs}/{innings.wickets} ({innings.overs} ov)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase bg-slate-950/60 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-4">Batter</th>
                <th className="py-2.5 px-3">Dismissal</th>
                <th className="py-2.5 px-3 text-right">R</th>
                <th className="py-2.5 px-3 text-right">B</th>
                <th className="py-2.5 px-3 text-right">4s</th>
                <th className="py-2.5 px-3 text-right">6s</th>
                <th className="py-2.5 px-4 text-right">SR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {orderedBatters.map((batter, idx) => {
                const profile = players[batter.playerId];
                const isStriker =
                  isCurrentInnings && batter.playerId === strikerId;
                const isNonStriker =
                  isCurrentInnings && batter.playerId === nonStrikerId;
                const didNotBat =
                  !batter.isOut &&
                  batter.balls === 0 &&
                  !isStriker &&
                  !isNonStriker &&
                  idx > innings.wickets + 1;

                const sr =
                  batter.balls > 0
                    ? ((batter.runs / batter.balls) * 100).toFixed(1)
                    : '0.0';

                return (
                  <tr
                    key={batter.playerId}
                    className={
                      isStriker
                        ? 'bg-emerald-500/10'
                        : isNonStriker
                        ? 'bg-slate-800/40'
                        : ''
                    }
                  >
                    <td className="py-2.5 px-4 font-medium text-slate-100 whitespace-nowrap">
                      <span
                        className={
                          isStriker ? 'text-emerald-400 font-bold' : ''
                        }
                      >
                        {batter.name}
                      </span>
                      {profile?.isCaptain && (
                        <span className="ml-1.5 text-[11px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
                          C
                        </span>
                      )}
                      {profile?.isViceCaptain && (
                        <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-amber-200 font-bold">
                          VC
                        </span>
                      )}
                      {profile?.isWicketkeeper && (
                        <span className="ml-1 text-xs" title="Wicketkeeper">
                          🧤
                        </span>
                      )}
                      {isStriker && (
                        <span className="ml-1.5 text-emerald-400 font-bold">
                          *
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 text-xs">
                      {batter.isOut
                        ? batter.dismissalText
                        : didNotBat
                        ? 'Yet to bat'
                        : 'not out'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-100">
                      {didNotBat ? '-' : batter.runs}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-300">
                      {didNotBat ? '-' : batter.balls}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-300">
                      {didNotBat ? '-' : batter.fours}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-300">
                      {didNotBat ? '-' : batter.sixes}
                    </td>
                    <td className="py-2.5 px-4 text-right text-slate-400">
                      {didNotBat ? '-' : sr}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 bg-slate-950/50 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-slate-300">
          <div>
            <span className="font-semibold text-slate-200">Extras:</span>{' '}
            <span className="font-bold text-white">{innings.extras.total}</span>{' '}
            <span className="text-slate-400">
              (wd {innings.extras.wides}, nb {innings.extras.noBalls}, b{' '}
              {innings.extras.byes}, lb {innings.extras.legByes})
            </span>
          </div>
          <div className="font-bold text-sm text-emerald-400">
            Total: {innings.runs}/{innings.wickets} ({innings.overs} Overs)
          </div>
        </div>
      </div>

      {/* Fall of Wickets with Score */}
      {wicketsInInnings.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs">
          <div className="uppercase tracking-wider text-slate-400 font-semibold mb-1.5">
            Fall of Wickets
          </div>
          <div className="text-slate-300 leading-relaxed">
            {wicketsInInnings.join(' • ')}
          </div>
        </div>
      )}

      {/* Bowling Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-4 py-3 bg-slate-900/90 border-b border-slate-800 font-bold text-slate-100 flex items-center gap-2.5">
          <TeamLogo
            teamId={innings.bowlingTeamId}
            shortName={bowlingTeam?.shortName ?? 'BWL'}
            size="sm"
          />
          <span>{bowlingTeam?.name ?? 'Bowling'} — Bowling</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase bg-slate-950/60 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-4">Bowler</th>
                <th className="py-2.5 px-3 text-right">O</th>
                <th className="py-2.5 px-3 text-right">M</th>
                <th className="py-2.5 px-3 text-right">R</th>
                <th className="py-2.5 px-3 text-right">W</th>
                <th className="py-2.5 px-4 text-right">ECON</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {activeBowlers.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-4 px-4 text-center text-slate-500 text-xs"
                  >
                    No deliveries bowled yet
                  </td>
                </tr>
              ) : (
                activeBowlers.map((bowler) => {
                  const profile = players[bowler.playerId];
                  const isCurrentBowler =
                    isCurrentInnings && bowler.playerId === currentBowlerId;
                  const trueOvers = bowler.ballsBowled / 6;
                  const econ =
                    trueOvers > 0
                      ? (bowler.runsConceded / trueOvers).toFixed(2)
                      : '0.00';

                  return (
                    <tr
                      key={bowler.playerId}
                      className={isCurrentBowler ? 'bg-sky-500/10' : ''}
                    >
                      <td className="py-2.5 px-4 font-medium text-slate-100">
                        <span
                          className={
                            isCurrentBowler ? 'text-sky-400 font-bold' : ''
                          }
                        >
                          {bowler.name}
                        </span>
                        {profile?.bowlingStyle && (
                          <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                            {profile.bowlingStyle}
                          </span>
                        )}
                        {isCurrentBowler && (
                          <span className="ml-1.5 text-xs" title="Bowling">
                            ⚾
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-300">
                        {bowler.overs}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-300">
                        {bowler.maidens}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-300">
                        {bowler.runsConceded}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-100">
                        {bowler.wickets}
                      </td>
                      <td className="py-2.5 px-4 text-right text-slate-400">
                        {econ}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}