import { describe, expect, it } from 'vitest';
import { buildTimeline } from './buildTimeline';
import type { WorkoutConfig } from './types';
import { validateWorkoutConfig, WorkoutConfigError } from './validateWorkoutConfig';

const free = { mode: 'FREE', rounds: 1, roundDurationMs: 30_000 } as const;
const guided = {
  mode: 'GUIDED', rounds: 2,
  exercises: [
    { type: 'TIMED', id: 'swing', name: 'Swing', durationMs: 20_000 },
    { type: 'TIMED', id: 'squat', name: 'Agachamento', durationMs: 30_000 },
  ],
} as const satisfies WorkoutConfig;

const types = (config: unknown) => buildTimeline(config).phases.map(phase => phase.type);

describe('buildTimeline', () => {
  it('gera um round livre com offsets em ms', () => {
    expect(buildTimeline(free)).toEqual({
      phases: [{ type: 'FREE', round: 1, durationMs: 30_000, startMs: 0, endMs: 30_000 }],
      totalDurationMs: 30_000,
    });
  });

  it('gera múltiplos rounds livres e descanso apenas entre eles', () => {
    expect(buildTimeline({ ...free, rounds: 3, restBetweenRoundsMs: 5_000 })).toEqual({
      phases: [
        { type: 'FREE', round: 1, durationMs: 30_000, startMs: 0, endMs: 30_000 },
        { type: 'REST_BETWEEN_ROUNDS', round: 1, durationMs: 5_000, startMs: 30_000, endMs: 35_000 },
        { type: 'FREE', round: 2, durationMs: 30_000, startMs: 35_000, endMs: 65_000 },
        { type: 'REST_BETWEEN_ROUNDS', round: 2, durationMs: 5_000, startMs: 65_000, endMs: 70_000 },
        { type: 'FREE', round: 3, durationMs: 30_000, startMs: 70_000, endMs: 100_000 },
      ], totalDurationMs: 100_000,
    });
  });

  it('repete a sequência guiada preservando IDs e durações individuais', () => {
    expect(buildTimeline(guided).phases).toEqual([
      { type: 'EXERCISE', round: 1, exerciseId: 'swing', exerciseName: 'Swing', durationMs: 20_000, startMs: 0, endMs: 20_000 },
      { type: 'EXERCISE', round: 1, exerciseId: 'squat', exerciseName: 'Agachamento', durationMs: 30_000, startMs: 20_000, endMs: 50_000 },
      { type: 'EXERCISE', round: 2, exerciseId: 'swing', exerciseName: 'Swing', durationMs: 20_000, startMs: 50_000, endMs: 70_000 },
      { type: 'EXERCISE', round: 2, exerciseId: 'squat', exerciseName: 'Agachamento', durationMs: 30_000, startMs: 70_000, endMs: 100_000 },
    ]);
  });

  it('insere preparação uma vez e os dois tipos de descanso nos lugares corretos', () => {
    const timeline = buildTimeline({ ...guided, preparationMs: 3_000, restBetweenExercisesMs: 2_000, restBetweenRoundsMs: 5_000 });
    expect(timeline.phases.map(p => p.type)).toEqual([
      'PREPARATION', 'EXERCISE', 'REST_BETWEEN_EXERCISES', 'EXERCISE',
      'REST_BETWEEN_ROUNDS', 'EXERCISE', 'REST_BETWEEN_EXERCISES', 'EXERCISE',
    ]);
    expect(timeline.phases.filter(p => p.type === 'REST_BETWEEN_EXERCISES')).toEqual([
      { type: 'REST_BETWEEN_EXERCISES', round: 1, afterExerciseId: 'swing', durationMs: 2_000, startMs: 23_000, endMs: 25_000 },
      { type: 'REST_BETWEEN_EXERCISES', round: 2, afterExerciseId: 'swing', durationMs: 2_000, startMs: 80_000, endMs: 82_000 },
    ]);
    expect(timeline.totalDurationMs).toBe(112_000);
    expect(timeline.phases.reduce((sum, p) => sum + p.durationMs, 0)).toBe(112_000);
    expect(timeline.phases.at(-1)?.endMs).toBe(112_000);
    timeline.phases.forEach((phase, i) => {
      expect(phase.startMs).toBe(i === 0 ? 0 : timeline.phases[i - 1]?.endMs);
    });
  });

  it('omite preparação e descansos iguais a zero', () => {
    expect(types({ ...guided, preparationMs: 0, restBetweenRoundsMs: 0, restBetweenExercisesMs: 0 }))
      .toEqual(['EXERCISE', 'EXERCISE', 'EXERCISE', 'EXERCISE']);
  });

  it('não adiciona descanso em circuito de um exercício e um round', () => {
    expect(types({ ...guided, rounds: 1, exercises: [guided.exercises[0]], restBetweenExercisesMs: 10, restBetweenRoundsMs: 10 }))
      .toEqual(['EXERCISE']);
    expect(types({ ...free, restBetweenRoundsMs: 10 })).toEqual(['FREE']);
  });

  it('é determinístico e não modifica a configuração nem compartilha objetos mutáveis', () => {
    const config = structuredClone(guided);
    const original = structuredClone(config);
    config.exercises.forEach(Object.freeze);
    Object.freeze(config.exercises);
    Object.freeze(config);
    const first = buildTimeline(config);
    const second = buildTimeline(config);
    expect(config).toEqual(original);
    expect(first).toEqual(second);
    expect(first.phases).not.toBe(second.phases);
    expect(first.phases[0]).not.toBe(config.exercises[0]);
  });

  it('rejeita overflow na duração acumulada', () => {
    expect(() => buildTimeline({ ...free, rounds: 2, roundDurationMs: Number.MAX_SAFE_INTEGER }))
      .toThrow('totalDurationMs');
  });
});

