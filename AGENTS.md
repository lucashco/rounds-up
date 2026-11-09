## Rounds Up — Architecture

- Preserve the existing Astro project and use pnpm with its committed lockfile.
- Use Node >=22.23.4 as declared in package.json.
- The pnpm package extension for `@astrojs/astro2tsx@0.1.3` supplies its missing
  WASM runtime dependency at 1.11.3, matching its core. Reassess on upgrades.
- Keep TypeScript strict. Do not use `any`; validate external data from `unknown`.
- `src/pages` owns routes; `src/layouts` owns document structure; `src/components`
  owns reusable presentation; `src/styles` owns global styles and Tailwind.
- Use Astro for static content and React for interactive islands. Add client
  directives only where interactivity is needed. Keep browser APIs out of SSR.
- Organize workout code in `src/features/workout`:
  - `domain`: pure TypeScript types and rules; no framework or storage imports.
  - `storage`: persistence contracts/adapters; may depend on domain, never hooks.
  - `hooks`: React orchestration; may depend on domain and storage.
- Keep business rules out of pages, components and hooks. Do not introduce empty
  runtime abstractions or implement future features merely to populate folders.
- Use Tailwind utilities, semantic HTML, accessible contrast and responsive layouts.
- Unit tests use Vitest in Node, next to pure modules as `*.test.ts`. Add browser
  test dependencies only when an actual browser-dependent feature needs them.
- Run `pnpm check`, `pnpm test`, and `pnpm build` after relevant changes.
- Do not implement the timer, backend or authentication during architecture setup.
- Make only necessary changes; do not reinitialize the project, overwrite existing
  configuration wholesale, or commit automatically.

## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
