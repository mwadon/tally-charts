# CLAUDE.md

Ten plik czyta każdy agent na starcie. Trzymaj go krótkim i aktualnym.

## Wspólny cel
Opis produktu i zakres: SPEC.md. Stan prac i decyzje: PROGRESS.md.

## Komendy
- instalacja: `pnpm install`
- dev: `pnpm --filter storybook-app dev` (Storybook, port 6006)
- testy: `pnpm test` (vitest, biblioteka), `pnpm test:e2e` (Playwright na zbudowanym Storybooku, port 6007)
- lint: `pnpm lint`, `pnpm typecheck` (autofix: `pnpm format`)
- build: `pnpm build`
- checki biblioteki:
  - `pnpm --filter tally-charts api:check` (po `pnpm build`; failuje „dist is older than src, run pnpm build”, gdy jakikolwiek plik w `src/` jest nowszy niż `dist/index.d.ts`, więc po każdej zmianie src, także testów, buduj ponownie; przy zamierzonej zmianie API `api:update` i commit pliku z `packages/tally-charts/api`. `api:check` sprawdza też aktualność commitowanych `api/tally-charts.api.json` i `api/core.api.json` (model API Extractora bez `fileUrlPath`, `scripts/api-model.mjs`); `api:update` je odświeża, commituj razem z `.api.md`. Zmienia je też TSDoc funkcji i interfejsów (nie komentarze wewnątrz aliasów typów propsów), więc po takiej zmianie `pnpm build && pnpm --filter tally-charts api:update`)
  - `pnpm size` (konfiguracja: `packages/tally-charts/.size-limit.js`, mierzy rolldown)
  - `pnpm --filter tally-charts check:dev-strip`
  - `pnpm --filter tally-charts check:dts` (po `pnpm build`; failuje na gołym `import "pkg"` w `dist/**/*.d.ts`). `src/dts-parse.test.ts` czyta `dist` i bez builda się pomija; `REQUIRE_DIST=1` zamienia pominięcie w błąd (ustawia to CI)
  - `pnpm --filter tally-charts check:treeshake` (po `pnpm build`; esbuild bundluje fixture każdego wpisu size-limit i failuje, gdy bundle ma moduły src spoza grafu importów eksportu. Nowy top-levelowy `createWarner()`, `createContext()`, `memo()` w src oznacz `/* @__PURE__ */`, stałe zapisuj literałami)
- wydania (`docs/releasing.md`, workflow `.github/workflows/release.yml`; publikacja tylko z CI przez OIDC, bez tokenu npm): `pnpm check:workflows` (failuje na `NPM_TOKEN`/`NODE_AUTH_TOKEN` w workflowach i na `registry-url` w release.yml), `pnpm test:scripts` (node:test dla `scripts/release/`, w tym `changeset-flow.test.mjs`, który odpala prawdziwe CLI changesets w tmp; release.yml używa `changesets/action@v2`, bo v1 nie czyta `.changeset/pre/` z CLI 3). actionlint lokalnie: `docker run --rm -v "$PWD":/repo -w /repo rhysd/actionlint:1.7.7 -color` (w CI to samo w jobie `workflows`). Repo jest w pre mode changesets (`.changeset/pre.json`, tag `rc`), więc wersje to `1.0.0-rc.N` na dist-tagu `rc`.
- docs (`apps/docs`, Next.js): runtime rozwiązuje `tally-charts` do `dist`, więc wszystko poniżej wymaga wcześniejszego `pnpm build`.
  - `pnpm --filter docs dev` (port 3000), `pnpm --filter docs start` (`next start`, port 3100)
  - `pnpm --filter docs build` (`next build`)
  - `pnpm --filter docs test` (vitest)
  - `pnpm --filter docs test:e2e` (Playwright na `next start`, port 3100): wymaga też `pnpm --filter docs build` i wolnego portu (`lsof -i :3100`), bo lokalnie użyje istniejącego serwera
  - `pnpm --filter docs typecheck` nie wymaga `dist` (używa `tsconfig.typecheck.json` z `paths` do `src`); `next-env.d.ts` generuje `next typegen`
