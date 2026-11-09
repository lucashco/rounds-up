// @vitest-environment jsdom
import { act, createElement, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ScreenLock } from '../browser/screenWakeLock';
import { useScreenWakeLock } from './useScreenWakeLock';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
class FakeLock extends EventTarget {
  released = false;
  release = vi.fn(async () => { this.released = true; this.dispatchEvent(new Event('release')); });
}
let container: HTMLDivElement;
let root: Root;
let locks: FakeLock[];
let visible: boolean;
let request: ReturnType<typeof vi.fn<() => Promise<ScreenLock>>>;
const initialSecure = Object.getOwnPropertyDescriptor(window, 'isSecureContext');

function Consumer({ active, epoch, enabled }: { active: boolean; epoch: number; enabled: boolean }) {
  const status = useScreenWakeLock(active, epoch, enabled);
  return createElement('output', null, status);
}
async function render(active: boolean, epoch = 0, enabled = true) {
  await act(async () => root.render(createElement(StrictMode, null, createElement(Consumer, { active, epoch, enabled }))));
}
async function visibility(next: boolean) {
  visible = next;
  await act(async () => { document.dispatchEvent(new Event('visibilitychange')); });
}

beforeEach(() => {
  locks = []; visible = true;
  request = vi.fn(async () => { const lock = new FakeLock(); locks.push(lock); return lock; });
  Object.defineProperty(window, 'isSecureContext', { configurable: true, value: true });
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => visible ? 'visible' : 'hidden' });
  Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: { request } });
  container = document.createElement('div'); root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  Reflect.deleteProperty(navigator, 'wakeLock');
  Reflect.deleteProperty(document, 'visibilityState');
  if (initialSecure) Object.defineProperty(window, 'isSecureContext', initialSecure);
  else Reflect.deleteProperty(window, 'isSecureContext');
});

describe('useScreenWakeLock', () => {
  it('só solicita em running e libera em pausa/conclusão, reset e desmontagem', async () => {
    await render(false); expect(request).not.toHaveBeenCalled();
    await render(true); expect(container.textContent).toBe('active');
    expect(request).toHaveBeenCalledTimes(1);
    const first = locks[0]!;
    await render(false); expect(first.released).toBe(true);
    expect(container.textContent).toBe('idle');
    await render(true); const resumed = locks.at(-1)!;
    await render(true, 1); expect(resumed.released).toBe(true);
    const reset = locks.at(-1)!;
    await render(false, 1); expect(reset.released).toBe(true);
    await render(true, 1); const last = locks.at(-1)!;
    await act(async () => root.unmount()); expect(last.released).toBe(true);
    root = createRoot(container);
  });

  it('respeita preferência desligada e libera imediatamente ao desativar', async () => {
    await render(true, 0, false); expect(request).not.toHaveBeenCalled();
    await render(true); expect(container.textContent).toBe('active');
    await render(true, 0, false); expect(locks.every(lock => lock.released)).toBe(true);
    const count = request.mock.calls.length;
    await visibility(false); await visibility(true);
    expect(request).toHaveBeenCalledTimes(count);
    await render(true); expect(container.textContent).toBe('active');
  });

  it('informa ausência de suporte e não solicita a API', async () => {
    Reflect.deleteProperty(navigator, 'wakeLock');
    await render(true); expect(container.textContent).toBe('unsupported');
    expect(request).not.toHaveBeenCalled();
  });

  it('informa contexto inseguro sem tentar contornar as restrições', async () => {
    Object.defineProperty(window, 'isSecureContext', { configurable: true, value: false });
    await render(true); expect(container.textContent).toBe('insecure');
    expect(request).not.toHaveBeenCalled();
  });

  it('informa rejeição e recupera ao voltar à aba, sem duplicar lock ativo', async () => {
    request.mockRejectedValueOnce(new Error('Negado'));
    await render(false); await render(true);
    expect(container.textContent).toBe('failed');
    expect(request).toHaveBeenCalledTimes(1);
    await visibility(false); await visibility(true);
    expect(container.textContent).toBe('active');
    expect(request).toHaveBeenCalledTimes(2);
    await visibility(true); await render(true);
    expect(request).toHaveBeenCalledTimes(2);
    const held = locks.at(-1)!;
    await act(async () => { void held.release(); });
    expect(container.textContent).toBe('released');
    await visibility(false); await visibility(true);
    expect(container.textContent).toBe('active');
  });

  it('serializa Strict Mode e reset com request pendente e descarta resposta antiga', async () => {
    let resolve!: (lock: ScreenLock) => void;
    request.mockImplementationOnce(() => new Promise<ScreenLock>(done => { resolve = done; }));
    await render(true);
    expect(request).toHaveBeenCalledTimes(1);
    await render(true, 1);
    expect(request).toHaveBeenCalledTimes(1);
    const stale = new FakeLock();
    await act(async () => { resolve(stale); });
    expect(stale.released).toBe(true);
    expect(request).toHaveBeenCalledTimes(2);
    expect(container.textContent).toBe('active');
  });
});
