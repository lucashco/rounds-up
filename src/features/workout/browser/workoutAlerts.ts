import type { TimerState } from '../domain/timerEngine';

export type WorkoutAlert = 'countdown' | 'exercise' | 'rest' | 'complete';
export type AlertCursor = Readonly<{ phaseIndex: number | null; announced: boolean; lowestSecond: number; completed: boolean }>;
export const initialAlertCursor = (): AlertCursor => ({ phaseIndex: null, announced: false, lowestSecond: 4, completed: false });

/** Only the current alert is returned: missed seconds/phases are never replayed. */
export function selectWorkoutAlert(cursor: AlertCursor, state: TimerState): { cursor: AlertCursor; alert: WorkoutAlert | null } {
  if (state.status === 'completed') return {
    cursor: { ...cursor, completed: true }, alert: cursor.completed ? null : 'complete',
  };
  const phaseChanged = cursor.phaseIndex !== state.phaseIndex;
  const current = phaseChanged ? { ...initialAlertCursor(), phaseIndex: state.phaseIndex } : cursor;
  if (state.status !== 'running' || !state.currentPhase) return { cursor: current, alert: null };
  const second = Math.ceil(state.phaseRemainingMs / 1_000);
  let alert: WorkoutAlert | null = null;
  if (!current.announced) {
    const type = state.currentPhase.type;
    if (type === 'FREE' || type === 'EXERCISE') alert = 'exercise';
    else if (type === 'REST_BETWEEN_EXERCISES' || type === 'REST_BETWEEN_ROUNDS') alert = 'rest';
  }
  if (!alert && second >= 1 && second <= 3 && second < current.lowestSecond) alert = 'countdown';
  return {
    cursor: { phaseIndex: state.phaseIndex, announced: true, lowestSecond: Math.min(current.lowestSecond, second), completed: false },
    alert,
  };
}
