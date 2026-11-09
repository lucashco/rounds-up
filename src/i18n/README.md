# Rounds Up i18n

`RoundsUpApp` is the single Astro `client:load` island. `I18nProvider` wraps the
shell and workout without locale keys or conditional remounts. The timer engine,
audio and Wake Lock do not depend on the locale.

The server and first client render use `pt-BR`. Only after hydration does an
effect resolve the language: valid `rounds-up.locale` preference, then
`navigator.language` (`en-*` maps to `en`), then `pt-BR`. Automatic detection does
not save a preference; selecting a language does. Storage failures do not block
switching. Another tab's preference changes are supported. A brief Portuguese
render before the effect is intentional with static HTML; it avoids mismatches.
The provider updates HTML `lang`, title and description.

## Dictionaries and messages

- `pt-BR.ts` defines the source keys and interpolation parameter names.
- `en.ts` uses `satisfies Dictionary` to require exactly those keys.
- `core.ts` provides typed `t`, structured `Message`, locale resolution, Intl
  number formatting and Intl plural selection. Runtime missing values fall back
  to Portuguese; tests also require matching interpolation placeholders.
- `useI18n()` exposes `t`, `message`, `count`, `locale`, `setLocale`.
- Form and storage failures carry structured messages (`key` + `params`); UI
  translates at render time, including already-visible confirmations. Existing
  Portuguese `message` strings remain for compatibility, not as translation keys.
- Translation keys are presentation metadata, never persisted with workouts.
  Modes, phase types, exercise IDs and saved workout schema remain unchanged.
- Editable workout and exercise names, including the initial draft values, are
  content and remain verbatim across language changes.
- Durations deliberately retain ASCII `MM:SS`, including minutes above 59.
  Do not use date/time zone formatters for elapsed time.

Example:

```tsx
const { t, count } = useI18n();
t('exerciseName', { index: 2 });
count('exercises', 2);
```

## Add a language

1. Create a dictionary implementing `Dictionary`, retaining all placeholders.
2. Register it in `dictionaries`, extend `Locale`, `isLocale`, and browser language
   detection in `core.ts`.
3. Add the option to the selector in `RoundsUpApp.tsx`.
4. Extend plural forms/selection if the language needs categories beyond one and
   other, and add locale resolution, plural, validation and hydration scenarios.
5. Run `npm run check`, `npm run build`, `npm run test` and review long strings on
   mobile. No routing changes are needed for in-place language switching.

There are no i18n dependencies. No PWA, backend, or localized URL routes are added.
