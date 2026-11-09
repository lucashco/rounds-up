import type { WorkoutConfig } from './types';

export class WorkoutConfigError extends Error {
  constructor(public readonly field: string, reason: string) {
    super(`${field}: ${reason}`);
    this.name = 'WorkoutConfigError';
  }
}

function record(value: unknown, field: string): asserts value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new WorkoutConfigError(field, 'deve ser um objeto');
  }
}

function duration(value: unknown, field: string, allowZero: boolean): asserts value is number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value > Number.MAX_SAFE_INTEGER ||
      (allowZero ? value < 0 : value <= 0)) {
    throw new WorkoutConfigError(field, `deve ser uma duração finita ${allowZero ? 'não negativa' : 'positiva'} em ms, até Number.MAX_SAFE_INTEGER`);
  }
}

function optionalDuration(value: unknown, field: string): void {
  if (value !== undefined) duration(value, field, true);
}

function nonemptyString(value: unknown, field: string): asserts value is string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new WorkoutConfigError(field, 'deve ser uma string não vazia');
  }
}

/** Validates without normalizing or changing the supplied object. */
export function validateWorkoutConfig(config: unknown): asserts config is WorkoutConfig {
  record(config, 'config');
  if (config.mode !== 'FREE' && config.mode !== 'GUIDED') {
    throw new WorkoutConfigError('mode', 'deve ser FREE ou GUIDED');
  }
  if (typeof config.rounds !== 'number' || !Number.isSafeInteger(config.rounds) || config.rounds <= 0) {
    throw new WorkoutConfigError('rounds', 'deve ser um inteiro positivo seguro');
  }
  optionalDuration(config.preparationMs, 'preparationMs');
  optionalDuration(config.restBetweenRoundsMs, 'restBetweenRoundsMs');
  if (config.mode === 'FREE') {
    duration(config.roundDurationMs, 'roundDurationMs', false);
    return;
  }
  optionalDuration(config.restBetweenExercisesMs, 'restBetweenExercisesMs');
  if (!Array.isArray(config.exercises) || config.exercises.length === 0) {
    throw new WorkoutConfigError('exercises', 'deve conter pelo menos um exercício');
  }
  const ids = new Set<string>();
  for (let index = 0; index < config.exercises.length; index += 1) {
    const exercise: unknown = config.exercises[index];
    const field = `exercises[${index}]`;
    record(exercise, field);
    if (exercise.type !== 'TIMED') throw new WorkoutConfigError(`${field}.type`, 'deve ser TIMED');
    nonemptyString(exercise.id, `${field}.id`);
    nonemptyString(exercise.name, `${field}.name`);
    if (ids.has(exercise.id)) throw new WorkoutConfigError(`${field}.id`, 'identificador duplicado');
    ids.add(exercise.id);
    duration(exercise.durationMs, `${field}.durationMs`, false);
  }
}
