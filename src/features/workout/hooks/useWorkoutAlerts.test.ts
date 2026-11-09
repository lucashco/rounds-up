// @vitest-environment jsdom
import { act, createElement, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { buildTimeline } from '../domain/buildTimeline';
import { createTimerEngine, transitionTimer } from '../domain/timerEngine';
import type { TimerState } from '../domain/timerEngine';
import { useWorkoutAlerts } from './useWorkoutAlerts';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

describe('alert hook lifecycle', () => {
  it('Strict Mode, rerenders, pausa e retomada não duplicam sinais; mute e aba oculta não acumulam alertas', async () => {
    const audio = { isReady: vi.fn(() => true), unlock: vi.fn(async () => true), play: vi.fn(), stop: vi.fn(), close: vi.fn() };
    const timeline = buildTimeline({ mode: 'FREE', rounds: 2, roundDurationMs: 4_000, restBetweenRoundsMs: 1_000 });
    let engine = createTimerEngine(timeline);
    let visible = true;
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => visible ? 'visible' : 'hidden' });
    const container = document.createElement('div');
    const root = createRoot(container);
    function Consumer({ state, enabled, epoch }: { state: TimerState; enabled: boolean; epoch: number }) {
      useWorkoutAlerts(state, audio, enabled, epoch);
      return null;
    }
    const render = async (enabled = true, epoch = 0) => {
      await act(async () => root.render(createElement(StrictMode, null, createElement(Consumer, { state: { ...engine.state }, enabled, epoch }))));
    };
    try {
      await render();
      expect(audio.play).not.toHaveBeenCalled();
      audio.isReady.mockReturnValue(false);
      engine = transitionTimer(engine, { type: 'start', now: 0 });
      await render();
      expect(audio.play).not.toHaveBeenCalled();
      audio.isReady.mockReturnValue(true);
      await render(); await render();
      expect(audio.play.mock.calls.map(([alert]) => alert)).toEqual(['exercise']);
      engine = transitionTimer(engine, { type: 'update', now: 1_000 }); await render();
      engine = transitionTimer(engine, { type: 'pause', now: 1_000 }); await render();
      engine = transitionTimer(engine, { type: 'resume', now: 10_000 }); await render();
      expect(audio.play.mock.calls.map(([alert]) => alert)).toEqual(['exercise', 'countdown']);
      engine = transitionTimer(engine, { type: 'update', now: 11_000 }); await render(false);
      await render(true);
      expect(audio.play).toHaveBeenCalledTimes(2);
      engine = transitionTimer(engine, { type: 'next', now: 11_000 }); await render();
      expect(audio.play).toHaveBeenLastCalledWith('rest');
      visible = false;
      document.dispatchEvent(new Event('visibilitychange'));
      engine = transitionTimer(engine, { type: 'update', now: 12_000 }); await render();
      const beforeVisible = audio.play.mock.calls.length;
      visible = true; await render();
      expect(audio.play).toHaveBeenCalledTimes(beforeVisible);
      engine = transitionTimer(engine, { type: 'reset' });
      engine = transitionTimer(engine, { type: 'start', now: 20_000 }); await render(true, 1);
      expect(audio.play).toHaveBeenLastCalledWith('exercise');
      expect(audio.play).toHaveBeenCalledTimes(beforeVisible + 1);
    } finally {
      await act(async () => root.unmount());
      Reflect.deleteProperty(document, 'visibilityState');
    }
  });
});
