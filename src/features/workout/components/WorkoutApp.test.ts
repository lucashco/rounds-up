// @vitest-environment jsdom
import { act, createElement, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import WorkoutApp from './WorkoutApp';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let container: HTMLDivElement;
let root: Root;

async function click(element: HTMLElement) {
  await act(async () => { element.click(); });
}
function button(name: string): HTMLButtonElement {
  const found = [...container.querySelectorAll('button')].find(element =>
    (element.getAttribute('aria-label') ?? element.textContent?.trim() ?? '').startsWith(name));
  if (!found) throw new Error(`Botão não encontrado: ${name}`);
  return found;
}
function activeIntervalCount(): number {
  const cleared = new Set(vi.mocked(clearInterval).mock.calls.map(([id]) => id));
  // jsdom also schedules 60 Hz animation/focus work; count only workout updates.
  return vi.mocked(setInterval).mock.results.filter((result, index) =>
    vi.mocked(setInterval).mock.calls[index]?.[1] === 50 && result.type === 'return' && !cleared.has(result.value)).length;
}
function input(id: string): HTMLInputElement {
  const element = container.querySelector(`#${id}`);
  if (!(element instanceof HTMLInputElement)) throw new Error(`Input não encontrado: ${id}`);
  return element;
}
async function change(id: string, value: string) {
  // Existing scenarios specify total seconds; reset the new minutes part first.
  if (container.querySelector(`#${id}-minutes`)) await change(`${id}-minutes`, '0');
  await act(async () => {
    const element = input(id);
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    if (!setter) throw new Error('Input sem setter');
    setter.call(element, value);
    element.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
async function tick(ms: number) {
  await act(async () => { vi.advanceTimersByTime(ms); });
}
async function guided() {
  const radio = container.querySelector('input[value="GUIDED"]');
  if (!(radio instanceof HTMLInputElement)) throw new Error('Modo GUIDED ausente');
  await click(radio);
}
async function quickWorkout() {
  await change('rounds', '2');
  await change('preparation', '0');
  await change('round-rest', '2');
  await change('round-duration', '3');
  await click(button('Iniciar treino'));
}
const countdown = () => container.querySelector('[role="timer"]')?.textContent?.trim();
const remaining = () => container.querySelector('[data-testid="total-remaining"]')?.textContent?.trim();

beforeEach(async () => {
  window.localStorage.clear();
  vi.useFakeTimers();
  vi.spyOn(globalThis, 'setInterval');
  vi.spyOn(globalThis, 'clearInterval');
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  await act(async () => { root.render(createElement(StrictMode, null, createElement(WorkoutApp))); });
});

afterEach(async () => {
  await act(async () => { root.unmount(); });
  container.remove();
  vi.clearAllTimers();
  vi.useRealTimers();
  Reflect.deleteProperty(navigator, 'wakeLock');
  Reflect.deleteProperty(document, 'visibilityState');
});

describe('WorkoutApp com domínio e hook reais', () => {
  it('alterna modos e preserva campos ao voltar', async () => {
    expect(input('round-duration').value).toBe('0');
    expect(input('round-duration-minutes').value).toBe('1');
    await guided();
    expect(container.querySelector('#round-duration')).toBeNull();
    expect(input('exercise-1-name').value).toBe('Polichinelos');
    await change('exercise-1-name', 'Corrida no lugar');
    const free = container.querySelector('input[value="FREE"]') as HTMLInputElement;
    await click(free);
    expect(input('round-duration').value).toBe('0');
    expect(input('round-duration-minutes').value).toBe('1');
    await guided();
    expect(input('exercise-1-name').value).toBe('Corrida no lugar');
  });

  it('valida e mostra erro compreensível com associação ao campo', async () => {
    await change('round-duration', '0');
    await click(button('Iniciar treino'));
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('duração do round');
    expect(input('round-duration').getAttribute('aria-invalid')).toBe('true');
    expect(input('round-duration').getAttribute('aria-describedby')?.split(' ')).toContain('workout-error');
    expect(container.querySelector('[role="timer"]')).toBeNull();
    await change('round-duration', '10');
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });

  it('valida nome, rounds e circuito vazio', async () => {
    await change('workout-name', '');
    await click(button('Iniciar treino'));
    expect(container.querySelector('[role="alert"]')?.textContent).toBe('Informe o nome do treino.');
    await change('workout-name', 'Treino');
    await change('rounds', '0');
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('quantidade inteira');
    await change('rounds', '1');
    await guided();
    await click(button('Remover exercício 1'));
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('pelo menos um exercício');
  });

  it('adiciona, edita, reordena e remove exercícios com IDs estáveis', async () => {
    await guided();
    await click(button('+ Adicionar exercício'));
    await change('exercise-2-name', 'Agachamento');
    await change('exercise-2-duration', '12');
    await click(button('Mover exercício 2 para cima'));
    expect([...container.querySelectorAll('ol[aria-label] input[type="text"], ol[aria-label] input:not([type])')].map(element => (element as HTMLInputElement).value))
      .toEqual(['Agachamento', 'Polichinelos']);
    expect(input('exercise-2-duration').value).toBe('12');
    await click(button('Remover exercício 1'));
    expect(container.querySelector('#exercise-2-name')).toBeNull();
    expect(input('exercise-1-name').value).toBe('Polichinelos');
    await click(button('+ Adicionar exercício'));
    expect(input('exercise-3-name').value).toBe('');
  });

  it('gera a timeline configurada e inicia o timer de verdade', async () => {
    await quickWorkout();
    expect(countdown()).toBe('00:03');
    expect(remaining()).toBe('00:08');
    expect(container.textContent).toContain('Round livre');
    await tick(3_000);
    expect(container.querySelector('h2')?.textContent).toBe('Descanso entre rounds');
    expect(countdown()).toBe('00:02');
    expect(remaining()).toBe('00:05');
    await tick(2_000);
    expect(container.querySelector('h2')?.textContent).toBe('Round livre');
    expect(countdown()).toBe('00:03');
    await tick(3_000);
    expect(container.textContent).toContain('Treino concluído!');
    expect(remaining()).toBe('00:00');
    expect(button('Próximo').disabled).toBe(true);
    expect(activeIntervalCount()).toBe(0);
  });

  it('pausa e retoma sem contar o período pausado', async () => {
    await quickWorkout();
    await tick(1_000);
    await click(button('Pausar'));
    expect(countdown()).toBe('00:02');
    expect(activeIntervalCount()).toBe(0);
    await tick(10_000);
    expect(countdown()).toBe('00:02');
    await click(button('Continuar'));
    await tick(1_000);
    expect(countdown()).toBe('00:01');
    expect(remaining()).toBe('00:06');
  });

  it('próximo pula exercício e descanso, preserva pausa e reduz o restante', async () => {
    await quickWorkout();
    await tick(1_000);
    await click(button('Pausar'));
    await click(button('Próximo'));
    expect(container.querySelector('h2')?.textContent).toBe('Descanso entre rounds');
    expect(remaining()).toBe('00:05');
    expect(button('Continuar')).toBeTruthy();
    await click(button('Próximo'));
    expect(remaining()).toBe('00:03');
    await click(button('Próximo'));
    expect(container.textContent).toContain('Treino concluído!');
  });

  it('reinicia, repete após concluir e preserva o rascunho ao editar', async () => {
    await change('workout-name', 'Força A');
    await quickWorkout();
    await tick(1_000);
    await click(button('Reiniciar'));
    expect(countdown()).toBe('00:03');
    expect(remaining()).toBe('00:08');
    expect(button('Pausar')).toBeTruthy();
    await tick(8_000);
    await click(button('Repetir treino'));
    expect(countdown()).toBe('00:03');
    await click(button('Encerrar e editar'));
    expect(input('workout-name').value).toBe('Força A');
    expect(input('round-duration').value).toBe('3');
    expect(activeIntervalCount()).toBe(0);
  });

  it('usa a ordem e durações individuais do circuito no timer', async () => {
    await guided();
    await change('rounds', '1');
    await change('preparation', '1');
    await change('exercise-1-duration', '2');
    await change('exercise-rest', '1');
    await click(button('+ Adicionar exercício'));
    await change('exercise-2-name', 'Corrida no lugar');
    await change('exercise-2-duration', '3');
    await click(button('Mover exercício 2 para cima'));
    expect(container.querySelector('[data-testid="estimated-duration"]')?.textContent).toBe('00:07');
    await click(button('Iniciar treino'));
    expect(container.querySelector('h2')?.textContent).toBe('Preparação');
    await tick(1_000);
    expect(container.querySelector('h2')?.textContent).toBe('Corrida no lugar');
    expect(countdown()).toBe('00:03');
    await tick(3_000);
    expect(container.querySelector('h2')?.textContent).toBe('Descanso entre exercícios');
    await tick(1_000);
    expect(container.querySelector('h2')?.textContent).toBe('Polichinelos');
    expect(countdown()).toBe('00:02');
  });

  it('Strict Mode mantém somente um intervalo e limpa tudo ao desmontar', async () => {
    await quickWorkout();
    expect(activeIntervalCount()).toBe(1);
    await act(async () => { root.unmount(); });
    expect(activeIntervalCount()).toBe(0);
    root = createRoot(container); // afterEach can unmount an empty root
  });
});


describe('melhorias de experiência', () => {
  it('edita minutos/segundos e impede segundos fora da faixa e duração negativa', async () => {
    await change('round-duration-minutes', '2');
    expect(input('round-duration').value).toBe('0');
    await click(button('Iniciar treino'));
    expect(countdown()).toBe('00:10'); // preparação padrão
    await click(button('Próximo'));
    expect(countdown()).toBe('02:00');
    await click(button('Encerrar e editar'));
    // Change seconds directly to keep the minutes part in this scenario.
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
      setter.call(input('round-duration'), '60');
      input('round-duration').dispatchEvent(new Event('input', { bubbles: true }));
    });
    await click(button('Iniciar treino'));
    expect(container.querySelector('[role="timer"]')).toBeNull();
    expect(container.querySelector('#round-duration-error')?.textContent).toContain('0 a 59');
    await change('round-duration-minutes', '-1');
    expect(input('round-duration-minutes').getAttribute('aria-invalid')).toBe('true');
  });

  it('mostra timeline completa recolhida por padrão', async () => {
    const overview = [...container.querySelectorAll('details')].find(element => element.textContent?.includes('Ver timeline completa'));
    expect(overview?.open).toBe(false);
    const summary = overview?.querySelector('summary');
    if (!summary) throw new Error('Resumo da timeline ausente');
    await click(summary);
    expect(overview?.open).toBe(true);
    expect(overview?.querySelectorAll('li').length).toBe(6);
    expect(overview?.textContent).toContain('Round 3');
  });

  it('salva, carrega, confirma substituição e exclui treino', async () => {
    await change('workout-name', 'Treino salvo');
    await click(button('Salvar treino'));
    const savedDetails = container.querySelector('section[aria-label="Treinos salvos"] details');
    const summary = savedDetails?.querySelector('summary');
    if (!summary) throw new Error('Biblioteca ausente');
    await click(summary);
    expect(button('Carregar Treino salvo')).toBeTruthy();
    const raw = window.localStorage.getItem('roundfit.workouts');
    expect(raw).not.toContain('timeline');
    await change('rounds', '4');
    await click(button('Salvar treino'));
    expect(container.textContent).toContain('Substituir a configuração salva?');
    expect(window.localStorage.getItem('roundfit.workouts')).toBe(raw);
    await click(button('Cancelar'));
    await click(button('Carregar Treino salvo'));
    expect(input('rounds').value).toBe('3');
    await change('rounds', '5');
    await click(button('Salvar treino'));
    await click(button('Confirmar substituição'));
    await change('rounds', '1');
    await click(button('Carregar Treino salvo'));
    expect(input('rounds').value).toBe('5');
    await click(button('Excluir Treino salvo'));
    expect(container.querySelector('button[aria-label="Carregar Treino salvo"]')).toBeNull();
  });

  it('Wake Lock é liberado ao pausar/reiniciar/concluir e ao sair', async () => {
    class FakeLock extends EventTarget {
      released = false;
      release = vi.fn(async () => { this.released = true; this.dispatchEvent(new Event('release')); });
    }
    const locks: FakeLock[] = [];
    const request = vi.fn(async () => { const lock = new FakeLock(); locks.push(lock); return lock; });
    Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: { request } });
    await quickWorkout();
    expect(request).toHaveBeenCalledWith('screen');
    await click(button('Pausar'));
    expect(locks.every(lock => lock.released)).toBe(true);
    await click(button('Continuar'));
    const resumed = locks.at(-1)!;
    expect(resumed.released).toBe(false);
    await click(button('Reiniciar'));
    expect(resumed.released).toBe(true);
    const restarted = locks.at(-1)!;
    await tick(8_000);
    expect(restarted.released).toBe(true);
    await click(button('Repetir treino'));
    const repeated = locks.at(-1)!;
    await click(button('Encerrar e editar'));
    expect(repeated.released).toBe(true);
  });

  it('rejeição de Wake Lock e áudio ausente não impedem o treino', async () => {
    Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: { request: vi.fn().mockRejectedValue(new Error('Negado')) } });
    await quickWorkout();
    expect(container.textContent).toContain('Áudio indisponível');
    await tick(1_000);
    expect(countdown()).toBe('00:02');
    const checkbox = container.querySelector('input[type="checkbox"]');
    if (!(checkbox instanceof HTMLInputElement)) throw new Error('Controle de som ausente');
    await click(checkbox);
    expect(checkbox.checked).toBe(false);
  });
});