describe('validateWorkoutConfig', () => {
  const invalidCases: [unknown, string][] = [
    [null, 'config'], [[], 'config'], [{}, 'mode'], [{ ...free, mode: 'OTHER' }, 'mode'],
    ...[0, -1, 1.5, NaN, Infinity, '2', Number.MAX_SAFE_INTEGER + 1].map(rounds => [{ ...free, rounds }, 'rounds']),
    ...[0, -1, NaN, Infinity, '100', undefined, Number.MAX_SAFE_INTEGER + 1].map(roundDurationMs => [{ ...free, roundDurationMs }, 'roundDurationMs']),
    ...[-1, NaN, Infinity, null, '0'].map(preparationMs => [{ ...free, preparationMs }, 'preparationMs']),
    [{ ...free, restBetweenRoundsMs: -1 }, 'restBetweenRoundsMs'],
    [{ ...guided, restBetweenExercisesMs: -1 }, 'restBetweenExercisesMs'],
    [{ ...guided, exercises: [] }, 'exercises'],
    [{ ...guided, exercises: null }, 'exercises'],
    [{ ...guided, exercises: [null] }, 'exercises[0]'],
    [{ ...guided, exercises: [{ ...guided.exercises[0], type: 'OTHER' }] }, 'exercises[0].type'],
    [{ ...guided, exercises: [{ ...guided.exercises[0], id: ' ' }] }, 'exercises[0].id'],
    [{ ...guided, exercises: [{ ...guided.exercises[0], name: '' }] }, 'exercises[0].name'],
    [{ ...guided, exercises: [guided.exercises[0], guided.exercises[0]] }, 'exercises[1].id'],
    ...[0, -1, NaN, Infinity, undefined].map(durationMs => [{ ...guided, exercises: [{ ...guided.exercises[0], durationMs }] }, 'exercises[0].durationMs']),
  ] as [unknown, string][];
  it.each(invalidCases)('rejeita configuração inválida %# com erro explícito', (config, field) => {
    const actions: ((input: unknown) => void)[] = [validateWorkoutConfig, buildTimeline];
    for (const action of actions) {
      expect(() => action(config)).toThrow(WorkoutConfigError);
      try {
        action(config);
      } catch (error: unknown) {
        expect(error).toBeInstanceOf(WorkoutConfigError);
        if (error instanceof WorkoutConfigError) expect(error.field).toBe(field);
      }
    }
  });
});
