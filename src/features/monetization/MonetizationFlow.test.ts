// @vitest-environment jsdom
import { act, createElement, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import WorkoutApp from '../workout/components/WorkoutApp';

// Configured test-only IDs do not load an ad provider or make ad requests.
vi.mock('./config', async original => {
  const actual = await original<typeof import('./config')>();
  return { ...actual, monetizationConfig: actual.readMonetizationConfig({
    PUBLIC_ADSENSE_CLIENT_ID: `ca-pub-${'1'.repeat(16)}`,
    PUBLIC_ADSENSE_SLOT_ID: '2'.repeat(10),
    PUBLIC_SUPPORT_URL: 'https://example.org/support',
  }) };
});
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

it('publicidade e apoio só aparecem na configuração, nunca em execução, pausa ou conclusão', async () => {
  vi.useFakeTimers();
  window.localStorage.clear();
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  const ad = () => container.querySelector('aside[aria-label="Publicidade"]');
  const support = () => container.querySelector('a[target="_blank"]');
  async function click(label: string) {
    const button = [...container.querySelectorAll('button')].find(element => element.textContent?.trim().startsWith(label));
    if (!button) throw new Error(`Botão ausente: ${label}`);
    await act(async () => button.click());
  }
  const expectAdFree = () => {
    expect(ad()).toBeNull(); expect(support()).toBeNull();
    expect(container.querySelector('ins.adsbygoogle')).toBeNull();
  };
  try {
    await act(async () => root.render(createElement(StrictMode, null, createElement(WorkoutApp))));
    expect(ad()).not.toBeNull(); expect(support()).not.toBeNull();
    await click('Iniciar treino'); expectAdFree();
    await click('Pausar'); expectAdFree();
    await click('Continuar'); expectAdFree();
    await click('Reiniciar'); expectAdFree();
    for (let index = 0; index < 6; index += 1) { await click('Próximo'); expectAdFree(); }
    expect(container.textContent).toContain('Treino concluído!');
    expect(document.querySelector('script[src*="googlesyndication"]')).toBeNull();
    await click('Encerrar e editar');
    expect(ad()).not.toBeNull(); expect(support()).not.toBeNull();
  } finally {
    await act(async () => root.unmount());
    container.remove(); vi.clearAllTimers(); vi.useRealTimers();
  }
});
