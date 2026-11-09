export type ScreenLock = Pick<WakeLockSentinel, 'released' | 'release' | 'addEventListener'>;
export type WakeLockStatus = 'idle' | 'requesting' | 'active' | 'unsupported' | 'insecure' | 'failed' | 'released';
export type WakeLockEnvironment = {
  visible: () => boolean;
  request: () => Promise<ScreenLock>;
  onStatus?: (status: WakeLockStatus) => void;
};

/** Called only in client effects; missing APIs/HTTP are a supported fallback. */
export function screenWakeLockAvailability(): 'supported' | 'unsupported' | 'insecure' {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return 'unsupported';
  if (window.isSecureContext === false) return 'insecure';
  return typeof navigator.wakeLock?.request === 'function' ? 'supported' : 'unsupported';
}

/** Serializes requests and releases stale promises after pause/unmount/restart. */
export function createScreenWakeLock(environment: WakeLockEnvironment) {
  let active = false;
  let generation = 0;
  let pending = false;
  let lock: ScreenLock | null = null;
  const status = (value: WakeLockStatus) => environment.onStatus?.(value);
  const releaseHandle = (handle: ScreenLock) => { void handle.release().catch(() => {}); };
  const release = () => {
    generation += 1;
    const previous = lock;
    lock = null;
    if (previous) releaseHandle(previous);
    status('idle');
  };
  const request = async () => {
    if (!active || !environment.visible() || pending || (lock && !lock.released)) return;
    pending = true;
    const requestedGeneration = generation;
    status('requesting');
    try {
      const handle = await environment.request();
      if (!active || !environment.visible() || generation !== requestedGeneration) releaseHandle(handle);
      else if (handle.released) status('released');
      else {
        lock = handle;
        status('active');
        handle.addEventListener('release', () => {
          if (lock === handle) { lock = null; status(active ? 'released' : 'idle'); }
        }, { once: true });
      }
    } catch {
      if (active && environment.visible() && generation === requestedGeneration) status('failed');
    } finally {
      pending = false;
      if (active && environment.visible() && generation !== requestedGeneration) void request();
    }
  };
  return {
    activate() { active = true; void request(); },
    release() { active = false; release(); },
    visibilityChanged() {
      if (!environment.visible()) release();
      else void request();
    },
  };
}
