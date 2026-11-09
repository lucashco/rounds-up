import { useEffect, useState } from 'react';
import { deleteWorkout, readSavedWorkouts, saveWorkout } from '../storage/savedWorkouts';
import type { SavedWorkout } from '../storage/savedWorkouts';

export function useSavedWorkouts() {
  const [workouts, setWorkouts] = useState<SavedWorkout[]>([]);
  const [message, setMessage] = useState('');
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState<{ workout: SavedWorkout; revision: string; message: string } | null>(null);
  const unavailable = () => setMessage('Não foi possível acessar o armazenamento local neste navegador.');
  function refresh() {
    try {
      const result = readSavedWorkouts(window.localStorage);
      if (result.ok) { setWorkouts(result.workouts); setMessage(''); }
      else { setWorkouts([]); setMessage(result.message); }
    } catch { unavailable(); }
    setReady(true);
  }
  useEffect(() => {
    refresh();
    const onStorage = () => { refresh(); setPending(null); };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);
  function save(workout: SavedWorkout, revision?: string) {
    try {
      const result = saveWorkout(window.localStorage, workout, revision);
      if (result.ok) { setWorkouts(result.workouts); setPending(null); setMessage('Treino salvo neste dispositivo.'); }
      else if (result.kind === 'conflict') setPending({ workout, revision: result.revision, message: result.message });
      else { setMessage(result.message); setPending(null); }
    } catch { unavailable(); }
  }
  return {
    workouts, message, ready, pending, save,
    cancel: () => setPending(null),
    confirm: () => { if (pending) save(pending.workout, pending.revision); },
    load(name: string): SavedWorkout | null {
      try {
        const result = readSavedWorkouts(window.localStorage);
        if (!result.ok) { setMessage(result.message); return null; }
        const workout = result.workouts.find(item => item.name === name);
        if (!workout) { setMessage('Este treino não está mais disponível.'); return null; }
        setMessage(`Treino “${workout.name}” carregado.`);
        return workout;
      } catch { unavailable(); return null; }
    },
    remove(name: string) {
      try {
        const result = deleteWorkout(window.localStorage, name);
        if (result.ok) { setWorkouts(result.workouts); setPending(null); setMessage('Treino excluído.'); }
        else setMessage(result.message);
      } catch { unavailable(); }
    },
  };
}
