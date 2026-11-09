import { useCallback, useEffect, useReducer } from 'react';
import { createTimerEngine, transitionTimer } from '../domain/timerEngine';
import type { TimerState } from '../domain/timerEngine';
import type { WorkoutTimeline } from '../domain/types';

export type WorkoutTimer = Readonly<{
  state: TimerState;
  start: () => void;
  pause: () => void;
  resume: () => void;
  next: () => void;
  reset: () => void;
}>;

/**
 * Owns one workout session from initialTimeline. To load a different timeline,
 * remount the consumer with a new key. Reset reuses the initial timeline.
 * No browser or clock APIs are accessed during rendering/SSR.
 */
export function useWorkoutTimer(initialTimeline: WorkoutTimeline): WorkoutTimer {
  const [engine, dispatch] = useReducer(transitionTimer, initialTimeline, createTimerEngine);
  const start = useCallback(() => dispatch({ type: 'start', now: performance.now() }), []);
  const pause = useCallback(() => dispatch({ type: 'pause', now: performance.now() }), []);
  const resume = useCallback(() => dispatch({ type: 'resume', now: performance.now() }), []);
  const next = useCallback(() => dispatch({ type: 'next', now: performance.now() }), []);
  const reset = useCallback(() => dispatch({ type: 'reset' }), []);

  useEffect(() => {
    if (engine.state.status !== 'running') return;
    const interval = setInterval(() => {
      dispatch({ type: 'update', now: performance.now() });
    }, 50);
    return () => clearInterval(interval);
  }, [engine.state.status]);

  return { state: engine.state, start, pause, resume, next, reset };
}
