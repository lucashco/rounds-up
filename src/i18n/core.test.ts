import { describe, expect, it } from 'vitest';
import { dictionaries, formatNumber, plural, renderMessage, resolveLocale, translator } from './core';
import { formatDuration, phaseLabel } from '../features/workout/components/presentation';

describe('locale resolution', () => {
  it.each([
    [null, undefined, 'pt-BR'], [null, 'fr-FR', 'pt-BR'], [null, 'pt-PT', 'pt-BR'],
    [null, 'en-US', 'en'], [null, 'EN-gb', 'en'], ['en', 'pt-BR', 'en'],
    ['pt-BR', 'en-US', 'pt-BR'], ['invalid', 'en', 'en'], [{ locale: 'en' }, 'fr', 'pt-BR'],
  ])('resolves %j with browser language %s', (saved, browser, expected) => {
    expect(resolveLocale(saved, browser)).toBe(expected);
  });
});
it('dictionaries have exactly the same nonempty keys and interpolation parameters', () => {
  expect(Object.keys(dictionaries.en).sort()).toEqual(Object.keys(dictionaries['pt-BR']).sort());
  for (const key of Object.keys(dictionaries['pt-BR']) as (keyof typeof dictionaries.en)[]) {
    const placeholders = (value: string) => [...value.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort();
    expect(dictionaries.en[key].trim(), key).not.toBe('');
    expect(placeholders(dictionaries.en[key]), key).toEqual(placeholders(dictionaries['pt-BR'][key]));
  }
});
it('uses Portuguese if a dictionary entry is absent at runtime', () => {
  const original = dictionaries.en.configure;
  try {
    Reflect.deleteProperty(dictionaries.en, 'configure');
    expect(translator('en')('configure')).toBe(dictionaries['pt-BR'].configure);
  } finally { dictionaries.en.configure = original; }
});
it('formats numbers with Intl and keeps durations in MM:SS', () => {
  expect(formatNumber('pt-BR', 1234)).toBe('1.234');
  expect(formatNumber('en', 1234)).toBe('1,234');
  expect(formatDuration(125_000)).toBe('02:05');
  expect(formatDuration(6_000_000)).toBe('100:00');
});
it.each(['pt-BR', 'en'] as const)('pluralizes in %s', locale => {
  expect(plural(locale, 'rounds', 1)).toBe('1 round');
  expect(plural(locale, 'rounds', 2)).toBe('2 rounds');
  expect(plural(locale, 'exercises', 1)).toBe(locale === 'en' ? '1 exercise' : '1 exercício');
  expect(plural(locale, 'exercises', 2)).toBe(locale === 'en' ? '2 exercises' : '2 exercícios');
  expect(plural(locale, 'phases', 1)).toContain(locale === 'en' ? '1 phase)' : '1 fase)');
});
it('interpolates custom names verbatim without translating or parsing their contents', () => {
  expect(renderMessage('en', { key: 'loaded', params: { name: 'Meu treino {count} <b>' } }))
    .toBe('Workout “Meu treino {count} <b>” loaded.');
  expect(phaseLabel({ type: 'EXERCISE', exerciseId: 'x', exerciseName: 'Agachamento', round: 1, durationMs: 1000, startMs: 0, endMs: 1000 }, 'en')).toBe('Agachamento');
});
// Compile-time contracts: wrong keys and missing interpolation parameters must fail check.
export function translationTypeChecks() {
  const t = translator('en');
  // @ts-expect-error unknown key
  t('missingKey');
  // @ts-expect-error missing required parameter
  t('exercise');
  // @ts-expect-error wrong parameter name
  t('exercise', { count: 1 });
}
