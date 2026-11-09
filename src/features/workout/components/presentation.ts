import type { WorkoutPhase } from '../domain/types';

export function formatDuration(ms: number): string {
  const seconds = Math.ceil(Math.max(0, ms) / 1_000);
  return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
}

export function phaseLabel(phase: WorkoutPhase): string {
  switch (phase.type) {
    case 'PREPARATION': return 'Preparação';
    case 'FREE': return 'Round livre';
    case 'EXERCISE': return phase.exerciseName;
    case 'REST_BETWEEN_EXERCISES': return 'Descanso entre exercícios';
    case 'REST_BETWEEN_ROUNDS': return 'Descanso entre rounds';
  }
}

export const primaryButton = 'flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl bg-lime-300 px-6 py-4 text-base font-bold text-stone-950 transition hover:bg-lime-200 active:scale-[0.99]';
export const secondaryButton = 'flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-5 py-3 font-semibold text-stone-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40';
export const fieldClass = 'mt-2 min-h-12 w-full min-w-0 rounded-xl border border-white/15 bg-black/20 px-4 py-3 text-base text-stone-100 outline-none focus:border-lime-300 aria-invalid:border-rose-400';

/** Timeline position, including skipped segments; not a measure of time trained. */
export function totalProgressPercent(state: import('../domain/timerEngine').TimerState, totalDurationMs: number): number {
  if (state.status === 'completed') return 100;
  if (totalDurationMs <= 0) return 0;
  return Math.min(100, Math.max(0, (1 - state.totalRemainingMs / totalDurationMs) * 100));
}
