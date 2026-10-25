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
  - `pnpm --filter tally-charts api:check` (po `pnpm build`; failuje „dist is older than src, run pnpm build”, gdy jakikolwiek plik w `src/` jest nowszy niż `dist/index.d.ts`, więc po każdej zmianie src, także testów, buduj ponownie; przy zamierzonej zmianie API `api:update` i commit pliku z `packages/tally-charts/api`)
  - `pnpm size` (konfiguracja: `packages/tally-charts/.size-limit.js`, mierzy rolldown)
  - `pnpm --filter tally-charts check:dev-strip`
  - `pnpm --filter tally-charts check:dts` (po `pnpm build`; failuje na gołym `import "pkg"` w `dist/**/*.d.ts`). `src/dts-parse.test.ts` czyta `dist` i bez builda się pomija; `REQUIRE_DIST=1` zamienia pominięcie w błąd (ustawia to CI)
  - `pnpm --filter tally-charts check:treeshake` (po `pnpm build`; esbuild bundluje fixture każdego wpisu size-limit i failuje, gdy bundle ma moduły src spoza grafu importów eksportu. Nowy top-levelowy `createWarner()`, `createContext()`, `memo()` w src oznacz `/* @__PURE__ */`, stałe zapisuj literałami)
- wydania (`docs/releasing.md`, workflow `.github/workflows/release.yml`; publikacja tylko z CI przez OIDC, bez tokenu npm): `pnpm check:workflows` (failuje na `NPM_TOKEN`/`NODE_AUTH_TOKEN` w workflowach i na `registry-url` w release.yml), `pnpm test:scripts` (node:test dla `scripts/release/`). actionlint lokalnie: `docker run --rm -v "$PWD":/repo -w /repo rhysd/actionlint:1.7.7 -color` (w CI to samo w jobie `workflows`). Repo jest w pre mode changesets (`.changeset/pre.json`, tag `rc`), więc wersje to `1.0.0-rc.N` na dist-tagu `rc`.
- docs (`apps/docs`, Next.js): runtime rozwiązuje `tally-charts` do `dist`, więc wszystko poniżej wymaga wcześniejszego `pnpm build`.
  - `pnpm --filter docs dev` (port 3000), `pnpm --filter docs start` (`next start`, port 3100)
  - `pnpm --filter docs build` (`next build`)
  - `pnpm --filter docs test` (vitest)
  - `pnpm --filter docs test:e2e` (Playwright na `next start`, port 3100): wymaga też `pnpm --filter docs build` i wolnego portu (`lsof -i :3100`), bo lokalnie użyje istniejącego serwera
  - `pnpm --filter docs typecheck` nie wymaga `dist` (używa `tsconfig.typecheck.json` z `paths` do `src`); `next-env.d.ts` generuje `next typegen`
- skrypty designu docs (`docs/superpowers/specs/assets/docs-site/`, poza lintem, Playwright z `apps/docs`): przy działającym `pnpm --filter docs start` (po obu buildach) `node …/shots.mjs` zapisuje 8 PNG, a `node …/contrast.mjs` liczy kontrast computed kolorów strony (exit 1 przy parze poniżej progu). Po zmianie wyglądu strony uruchom oba i wklej tabelę do dokumentu designu.
- Strony docs wymuszają motyw przez `?theme=light|dark` (`data-ch-theme` na `<html>`); style tylko z tokenów `--ch-*` (`apps/docs/app/globals.css`, aliasy `--docs-*`). Czystego `--ch-accent` nie używaj jako koloru tekstu (4.49:1 na #fafafa).
- Komenda `pnpm --filter docs check:content` zostanie dopisana, gdy powstanie.
- Przed `pnpm test:e2e` sprawdź, że nic nie słucha na porcie 6007 (`lsof -i :6007`), bo lokalnie Playwright użyje istniejącego serwera.

## Konwencje
- Każda nowa funkcja ma testy.
- Bez sekretów w repo; konfiguracja przez zmienne środowiskowe (.env.example).
- Commity i gałęzie robi orkiestrator, nie agent.
- Każdy PR zmieniający `packages/tally-charts` ma changeset (`pnpm changeset`, katalog `.changeset`).
- Zmiana łamiąca publiczne API ma changeset `major` z notatką migracyjną: fragment kodu „przed” i „po”.
- Baseline'y wizualne są per platforma w `apps/storybook/e2e/__screenshots__/{darwin,linux}`. Darwin: `pnpm --filter storybook-app exec playwright test --update-snapshots=all`. Linux wyłącznie komendą docker z komentarza nad jobem `e2e` w `.github/workflows/ci.yml` (nie kopiuj jej tutaj). CI nigdy nie zapisuje baseline'ów.
