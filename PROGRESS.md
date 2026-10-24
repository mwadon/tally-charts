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

## T03 Design strony dokumentacji (F10) — decyzje
- Dokument: `docs/superpowers/specs/2026-10-25-tally-charts-docs-site-design.md` (IA z F15, layouty, typografia, kolory, kreskowanie, bloki kodu, ChartExample, focus i kontrast, decyzje). 8 PNG w `docs/superpowers/specs/assets/docs-site/`, skrypty `shots.mjs` i `contrast.mjs` (Playwright z `apps/docs`, bez własnego package.json; poza lintem jak `assets`).
- Placeholder w `apps/docs`: `/` i `/docs/line-chart`, treść statyczna w TSX, bez CMS i `CMS_*`. Linki do nieistniejących stron to wyłączony tekst (`aria-disabled`), nie 404. Nawigacja w `app/_content/navigation.ts`.
- Kolory wyłącznie z tokenów `--ch-*` (surface, tooltip-bg, grid, ink, ink-muted); linki to 70% accent + ink z podkreśleniem (czysty accent to 4.49:1 na #fafafa), focus to czysty `--ch-accent` 2px (≥4.49:1 na obu tłach). Tabela kontrastu z computed kolorów przechodzi (≥4.5 tekst, ≥3 obramowania i focus).
- Motyw: `prefers-color-scheme` plus `?theme=light|dark` (inline script w `<head>`, `suppressHydrationWarning`). Przełącznik w headerze jest tylko wizualny (disabled); pełny przełącznik z localStorage to F11.
- Testy: vitest (strona główna, LineChart, ChartExample, kontrast tokenów z theme.css) i e2e (light/dark × forced/system, 375 px bez scrolla, focus, toggle, nawigacja mobilna). Bez baseline'ów wizualnych (D3).
- `vitest.setup.ts` robi `cleanup` RTL po każdym teście (globals są wyłączone).
- Pułapka: na porcie 3100 został stary `next start` (PID z poprzedniej sesji); zatrzymany przed pracą. `lsof -i :3100` przed e2e.
- **Gate [MAINTAINER] F10 (akceptacja designu) pozostaje OTWARTY.** Nie oznaczać jako zaakceptowanego, dopóki maintainer nie zatwierdzi dokumentu i zrzutów.

## ✔ T03 Design strony dokumentacji: dokument, placeholder i zrzuty (F10) (2026-10-24)
Naprawiono uwagi z review. (1) globals.css: w @media (min-width: 900px) przycisk Menu ma teraz osobną regułę `.menu-button { display: none }`, a `.docs-shell` własną regułę siatki. Przycisk znika na desktopie. (2) Panel Code w ChartExample na stronie LineChart pokazuje teraz kod zgodny z `line-example.tsx`: dane `months`, label i value dla obu serii, label targetu, height, pełny title (`LINE_EXAMPLE_TITLE`) i description. (3) W dokumencie designu poprawiono liczbę stron z 29 na 25. (4) Dodano test e2e: Menu ukryte przy 1280 px, widoczne przy 375 px. (5) Wygenerowano ponownie 8 PNG skryptem shots.mjs. Zrzuty line-chart-1280 nie mają już rozciągniętego przycisku Menu (sprawdzone na jasnym). (6) contrast.mjs zwraca kod 0, a jego tabela (55 wierszy) jest identyczna z tabelą w dokumencie. Bramki zielone: pnpm build, docs build, docs typecheck, pnpm typecheck, docs test 27/27, docs e2e 20/20, pnpm test 1037/1037. pnpm lint kończy się bez błędów, z 4 ostrzeżeniami i 1 info, których nie rozpatrywałem. packages/tally-charts bez zmian.
**Decyzje i pułapki:**
- Nie łącz w jednej regule media-query elementu, który ma zniknąć, z kontenerem układu. Zrzuty i testy liczbowe tego nie wykryją, więc potrzebna jest asercja widoczności.
- Przed uruchomieniem shots.mjs i contrast.mjs trzeba mieć działający `pnpm --filter docs start` na :3100 (po obu buildach). Po skończeniu zabij proces (pkill -f 'next start').
**Otwarte kwestie:**
- pnpm lint zgłasza 4 ostrzeżenia i 1 info; nie sprawdzałem, czy pochodzą z tego taska.
- Gate [MAINTAINER] F10 (akceptacja designu) pozostaje otwarty.
- Zmienione zostały tylko zrzuty line-chart-1280-{light,dark}.png. Pozostałe 6 PNG wygenerowano ponownie, ale git nie widzi w nich zmian.
- apps/docs/app/_components/side-nav.tsx: The section id is built from the group label (`nav-${group.label}`). For 'Building blocks' this gives id="nav-Building blocks". aria-labelledby is a space-separated list of ids, so it points at the missing ids 'nav-Building' and 'blocks'. The Playwright ariaSnapshot shows `region:` with no name for this group, while the other four regions have names.
**Kryteria:**
- Istnieje `docs/superpowers/specs/2026-10-25-tally-charts-docs-site-design.md` z sekcjami: architektura informacji (wszystkie slugi z F15 w grupach Start, Guides, Charts, Building blocks, Reference), layout strony głównej (kolejność sekcji z F16), layout strony docs (header, nawigacja boczna, spis treści), wersja mobilna 375 px, typografia (systemowy stack i skala), kolory (tabela ról → tokeny `--ch-*` z hex light/dark), motyw kreskowania, bloki kodu, ChartExample (przełącznik preview/code), focus i kontrast oraz decyzje.
- Logo to tekstowy wordmark „tally-charts” w headerze, linkujący do `/`. W apps/docs nie ma pliku obrazka logo (grep po `<img`/`.svg` logo nic nie zwraca), a dokument to opisuje.
- Po `pnpm build` i `pnpm --filter docs build` serwer `next start` zwraca 200 na `/` i `/docs/line-chart`. Treść jest statyczna z repo, bez CMS i bez zmiennych `CMS_*`. Strona LineChart zawiera żywy LineChart (role="application" z nazwą) w bloku ChartExample z przełącznikiem Preview/Code.
- Tryb ciemny działa zarówno przez `prefers-color-scheme: dark`, jak i przez wymuszenie `data-ch-theme` (np. `?theme=dark`). Test e2e sprawdza, że computed background `<body>` to rgb(250, 250, 250) w light i rgb(18, 18, 21) w dark na obu stronach.
- `pnpm --filter docs test` przechodzi z testami: strona główna (nowy h1), strona LineChart (h1, wykres, wordmark-link, grupy nawigacji) i przełącznik ChartExample (domyślnie preview; po kliknięciu Code widać kod, a przyciski mają dostępne nazwy i stan aria).
- `pnpm --filter docs test:e2e` przechodzi. Dla obu stron w light i dark: 200, widoczny h1 i wykres, brak console.error/pageerror. Przy 375 px `body.scrollWidth <= body.clientWidth`. Element fokusowany klawiaturą (wordmark, przełącznik) ma widoczny outline.
- W `docs/superpowers/specs/assets/docs-site/` jest dokładnie 8 PNG: home i line-chart × 1280 i 375 px × light i dark, wygenerowane skryptem z tego katalogu. Dokument designu linkuje do każdego z nich.
- Dokument designu zawiera tabelę kontrastu wygenerowaną skryptem z computed kolorów strony. Każda para tekst/tło (ink, ink-muted, linki, tekst i składnia w blokach kodu, aktywna pozycja nawigacji) na `--ch-surface` i `--ch-tooltip-bg` w light i dark ma ≥ 4.5:1, a focus i obramowania kontrolek ≥ 3:1. Linki nie używają czystego `--ch-accent` na #fafafa (≈4.4:1).
- Przechodzą `pnpm typecheck`, `pnpm lint`, `pnpm test` i `pnpm --filter docs typecheck`. Brak zmian w `packages/tally-charts` (więc bez changesetu), a `git status` nie pokazuje `.next/`, `test-results/` ani `next-env.d.ts`.
- PROGRESS.md odnotowuje decyzje T03 i to, że gate [MAINTAINER] akceptacji designu F10 pozostaje otwarty.

## T04 Bramka F10: oczekuje na maintainera
**Gate OTWARTY, akceptacja niezapisana.** Agent nie wpisuje akceptacji ani jej daty. T04 nie jest ✔, dopóki w tym pliku nie pojawi się linia akceptacji wpisana przez maintainera.
- Dokument designu: `docs/superpowers/specs/2026-10-25-tally-charts-docs-site-design.md`, sekcja „13. Review and approval (gate F10)” (lista kontrolna §1–§11, komendy do obejrzenia placeholdera, pola Decision/Date/Notes). Status w nagłówku dokumentu to dalej „proposal, waiting for the maintainer's approval (gate F10)”.
- 8 PNG w `docs/superpowers/specs/assets/docs-site/`: `home-1280-light.png`, `home-1280-dark.png`, `home-375-light.png`, `home-375-dark.png`, `line-chart-1280-light.png`, `line-chart-1280-dark.png`, `line-chart-375-light.png`, `line-chart-375-dark.png`. Bez zmian względem T03.
- Jedyna zmiana placeholdera w T04: `apps/docs/app/_components/side-nav.tsx`. Id nagłówka grupy to teraz slug etykiety (`nav-building-blocks`), więc `aria-labelledby` wskazuje istniejący element, a każdy z 5 regionów nawigacji ma nazwę. Bez zmian wizualnych. Test: `app/docs/line-chart/page.test.tsx`, asercja nazw regionów także w `e2e/line-chart.spec.ts`.
- Jak zamknąć bramkę: maintainer dopisuje tu linię w formacie `F10 zaakceptowany: <maintainer>, RRRR-MM-DD` (np. „F10 zaakceptowany: Mateusz Wadoń, RRRR-MM-DD” z prawdziwą datą) albo listę uwag. Uwagi trafiają do dokumentu designu i placeholdera (nowy task) albo jako decyzje do tego pliku. Wynik dobrze odnotować też w polach Decision/Date/Notes w sekcji 13 dokumentu.
- Reguła (SPEC D-12): do akceptacji M5 nie startuje, z wyjątkiem F12 i F13.
**Decyzje:**
- Sesja jest nieinteraktywna, a maintainer nie przekazał decyzji, więc tylko przygotowano bramkę do jednoznacznej decyzji.
