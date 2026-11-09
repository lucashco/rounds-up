import { useI18n } from '../../../i18n/I18nProvider';
import type { TimerState } from '../domain/timerEngine';
import type { WorkoutTimeline } from '../domain/types';
import { formatDuration, phaseLabel, totalProgressPercent } from './presentation';

type Props = { state: TimerState; timeline: WorkoutTimeline; rounds: number };

export function TimerDisplay({ state, timeline, rounds }: Props) {
  const { t, locale } = useI18n();
  const phase = state.currentPhase;
  const completed = state.status === 'completed';
  const nextPhase = state.phaseIndex === null ? null : timeline.phases[state.phaseIndex + 1];
  const round = phase && 'round' in phase ? phase.round : 1;
  const color = completed ? 'text-lime-300' : phase?.type === 'PREPARATION' ? 'text-amber-300'
    : phase?.type === 'REST_BETWEEN_EXERCISES' || phase?.type === 'REST_BETWEEN_ROUNDS' ? 'text-sky-300' : 'text-lime-300';
  const category = phase?.type === 'PREPARATION' ? t('getReady')
    : phase?.type === 'REST_BETWEEN_EXERCISES' || phase?.type === 'REST_BETWEEN_ROUNDS' ? t('recover') : t('move');
  const phaseProgress = phase ? state.phaseElapsedMs / phase.durationMs * 100 : completed ? 100 : 0;
  const totalProgress = totalProgressPercent(state, timeline.totalDurationMs);

  return <div>
    {completed ? <div className="py-8 text-center">
      <span aria-hidden="true" className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-lime-300/30 bg-lime-300/10 text-4xl text-lime-300">✓</span>
      <h2 className="mt-6 text-4xl font-bold tracking-tight">{t('completedTitle')}</h2>
      <p className="mt-3 text-stone-400">{t('completedHint')}</p>
      <p className="mt-6 text-sm text-stone-400">{t('activeTime')} <span className="ml-2 font-semibold text-stone-100 tabular-nums">{formatDuration(state.totalElapsedMs)}</span></p>
    </div> : <>
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <span className={`rounded-full border border-current/25 px-3 py-1.5 ${color}`}>{category}</span>
        <span className="text-stone-400">{t('round')} <strong className="text-stone-100">{new Intl.NumberFormat(locale).format(round)}</strong> / {new Intl.NumberFormat(locale).format(rounds)}</span>
      </div>
      <div className="timer-face">
        <p className="session-status">{state.status === 'paused' ? t('paused') : state.status === 'idle' ? t('ready') : t('running')}</p>
        <h2 className="mt-3 break-words text-xl font-semibold sm:text-2xl">{phase ? phaseLabel(phase, locale) : t('readyToStart')}</h2>
        <p role="timer" aria-label={t('phaseRemaining')} aria-live="off" className={`timer-digits ${color}`}>
          {formatDuration(state.phaseRemainingMs)}
        </p>
      </div>
      <div className={color}>
        <div className="mb-2 flex justify-between text-xs"><span className="text-stone-400">{t('phaseProgress')}</span><span>{Math.floor(phaseProgress)}%</span></div>
        <progress className="workout-progress h-2 w-full" aria-label={t('phaseProgress')} max={100} value={phaseProgress} />
      </div>
      <div className="next-phase">
        <div className="min-w-0"><p className="text-xs text-stone-400">{t('upNext')}</p><p className="mt-1 truncate text-sm font-medium">{nextPhase ? phaseLabel(nextPhase, locale) : t('completed')}</p></div>
        <span className="shrink-0 text-sm text-stone-400 tabular-nums">{nextPhase ? formatDuration(nextPhase.durationMs) : '✓'}</span>
      </div>
    </>}
    <div className="mt-6 border-t border-white/10 pt-5">
      <div className="mb-3 flex justify-between gap-4 text-sm"><span className="text-stone-400">{t('totalProgress')}</span><span className="font-medium tabular-nums">{Math.floor(totalProgress)}%</span></div>
      <progress className="workout-progress h-1.5 w-full text-lime-300" aria-label={t('totalProgress')} max={100} value={totalProgress} />
      <p className="mt-2 text-xs text-stone-400">{t('skippedHint')}</p>
      <p className="mt-3 text-right text-sm text-stone-400">{t('estimatedRemaining')} <span className="ml-2 font-semibold text-stone-100 tabular-nums" data-testid="total-remaining">{formatDuration(state.totalRemainingMs)}</span></p>
    </div>
  </div>;
}
