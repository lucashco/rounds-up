import { useEffect, useRef, useState } from 'react';
import { createWorkoutAudio } from '../browser/workoutAudio';
import { createWorkoutDraft, workoutToDraft } from '../form/workoutForm';
import type { WorkoutSessionConfig } from '../form/workoutForm';
import { useSavedWorkouts } from '../hooks/useSavedWorkouts';
import { SavedWorkouts } from './SavedWorkouts';
import { SoundToggle } from './SoundToggle';
import { WorkoutBuilder } from './WorkoutBuilder';
import { WakeLockToggle } from './WakeLockToggle';
import { WorkoutSession } from './WorkoutSession';

export default function WorkoutApp() {
  const [draft, setDraft] = useState(createWorkoutDraft);
  const [session, setSession] = useState<WorkoutSessionConfig | null>(null);
  const [audio] = useState(createWorkoutAudio);
  const [wakeLockEnabled, setWakeLockEnabled] = useState(true);
  const [soundsEnabled, setSoundsEnabled] = useState(true);
  const [audioUnavailable, setAudioUnavailable] = useState(false);
  const library = useSavedWorkouts();
  const builder = useRef<HTMLDivElement>(null);
  useEffect(() => () => audio.close(), [audio]);
  const unlock = () => { void audio.unlock().then(ready => setAudioUnavailable(!ready)); };
  const soundToggle = <SoundToggle enabled={soundsEnabled} unavailable={audioUnavailable} onChange={enabled => {
    setSoundsEnabled(enabled);
    if (enabled) unlock(); else audio.stop();
  }} />;
  return <div ref={builder}>
    {session ? <WorkoutSession workout={session} wakeLockEnabled={wakeLockEnabled} onWakeLockChange={setWakeLockEnabled} audio={audio} soundsEnabled={soundsEnabled} soundToggle={soundToggle} onEdit={() => {
      audio.stop();
      setSession(null);
      requestAnimationFrame(() => builder.current?.querySelector('h1')?.focus());
    }} /> : <WorkoutBuilder draft={draft} onChange={setDraft} onSave={library.save}
      soundToggle={<div className="space-y-2">{soundToggle}<WakeLockToggle enabled={wakeLockEnabled} onChange={setWakeLockEnabled} /></div>}
      library={<SavedWorkouts library={library} onLoad={name => {
        const saved = library.load(name);
        if (saved) { setDraft(workoutToDraft(saved)); requestAnimationFrame(() => document.getElementById('workout-name')?.focus()); }
      }} />}
      onStart={workout => { if (soundsEnabled) unlock(); setSession(workout); }} />}
  </div>;
}
