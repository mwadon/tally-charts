# Postęp prac

Dziennik prowadzony przez orkiestrator po każdym zaakceptowanym tasku.

## Stan bazowy (T01, 2026-10-25)

Weryfikacja bramek na czystym drzewie (gałąź `crew/T01`, bez zmian w kodzie). Środowisko: node v24.14.0, pnpm 12.4.2, **darwin** (e2e porównywało z baseline'ami `e2e/__screenshots__/darwin`; linux nie był uruchamiany lokalnie).

### Bramki

| # | Komenda | Wynik |
|---|---------|-------|
| 1 | `pnpm install --frozen-lockfile` | OK |
| 2 | `pnpm typecheck` | OK |
| 3 | `pnpm lint` | OK (exit 0; 0 błędów, 4 warningi `noImportantStyles` w `packages/tally-charts/src/theme/theme.css:1279-1288` i 1 info, istniejące wcześniej) |
| 4 | `pnpm test` | OK |
| 5 | `pnpm build` | OK |
| 6 | `pnpm --filter tally-charts api:check` | OK (po build; api-extractor ostrzega tylko, że bundlowany TypeScript 5.9.3 jest starszy od projektowego 6.0.3) |
| 7 | `pnpm size` | OK (14/14 wpisów w limicie) |
| 8 | `pnpm --filter tally-charts check:dev-strip` | OK (31/31 fraz, 98387 bajtów) |
| 9 | `pnpm test:e2e` | OK |

### Testy

- Unit (vitest 5.0.4, `packages/tally-charts`): **77 plików, 1037 testów**, passed 1037, failed 0.
- E2E (Playwright, chromium, darwin): **303 passed, 0 failed, 0 skipped** (0 flaky).
- Po e2e `git status` był czysty: żadne nowe baseline'y PNG nie powstały (po 46 PNG w `darwin` i `linux`).

### size-limit (gzip, z `.size-limit.json`)

| Wpis | Size gzip | Limit |
|------|-----------|-------|
| tally-charts/core | 1.61 kB | 8 kB |
| Chart + Bars + Axis + Target + Tooltip | 11.31 kB | 15 kB |
| BarChart | 12.23 kB | 15 kB |
| ComparisonBars | 11.7 kB | 15 kB |
| RankedBars | 11.31 kB | 15 kB |
| WaterfallChart | 13.03 kB | 15 kB |
| BridgeChart | 13.65 kB | 15 kB |
| DotHistogram | 12.38 kB | 15 kB |
| StripPlot | 12.17 kB | 15 kB |
| WaffleColumns | 10.63 kB | 15 kB |
| LineChart | 12.97 kB | 13 kB |
| Heatmap | 4.02 kB | 15 kB |
| Small UI pieces | 3.98 kB | 5 kB |
| RunwayChart | 8.44 kB | 15 kB |

Uwagi: LineChart ma tylko 0.03 kB zapasu (limit 13 kB; SPEC podnosi go do 14 KB po F8). `check:treeshake` i komendy docs jeszcze nie istnieją (osobne taski).

## ✔ T01 Szkielet: bramki monorepo i komendy w CLAUDE.md (2026-10-24)
Wszystkie 9 bramek przeszło na czystym drzewie (exit 0): install --frozen-lockfile, typecheck, lint, test, build, api:check (po build), size, check:dev-strip i test:e2e. Port 6007 był wolny przed e2e. Po e2e git status był czysty, więc nowe baseline'y nie powstały (po 46 PNG w darwin i linux). Zmieniłem tylko CLAUDE.md i PROGRESS.md. W CLAUDE.md uzupełniłem sekcję „Komendy” w kształcie SPEC §6.5, tylko z komendami, które istnieją. Dodałem notkę o docs i check:treeshake oraz ostrzeżenie o porcie 6007. W „Konwencjach” są 3 nowe reguły: changeset, changeset major z notatką przed/po, baseline'y (darwin lokalnie, linux przez komendę docker z komentarza w ci.yml). PROGRESS.md ma sekcję „Stan bazowy (T01, 2026-10-25)”: node v24.14.0, pnpm 12.4.2, darwin, wynik każdej bramki, unit 77 plików / 1037 testów, e2e 303 passed / 0 failed / 0 skipped oraz tabelę size-limit z 14 wpisami. Końcowy `pnpm lint` przechodzi.
**Decyzje i pułapki:**
- W zsh `for c in "cmd args"; do $c` nie dzieli zmiennej na słowa (exit 127). Używaj `eval "$c"`.
- api:check wymaga wcześniejszego `pnpm build`, bo api-extractor czyta dist.
- Katalog dist jest w .gitignore, więc build nie brudzi drzewa.
- `pnpm changeset` działa z roota (@changesets/cli 3.0.3 w root devDependencies), katalog .changeset istnieje.
- Przed `pnpm test:e2e` sprawdź `lsof -i :6007`, bo playwright.config.ts ma reuseExistingServer lokalnie.
**Otwarte kwestie:**
- LineChart ma zapas tylko 0.03 kB (12.97 kB przy limicie 13 kB). Każdy dodatek do LineChart przed F8 przekroczy limit, a SPEC podnosi go do 14 KB dopiero po F8.
- pnpm lint zwraca 4 warningi lint/complexity/noImportantStyles w packages/tally-charts/src/theme/theme.css (linie 1279, 1280, 1287, 1288) i 1 info. Istniały wcześniej, exit 0, nie ruszałem ich.
- api-extractor ostrzega, że projekt używa TypeScript 6.0.3, a bundlowany jest 5.9.3. To tylko ostrzeżenie, ale warto zaktualizować api-extractor.
- Baseline'y linux nie były weryfikowane lokalnie (e2e szło na darwin). Zielony wynik linux potwierdza dopiero job e2e w CI.
- packages/tally-charts/.size-limit.json: LineChart ma 12.97 kB przy limicie 13 kB, czyli zapas 0.03 kB. Każda zmiana w LineChart przed F8 prawie na pewno złamie bramkę size. Nie dotyczy to zakresu T01, ale to realne ryzyko dla kolejnych tasków.
**Kryteria:**
- Na czystym drzewie kolejno przechodzą (exit 0): pnpm install --frozen-lockfile, pnpm typecheck, pnpm lint, pnpm test, pnpm build, pnpm --filter tally-charts api:check, pnpm size, pnpm --filter tally-charts check:dev-strip, pnpm test:e2e. Każda bramka, która nie przechodzi, ma w PROGRESS.md komendę, skrót błędu i przyczynę.
- Sekcja 'Komendy' w CLAUDE.md zawiera: pnpm install; pnpm --filter storybook-app dev; pnpm test; pnpm test:e2e; pnpm lint; pnpm typecheck; pnpm build; pnpm --filter tally-charts api:check; pnpm size; pnpm --filter tally-charts check:dev-strip. Zawiera też notkę, że komendy docs i check:treeshake zostaną dopisane, gdy powstaną.
- Sekcja 'Konwencje' w CLAUDE.md zawiera 3 reguły: changeset w każdym PR zmieniającym packages/tally-charts; zmiana łamiąca API ma changeset major z notatką migracyjną przed/po; baseline'y linux regeneruje się wyłącznie procedurą docker z komentarza w .github/workflows/ci.yml (darwin lokalnie przez --update-snapshots=all).
- PROGRESS.md ma sekcję stanu bazowego z liczbą testów unit (pliki i testy z vitest), liczbą testów e2e (passed/failed/skipped) i tabelą size-limit z rozmiarem gzip i limitem dla każdego z 14 wpisów .size-limit.json.
- Po zakończeniu `git status` pokazuje zmiany wyłącznie w CLAUDE.md i PROGRESS.md (bez nowych baseline'ów PNG i zmian w kodzie), a `pnpm lint` nadal przechodzi.

## T02 Szkielet apps/docs (Next.js) — decyzje
- D1. Runtime docs (next dev/build/start, vitest, e2e) rozwiązuje `tally-charts` przez exports do `dist` (prawdziwa ścieżka konsumenta z `'use client'`). `tsconfig.json` dla Next nie ma `paths`. Komendy runtime wymagają wcześniejszego `pnpm build` (CLAUDE.md).
- D2. Typecheck nie wymaga `dist` (job `check` robi go przed buildem): `tsconfig.typecheck.json` extends `tsconfig.json` + `paths` do `src`. Skrypt `next typegen && tsc --noEmit -p tsconfig.typecheck.json`. `next typegen` istnieje w Next 16.4.3, więc `next-env.d.ts` jest w `.gitignore` (nie commitujemy go).
- D3. Brak baseline'ów wizualnych docs; e2e sprawdza tylko zachowanie (F17 doda baseline'y).
- D4. Port e2e 3100; `webServer` to tylko `next start` (bez builda), `reuseExistingServer: !CI`.
- D5. Bez `next/font/google` i zasobów zewnętrznych; `NEXT_TELEMETRY_DISABLED=1` w jobie `docs`. Root `pnpm test` bez zmian (tylko biblioteka). Brak zmian w `packages/tally-charts`, więc bez changesetu.
- Dodatkowo: `agentRules: false` w `next.config.ts`, bo `next dev` sam zapisywał `apps/docs/AGENTS.md`. Nie było potrzeby zmian w `allowBuilds` (install bez ignored builds).
- Pułapka: strona startowa jest server componentem, więc props wykresu muszą być serializowalne. Funkcja (np. `valueFormat={(v) => ...}`) wywala prerender „Functions cannot be passed directly to Client Components". Używaj presetów (`format="percent"`) albo komponentu z `'use client'`.
- Dostępna nazwa wykresu jest na `role="application"` (z `title`), a `svg` ma `aria-hidden`; testy szukają `getByRole('application', { name })`.

## ✔ T02 Szkielet aplikacji apps/docs (Next.js) z testami, e2e i jobem CI (2026-10-24)
Dodałem aplikację `apps/docs` (Next 16.4.3 App Router, React 19.3.0, `tally-charts: workspace:*`). Strona startowa to server component z `<h1>` i `BarChart` w `app/home-chart.tsx`. Są skrypty dev (3000), build, start (3100), typecheck, test i test:e2e. W `.github/workflows/ci.yml` jest job `docs` w kontenerze Playwright: install --frozen-lockfile, `pnpm build`, typecheck, lint, test, `next build`, e2e. Bez `secrets.*`, bez `CMS_*`, z `NEXT_TELEMETRY_DISABLED=1`. Uzupełniłem też `.gitignore` (`.next/`, `next-env.d.ts`), `pnpm-lock.yaml`, sekcję Komendy w CLAUDE.md (z adnotacją o `pnpm build` i porcie 3100) oraz decyzje D1–D5 w PROGRESS.md. Lokalna symulacja jobu `docs` na czystym drzewie (bez `dist`, `.next`, `next-env.d.ts`, `test-results`) dała exit 0 w każdym kroku. Root `pnpm typecheck` bez `dist` obejmuje `apps/docs` i przechodzi. Przechodzą też `pnpm test`, `api:check`, `size`, `check:dev-strip` i `pnpm test:e2e` (storybook). `dev` zwraca 200 na `/`. Po wszystkim `git status` pokazuje tylko zamierzone pliki. Pliku `apps/docs/tsconfig.json` Next nie przepisał po buildach. Nie ruszałem `packages/tally-charts`, więc changeset nie jest potrzebny. Zielony job w CI potwierdzi orkiestrator po pushu.
**Decyzje i pułapki:**
- Props przekazywane z server componentu do wykresów tally-charts muszą być serializowalne. Funkcja (np. `valueFormat={(v) => ...}`) wywala prerender „Functions cannot be passed directly to Client Components”. Używaj presetów (`format="percent"`) albo komponentu z 'use client'.
- Dostępna nazwa wykresu jest na `role="application"` (z `title`), a `svg` ma `aria-hidden`. Testy szukają `getByRole('application', { name })`, nie svg po nazwie.
- `next dev` sam zapisuje `AGENTS.md` w katalogu aplikacji. Wyłącza to `agentRules: false` w next.config.ts.
- `next typegen` istnieje w Next 16.4.3 i generuje `next-env.d.ts`, więc plik nie jest commitowany. Typecheck bez `dist` działa dzięki osobnemu `tsconfig.typecheck.json` z `paths` do `src`.
- pnpm install nie zgłosił ignored builds dla next/sharp, więc `allowBuilds` w pnpm-workspace.yaml bez zmian.
- Po `next build` tsconfig.json pozostał taki sam jak zapisany ręcznie (stabilny).
**Otwarte kwestie:**
- Job `docs` w CI nie był uruchomiony na GitHubie. Lokalnie sprawdzona jest tylko sekwencja komend, nie kontener `mcr.microsoft.com/playwright:v1.64.0-noble`.
- `pnpm --filter docs typecheck` uruchamia `next typegen`, który zapisuje `next-env.d.ts` i `.next/types`. Oba są w .gitignore, ale skrypt zostawia je w drzewie.
- Node w CI to 24, a engines w package.json wymaga >=22. Next 16.4.3 nie był testowany na 22.
- Baseline'ów wizualnych docs nie ma (D3). Dojdą w F17 po designie.
- `pnpm test` z roota nadal uruchamia tylko bibliotekę, bo docs ma osobną komendę zgodnie z SPEC §6.5. Orkiestrator powinien o tym pamiętać przy bramkach kolejnych tasków.
- apps/docs/tsconfig.typecheck.json: Typecheck rozwiązuje tally-charts do src (paths), a runtime i next build do dist/*.d.ts. Typy z src i z wygenerowanych .d.ts mogą się rozjechać, np. gdy zmieni się eksport w index.ts bez przebudowania, a typecheck docs tego nie wychwyci. Częściowo ryzyko łagodzi `next build`, który w jobie docs sprawdza typy względem dist.
- .github/workflows/ci.yml: Job `check` (root `pnpm typecheck`) uruchamia teraz `next typegen`, ale bez NEXT_TELEMETRY_DISABLED, więc Next może tam próbować wysyłać telemetrię. Job docs ma tę zmienną, a check nie.
**Kryteria:**
- `apps/docs/package.json` ma `name: "docs"` oraz zależności `next` (App Router, katalog `app/`), `react`/`react-dom` 19.x i `"tally-charts": "workspace:*"`. `pnpm install --frozen-lockfile` przechodzi na zaktualizowanym `pnpm-lock.yaml`.
- Po `pnpm build` (biblioteka) przechodzą z exit 0: `pnpm --filter docs build` (next build) i `pnpm --filter docs test` (vitest, co najmniej 1 test renderujący stronę startową lub jej wykres i sprawdzający obecność `svg` wykresu). `pnpm --filter docs dev` i `pnpm --filter docs start` startują serwer, a `/` zwraca 200.
- `pnpm --filter docs test:e2e` (Playwright, webServer `next start` na porcie 3100) przechodzi z co najmniej 1 testem: `/` zwraca 200, h1 i wykres z `tally-charts` (svg z dostępną nazwą) są widoczne, brak `console.error` i `pageerror`.
- Root `pnpm typecheck` obejmuje `apps/docs` (widać `apps/docs typecheck` w wyjściu `pnpm -r`) i przechodzi także BEZ zbudowanego `packages/tally-charts/dist`, bo job `check` robi typecheck przed buildem. Root `pnpm lint` obejmuje pliki `apps/docs` i przechodzi (bez nowych błędów, a `.next/` jest ignorowane).
- `.github/workflows/ci.yml` ma job `docs` z krokami: install --frozen-lockfile, `pnpm build`, `pnpm --filter docs typecheck`, `pnpm lint`, `pnpm --filter docs test`, `pnpm --filter docs build`, `pnpm --filter docs test:e2e`. Job nie odwołuje się do `secrets.*`, nie ustawia zmiennych `CMS_*` i nie używa `next/font/google` ani innych zasobów sieciowych. Lokalna sekwencja tych komend na czystym drzewie kończy się exit 0. Zielony job w CI potwierdzi orkiestrator po pushu.
- Istniejące bramki dalej przechodzą: `pnpm test`, `pnpm build`, `pnpm test:e2e` (storybook), `pnpm --filter tally-charts api:check`, `pnpm size`. Brak zmian w `packages/tally-charts`, więc changeset nie jest potrzebny.
- CLAUDE.md, sekcja Komendy, zawiera `pnpm --filter docs dev`, `pnpm --filter docs test`, `pnpm --filter docs test:e2e` i `pnpm --filter docs build`, z adnotacją, że wymagają wcześniejszego `pnpm build` (a e2e także `pnpm --filter docs build` i wolnego portu 3100). Notka o przyszłych komendach dotyczy już tylko `check:content` i `check:treeshake`.
- Po buildach i testach `git status` nie pokazuje artefaktów (`.next/`, `next-env.d.ts` jeśli nie commitowany, `test-results/`), a ponowny `next build` nie modyfikuje zacommitowanego `apps/docs/tsconfig.json`.
