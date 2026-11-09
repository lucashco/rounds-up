import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { expect, it } from 'vitest';
import WorkoutApp from './WorkoutApp';

it('renderiza a aplicação sem window, localStorage, AudioContext ou Wake Lock no servidor', () => {
  expect(typeof window).toBe('undefined');
  const html = renderToString(createElement(WorkoutApp));
  expect(html).toContain('Prepare o seu');
  expect(html).toContain('Treinos salvos');
  expect(html).toContain('Sinais sonoros');
  expect(html).toContain('Rounds Up');
  expect(html).toContain('Seu treino. Seu ritmo. Seus rounds.');
  expect(html).not.toContain('RoundFit');
  expect(html.toLowerCase()).not.toContain('kettlebell');
  expect(html).toContain('Manter tela ligada durante o treino');
});