describe('configuração de tela ligada', () => {
  function screenOption(): HTMLInputElement {
    const label = [...container.querySelectorAll('label')].find(element => element.textContent?.includes('Manter tela ligada durante o treino'));
    const input = label?.querySelector('input');
    if (!(input instanceof HTMLInputElement)) throw new Error('Opção de tela ausente');
    return input;
  }
  it('vem ativada, pode ser desligada e mantém a preferência entre configuração e treino', async () => {
    const request = vi.fn(async () => ({ released: false, release: vi.fn(async () => {}), addEventListener: vi.fn() }));
    Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: { request } });
    expect(screenOption().checked).toBe(true);
    await click(screenOption());
    await quickWorkout(); expect(screenOption().checked).toBe(false);
    expect(request).not.toHaveBeenCalled();
    await click(screenOption()); expect(request).toHaveBeenCalledTimes(1);
    await click(button('Encerrar e editar'));
    expect(screenOption().checked).toBe(true);
  });
  it('informa ausência de suporte sem bloquear execução', async () => {
    expect(container.textContent).toContain('Este navegador não disponibiliza o recurso.');
    await quickWorkout();
    expect(container.textContent).toContain('Este navegador não disponibiliza o recurso.');
    await tick(1_000); expect(countdown()).toBe('00:02');
  });
  it('mostra falha discreta e continua o timer', async () => {
    const request = vi.fn().mockRejectedValue(new Error('Negado'));
    Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: { request } });
    await quickWorkout();
    expect(container.textContent).toContain('Não foi possível manter a tela ligada.');
    await tick(1_000); expect(countdown()).toBe('00:02');
  });
});
