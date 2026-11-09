import type { WorkoutTimeline } from '../domain/types';
import { formatDuration, phaseLabel } from './presentation';

export function TimelineOverview({ timeline }: { timeline: WorkoutTimeline }) {
  return <details className="my-5 rounded-xl border border-white/10 p-3 text-sm">
    <summary className="min-h-11 cursor-pointer content-center font-medium text-stone-300">Ver timeline completa ({timeline.phases.length} fases)</summary>
    <ol className="mt-3 max-h-80 space-y-3 overflow-y-auto pr-2" aria-label="Timeline completa">
      {timeline.phases.map((phase, index) => <li key={index} className="flex items-start justify-between gap-3 border-t border-white/5 pt-3">
        <div className="min-w-0"><span className="block break-words">{phaseLabel(phase)}</span><span className="text-xs text-stone-400">{'round' in phase ? `Round ${phase.round}` : 'Antes do round 1'}</span></div>
        <span className="shrink-0 text-stone-400 tabular-nums">{formatDuration(phase.durationMs)}</span>
      </li>)}
    </ol>
  </details>;
}
