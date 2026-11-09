import { DurationInput } from './DurationInput';
import { TimelineOverview } from './TimelineOverview';
import { useMemo, useRef, useState } from 'react';
import type { Dispatch, SetStateAction, ReactNode } from 'react';
import { appendExercise, moveExercise, prepareWorkout } from '../form/workoutForm';
import type { WorkoutDraft, WorkoutSessionConfig } from '../form/workoutForm';
import { fieldClass, formatDuration, phaseLabel, primaryButton } from './presentation';

type Props = {
  draft: WorkoutDraft;
  onChange: Dispatch<SetStateAction<WorkoutDraft>>;
  onStart: (workout: WorkoutSessionConfig) => void;
  onSave?: (workout: WorkoutSessionConfig) => void;
  library?: ReactNode;
  soundToggle?: ReactNode;
};

type NumberFieldProps = {
  id: string; label: string; value: string; onChange: (value: string) => void;
  min?: number; max?: number; integer?: boolean; invalid?: boolean;
};

function NumberField({ id, label, value, onChange, min = 0, max, integer, invalid }: NumberFieldProps) {
  return <label htmlFor={id} className="block min-w-0 text-sm font-medium text-stone-300">
    {label}
    <input id={id} type="number" inputMode={integer ? 'numeric' : 'decimal'} min={min} max={max}
      step={integer ? 1 : 'any'} value={value} onChange={event => onChange(event.target.value)}
      aria-invalid={invalid || undefined} aria-describedby={invalid ? 'workout-error' : undefined}
      className={`${fieldClass} tabular-nums`} />
  </label>;
}

