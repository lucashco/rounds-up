import type { Message } from '../../../i18n/core';
import { useEffect, useState } from 'react';
import { deleteWorkout, readSavedWorkouts, saveWorkout, SAVED_WORKOUTS_KEY } from '../storage/savedWorkouts';
import type { SavedWorkout } from '../storage/savedWorkouts';

export function useSavedWorkouts() {
  const [workouts, setWorkouts] = useState<SavedWorkout[]>([]);
  const [message, setMessage] = useState<Message | null>(null);
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState<{ workout: SavedWorkout; revision: string; message: Message } | null>(null);
  const unavailable = () => setMessage({ key: 'storageUnavailable', params: {} });
  function refresh() {
    try {
      const result = readSavedWorkouts(window.localStorage);
      if (result.ok) { setWorkouts(result.workouts); setMessage(null); }
      else { setWorkouts([]); setMessage(result.issue); }
    } catch { unavailable(); }
    setReady(true);
  }
  useEffect(() => {
    refresh();
    const onStorage = (event: StorageEvent) => {
      if (event.key === SAVED_WORKOUTS_KEY || event.key === null) { refresh(); setPending(null); }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);
  function save(workout: SavedWorkout, revision?: string) {
    try {
      const result = saveWorkout(window.localStorage, workout, revision);
      if (result.ok) { setWorkouts(result.workouts); setPending(null); setMessage({ key: 'saved', params: {} }); }
      else if (result.kind === 'conflict') setPending({ workout, revision: result.revision, message: result.issue });
      else { setMessage(result.issue); setPending(null); }
    } catch { unavailable(); }
  }
  return {
    workouts, message, ready, pending, save,
    cancel: () => setPending(null),
    confirm: () => { if (pending) save(pending.workout, pending.revision); },
    load(name: string): SavedWorkout | null {
      try {
        const result = readSavedWorkouts(window.localStorage);
        if (!result.ok) { setMessage(result.issue); return null; }
        const workout = result.workouts.find(item => item.name === name);
        if (!workout) { setMessage({ key: 'unavailableWorkout', params: {} }); return null; }
        setMessage({ key: 'loaded', params: { name: workout.name } });
        return workout;
      } catch { unavailable(); return null; }
    },
    remove(name: string) {
      try {
        const result = deleteWorkout(window.localStorage, name);
        if (result.ok) { setWorkouts(result.workouts); setPending(null); setMessage({ key: 'deleted', params: {} }); }
        else setMessage(result.issue);
      } catch { unavailable(); }
    },
  };
}
