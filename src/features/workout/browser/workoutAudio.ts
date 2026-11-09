import type { WorkoutAlert } from './workoutAlerts';

export type WorkoutAudio = ReturnType<typeof createWorkoutAudio>;

/** Creating the controller is SSR-safe; AudioContext is created only by unlock(). */
export function createWorkoutAudio() {
  let context: AudioContext | null = null;
  const sources = new Set<OscillatorNode>();
  const stop = () => {
    for (const source of sources) {
      try { source.stop(); } catch { /* Already ended. */ }
      source.disconnect();
    }
    sources.clear();
  };
  return {
    async unlock(): Promise<boolean> {
      try {
        if (typeof window === 'undefined' || !('AudioContext' in window)) return false;
        if (!context || context.state === 'closed') context = new AudioContext();
        if (context.state !== 'running') await context.resume();
        return context.state === 'running';
      } catch { return false; }
    },
    isReady(): boolean { return context?.state === 'running'; },
    play(alert: WorkoutAlert): void {
      if (!context || context.state !== 'running') return;
      stop();
      const notes = alert === 'complete' ? [660, 880, 1_100]
        : alert === 'exercise' ? [660, 880] : alert === 'rest' ? [330] : [1_000];
      try {
        const audio = context;
        notes.forEach((frequency, index) => {
          const source = audio.createOscillator();
          const gain = audio.createGain();
          const at = audio.currentTime + index * 0.13;
          source.type = 'sine';
          source.frequency.setValueAtTime(frequency, at);
          gain.gain.setValueAtTime(0, at);
          gain.gain.linearRampToValueAtTime(0.09, at + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.001, at + 0.10);
          source.connect(gain);
          gain.connect(audio.destination);
          sources.add(source);
          source.onended = () => { sources.delete(source); source.disconnect(); gain.disconnect(); };
          source.start(at);
          source.stop(at + 0.11);
        });
      } catch { stop(); }
    },
    stop,
    close(): void {
      stop();
      if (context) { void context.close().catch(() => {}); context = null; }
    },
  };
}
