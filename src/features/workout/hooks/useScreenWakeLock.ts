import { useEffect, useRef, useState } from 'react';
import { createScreenWakeLock, screenWakeLockAvailability } from '../browser/screenWakeLock';
import type { WakeLockStatus } from '../browser/screenWakeLock';

/** A user-started session owns the lock. SSR/render never accesses browser APIs. */
export function useScreenWakeLock(active: boolean, epoch: number, enabled = true): WakeLockStatus {
  const [status, setStatus] = useState<WakeLockStatus>('idle');
  const controller = useRef<ReturnType<typeof createScreenWakeLock> | null>(null);
  const subscribed = useRef(false);
  useEffect(() => {
    subscribed.current = true;
    const availability = screenWakeLockAvailability();
    if (availability !== 'supported') setStatus(availability);
    else {
      controller.current ??= createScreenWakeLock({
        visible: () => document.visibilityState === 'visible',
        request: () => navigator.wakeLock.request('screen'),
        onStatus: value => { if (subscribed.current) setStatus(value); },
      });
      if (active && enabled) controller.current.activate();
      else controller.current.release();
    }
    const onVisibility = () => {
      if (active && enabled) controller.current?.visibilityChanged();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      subscribed.current = false;
      document.removeEventListener('visibilitychange', onVisibility);
      controller.current?.release();
    };
  }, [active, epoch, enabled]);
  return status;
}
