import { useI18n } from '../../../i18n/I18nProvider';
import type { ReactNode } from 'react';
import type { WorkoutAudio } from '../browser/workoutAudio';
import { useWorkoutAlerts } from '../hooks/useWorkoutAlerts';
import { useScreenWakeLock } from '../hooks/useScreenWakeLock';
import { TimelineOverview } from './TimelineOverview';
import { useEffect, useRef, useState } from 'react';
import type { WorkoutSessionConfig } from '../form/workoutForm';
import { useWorkoutTimer } from '../hooks/useWorkoutTimer';
import { phaseLabel } from './presentation';
import { TimerControls } from './TimerControls';
import { WakeLockToggle } from './WakeLockToggle';
import { TimerDisplay } from './TimerDisplay';

type Props = { workout: WorkoutSessionConfig; onEdit: () => void; audio: WorkoutAudio; soundsEnabled: boolean; soundToggle: ReactNode; wakeLockEnabled: boolean; onWakeLockChange: (enabled: boolean) => void };

export function WorkoutSession({ workout, onEdit, audio, soundsEnabled, soundToggle, wakeLockEnabled, onWakeLockChange }: Props) {
  const { t, locale } = useI18n();
  const timer = useWorkoutTimer(workout.timeline);
  const [epoch, setEpoch] = useState(0);
  useWorkoutAlerts(timer.state, audio, soundsEnabled, epoch);
  const wakeLockStatus = useScreenWakeLock(timer.state.status === 'running', epoch, wakeLockEnabled);
  const interact = (command: () => void) => () => { if (soundsEnabled) void audio.unlock(); command(); };
  const restart = interact(() => { audio.stop(); setEpoch(value => value + 1); timer.reset(); timer.start(); });
  const heading = useRef<HTMLHeadingElement>(null);
  const { start, state } = timer;
  useEffect(() => { start(); heading.current?.focus(); }, [start]);
  useEffect(() => {
    if (state.status === 'completed') heading.current?.focus();
  }, [state.status]);

  const announcement = state.status === 'completed' ? t('completedAnnouncement')
    : `${state.status === 'paused' ? t('pausedAnnouncement') : ''}${t('roundAnnouncement', {
      phase: state.currentPhase ? phaseLabel(state.currentPhase, locale) : '',
      round: state.currentPhase && 'round' in state.currentPhase ? state.currentPhase.round : 1,
      total: workout.config.rounds,
    })}`;
  return <section className="workout-session" data-status={state.status}>
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm text-stone-400">{workout.config.mode} / {t('session')}</p>
        <h1 ref={heading} tabIndex={-1} className="mt-2 break-words text-2xl font-bold tracking-tight outline-none sm:text-3xl">{workout.name}</h1>
      </div>
      <button type="button" className="min-h-11 rounded-xl border border-white/10 px-4 text-sm text-stone-300 hover:bg-white/5" onClick={onEdit}>{t('endEdit')}</button>
    </div>
    <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">{announcement}</p>
    <div className="session-stage">
      <TimerDisplay state={state} timeline={workout.timeline} rounds={workout.config.rounds} />
      <TimerControls {...timer} start={interact(timer.start)} resume={interact(timer.resume)} next={interact(timer.next)} onRestart={restart} />
      <div className="mt-4 space-y-2">{soundToggle}<WakeLockToggle enabled={wakeLockEnabled} onChange={onWakeLockChange} status={wakeLockStatus} /></div>
      <TimelineOverview timeline={workout.timeline} />
    </div>
  </section>;
}
