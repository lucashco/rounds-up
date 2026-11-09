import { translator } from '../../../i18n/core';
import type { Locale } from '../../../i18n/core';
import type { WorkoutPhase } from '../domain/types';

export function formatDuration(ms: number): string {
  const seconds = Math.ceil(Math.max(0, ms) / 1_000);
  return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
}

export function phaseLabel(phase: WorkoutPhase, locale: Locale = 'pt-BR'): string {
  const t = translator(locale);
  switch (phase.type) {
    case 'PREPARATION': return t('phasePreparation');
    case 'FREE': return t('phaseFree');
    case 'EXERCISE': return phase.exerciseName;
    case 'REST_BETWEEN_EXERCISES': return t('phaseExerciseRest');
    case 'REST_BETWEEN_ROUNDS': return t('roundRest');
  }
}

export const primaryButton = 'action-primary';
export const secondaryButton = 'action-secondary';
export const fieldClass = 'workout-field';

/** Timeline position, including skipped segments; not a measure of time trained. */
export function totalProgressPercent(state: import('../domain/timerEngine').TimerState, totalDurationMs: number): number {
  if (state.status === 'completed') return 100;
  if (totalDurationMs <= 0) return 0;
  return Math.min(100, Math.max(0, (1 - state.totalRemainingMs / totalDurationMs) * 100));
}
