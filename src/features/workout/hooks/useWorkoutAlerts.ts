import { useEffect, useRef } from 'react';
import { initialAlertCursor, selectWorkoutAlert } from '../browser/workoutAlerts';
import type { WorkoutAudio } from '../browser/workoutAudio';
import type { TimerState } from '../domain/timerEngine';

export function useWorkoutAlerts(state: TimerState, audio: WorkoutAudio, enabled: boolean, epoch: number): void {
  const memory = useRef({ epoch, cursor: initialAlertCursor() });
  useEffect(() => {
    if (memory.current.epoch !== epoch) memory.current = { epoch, cursor: initialAlertCursor() };
    // Resume may finish after the initiating gesture. Wait for a current cue,
    // without queuing any missed seconds or phases while audio is unavailable.
    if (enabled && state.status === 'running' && document.visibilityState === 'visible' && !audio.isReady()) return;
    const result = selectWorkoutAlert(memory.current.cursor, state);
    // Consume events even while muted/hidden; enabling sound never plays old cues.
    memory.current.cursor = result.cursor;
    if (!enabled || state.status === 'paused' || state.status === 'idle') audio.stop();
    if (enabled && document.visibilityState === 'visible' && result.alert) audio.play(result.alert);
  }, [state, audio, enabled, epoch]);
  useEffect(() => {
    const hidden = () => { if (document.visibilityState !== 'visible') audio.stop(); };
    document.addEventListener('visibilitychange', hidden);
    return () => { document.removeEventListener('visibilitychange', hidden); audio.stop(); };
  }, [audio]);
}
