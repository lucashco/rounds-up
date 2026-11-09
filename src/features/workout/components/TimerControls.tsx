import { useI18n } from '../../../i18n/I18nProvider';
import type { WorkoutTimer } from '../hooks/useWorkoutTimer';
import { primaryButton, secondaryButton } from './presentation';

type Props = Pick<WorkoutTimer, 'state' | 'start' | 'pause' | 'resume' | 'next'> & {
  onRestart: () => void;
};

export function TimerControls({ state, start, pause, resume, next, onRestart }: Props) {
  const { t } = useI18n();
  const completed = state.status === 'completed';
  const action = state.status === 'running' ? pause : state.status === 'paused' ? resume : completed ? onRestart : start;
  const label = state.status === 'running' ? t('pause') : state.status === 'paused' ? t('resume') : completed ? t('repeatWorkout') : t('start');
  return <div className="mt-8 space-y-3" role="group" aria-label={t('controls')}>
    <button type="button" className={`${primaryButton} min-h-16 text-lg`} onClick={action}>{label}</button>
    <div className="grid grid-cols-2 gap-3">
      <button type="button" className={secondaryButton} onClick={next} disabled={completed || state.status === 'idle'}>{t('next')} <span aria-hidden="true">→</span></button>
      <button type="button" className={secondaryButton} onClick={onRestart}>{t('restart')}</button>
    </div>
  </div>;
}
