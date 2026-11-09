// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import RoundsUpApp from '../components/RoundsUpApp';
import { LOCALE_STORAGE_KEY } from './core';
import { SAVED_WORKOUTS_KEY } from '../features/workout/storage/savedWorkouts';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let container: HTMLDivElement;
let root: Root | undefined;
beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(navigator, 'language', 'get').mockReturnValue('pt-BR');
  localStorage.clear();
  document.head.innerHTML = '<title>Rounds Up</title><meta name="description" content="">';
  container = document.createElement('div'); document.body.append(container);
});
afterEach(async () => {
  await act(async () => root?.unmount());
  root = undefined; container.remove(); vi.useRealTimers();
});
async function mount() { await act(async () => { root = createRoot(container); root.render(createElement(RoundsUpApp)); }); }
async function language(value: string) {
  const select = container.querySelector('select');
  if (!select) throw new Error('Missing language selector');
  await act(async () => { select.value = value; select.dispatchEvent(new Event('change', { bubbles: true })); });
}
async function click(text: string) {
  const button = [...container.querySelectorAll('button')].find(item => item.textContent?.trim().startsWith(text));
  if (!button) throw new Error(`Missing button: ${text}`);
  await act(async () => button.click());
}
async function input(id: string, value: string) {
  const field = container.querySelector(`#${id}`);
  if (!(field instanceof HTMLInputElement)) throw new Error(`Missing input: ${id}`);
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(field, value);
    field.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
async function tick(ms: number) { await act(async () => vi.advanceTimersByTime(ms)); }
const timer = () => container.querySelector('[role="timer"]');
const timerText = () => timer()?.textContent?.trim();

it('detects the browser language, then persists the explicit preference across mounts', async () => {
  vi.spyOn(navigator, 'language', 'get').mockReturnValue('en-US');
  await mount();
  expect(container.textContent).toContain('Set up your workout.');
  expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBeNull();
  await language('pt-BR');
  expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('pt-BR');
  await act(async () => root?.unmount());
  await mount();
  expect(container.textContent).toContain('Configure seu treino.');
  expect(document.documentElement.lang).toBe('pt-BR');
});
it('hydrates Portuguese SSR with a saved English preference without recoverable errors or console errors', async () => {
  localStorage.setItem(LOCALE_STORAGE_KEY, 'en');
  const errors = vi.spyOn(console, 'error');
  const recover = vi.fn();
  const markup = renderToString(createElement(RoundsUpApp));
  expect(markup).toContain('Configure seu treino.');
  container.innerHTML = markup;
  await act(async () => { root = hydrateRoot(container, createElement(RoundsUpApp), { onRecoverableError: recover }); });
  expect(recover).not.toHaveBeenCalled();
  expect(errors).not.toHaveBeenCalled();
  expect(container.textContent).toContain('Set up your workout.');
  expect(document.documentElement.lang).toBe('en');
  expect(document.title).toBe('Rounds Up — Your workout. Your pace. Your rounds.');
  expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toContain('round-based workout');
});
it('continues the same active workout when switching language, including pause and completion', async () => {
  await mount();
  await input('workout-name', 'Meu treino personalizado');
  await click('Iniciar treino');
  await tick(2000);
  const originalTimer = timer();
  const remaining = timerText();
  await language('en');
  expect(timer()).toBe(originalTimer);
  expect(timerText()).toBe(remaining);
  expect(container.textContent).toContain('Meu treino personalizado');
  expect(container.querySelector('[data-status]')?.getAttribute('data-status')).toBe('running');
  expect(container.textContent).toContain('Preparation');
  await tick(1000);
  expect(timerText()).toBe('00:07');
  await click('Pause');
  await language('pt-BR');
  expect(container.textContent).toContain('Treino pausado');
  await tick(1000); expect(timerText()).toBe('00:07');
  await click('Continuar');
  await language('en');
  await tick(1000); expect(timerText()).toBe('00:06');
  for (let index = 0; index < 6; index++) await click('Next');
  expect(container.textContent).toContain('Workout complete!');
  await language('pt-BR');
  expect(container.textContent).toContain('Treino concluído!');
});
it('preserves GUIDED form values and custom exercise names, including saved data', async () => {
  await mount();
  const guided = container.querySelector('input[value="GUIDED"]');
  if (!(guided instanceof HTMLInputElement)) throw new Error('Missing mode');
  await act(async () => guided.click());
  await input('workout-name', 'Treino livre');
  await input('exercise-1-name', 'Agachamento');
  await input('rounds', '4');
  await input('exercise-1-duration', '45');
  await language('en');
  expect((container.querySelector('#rounds') as HTMLInputElement).value).toBe('4');
  expect((container.querySelector('#exercise-1-name') as HTMLInputElement).value).toBe('Agachamento');
  expect((container.querySelector('#exercise-1-duration') as HTMLInputElement).value).toBe('45');
  expect(container.textContent).toContain('1 exercise / 50');
  await click('Save workout');
  const saved = localStorage.getItem(SAVED_WORKOUTS_KEY);
  expect(saved).toContain('Agachamento');
  expect(saved).not.toContain('locale');
  expect(saved).not.toContain('Workout saved');
  await language('pt-BR');
  expect(container.textContent).toContain('Treino salvo neste dispositivo.');
  await click('Salvar treino');
  expect(container.textContent).toContain('Já existe um treino chamado “Treino livre”');
  await language('en');
  expect(container.textContent).toContain('A workout named “Treino livre” already exists.');
  await click('Cancel');
  await click('Start workout');
  await tick(10_000);
  expect(container.querySelector('h2')?.textContent).toBe('Agachamento');
});
it.each(['pt-BR', 'en'] as const)('renders form and duration errors in %s and retranslates a visible error', async locale => {
  await mount(); await language(locale);
  await input('workout-name', '');
  await click(locale === 'en' ? 'Start workout' : 'Iniciar treino');
  expect(container.querySelector('[role="alert"]')?.textContent).toBe(locale === 'en' ? 'Enter a workout name.' : 'Informe o nome do treino.');
  await input('workout-name', 'Custom');
  await input('round-duration', '60');
  expect(container.textContent).toContain(locale === 'en' ? 'Use non-negative whole minutes' : 'Use minutos inteiros não negativos');
  await language(locale === 'en' ? 'pt-BR' : 'en');
  expect(container.textContent).toContain(locale === 'en' ? 'Use minutos inteiros não negativos' : 'Use non-negative whole minutes');
});
it('still switches language if localStorage is blocked', async () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
  await mount(); await language('en');
  expect(container.textContent).toContain('Set up your workout.');
  expect(container.textContent).toContain('Local storage is unavailable.');
});
