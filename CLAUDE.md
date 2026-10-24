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
  - `pnpm --filter tally-charts api:check` (po `pnpm build`; przy zamierzonej zmianie API `api:update` i commit pliku z `packages/tally-charts/api`)
  - `pnpm size`
  - `pnpm --filter tally-charts check:dev-strip`
- docs (`apps/docs`, Next.js): runtime rozwiązuje `tally-charts` do `dist`, więc wszystko poniżej wymaga wcześniejszego `pnpm build`.
  - `pnpm --filter docs dev` (port 3000), `pnpm --filter docs start` (`next start`, port 3100)
  - `pnpm --filter docs build` (`next build`)
  - `pnpm --filter docs test` (vitest)
  - `pnpm --filter docs test:e2e` (Playwright na `next start`, port 3100): wymaga też `pnpm --filter docs build` i wolnego portu (`lsof -i :3100`), bo lokalnie użyje istniejącego serwera
  - `pnpm --filter docs typecheck` nie wymaga `dist` (używa `tsconfig.typecheck.json` z `paths` do `src`); `next-env.d.ts` generuje `next typegen`
- Komendy `pnpm --filter docs check:content` i `check:treeshake` zostaną dopisane, gdy powstaną.
- Przed `pnpm test:e2e` sprawdź, że nic nie słucha na porcie 6007 (`lsof -i :6007`), bo lokalnie Playwright użyje istniejącego serwera.

## Konwencje
- Każda nowa funkcja ma testy.
- Bez sekretów w repo; konfiguracja przez zmienne środowiskowe (.env.example).
- Commity i gałęzie robi orkiestrator, nie agent.
- Każdy PR zmieniający `packages/tally-charts` ma changeset (`pnpm changeset`, katalog `.changeset`).
- Zmiana łamiąca publiczne API ma changeset `major` z notatką migracyjną: fragment kodu „przed” i „po”.
- Baseline'y wizualne są per platforma w `apps/storybook/e2e/__screenshots__/{darwin,linux}`. Darwin: `pnpm --filter storybook-app exec playwright test --update-snapshots=all`. Linux wyłącznie komendą docker z komentarza nad jobem `e2e` w `.github/workflows/ci.yml` (nie kopiuj jej tutaj). CI nigdy nie zapisuje baseline'ów.
