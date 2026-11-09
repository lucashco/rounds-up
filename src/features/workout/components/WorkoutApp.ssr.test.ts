import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { expect, it } from 'vitest';
import WorkoutApp from './WorkoutApp';
import RoundsUpApp from '../../../components/RoundsUpApp';

it('renderiza a aplicação sem window, localStorage, AudioContext ou Wake Lock no servidor', () => {
  expect(typeof window).toBe('undefined');
  const html = renderToString(createElement(WorkoutApp));
  expect(html).toContain('Configure seu treino.');
  expect(html).toContain('Treinos salvos');
  expect(html).toContain('Sinais sonoros');
  expect(html).toContain('Preview do treino');
  expect(html).not.toContain('RoundFit');
  expect(html.toLowerCase()).not.toContain('kettlebell');
  expect(html).toContain('Manter tela ligada durante o treino');
});

it('renderiza a ilha completa com seletor e idioma fallback sem APIs de navegador', () => {
  const html = renderToString(createElement(RoundsUpApp));
  expect(html).toContain('Configure seu treino.');
  expect(html).toMatch(/<option[^>]*value="pt-BR"[^>]*selected/);
  expect(html).toContain('Rounds Up');
});
