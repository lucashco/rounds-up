import type { WorkoutConfig } from '../domain/types';
import { validateWorkoutConfig } from '../domain/validateWorkoutConfig';
import { buildTimeline } from '../domain/buildTimeline';

export const SAVED_WORKOUTS_KEY = 'roundfit.workouts';
export type SavedWorkout = Readonly<{ name: string; config: WorkoutConfig }>;
export type WorkoutStorage = Pick<Storage, 'getItem' | 'setItem'>;
type Failure = { ok: false; kind: 'error'; message: string };
type Success = { ok: true; workouts: SavedWorkout[] };
export type StorageResult = Success | Failure;
export type SaveResult = StorageResult | { ok: false; kind: 'conflict'; message: string; revision: string };

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
const nameKey = (name: string) => name.trim().normalize('NFC').toLocaleLowerCase('pt-BR');

/** Explicit serialization allowlist: no timer state, timeline, or unknown fields. */
export function validateSavedWorkout(value: unknown): SavedWorkout {
  if (!object(value) || typeof value.name !== 'string' || !value.name.trim() || value.name.length > 120) throw new Error('Nome de treino salvo inválido.');
  validateWorkoutConfig(value.config);
  const config = value.config;
  if (config.rounds > 100 || (config.mode === 'GUIDED' && config.exercises.length > 50)) throw new Error('Treino salvo excede os limites de 100 rounds ou 50 exercícios.');
  buildTimeline(config);
  const base = { rounds: config.rounds, preparationMs: config.preparationMs ?? 0, restBetweenRoundsMs: config.restBetweenRoundsMs ?? 0 };
  return { name: value.name.trim(), config: config.mode === 'FREE'
    ? { ...base, mode: 'FREE', roundDurationMs: config.roundDurationMs }
    : { ...base, mode: 'GUIDED', restBetweenExercisesMs: config.restBetweenExercisesMs ?? 0,
        exercises: config.exercises.map(exercise => ({ type: 'TIMED', id: exercise.id, name: exercise.name, durationMs: exercise.durationMs })) } };
}

function decode(raw: string | null): SavedWorkout[] {
  if (raw === null) return [];
  if (raw.length > 1_000_000) throw new Error('O arquivo de treinos salvos é muito grande.');
  let data: unknown;
  try { data = JSON.parse(raw); } catch { throw new Error('Os treinos salvos contêm JSON inválido. Os dados originais foram preservados.'); }
  if (!object(data) || data.version !== 1) throw new Error('Versão dos treinos salvos não suportada. Os dados originais foram preservados.');
  if (!Array.isArray(data.workouts) || data.workouts.length > 100) throw new Error('Lista de treinos salvos inválida.');
  const names = new Set<string>();
  return data.workouts.map((value: unknown) => {
    const workout = validateSavedWorkout(value);
    if (names.has(nameKey(workout.name))) throw new Error('Há nomes duplicados nos treinos salvos.');
    names.add(nameKey(workout.name));
    return workout;
  });
}
const failure = (error: unknown): Failure => ({ ok: false, kind: 'error', message: error instanceof Error ? error.message : 'Armazenamento local indisponível.' });
function write(storage: WorkoutStorage, workouts: SavedWorkout[]): Success {
  if (workouts.length > 100) throw new Error('Limite de 100 treinos salvos atingido.');
  const encoded = JSON.stringify({ version: 1, workouts });
  if (encoded.length > 1_000_000) throw new Error('Limite de espaço dos treinos salvos atingido. Exclua um treino antes de salvar outro.');
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
      ok: false, kind: 'conflict', revision: raw!, message: `Já existe um treino chamado “${workout.name}”. Substituir a configuração salva?`,
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
