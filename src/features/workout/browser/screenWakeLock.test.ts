import { describe, expect, it, vi } from 'vitest';
import { createScreenWakeLock } from './screenWakeLock';
import type { ScreenLock } from './screenWakeLock';

class FakeLock extends EventTarget {
  released = false;
  release = vi.fn(async () => { this.released = true; this.dispatchEvent(new Event('release')); });
}
const flush = async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); };

describe('Screen Wake Lock lifecycle', () => {
  it('adquire uma vez e libera ao encerrar', async () => {
    const lock = new FakeLock();
    const request = vi.fn(async () => lock);
    const controller = createScreenWakeLock({ visible: () => true, request });
    controller.activate(); controller.activate();
    await flush();
    expect(request).toHaveBeenCalledTimes(1);
    controller.release(); controller.release();
    expect(lock.release).toHaveBeenCalledTimes(1);
  });

  it('libera em aba oculta e recupera ao voltar', async () => {
    let visible = true;
    const locks = [new FakeLock(), new FakeLock()];
    const request = vi.fn().mockResolvedValueOnce(locks[0]).mockResolvedValueOnce(locks[1]);
    const controller = createScreenWakeLock({ visible: () => visible, request });
    controller.activate(); await flush();
    visible = false; controller.visibilityChanged();
    expect(locks[0]!.released).toBe(true);
    visible = true; controller.visibilityChanged(); await flush();
    expect(request).toHaveBeenCalledTimes(2);
    controller.release();
    expect(locks[1]!.released).toBe(true);
  });

  it('libera uma requisição que resolve após desmontar/pausar', async () => {
    let resolve!: (lock: ScreenLock) => void;
    const promise = new Promise<ScreenLock>(done => { resolve = done; });
    const controller = createScreenWakeLock({ visible: () => true, request: () => promise });
    controller.activate(); controller.release();
    const lock = new FakeLock(); resolve(lock); await flush();
    expect(lock.release).toHaveBeenCalledOnce();
  });

  it('retoma corretamente se a visibilidade mudar enquanto request está pendente', async () => {
    let visible = true;
    let resolve!: (lock: ScreenLock) => void;
    const promise = new Promise<ScreenLock>(done => { resolve = done; });
    const replacement = new FakeLock();
    const request = vi.fn().mockImplementationOnce(() => promise).mockResolvedValue(replacement);
    const controller = createScreenWakeLock({ visible: () => visible, request });
    controller.activate();
    visible = false; controller.visibilityChanged();
    visible = true; controller.visibilityChanged();
    const stale = new FakeLock(); resolve(stale); await flush();
    expect(stale.released).toBe(true);
    expect(request).toHaveBeenCalledTimes(2);
    controller.release();
    expect(replacement.released).toBe(true);
  });

  it('rejeições não geram loops e podem ser tentadas novamente ao voltar à aba', async () => {
    const request = vi.fn().mockRejectedValue(new Error('Negado'));
    const controller = createScreenWakeLock({ visible: () => true, request });
    controller.activate(); await flush();
    expect(request).toHaveBeenCalledTimes(1);
    controller.visibilityChanged(); await flush();
    expect(request).toHaveBeenCalledTimes(2);
    controller.release();
    controller.visibilityChanged(); await flush();
    expect(request).toHaveBeenCalledTimes(2);
  });
});
