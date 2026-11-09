import { renderMessage } from '../../../i18n/core';
import type { Message } from '../../../i18n/core';
import type { WorkoutConfig } from '../domain/types';
import { WorkoutConfigError, validateWorkoutConfig } from '../domain/validateWorkoutConfig';
import { buildTimeline } from '../domain/buildTimeline';

export const SAVED_WORKOUTS_KEY = 'roundfit.workouts';
export type SavedWorkout = Readonly<{ name: string; config: WorkoutConfig }>;
export type WorkoutStorage = Pick<Storage, 'getItem' | 'setItem'>;
type Failure = { ok: false; kind: 'error'; message: string; issue: Message };
type Success = { ok: true; workouts: SavedWorkout[] };
export type StorageResult = Success | Failure;
export type SaveResult = StorageResult | { ok: false; kind: 'conflict'; message: string; issue: Message; revision: string };

class WorkoutStorageError extends Error {
  constructor(readonly issue: Message) { super(renderMessage('pt-BR', issue)); }
}

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
const nameKey = (name: string) => name.trim().normalize('NFC').toLocaleLowerCase('pt-BR');

/** Explicit serialization allowlist: no timer state, timeline, or unknown fields. */
export function validateSavedWorkout(value: unknown): SavedWorkout {
  if (!object(value) || typeof value.name !== 'string' || !value.name.trim() || value.name.length > 120) throw new WorkoutStorageError({ key: 'invalidSavedName', params: {} });
  validateWorkoutConfig(value.config);
  const config = value.config;
  if (config.rounds > 100 || (config.mode === 'GUIDED' && config.exercises.length > 50)) throw new WorkoutStorageError({ key: 'savedLimits', params: {} });
  buildTimeline(config);
  const base = { rounds: config.rounds, preparationMs: config.preparationMs ?? 0, restBetweenRoundsMs: config.restBetweenRoundsMs ?? 0 };
  return { name: value.name.trim(), config: config.mode === 'FREE'
    ? { ...base, mode: 'FREE', roundDurationMs: config.roundDurationMs }
    : { ...base, mode: 'GUIDED', restBetweenExercisesMs: config.restBetweenExercisesMs ?? 0,
        exercises: config.exercises.map(exercise => ({ type: 'TIMED', id: exercise.id, name: exercise.name, durationMs: exercise.durationMs })) } };
}

function decode(raw: string | null): SavedWorkout[] {
  if (raw === null) return [];
  if (raw.length > 1_000_000) throw new WorkoutStorageError({ key: 'savedTooLarge', params: {} });
  let data: unknown;
  try { data = JSON.parse(raw); } catch { throw new WorkoutStorageError({ key: 'invalidJson', params: {} }); }
  if (!object(data) || data.version !== 1) throw new WorkoutStorageError({ key: 'unsupportedVersion', params: {} });
  if (!Array.isArray(data.workouts) || data.workouts.length > 100) throw new WorkoutStorageError({ key: 'invalidList', params: {} });
  const names = new Set<string>();
  return data.workouts.map((value: unknown) => {
    const workout = validateSavedWorkout(value);
    if (names.has(nameKey(workout.name))) throw new WorkoutStorageError({ key: 'duplicateNames', params: {} });
    names.add(nameKey(workout.name));
    return workout;
  });
}
const failure = (error: unknown): Failure => {
  const issue: Message = error instanceof WorkoutStorageError ? error.issue
    : { key: error instanceof WorkoutConfigError ? 'errorConfig' : 'storageError', params: {} };
  return { ok: false, kind: 'error', issue, message: renderMessage('pt-BR', issue) };
};
function write(storage: WorkoutStorage, workouts: SavedWorkout[]): Success {
  if (workouts.length > 100) throw new WorkoutStorageError({ key: 'storageLimit', params: {} });
  const encoded = JSON.stringify({ version: 1, workouts });
  if (encoded.length > 1_000_000) throw new WorkoutStorageError({ key: 'storageSpace', params: {} });
  storage.setItem(SAVED_WORKOUTS_KEY, encoded);
  return { ok: true, workouts };
}
export function readSavedWorkouts(storage: WorkoutStorage): StorageResult {
  try { return { ok: true, workouts: decode(storage.getItem(SAVED_WORKOUTS_KEY)) }; }
  catch (error: unknown) { return failure(error); }
}

/** Overwrite requires a revision obtained by a prior explicit conflict/confirmation. */
export function saveWorkout(storage: WorkoutStorage, input: unknown, confirmedRevision?: string): SaveResult {
  try {
    const workout = validateSavedWorkout(input);
    const raw = storage.getItem(SAVED_WORKOUTS_KEY);
    const workouts = decode(raw);
    const index = workouts.findIndex(item => nameKey(item.name) === nameKey(workout.name));
    if (index >= 0 && raw !== confirmedRevision) return {
      ok: false, kind: 'conflict', revision: raw!, issue: { key: 'conflict', params: { name: workout.name } },
      message: renderMessage('pt-BR', { key: 'conflict', params: { name: workout.name } }),
    };
    if (index >= 0) workouts[index] = workout;
    else workouts.push(workout);
    return write(storage, workouts);
  } catch (error: unknown) { return failure(error); }
}
export function deleteWorkout(storage: WorkoutStorage, name: string): StorageResult {
  try {
    const workouts = decode(storage.getItem(SAVED_WORKOUTS_KEY));
    return write(storage, workouts.filter(item => nameKey(item.name) !== nameKey(name)));
  } catch (error: unknown) { return failure(error); }
}
