import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { FALLBACK_LOCALE, LOCALE_STORAGE_KEY, isLocale, plural, renderMessage, resolveLocale, translator } from './core';
import type { Locale, Message } from './core';

function createValue(locale: Locale, setLocale: (locale: Locale) => void) {
  return { locale, setLocale, t: translator(locale), message: (value: Message) => renderMessage(locale, value),
    count: (kind: 'rounds' | 'exercises' | 'phases', count: number) => plural(locale, kind, count) };
}
const I18nContext = createContext(createValue(FALLBACK_LOCALE, () => {}));

export function I18nProvider({ children }: { children: ReactNode }) {
  // The server and initial hydration always agree. Browser preferences are read after mount.
  const [locale, updateLocale] = useState<Locale>(FALLBACK_LOCALE);
  useEffect(() => {
    let saved: unknown;
    try { saved = window.localStorage.getItem(LOCALE_STORAGE_KEY); } catch { /* Preference storage is optional. */ }
    updateLocale(resolveLocale(saved, navigator.language));
    const onStorage = (event: StorageEvent) => {
      if (event.key === LOCALE_STORAGE_KEY || event.key === null) updateLocale(resolveLocale(event.newValue, navigator.language));
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);
  useEffect(() => {
    const t = translator(locale);
    document.documentElement.lang = locale;
    document.title = t('metaTitle');
    document.querySelector('meta[name="description"]')?.setAttribute('content', t('metaDescription'));
  }, [locale]);
  const value = useMemo(() => createValue(locale, next => {
    if (!isLocale(next)) return;
    updateLocale(next);
    try { window.localStorage.setItem(LOCALE_STORAGE_KEY, next); } catch { /* Switching still works without storage. */ }
  }), [locale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
export const useI18n = () => useContext(I18nContext);
