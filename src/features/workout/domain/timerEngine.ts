import type { WorkoutPhase, WorkoutTimeline } from './types';

export type TimerStatus = 'idle' | 'running' | 'paused' | 'completed';

export type TimerState = Readonly<{
  status: TimerStatus;
  /** Null when the timeline is empty or completed. */
  phaseIndex: number | null;
  currentPhase: WorkoutPhase | null;
  phaseElapsedMs: number;
  phaseRemainingMs: number;
  /** Actual active time; skipped time and paused time are excluded. */
  totalElapsedMs: number;
  totalRemainingMs: number;
}>;

export type TimerCommand =
  | Readonly<{ type: 'start' | 'pause' | 'resume' | 'next' | 'update'; now: number }>
  | Readonly<{ type: 'reset' }>;

/** Immutable engine value. Pass it back to transitionTimer for the next command. */
export type TimerEngine = Readonly<{
  timeline: WorkoutTimeline;
  state: TimerState;
  skippedDurationMs: number;
  lastTimestampMs: number | null;
}>;

export class TimerEngineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimerEngineError';
  }
}

function deriveState(
  timeline: WorkoutTimeline,
  status: TimerStatus,
  totalElapsedMs: number,
  skippedDurationMs: number,
): TimerState {
  const position = Math.min(timeline.totalDurationMs, totalElapsedMs + skippedDurationMs);
  const completed = status === 'completed';
  // Half-open intervals: at an exact boundary the next phase is current.
  let low = 0;
  let high = timeline.phases.length;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (timeline.phases[middle]!.endMs <= position) low = middle + 1;
    else high = middle;
  }
  const currentPhase = completed ? null : timeline.phases[low] ?? null;
  return Object.freeze({
    status,
    phaseIndex: currentPhase === null ? null : low,
    currentPhase,
    phaseElapsedMs: currentPhase ? Math.max(0, position - currentPhase.startMs) : 0,
    phaseRemainingMs: currentPhase ? Math.max(0, currentPhase.endMs - position) : 0,
    totalElapsedMs,
    totalRemainingMs: Math.max(0, timeline.totalDurationMs - position),
  });
}

function initialEngine(timeline: WorkoutTimeline): TimerEngine {
  return Object.freeze({
    timeline,
    state: deriveState(timeline, 'idle', 0, 0),
    skippedDurationMs: 0,
    lastTimestampMs: null,
  });
}

/** Copies and freezes the timeline; malformed timing contracts fail explicitly. */
export function createTimerEngine(timeline: WorkoutTimeline): TimerEngine {
  if (!Number.isFinite(timeline.totalDurationMs) || timeline.totalDurationMs < 0 ||
      timeline.totalDurationMs > Number.MAX_SAFE_INTEGER) {
    throw new TimerEngineError('timeline.totalDurationMs inválido');
  }
  let endMs = 0;
  const phases = timeline.phases.map((phase, index) => {
    if (!Number.isFinite(phase.durationMs) || phase.durationMs <= 0 ||
        phase.startMs !== endMs || !Number.isFinite(phase.endMs) ||
        phase.endMs !== phase.startMs + phase.durationMs || phase.endMs <= phase.startMs) {
      throw new TimerEngineError(`timeline.phases[${index}]: duração ou offsets inválidos`);
    }
    endMs = phase.endMs;
    return Object.freeze({ ...phase });
  });
  if (endMs !== timeline.totalDurationMs) {
    throw new TimerEngineError('timeline.totalDurationMs não corresponde às fases');
  }
  return initialEngine(Object.freeze({ phases: Object.freeze(phases), totalDurationMs: endMs }));
}

/**
 * Pure transition. Every timestamp must be finite, nonnegative, safe and >= the
 * previous timestamp (equal timestamps are accepted). Reset starts a new epoch.
 * Running time is synchronized before applying a command, including duplicates.
 * start only starts idle; resume only resumes paused; pause only pauses running.
 * next skips the synchronized current phase in running/paused, preserving pause.
 * Other incompatible commands are no-ops apart from time synchronization.
 */
export function transitionTimer(engine: TimerEngine, command: TimerCommand): TimerEngine {
  if (command.type === 'reset') return initialEngine(engine.timeline);
  const { now } = command;
  if (!Number.isFinite(now) || now < 0 || now > Number.MAX_SAFE_INTEGER ||
      (engine.lastTimestampMs !== null && now < engine.lastTimestampMs)) {
    throw new TimerEngineError('now deve ser um timestamp monotônico finito, não negativo e seguro');
  }

  let { status, totalElapsedMs } = engine.state;
  let skippedDurationMs = engine.skippedDurationMs;
  if (status === 'running' && engine.lastTimestampMs !== null) {
    totalElapsedMs += Math.min(now - engine.lastTimestampMs, engine.state.totalRemainingMs);
    if (totalElapsedMs + skippedDurationMs >= engine.timeline.totalDurationMs) status = 'completed';
  }

  if (command.type === 'start' && status === 'idle') {
    status = engine.timeline.phases.length === 0 ? 'completed' : 'running';
  } else if (command.type === 'pause' && status === 'running') {
    status = 'paused';
  } else if (command.type === 'resume' && status === 'paused') {
    status = 'running';
  } else if (command.type === 'next' && (status === 'running' || status === 'paused')) {
    const current = deriveState(engine.timeline, status, totalElapsedMs, skippedDurationMs);
    skippedDurationMs += current.phaseRemainingMs;
    if (totalElapsedMs + skippedDurationMs >= engine.timeline.totalDurationMs) status = 'completed';
  }

  return Object.freeze({
    timeline: engine.timeline,
    state: deriveState(engine.timeline, status, totalElapsedMs, skippedDurationMs),
    skippedDurationMs,
    lastTimestampMs: now,
  });
}
