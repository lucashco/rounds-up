import type { WorkoutPhase, WorkoutTimeline } from './types';
import { validateWorkoutConfig, WorkoutConfigError } from './validateWorkoutConfig';

type PhaseDetails = WorkoutPhase extends infer Phase
  ? Phase extends WorkoutPhase ? Omit<Phase, 'durationMs' | 'startMs' | 'endMs'> : never
  : never;

/** Pure and deterministic: no clock, browser APIs, randomness or input mutation. */
export function buildTimeline(config: unknown): WorkoutTimeline {
  validateWorkoutConfig(config);
  const phases: WorkoutPhase[] = [];
  let totalDurationMs = 0;

  function append(details: PhaseDetails, durationMs: number): void {
    if (durationMs === 0) return;
    const endMs = totalDurationMs + durationMs;
    if (!Number.isFinite(endMs) || endMs > Number.MAX_SAFE_INTEGER || endMs <= totalDurationMs) {
      throw new WorkoutConfigError('totalDurationMs', 'duração acumulada excede a precisão numérica suportada');
    }
    phases.push({ ...details, durationMs, startMs: totalDurationMs, endMs });
    totalDurationMs = endMs;
  }

  append({ type: 'PREPARATION' }, config.preparationMs ?? 0);
  for (let round = 1; round <= config.rounds; round += 1) {
    if (config.mode === 'FREE') {
      append({ type: 'FREE', round }, config.roundDurationMs);
    } else {
      config.exercises.forEach((exercise, index) => {
        append({ type: 'EXERCISE', round, exerciseId: exercise.id, exerciseName: exercise.name }, exercise.durationMs);
        if (index < config.exercises.length - 1) {
          append({ type: 'REST_BETWEEN_EXERCISES', round, afterExerciseId: exercise.id }, config.restBetweenExercisesMs ?? 0);
        }
      });
    }
    if (round < config.rounds) {
      append({ type: 'REST_BETWEEN_ROUNDS', round }, config.restBetweenRoundsMs ?? 0);
    }
  }
  return { phases, totalDurationMs };
}
