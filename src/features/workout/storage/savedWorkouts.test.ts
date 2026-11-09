import { describe, expect, it } from 'vitest';
import { deleteWorkout, readSavedWorkouts, SAVED_WORKOUTS_KEY, saveWorkout } from './savedWorkouts';
import type { WorkoutStorage } from './savedWorkouts';

function memory(raw: string | null = null) {
  let value = raw;
  return { getItem: () => value, setItem: (_key: string, next: string) => { value = next; } };
}
const workout = { name: 'Força', config: { mode: 'FREE', rounds: 2, roundDurationMs: 5_000 } };

describe('saved workout storage', () => {
  it('salva, lista e exclui configurações, sem estado transitório', () => {
    const storage = memory();
    expect(readSavedWorkouts(storage)).toEqual({ ok: true, workouts: [] });
    expect(saveWorkout(storage, { ...workout, timeline: {}, status: 'running', totalElapsedMs: 30 }).ok).toBe(true);
    const raw = storage.getItem();
    expect(raw).toContain('"version":1');
    expect(raw).not.toContain('timeline');
    expect(raw).not.toContain('running');
    const loaded = readSavedWorkouts(storage);
    expect(loaded).toMatchObject({ ok: true, workouts: [workout] });
    expect(deleteWorkout(storage, 'Força')).toEqual({ ok: true, workouts: [] });
  });

  it('exige confirmação e detecta revisão alterada em outra aba', () => {
    const storage = memory();
    saveWorkout(storage, workout);
    const changed = { ...workout, name: ' força ', config: { ...workout.config, rounds: 3 } };
    const conflict = saveWorkout(storage, changed);
    expect(conflict).toMatchObject({ ok: false, kind: 'conflict' });
    if (conflict.ok || conflict.kind !== 'conflict') throw new Error('Conflito esperado');
    expect(readSavedWorkouts(storage)).toMatchObject({ workouts: [{ config: { rounds: 2 } }] });
    saveWorkout(storage, { ...workout, name: 'Outro' });
    expect(saveWorkout(storage, changed, conflict.revision)).toMatchObject({ ok: false, kind: 'conflict' });
    const latest = saveWorkout(storage, changed);
    if (latest.ok || latest.kind !== 'conflict') throw new Error('Conflito esperado');
    expect(saveWorkout(storage, changed, latest.revision).ok).toBe(true);
    expect(readSavedWorkouts(storage)).toMatchObject({ workouts: [{ config: { rounds: 3 } }, { name: 'Outro' }] });
  });

  it.each(['{broken', 'null', '{"version":2,"workouts":[]}', '{"version":1,"workouts":[{}]}',
    JSON.stringify({ version: 1, workouts: [{ ...workout, config: { ...workout.config, rounds: 0 } }] }),
    JSON.stringify({ version: 1, workouts: [{ ...workout, config: { ...workout.config, rounds: 1e15 } }] }),
    JSON.stringify({ version: 1, workouts: [workout, workout] }),
  ])('não usa nem sobrescreve dados inválidos %#', raw => {
    const storage = memory(raw);
    expect(readSavedWorkouts(storage).ok).toBe(false);
    expect(saveWorkout(storage, workout).ok).toBe(false);
    expect(deleteWorkout(storage, 'Força').ok).toBe(false);
    expect(storage.getItem()).toBe(raw);
  });

  it('trata leitura e gravação indisponíveis sem lançar ao consumidor', () => {
    const unavailable: WorkoutStorage = { getItem() { throw new Error('Bloqueado'); }, setItem() { throw new Error('Quota'); } };
    expect(readSavedWorkouts(unavailable)).toMatchObject({ ok: false, kind: 'error' });
    const full = { getItem: () => null, setItem() { throw new Error('Quota'); } };
    expect(saveWorkout(full, workout)).toMatchObject({ ok: false, kind: 'error' });
  });

  it('preserva IDs e durações guiadas e rejeita configuração inválida ao salvar', () => {
    const storage = memory();
    const guided = { name: 'Circuito', config: { mode: 'GUIDED', rounds: 1, exercises: [
      { type: 'TIMED', id: 'swing', name: 'Swing', durationMs: 1_000 },
      { type: 'TIMED', id: 'clean', name: 'Clean', durationMs: 2_000 },
    ] } };
    expect(saveWorkout(storage, guided).ok).toBe(true);
    expect(readSavedWorkouts(storage)).toMatchObject({ workouts: [guided] });
    expect(saveWorkout(storage, { ...workout, config: { ...workout.config, roundDurationMs: 0 } }).ok).toBe(false);
    expect(storage.getItem()).not.toContain('Força');
    expect(SAVED_WORKOUTS_KEY).toBe('roundfit.workouts');
  });
});
