import { describe, expect, it } from 'vitest';
import { durationInputError, durationParts, durationSeconds } from './duration';
import { appendExercise, createWorkoutDraft, prepareWorkout, workoutToDraft } from './workoutForm';
import { buildTimeline } from '../domain/buildTimeline';
import { createTimerEngine, transitionTimer } from '../domain/timerEngine';
import { totalProgressPercent } from '../components/presentation';

describe('duration conversion', () => {
  it.each([['1:30', 90], ['0:59', 59], ['2:', 120], [':30', 30], ['0:0', 0], ['60', 60]])('converte %s para %s segundos', (value, expected) => {
    expect(durationSeconds(value)).toBe(expected);
  });
  it.each(['-1:00', '0:-1', '0:60', '0:59.5', '1.5:00', 'abc:0', '1:2:3'])('rejeita duração inválida %s', value => {
    expect(Number.isNaN(durationSeconds(value))).toBe(true);
    expect(durationInputError(value, true)).not.toBeNull();
  });
  it('valida zero permitido/proibido e mantém segundos antigos compatíveis', () => {
    expect(durationInputError('59.5', true)).not.toBeNull();
    expect(prepareWorkout({ ...createWorkoutDraft(), roundSeconds: '59.5' }).ok).toBe(false);
    expect(durationInputError('0:0', false)).toContain('maior que zero');
    expect(durationInputError('0:0', true)).toBeNull();
    expect(durationInputError('', true)).toBeNull();
    expect(durationInputError('', false)).not.toBeNull();
    expect(durationParts('125')).toEqual({ minutes: '2', seconds: '5' });
    expect(durationParts('0:60')).toEqual({ minutes: '0', seconds: '60' });
  });
  it('gera os mesmos contratos em ms com o novo formulário', () => {
    const result = prepareWorkout({ ...createWorkoutDraft(), rounds: '1', roundSeconds: '1:30', preparationSeconds: '0:5' });
    if (!result.ok) throw new Error(result.message);
    expect(result.workout.timeline.totalDurationMs).toBe(95_000);
  });
  it('reconstrói rascunho sem IDs duplicados ao adicionar depois de carregar', () => {
    const draft = workoutToDraft({ name: 'Treino', config: { mode: 'GUIDED', rounds: 1, exercises: [
      { type: 'TIMED', id: 'exercise-2', name: 'Swing', durationMs: 1_000 },
      { type: 'TIMED', id: 'exercise-99999999999999999999999999', name: 'Clean', durationMs: 2_000 },
    ] } });
    const next = appendExercise(appendExercise(draft));
    expect(new Set(next.exercises.map(exercise => exercise.id)).size).toBe(4);
  });
});

describe('total progress', () => {
  const timeline = buildTimeline({ mode: 'FREE', rounds: 2, preparationMs: 1_000, roundDurationMs: 1_000, restBetweenRoundsMs: 1_000 });
  it('é contínuo e inclui preparação, rounds e descanso', () => {
    let engine = transitionTimer(createTimerEngine(timeline), { type: 'start', now: 0 });
    for (const now of [0, 500, 1_000, 1_500, 2_000, 2_500, 3_000, 3_500, 4_000]) {
      engine = transitionTimer(engine, { type: 'update', now });
      expect(totalProgressPercent(engine.state, timeline.totalDurationMs)).toBe(now / 40);
    }
  });
  it('fases puladas avançam percentual, mas não o tempo ativo', () => {
    let engine = transitionTimer(createTimerEngine(timeline), { type: 'start', now: 0 });
    engine = transitionTimer(engine, { type: 'next', now: 100 });
    expect(totalProgressPercent(engine.state, timeline.totalDurationMs)).toBe(25);
    expect(engine.state.totalElapsedMs).toBe(100);
    expect(engine.state.totalRemainingMs).toBe(3_000);
    engine = transitionTimer(engine, { type: 'update', now: 10_000 });
    expect(totalProgressPercent(engine.state, timeline.totalDurationMs)).toBe(100);
  });
});
