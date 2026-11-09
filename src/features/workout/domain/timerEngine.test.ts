import { describe, expect, it } from 'vitest';
import { buildTimeline } from './buildTimeline';
import { createTimerEngine, TimerEngineError, transitionTimer } from './timerEngine';
import type { TimerCommand, TimerEngine } from './timerEngine';

const timeline = buildTimeline({
  mode: 'FREE', rounds: 2, preparationMs: 100, roundDurationMs: 1_000, restBetweenRoundsMs: 200,
});
const initial = () => createTimerEngine(timeline);
const run = (engine: TimerEngine, ...commands: TimerCommand[]) => commands.reduce(transitionTimer, engine);
const started = () => transitionTimer(initial(), { type: 'start', now: 100 });

function expectTiming(engine: TimerEngine, elapsed: number, remaining: number): void {
  expect(engine.state.totalElapsedMs).toBe(elapsed);
  expect(engine.state.totalRemainingMs).toBe(remaining);
  expect(engine.state.phaseElapsedMs).toBeGreaterThanOrEqual(0);
  expect(engine.state.phaseRemainingMs).toBeGreaterThanOrEqual(0);
}

describe('timerEngine', () => {
  it('começa idle na primeira fase e inicia sem consumir o timestamp inicial', () => {
    expect(initial().state).toEqual({
      status: 'idle', phaseIndex: 0, currentPhase: timeline.phases[0],
      phaseElapsedMs: 0, phaseRemainingMs: 100, totalElapsedMs: 0, totalRemainingMs: 2_300,
    });
    expect(started().state.status).toBe('running');
    expectTiming(started(), 0, 2_300);
  });

  it('atualiza progresso antes de pausar e preserva exatamente o tempo', () => {
    const paused = transitionTimer(started(), { type: 'pause', now: 150.5 });
    expect(paused.state.status).toBe('paused');
    expect(paused.state.phaseElapsedMs).toBe(50.5);
    expectTiming(paused, 50.5, 2_249.5);
    expect(transitionTimer(paused, { type: 'update', now: 10_000 }).state).toEqual(paused.state);
  });

  it('retoma sem contar o período pausado', () => {
    const engine = run(started(),
      { type: 'pause', now: 150 }, { type: 'resume', now: 5_000 }, { type: 'update', now: 5_025 });
    expect(engine.state.status).toBe('running');
    expect(engine.state.phaseElapsedMs).toBe(75);
    expectTiming(engine, 75, 2_225);
  });

  it.each([199, 200, 201, 1_200, 1_400, 2_399, 2_400])('trata a fronteira em now=%i', now => {
    const engine = transitionTimer(started(), { type: 'update', now });
    const elapsed = now - 100;
    expectTiming(engine, elapsed, 2_300 - elapsed);
    const expectedIndex = elapsed < 100 ? 0 : elapsed < 1_100 ? 1 : elapsed < 1_300 ? 2 : elapsed < 2_300 ? 3 : null;
    expect(engine.state.phaseIndex).toBe(expectedIndex);
    if (expectedIndex !== null) {
      expect(engine.state.phaseElapsedMs).toBe(elapsed - timeline.phases[expectedIndex]!.startMs);
    } else {
      expect(engine.state.status).toBe('completed');
      expect(engine.state.currentPhase).toBeNull();
    }
  });

  it('atravessa múltiplas fases em uma atualização atrasada', () => {
    const engine = transitionTimer(started(), { type: 'update', now: 1_500 });
    expect(engine.state.phaseIndex).toBe(3);
    expect(engine.state.phaseElapsedMs).toBe(100);
    expectTiming(engine, 1_400, 900);
  });

  it('limita o tempo à conclusão mesmo com grande atraso', () => {
    const engine = transitionTimer(started(), { type: 'update', now: 100_000 });
    expect(engine.state.status).toBe('completed');
    expectTiming(engine, 2_300, 0);
    expect(engine.state.phaseElapsedMs).toBe(0);
    expect(engine.state.phaseRemainingMs).toBe(0);
  });

  it('next desconta o trecho pulado sem contá-lo como tempo treinado', () => {
    const engine = transitionTimer(started(), { type: 'next', now: 140 });
    expect(engine.state.phaseIndex).toBe(1);
    expect(engine.state.phaseElapsedMs).toBe(0);
    expect(engine.skippedDurationMs).toBe(60);
    expectTiming(engine, 40, 2_200);
    expectTiming(transitionTimer(engine, { type: 'update', now: 240 }), 140, 2_100);
  });

  it('next pula descanso e continua na próxima fase', () => {
    const engine = run(started(), { type: 'update', now: 1_250 }, { type: 'next', now: 1_300 });
    expect(engine.state.phaseIndex).toBe(3);
    expect(engine.state.status).toBe('running');
    expectTiming(engine, 1_200, 1_000);
  });

  it('next durante pausa preserva a pausa e não consome tempo pausado', () => {
    const engine = run(started(), { type: 'pause', now: 150 }, { type: 'next', now: 5_000 });
    expect(engine.state.status).toBe('paused');
    expect(engine.state.phaseIndex).toBe(1);
    expectTiming(engine, 50, 2_200);
    const resumed = run(engine, { type: 'resume', now: 10_000 }, { type: 'update', now: 10_100 });
    expect(resumed.state.phaseElapsedMs).toBe(100);
    expectTiming(resumed, 150, 2_100);
  });

  it('next sincroniza antes de pular a fase vigente, inclusive numa fronteira', () => {
    const engine = transitionTimer(started(), { type: 'next', now: 200 });
    expect(engine.state.phaseIndex).toBe(2);
    expectTiming(engine, 100, 1_200);
    const delayed = transitionTimer(started(), { type: 'next', now: 1_500 });
    expect(delayed.state.status).toBe('completed');
    expectTiming(delayed, 1_400, 0);
  });

  it('next na última fase conclui e remove todo o restante', () => {
    const engine = createTimerEngine(buildTimeline({ mode: 'FREE', rounds: 1, roundDurationMs: 1_000 }));
    const completed = run(engine, { type: 'start', now: 0 }, { type: 'next', now: 50 });
    expect(completed.state.status).toBe('completed');
    expect(completed.state.currentPhase).toBeNull();
    expectTiming(completed, 50, 0);
    expect(completed.skippedDurationMs).toBe(950);
  });

  it('conclusão automática após next exclui o trecho pulado do tempo decorrido', () => {
    const engine = run(started(), { type: 'next', now: 150 }, { type: 'update', now: 100_000 });
    expect(engine.state.status).toBe('completed');
    expectTiming(engine, 2_250, 0);
    expect(engine.skippedDurationMs).toBe(50);
  });

  it('next na última fase pausada também conclui', () => {
    const engine = run(started(), { type: 'pause', now: 1_500 }, { type: 'next', now: 10_000 });
    expect(engine.state.status).toBe('completed');
    expectTiming(engine, 1_400, 0);
  });

  it('o resultado independe da frequência das atualizações', () => {
    const delayed = transitionTimer(started(), { type: 'update', now: 1_600 });
    const frequent = run(started(), { type: 'update', now: 150 }, { type: 'update', now: 800 },
      { type: 'update', now: 1_250 }, { type: 'update', now: 1_600 });
    expect(frequent).toEqual(delayed);
  });

  it('next repetido pula uma fase por comando, mesmo no mesmo timestamp', () => {
    const engine = run(started(), { type: 'next', now: 100 }, { type: 'next', now: 100 },
      { type: 'next', now: 100 }, { type: 'next', now: 100 });
    expect(engine.state.status).toBe('completed');
    expectTiming(engine, 0, 0);
  });

  it('comandos incompatíveis em idle não iniciam o treino', () => {
    const engine = run(initial(), { type: 'pause', now: 0 }, { type: 'resume', now: 1 },
      { type: 'next', now: 2 }, { type: 'update', now: 3 });
    expect(engine.state).toEqual(initial().state);
  });

  it('start e resume em running sincronizam sem reiniciar', () => {
    const engine = run(started(), { type: 'start', now: 150 }, { type: 'resume', now: 170 });
    expect(engine.state.status).toBe('running');
    expectTiming(engine, 70, 2_230);
  });

  it('pause repetido e start em paused não retomam nem perdem progresso', () => {
    const engine = run(started(), { type: 'pause', now: 150 }, { type: 'pause', now: 500 }, { type: 'start', now: 600 });
    expect(engine.state.status).toBe('paused');
    expectTiming(engine, 50, 2_250);
  });

  it('comandos após completed são estáveis', () => {
    const engine = transitionTimer(started(), { type: 'update', now: 3_000 });
    for (const type of ['start', 'pause', 'resume', 'next', 'update'] as const) {
      expect(transitionTimer(engine, { type, now: 4_000 }).state).toEqual(engine.state);
    }
  });

  it('pause no fim natural resulta em completed', () => {
    expect(transitionTimer(started(), { type: 'pause', now: 2_400 }).state.status).toBe('completed');
  });

  it.each(['idle', 'running', 'paused', 'completed'] as const)('reset de %s zera progresso, skips e época', status => {
    let engine = initial();
    if (status !== 'idle') engine = started();
    if (status === 'paused') engine = transitionTimer(engine, { type: 'pause', now: 150 });
    if (status === 'completed') engine = transitionTimer(engine, { type: 'update', now: 2_400 });
    engine = transitionTimer(engine, { type: 'reset' });
    expect(engine).toEqual(initial());
    expect(transitionTimer(engine, { type: 'start', now: 0 }).state.status).toBe('running');
  });

  it('reset restaura tempo pulado', () => {
    const engine = transitionTimer(started(), { type: 'next', now: 150 });
    expect(transitionTimer(engine, { type: 'reset' })).toEqual(initial());
  });

  it('timeline vazia inicia concluída e pode ser resetada', () => {
    const empty = createTimerEngine({ phases: [], totalDurationMs: 0 });
    expect(empty.state.status).toBe('idle');
    expect(empty.state.phaseIndex).toBeNull();
    expectTiming(empty, 0, 0);
    const completed = transitionTimer(empty, { type: 'start', now: 0 });
    expect(completed.state.status).toBe('completed');
    expect(transitionTimer(completed, { type: 'reset' })).toEqual(empty);
  });

  it.each([NaN, Infinity, -Infinity, -1, Number.MAX_SAFE_INTEGER + 1])('rejeita timestamp inválido %s em todos os comandos', now => {
    for (const type of ['start', 'pause', 'resume', 'next', 'update'] as const) {
      expect(() => transitionTimer(initial(), { type, now })).toThrow(TimerEngineError);
    }
  });

  it('rejeita regressão mesmo durante pausa e aceita timestamps iguais', () => {
    const paused = transitionTimer(started(), { type: 'pause', now: 200 });
    expect(() => transitionTimer(paused, { type: 'resume', now: 199 })).toThrow('monotônico');
    expect(transitionTimer(paused, { type: 'resume', now: 200 }).state.status).toBe('running');
  });

  it('preserva a entrada e estados anteriores; alterações externas não afetam o motor', () => {
    const input = { phases: timeline.phases.map(phase => ({ ...phase })), totalDurationMs: timeline.totalDurationMs };
    const original = structuredClone(input);
    const engine = createTimerEngine(input);
    const before = structuredClone(engine);
    expect(run(engine, { type: 'start', now: 0 }, { type: 'next', now: 10 })).toEqual(
      run(engine, { type: 'start', now: 0 }, { type: 'next', now: 10 }));
    expect(engine).toEqual(before);
    expect(input).toEqual(original);
    expect(engine.timeline.phases[0]).not.toBe(input.phases[0]);
    expect(Object.isFrozen(engine.timeline.phases[0])).toBe(true);
    expect(Object.isFrozen(engine.state)).toBe(true);
    input.phases[0]!.durationMs = 999;
    input.phases.length = 0;
    expect(engine.timeline).toEqual(original);
  });

  it('recusa timelines com total divergente, duração zero ou offsets descontínuos', () => {
    expect(() => createTimerEngine({ ...timeline, totalDurationMs: NaN })).toThrow(TimerEngineError);
    expect(() => createTimerEngine({ ...timeline, totalDurationMs: 0 })).toThrow(TimerEngineError);
    expect(() => createTimerEngine({ phases: [{ ...timeline.phases[0]!, durationMs: 0 }], totalDurationMs: 100 })).toThrow(TimerEngineError);
    expect(() => createTimerEngine({ phases: [{ ...timeline.phases[0]!, startMs: 1 }], totalDurationMs: 100 })).toThrow(TimerEngineError);
  });

  it('mantém a identificação real de exercícios do modo guided', () => {
    const guided = buildTimeline({ mode: 'GUIDED', rounds: 1, exercises: [
      { type: 'TIMED', id: 'swing', name: 'Swing', durationMs: 100 },
      { type: 'TIMED', id: 'squat', name: 'Agachamento', durationMs: 200 },
    ] });
    const engine = run(createTimerEngine(guided), { type: 'start', now: 0 }, { type: 'update', now: 100 });
    expect(engine.state.currentPhase).toEqual(guided.phases[1]);
    expect(engine.state.currentPhase?.type).toBe('EXERCISE');
  });
});
