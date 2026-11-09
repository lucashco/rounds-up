import { useEffect, useRef } from 'react';
import type { useSavedWorkouts } from '../hooks/useSavedWorkouts';

export function SavedWorkouts({ library, onLoad }: { library: ReturnType<typeof useSavedWorkouts>; onLoad: (name: string) => void }) {
  const confirmation = useRef<HTMLDivElement>(null);
  useEffect(() => { if (library.pending) confirmation.current?.focus(); }, [library.pending]);
  return <section aria-label="Treinos salvos" className="mb-6 rounded-2xl border border-white/10 bg-white/[0.025] p-4 sm:p-5">
    <details>
      <summary className="min-h-11 cursor-pointer content-center font-semibold">Treinos salvos <span className="ml-2 text-sm text-stone-400">({library.workouts.length})</span></summary>
      {!library.ready ? <p className="py-3 text-sm text-stone-400">Carregando treinos…</p> : library.workouts.length === 0 ? <p className="py-3 text-sm text-stone-400">Salve um treino para reutilizá-lo neste dispositivo.</p> :
        <ul className="mt-3 space-y-3">{library.workouts.map(workout => <li key={workout.name} className="flex flex-wrap items-center gap-3 border-t border-white/10 pt-3">
          <span className="min-w-0 flex-1 break-words text-sm">{workout.name} <span className="text-xs text-stone-400">· {workout.config.mode}</span></span>
          <button type="button" className="min-h-11 rounded-lg border border-white/15 px-3 text-sm text-lime-300" aria-label={`Carregar ${workout.name}`} onClick={() => onLoad(workout.name)}>Carregar</button>
          <button type="button" className="min-h-11 rounded-lg px-3 text-sm text-rose-300" aria-label={`Excluir ${workout.name}`} onClick={() => library.remove(workout.name)}>Excluir</button>
        </li>)}</ul>}
    </details>
    {library.message && <p role="status" className="mt-3 text-sm text-stone-300">{library.message}</p>}
    {library.pending && <div ref={confirmation} tabIndex={-1} role="group" aria-label="Confirmar substituição de treino" className="mt-4 rounded-xl border border-amber-300/30 bg-amber-300/5 p-4">
      <p className="text-sm text-amber-200">{library.pending.message}</p>
      <div className="mt-3 flex flex-wrap gap-3">
        <button type="button" className="min-h-11 rounded-lg bg-lime-300 px-4 text-sm font-semibold text-stone-950" onClick={library.confirm}>Confirmar substituição</button>
        <button type="button" className="min-h-11 rounded-lg border border-white/15 px-4 text-sm" onClick={library.cancel}>Cancelar</button>
      </div>
    </div>}
  </section>;
}
