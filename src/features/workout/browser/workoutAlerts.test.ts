import { describe, expect, it } from 'vitest';
import { buildTimeline } from '../domain/buildTimeline';
import { createTimerEngine, transitionTimer } from '../domain/timerEngine';
import { initialAlertCursor, selectWorkoutAlert } from './workoutAlerts';

const timeline = buildTimeline({ mode: 'FREE', rounds: 2, preparationMs: 5_000, roundDurationMs: 5_000, restBetweenRoundsMs: 4_000 });
const started = () => transitionTimer(createTimerEngine(timeline), { type: 'start', now: 0 });

describe('workout alert policy', () => {
  it('emite um sinal por segundo nos últimos 3 segundos, sem duplicação', () => {
    let cursor = initialAlertCursor();
    let engine = started();
    const expected = [null, 'countdown', null, 'countdown', 'countdown'];
    [0, 2_000, 2_050, 3_000, 4_000].forEach((now, index) => {
      engine = transitionTimer(engine, { type: 'update', now });
      const result = selectWorkoutAlert(cursor, engine.state);
      cursor = result.cursor;
      expect(result.alert).toBe(expected[index]);
      expect(selectWorkoutAlert(cursor, engine.state).alert).toBeNull();
    });
  });

  it('distingue exercício, descanso e conclusão', () => {
    let cursor = initialAlertCursor();
    let engine = started();
    for (const [now, alert] of [[5_000, 'exercise'], [10_000, 'rest'], [14_000, 'exercise'], [19_000, 'complete']] as const) {
      engine = transitionTimer(engine, { type: 'update', now });
      const result = selectWorkoutAlert(cursor, engine.state);
      expect(result.alert).toBe(alert);
      cursor = result.cursor;
    }
    expect(selectWorkoutAlert(cursor, engine.state).alert).toBeNull();
  });

  it('não repete após pausa, retomada ou replay do mesmo estado', () => {
    let engine = transitionTimer(started(), { type: 'update', now: 2_000 });
    const first = selectWorkoutAlert(initialAlertCursor(), engine.state);
    expect(first.alert).toBe('countdown');
    engine = transitionTimer(engine, { type: 'pause', now: 2_100 });
    const paused = selectWorkoutAlert(first.cursor, engine.state);
    expect(paused.alert).toBeNull();
    engine = transitionTimer(engine, { type: 'resume', now: 20_000 });
    expect(selectWorkoutAlert(paused.cursor, engine.state).alert).toBeNull();
  });

  it('atraso retorna apenas o segundo atual, sem fila de 3, 2 e 1', () => {
    const first = selectWorkoutAlert(initialAlertCursor(), started().state);
    const engine = transitionTimer(started(), { type: 'update', now: 4_500 });
    const result = selectWorkoutAlert(first.cursor, engine.state);
    expect(result.alert).toBe('countdown');
    expect(result.cursor.lowestSecond).toBe(1);
  });

  it('salto de várias fases retorna apenas a entrada na fase atual', () => {
    const first = selectWorkoutAlert(initialAlertCursor(), started().state);
    const engine = transitionTimer(started(), { type: 'update', now: 14_100 });
    const result = selectWorkoutAlert(first.cursor, engine.state);
    expect(result.alert).toBe('exercise');
    expect(selectWorkoutAlert(result.cursor, engine.state).alert).toBeNull();
  });

  it('next durante pausa só anuncia a nova fase ao retomar', () => {
    let engine = transitionTimer(started(), { type: 'pause', now: 1_000 });
    let cursor = selectWorkoutAlert(initialAlertCursor(), engine.state).cursor;
    engine = transitionTimer(engine, { type: 'next', now: 2_000 });
    const skipped = selectWorkoutAlert(cursor, engine.state);
    cursor = skipped.cursor;
    expect(skipped.alert).toBeNull();
    engine = transitionTimer(engine, { type: 'resume', now: 3_000 });
    expect(selectWorkoutAlert(cursor, engine.state).alert).toBe('exercise');
  });

  it('novo cursor permite sinais de uma nova execução sem reaproveitar bipes antigos', () => {
    const engine = transitionTimer(started(), { type: 'update', now: 2_000 });
    const first = selectWorkoutAlert(initialAlertCursor(), engine.state);
    expect(selectWorkoutAlert(first.cursor, engine.state).alert).toBeNull();
    expect(selectWorkoutAlert(initialAlertCursor(), engine.state).alert).toBe('countdown');
  });
});