export function WorkoutBuilder({ draft, onChange, onStart, onSave, library, soundToggle }: Props) {
  const [submitted, setSubmitted] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);
  const result = useMemo(() => prepareWorkout(draft), [draft]);
  const error = submitted && !result.ok ? result : null;
  function setField<Key extends keyof WorkoutDraft>(key: Key, value: WorkoutDraft[Key]) {
    onChange(previous => ({ ...previous, [key]: value }));
  }
  const invalid = (field: string) => error?.field === field;

  return <>
    <div className="builder-heading">
      <div><h1 tabIndex={-1} className="outline-none">Configure seu treino.</h1>
      <p>Escolha o ritmo. O próximo round é seu.</p></div>
    </div>
    {library}
    <form noValidate onSubmit={event => {
      event.preventDefault();
      setSubmitted(true);
      if (result.ok) onStart(result.workout);
      else requestAnimationFrame(() => errorRef.current?.focus());
    }} className="workout-builder">
      <div className="space-y-6">
        <section className="builder-section" aria-labelledby="workout-settings">
          <h2 id="workout-settings" className="mb-6 text-lg font-semibold">Seu treino</h2>
          <fieldset>
            <legend className="mb-3 text-sm font-medium text-stone-300">Modo de treino</legend>
            <div className="grid grid-cols-2 gap-3">
              {(['FREE', 'GUIDED'] as const).map(mode => <label key={mode} className="relative cursor-pointer">
                <input className="peer sr-only" type="radio" name="mode" value={mode} checked={draft.mode === mode}
                  onChange={() => setField('mode', mode)} />
                <span className="mode-option">
                  <span className="block text-sm font-bold tracking-wide">{mode}</span>
                  <span className="mt-1 block text-xs text-stone-400">{mode === 'FREE' ? 'Rounds no seu ritmo' : 'Circuito de exercícios'}</span>
                </span>
              </label>)}
            </div>
          </fieldset>
          <label htmlFor="workout-name" className="mt-6 block text-sm font-medium text-stone-300">Nome do treino
            <input id="workout-name" value={draft.name} onChange={event => setField('name', event.target.value)}
              maxLength={120} autoComplete="off" className={fieldClass} aria-invalid={invalid('name') || undefined}
              aria-describedby={invalid('name') ? 'workout-error' : undefined} />
          </label>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <NumberField id="rounds" label="Quantidade de rounds" value={draft.rounds} min={1} max={100} integer
              onChange={value => setField('rounds', value)} invalid={invalid('rounds')} />
            <DurationInput id="preparation" label="Preparação inicial" value={draft.preparationSeconds}
              onChange={value => setField('preparationSeconds', value)} invalid={invalid('preparationMs')} />
            <DurationInput id="round-rest" label="Descanso entre rounds" value={draft.restBetweenRoundsSeconds}
              onChange={value => setField('restBetweenRoundsSeconds', value)} invalid={invalid('restBetweenRoundsMs')} />
            {draft.mode === 'FREE' && <DurationInput id="round-duration" label="Duração do round" allowZero={false}
              value={draft.roundSeconds} onChange={value => setField('roundSeconds', value)} invalid={invalid('roundDurationMs')} />}
          </div>
          <p className="mt-5 text-xs leading-relaxed text-stone-400">Defina minutos e segundos (0–59). Use 0 ou deixe em branco para pular a preparação ou os descansos.</p>
        </section>
        {draft.mode === 'GUIDED' && <section className="builder-section" aria-labelledby="circuit-title">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h2 id="circuit-title" className="text-lg font-semibold">Seu circuito</h2>
            <span className="text-xs text-stone-400">{draft.exercises.length} / 50</span>
          </div>
          <p className="mb-6 text-sm text-stone-400">A mesma sequência se repete em cada round.</p>
          <ol className="space-y-4" aria-label="Exercícios do circuito">
            {draft.exercises.map((exercise, index) => <li key={exercise.id} className="exercise-row">
              <fieldset>
                <legend className="px-1 text-sm font-semibold text-stone-300">Exercício {index + 1}</legend>
                <div className="mt-2 grid min-w-0 gap-4 sm:grid-cols-[1fr_12rem]">
                  <label htmlFor={`${exercise.id}-name`} className="min-w-0 text-sm text-stone-300">Nome do exercício {index + 1}
                    <input id={`${exercise.id}-name`} value={exercise.name} maxLength={100} className={fieldClass}
                      aria-invalid={invalid(`exercises[${index}].name`) || undefined}
                      aria-describedby={invalid(`exercises[${index}].name`) ? 'workout-error' : undefined}
                      onChange={event => setField('exercises', draft.exercises.map(item => item.id === exercise.id ? { ...item, name: event.target.value } : item))} />
                  </label>
                  <DurationInput id={`${exercise.id}-duration`} label={`Duração ${index + 1}`} allowZero={false} value={exercise.seconds}
                    invalid={invalid(`exercises[${index}].durationMs`)}
                    onChange={value => setField('exercises', draft.exercises.map(item => item.id === exercise.id ? { ...item, seconds: value } : item))} />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" className="min-h-11 rounded-lg border border-white/10 px-3 text-sm hover:bg-white/10 disabled:opacity-30"
                    disabled={index === 0} aria-label={`Mover exercício ${index + 1} para cima`} onClick={() => onChange(previous => moveExercise(previous, index, -1))}>↑ Subir</button>
                  <button type="button" className="min-h-11 rounded-lg border border-white/10 px-3 text-sm hover:bg-white/10 disabled:opacity-30"
                    disabled={index === draft.exercises.length - 1} aria-label={`Mover exercício ${index + 1} para baixo`} onClick={() => onChange(previous => moveExercise(previous, index, 1))}>↓ Descer</button>
                  <button type="button" className="ml-auto min-h-11 rounded-lg px-3 text-sm text-rose-300 hover:bg-rose-300/10"
                    aria-label={`Remover exercício ${index + 1}`} onClick={() => setField('exercises', draft.exercises.filter(item => item.id !== exercise.id))}>Remover</button>
                </div>
              </fieldset>
            </li>)}
          </ol>
          {draft.exercises.length === 0 && <p className="py-4 text-sm text-stone-400">Seu circuito está vazio. Adicione o primeiro exercício.</p>}
          <button type="button" disabled={draft.exercises.length >= 50}
            className="mt-4 min-h-12 w-full rounded-xl border border-dashed border-lime-300/40 px-4 text-sm font-semibold text-lime-300 hover:bg-lime-300/5 disabled:opacity-40"
            onClick={() => onChange(appendExercise)}>+ Adicionar exercício</button>
          <div className="mt-6">
            <DurationInput id="exercise-rest" label="Descanso entre exercícios (opcional)" value={draft.restBetweenExercisesSeconds}
              onChange={value => setField('restBetweenExercisesSeconds', value)} invalid={invalid('restBetweenExercisesMs')} />
          </div>
        </section>}
      </div>
      <aside className="workout-preview" aria-labelledby="summary-title">
        <p id="summary-title" className="text-lg font-semibold">Preview do treino</p>
        <p className="mt-6 text-sm text-stone-400">Duração total estimada</p>
        <p className="mt-1 text-6xl font-semibold tracking-tighter tabular-nums" data-testid="estimated-duration">{result.ok ? formatDuration(result.workout.timeline.totalDurationMs) : '—'}</p>
        <div className="my-7 grid grid-cols-2 gap-4 border-y border-white/10 py-5">
          <div><p className="text-xs text-stone-400">Modo</p><p className="mt-1 font-semibold">{draft.mode}</p></div>
          <div><p className="text-xs text-stone-400">Rounds</p><p className="mt-1 font-semibold">{draft.rounds || '—'}</p></div>
        </div>
        {result.ok ? <>
          <p className="mb-3 text-sm font-medium text-stone-400">Como começa</p>
          <ol className="mb-7 space-y-3 text-sm">
            {result.workout.timeline.phases.slice(0, 4).map((phase, index) => <li key={index} className="flex items-center justify-between gap-3">
              <span className="min-w-0 truncate"><span className="mr-2 text-stone-400">{String(index + 1).padStart(2, '0')}</span>{phaseLabel(phase)}</span>
              <span className="shrink-0 text-stone-400 tabular-nums">{formatDuration(phase.durationMs)}</span>
            </li>)}
          </ol>
          <TimelineOverview timeline={result.workout.timeline} />
        </> : <p className="mb-6 text-sm leading-relaxed text-stone-400">Complete os campos para calcular a duração do treino.</p>}
        {error && <div ref={errorRef} id="workout-error" role="alert" tabIndex={-1} className="mb-5 rounded-xl border border-rose-400/30 bg-rose-400/10 p-4 text-sm leading-relaxed text-rose-200">{error.message}</div>}
        {soundToggle}
        {onSave && <button type="button" className="my-3 min-h-12 w-full rounded-xl border border-white/15 px-4 text-sm font-semibold hover:bg-white/5" onClick={() => {
          setSubmitted(true);
          if (result.ok) onSave(result.workout);
          else requestAnimationFrame(() => errorRef.current?.focus());
        }}>Salvar treino</button>}
        <button type="submit" className={primaryButton}>Iniciar treino <span aria-hidden="true">▶</span></button>
        <p className="mt-4 text-center text-xs text-stone-400">Tudo pronto? Comece quando quiser.</p>
      </aside>
    </form>
  </>;
}