- skrypty designu docs (`docs/superpowers/specs/assets/docs-site/`, poza lintem, Playwright z `apps/docs`): przy działającym `pnpm --filter docs start` (po obu buildach) `node …/shots.mjs` zapisuje 8 PNG, a `node …/contrast.mjs` liczy kontrast computed kolorów strony (exit 1 przy parze poniżej progu). Po zmianie wyglądu strony uruchom oba i wklej tabelę do dokumentu designu.
- Strony docs wymuszają motyw przez `?theme=light|dark` (`data-ch-theme` na `<html>`); style tylko z tokenów `--ch-*` (`apps/docs/app/globals.css`, aliasy `--docs-*`). Czystego `--ch-accent` nie używaj jako koloru tekstu (4.49:1 na #fafafa).
- `pnpm --filter docs gen` (`apps/docs/scripts/gen-examples.mjs`): zapisuje `apps/docs/examples.generated.ts` (gitignored; id → `{ id, title, rscSafe, file, source, load, Component }`, posortowane po id) z `apps/docs/examples/**/*.tsx`. Uruchamia się sam przed `dev`, `build`, `test` i `typecheck` (pnpm nie odpala hooków pre*, więc jest wpisany w skrypty), a nie zapisuje pliku, gdy treść się nie zmieniła. Nowy przykład to jeden plik `examples/<grupa>/<nazwa>.tsx` z `export const meta = { id, title, rscSafe } satisfies ExampleMeta` (literały; `id` = ścieżka względem `examples/` bez `.tsx`, tylko `a-z0-9-` i `/`), z default exportem komponentu. Plik z `'use client'` nie może mieć `rscSafe: true`. Naruszenie kończy `gen` kodem 1 z komunikatem `ścieżka: problem`. Pliki `*.test.tsx` w `examples/` nie są przykładami. Strony biorą komponent z default exportu przykładu, a pokazywany kod z `examples[id].source`.
  - `gen` generuje też `apps/docs/api.generated.json` (gitignored; `scripts/gen-api.mjs`): `symbols[nazwa] = { name, kind: component|function|hook, package, packages, description, props|params, returns? }`, a prop/param to `{ name, type, required, default, description }`. Czyta tylko `packages/tally-charts/api/*.api.json` (zbiór publicznych funkcji i nazwy parametrów) i `packages/tally-charts/src` (typy, TSDoc, domyślne wartości przez checker TypeScripta), więc nie wymaga `dist`. Nowa albo usunięta publiczna funkcja bez `api:update` kończy `gen` kodem 1 (`symbol: problem`). Domyślną wartość propa podaj w TSDoc jako `Default …` na początku zdania albo tagiem `@defaultValue`.
  - `gen` generuje też `apps/docs/tokens.generated.ts` (gitignored; `scripts/gen-tokens.mjs`): `TOKENS` (`{ name, group: theme|shared, light, dark }` z `theme.css`, bez `--_ch-*`), `TOKEN_GROUPS` i `PALETTES` (default, vivid). Czyta tylko `packages/tally-charts/src/theme/theme.css` i kończy się kodem 1 (`theme.css: problem`), gdy token ma wartość tylko dla jednego motywu. Z tego korzystają bloki TokenTable i PaletteSwatches.
- Bloki treści glökki (`apps/docs/blocks/`): jeden moduł na blok z `defineBlock({ type, label, category, icon, defaultProps, propsSchema, component })` i eksportowanym obok schematem Zod (SDK go gubi, zostaje tylko `fields`; zbiera je `blocks/registry.ts` jako `blockSchemas`/`parseBlockProps`). Rodzaj pola przez `.meta({ fieldType })`, poziom nagłówka to `z.enum(['2','3'])`. Markdown tylko przez `blocks/markdown.tsx` (`skipHtml`, bez rehype-raw). Bloki są serwerowe, klientowe są tylko `blocks/copy-button.tsx` i `app/_components/chart-example.tsx` (przełącznik Preview/Code, który renderuje blok ChartExample); test CodeBlock: `render(await CodeBlock(props))`. Bloki ChartExample i PropsTable z id spoza rejestru pokazują box `.block-error` wszędzie poza `APP_ENV=production` (`blocks/block-error.tsx`), a na produkcji nic nie renderują.
- Źródło treści docs (`apps/docs/lib/content`, `getContentSource()`): glökki, gdy jest `CMS_BASE_URL` (wtedy też `CMS_TENANT` i `CMS_API_KEY`), inaczej fixtury `apps/docs/content/<slug>.json` w formacie DeliveryPage (tak działają dev, testy i CI, bez sieci). `content/navigation.json` (grupy, etykiety, kolejność sidebara; to nie strona) obowiązuje w obu źródłach, a `available` znaczy: jest fixtura albo slug jest w nawigacji glökki. Nowa strona w fixturach to plik JSON z blokami, które przechodzą `parseBlockProps` (pilnuje tego `content/fixtures.test.ts`). Trasy: `/` (slug `home`), `/docs/[slug]`, `/cdn/[...path]`, `POST /api/revalidate` (sekret `REVALIDATE_SECRET` w `Authorization: Bearer` albo `x-revalidate-secret`, bez niego zawsze 401), `/sitemap.xml`, `/robots.txt`. Zmienne opisuje `apps/docs/.env.example`; `APP_ENV=production` włącza indeksowanie, bez niego wszystko jest `noindex`.
- Komenda `pnpm --filter docs check:content` zostanie dopisana, gdy powstanie.
- Przed `pnpm test:e2e` sprawdź, że nic nie słucha na porcie 6007 (`lsof -i :6007`), bo lokalnie Playwright użyje istniejącego serwera.

## Konwencje
- Każda nowa funkcja ma testy.
- Bez sekretów w repo; konfiguracja przez zmienne środowiskowe (.env.example).
- Commity i gałęzie robi orkiestrator, nie agent.
- Każdy PR zmieniający `packages/tally-charts` ma changeset (`pnpm changeset`, katalog `.changeset`).
- Zmiana łamiąca publiczne API ma changeset `major` z notatką migracyjną: fragment kodu „przed” i „po”.
- Baseline'y wizualne są per platforma w `apps/storybook/e2e/__screenshots__/{darwin,linux}`. Darwin: `pnpm --filter storybook-app exec playwright test --update-snapshots=all`. Linux wyłącznie komendą docker z komentarza nad jobem `e2e` w `.github/workflows/ci.yml` (nie kopiuj jej tutaj). CI nigdy nie zapisuje baseline'ów.
