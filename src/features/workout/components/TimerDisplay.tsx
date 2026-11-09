import type { TimerState } from '../domain/timerEngine';
import type { WorkoutTimeline } from '../domain/types';
import { formatDuration, phaseLabel, totalProgressPercent } from './presentation';

type Props = { state: TimerState; timeline: WorkoutTimeline; rounds: number };

export function TimerDisplay({ state, timeline, rounds }: Props) {
  const phase = state.currentPhase;
  const completed = state.status === 'completed';
  const nextPhase = state.phaseIndex === null ? null : timeline.phases[state.phaseIndex + 1];
  const round = phase && 'round' in phase ? phase.round : 1;
  const color = completed ? 'text-lime-300' : phase?.type === 'PREPARATION' ? 'text-amber-300'
    : phase?.type === 'REST_BETWEEN_EXERCISES' || phase?.type === 'REST_BETWEEN_ROUNDS' ? 'text-sky-300' : 'text-lime-300';
  const category = phase?.type === 'PREPARATION' ? 'Prepare-se'
    : phase?.type === 'REST_BETWEEN_EXERCISES' || phase?.type === 'REST_BETWEEN_ROUNDS' ? 'Recupere o fôlego' : 'Hora de mover';
  const phaseProgress = phase ? state.phaseElapsedMs / phase.durationMs * 100 : completed ? 100 : 0;
  const totalProgress = totalProgressPercent(state, timeline.totalDurationMs);

  return <div>
    {completed ? <div className="py-8 text-center">
      <span aria-hidden="true" className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-lime-300/30 bg-lime-300/10 text-4xl text-lime-300">✓</span>
      <h2 className="mt-6 text-4xl font-bold tracking-tight">Treino concluído!</h2>
      <p className="mt-3 text-stone-400">Mais um round de cuidado com você.</p>
      <p className="mt-6 text-sm text-stone-400">Tempo ativo <span className="ml-2 font-semibold text-stone-100 tabular-nums">{formatDuration(state.totalElapsedMs)}</span></p>
    </div> : <>
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <span className={`rounded-full border border-current/25 px-3 py-1.5 ${color}`}>{category}</span>
        <span className="text-stone-400">Round <strong className="text-stone-100">{round}</strong> / {rounds}</span>
      </div>
      <div className="pt-10 pb-8 text-center">
        <p className="text-xs font-semibold tracking-[0.2em] text-stone-400 uppercase">{state.status === 'paused' ? 'Treino pausado' : state.status === 'idle' ? 'Tudo pronto' : 'Em andamento'}</p>
        <h2 className="mt-3 break-words text-xl font-semibold sm:text-2xl">{phase ? phaseLabel(phase) : 'Pronto para começar'}</h2>
        <p role="timer" aria-label="Tempo restante da fase" aria-live="off" className={`mt-5 break-all text-[clamp(4rem,22vw,10rem)] leading-tight font-semibold tracking-tighter tabular-nums ${color}`}>
          {formatDuration(state.phaseRemainingMs)}
        </p>
      </div>
      <div className={color}>
        <div className="mb-2 flex justify-between text-xs"><span className="text-stone-400">Progresso da fase</span><span>{Math.floor(phaseProgress)}%</span></div>
        <progress className="workout-progress h-2 w-full" aria-label="Progresso da fase" max={100} value={phaseProgress} />
      </div>
      <div className="mt-4 flex min-h-12 items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/10 px-4 py-2">
        <div className="min-w-0"><p className="text-xs text-stone-400">A seguir</p><p className="mt-1 truncate text-sm font-medium">{nextPhase ? phaseLabel(nextPhase) : 'Treino concluído'}</p></div>
        <span className="shrink-0 text-sm text-stone-400 tabular-nums">{nextPhase ? formatDuration(nextPhase.durationMs) : '✓'}</span>
      </div>
    </>}
    <div className="mt-6 border-t border-white/10 pt-5">
      <div className="mb-3 flex justify-between gap-4 text-sm"><span className="text-stone-400">Progresso total</span><span className="font-medium tabular-nums">{Math.floor(totalProgress)}%</span></div>
      <progress className="workout-progress h-1.5 w-full text-lime-300" aria-label="Progresso total" max={100} value={totalProgress} />
      <p className="mt-2 text-xs text-stone-400">Avanço na timeline · fases puladas contam no percentual.</p>
      <p className="mt-3 text-right text-sm text-stone-400">Restante estimado <span className="ml-2 font-semibold text-stone-100 tabular-nums" data-testid="total-remaining">{formatDuration(state.totalRemainingMs)}</span></p>
    </div>
  </div>;
}
