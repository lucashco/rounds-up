import { renderMessage } from '../../../i18n/core';
import type { Message } from '../../../i18n/core';
import { durationInputError, durationSeconds } from './duration';
import { buildTimeline } from '../domain/buildTimeline';
import type { WorkoutConfig, WorkoutTimeline } from '../domain/types';
import { WorkoutConfigError } from '../domain/validateWorkoutConfig';

export type ExerciseDraft = { id: string; name: string; seconds: string };
export type WorkoutDraft = {
  mode: WorkoutConfig['mode'];
  name: string;
  rounds: string;
  preparationSeconds: string;
  restBetweenRoundsSeconds: string;
  roundSeconds: string;
  restBetweenExercisesSeconds: string;
  exercises: ExerciseDraft[];
  nextExerciseId: number;
};
export type WorkoutSessionConfig = {
  name: string;
  config: WorkoutConfig;
  timeline: WorkoutTimeline;
};
export type FormResult =
  | { ok: true; workout: WorkoutSessionConfig }
  | { ok: false; field: string; message: string; issue: Message };

export function createWorkoutDraft(): WorkoutDraft {
  return {
    mode: 'FREE', name: 'Meu treino', rounds: '3', preparationSeconds: '10',
    restBetweenRoundsSeconds: '20', roundSeconds: '60', restBetweenExercisesSeconds: '0',
    exercises: [{ id: 'exercise-1', name: 'Polichinelos', seconds: '30' }], nextExerciseId: 2,
  };
}

const number = (value: string): number => value.trim() === '' ? NaN : Number(value);
const milliseconds = (value: string): number => durationInputError(value, true) ? NaN : durationSeconds(value) * 1_000;
const optionalMilliseconds = (value: string): number => value.trim() === '' ? 0 : milliseconds(value);

function readableError(error: WorkoutConfigError): Message {
  const exercise = /^exercises\[(\d+)\]\.(\w+)$/.exec(error.field);
  if (exercise) return { key: exercise[2] === 'name' ? 'errorExerciseName' : 'errorExerciseDuration', params: { index: Number(exercise[1]) + 1 } };
  const messages: Record<string, Message> = {
    rounds: { key: 'errorRounds', params: {} },
    roundDurationMs: { key: 'errorRoundDuration', params: {} },
    preparationMs: { key: 'errorPreparation', params: {} },
    restBetweenRoundsMs: { key: 'errorRoundRest', params: {} },
    restBetweenExercisesMs: { key: 'errorExerciseRest', params: {} },
    exercises: { key: 'errorExercises', params: {} },
    totalDurationMs: { key: 'errorTotal', params: {} },
  };
  return messages[error.field] ?? { key: 'errorConfig', params: {} };
}
function invalidForm(field: string, issue: Message): FormResult {
  return { ok: false, field, issue, message: renderMessage('pt-BR', issue) };
}

/** Form-only conversion. Domain validation and timeline generation remain in buildTimeline. */
export function prepareWorkout(draft: WorkoutDraft): FormResult {
  if (draft.name.trim() === '') return invalidForm('name', { key: 'errorName', params: {} });
  // Bound interactive workload before building arrays; domain contracts stay unrestricted.
  if (number(draft.rounds) > 100) {
    return invalidForm('rounds', { key: 'errorMaxRounds', params: {} });
  }
  const base = {
    rounds: number(draft.rounds), preparationMs: optionalMilliseconds(draft.preparationSeconds),
    restBetweenRoundsMs: optionalMilliseconds(draft.restBetweenRoundsSeconds),
  };
  const config: WorkoutConfig = draft.mode === 'FREE'
    ? { ...base, mode: 'FREE', roundDurationMs: milliseconds(draft.roundSeconds) }
    : { ...base, mode: 'GUIDED', restBetweenExercisesMs: optionalMilliseconds(draft.restBetweenExercisesSeconds),
        exercises: draft.exercises.map(exercise => ({
          type: 'TIMED', id: exercise.id, name: exercise.name.trim(), durationMs: milliseconds(exercise.seconds),
        })) };
  try {
    return { ok: true, workout: { name: draft.name.trim(), config, timeline: buildTimeline(config) } };
  } catch (error: unknown) {
    if (error instanceof WorkoutConfigError) return invalidForm(error.field, readableError(error));
    throw error;
  }
}

export function moveExercise(draft: WorkoutDraft, index: number, direction: -1 | 1): WorkoutDraft {
  const destination = index + direction;
  if (destination < 0 || destination >= draft.exercises.length) return draft;
  const exercises = [...draft.exercises];
  [exercises[index], exercises[destination]] = [exercises[destination]!, exercises[index]!];
  return { ...draft, exercises };
}

/** Rebuild the editable draft from validated config, retaining stable exercise IDs. */
export function workoutToDraft(workout: { name: string; config: WorkoutConfig }): WorkoutDraft {
  const { config } = workout;
  const draft = createWorkoutDraft();
  const exercises = config.mode === 'GUIDED' ? config.exercises.map(exercise => ({
    id: exercise.id, name: exercise.name, seconds: String(exercise.durationMs / 1_000),
  })) : draft.exercises;
  let nextExerciseId = 1;
  while (exercises.some(exercise => exercise.id === `exercise-${nextExerciseId}`)) nextExerciseId += 1;
  return { ...draft, mode: config.mode, name: workout.name, rounds: String(config.rounds),
    preparationSeconds: String((config.preparationMs ?? 0) / 1_000),
    restBetweenRoundsSeconds: String((config.restBetweenRoundsMs ?? 0) / 1_000),
    roundSeconds: config.mode === 'FREE' ? String(config.roundDurationMs / 1_000) : draft.roundSeconds,
    restBetweenExercisesSeconds: config.mode === 'GUIDED' ? String((config.restBetweenExercisesMs ?? 0) / 1_000) : draft.restBetweenExercisesSeconds,
    exercises, nextExerciseId };
}

export function appendExercise(draft: WorkoutDraft): WorkoutDraft {
  let id = draft.nextExerciseId;
  while (draft.exercises.some(exercise => exercise.id === `exercise-${id}`)) id += 1;
  return { ...draft, nextExerciseId: id + 1,
    exercises: [...draft.exercises, { id: `exercise-${id}`, name: '', seconds: '30' }] };
}
