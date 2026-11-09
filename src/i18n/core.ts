import { ptBR } from './pt-BR';
import { en } from './en';
import type { Dictionary, TranslationKey } from './pt-BR';

export type Locale = 'pt-BR' | 'en';
export const FALLBACK_LOCALE: Locale = 'pt-BR';
export const LOCALE_STORAGE_KEY = 'rounds-up.locale';
export const dictionaries = { 'pt-BR': ptBR, en } satisfies Record<Locale, Dictionary>;
type Placeholders<Text extends string> = Text extends `${string}{${infer Name}}${infer Rest}` ? Name | Placeholders<Rest> : never;
export type Params<Key extends TranslationKey> = Record<Placeholders<(typeof ptBR)[Key]>, string | number>;
export type Message = { [Key in TranslationKey]: { key: Key; params: Params<Key> } }[TranslationKey];
export type Translate = <Key extends TranslationKey>(key: Key, ...args: keyof Params<Key> extends never ? [params?: Params<Key>] : [params: Params<Key>]) => string;

export function isLocale(value: unknown): value is Locale { return value === 'pt-BR' || value === 'en'; }
export function detectLocale(language: string | undefined): Locale {
  return language?.toLowerCase().split('-')[0] === 'en' ? 'en' : FALLBACK_LOCALE;
}
export function resolveLocale(saved: unknown, language?: string): Locale {
  return isLocale(saved) ? saved : detectLocale(language);
}
export function formatNumber(locale: Locale, value: number): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(value);
}
export function renderMessage(locale: Locale, message: Message): string {
  const template = dictionaries[locale][message.key] || ptBR[message.key];
  return template.replace(/\{(\w+)\}/g, (placeholder: string, key: string) => {
    const values: Readonly<Record<string, string | number>> = message.params;
    const value = values[key];
    return value === undefined ? placeholder : typeof value === 'number' ? formatNumber(locale, value) : value;
  });
}
export function translator(locale: Locale): Translate {
  return (key, ...args) => renderMessage(locale, { key, params: args[0] ?? {} } as Message);
}
export function plural(locale: Locale, kind: 'rounds' | 'exercises' | 'phases', count: number): string {
  const category = new Intl.PluralRules(locale).select(count) === 'one' ? 'One' : 'Other';
  return translator(locale)(`${kind}${category}`, { count });
}
