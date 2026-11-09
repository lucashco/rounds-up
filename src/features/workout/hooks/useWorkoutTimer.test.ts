import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { buildTimeline } from '../domain/buildTimeline';
import { useWorkoutTimer } from './useWorkoutTimer';
import type { WorkoutTimeline } from '../domain/types';

function ServerConsumer({ timeline }: { timeline: WorkoutTimeline }) {
  // React's server renderer may read its own clock before calling the consumer.
  const clock = vi.spyOn(performance, 'now');
  const callsBeforeHook = clock.mock.calls.length;
  const timer = useWorkoutTimer(timeline);
  expect(clock.mock.calls.length).toBe(callsBeforeHook);
  expect(timer.start).toBeTypeOf('function');
  expect(timer.pause).toBeTypeOf('function');
  expect(timer.resume).toBeTypeOf('function');
  expect(timer.next).toBeTypeOf('function');
  expect(timer.reset).toBeTypeOf('function');
  return JSON.stringify(timer.state);
}

describe('useWorkoutTimer SSR', () => {
  it('inicializa sem ler relógio nem agendar intervalos no servidor', () => {
    const interval = vi.spyOn(globalThis, 'setInterval');
    const timeline = buildTimeline({ mode: 'FREE', rounds: 1, roundDurationMs: 1_000 });
    const html = renderToString(createElement(ServerConsumer, { timeline }));
    expect(html).toContain('&quot;status&quot;:&quot;idle&quot;');
    expect(html).toContain('&quot;totalRemainingMs&quot;:1000');
    expect(interval).not.toHaveBeenCalled();
  });

  it('aceita timeline vazia sem fase atual durante SSR', () => {
    const html = renderToString(createElement(ServerConsumer, {
      timeline: { phases: [], totalDurationMs: 0 },
    }));
    expect(html).toContain('&quot;currentPhase&quot;:null');
    expect(html).toContain('&quot;totalRemainingMs&quot;:0');
  });
});
