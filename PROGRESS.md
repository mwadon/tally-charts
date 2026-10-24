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
