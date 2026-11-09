import { describe, expect, it } from 'vitest';
import { createWorkoutDraft, moveExercise, prepareWorkout } from './workoutForm';
import { formatDuration } from '../components/presentation';

describe('workout form adapter', () => {
  it('converte segundos em ms e gera a timeline real ao iniciar', () => {
    const result = prepareWorkout({ ...createWorkoutDraft(), name: '  Força  ', rounds: '2',
      preparationSeconds: '3', roundSeconds: '30', restBetweenRoundsSeconds: '5' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.workout.name).toBe('Força');
    expect(result.workout.config).toEqual({ mode: 'FREE', rounds: 2, preparationMs: 3_000,
      roundDurationMs: 30_000, restBetweenRoundsMs: 5_000 });
    expect(result.workout.timeline.totalDurationMs).toBe(68_000);
    expect(result.workout.timeline.phases.map(phase => phase.type)).toEqual(['PREPARATION', 'FREE', 'REST_BETWEEN_ROUNDS', 'FREE']);
  });

  it('reordena preservando IDs, sem modificar o rascunho', () => {
    const draft = { ...createWorkoutDraft(), exercises: [
      { id: 'a', name: 'Swing', seconds: '10' }, { id: 'b', name: 'Squat', seconds: '20' },
    ] };
    const moved = moveExercise(draft, 1, -1);
    expect(draft.exercises.map(exercise => exercise.id)).toEqual(['a', 'b']);
    expect(moved.exercises.map(exercise => exercise.id)).toEqual(['b', 'a']);
    expect(moveExercise(draft, 0, -1)).toBe(draft);
    const result = prepareWorkout({ ...moved, mode: 'GUIDED', rounds: '1', preparationSeconds: '0', restBetweenExercisesSeconds: '2' });
    if (!result.ok) throw new Error(result.message);
    expect(result.workout.timeline.totalDurationMs).toBe(32_000);
    expect(result.workout.timeline.phases[0]).toMatchObject({ exerciseId: 'b', durationMs: 20_000 });
  });

  it('omite preparação e descansos opcionais deixados em branco', () => {
    const result = prepareWorkout({ ...createWorkoutDraft(), mode: 'GUIDED',
      preparationSeconds: '', restBetweenRoundsSeconds: '', restBetweenExercisesSeconds: '' });
    if (!result.ok) throw new Error(result.message);
    expect(result.workout.timeline.phases.map(phase => phase.type)).toEqual(['EXERCISE', 'EXERCISE', 'EXERCISE']);
    expect(result.workout.timeline.totalDurationMs).toBe(90_000);
  });

  it('ignora campos do modo inativo', () => {
    const draft = { ...createWorkoutDraft(), exercises: [], restBetweenExercisesSeconds: '-1' };
    expect(prepareWorkout(draft).ok).toBe(true);
    expect(prepareWorkout({ ...draft, mode: 'GUIDED' }).ok).toBe(false);
  });

  it.each([
    [{ name: ' ' }, 'Informe o nome do treino.'],
    [{ rounds: '' }, 'Informe uma quantidade inteira de rounds, de 1 a 100.'],
    [{ rounds: '1.5' }, 'Informe uma quantidade inteira de rounds, de 1 a 100.'],
    [{ rounds: '101' }, 'Use no máximo 100 rounds por treino.'],
    [{ roundSeconds: '0' }, 'A duração do round deve ser um número maior que zero, em segundos.'],
    [{ preparationSeconds: '-1' }, 'A preparação deve ser um número igual ou maior que zero, em segundos.'],
  ])('traduz erros de formulário %#', (changes, message) => {
    expect(prepareWorkout({ ...createWorkoutDraft(), ...changes })).toMatchObject({ ok: false, message });
  });

  it.each([[0, '00:00'], [1, '00:01'], [59_001, '01:00'], [60_000, '01:00'], [3_600_000, '60:00']])('formata %s ms como %s', (ms, text) => {
    expect(formatDuration(ms)).toBe(text);
  });
});
