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
  | { ok: false; field: string; message: string };

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

function readableError(error: WorkoutConfigError): string {
  const exercise = /^exercises\[(\d+)\]\.(\w+)$/.exec(error.field);
  if (exercise) {
    const index = Number(exercise[1]) + 1;
    return exercise[2] === 'name'
      ? `Informe o nome do exercício ${index}.`
      : `Informe uma duração maior que zero, em segundos, para o exercício ${index}.`;
  }
  const messages: Record<string, string> = {
    rounds: 'Informe uma quantidade inteira de rounds, de 1 a 100.',
    roundDurationMs: 'A duração do round deve ser um número maior que zero, em segundos.',
    preparationMs: 'A preparação deve ser um número igual ou maior que zero, em segundos.',
    restBetweenRoundsMs: 'O descanso entre rounds deve ser um número igual ou maior que zero, em segundos.',
    restBetweenExercisesMs: 'O descanso entre exercícios deve ser um número igual ou maior que zero, em segundos.',
    exercises: 'Adicione pelo menos um exercício ao circuito.',
    totalDurationMs: 'A duração total é muito grande. Reduza as durações ou os rounds.',
  };
  return messages[error.field] ?? 'Revise a configuração do treino.';
}

/** Form-only conversion. Domain validation and timeline generation remain in buildTimeline. */
export function prepareWorkout(draft: WorkoutDraft): FormResult {
  if (draft.name.trim() === '') return { ok: false, field: 'name', message: 'Informe o nome do treino.' };
  // Bound interactive workload before building arrays; domain contracts stay unrestricted.
  if (number(draft.rounds) > 100) {
    return { ok: false, field: 'rounds', message: 'Use no máximo 100 rounds por treino.' };
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
    if (error instanceof WorkoutConfigError) return { ok: false, field: error.field, message: readableError(error) };
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
