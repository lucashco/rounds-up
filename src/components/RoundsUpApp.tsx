import { I18nProvider, useI18n } from '../i18n/I18nProvider';
import { isLocale } from '../i18n/core';
import WorkoutApp from '../features/workout/components/WorkoutApp';

function AppShell() {
  const { locale, setLocale, t } = useI18n();
  return <>
    <a className="skip-link" href="#main-content">{t('skip')}</a>
    <div className="site-shell flex min-h-svh flex-col">
      <header className="site-header flex-wrap">
        <a href="/" aria-label={t('home')} className="site-brand">
          <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" className="h-8 w-8 text-lime-300">
            <circle cx="16" cy="16" r="12" stroke="currentColor" strokeWidth="2.5" />
            <path d="M10 19 21 12m-7 0h7v7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>Rounds Up<span className="text-lime-300">.</span></span>
        </a>
        <div className="flex flex-wrap items-center gap-4">
          <span className="site-caption hidden sm:block">{t('caption')}</span>
          <label className="text-sm text-stone-300">
            <span className="sr-only">{t('language')}</span>
            <select aria-label={t('language')} value={locale} className="language-select" onChange={event => {
              if (isLocale(event.target.value)) setLocale(event.target.value);
            }}>
              <option value="pt-BR" lang="pt-BR">PT-BR</option>
              <option value="en" lang="en">EN</option>
            </select>
          </label>
        </div>
      </header>
      <main id="main-content" className="site-main flex-1"><WorkoutApp /></main>
      <footer className="site-footer">{t('footer')}</footer>
    </div>
  </>;
}
export default function RoundsUpApp() {
  return <I18nProvider><AppShell /></I18nProvider>;
}
