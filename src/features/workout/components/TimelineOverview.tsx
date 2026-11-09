import { useI18n } from '../../../i18n/I18nProvider';
import type { WorkoutTimeline } from '../domain/types';
import { formatDuration, phaseLabel } from './presentation';

export function TimelineOverview({ timeline }: { timeline: WorkoutTimeline }) {
  const { t, locale, count } = useI18n();
  return <details className="timeline-overview">
    <summary className="min-h-11 cursor-pointer content-center font-medium text-stone-300">{count('phases', timeline.phases.length)}</summary>
    <ol className="mt-3 max-h-80 space-y-3 overflow-y-auto pr-2" aria-label={t('timeline')}>
      {timeline.phases.map((phase, index) => <li key={index} className="flex items-start justify-between gap-3 border-t border-white/5 pt-3">
        <div className="min-w-0"><span className="block break-words">{phaseLabel(phase, locale)}</span><span className="text-xs text-stone-400">{'round' in phase ? t('roundNumber', { round: phase.round }) : t('beforeRound')}</span></div>
        <span className="shrink-0 text-stone-400 tabular-nums">{formatDuration(phase.durationMs)}</span>
      </li>)}
    </ol>
  </details>;
}
