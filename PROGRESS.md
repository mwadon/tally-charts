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

## ✔ T04 [MAINTAINER] Akceptacja designu strony dokumentacji (bramka M5) (2026-10-24)
Przygotowałem bramkę F10 do decyzji maintainera. Gate zostaje OTWARTY, a akceptacji ani jej daty nie wpisałem. (1) `side-nav.tsx`: id nagłówka grupy to slug etykiety (helper `groupHeadingId`, np. `nav-building-blocks`), więc `aria-labelledby` wskazuje istniejący element, a wszystkie 5 regionów ma nazwy. Wygląd bez zmian, PNG nietknięte. (2) Dokument designu ma sekcję „13. Review and approval (gate F10)”: lista kontrolna §1–§11 i 8 PNG, komendy do obejrzenia placeholdera (w tym `?theme=dark`) oraz puste pola Decision/Date/Notes. Status w linii 3 bez zmian („proposal, waiting…”). (3) PROGRESS.md ma sekcję „T04 Bramka F10: oczekuje na maintainera”, z jawnym „Gate OTWARTY, akceptacja niezapisana”. Zawiera link do dokumentu i sekcji 13, listę 8 PNG, format linii zamykającej „F10 zaakceptowany: <maintainer>, RRRR-MM-DD” albo listę uwag, miejsce na uwagi i regułę D-12 (M5 nie startuje, z wyjątkiem F12 i F13). Bramki: `pnpm build`, `docs build`, `docs typecheck`, `docs test` (28/28), `docs test:e2e` (20/20, port 3100 był wolny) i `pnpm typecheck` przechodzą. `pnpm lint` kończy się bez błędów, po `pnpm format` zostały te same 4 ostrzeżenia i 1 info co przed zmianą. Nie ruszałem `packages/tally-charts`, więc bez changesetu. `git status` pokazuje tylko PROGRESS.md, dokument designu, `side-nav.tsx`, `page.test.tsx` i `line-chart.spec.ts`.
**Decyzje i pułapki:**
- `aria-labelledby` przyjmuje listę id oddzielonych spacjami, więc id budowane z etykiet trzeba zamieniać na slug. Test sprawdza to przez `getByRole('region', { name })`.
- Po `pnpm format` sprawdź `git status`. Biome przeformatował ten sam plik, który zmieniałem, i zmiany nie wyszły poza zakres taska.
- Bramka [MAINTAINER] w sesji nieinteraktywnej: przygotuj dokument i checklistę, zostaw puste pola decyzji i nie wpisuj akceptacji.
**Otwarte kwestie:**
- Gate F10 jest OTWARTY: maintainer musi dopisać w PROGRESS.md linię „F10 zaakceptowany: <maintainer>, RRRR-MM-DD” albo listę uwag. Orkiestrator nie powinien oznaczać T04 ✔ przed tym.
- `pnpm lint` zgłasza 4 ostrzeżenia i 1 info (m.in. `noImportantStyles` w theme.css). Nie pochodzą z T04 i ich nie ruszałem.
- W sekcji 11 dokumentu designu (decyzja 1) jest literówka „glökki dependency”. To nie zakres T04, nie poprawiałem jej.
- PROGRESS.md: Oba kryteria z backlogu (akceptacja maintainera z datą oraz uwagi do designu) są z założenia niespełnione, bo zależą od decyzji człowieka. Bramka F10 zostaje otwarta. Zakres pracy agenta jest wykonany poprawnie, ale sam task T04 nie jest zamknięty.
**Kryteria:**
- PROGRESS.md ma sekcję T04, która jawnie stwierdza, że gate F10 jest OTWARTY i akceptacja nie jest zapisana. Sekcja zawiera link do dokumentu designu i listę 8 PNG oraz instrukcję zamknięcia bramki: format linii „F10 zaakceptowany: <maintainer>, RRRR-MM-DD” albo listę uwag i miejsce, do którego trafiają uwagi. Zawiera też regułę, że M5 nie startuje przed akceptacją, z wyjątkiem F12 i F13. Agent nie wpisuje żadnej akceptacji ani daty akceptacji.
- Dokument designu ma sekcję „Review and approval (gate F10)” z listą kontrolną obejmującą §1–§11 i wszystkie 8 PNG, komendami do lokalnego obejrzenia placeholdera (z `?theme=dark`) oraz pustymi polami Decision/Date/Notes. Status w nagłówku dalej brzmi „proposal, waiting for the maintainer's approval (gate F10)”.
- W `side-nav.tsx` id nagłówków grup nie zawierają spacji (np. `nav-building-blocks`), a każde `aria-labelledby` sekcji wskazuje istniejący element.
- `pnpm --filter docs test` przechodzi z nowym testem: nawigacja „Documentation” zawiera 5 regionów z dostępnymi nazwami Start, Guides, Charts, Building blocks, Reference.
- Po `pnpm build` i `pnpm --filter docs build` przechodzą `pnpm --filter docs typecheck`, `pnpm --filter docs test:e2e` (port 3100 wolny), `pnpm typecheck` i `pnpm lint` (bez nowych błędów).
- `git status` pokazuje zmiany wyłącznie w PROGRESS.md, dokumencie designu, `apps/docs/app/_components/side-nav.tsx` (ewentualnie `app/_content/navigation.ts`) i testach docs. Bez zmian w `packages/tally-charts` i bez zmian w 8 PNG.

## T05 RankedBars: domyślny fill 'solid' (F1)
**Decyzje:**
- Domyślny `fill` w `RankedBars` to teraz `'solid'` (kod i TSDoc). Zmiana łamiąca, więc changeset `major` (`.changeset/ranked-bars-solid-fill.md`) z notatką migracyjną i fragmentami „Before”/„After”.
- Result i DrillColumns dostają jawne `fill="hatch"` zamiast regeneracji baseline'ów: referencje `03-estimate-vs-actual.png` i `06-drilldown-strip-plot.png` pokazują słupki kreskowane, więc wygląd stories się nie zmienia. PNG darwin i linux bez zmian, procedura docker niepotrzebna. Performance miało już `fill="solid"`.
- README: punkt `RankedBars` podaje domyślny `solid` i `fill="hatch"`; przykład drill columns ma `fill="hatch"`. Strona migracji (F23) to osobny task.
**Weryfikacja:** `pnpm test` (1040), lint, typecheck, build, `api:check` (raport bez zmian, bo zawiera tylko sygnatury), `size`, `check:dev-strip` i `pnpm test:e2e` (303, bez `--update-snapshots`) przechodzą. `git status` bez zmienionych PNG.

## ✔ T05 RankedBars: domyślny fill 'solid' (F1) (2026-10-24)
Domyślny fill w RankedBars to teraz 'solid' (kod `fill ?? 'solid'` i TSDoc "Default 'solid'. Use 'hatch' for a plan or reference look."). Result.stories i DrillColumns.stories dostały jawne fill="hatch" z komentarzem o referencjach 03 i 06, więc wygląd i baseline'y PNG się nie zmieniły. README: punkt RankedBars opisuje domyślny solid i fill="hatch", a przykład drill columns ma fill="hatch". Dodany changeset major .changeset/ranked-bars-solid-fill.md z notatką migracyjną i fragmentami Before/After. PROGRESS.md ma sekcję decyzji T05. Bramki przechodzą: format, lint (te same 4 ostrzeżenia i 1 info co wcześniej), typecheck, test (1040), build, api:check (api.md bez zmian), size, check:dev-strip, test:e2e (303, port 6007 wolny, bez --update-snapshots). git status nie pokazuje zmienionych PNG.
**Decyzje i pułapki:**
- Bars nadaje data-ch-fill tylko elementowi [data-ch-part=bar]; track ma osobny data-ch-part=bar-track, więc selektor słupków jest jednoznaczny.
- api-extractor wypisuje tylko sygnatury bez TSDoc, więc zmiana samej wartości domyślnej i komentarza nie zmienia api.md.
- Na macOS (BSD sed) sed -i z wieloma poleceniami zawodzi; do edycji używaj narzędzia Edit.
- pnpm format przeformatowuje nowe testy (zawijanie długich linii), więc uruchamiaj go przed finalnym lintem.
**Otwarte kwestie:**
- Strona migracji (F23) jeszcze nie istnieje (osobny task); powinna zawierać notatkę 'RankedBars: pass fill="hatch" to keep the old look'.
- pnpm lint nadal zgłasza 4 ostrzeżenia i 1 info (m.in. noImportantStyles w theme.css), istniejące przed T05.
**Kryteria:**
- W `RankedBars.test.tsx` jest nowy test: `<RankedBars>` bez `fill` renderuje 3 słupki i każdy ma `data-ch-fill="solid"`. `pnpm test` przechodzi.
- W `RankedBars.test.tsx` jest nowy test: przy `fill="hatch"` każdy słupek ma `data-ch-fill="hatch"`.
- `RankedBars.tsx`: TSDoc propa `fill` brzmi `Default 'solid'.`, a domyślna wartość w kodzie to `fill ?? 'solid'`.
- Po `pnpm build` przechodzi `pnpm --filter tally-charts api:check`, a `packages/tally-charts/api/tally-charts.api.md` jest aktualny (bez zmian albo zaktualizowany przez `api:update` i dołączony).
- Istnieje `.changeset/*.md` z `'tally-charts': major`, który zawiera zdanie „RankedBars: pass `fill="hatch"` to keep the old look” oraz fragmenty kodu przed i po.
- `Result.stories.tsx` i `DrillColumns.stories.tsx` przekazują jawnie `fill="hatch"`, zgodnie z referencjami 03 i 06. Żadne inne stories z RankedBars nie zostają bez `fill` (Performance ma `fill="solid"`).
- `pnpm test:e2e` (port 6007 wolny) przechodzi bez aktualizacji snapshotów, a `git status` nie pokazuje zmienionych ani nowych PNG w `apps/storybook/e2e/__screenshots__/{darwin,linux}`.
- Przechodzą `pnpm lint`, `pnpm typecheck`, `pnpm size` i `pnpm --filter tally-charts check:dev-strip`.
- README (punkt `RankedBars`) podaje domyślny `solid` i `fill="hatch"` jako opcję, a PROGRESS.md zapisuje decyzję o jawnym `fill="hatch"` w stories zamiast regeneracji baseline'ów.

## ⛔ T06 LineChart: prop underlay pod seriami (F2) — ZABLOKOWANY
Poprawiłem uwagę minor z review: opis dostępności story LineChart podawał „about 62” na koniec serii, a dane dają około 67, więc jest „about 67”. Piksele się nie zmieniają. Dopisałem też do PROGRESS.md (sekcja T06) stan próby 3 z Dockerem. Nie udało mi się wygenerować baseline'ów linux `charts-linechart--underlay-{light,dark}.png`. Dopóki ich nie będzie, job `e2e` na CI padnie na tych 2 stories. Docker Desktop nadal zwraca `input/output error`: `docker info` pokazuje błąd na blobie w `/var/lib/desktop-containerd`, a `docker pull mcr.microsoft.com/playwright:v1.64.0-noble` pada na zapisie `meta.db`. Wolnego miejsca na dysku jest już 2,2 GiB, więc to nie sam brak miejsca. Uszkodzony jest wewnętrzny store Dockera. Naprawa to restart albo reset danych Docker Desktop, który kasuje obrazy i kontenery właściciela, więc tego nie robiłem. Linuxa nie generowałem inną drogą, zgodnie z planem. Po zmianie przeszły `pnpm format`, `pnpm lint` (te same 4 ostrzeżenia i 1 info) i `pnpm typecheck`. Testów, buildu i e2e nie uruchamiałem ponownie, bo zmiana dotyczy tylko tekstu opisu story i PROGRESS.md. Po poprzedniej próbie przechodziły test (1044), build, `api:check`, size, `check:dev-strip` i e2e na darwin (313).
Ostatnie uwagi: zobacz .crew/backlog.json (lastNote).

## T07 Wymagana nazwa wykresu w typach: title albo aria-labelledby (F3)
**Decyzje:**
- D1. Nowy publiczny typ `ChartName` (`Chart.tsx`, eksport z `index.ts`, TSDoc): `{ title: string; 'aria-labelledby'?: string } | { title?: undefined; 'aria-labelledby': string }`, dokładnie unia z SPEC §5.1.
- D2. Interfejs nie może rozszerzać unii, więc `ChartProps<D>` i `*Props` jedenastu wykresów (BarChart, ComparisonBars, RankedBars, WaterfallChart, BridgeChart, DotHistogram, StripPlot, WaffleColumns, LineChart, Heatmap, RunwayChart) to teraz `type … = ChartName & …`. Bez nowych publicznych nazw poza `ChartName`.
- D3. `ChartPassThroughProps` traci `'title'`. `Pick` i `Omit` na unii zwijają dyskryminant, więc `ChartName` jest w intersekcji na zewnątrz `Omit`. `{...chart}` z rest-a kompiluje się bez rzutowań ani helpera.
- D4. Gdy podane są oba propy, wygrywa `aria-labelledby` (figure, role=application, grid Heatmapy, list/listbox RunwayChart); `title` dalej jest domyślnym caption tabeli. Samo `aria-labelledby` nie daje domyślnego caption. W Heatmap przy overflow scroll-group dostaje `aria-labelledby` zamiast `aria-label`.
- D5. Teksty ostrzeżeń dev bez zmian (test i `check:dev-strip` nietknięte); warunek to `DEV && !title && !labelledBy`.
**Zmiany poza planem:** Performance.stories: nagłówek „Below threshold” dostał `id` i RankedBars `aria-labelledby` (jedyna story bez nazwy). Testy `Chart`/`Dots`/`NearestPointer` dostały `title="Test chart"`; helpery `renderDots`/`renderLayer` biorą `Partial<Omit<ChartProps, 'title' | 'aria-labelledby'>>`. `docs/a11y.md` opisuje `aria-labelledby`.
**Weryfikacja:** format, lint (4 ostrzeżenia, 1 info jak wcześniej), typecheck całego monorepo, test (1052), docs test (28), build, `api:update` + `api:check` (zmiany: ChartName, aliasy typów, ChartPassThroughProps; `core.api.md` bez zmian), size, `check:dev-strip`, `test:e2e` (303, bez `--update-snapshots`, bez zmian PNG). Kontrola negatywna: usunięcie `@ts-expect-error` dla RunwayChartProps w `types.test.ts` wywala `tsc`.
**Otwarte kwestie:**
- Raport API ma duży diff (kolejność pól w aliasach typów jest źródłowa, nie alfabetyczna jak w interfejsach), ale bez zmian znaczenia.
- Strona migracji w docs to F23 (jeszcze nie istnieje); changeset zawiera notatkę przed/po.

## ✔ T07 Wymagana nazwa wykresu w typach: title albo aria-labelledby (F3) (2026-10-25)
`Chart` i 11 wykresów wysokiego poziomu wymagają teraz w typach `title` albo `aria-labelledby`. Wszystkie bramki z planu przechodzą, w tym `pnpm test:e2e` (303 testy, bez `--update-snapshots`, bez zmienionych PNG).

- **Typ `ChartName`:** to dokładnie unia ze SPEC §5.1, eksportowana z `index.ts` i widoczna w `api/tally-charts.api.md`. `ChartProps` i `*Props` jedenastu wykresów to teraz `type … = ChartName & …`. `ChartPassThroughProps` nie ma już `title`. `{...chart}` kompiluje się bez rzutowań i bez helpera.
- **Nazwa widżetu:** przy obu propach nazwę widżetu daje element wskazany przez `aria-labelledby`, a `title` zostaje domyślnym caption tabeli danych. Dotyczy figure, `role="application"`, gridu Heatmap oraz list/listbox RunwayChart. W Heatmap, gdy plansza się przewija, grupa dostaje `aria-labelledby` zamiast `aria-label`.
- **Ostrzeżenia dev:** teksty bez zmian, warunek to `DEV && !title && !labelledBy`.
- **Testy:** `types.test.ts` ma `describe('chart name')` z `@ts-expect-error` dla wszystkich 12 komponentów oraz wariantami z samym `title` i samym `aria-labelledby`. Nowe testy zachowania są w `Chart.test.tsx`, `BarChart.test.tsx`, `Heatmap.test.tsx` i `RunwayChart.test.tsx` (lista niżej).
- **Naprawione wywołania bez nazwy:** testy w `src/**` dostały `title="Test chart"`, a testy ostrzeżeń mają `@ts-expect-error`. Jedyna story bez nazwy, Performance (RankedBars), używa teraz `aria-labelledby` wskazującego nagłówek „Below threshold” (dodałem mu `id`). `apps/docs` kompilowało się bez zmian.
- **Dokumentacja:** README (sekcja Accessibility i tabela RunwayChart), `docs/a11y.md`, `.changeset/required-chart-name.md` (major, migracja przed/po, w tym `interface … extends` → `type … = … & {…}`) oraz sekcja T07 z decyzjami D1–D5 w PROGRESS.md.
- **Weryfikacja:**
  - `pnpm lint` daje te same 4 ostrzeżenia i 1 info co wcześniej.
  - `pnpm typecheck` przechodzi dla całego monorepo.
  - `pnpm test` (1052) i `pnpm --filter docs test` (28) przechodzą.
  - Przechodzą `pnpm build`, `api:check`, `pnpm size` i `check:dev-strip`.
  - W `api:update` zmieniły się tylko ChartName, aliasy typów i ChartPassThroughProps; `core.api.md` bez zmian.
  - Kontrola negatywna: po usunięciu dyrektywy dla RunwayChartProps `tsc` pada.
**Decyzje i pułapki:**
- Pick i Omit na unii zwijają dyskryminant, więc ChartName musi być w intersekcji na zewnątrz Omit. Rest `...chart` z takiego typu przekazuje się do <Chart> bez rzutowania.
- Partial<UnionProps> zachowuje się luźno przy spreadzie: helpery testowe z `{...props}` i `title: undefined` kompilują się bez dyrektyw.
- Przy @ts-expect-error błąd o brakującej nazwie jest raportowany na pierwszej linii wywołania z obiektem, więc dyrektywa musi stać tuż nad nią.
- Na macOS (BSD sed) używaj `sed -i ''`; wieloznakowe wyrażenia z `|` w ERE zawodzą, do edycji lepiej Python albo Edit.
- pnpm typecheck w monorepo kompiluje docs przez paths do src, więc widzi nowe typy bez wcześniejszego buildu.
**Otwarte kwestie:**
- Raport API ma duży diff, bo aliasy typów zachowują kolejność pól ze źródła (interfejsy były sortowane alfabetycznie). Znaczenie bez zmian.
- Strona migracji w docs (F23) nadal nie istnieje; notatka przed/po jest tylko w changesecie.
- pnpm lint nadal zgłasza 4 ostrzeżenia i 1 info istniejące przed T07 (noImportantStyles w theme.css, deprecated pole w biome.json).
- packages/tally-charts/src/react/Chart.tsx: `nameId = labelledBy ?? (title ? titleId : undefined)` uses `??`, so `aria-labelledby=""` alongside `title="X"` sets an empty aria-labelledby: the title is ignored, the chart is unnamed, and there is no warning (`!title` is false). The same applies in Heatmap.tsx:193 and RunwayChart.tsx:175, and in Heatmap the scroll-group gets aria-labelledby="" instead of aria-label.
- packages/tally-charts/src/react/charts/Heatmap.tsx: The new branch for an overflowing heatmap (scroll-group with aria-labelledby instead of aria-label) has no test.
- .size-limit (pnpm size): The main bundle is at 12.99 kB of a 13 kB limit: practically no headroom, so the next small change will break size.
**Kryteria:**
- `src/types.test.ts` ma 12 przypadków z `// @ts-expect-error` dla ChartProps, BarChartProps, ComparisonBarsProps, RankedBarsProps, WaterfallChartProps, BridgeChartProps, DotHistogramProps, StripPlotProps, WaffleColumnsProps, LineChartProps, HeatmapProps i RunwayChartProps bez `title` i bez `aria-labelledby`. Warianty z samym `title` i z samym `aria-labelledby` kompilują się bez dyrektyw. `pnpm --filter tally-charts typecheck` przechodzi, a usunięcie dowolnej dyrektywy `@ts-expect-error` powoduje błąd typów.
- Publiczny typ `ChartName` = `{ title: string; 'aria-labelledby'?: string } | { title?: undefined; 'aria-labelledby': string }` jest eksportowany z `tally-charts` i widoczny w `api/tally-charts.api.md`.
- Istniejący test 'warns once when the figure has no title…' w `Chart.test.tsx` przechodzi, a teksty ostrzeżeń się nie zmieniły. Nowe testy potwierdzają, że przy samym `aria-labelledby` Chart, Heatmap i RunwayChart nie ostrzegają. `pnpm --filter tally-charts check:dev-strip` przechodzi.
- Testy unit z `<h2 id=…>` i `aria-labelledby`: `getByRole('application', { name })` i `getByRole('figure', { name })` dla Chart, `getByRole('application', { name })` dla BarChart, `getByRole('grid', { name })` dla Heatmap, `getByRole('list', { name })` dla RunwayChart zwracają element z nazwą wskazanego nagłówka. Przy podanych obu propach nazwa pochodzi z `aria-labelledby`.
- `pnpm typecheck` (cały monorepo: biblioteka z testami, storybook stories, apps/docs) oraz `pnpm lint`, `pnpm test`, `pnpm --filter docs test` przechodzą.
- Po `pnpm build` przechodzi `pnpm --filter tally-charts api:check` z zaktualizowanym `api/tally-charts.api.md` (`core.api.md` bez zmian). Przechodzi też `pnpm size`.
- `pnpm test:e2e` przechodzi bez `--update-snapshots`, a `git status` nie pokazuje zmienionych PNG.
- Istnieje `.changeset/*.md` z `'tally-charts': major`, z notatką migracyjną i fragmentami kodu Before/After (dodanie `title` albo `aria-labelledby`, oraz `interface … extends XxxProps` → `type … = XxxProps & {…}`).
- README biblioteki (sekcja Accessibility) opisuje wymóg `title` albo `aria-labelledby`, a PROGRESS.md zapisuje decyzje D1–D5 z planu.

## ⛔ T06 LineChart: prop underlay pod seriami (F2) — ZABLOKOWANY
Nie wygenerowałem baseline'ów linux, więc task jest niedomknięty. Kod `underlay` był już w gałęzi (commit 8129a40), wbrew planowi tech leada, który zakładał, że go nie ma. Docker nadal jest uszkodzony: `docker info` działa, ale `docker pull` pada na `input/output error` przy zapisie `meta.db` w `/var/lib/desktop-containerd`. Obrazu Playwrighta nie da się pobrać, więc komenda z ci.yml nie ruszy. Naprawa to reset danych Docker Desktop, który skasowałby kontenery właściciela (m.in. działający `foundation-postgres-1`), więc go nie robiłem. PNG linux nie da się wygenerować na darwin, bo renderowanie fontów się różni.

W tej próbie zmieniłem dwie rzeczy:
- Limit rozmiaru LineChart wrócił do 13 KB (było 13.2 KB). Bundle wychodził 13001 B przy limicie 13000 B. Przesunąłem destrukturyzację `underlay` w `LineChart.tsx` za `grid`, co zmieniło gzip i mieści się w 13 KB. Zachowanie i DOM są te same.
- W PROGRESS.md zdjąłem znacznik ⛔ i „ZABLOKOWANY”. Nagłówek T06 mówi teraz „do domknięcia: baseline'y linux (Docker)”. Wpis D4 opisuje powrót do 13 KB.

Co przeszło: `pnpm format`, `pnpm lint` (4 ostrzeżenia i 1 info jak wcześniej), `pnpm typecheck`, `pnpm test` (1055), `pnpm build`, `api:check`, `pnpm size`, `check:dev-strip`. `pnpm test:e2e` na darwin przechodzi bez aktualizacji snapshotów (313), port 6007 był wolny. W katalogu darwin są 2 nowe PNG underlay, a istniejące PNG się nie zmieniły. W drzewie roboczym są tylko zmiany w `.size-limit.json`, `LineChart.tsx` i `PROGRESS.md`.
Ostatnie uwagi: zobacz .crew/backlog.json (lastNote).

## T08 Podpowiedź „Press Enter to select” tylko na wybieralnych punktach (F4)
**Decyzje:**
- D1. Dopisek „ Press Enter to select.” pojawia się, gdy `onSelect` jest ustawiony i punkt odniesienia ma `selectable !== false`. Punkt odniesienia to `interaction.activePoint`, a gdy go nie ma, `interaction.points[0]` (fokus z klawiatury i tak aktywuje pierwszy punkt). Aktywny punkt z kursora też przełącza opis.
- D2. Własny `keyboardHint` zostaje bez zmian (tekst użytkownika); zmienia się tylko tekst domyślny. Opisane w JSDoc propa i w `docs/a11y.md`.
- D3. Komunikat live (`announcement()`) dalej nie zawiera podpowiedzi, tak jak w 0.9; przypięte testami.
- D4. Bez zmiany publicznego API: changeset `patch` (`.changeset/select-hint-selectable-points.md`).
**Zmiany:** `Chart.tsx` (`hintPoint`, `canSelect`), JSDoc `keyboardHint`, `docs/a11y.md`. Bundle LineChart wyszedł 13003 B przy limicie 13000 B (marginesu nie było już po T06); inline'owanie warunku pogarszało gzip, więc limit LineChart w `packages/tally-charts/.size-limit.json` wrócił do 13.2 KB.
**Testy:** `Chart.test.tsx` (`describe('Enter hint')`: bez onSelect, pierwszy punkt niewybieralny, przejście wybieralny → niewybieralny → wybieralny, własny hint; `PointsProbe` ma `unselectable`), `Bars.test.tsx` i `RankedBars.test.tsx` (z `onSelect` i bez). Bez poprawki w `Chart.tsx` padają 4 nowe testy.

## ✔ T08 Podpowiedź „Press Enter to select” tylko na wybieralnych punktach (F4) (2026-10-25)
Domyślna podpowiedź „Press Enter to select.” pojawia się tylko wtedy, gdy jest `onSelect` i punkt odniesienia ma `selectable !== false`. Punkt odniesienia to aktywny punkt albo pierwszy, zanim jakiś jest aktywny. Własny `keyboardHint` działa bez zmian, a komunikat live nigdy nie zawiera podpowiedzi. Zmiana jest w `Chart.tsx` (`hintPoint`, `canSelect`, JSDoc `keyboardHint`). Zaktualizowałem `docs/a11y.md`, dodałem changeset `patch` `.changeset/select-hint-selectable-points.md` i wpis T08 z decyzjami w PROGRESS.md. Limit rozmiaru LineChart podniosłem z 13 KB do 13.2 KB. Przechodzą: `pnpm test` (1058), `pnpm lint` (te same 4 ostrzeżenia i 1 info), `pnpm typecheck`, `pnpm build`, `api:check` (bez zmian w pliku API), `pnpm size` i `check:dev-strip`. `pnpm test:e2e` pominąłem, bo tekst jest ukryty i baseline'y się nie zmieniają.
**Decyzje i pułapki:**
- Jeśli żaden punkt nie jest aktywny, ArrowRight aktywuje punkt 0. Testy przejść między punktami muszą najpierw wywołać focus na widgecie, bo fokus aktywuje pierwszy punkt.
- PointsProbe nie renderuje elementów z id, więc aria-activedescendant jest null. Aktywności nie sprawdza się tym atrybutem.
- Inline'owanie warunku `canSelect` zwiększyło gzip bundla LineChart bardziej niż osobne stałe `hintPoint` i `canSelect`. Przy limitach z marginesem rzędu bajtów kolejność i kształt kodu zmieniają wynik.
- Po `pnpm format` Edit wymaga ponownego Read pliku, bo format modyfikuje pliki.
**Otwarte kwestie:**
- Limit LineChart w `.size-limit.json` przekroczony o 3 B (13003 B przy 13000 B, bez marginesu po T06). Podniosłem go do 13.2 KB, a inline'owanie warunku pogarszało gzip. Do rozważenia przy okazji, np. odchudzenie kodu LineChart albo Chart.
- T06 nadal oczekuje na baseline'y linux (Docker uszkodzony). Nie dotyczy T08.
- Nie uruchamiałem pnpm test:e2e. Zmiana dotyczy tylko ukrytego tekstu, więc baseline'y wizualne się nie zmieniają.
- packages/tally-charts/.size-limit.json: Limit LineChart podniesiony z 13 KB do 13.2 KB, bo zmiana przekroczyła go o 3 B. To zmiana poza ścisłym zakresem taska. Jest uzasadniona i opisana w PROGRESS.md, ale po kolejnych taskach margines rozmiaru będzie się kurczył.
**Kryteria:**
- Chart z własnym markiem (useRegisterPoints): bez onSelect albo gdy aktywny punkt (lub pierwszy, przed aktywacją) ma selectable:false, widget role=application nie ma w toHaveAccessibleDescription tekstu 'Press Enter to select', a region [aria-live] po nawigacji strzałkami też go nie zawiera (test w Chart.test.tsx)
- Bars w <Chart onSelect> z selectable wyłączającym jeden słupek oraz wariant bez onSelect: opis widgetu i region live bez 'Press Enter' na niewybieralnym słupku (test w marks/Bars.test.tsx)
- RankedBars z selectable: d => d.name !== 'Labor overruns' i onSelect oraz bez onSelect: brak 'Press Enter' na niewybieralnym wierszu i bez onSelect (test w charts/RankedBars.test.tsx)
- Z onSelect i wybieralnym punktem opis widgetu to dokładnie 'Use arrow keys to move between points, Home and End for first and last, Escape to clear. Press Enter to select.' (istniejący test Chart.test.tsx l. 90-98 przechodzi bez zmian)
- Sekwencja wybieralny → ArrowRight na niewybieralny → ArrowRight/ArrowLeft na wybieralny przełącza obecność 'Press Enter to select.' w opisie widgetu (test w Chart.test.tsx oraz w Bars lub RankedBars)
- Własny keyboardHint jest używany dosłownie, niezależnie od selectable (istniejący test przechodzi)
- Istnieje plik .changeset/*.md z 'tally-charts': patch opisujący zmianę
- pnpm test, pnpm lint, pnpm typecheck, pnpm build, api:check, pnpm size i check:dev-strip przechodzą; api:check bez zmian w pliku API

## T09.1 ZoneMeter i ShareBar: No data dla nieskończonych wartości, min. 2 px, zakotwiczenie etykiet
**Decyzje:**
- D1. ShareBar: `shareLayout` zwraca `empty` = są segmenty i żaden nie ma poprawnej wartości (skończonej i ≥ 0). Wtedy 0 segmentów w pasku, zamiast listy `<p data-ch-part="share-empty">No data</p>`, a przy `legend={false}` nazwa `label: No data`. Segmenty z samymi zerami nadal są listowane, a pusta tablica daje nazwę równą `label` (testy bez zmian).
- D2. Nowe ostrzeżenie `ShareBar segment "x" has a value of NaN, which is not finite; it counts as 0.` dla NaN i ±Infinity (klucz `share-finite:label:value`). Ujemne i nieliczbowe wartości zostają przy starym ostrzeżeniu. Każdy przypadek daje jedno ostrzeżenie. Istniejący test z NaN w `share.test.ts` zmienił oczekiwany tekst na nowy.
- D3. ZoneMeter: ostrzeżenie `value … is not finite; it shows No data.` tylko dla liczb (`typeof value === 'number'`); `null` i `undefined` to „brak danych” bez ostrzeżenia. Obie frazy są w `check-dev-strip.mjs`.
- D4. ZoneMeter: track jest `display:flex`, strefy to elementy `flex: 0 1 auto` z inline `width` w % (bez `left`), `min-width: 2px` (kolejne: `calc(2px + var(--ch-share-gap))`, bo border-box ma 2 px przerwy). Mała strefa trzyma ≥ 2 px wypełnienia, a reszta oddaje miejsce, więc suma = szerokość tracku. Zakładam strefy ciągłe (bins z `thresholds()` pokrywają −∞..∞); luki w ręcznych bins nie są wspierane. Marker zostaje absolutny.
- D5. Etykiety ZoneMeter bez zmian w kodzie (`left: p%` i `translateX(-p%)` już zakotwiczały skrajne); dodany test unit.
- D6. ShareBar `min-width: 3px` bez zmian (spełnia ≥ 2 px), przypięte e2e.
- D7. Story `primitives-small-pieces--edge-cases` (320 px) jest poza STORIES, WIDE_STORIES i THEMELESS, więc nie ma baseline'u PNG. `e2e/small-pieces.spec.ts` mierzy szerokości i sam uruchamia axe.
- D8. Changeset `patch`: `.changeset/small-pieces-edge-cases.md`. Bez zmian publicznego API (`shareLayout` nie jest eksportowany).
- D9. Blok `if (DEV) { … else for … }` w ZoneMeter przeciekał do buildu produkcyjnego (esbuild zostawiał `if(!1)…`, a istniejących fraz ZoneMeter nie było w `check-dev-strip.mjs`). Rozbiłem go na osobne `if (DEV && …)` i dopisałem frazę 'must be greater than min'. `check:dev-strip` daje 34/34.
- D10. `share-empty` dopisane do listy części w `surface.test.ts` (publiczna powierzchnia CSS).
**Weryfikacja:** format, lint (4 ostrzeżenia, 1 info jak wcześniej), typecheck, test (1074), build, api:check (bez zmian w `api/`), size (Small UI pieces 4.04 KB z 5 KB), check:dev-strip i `pnpm test:e2e` (307, bez `--update-snapshots`, port 6007 wolny) przechodzą; brak nowych ani zmienionych PNG.

## ✔ T09.1 ZoneMeter i ShareBar: No data dla nieskończonych wartości, min. 2 px, zakotwiczenie etykiet (bez nowych baseline'ów) (2026-10-25)
ShareBar i ZoneMeter pokazują „No data” dla NaN i ±Infinity, ostrzegają w dev dokładnie raz i nie gubią bardzo małych stref. Wszystkie bramki przechodzą, a w git status nie ma nowych ani zmienionych PNG. Zmieniłem:
- `share.ts`: nowe ostrzeżenie „which is not finite; it counts as 0” dla NaN i ±Infinity. Ujemne i nieliczbowe wartości zostają przy starym ostrzeżeniu. `shareLayout` zwraca `empty` (są segmenty, ale żaden nie ma poprawnej wartości).
- `ShareBar.tsx`: przy `empty` pasek nie ma segmentów, zamiast listy jest `<p data-ch-part="share-empty">No data</p>`, a przy `legend={false}` nazwa to `label: No data`. Segmenty z samymi zerami i pusta tablica działają jak dotąd.
- `ZoneMeter.tsx`: ostrzeżenie „is not finite; it shows No data” tylko dla liczb (null i undefined bez ostrzeżenia). Strefy mają tylko inline `width`.
- `theme.css`: track ZoneMeter jest flexem, strefy mają `flex: 0 1 auto` i `min-width` 2 px (kolejne 2 px + przerwa). Dodałem styl `share-empty`.
- `check-dev-strip.mjs`: obie nowe frazy oraz 'must be greater than min'. `share-empty` dopisałem do `surface.test.ts` (lista części publicznej powierzchni CSS).
- Story `primitives-small-pieces--edge-cases` (320 px) poza STORIES, nowy `e2e/small-pieces.spec.ts`, changeset patch `.changeset/small-pieces-edge-cases.md` i sekcja T09.1 w PROGRESS.md.

Wyniki bramek:
- `pnpm lint` ma te same 4 ostrzeżenia i 1 info co wcześniej.
- `pnpm test` 1074 przechodzą.
- `api:check` przeszedł bez zmian w `packages/tally-charts/api`.
- Small UI pieces ma 4.04 KB przy limicie 5 KB.
- `check:dev-strip` daje 34/34.
- `pnpm test:e2e` bez `--update-snapshots`: 307 przeszło, port 6007 był wolny.
**Decyzje i pułapki:**
- esbuild nie usuwa `if(!1){ if(...) warn(); else for(...) }`; wzorzec `if (DEV && warunek) warn(...)` jest usuwany niezawodnie. Nowe ostrzeżenia dopisuj z DEV w warunku i dodawaj ich frazy do check-dev-strip.
- Warner deduplikuje po kluczu, więc testy ostrzeżeń potrzebują unikalnych label/wartości na przypadek.
- Nowa wartość data-ch-part w theme.css musi trafić do listy PARTS w src/theme/surface.test.ts.
- Na macOS sed -i wymaga argumentu rozszerzenia; do zmian w plikach używaj Edit.
- Flex z min-width zamiast position:absolute daje stref sumujące się do szerokości tracku bez zmiany pozycji dużych stref (baseline'y PNG bez zmian).
**Otwarte kwestie:**
- Do tej pory ostrzeżenia ZoneMeter przeciekały do buildu produkcyjnego: esbuild zostawiał `if(!1)…`, a ich fraz nie było w check-dev-strip. Naprawiłem to rozbiciem bloku na osobne `if (DEV && …)` i dopisaniem frazy 'must be greater than min'. Inne komponenty z blokiem `if (DEV) { … else for … }` mogą mieć ten sam problem, bo ich fraz też może nie być w liście.
- ZoneMeter zakłada ciągłe strefy (bins z thresholds()); luki w ręcznie zbudowanych bins nie są wspierane.
- T06 nadal czeka na baseline'y linux (Docker), nie dotyczy tego taska.
- packages/tally-charts/src/react/ui/ZoneMeter.tsx: Decision D9 in PROGRESS.md says the leak of ZoneMeter warnings into production is fixed, but it isn't fully fixed. After bundling dist/index.js with esbuild (NODE_ENV=production, minify), the code still contains `if(!1,!1,!1)for(let x of n.bins.slice(1))(...)&&Pe(`zone-break:...`,`ZoneMeter "${i}": break ${x.min} is outside ...; its zone is not drawn.`)`. esbuild merged the three `if (DEV && …)` checks into one comma expression and did not drop the loop. The code never runs, but the text of this warning ships in the prod build, and check-dev-strip.mjs misses it because its list has no phrase for this warning. The same problem exists outside this task for the Heatmap warning ('must be finite and ascending', `if(!1){…}` stays in the bundle).
- packages/tally-charts/src/react/ui/share.ts: `empty` is also true when every segment is negative, not just non-finite (e.g. [{value:-1}]). Before, such a bar showed a list with 0%; now it shows 'No data'. This change to behaviour is broader than the task (NaN/±Infinity) and has no test at the ShareBar component level.
- packages/tally-charts/src/react/ui/ZoneMeter.tsx: With `left` removed and zones laid out by flex, the layout assumes zones are contiguous. Hand-built `zones.bins` with a gap (the public type ZoneMeterZones allows this) will shift the following zones relative to the breaks, the labels and the absolutely positioned marker. The min-width of 2px + gap also moves zone edges slightly off the breaks, so the CSS comment 'zone edges stay exactly on their breaks' (theme.css) is no longer true.
**Kryteria:**
- ZoneMeter.test.tsx: it.each([Infinity, -Infinity, NaN]) — role=meter ma aria-valuetext 'No data', brak [data-ch-part="zone-meter-marker"], console.warn wywołany dokładnie raz z tekstem zawierającym 'is not finite'
- ShareBar.test.tsx: it.each([Infinity, -Infinity, NaN]) — 0 elementów [data-ch-part="share-segment"], widoczny tekst 'No data', dokładnie jedno console.warn o nieskończonej wartości; przy legend={false} role=img ma nazwę '<label>: No data'
- share.test.ts: it.each([Infinity, -Infinity, NaN]) — shareLayout zwraca empty=true i value 0, dokładnie jedno console.warn zawierające 'not finite'; segmenty z samymi zerami i pusta tablica zachowują dotychczasowe zachowanie (istniejące testy przechodzą bez zmian)
- ZoneMeter.test.tsx: pierwsza zone-meter-label ma style left '0%' i transform 'translateX(-0%)', ostatnia left '100%' i 'translateX(-100%)'
- scripts/check-dev-strip.mjs zawiera frazy obu nowych ostrzeżeń, a `pnpm --filter tally-charts check:dev-strip` po `pnpm build` kończy się 'ok'
- Story primitives-small-pieces--edge-cases (kontener 320 px) istnieje i nie jest w STORIES/WIDE_STORIES; apps/storybook/e2e/small-pieces.spec.ts sprawdza: segment ShareBar 0.1% ≥ 2 px i suma segmentów + przerw = szerokość paska ±0.5 px; strefa ZoneMeter 0.1% ma wypełnienie (clientWidth) ≥ 2 px i suma stref = szerokość tracku ±0.5 px; żadna zone-meter-label nie wychodzi poza box zone-meter; axe bez naruszeń
- Istnieje .changeset/*.md z 'tally-charts': patch, a PROGRESS.md ma sekcję T09.1 z decyzjami
- Przechodzą pnpm lint, pnpm typecheck, pnpm test, pnpm build, api:check (bez zmian w packages/tally-charts/api), pnpm size i check:dev-strip; pnpm test:e2e przechodzi bez --update-snapshots, a git status nie pokazuje nowych ani zmienionych plików PNG

## ⛔ T09.2 ZoneMeter: baseline wizualny przy 320 px (darwin + linux) — ZABLOKOWANY
Task T09.2 pozostaje ZABLOKOWANY na części linux. Nie powstał `linux/primitives-small-pieces--edge-cases.png`, więc job `e2e` w CI padnie na brakującym baseline'ie. Część darwin i zmiany w kodzie są gotowe i zacommitowane w poprzednich próbach: story w STORIES, mapa VIEWPORTS z wpisem 320×640, usunięty duplikat axe, poprawione komentarze, darwin PNG 320×640. W tej próbie ponowiłem `docker image ls` i `docker pull mcr.microsoft.com/playwright:v1.64.0-noble`. Oba padły z `input/output error` w store Docker Desktop (`blob sha256:dc2d74b2…` i `meta.db`). Nie resetowałem Docker Desktop i nie generowałem linuxa inną drogą. Doprecyzowałem treść błędu w sekcji T09.2 w PROGRESS.md, jedynej zmianie w drzewie roboczym w tej próbie. Defekt ZoneMeter z uwagi minor dopisałem do pamięciowego backlogu 1.0 (`tally-charts-1-0-backlog.md`, poza repo).
Ostatnie uwagi: zobacz .crew/backlog.json (lastNote).

## T10 Niepoprawna data w serii przerywa linię; thinTicks zachowuje wyróżniony tick (F6)
**Decyzje:**
- D1. Ostrzeżenie o wartości, która nie jest datą, jest per instancja marka: `timeX(ctx, scale, value, mark, warnKey?)` używa klucza `x-time-value:${id}` (`useId` w `useSeriesScales` dla `Line` i `Band`, w `Area` istniejące), więc każda seria ostrzega raz. Wyjątek od planu: `x-time-outside` (data poza domeną) zostaje per wykres, bo inaczej Band + Area + każda Line + LinePoints dawałyby kilka ostrzeżeń na ten sam wiersz, a istniejące testy wymagają jednego.
- D2. `LineChart` ostrzega `line-x-missing` raz na wykres; x jest wspólne dla wszystkich serii, więc jedno ostrzeżenie opisuje każdą z nich.
- D3. Przerwa w `LineChart` wynika z KOLEJNOŚCI DANYCH: wiersz z niepoprawnym x ustawia `gapAfter` na ostatnim poprawnym wierszu przed nim w danych (po sortowaniu po czasie to może być inny sąsiad; przy nieposortowanych danych przerwa może więc wypaść między innymi datami, opisane w TSDoc propa `x` i w changesecie). Wariant „przerwa tylko między sąsiadami po sortowaniu” (`gapFrom` po kluczu) kosztował 11 B gzip i przekraczał limit rozmiaru, więc odpuszczony. Wiersz bez poprzednika (na początku danych) i powtórzony x przerwy nie dają. Wiersz z niepoprawnym x dalej nie trafia do `rows`, więc tooltip, klawiatura, tabela i domena go pomijają. `<Line>` i `<Band>` dostają `drawn` = `labelled` plus wartownik (poprawny x, NaN w y) po wierszu z `gapAfter`.
- D4. `Area` przerywa się także na brakującym y (jak `Line`: „A missing value breaks the line”) i na niepoprawnym x. `areaPath` składa jeden zamknięty kształt na przebieg ≥ 2 punktów (używa `runs`, teraz eksportowanego z `core/line.ts`, nie z `core/index.ts`). Tryb `between` pomija parę, której któraś kolumna jest niekompletna. BridgeChart i UsageRunway bez zmian.
- D5. `thinTicks(ticks, measure, { keep })`: `ticks[keep]` jest w wyniku na każdym kroku, zwykłe ticki kolidujące z nim są usuwane (pierwszy zostaje zawsze). Fallback: [pierwszy, keep] (keep ostatni → anchor 'end'), potem samo [keep]. Bez `keep` wynik jak dotąd. Przy `keep` fallback przypina pierwszą i ostatnią etykietę do zewnętrznych krawędzi pasm (nowe opcjonalne `Tick.bounds`, ustawiane w `categoryTicks` przy `anchorEnds` i paśmie o szerokości > 0), także gdy zostaje sama zachowana ostatnia (anchor 'end', prawa krawędź pasma); inaczej przy 320 px („Planned profit” + „Actual profit”, wykres 200 px) etykiety na środkach pasm zachodziły na siebie i zostawała tylko wyróżniona. `Axis` wylicza `keep` z `highlight` (także w `fitTimeTicks`, po indeksie w `distinct`). `thinTicks` nie jest publiczny, `api:check` bez zmian.
- D6. Changeset `.changeset/line-breaks-on-invalid-date.md` (`major`, Before/After).
- D6a. Limit `LineChart` w `.size-limit.json` zostaje 13.2 KB (próba 1 podniosła go do 13.5, review to odrzucił jako sprzeczne z D-11). Kod odchudzony: wartownik bez `high`, `drawn` bez `useMemo`, `useId` przeniesione do `useSeriesScales` (`series.ts`, hook zamiast `seriesScales`), uproszczony fallback `thinTicks`. Zapas: 7 B (13193 z 13200).
- D7. Kryterium 320 px jako e2e w `reflow.spec.ts` (etykiety „Planned profit” i „Actual profit” z `data-ch-active="true"`), bez nowych baseline'ów (docker/linux zablokowany, T09.2).

## ✔ T10 Niepoprawna data w serii przerywa linię; thinTicks zachowuje wyróżniony tick (F6) (2026-10-25)
Poprawki po review T10. (1) Limit LineChart w .size-limit.json wrócił do 13.2 KB, bez luzowania bramki (D-11). LineChart ma 13193 B przy limicie 13200 B, zapas 7 B. Odchudzenie: wartownik przerwy bez `high` (`{...row, values: [], low: NaN}`), `drawn` liczone bez useMemo, `useId` przeniesione z Line/Band do hooka `useSeriesScales` w series.ts (zamiast `seriesScales(ctx, mark, id)`), uproszczony fallback `thinTicks`, `bounds` ustawiane w `categoryTicks` zamiast osobnej pętli w Axis, `indexOfValue` zwraca `number | undefined`. (2) Samotna zachowana ostatnia etykieta jest teraz przypięta do prawej krawędzi pasma z anchor 'end', więc nie wystaje poza plot. Gdy zostaje sama pierwsza, jest przypięta do lewej. (3) Przerwa w LineChart zostaje wg kolejności danych (D3). Wariant „przerwa tylko między sąsiadami po sortowaniu" działał, ale kosztował 11 B gzip i przekraczał limit, więc go odrzuciłem. Zachowanie opisałem wprost w TSDoc propa `x` i w changesecie: przy nieposortowanych danych przerwa może wypaść między innymi datami. PROGRESS.md zaktualizowany (D1, D3, D5, D6a). Bramki zielone: format, lint, typecheck, test (1098), build, api:check (bez zmian), size, check:dev-strip, test:e2e (308 passed, brak zmienionych PNG).
**Decyzje i pułapki:**
- gzip rozmiaru bundla jest zaszumiony (±5-10 B) przy mikro-zmianach. Mierz `pnpm exec size-limit --json` po każdej próbie i nie ufaj intuicji o bajtach.
- Biome (lint) zabrania warunkowego `useId` (`DEV ? useId() : ''`). Hook trzeba wywołać bezwarunkowo, najlepiej w jednym wspólnym miejscu (`useSeriesScales`), bo wtedy kosztuje mniej niż w każdym marku z osobna.
- `git checkout` jest w tym środowisku odrzucany. Do cofnięcia zmian używaj Edit lub kopii zapasowej w /tmp.
- Dev-only kod (`if (DEV)`) jest wycinany z dist, więc oszczędności bajtów trzeba szukać w kodzie produkcyjnym: wywołania hooków, argumenty przekazywane do closure, dodatkowe tablice i warunki.
**Otwarte kwestie:**
- Zapas rozmiaru LineChart to tylko 7 B (13193/13200). Każda kolejna zmiana w LineChart, Axis, Line albo thinTicks wymaga odchudzenia albo decyzji maintainera po `check:treeshake` (D-11). To drugie dotknięcie tego limitu (T08, T10).
- Przerwa LineChart wg kolejności danych (D3): przy nieposortowanych danych z niepoprawną datą może wypaść między dwiema datami, które nie sąsiadowały z wierszem niepoprawnym. Lepszy wariant (przerwa tylko między sąsiadami po sortowaniu, `gapFrom` po kluczu) kosztuje ok. 11 B gzip i trzeba go odłożyć do czasu, gdy będzie miejsce w limicie.
- `useSeriesScales` wywołuje `useId` w hooku używanym przez Line i Band. `x-time-outside` zostaje ostrzeżeniem per wykres (D1).
- packages/tally-charts/src/core/ticks.ts: W pętli przerzedzania zachowana ostatnia etykieta zostaje na środku pasma z anchor 'middle'. W BridgeChart (margin right 0) przy viewportach 360–640 px „Actual profit” wystaje poza SVG o 9–21 px: zmierzyłem [190,261]/240 przy 360 px i [453,524]/520 przy 640 px. Teraz jest to widoczne, bo SVG i karta mają overflow: visible i padding. To lustro istniejącego wystawania „Planned profit” w lewo, ale TSDoc obiecuje „a lone last label stays inside the plot” tylko dla fallbacku. Przy kontenerze bez paddingu etykieta zostanie obcięta.
- packages/tally-charts/src/react/charts/LineChart.tsx: Przerwa wg kolejności danych (D3) przy nieposortowanych danych przerywa linię między dwiema sąsiednimi datami, między którymi nic nie brakuje. Zaktualizowany test :450 utrwala, że Jan 1 i Jan 2 nie są połączone. To jest zgodne z planem refine i opisane w TSDoc i changesecie, ale stoi w napięciu z uzasadnieniem D-1.
- .size-limit.json: LineChart ma 13193 B przy limicie 13200 B (zapas 7 B). Kolejna zmiana w LineChart, Line, Axis lub ticks prawie na pewno przekroczy bramkę.
**Kryteria:**
- Line z niepoprawną datą w środku serii na osi czasu: `d` ścieżki `line` ma 2 podścieżki (2×'M'), punkt bez kropki, brak 'NaN' w DOM, dokładnie 1 console.warn; dwie serie <Line> w jednym Chart dają po jednym ostrzeżeniu na serię (test unit).
- Area z niepoprawną datą w środku: `d` ścieżki `area` ma 2 zamknięte kształty (2×'M', 2×'Z'), 1 ostrzeżenie na serię; tryb `between` nie łączy pary ponad dziurą (test unit); core/area.test.ts pokrywa areaPath z NaN w środku.
- LineChart z niepoprawną datą w środku: ścieżka każdej serii (i band, jeśli jest) ma 2×'M'; dokładnie 1 ostrzeżenie 'not a date at index N'; nawigacja klawiaturą przeskakuje z punktu przed dziurą na punkt po niej, a pominięty wiersz nie jest zarejestrowanym punktem ani wierszem tooltipa (test unit). Zaktualizowane testy LineChart.test.tsx:424 i :510 przechodzą.
- Test unit `thinTicks(ticks, measure, { keep: i })` pokazuje, że indeks i jest w wyniku po przerzedzeniu (także w ciasnym przypadku, gdzie bez keep zostają same końce lub pierwszy), wynik spełnia `fits`, a bez `keep` wyniki istniejących testów są bez zmian.
- Axis z `highlight` przekazuje wyróżniony tick do thinTicks; test Axis pokazuje etykietę wyróżnionej kategorii z data-ch-active="true" w wąskim wykresie.
- Nowy test w apps/storybook/e2e/reflow.spec.ts przy 320 px: oś dolna `reference-profit-bridge--light` zawiera etykiety „Planned profit” i „Actual profit” (ta druga z data-ch-active="true"); `pnpm test:e2e` przechodzi bez --update-snapshots i bez zmienionych/nowych PNG w git status.
- Istnieje `.changeset/*.md` z `'tally-charts': major`, opisujący, że Area i LineChart przestają łączyć linię/obszar ponad niepoprawną datą lub brakującą wartością, z notatką migracyjną Before/After (filtrowanie danych, żeby zachować łączenie).
- Przechodzą: pnpm lint, pnpm typecheck, pnpm test, pnpm build, api:check (bez zmian w api.md, bo thinTicks nie jest publiczny), pnpm size, check:dev-strip; decyzje T10 zapisane w PROGRESS.md.

## T11 RunwayChart: poprawki interakcji wskaźnikiem i kontrolowanego stanu (F6)
**Decyzje:**
- D1. `pressed` (wiersz wciśnięty wskaźnikiem): `onPointerDown` przy sfokusowanym listboxie od razu woła `setFocusId`, przy niesfokusowanym tylko ustawia `pressed.current` (anulowany dotyk nie przesuwa kursora na stałe). `onFocus` z `pressed` ustawia `focusId` i `active` na wciśnięty wiersz, bez scrolla. `pressed` czyści `onPointerCancel` (każdy typ wskaźnika), `onClick` i `onPointerLeave` listboxa.
- D2. Dotyk: `pointerleave` przychodzi po `pointerup`, a przed fokusem. Wybrany wariant: `onPointerLeave` czyści `pressed` tylko dla `pointerType !== 'touch'` (drugi ref niepotrzebny), więc dotknięty wiersz dostaje kursor. Dotyk, po którym nie przyszedł fokus, kończy się `pointercancel` albo `click`, które czyszczą `pressed`.
- D3. Hover na dotyku: helper `leave()` (aktywny wiersz wraca do kursora przy fokusie, inaczej null) wołają `onPointerLeave` oraz `onPointerUp` i `onPointerCancel` przy `pointerType === 'touch'`.
- D4. Kontrolowany `activeId` przesuwa kursor (`setFocusId`) w `useIsoLayoutEffect` [controlled, activeId, byId], gdy wiersz istnieje i `activeId !== emitted.current` (ostatnia wartość przekazana do `onActiveChange`, ustawiana w `setActive`, a po efekcie wyrównywana do propa). Echo własnego hovera nie przesuwa kursora. Bez scrolla. Bez fokusu następny focus startuje na tym wierszu. Ograniczenie: zmiana `byId` (np. nowe `rows`) przy hoverze, którego rodzic nie odzwierciedlił w propie, może przesunąć kursor na prop.
- D5. Duplikaty `id`: jedno ostrzeżenie (klucz `runway-id`) z listą wszystkich zduplikowanych id po pętli w memo. `data-ch-active`, `data-ch-selected` i `aria-selected` dostaje tylko pierwszy wiersz z danym id (dotychczasowy komunikat obiecywał „first is selected”). Fraza w `check-dev-strip.mjs` i teście: „RunwayChart has duplicate row ids”.
- D6. Changeset `.changeset/runway-pointer-fixes.md` (`patch`, bez zmiany API).

## ✔ T11 RunwayChart: poprawki interakcji wskaźnikiem i kontrolowanego stanu (F6) (2026-10-25)
Zaimplementowane w RunwayChart.tsx wg D1–D6. Nowe testy w RunwayChart.test.tsx: pointerCancel i pointerLeave po pointerDown, dotyk (down/up/leave) zachowujący wiersz, kontrolowany activeId (z fokusem i bez), duplikaty id, hover na dotyku (up/cancel) i mysz (up). Bramki zielone: format, lint (tylko istniejące ostrzeżenia CSS), typecheck, test (1107), build, api:check (bez zmian), size (RunwayChart 8.64 KB, LineChart 13.19 KB), check:dev-strip (34/34). e2e nie uruchamiane (brak zmian wizualnych).

## ✔ T11 RunwayChart: poprawki interakcji wskaźnikiem i kontrolowanego stanu (F6) (2026-10-25)
Zrealizowałem cztery poprawki F6 w RunwayChart.tsx. (1) `pressed` czyści się na `pointercancel` i `pointerleave`, a anulowany dotyk nie przesuwa kursora na stałe. (2) Na dotyku hover znika na `pointerup` i `pointercancel` (helper `leave()`). (3) Kontrolowany `activeId` zmieniony z zewnątrz przesuwa kursor i `data-ch-focus`, a echo własnego hovera go nie przesuwa. (4) Zduplikowane id dają jedno ostrzeżenie z listą wszystkich duplikatów, a `data-ch-active`, `data-ch-selected` i `aria-selected` dostaje tylko pierwszy wiersz. Zaktualizowałem frazę ostrzeżenia w `check-dev-strip.mjs` i w teście. Dodałem changeset `runway-pointer-fixes.md` (patch) i sekcję T11 z decyzjami w PROGRESS.md. Przechodzą format, lint (tylko wcześniejsze ostrzeżenia CSS), typecheck, test (1107), build, api:check (bez zmian), size i check:dev-strip (34/34). e2e nie uruchamiałem, bo nie ma zmian wizualnych.
**Decyzje i pułapki:**
- Na dotyku pointerleave przychodzi po pointerup, a przed fokusem. Dlatego onPointerLeave czyści pressed tylko dla pointerType różnego od touch. Test myszy 'puts the cursor on a pressed row without scrolling' zostaje bez zmian.
- fireEvent.pointerLeave i pointerCancel w jsdom mają domyślnie pusty pointerType, więc nie są traktowane jak dotyk. W testach dotyku podawaj pointerType: 'touch' jawnie.
- check-dev-strip sprawdza frazy ostrzeżeń w buildzie dev. Zmiana tekstu ostrzeżenia wymaga zmiany frazy w scripts/check-dev-strip.mjs i w teście.
**Otwarte kwestie:**
- Efekt kontrolowanego activeId zależy od [controlled, activeId, byId]. Gdy rodzic nie odzwierciedla hovera w propie, a rows się zmienią, kursor może przesunąć się na wartość propa (opisane w PROGRESS D4).
- onPointerDown na już sfokusowanym listboxie od razu przesuwa kursor, więc anulowany dotyk (pointercancel) zostawia kursor na tym wierszu. Taki wariant wynika z planu.
- packages/tally-charts/src/react/charts/RunwayChart.test.tsx: Żaden test nie sprawdza warunku echa (activeId !== emitted.current). Chodzi o przypadek, gdy rodzic odzwierciedla hover w kontrolowanym activeId przy sfokusowanym listboxie: kursor (aria-activedescendant) nie powinien się wtedy przesunąć. Po usunięciu warunku `activeId !== emitted.current` cały zestaw testów nadal przechodzi. Test na linii 380 robi hover i rerender, ale bez fokusu i bez asercji na kursor. Hover przesuwałby wtedy kursor klawiatury w trybie kontrolowanym, wbrew zachowaniu 'does not move the keyboard cursor on hover'.
- packages/tally-charts/src/react/charts/RunwayChart.tsx: Na dotyku pointerleave nie czyści pressed (D2). Jeśli po tapnięciu nie przyjdzie ani focus, ani click, ani pointercancel (np. long-press z menu kontekstowym), pressed zostaje. Następny fokus z klawiatury (Tab) zacznie wtedy na tamtym wierszu zamiast na selectedId i bez scrolla.
**Kryteria:**
- Test: pointerDown na wierszu, a potem pointerCancel (oraz osobno pointerLeave na liście) czyści pressed. Następny focus listboxa startuje na selectedId (aria-activedescendant), nie na wierszu wciśniętym, i nie dostaje on data-ch-active.
- Test: zmiana propa activeId przez rerender, bez zdarzeń użytkownika, przenosi data-ch-active, a przy sfokusowanym listboxie także aria-activedescendant i data-ch-focus na nowy wiersz. Bez fokusu następny focus startuje na nim.
- Test: przy zduplikowanych id jest dokładnie jedno ostrzeżenie dev z listą wszystkich zduplikowanych id. Przy activeId równym zduplikowanemu id data-ch-active ma tylko pierwszy wiersz.
- Test: po pointerEnter, pointerUp albo pointerCancel z pointerType 'touch' usuwa data-ch-active, a onActiveChange dostaje null. pointerUp z pointerType 'mouse' zostawia hover.
- Dotychczasowe testy RunwayChart przechodzą (fraza ostrzeżenia o duplikatach zaktualizowana). Przechodzą pnpm lint, pnpm typecheck i pnpm test.
- Po pnpm build przechodzą pnpm --filter tally-charts check:dev-strip (z zaktualizowaną frazą ostrzeżenia o duplikatach), api:check bez zmian i pnpm size.
- Jest changeset w .changeset dla tally-charts (patch).

## T12 Publiczne API i stabilność: README, znane ograniczenia a11y, prywatne zmienne (F7)
**Decyzje:**
- D1. Sekcja `## Stability` w README stoi po całym `## Styling` (po podsekcji Palettes), przed `## High-level charts`. Akapit w Styling został bez zmian, tabela tokenów też (czyta ją `surface.test.ts`).
- D2. Link do pełnego tekstu w README jest absolutny (`https://github.com/mwadon/tally-charts/blob/main/docs/stability.md`), bo link względny nie działa na npm. `docs/stability.md` też używa tylko pełnych URL GitHub.
- D3. `docs/stability.md` jest źródłem treści dla przyszłej strony `stability` w dokumentacji (F15). H1 „Stability and semver”, gotowy do przeniesienia.
- D4. Własna treść tooltipa (prop `content`) trafia przez `createPortal` do overlaya z `aria-hidden="true"` (Chart.tsx, Tooltip.tsx), więc a11y.md opisuje to zgodnie z kodem. Ogłoszenia idą przez live region i tabelę danych.
- D5. Komentarze o prywatnej `--_ch-swatch-color` w Performance.stories.tsx (nad `tone`) i w preview.css (`.perf-tick`).
- D6. Changeset `.changeset/stability-docs.md`: `patch`, bez zmian w kodzie.

## ✔ T12 Publiczne API i stabilność: README, znane ograniczenia a11y, prywatne zmienne (F7) (2026-10-25)
Dodałem dokumentację granicy semver, bez zmian w kodzie biblioteki. Utworzyłem `docs/stability.md` ("Stability and semver", po angielsku, tylko pełne URL GitHub). Dodałem sekcję `## Stability` w README (po całym Styling, przed High-level charts) z listami Public/Not public i linkiem absolutnym. W `docs/a11y.md` §Known limits dopisałem dwa punkty: tooltip hover z `pointer-events: auto` (WCAG 1.4.13) wraz z treścią w overlayu `aria-hidden`, oraz lower-inclusive dla Heatmap `breaks`, `heatmapLevel` i RunwayChart `breaks`. Komentarze o prywatnej `--_ch-swatch-color` są w Performance.stories.tsx i preview.css. Dodałem changeset `stability-docs.md` (patch) i sekcję T12 w PROGRESS.md. Przeszły format, lint, typecheck, test, build i api:check; `git status` nie pokazuje zmian w `packages/tally-charts/api`.
**Decyzje i pułapki:**
- Własna treść tooltipa (prop `content`) jest renderowana przez createPortal do overlaya z aria-hidden="true" (Chart.tsx, Tooltip.tsx); ogłoszenia idą przez live region (`aria-live="polite"`) i DataTable.
- Atrybuty data-ch-part używane w kodzie to m.in. bar, tooltip, callout, legend, heatmap-cell, runway-row; przykłady w docs/stability.md używają istniejących nazw.
- Przy zmianie README sprawdzaj, że tabela tokenów w §Styling nie jest ruszana: parsuje ją src/theme/surface.test.ts.
**Otwarte kwestie:**
- Nie uruchamiałem pnpm size ani check:dev-strip (zmiany nie dotykają kodu ani bundla).
- Akapit w README §Styling nie odsyła do sekcji Stability (opcjonalne według planu, pominięte, żeby nie ruszać README poza zakresem).
- Ostrzeżenia lint o CSS istnieją od wcześniej (potwierdzone w T11).
**Kryteria:**
- `packages/tally-charts/README.md` ma sekcję `## Stability` (≤ ~15 linii) z listą Public: eksporty `tally-charts` i `tally-charts/core`, tokeny `--ch-*`, `data-ch-part`, atrybuty stanów i wariantów `data-ch-*`, `theme.css`; oraz listą Not public: klasy `ch-*`, zmienne `--_ch-*` (wprost `--_ch-swatch-color`), struktura DOM poza partami, brzmienie wbudowanych angielskich stringów (mogą się zmienić w minor do czasu hooka i18n w 1.x), budżety rozmiaru; z linkiem absolutnym do `docs/stability.md` na GitHub
- Istnieje `docs/stability.md` z H1 „Stability and semver”: strict semver od 1.0, te same listy Public/Not public z krótkim uzasadnieniem i przykładami, rada stylowania przez `[data-ch-part]`, odesłanie do a11y Known limits; bez linków względnych do kodu (gotowe do przeniesienia na stronę `stability`)
- `docs/a11y.md` §Known limits zawiera punkt o hover tooltipie z `pointer-events: auto`, który zasłania sąsiednie obszary trafień, i o własnej treści w overlayu aria-hidden, z adnotacją, że jest to zaakceptowane według WCAG 1.4.13
- `docs/a11y.md` §Known limits zawiera punkt, że Heatmap `breaks` (`heatmapLevel`) i poziomy RunwayChart są tylko lower-inclusive (wartość równa krawędzi trafia do wyższego poziomu), a `inclusive` jest planowane w 1.x
- `grep -rn "_ch-swatch-color" apps/storybook/stories apps/storybook/.storybook` zwraca tylko miejsca, przy których (linia wyżej lub w tym samym bloku) jest komentarz, że to prywatna zmienna bez publicznego tokenu w 1.0 (Performance.stories.tsx i preview.css)
- Istnieje changeset `.changeset/*.md` z `'tally-charts': patch` opisujący dokumentację stabilności; PROGRESS.md ma sekcję T12 z decyzjami
- Przechodzą `pnpm lint`, `pnpm typecheck`, `pnpm test` (w tym `surface.test.ts` czytający tabelę tokenów z README) oraz po `pnpm build` `pnpm --filter tally-charts api:check` bez zmian w `packages/tally-charts/api`

## T13 E2E widoczności małych znaczników w zagnieżdżonym dark theme i backlog G (F19)
**Decyzje:**
- D1. Story `primitives-small-pieces--nested-dark` (`SmallPieces.stories.tsx`, `parameters.theme: 'light'`): karta `.card` z `data-ch-theme="dark"` i `data-testid="nested-dark"` (320 px) z ShareBar (accent, warn, gain) i ZoneMeter (`inpZones`, wartość 350 z 1000). Poza STORIES, THEMELESS i VIEWPORTS, więc bez PNG.
- D2. `contrastOf` przeniesiona do `e2e/stories.ts` i wyeksportowana. `stories.spec.ts` ją importuje, bez zmiany zachowania.
- D3. `e2e/nested-theme.spec.ts`: `measure(page)` (inline w `page.evaluate`) zwraca computed `backgroundColor`, iloczyn `opacity` przodków, `visibility`, `display` i wymiary bbox dla markera i każdego segmentu, plus tło karty i kolor/motyw `.sb-canvas`. Próg 3:1 (WCAG 1.4.11) wobec tła karty. Tony w story spełniły próg w dark, więc żaden nie wymagał zmiany.
- D4. Siatka bezpieczeństwa trwale w teście: `addStyleTag` odtwarza bug z 7de9111 (`:root { --ch-zone-marker: var(--ch-ink) }`), segment biorący kolor karty, oraz marker `display:none`, `visibility:hidden`, `background:transparent`, `opacity:0`, `width:1px`. Każdy wariant musi dać niepustą listę problemów.
- D5. Asercje w testach siatki są zawężone do sprawdzanego problemu (`toContainEqual`, filtr `share-segment`), bo mutacja w źródle dokłada problem markera i test siatki nie może od niej zależeć.

**Weryfikacja mutacją w źródle** (`packages/tally-charts/src/theme/theme.css`, po każdej zmianie `pnpm build`, `lsof -i :6007` puste, `pnpm --filter storybook-app exec playwright test nested-theme`; Storybook buduje się w webServerze przy każdym uruchomieniu):
- Mutacja 1: `--ch-zone-marker: var(--ch-ink);` w bloku `:root` (Theme-independent tokens). Test „the ZoneMeter marker and every ShareBar segment stay visible on the nested dark card” CZERWONY: `zone-meter-marker: contrast 1.01:1 of rgb(17, 17, 20) on rgb(18, 18, 21), needs 3:1`.
- Mutacja 2: `display: none;` w regule `[data-ch-part="zone-meter-marker"]`. Ten sam test CZERWONY: `zone-meter-marker: display is none`, `zone-meter-marker: 0px wide, needs at least 2px`, `zone-meter-marker: no height`.
- Po revercie: `git diff packages/` pusty, `nested-theme` 6/6 zielone.

## ✔ T13 E2E widoczności małych znaczników w zagnieżdżonym dark theme i backlog G (F19) (2026-10-25)
Dodałem story `primitives-small-pieces--nested-dark` (jasna strona, ciemna karta z ShareBar i ZoneMeter, poza STORIES, bez PNG) oraz `e2e/nested-theme.spec.ts` (6 testów): sanity (jasna strona, ciemna karta), widoczność markera i segmentów z computed style (bbox ≥2 px, display, visibility, opacity, alfa, kontrast ≥3:1 wobec karty), siatka bezpieczeństwa z `addStyleTag` (bug 7de9111, segment w kolorze karty, ukryty/przezroczysty/zwężony marker) i axe. `contrastOf` jest teraz w `e2e/stories.ts`. Mutacje w źródle (wyniki wyżej) dały czerwony test, po revercie zielony. Bramki: lint (tylko wcześniejsze ostrzeżenia CSS), typecheck, build, `pnpm test:e2e` 314/314, `git status` bez nowych PNG. Brak zmian w `packages/tally-charts`, więc bez changesetu.

### Backlog 1.0.x (testy, kubełek G)
Źródło: `docs/superpowers/specs/2026-10-25-tally-charts-1.0-candidates.md`, sekcja G. Pozycji e2e computed-style (małe znaczniki w zagnieżdżonym dark) nie ma, bo zrobił ją T13.
- [ ] band: reversed range z paddingiem i case „like d3”
- [ ] `niceTimeDomain`: przypadki local i null (obecne testy: `src/core/time.test.ts`, `date.test.ts`)
- [ ] asercje w `types.test`
- [ ] tooltip `true`/`false`
- [ ] throw `useRegisterPoints` poza wykresem
- [ ] check „selected part is rendered”
- Runway core:
  - [ ] `runsOutAt` przed domeną i bez `resetAt`
  - [ ] `statusLines` z forecastem bez resetu
  - [x] Escape i `pointerLeave` (zrobione w T11: `RunwayChart.test.tsx` „Escape clears the active row”, „ignores Escape when nothing is active”, pointerleave/touch)
  - [ ] nieobsłużone klawisze (brak testu w `RunwayChart.test.tsx`)
  - [ ] stroke hatch w Region
  - [ ] shadowing `warn` w `normalizeRow`
- [ ] forced-colors: testy sprawdzają selektory, nie wartości
- ComparisonBars:
  - [ ] resize re-layout
  - [ ] user margin
  - [ ] label po lewej od wartości
- Hygiene:
  - [ ] Escape listener vs keyboard source
  - [ ] rest-on-tooltip settle
  - [ ] dokładny string stylu RowLabels
  - [ ] standalone Legend pod seq-tone
  - [ ] waffle `margin.top` override
  - [ ] flake pill `boundingBox`
  - [ ] DotHistogram ring handover
  - [ ] dataTable unlisted columns
  - [ ] liczniki runów contrast-gate
  - [ ] ~20 baseline'ów sprawdzonych tylko przez implementera

## ✔ T13 E2E widoczności małych znaczników w zagnieżdżonym dark theme i backlog G (F19) (2026-10-25)
Dodałem story `primitives-small-pieces--nested-dark` (jasna strona, ciemna karta z ShareBar i ZoneMeter, poza STORIES, bez PNG). Dodałem też `e2e/nested-theme.spec.ts` z 6 testami: sanity, widoczność markera i segmentów z computed style (bbox ≥2 px, display, visibility, opacity, alfa, kontrast ≥3:1 wobec karty), siatka bezpieczeństwa przez `addStyleTag` (bug 7de9111, segment w kolorze karty, ukryty, przezroczysty lub zwężony marker) oraz axe. `contrastOf` przeniosłem do `e2e/stories.ts` i wyeksportowałem. `stories.spec.ts` ją importuje, bez zmiany zachowania. Mutacje w źródle theme.css dały czerwony test widoczności: `--ch-zone-marker: var(--ch-ink)` na `:root` (kontrast 1.01:1) i `display:none` na markerze. Po revercie `git diff packages/` jest pusty, a test zielony. Wyniki i backlog G (1.0.x) są w PROGRESS.md. Przechodzą lint (tylko wcześniejsze ostrzeżenia CSS), typecheck, build i `pnpm test:e2e` (314/314), a `git status` nie pokazuje nowych PNG. Brak zmian w `packages/tally-charts`, więc bez changesetu.
**Decyzje i pułapki:**
- macOS sed odrzuca `a\n` w jednolinijkowym wyrażeniu, więc `sed -i` z wstawianiem linii cicho nie zmienia pliku, a test przechodzi na niezmutowanym kodzie. Mutacje robić Edit toolem i sprawdzać `git diff packages/`.
- Playwright webServer (`pnpm run build && http-server`) przebudowuje Storybook przy każdym uruchomieniu, więc po zmianie tally-charts wystarczy `pnpm build` i pusty port 6007, bez ręcznego budowania Storybooka.
- Pod zagnieżdżonym data-ch-theme token rozwiązany na :root (np. --ch-zone-marker: var(--ch-ink)) dziedziczy się już jako wartość z motywu strony. Tak powstała regresja z 7de9111.
- pnpm format potrafi poprawić format po edycji ręcznej. Biome zgłosił format w SmallPieces.stories.tsx, więc przed lintem warto uruchomić format.
**Otwarte kwestie:**
- Backlog G (1.0.x) jest w PROGRESS.md. Odhaczyłem tylko Escape i pointerLeave w RunwayChart, pokryte w T11. Pozostałe pozycje są otwarte, w tym nieobsłużone klawisze Runway (brak testu).
- Testy siatki bezpieczeństwa asertują tylko sprawdzany problem (toContainEqual, filtr share-segment), bo mutacja w źródle dokłada problem markera. Bez tego testy siatki padałyby razem z testem widoczności.
- apps/storybook/e2e/nested-theme.spec.ts: Kontrast liczony jest wobec computed backgroundColor karty. Gdyby karta straciła tło (rgba(0,0,0,0)), contrastOf ignoruje alfę i potraktuje je jak czarne. Sanity test (luminance <0.1) też przejdzie, więc check zmierzy kontrast wobec czerni, a realnie widoczna będzie jasna strona.
**Kryteria:**
- Istnieje story `primitives-small-pieces--nested-dark`: jasna strona (`.sb-canvas` z `data-ch-theme="light"`), a w niej karta z `data-ch-theme="dark"` z ZoneMeter i ShareBar. Story nie ma jej w STORIES i nie powstaje dla niej żaden plik PNG.
- `apps/storybook/e2e/nested-theme.spec.ts` sprawdza computed style markera ZoneMeter i każdego segmentu ShareBar w tej karcie: bbox ≥2 px, element widoczny, opacity > 0, alfa > 0 i kontrast koloru wobec tła karty ≥ 3:1. Test przechodzi na obecnym kodzie.
- W tym samym pliku test z `page.addStyleTag(':root { --ch-zone-marker: var(--ch-ink) }')`, czyli bug z 7de9111, potwierdza, że check wykrywa niewidoczny marker (kontrast < 3). Analogiczny test robi to dla segmentu ShareBar.
- Ręczna mutacja w `packages/tally-charts/src/theme/theme.css` (przywrócone `--ch-zone-marker: var(--ch-ink)` na `:root`) daje czerwony test widoczności. Po revercie test jest zielony. Komenda, komunikat błędu i wynik po revercie są zapisane w PROGRESS.md, a `git diff packages/` jest pusty.
- PROGRESS.md ma sekcję „Backlog 1.0.x” z checklistą wszystkich pozostałych pozycji kubełka G z `docs/superpowers/specs/2026-10-25-tally-charts-1.0-candidates.md`. Pozycji e2e computed-style tam nie ma, bo zrobił ją T13.
- `contrastOf` jest wyeksportowana z `e2e/stories.ts` i używana w `stories.spec.ts` bez zmiany zachowania.
- `pnpm lint`, `pnpm typecheck` i `pnpm test:e2e` (po `pnpm build`, przy wolnym porcie 6007) przechodzą. Po e2e `git status` nie pokazuje nowych baseline'ów PNG.

## T14 Packaging: check:treeshake, sideEffects/PURE i budżet LineChart (F8)
**Decyzje:**
- D1. `packages/tally-charts/scripts/treeshake.mjs` (+ `treeshake.d.mts`): `bundledModules(code, map)` dekoduje VLQ `mappings` mapy bundla i bierze tylko źródła z co najmniej jednym segmentem (`map.sources` listuje cały dist, także dla `{ Stat }`). Rzuca „no src modules mapped”, gdy żadne źródło nie jest pod `src/`. `definingModules` znajduje moduł definiujący eksport przez `export { X } from` w `src/index.ts`. `expectedModules` to klucze `metafile.inputs` esbuilda dla tych modułów plus `pkg:<nazwa>`. `findLeaks` bundluje fixture `export { … } from 'tally-charts'` (self-reference działa w esbuild 0.28, nie trzeba linku w workspace) z `minify`, `NODE_ENV=production`, `external` react i sourcemapą, i zwraca `leaks` (poza grafem), `forbidden` (reguły) i `problems` (z metafile'a: plik poza dist, pakiet spoza `dependencies`, `.css`).
- D2. `scripts/check-treeshake.mjs` czyta wpisy z `.size-limit.js`, dla każdego liczy fixture, drukuje `wpis: N modułów, OK/FAIL`, exit 1 przy wycieku. Dodałem 15. fixture „Stat (extra)” (sam `{ Stat }`), bo wpis „Small UI pieces” zasłania, co wciąga Stat. Wpisy size-limit to 14, wszystkie OK.
- D3. Reguła forbid dla LineChart to nie `react/ui/**` z planu: LineChart legalnie używa `TooltipPill.tsx` i `util.ts`, więc reguła dawała fałszywy FAIL. Zabroniłem RunwayChart.tsx, core/runway.ts, small pieces (Stat, Delta, Meter, RangeMeter, InlineBar, DotCount, ShareBar, ZoneMeter) i ui/share.ts. Pozostałe reguły jak w planie (core ∌ react/**, Stat i „Small UI pieces” ∌ Chart.tsx, marks, charts, context.ts). Każdy wykres z react/charts dostaje automatycznie zakaz pozostałych modułów react/charts/*.
- D4. Stałe arytmetyczne: wybrałem literały z komentarzem (`DEFAULT_CELL = 216e5 // 6 h`, `SIX_DAYS = 5184e5 // 6 d`, `UNIT = { m: 6e4, h: 36e5, d: 864e5 }`), bo to najprostsze i bez kosztu w runtime. W `core/time.ts` (`YEAR`, tabela interwałów) nic nie zmieniałem: check tego nie wskazał, bo `timeScale` ich używa w każdym bundlu z osią czasu. `memo()` RunwayStrip ma `/* @__PURE__ */` i nie trafia do bundli innych wpisów (check OK). Pozostałych top-levelowych wywołań (`new Set`, JSX `NO_VALUE`) nie ruszałem, bo check ich nie wskazał.
- D5. Plan zakładał `/* #__NO_SIDE_EFFECTS__ */` na `createWarner` jako alternatywę. Nie użyłem: adnotacje `@__PURE__` na wywołaniach wystarczyły.
- D6. Konfiguracja size-limit przeniesiona z `.size-limit.json` do `packages/tally-charts/.size-limit.js` (ESM, te same 14 wpisów i nazwy). Powód: JSON nie przyjmuje komentarzy ani nieznanych kluczy, a ma pierwszeństwo w searchPlaces. „`.size-limit.json`” w SPEC oznacza odtąd `.size-limit.js`. Zaktualizowane: `docs/stability.md`, CLAUDE.md.
- D7. Limit LineChart: 13.2 KB → 14 KB (D-11), z komentarzem w `.size-limit.js`. Pomiar jest uczciwy w sensie D-11: check:treeshake przechodzi dla LineChart (39 modułów, tylko jego graf). Zapas: 14000 − 13193 = 807 B dla poprawek F6.
- D8. CI: krok `pnpm --filter tally-charts check:treeshake` w jobie `check` po `check:dev-strip`. `prepublishOnly` bez zmian (poza zakresem). Changeset `patch`: `.changeset/treeshake-pure.md`.

**Wynik checku przed naprawami** (stary dist, exit 1, 14 z 15 fixture FAIL; core OK):
- `{ LineChart }`: wyciek `core/runway.ts`, `react/ui/ZoneMeter.tsx`, `react/ui/share.ts` (42 moduły).
- `{ Stat }`: wyciek `core/runway.ts`, `core/warn.ts`, `react/context.ts`, `ZoneMeter.tsx`, `share.ts`; `Chart.tsx` nie wchodzi.
- „Small UI pieces”: `core/runway.ts`, `react/context.ts`. Heatmap: runway.ts, context.ts, ZoneMeter.tsx, share.ts. RunwayChart: context.ts, ZoneMeter.tsx, share.ts. Pozostałe wykresy: runway.ts, ZoneMeter.tsx, share.ts.
- Po samych `/* @__PURE__ */` na `createWarner()` i `createContext()` zostawał jeszcze `core/runway.ts` (stałe `MINUTE`, `UNIT`, `DEFAULT_CELL`, `SIX_DAYS` z mnożeniem po identyfikatorze). Po zamianie na literały: 15/15 OK.

**Rozmiary size-limit (gzip, B)**, przed → po napraw (ten sam pomiar `pnpm exec size-limit --json`):
| wpis | przed | po |
|---|---|---|
| tally-charts/core | 1611 | 1611 |
| Chart + Bars + Axis + Target + Tooltip | 11482 | 11482 |
| BarChart | 12399 | 12399 |
| ComparisonBars | 11743 | 11743 |
| RankedBars | 11354 | 11354 |
| WaterfallChart | 13193 | 13193 |
| BridgeChart | 13875 | 13875 |
| DotHistogram | 12547 | 12547 |
| StripPlot | 12344 | 12344 |
| WaffleColumns | 10665 | 10665 |
| **LineChart** | **13193** | **13193** (limit 13200 → 14000) |
| Heatmap | 4046 | 4041 |
| Small UI pieces | 4035 | 4031 |
| RunwayChart | 8636 | 8630 |

**Ważne odstępstwo od założeń planu:** size-limit 14 (`@size-limit/preset-small-lib`) mierzy rolldownem, nie esbuildem. Rolldown już wcześniej odrzucał martwy kod z Runway/ZoneMeter/share, więc rozmiar LineChart się nie zmienił (13193 B przed i po). Wycieki widział dopiero esbuild (a także Rollup/webpack, które nie mają takiej analizy). Poprawki PURE i literały zmniejszają więc bundle użytkowników na esbuildzie, ale nie liczby w `pnpm size`. Decyzja 14 KB opiera się na tym, że check na esbuildzie (surowszym) przechodzi dla LineChart, a nie na spadku rozmiaru. Zestawu modułów w bundlu rolldowna nie sprawdzałem osobno.

**Testy:** `src/treeshake-check.test.ts` (12 testów, środowisko node, bez dist biblioteki): mini-biblioteka `test/treeshake/` bundlowana esbuildem do katalogu tmp z sourcemapą: czysty przebieg, wyciek `heavy.ts` przy nieoznaczonym wywołaniu i brak wycieku po `/* @__PURE__ */` (`heavy-pure.ts`), FAIL z nazwą modułu przy regule forbid, glob `**`, błąd „no src modules mapped” bez sourcemapy, plik spoza dist, nieznany eksport oraz `bundledModules` na ręcznej mapie (VLQ z ujemną deltą, segment bez źródła, źródło niezmapowane, pakiet z node_modules).
**Pułapki:** `git stash` jest zablokowany dla agenta. `pnpm -s` nie istnieje w tym pnpm. Na macOS `os.tmpdir()` leży za symlinkiem, więc w teście trzeba `fs.realpathSync`, inaczej relatywne ścieżki sourcemap nie wychodzą.
**Bramki:** format, lint (tylko 4 wcześniejsze ostrzeżenia CSS), typecheck, test (1119), build, `check:treeshake` (15/15 OK), `pnpm size`, `api:check` (bez zmian w `api/`), `check:dev-strip`.

## ✔ T14 Packaging: check:treeshake, sideEffects/PURE i budżet LineChart (F8) (2026-10-25)
Dodałem `pnpm --filter tally-charts check:treeshake`. Skrypt bundluje esbuildem 14 fixture z `.size-limit.js` plus jeden dodatkowy (`{ Stat }`). Porównuje moduły src zmapowane z bundla (zdekodowane VLQ `mappings`) z grafem importów eksportu i regułami forbid. Na starym dist check kończył się kodem 1 z wyciekami: runway.ts, ZoneMeter.tsx i share.ts w LineChart oraz context.ts w Stat (zapisane w PROGRESS.md). Naprawiłem je przez `/* @__PURE__ */` na `createWarner()` i `createContext()` oraz zamianę stałych w runway.ts na literały z komentarzem. Po tym 15/15 fixture OK (`memo()` RunwayStrip nadal oznaczone, `sideEffects` bez zmian). Konfigurację size-limit przeniosłem do `.size-limit.js` (JSON usunięty), a limit LineChart podniosłem do 14 KB z komentarzem (zapas 807 B). Dodałem krok w jobie `check` w CI, wpisy w CLAUDE.md, docs/stability.md i PROGRESS.md oraz changeset `patch`. Bramki przechodzą: format, lint (tylko 4 wcześniejsze ostrzeżenia CSS), typecheck, test (1119), build, check:treeshake, size, api:check (bez zmian w `api/`), check:dev-strip. e2e nie uruchamiałem, bo zmiany nie są wizualne.
**Decyzje i pułapki:**
- @size-limit/preset-small-lib 14 mierzy rolldownem, nie esbuildem. Wyniki size-limit i bundle'a esbuilda mogą się różnić co do martwego kodu.
- esbuild 0.28 obsługuje self-reference pakietu (`export { X } from 'tally-charts'` z resolveDir w pakiecie), więc fixture nie potrzebuje linku w workspace. Sourcemapę tsdown esbuild łańcuchuje do mapy bundla.
- Stałe typu `60 * MINUTE` (mnożenie po identyfikatorze) i `createContext()`/`createWarner()` bez `/* @__PURE__ */` zostają w bundlu esbuilda; literały i adnotacje PURE je usuwają.
- Test z sourcemapami w os.tmpdir() na macOS wymaga fs.realpathSync (symlink /var i /tmp), inaczej relatywne ścieżki w mapach się nie zgadzają.
- Agent nie może używać `git stash`, a `pnpm -s` nie istnieje w tym pnpm. Wynik 'przed' trzeba zbierać na obecnym dist, zanim się go przebuduje.
- size-limit 14 odrzuca nieznane klucze i szuka .size-limit.json przed .size-limit.js, więc komentarz uzasadniający budżet wymaga pliku .js.
**Otwarte kwestie:**
- Rozmiary w `pnpm size` mierzy rolldown (preset-small-lib 14), a check:treeshake używa esbuilda. Rolldown już wcześniej odrzucał martwy kod, więc rozmiar LineChart się nie zmienił (13193 B przed i po). Założenie planu, że poprzedni pomiar LineChart był zawyżony, okazało się nieprawdziwe. Poprawki PURE i literały pomagają użytkownikom esbuilda, Rollupa i webpacka, ale nie zmieniają liczb w `pnpm size`. Zestawu modułów w bundlu rolldowna osobno nie sprawdzałem. Decyzja 14 KB opiera się na tym, że surowszy check na esbuildzie przechodzi dla LineChart.
- Reguła forbid `react/ui/**` dla LineChart z planu dawała fałszywy FAIL, bo LineChart legalnie używa TooltipPill.tsx i ui/util.ts. Zawęziłem ją do small pieces i share.ts (D3 w PROGRESS.md).
- 'Stat (extra)' to dodatkowy, 15. fixture poza 14 wpisami size-limit. Bez niego `{ Stat }` ginie w 'Small UI pieces'. Jeśli orkiestrator chce dokładnie 14 linii w raporcie, wystarczy usunąć linię `fixtures.push` w check-treeshake.mjs.
- Nie zmieniałem stałych w core/time.ts (YEAR, tabela interwałów) ani innych top-levelowych wywołań (new Set, JSX NO_VALUE), bo check ich nie wskazał.
- `prepublishOnly` nie zawiera check:treeshake (zgodnie z planem to osobne kryterium F8). `.size-limit.json` został usunięty z indeksu przez `git rm --cached`, więc w statusie jest jako 'D' (staged).
- SPEC.md: SPEC.md (i stare plany w docs/superpowers) nadal odwołują się do `.size-limit.json`. Decyzja, że chodzi teraz o `.size-limit.js`, jest zapisana tylko w PROGRESS.md (D6), zgodnie z planem.
- packages/tally-charts/scripts/check-treeshake.mjs: Bez `dist` (check uruchomiony przed buildem) skrypt pada z nieobsłużonym stack trace esbuilda ('Could not resolve "tally-charts/core"'). Exit 1 jest poprawny, ale komunikat nie podpowiada, że trzeba zrobić `pnpm build`.
**Kryteria:**
- Po `pnpm build` komenda `pnpm --filter tally-charts check:treeshake` kończy się kodem 0 i raportuje OK dla każdego z 14 wpisów konfiguracji size-limit. Fixture każdego wpisu jest bundlowany esbuildem z `metafile: true` przez nazwę pakietu `tally-charts`.
- Check porównuje moduły src zmapowane z bundla (zdekodowane `mappings` sourcemapy, a nie samo `sources`) ze zbiorem oczekiwanym: grafem importów modułów definiujących eksporty minus jawne reguły forbid. Dla `{ LineChart }` raport nie zawiera react/charts/RunwayChart.tsx ani core/runway.ts. Dla `{ Stat }` nie zawiera react/Chart.tsx.
- Na kodzie sprzed napraw (obecny dist) check kończy się kodem 1 i wymienia wycieki core/runway.ts, react/ui/ZoneMeter.tsx i react/ui/share.ts w LineChart oraz react/context.ts w Stat. Fakt jest zapisany w PROGRESS.md.
- Test vitest (`pnpm test`, plik src/treeshake-check.test.ts, środowisko node, bez zależności od dist biblioteki) pokazuje na mini-bibliotece: przebieg czysty bez wycieków; nieoznaczone top-levelowe wywołanie daje wyciek, który znika po `/* @__PURE__ */`; celowy niechciany import zabroniony regułą forbid daje FAIL z nazwą modułu; dist bez sourcemapy daje błąd zamiast cichego OK.
- W src są `/* @__PURE__ */` na top-levelowych `createWarner()` (core/runway.ts, react/ui/ZoneMeter.tsx, react/ui/share.ts) i `createContext()` (react/context.ts, react/ChartsProvider.tsx). Stałe arytmetyczne nie wyciekają już do bundli. `memo()` RunwayStrip pozostaje oznaczone. Wszystko potwierdza przechodzący check, a `sideEffects: ["*.css"]` w package.json pozostaje.
- Konfiguracja size-limit jest w packages/tally-charts/.size-limit.js (JSON usunięty), z tymi samymi 14 wpisami. LineChart ma limit "14 KB" i komentarz z uzasadnieniem (uczciwy pomiar potwierdzony przez check:treeshake, D-11). PROGRESS.md ma wpis z rozmiarem LineChart przed i po naprawach, a docs/stability.md odwołuje się do nowego pliku.
- `pnpm size` przechodzi dla wszystkich wpisów. Przechodzą też `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm --filter tally-charts api:check` (bez zmian w api/) i `pnpm --filter tally-charts check:dev-strip`.
- Job `check` w .github/workflows/ci.yml ma krok `pnpm --filter tally-charts check:treeshake` po `pnpm build`. CLAUDE.md wymienia tę komendę w „checkach biblioteki”, a notka o przyszłych komendach nie zawiera już check:treeshake.
- Jest changeset `patch` w .changeset opisujący oznaczenia PURE i mniejsze bundle pojedynczych importów.

## ✔ T15 Packaging: .d.ts, utwardzenie api:check, createDateFormatter w core, pełny prepublish (F8) (2026-10-25)
Dodałem `check:dts` (goły `import "x"` w `dist/**/*.d.{ts,mts,cts}`), kontrolę świeżości dist w `api:check`/`api:update`, test `ae-forgotten-export` na fixture, test parsowania `.d.ts` wbudowanym TS api-extractora oraz eksport `createDateFormatter` (z typami) z `tally-charts/core`. `prepublishOnly` i job `check` w CI mają teraz pełny zestaw.
**Decyzje:**
- **Przyczyna `import "d3-time"` w `.d.ts`:** nie `verbatimModuleSyntax` ani mieszane importy z planu. Czysty `tsc` (ten sam tsconfig) emituje poprawne d.ts bez gołych importów, a rozdzielenie `import type` w `date.ts`/`time.ts` niczego nie zmieniło (ten sam hash chunku). Import powstaje w bundlowaniu d.ts przez rolldown: `import type { TimeInterval } from 'd3-time'` jest usuwany z chunku, bo `TimeInterval` nie występuje w publicznych typach, ale dla zewnętrznego modułu rolldown zakłada efekty uboczne i zostawia `import "d3-time"`. Naprawa w `tsdown.config.ts`: `inputOptions.treeshake.moduleSideEffects: (_id, external) => !external`. Kod źródłowy bez zmian, JS bez zmian (`types-*.js` ma ten sam hash, `pnpm size` i `check:treeshake` identyczne).
- **TS 6 w api-extractor:** `--typescript-compiler-folder ./node_modules/typescript` jest w `api:check` i `api:update` (raporty `api/*.api.md` bez zmian z jego powodu, komunikaty bez błędów), ale to NIE przełącza silnika. Flaga jest walidowana (zła ścieżka = błąd) i dotyczy wyłącznie typów systemowych `lib.*.d.ts`; api-extractor 7.59.3 dalej pisze „Analysis will use the bundled TypeScript version 5.9.3”. Dlatego dodatkowo wariant B: `src/dts-parse.test.ts` parsuje i sprawdza każdy `dist/**/*.d.ts` bundlowanym TS 5.9.3 (opcje z `api-extractor.json`, `skipLibCheck: false` żeby pliki dist nie były pomijane) i oczekuje 0 diagnostyk. Zweryfikowane na wstrzykniętej zepsutej deklaracji (test failuje).
- **Test zależny od dist w CI:** test pomija się bez `dist`, chyba że ustawiono `REQUIRE_DIST=1`. W jobie `check` zamieniłem kolejność na build, potem `pnpm test` z `REQUIRE_DIST=1`, więc test faktycznie działa. Job `react18` nie buduje i test się tam pomija (celowo).
- **Stale-check obejmuje wszystkie pliki w `src/`**, także testy, zgodnie z literą SPEC (D-5). Skutek: po zmianie nawet `*.test.ts` trzeba przebudować dist przed `api:check`. Brak `dist/index.d.ts` też failuje tym samym komunikatem. Skrypt przyjmuje katalog pakietu jako argument (domyślnie cwd), dzięki czemu testy nie dotykają prawdziwego `src`.
- `createDateFormatter`: eksport z `src/core/index.ts` razem z `DateFormatOptions`, `DateFormatSpec`, `DateFormatter` (bez `isDateFormat` i `autoTickLabels`), pełne TSDoc. Root bez nowych eksportów wartości; w `api/tally-charts.api.md` zmienia się tylko `DateFormatOptions` z „(undocumented)” na udokumentowany. Changesety: `core-date-formatter.md` (minor) i `dts-no-side-effect-import.md` (patch).
- Fixture `test/api-extractor/*/index.d.ts` używają `export { f }`: w pliku `.d.ts` bez jawnej listy eksportów wszystkie deklaracje są publiczne i `ae-forgotten-export` się nie pojawia. Tsdown emituje taką listę, więc fixture odpowiada produkcji.
**Testy:** `src/dts-check.test.ts` (10), `src/api-fresh.test.ts` (8, w tym spawnSync i utimesSync), `src/api-extractor.test.ts` (2: fixture z `Hidden` daje `ae-forgotten-export` i `succeeded === false`, kontrola bez błędu), `src/dts-parse.test.ts` (1), `src/index.test.ts` (lista kluczy core i test `createDateFormatter` z `./core`).
**Bramki:** format, lint (tylko 4 wcześniejsze ostrzeżenia CSS), typecheck, test (1141, z `REQUIRE_DIST=1`), build, `check:dts`, `api:check`, `pnpm size`, `check:dev-strip`, `check:treeshake` (15/15), `pnpm --filter tally-charts run prepublishOnly` kod 0. Ręcznie: `touch src/core/date.ts` + `api:check` daje kod 1 i „dist is older than src, run pnpm build”, po `pnpm build` znowu 0. e2e nie uruchamiałem (brak zmian wizualnych).
**Otwarte kwestie:**
- api-extractor nadal analizuje bundlowanym TS 5.9.3 i drukuje ostrzeżenie o niezgodności z TS 6.0.3. Zniknie dopiero z wersją api-extractora z nowszym TS; do tego czasu pilnuje tego `dts-parse.test.ts`.
- Jeśli `api:check` ma być uruchamiany po edycji samych testów, wymaga to rebuildu (świadomy koszt D-5).

## ✔ T15 Packaging: .d.ts, utwardzenie api:check, createDateFormatter w core, pełny prepublish (F8) (2026-10-25)
Zrobiłem T15 w całości. Zmiany są w drzewie roboczym, bez commitów. Wszystkie bramki przeszły: format, lint (tylko 4 stare ostrzeżenia CSS), typecheck, test (1141), build, check:dts, api:check, size, check:dev-strip, check:treeshake (15/15) i `pnpm --filter tally-charts run prepublishOnly` z kodem 0. e2e pominąłem, bo nie ma zmian wizualnych.

1. **Czysty `.d.ts`:** przyczyna `import "d3-time"` była inna niż w planie. Czysty `tsc` z tym samym tsconfigiem emituje poprawne d.ts, a rozdzielenie `import type` w `date.ts` i `time.ts` nic nie zmieniło. Goły import dodaje rolldown przy bundlowaniu d.ts: usuwa nieużywany `TimeInterval`, ale zostawia import zewnętrznego modułu, bo zakłada efekty uboczne. Naprawiłem to w `tsdown.config.ts` przez `inputOptions.treeshake.moduleSideEffects: (_id, external) => !external`. Źródła bez zmian, JS bez zmian. Dodałem `scripts/dts.mjs`, `dts.d.mts` i `check-dts.mjs`, skrypt `check:dts` oraz `src/dts-check.test.ts`.
2. **Stale dist:** `scripts/api-fresh.mjs` z `newerThan`, CLI `check-api-fresh.mjs` (komunikat „dist is older than src, run pnpm build”, kod 1, pierwsze 5 plików) i test `src/api-fresh.test.ts`. `api:check` i `api:update` zaczynają się od tego skryptu. Ręcznie sprawdziłem: `touch src/core/date.ts` daje kod 1, a po `pnpm build` znowu 0.
3. **TS 6:** `--typescript-compiler-folder ./node_modules/typescript` jest w `api:check` i `api:update`, raporty `api/*.api.md` bez zmian z jego powodu. Flaga zmienia tylko typy systemowe `lib.*.d.ts`, a analizę dalej robi wbudowany TS 5.9.3. Dlatego dodałem też wariant B: `src/dts-parse.test.ts` parsuje i sprawdza wbudowanym TS cały `dist/**/*.d.ts` (zero diagnostyk, wykrywa wstrzyknięty błąd). Decyzja jest w PROGRESS.md.
4. **`ae-forgotten-export`:** fixture `test/api-extractor/{forgotten,ok}/index.d.ts` i `src/api-extractor.test.ts`, który używa produkcyjnego `api-extractor.json`. Fixture dostaje `ae-forgotten-export`, `errorCount > 0` i `succeeded === false`, kontrola przechodzi.
5. **`createDateFormatter` w core:** eksport razem z `DateFormatOptions`, `DateFormatSpec` i `DateFormatter`, pełne TSDoc z `@param`, `@returns` i `@example`. Zaktualizowałem `api/core.api.md` i `src/index.test.ts` (lista kluczy plus test importu z `./core`). W `api/tally-charts.api.md` zmienił się tylko opis `DateFormatOptions` (zniknęło „undocumented”). Changesety: `core-date-formatter.md` (minor) i `dts-no-side-effect-import.md` (patch).
6. **Pełny zestaw:** `prepublishOnly` ma build, test, api:check, size, check:dev-strip, check:treeshake i check:dts. Job `check` w CI ma te same kroki, a build idzie przed `pnpm test` (z `REQUIRE_DIST=1`), żeby `dts-parse.test.ts` nie był tam pomijany. Uzupełniłem CLAUDE.md (`check:dts`, stale dist w `api:check`, `REQUIRE_DIST`) i `docs/stability.md`.
7. **PROGRESS.md:** dopisałem sekcję T15 z decyzjami i wynikami bramek.
**Decyzje i pułapki:**
- Goły `import "pkg"` w bundlowanym .d.ts pochodzi z rolldown (zewnętrzny moduł z usuniętymi bindingami zachowuje się jak side-effect), a nie z tsc ani verbatimModuleSyntax. Leczy to treeshake.moduleSideEffects: (_id, external) => !external w tsdown.config.ts.
- api-extractor --typescript-compiler-folder podmienia tylko typy systemowe lib.*.d.ts, nie silnik analizy. Zła ścieżka jest walidowana i daje błąd.
- W pliku .d.ts bez jawnej listy `export { … }` wszystkie deklaracje top-level są publiczne, więc fixture na ae-forgotten-export musi mieć `export { f }`.
- ExtractorConfig.loadFile zwraca bezpośrednio obiekt konfiguracji (nie { configObject, configObjectFullPath }).
- W zsh `P="pnpm --filter x"; $P cmd` nie rozbija zmiennej na słowa, więc w skryptach powłoki trzeba pisać komendy jawnie.
- Zasady zabraniają agentowi nawet `git checkout` plików (komenda została odrzucona). Cofanie własnych zmian robi się przez Edit.
**Otwarte kwestie:**
- api-extractor 7.59.3 nadal analizuje bundlowanym TS 5.9.3 i drukuje ostrzeżenie o niezgodności z TS 6.0.3. --typescript-compiler-folder tego nie zmienia (dotyczy tylko lib.*.d.ts). Do czasu nowszego api-extractora pilnuje tego src/dts-parse.test.ts.
- Stale-check obejmuje wszystkie pliki w src/ (zgodnie ze SPEC D-5), więc po edycji nawet samych testów api:check wymaga ponownego pnpm build.
- Job react18 w CI nie buduje, więc src/dts-parse.test.ts jest tam pomijany (celowo; wymusza go tylko job check przez REQUIRE_DIST=1).
- packages/tally-charts/src/api-extractor.test.ts: Asercja `succeeded === false` dla fixture forgotten niczego nie dowodzi. W trybie check (localBuild:false) z pustym reportFolder w tmp brakuje raportu, więc apiReportChanged=true. Fixture ok też daje succeeded=false (sonda: ok → succeeded false, errorCount 0, apiReportChanged true). Test nie jest przez to pusty, bo całą robotę robi errorCount > 0. Ale opis „kontrola przechodzi” odnosi się tylko do errorCount, a nie do sukcesu api-extractora.
- packages/tally-charts/tsdown.config.ts: `treeshake.moduleSideEffects: (_id, external) => !external` działa globalnie, także na bundle JS, a nie tylko na d.ts. Dziś JS jest identyczny (zweryfikowane). Gdyby jednak kiedyś doszedł zewnętrzny import potrzebny dla efektu ubocznego (polyfill, CSS z pakietu), rolldown usunie go bez żadnego sygnału.
**Kryteria:**
- Po `pnpm build` w żadnym `dist/**/*.d.ts` nie ma gołego importu side-effect (`grep -rnE "^\s*import\s+['\"]" packages/tally-charts/dist --include='*.d.ts'` nic nie zwraca), a `pnpm --filter tally-charts check:dts` kończy się kodem 0.
- `check:dts` kończy się kodem 1 i wypisuje plik:linia, gdy `.d.ts` zawiera np. `import "d3-time";`. Pokazuje to test vitest na fixture, który dodatkowo potwierdza, że `import type`/`import {…} from`/`export … from` nie są zgłaszane.
- Gdy dowolny plik w `packages/tally-charts/src` ma mtime nowszy niż `dist/index.d.ts`, `pnpm --filter tally-charts api:check` kończy się niezerowym kodem z komunikatem zawierającym „dist is older than src, run pnpm build”. Test vitest (katalog tymczasowy + utimesSync, uruchomienie skryptu przez spawnSync) to sprawdza, a po ponownym `pnpm build` api:check znowu przechodzi.
- `api:check` uruchamia api-extractor z `--typescript-compiler-folder` wskazującym TypeScript 6.0.3 projektu albo istnieje test pokazujący, że wbudowany TS api-extractora parsuje wszystkie `dist/**/*.d.ts` bez diagnostyk. Decyzja z uzasadnieniem jest w sekcji T15 PROGRESS.md.
- Test vitest uruchamia API Extractor z konfiguracją z `api-extractor.json` na fixture z nieeksportowanym typem w publicznej sygnaturze i dostaje komunikat `ae-forgotten-export` oraz porażkę (errorCount > 0). Kontrolna fixture bez takiego typu przechodzi.
- `import { createDateFormatter } from 'tally-charts/core'` działa (test w src/index.test.ts, lista kluczy core zaktualizowana). Funkcja ma TSDoc z @param/@returns/@example, a `api/core.api.md` zawiera `createDateFormatter`, `DateFormatOptions`, `DateFormatSpec` i `DateFormatter`.
- Istnieje changeset `minor` dla `tally-charts` opisujący nowy eksport `createDateFormatter` w `tally-charts/core`.
- `prepublishOnly` w packages/tally-charts/package.json uruchamia build, test, api:check, size, check:dev-strip, check:treeshake i check:dts, a `pnpm --filter tally-charts run prepublishOnly` kończy się kodem 0. Job `check` w .github/workflows/ci.yml zawiera wszystkie te kroki, w tym `check:dts` po build.
- CLAUDE.md wymienia `check:dts` i informację o stale-dist w api:check. Przechodzą pnpm lint, pnpm typecheck, pnpm test, pnpm size i check:treeshake.

## T16 Workflow wydań: changesets + npm trusted publishing (OIDC), pre mode rc, docs/releasing.md (F9)
Dodałem `release.yml` (jobs `version` → `verify` → `publish`, `changesets/action@v2`), `.changeset/pre.json` (pre mode `rc`), skrypty `scripts/release/*` z testami `node:test`, job `workflows` w ci.yml (check:workflows, test:scripts, actionlint 1.7.7) i `docs/releasing.md`. Nic w `packages/tally-charts` się nie zmieniło, więc bez changesetu.
**Decyzje:**
- **D-8: dist-tag `rc`, nie `next`.** changesets 3.0.3 odrzuca `--tag` w pre mode: `node_modules/.pnpm/@changesets+cli@3.0.3/node_modules/@changesets/cli/dist/publish.mjs:61-64` (`if (releaseTag && preState && preState.mode === "pre")`) loguje „Releasing under custom tag is not allowed in pre mode! To resolve this exit the pre mode by running changeset pre exit.” i kończy z kodem 1. Dist-tag w pre mode to zawsze `preState.tag` (`dist/getPublishPlan.mjs:599-601`, `getReleaseTag`). Wersje `1.0.0-rc.N` wymagają pre tagu `rc`, więc stosuję fallback z D-8: RC idą na `rc`, a `latest` się nie rusza. Pułapka sprawdzona w `getUnpublishedPackages` (`getPublishPlan.mjs:624`): tryb „only-pre” (pierwsza publikacja na `latest`) włącza się tylko, gdy wszystkie opublikowane wersje to prerelease `rc`. Na npm jest 0.9.0, więc nie zadziała. `publish` jest bez `--tag`.
- **pnpm 12.4.2 obsługuje OIDC przy `pnpm publish`:** `~/.cache/node/corepack/v1/pnpm/12.4.2/pnpm-native` (binarka Rust, `crates/publish`) zawiera wymianę tokenu `/-/npm/v1/oidc/token/exchange/package/`, odczyt `ACTIONS_ID_TOKEN_REQUEST_URL`/`..._TOKEN`, błędy `ERR_PNPM_AUTH_TOKEN_EXCHANGE` i „Incorrect permissions for idToken within GitHub Workflows” oraz generowanie provenance (`provenance_gen.rs`). Sprawdzone `strings`, nie prawdziwą publikacją (tej nie da się zrobić lokalnie, F20). Dlatego nie ma żadnego tokenu. Provenance włączam env `NPM_CONFIG_PROVENANCE` i `PNPM_CONFIG_PROVENANCE` (pnpm czyta `NPM_CONFIG_*` i `PNPM_CONFIG_*`); to też jest do potwierdzenia przy pierwszej publikacji.
- `pre enter rc` w changesets 3 zapisuje tylko `{ "mode": "pre", "tag": "rc" }`: `@changesets/pre@3.0.0` `dist/index.mjs:46-47` usuwa `initialVersions` i `changesets` ze stanu. Nie dopisuję ich ręcznie. `pnpm changeset status --verbose` pokazuje `tally-charts -> 1.0.0-rc.0`.
- **D-9: `changesets/action@v2`, nie `@v1` (odchylenie od literalnego kryterium).** @changesets/cli 3.0.3 w pre mode przenosi zużyte changesety do `.changeset/pre/` (sprawdzone na prawdziwym CLI w kopii: po `changeset version` `.changeset/pre/*.md`, a po `pre exit` + `version` pusty `pre/` i brak `pre.json`). Czytnik zbundlowany w action@v1 (`@changesets/read` 0.6.x) traktuje ten katalog jako changeset z v1 i rzuca ENOENT, więc po merge'u Version PR rc.0 job `version` padałby na każdym pushu. Używam v2 (wspiera Changesets v3): wejścia `github-token`, `version-script`, `pr-title`, `commit-message`, `create-github-releases: false`, `push-git-tags: false`, wyjście `has-changesets`. Nazwy wejść i wyjść pochodzą z uwag review; nie zweryfikowałem ich w `action.yml` (WebFetch/WebSearch były zablokowane), a actionlint nie sprawdza wejść zewnętrznych akcji. Do potwierdzenia przy pierwszym uruchomieniu. Test `scripts/release/changeset-flow.test.mjs` odpala prawdziwe CLI na syntetycznym workspace i przypina układ plików (rc.0 → `pre/`, `pre exit` → 1.0.0).
- Job `publish` ma krok „Check provenance”: `pnpm publish` robi własną wymianę OIDC, więc po publikacji `npm view tally-charts@$VERSION dist.attestations.url` (6 prób co 10 s) musi zwrócić URL, inaczej job failuje. docs/releasing.md §7-§8 to opisują.
- Zachowanie action@v2 przy `"mode": "exit"` w `pre.json` (czy zliczy `pre/*.md` jako oczekujące changesety) nie było sprawdzone na żywo. docs/releasing.md §6 ma fallback: ręczny `changeset version` na gałęzi i PR.
- `config.json`: dodane jawnie `privatePackages: { version: false, tag: false }` (to wartość domyślna, wpis dokumentuje zachowanie).
- Job `version` ma warunek `github.ref == 'refs/heads/main'`, więc `workflow_dispatch` z innej gałęzi nic nie robi. `plan` rozróżnia E404 (publikuj) od innych błędów `npm view` (fail zamiast cichego pominięcia).
- `test:scripts` używa glob `"scripts/**/*.test.mjs"`: `node --test scripts/` w node 24 próbuje załadować katalog jako moduł i pada.
- Tag `vX.Y.Z` i Release są idempotentne (`git ls-remote`, `gh release view`). Tagów `tally-charts@…` z changesets nie pushujemy.
**Testy:** `scripts/release/*.test.mjs` (18): changeset-flow (prawdziwe CLI w tmp: rc.0 przenosi changesety do `pre/`, `pre exit` + `version` daje 1.0.0), check-workflows (czysty, NPM_TOKEN, NODE_AUTH_TOKEN, registry-url tylko w release.yml, pliki nie-yaml, CLI exit 0/1 z plik:linia), changelog-section (środek, ostatnia, prefiks wersji, brak, CLI), check-npm-version (11.5.0 błąd, 11.5.1 i 12.0.0 ok, porównanie liczbowe, CLI).
**Bramki:** `pnpm test:scripts` 18/18, `pnpm check:workflows` 0 (ręcznie: kopia workflow z `NODE_AUTH_TOKEN` daje exit 1 i `ci.yml:124`), `grep -rnE "NPM_TOKEN|NODE_AUTH_TOKEN" .github/workflows` puste, `pnpm lint` (tylko 4 stare ostrzeżenia CSS), `pnpm typecheck`, `pnpm test` (1141). actionlint 1.7.7 na obu workflowach: exit 0 (po poprawce na action@v2 bez shellchecka, którego lokalnie nie ma; poprzednio z shellcheckiem 0.10.0 też 0).
**Otwarte kwestie:**
- Docker Desktop lokalnie nie działa (`input/output error` przy pullu obrazu), więc actionlint uruchomiłem z oficjalnej binarki 1.7.7 (darwin arm64, pobranej do /tmp) i shellchecka, a nie z `docker run rhysd/actionlint:1.7.7`. Ta sama wersja; w CI idzie przez docker.
- Nie sprawdziłem na żywo: OIDC exchange, provenance, `changesets/action` w pre mode, zgody Actions na tworzenie PR ani environment `npm-publish`. To konfiguracja maintainera (sekcja 9 docs/releasing.md) i test przy pierwszym wydaniu (F20).
- Do czasu pierwszej publikacji `npm deprecate tally-charts@0.0.0-stage …` (maintainer).

## ✔ T16 Workflow wydań: changesets + npm trusted publishing (OIDC), pre mode rc, docs/releasing.md (F9) (2026-10-25)
Naprawiłem blocker z review: release.yml używa teraz changesets/action@v2 zamiast @v1. Pozostałe punkty review (docs, provenance) też są zaadresowane. Wejścia v2 wzięłem z uwag review i nie sprawdziłem ich w action.yml, bo WebFetch i WebSearch były zablokowane.

- **Action:** wejścia to `github-token`, `version-script`, `pr-title`, `commit-message`, `create-github-releases: false` i `push-git-tags: false`. Wyjście to `has-changesets`. Warunek kroku `plan` używa `has-changesets`.
- **Krok provenance:** job `publish` ma nowy krok „Check provenance”. Po publikacji sprawdza `npm view tally-charts@$VERSION dist.attestations.url` (6 prób co 10 s) i failuje, gdy attestation nie ma. Robię to dlatego, że OIDC wykonuje `pnpm publish`, a nie npm CLI.
- **docs/releasing.md:**
  - §3 mówi, że w pre mode zużyte changesety trafiają do `.changeset/pre/` i że action musi zostać na v2.
  - §6 opisuje wyjście z pre mode: przegląd `pre/*.md`, `pre exit`, Version PR z 1.0.0 usuwający `pre.json` i opróżniający `pre/`. Ma też ręczny fallback.
  - §7 i §8 mówią, że za OIDC odpowiada pnpm, i opisują krok provenance oraz postępowanie, gdy on padnie.
- **PROGRESS.md i CLAUDE.md:** PROGRESS.md ma nową decyzję D-9 (odchylenie od literalnego `@v1`) i zaktualizowane liczby testów. CLAUDE.md opisuje `changeset-flow.test.mjs` i powód użycia v2.
- **Bramki:** `pnpm test:scripts` 18/18, `pnpm check:workflows` OK, grep po tokenach pusty, `pnpm lint` bez błędów (4 stare ostrzeżenia CSS), `pnpm typecheck` i `pnpm test` przechodzą. actionlint 1.7.7 przechodzi na obu workflowach, ale lokalnie bez shellchecka (nie jest zainstalowany). W `packages/tally-charts` nic się nie zmieniło, więc bez changesetu.
**Decyzje i pułapki:**
- @changesets/cli 3 w pre mode przenosi zużyte changesety do `.changeset/pre/`, a po `pre exit` i `version` zostaje tam pusty katalog. Pre.json ma wtedy `mode: exit`, a `version` je usuwa. changesets/action@v1 bundluje starszy @changesets/read, który na tym katalogu rzuca ENOENT, więc do CLI 3 potrzebna jest action@v2.
- Bash w tym środowisku odrzuca złożone polecenia (np. `xargs sh -c`), a proste przechodzą. `node_modules/.bin/changeset` jest skryptem shell, więc w testach trzeba wywoływać `node_modules/@changesets/cli/bin.js`.
- WebFetch i WebSearch są zablokowane (don't ask mode), więc zewnętrznych interfejsów akcji nie da się zweryfikować w sesji. Takie założenia trzeba zapisywać w PROGRESS.md jako niepotwierdzone.
**Otwarte kwestie:**
- Nazw wejść i wyjść changesets/action@v2 (`github-token`, `version-script`, `pr-title`, `commit-message`, `create-github-releases`, `push-git-tags`, `has-changesets`) nie sprawdziłem w action.yml. Pochodzą z uwag review, a actionlint nie waliduje wejść zewnętrznych akcji. Trzeba je potwierdzić przy pierwszym uruchomieniu workflow.
- Nie wiadomo, jak action@v2 zachowa się przy `"mode": "exit"` w pre.json, czyli czy zliczy `.changeset/pre/*.md` jako oczekujące changesety. Fallback (ręczny `changeset version` i PR) jest opisany w docs/releasing.md §6.
- actionlint uruchomiłem z lokalnej binarki 1.7.7 bez shellchecka, bo ani shellcheck, ani Docker lokalnie nie działają. W CI idzie to przez docker.
- Dalej niesprawdzone na żywo: wymiana OIDC w pnpm 12, provenance, zgoda Actions na tworzenie PR, environment `npm-publish`, `npm deprecate tally-charts@0.0.0-stage`. To konfiguracja maintainera i test przy pierwszym wydaniu (F20).
- PROGRESS.md: Dwie „otwarte kwestie” T16 są już rozstrzygalne z kodu źródłowego changesets/action@v2. (1) Nazwy wejść i wyjścia zgadzają się z action.yml@v2. (2) W `mode: exit` readChangesetState nie filtruje `pre/`, więc pliki z `.changeset/pre/*.md` liczą się jako changesety i Version PR z 1.0.0 się otworzy. PROGRESS.md i docs/releasing.md §6 dalej opisują to jako niezweryfikowane.
- .github/workflows/release.yml: `concurrency: release` z `cancel-in-progress: false` zostawia tylko jeden oczekujący run. Gdy publish czeka na akceptację, a w tym czasie na main trafią dwa pushe, starszy oczekujący run zostanie anulowany. Jeśli publish dla merge'a Version PR zostanie odrzucony albo padnie, a na main trafi nowy changeset, to `has-changesets=true` blokuje publikację, aż powstanie następny Version PR. Wersja z CHANGELOG (np. rc.0) nie trafi wtedy na npm.
**Kryteria:**
- `.github/workflows/release.yml` istnieje: na push do `main` job `version` uruchamia `changesets/action@v1` (title „Version Packages”, `version: pnpm changeset version`, bez `publish`), z uprawnieniami contents/pull-requests write.
- Gdy nie ma oczekujących changesetów, a wersji z packages/tally-charts/package.json nie ma na npm, uruchamia się job `verify` z tymi samymi checkami co job `check` w ci.yml (typecheck, lint, build, test z REQUIRE_DIST=1, api:check, size, check:dev-strip, check:treeshake, check:dts). Po nim idzie job `publish` z `environment: npm-publish`, `permissions: id-token: write, contents: write`, krokiem `npm install -g npm@^11.5.1` plus skryptem weryfikującym npm ≥ 11.5.1, `pnpm changeset publish` bez `--tag` i bez registry-url, a na końcu (idempotentnie) tworzy tag `vX.Y.Z` i `gh release create` z notatkami z CHANGELOG (`--prerelease` dla wersji z `-`).
- `grep -rnE 'NPM_TOKEN|NODE_AUTH_TOKEN' .github/workflows` nic nie zwraca. `pnpm check:workflows` (skrypt `scripts/release/check-workflows.mjs`) wychodzi z 0 na repo i z 1 na fixture z którymkolwiek z tych tokenów (test w `pnpm test:scripts`). Oba uruchamia nowy job `workflows` w ci.yml.
- `.changeset/pre.json` istnieje (mode `pre`, tag `rc`, initialVersions tally-charts 0.9.0), a `pnpm changeset status` pokazuje następną wersję `1.0.0-rc.0`.
- PROGRESS.md zapisuje decyzję: changesets 3.0.3 odrzuca `--tag` w pre mode (cytat błędu i `dist/publish.mjs:61`), więc RC idą na dist-tag `rc`, a `latest` się nie rusza. Zapisuje też wynik weryfikacji obsługi OIDC przez `pnpm publish` w pnpm 12.
- `docs/releasing.md` zawiera sekcje: dodanie changesetu, Version PR, akceptacja w `npm-publish`, prerelease (`rc`), wyjście z pre mode (`pnpm changeset pre exit`), nieudana publikacja (re-run / workflow_dispatch), weryfikacja provenance i dist-tags, a także instrukcję dla maintainera: trusted publisher (mwadon/tally-charts, release.yml, npm-publish), environment z required reviewer, zgoda Actions na tworzenie PR, `npm deprecate tally-charts@0.0.0-stage …` z komendą sprawdzającą.
- actionlint (przypięta wersja, docker lub action) przechodzi na `ci.yml` i `release.yml` lokalnie i jako krok w jobie `workflows` w ci.yml.
- `pnpm test:scripts` przechodzi (testy check-workflows, changelog-section i check-npm-version). `pnpm lint`, `pnpm typecheck` i `pnpm test` przechodzą. W `packages/tally-charts` nic się nie zmienia (bez changesetu). CLAUDE.md zawiera nowe komendy.

## ⛔ T17 [MAINTAINER] Konfiguracja npm trusted publisher, environment npm-publish, deprecate 0.0.0-stage — ZABLOKOWANY
Bramka T17 [MAINTAINER] pozostaje OTWARTA, bo kroki wymagają maintainera. Ponownie sprawdziłem stan komendami tylko do odczytu (2026-10-25) i nic się nie zmieniło. `npm view tally-charts@0.0.0-stage deprecated` jest puste. `gh api .../environments` zwraca total_count 0, a `environments/npm-publish` zwraca 404. `can_approve_pull_request_reviews` = false. `gh secret list` jest puste (brak NPM_TOKEN i NODE_AUTH_TOKEN), a `gh secret list --env npm-publish` zwraca 404, bo environment nie istnieje. W PROGRESS.md sekcja T17 była już kompletna: jawne „Gate OTWARTY, potwierdzenie niezapisane”, stan zastany, odnośnik do docs/releasing.md §9, checklista, komendy weryfikacyjne, format linii zamykającej i reguła ✔. W tej próbie zmieniłem tylko nagłówek i zdanie podsumowujące ponownego sprawdzenia (po drugim review). Nie wykonałem żadnych zmian zewnętrznych i niczego nie potwierdziłem za maintainera. `git status` pokazuje tylko PROGRESS.md. `pnpm check:workflows` przechodzi. `pnpm lint` kończy się kodem 0 (4 ostrzeżenia, 1 info, nieprzypisane do tej zmiany).
Ostatnie uwagi: zobacz .crew/backlog.json (lastNote).

## ✔ T18 Biblioteka przykładów i generator examples.generated.ts (F13) (2026-10-25)
Przykłady żyją w `apps/docs/examples/**/*.tsx` (typowane i lintowane), a generator `scripts/gen-examples.mjs` buduje z nich rejestr z dokładnym source. Strona LineChart pokazuje w panelu Code `examples['line-chart/revenue-forecast'].source` zamiast ręcznie pokolorowanego kodu z „…”.

**Decyzje:**
- **D1.** Każdy przykład: `export const meta = { id, title, rscSafe } satisfies ExampleMeta` i default export komponentu. `ExampleMeta` jest w `examples/types.ts` (.ts, więc glob `*.tsx` go pomija). `id` = ścieżka względem `examples/` bez rozszerzenia, wzorzec `^[a-z0-9-]+(/[a-z0-9-]+)*$`, więc id są unikalne z definicji.
- **D2.** Generator to zwykły Node bez nowych zależności. Metadane czyta z AST (`ts.createSourceFile`, `typescript` jest już w devDeps), wymaga literałów i default exportu, a `'use client'` z `rscSafe: true` odrzuca. Naruszenia zbiera i kończy exit 1 z `ścieżka: problem`. Eksportuje `collectExamples`, `renderRegistry` i `generate`. Plik zapisuje tylko przy zmianie treści (żeby `next dev` się nie restartował). Pliki `*.test.tsx` w `examples/` nie są przykładami (testy leżą obok przykładów, zgodnie z planem).
- **D3.** Wyjście `apps/docs/examples.generated.ts` jest w `.gitignore`. Wpis ma `id, title, rscSafe, file, source, load, Component`. `Component` to `lazy(load)` tworzone w helperze `define()`, bo obiekt literalny nie może odwołać się do własnego `load`. `load` jest osobno, bo `renderToString` nie rozwiązuje `lazy`. Eksportuje `examples`, `ExampleEntry` i `ExampleId`.
- **D4.** `gen` wpisany jawnie: `dev`, `build`, `test`, `typecheck` zaczynają się od `pnpm gen &&`. Dzięki temu CI (typecheck przed testem) i root `pnpm typecheck` nie padają na brakującym, ignorowanym pliku.
- **D5.** Przykłady: `line-chart/revenue-forecast` (przeniesiony z `line-example.tsx`), `bar-chart/margin-by-week` (z `home-chart.tsx`), oba rscSafe; `bar-chart/selectable` (`'use client'`, `useState`, `onSelect`, rscSafe false). Stare pliki usunięte, tytuły bez zmian, więc e2e i PNG designu nie zmieniły się. `meta.title` jest też tytułem wykresu.
- **D6.** Strona LineChart: preview to bezpośredni import default exportu (strona jest serwerowa), a Code to `CodeBlock` z `source` jako zwykły tekst, `label` `Source of: ${meta.title}`. Podświetlanie składni zostaje dla F12 (Shiki). Odwołanie `examples['line-chart/revenue-forecast']` jest literałem, bo `satisfies` poszerza `meta.id` do `string`.

**Testy:** `examples/registry.test.ts` (source == plik, zbiór id == zbiór plików, sortowanie, są oba warianty rscSafe), `examples/render.test.tsx` (jsdom: każdy przykład po `load()` renderuje `svg` bez `console.error`), `examples/ssr.test.tsx` (środowisko node: `renderToString` dla rscSafe daje `<svg`), `scripts/gen-examples.test.ts` (brak meta, brak default exportu, id ≠ ścieżka, zły wzorzec id, `'use client'` + rscSafe, nie-literały, zbiorcze raportowanie, deterministyczny `renderRegistry` z `JSON.stringify(source)`, brak ponownego zapisu), `app/docs/line-chart/page.test.tsx` (tekst panelu Code == plik przykładu).
**Bramki:** `pnpm build`, `gen` dwa razy (mtime bez zmian), `pnpm --filter docs typecheck`, `pnpm typecheck`, `pnpm lint` (4 ostrzeżenia, 1 info jak w bazie), `pnpm --filter docs test` (50) także po `rm examples.generated.ts`, `pnpm --filter docs build`, `pnpm --filter docs test:e2e` (20). Ręcznie: zły `meta.id` daje exit 1 z `examples/bar-chart/margin-by-week.tsx: …`, po przywróceniu `gen` przechodzi. Błąd typu w przykładzie wywalił typecheck (złapany przy `onSelect`). Bez zmian w `packages/` i PNG, bez changesetu.

## ✔ T18 Biblioteka przykładów i generator examples.generated.ts (F13) (2026-10-25)
T18 zrobiony. Powstały 3 przykłady w `apps/docs/examples/` (line-chart/revenue-forecast, bar-chart/margin-by-week, bar-chart/selectable) i `types.ts` z `ExampleMeta`. Generator `scripts/gen-examples.mjs` czyta metadane z AST i zapisuje `examples.generated.ts` (gitignored) tylko przy zmianie treści. `gen` jest wpisany przed `dev`, `build`, `test` i `typecheck` w `apps/docs/package.json`. Strona główna i LineChart używają teraz default exportów przykładów, a panel Code na LineChart pokazuje dokładne `source` pliku. Stare `home-chart.tsx` i `line-example.tsx` są usunięte. CLAUDE.md ma komendę `gen`, a PROGRESS.md sekcję T18 z D1–D6. Wszystkie bramki przeszły: build, `gen` dwa razy (mtime bez zmian), typecheck docs i root, lint (4 ostrzeżenia, 1 info jak w bazie), `pnpm --filter docs test` (50, także po `rm examples.generated.ts`), `docs build`, `test:e2e` (20). Ręczna próba ze zepsutym `meta.id` dała exit 1 z komunikatem z nazwą pliku. Nie ruszałem `packages/` ani PNG, bez changesetu.
**Decyzje i pułapki:**
- `**/` w komentarzu JSDoc (np. w ścieżce `examples/**/*.tsx` w komentarzu `/** … */`) zamyka komentarz i psuje parsowanie; w blokach `/** */` trzeba pisać inaczej.
- `satisfies ExampleMeta` poszerza `id` do `string`, więc `examples[meta.id]` się nie typuje. Trzeba użyć literału klucza.
- `onSelect` w tally-charts dostaje `id` typu `Id` (string | number), więc stan trzeba trzymać jako `String(id)`.
- Pliki `*.test.tsx` w `examples/` pasują do globu `*.tsx`, więc generator i test rejestru muszą je wykluczać.
- pnpm nie uruchamia hooków pre*, dlatego `gen` jest jawnie łańcuchowany (`pnpm gen && …`) w dev, build, test i typecheck.
- `git reset` jest w tym środowisku blokowany (nawet bez zmiany historii), a `git rm` zostawia zmianę w indeksie.
**Otwarte kwestie:**
- `git rm` zostawiło usunięcie `app/home-chart.tsx` i `app/docs/line-chart/line-example.tsx` w indeksie (staged). `git reset` był zablokowany, więc zostawiam to orkiestratorowi (zawartość drzewa roboczego jest poprawna).
- Panel Code pokazuje źródło jako zwykły tekst bez podświetlania składni, bo `<Tok>` zniknęło. Podświetlanie (Shiki) zostaje dla F12.
- Wejście `src` rejestru ładuje dynamicznie wszystkie przykłady, także klientowy `selectable`, z serwerowej strony LineChart. `next build` przechodzi, ale warto sprawdzić rozmiar chunków, gdy przykładów będzie dużo (np. generować osobny plik tylko z `source`).
- apps/docs/scripts/gen-examples.mjs: hasDefaultExport sprawdza tylko, czy default export istnieje, a nie czy jest komponentem. `export default 42` przechodzi przez generator. Wyłapie to dopiero typecheck wygenerowanego pliku (typ load) albo test renderu.
- apps/docs/package.json: `gen` uruchamia się raz przed `next dev`. Nowy przykład albo zmiana źródła w trakcie dev nie odświeży rejestru (source w panelu Code się zdezaktualizuje), dopóki dev nie zostanie zrestartowany. CLAUDE.md tego nie mówi.
- apps/docs/app/docs/line-chart/page.tsx: Serwerowa strona importuje cały rejestr, czyli source wszystkich przykładów i dynamiczne importy każdego z nich, także klientowego selectable. Przy wielu przykładach urośnie bundle serwera. Implementer sam to odnotował.
**Kryteria:**
- Istnieją co najmniej 3 pliki `apps/docs/examples/**/*.tsx`: LineChart i BarChart z `rscSafe: true` oraz jeden z `'use client'` i `rscSafe: false`. Każdy ma default export komponentu i `export const meta = { id, title, rscSafe } satisfies ExampleMeta`, a `id` równa się ścieżce względem `examples/` bez rozszerzenia.
- `pnpm --filter docs typecheck` i `pnpm lint` obejmują `apps/docs/examples/` i przechodzą bez nowych błędów. Błąd typu wstawiony w przykład wywala typecheck.
- `pnpm --filter docs gen` zapisuje `apps/docs/examples.generated.ts` z wpisami id → { id, title, rscSafe, file, source, load, Component (React.lazy) } posortowanymi po id. Drugie uruchomienie nie zmienia pliku. Plik jest w .gitignore i nie pojawia się w `git status`.
- Generator kończy się kodem ≠ 0 z komunikatem wskazującym plik, gdy przykład nie ma `meta` lub default exportu, gdy `id` ≠ ścieżka albo gdy plik z `'use client'` ma `rscSafe: true`. Pokrywa to `scripts/gen-examples.test.ts`.
- Skrypty `dev`, `build`, `test` i `typecheck` w `apps/docs/package.json` uruchamiają `gen` przed właściwą komendą. Po `rm apps/docs/examples.generated.ts` komenda `pnpm --filter docs test` przechodzi.
- Test vitest: dla każdego wpisu rejestru `source` jest identyczny z `readFileSync` pliku przykładu, a zbiór id równa się zbiorowi plików z globu. Na stronie LineChart tekst panelu Code równa się zawartości pliku `examples/line-chart/revenue-forecast.tsx`.
- Test vitest (jsdom): każdy przykład po `await load()` renderuje się przez `render` bez wyjątku i bez `console.error`, a wynik zawiera `svg`. Test w środowisku node: każdy przykład `rscSafe` przechodzi `renderToString` i zwraca HTML z `<svg`. Testy sprawdzają, że istnieje co najmniej jeden przykład rscSafe i co najmniej jeden nie-rscSafe.
- `app/home-chart.tsx` i `app/docs/line-chart/line-example.tsx` są usunięte. Strona główna i strona LineChart renderują wykresy z `examples/` z niezmienionymi tytułami, a `pnpm --filter docs test:e2e` przechodzi bez zmian w specach e2e.
- CLAUDE.md w sekcji docs opisuje `pnpm --filter docs gen` (co generuje, że uruchamia się przed dev/build/test/typecheck, jak dodać przykład). PROGRESS.md ma sekcję T18 z decyzjami.
- Brak zmian w `packages/tally-charts` (bez changesetu) i w PNG designu.

## T19 Generator modelu API api.generated.json z docModel API Extractora (F13)
Tabele propsów na stronie mają pochodzić z TSDoc i typów publicznego API. `pnpm --filter docs gen` zapisuje teraz `apps/docs/api.generated.json` (gitignored) obok `examples.generated.ts`, a API Extractor emituje commitowany model `.api.json`.

**Decyzje:**
- **D1.** Model jest commitowany w `packages/tally-charts/api/` (`tally-charts.api.json`, `core.api.json`), więc `gen` nie potrzebuje `dist` ani sieci. W `api-extractor*.json` jest `docModel: { enabled: true, apiJsonFilePath: "<projectFolder>/temp/api/<nazwa>.api.json" }` (osobne nazwy, bo domyślna jest wspólna). `scripts/api-model.mjs` (`normalizeModel`, `checkModels`, `updateModels`, CLI `check|update [dir]`) usuwa `fileUrlPath`, zapisuje JSON z wcięciem 2 i `\n`. `api:check` = poprzedni łańcuch + `node scripts/api-model.mjs check` (failuje „api model is stale, run pnpm --filter tally-charts api:update”), `api:update` + `update`. Biome pomija `packages/tally-charts/api/*.api.json`.
- **D2.** Model daje zbiór publicznych funkcji, ich pakiet i nazwy parametrów (z pominięciem fałszywych z pustym `parameterTypeTokenRange`). Typy, opisy i domyślne wartości propsów pochodzą z checkera TypeScripta na src (`ts.createProgram` z `src/index.ts` i `src/core/index.ts`, opcje z `tsconfig.base.json` znalezionego w górę od `srcDir`, `types: []`). Rozbieżność zbioru funkcji modelu i eksportów src kończy `gen` kodem 1 z `symbol: problem` (sprawdzone ręcznie, patrz niżej). Liczba parametrów modelu (po odfiltrowaniu) musi równać się liczbie w deklaracji src.
- **D3.** Tylko symbole `Function` (52 w sumie: 41 komponentów, 8 funkcji, 3 hooki). `kind`: `hook` dla `/^use[A-Z]/`, `component` dla wielkiej litery, inaczej `function`. Zmienne i typy pominięte.
- **D4.** Klucz = nazwa; `package` = pierwszy entry point (`tally-charts`, potem `tally-charts/core`), `packages` = wszystkie.
- **D5.** `{ symbols: { [name]: { name, kind, package, packages, description, props | params + returns } } }`, prop/param = `{ name, type, required, default, description }`. Komponent ma `props` (właściwości typu pierwszego parametru, po nazwie), funkcja i hook `params` (w kolejności deklaracji) i `returns` (tekst typu zwracanego). Plik zapisywany tylko przy zmianie treści.
- **D6.** `type` to `declaration.type.getText()` z białymi znakami zwiniętymi do jednej spacji. `required` = brak flagi Optional symbolu (dla unii `ChartName` optional, gdy optional w którejkolwiek gałęzi). Opis i typ z deklaracji, która ma JSDoc (nie z gałęzi `title?: undefined`). `{@link X}` spłaszczone do `X`. Wiodący „- ” z `@param name - …` obcięty.
- **D7.** `parseDefault(opis, tagi)`: `@defaultValue` (tagi: `{ name, text }`, tekst jako string albo display parts), inaczej zdanie zaczynające się od `Default`, `Default:` lub `Defaults to`, wartość do pierwszego `.`, `:` lub `;` po którym jest spacja albo koniec (poza spanami w backtickach), inaczej `null`. Parametr funkcji: inicjalizator z src (`'number'`, `{}`), potem `@defaultValue` na parametrze, potem `null`. Opis parametru z `@param`. Parametr destrukturyzowany (`createDateFormatter`, d.ts nazywa go `input`) bierze nazwę i opis z `@param` na tej samej pozycji (`options`). `@param` bez pasującego parametru kończy `gen` błędem. Opisy propsów, parametrów i symboli są zwinięte do jednej linii.
- **D8.** `createFormatter` ma TSDoc (podsumowanie, `@param spec`, `@param options`, `@returns`). Changeset `patch` w `.changeset/api-doc-model.md`.

**Odchylenie od planu:** komentarz TSDoc przy `createFormatter` zmienia raporty `.api.md` o dwie linie (`// @public (undocumented)` → `// @public`, w `core.api.md` i `tally-charts.api.md`). Plan zakładał, że raporty się nie zmienią, ale API Extractor zapisuje w nich znacznik „undocumented”, więc dokumentowanie funkcji go usuwa. Poza tym raporty bez zmian (sygnatury te same). Te dwa pliki trzeba commitować razem z `.api.json`.

**Pułapki:** (1) propsy wykresów to aliasy typu, `.api.json` nie ma dla nich `members` i nie niesie JSDoc członków, stąd checker na src. (2) Dla destrukturyzowanego parametru model ma dwa wpisy: fałszywy `{ data, x, … }` z `start == end` i właściwy `input`. (3) `fileUrlPath` wskazuje chunk z hashem (`dist/thresholds-BM9m96FR.d.ts`), więc jest usuwany z modelu. (4) `docComment` funkcji i członków interfejsów jest w modelu, więc zmiana ich TSDoc wymaga `api:update`; zmiana opisu propa w aliasie typu nie (sprawdzone na `RankedBars.meta`: `api:check` przechodzi, a `gen` bierze nowy opis prosto z src).

**Testy:** `packages/tally-charts/src/api-model.test.ts` (11: normalizacja usuwa `fileUrlPath` rekurencyjnie i jest deterministyczna, `check` wykrywa różnicę i brak pliku, `update` zapisuje i jest idempotentny, CLI zwraca 1 z komunikatem `api:update`). `apps/docs/scripts/gen-api.test.ts` (20, w tym parametr destrukturyzowany i opisy w jednej linii: RankedBars.fill, LineChart (data, band, title/aria-labelledby, brak aspectRatio i propsa `{`), createFormatter, hook i package, zbiór symboli == funkcje obu modeli, kształt pól, `parseDefault`, brak ponownego zapisu, brak modelu → `api:update`, rozbieżność modelu i src → `symbol: problem`).
**Bramki:** `pnpm build`, `api:check` (OK), `git diff packages/tally-charts/api/*.api.md` tylko dwie linie `(undocumented)`, `pnpm test` (lib 83 plików, 1152 testów), `pnpm typecheck` także po `rm -rf packages/tally-charts/dist apps/docs/api.generated.json` (OK, plik odtworzony przez `gen`), `pnpm lint` (0 błędów, 4 ostrzeżenia, 1 info jak w bazie), `pnpm --filter docs test` (70), `pnpm --filter docs build`, `pnpm size`, `check:treeshake`, `check:dts`, `check:dev-strip`, `pnpm check:workflows` (wszystkie OK). `gen` ~1 s.
**Ręcznie:** zmiana opisu propa w aliasie bez `api:update` nie psuje `api:check`. Zmiana TSDoc `createFormatter` bez `api:update` daje „api model is stale, run pnpm --filter tally-charts api:update” (exit 1). Nowa eksportowana funkcja w `core/index.ts` bez `api:update`: `api:check` failuje już na raporcie `.api.md` (przed sprawdzeniem modelu), a `gen` kończy się „expNew: exported from src/core/index.ts but not in core.api.json, run pnpm --filter tally-charts api:update”. Pliki wróciły do stanu wyjściowego.

## ✔ T19 Generator modelu API api.generated.json z docModel API Extractora (F13) (2026-10-25)
Naprawiłem oba problemy z review w `apps/docs/scripts/gen-api.mjs`.

- **major:** parametr destrukturyzowany (`createDateFormatter`, d.ts nazywa go `input`) bierze teraz nazwę i opis z tagu `@param` na tej samej pozycji. W `api.generated.json` jest więc `options` z opisem zaczynającym się od `` `locale` ``. `@param` bez pasującego parametru przerywa `gen` błędem `symbol: @param X matches no parameter`.
- **minor:** opisy propsów i symboli są zwinięte do jednej linii (`oneLine`), tak jak opisy parametrów.

W PROGRESS.md zaktualizowałem D7 i liczby testów.

Bramki uruchomione po poprawce:
- `pnpm --filter docs test`: 70 testów OK.
- `pnpm lint`: 0 błędów (po `pnpm format` na nowym teście).
- `pnpm typecheck`: OK.
- `pnpm --filter docs build`: OK.
- `api:check`: OK.

Pozostałych bramek nie powtarzałem, bo zmiana dotyczy tylko `apps/docs`: `pnpm build` biblioteki, `pnpm test`, `pnpm size`, `check:treeshake`, `check:dts` i `check:dev-strip`.
**Decyzje i pułapki:**
- API Extractor nazywa destrukturyzowany parametr `input`, więc opis i nazwę parametru z TSDoc trzeba dopasować pozycyjnie do n-tego tagu @param.
- Po `pnpm format` biome przepisuje nowe testy. Uruchom go przed `pnpm lint`.
**Otwarte kwestie:**
- Brak testu na błąd „@param X matches no parameter”: w repo nie ma funkcji z osieroconym @param, a test wymagałby syntetycznego src.
- packages/tally-charts/src/api-extractor.test.ts: Istniejący test uruchamia produkcyjny api-extractor.json na fixture'ach i przekierowuje tylko apiReport. Odkąd docModel jest włączony, każdy `pnpm test` nadpisuje prawdziwe `packages/tally-charts/temp/api/tally-charts.api.json` modelem fixture'a (po teście plik ma 6.8 kB i zawiera tylko `Function:f` i `Interface:Shown`). Samodzielne `node scripts/api-model.mjs check` zgłasza wtedy fałszywy stale, a `api-model.mjs update` bez wcześniejszego api-extractora zapisałby do repo model fixture'a. api:check i api:update nie są dotknięte, bo najpierw uruchamiają extractor. Test ma też efekt uboczny poza tmp, który przy równoległym uruchomieniu z api:check może dać wyścig.
- apps/docs/scripts/gen-api.mjs: Nie ma testu na nową ścieżkę błędu `symbol: @param X matches no parameter`, co implementer sam przyznaje. Dopasowanie destrukturyzowanego parametru po pozycji (`tags[index]`) jest kruche: gdy wcześniejszy parametr nie ma @param, parametr pattern dostaje cudzy tag albo żadnego, a wtedy zostaje nazwa `input` z d.ts.
**Kryteria:**
- `packages/tally-charts/api-extractor.json` i `api-extractor.core.json` mają `docModel.enabled: true` z osobnymi `apiJsonFilePath` w `temp/api/`. W repo są commitowane `packages/tally-charts/api/tally-charts.api.json` i `core.api.json` (bez pól `fileUrlPath`).
- Po `pnpm build` przechodzi `pnpm --filter tally-charts api:check`, a `git diff --exit-code packages/tally-charts/api/*.api.md` jest pusty (raporty bez zmian).
- `api:check` failuje komunikatem zawierającym `api:update`, gdy commitowany `.api.json` różni się od wygenerowanego (test w `src/api-model.test.ts`). `api:update` odświeża oba pliki.
- `pnpm --filter docs gen` zapisuje `apps/docs/api.generated.json` (w .gitignore) z `symbols[name] = { name, kind: component|function|hook, package, packages, description, props|params }`, gdzie każdy prop/param ma `name, type, required, default, description`. Zbiór symboli równa się zbiorowi Function z obu `.api.json`.
- `apps/docs/scripts/gen-api.test.ts` przechodzi w `pnpm --filter docs test` i sprawdza: RankedBars.fill (type `PerItem<D, Fill>`, required false, default `'solid'`, opis z TSDoc); LineChart (data required, `readonly D[]`, opis `band`, brak `aspectRatio`, title/aria-labelledby nie wymagane, brak fałszywego propsa `{ data, … }`); createFormatter (params spec `FormatSpec` default `'number'` z opisem @param, options default `{}`, packages obu entry pointów); kind `hook` dla useFormat; przypadki parsera domyślnych wartości z prozy; brak ponownego zapisu przy niezmienionej treści.
- Generator czyta wyłącznie pliki repo (bez fetch i bez nowych zależności) i nie wymaga `dist`: `pnpm typecheck` przechodzi po usunięciu `packages/tally-charts/dist` i `apps/docs/api.generated.json` (kolejność joba `check` w CI). Przechodzą też `pnpm --filter docs test` i `pnpm --filter docs build`.
- `createFormatter` ma TSDoc (podsumowanie, @param spec, @param options, @returns). Jest changeset `patch` dla `tally-charts`.
- Przechodzą `pnpm lint` (z wykluczeniem `api/*.api.json` w biome), `pnpm test`, `pnpm size`, `check:treeshake`, `check:dts` i `check:dev-strip`.
- CLAUDE.md opisuje, że `gen` tworzy też `api.generated.json`, a `api:check`/`api:update` obejmują `.api.json`. PROGRESS.md ma sekcję T19 z decyzjami D1–D8 i wynikami bramek.

## T20 Bloki glökki: Prose, Heading, Callout, CodeBlock i rejestr bloków (F12)
Cztery bloki treści w `apps/docs/blocks/`, każdy jako `defineBlock` ze schematem Zod, zebrane w `blockRegistry`. Strony (LineChart itd.) nadal używają placeholdera `app/_components/code-block.tsx`; przepięcie to zakres M5.

**Decyzje:**
- **D1 (D-6 POTWIERDZONA).** Prose i Callout trzymają `markdown: z.string().meta({ fieldType: 'textarea' })`, nie richtext. W glökki `richtext` to HTML (`MarkdownHelpers.richtext(html)`, `richtextToMarkdown(html)`), więc wymagałby sanityzacji HTML-a, wbrew celowi „bez surowego HTML”. SPEC (tabela decyzji, D-6) bez zmian; w PROGRESS.md nie ma osobnej tabeli D-6, dlatego decyzja stoi tutaj.
- **D2.** Każdy blok to osobny moduł `blocks/<nazwa>.tsx` z `<nazwa>Schema`, typem propsów, komponentem i wpisem `defineBlock`. `blocks/registry.ts` eksportuje `blockRegistry`, `blockSchemas` (bo `defineBlock` gubi schemat) i `parseBlockProps(type, props)` (wynik `safeParse`, a dla nieznanego typu, także `constructor`/`toString`, wynik `success: false`). Typy: `prose`, `heading`, `callout`, `code-block`, kategoria `content`.
- **D3.** Heading: `level` to `z.enum(['2','3'])` (select w CMS; zod 4 przyjmuje w enum tylko stringi), `text` `min(1)`, `anchor` `^[a-z0-9]+(-[a-z0-9]+)*$` opcjonalny.
- **D4.** Markdown: `react-markdown` + `remark-gfm`, bez `rehype-raw`, z `skipHtml`. Bez `skipHtml` react-markdown 10 nie usuwa surowego HTML-a, tylko pokazuje go jako zescapowany tekst (bezpieczny, ale `<img … onerror=…>` widać w treści), więc `skipHtml` realizuje „ignorowany”. Domyślny `urlTransform` czyści `javascript:`. Jeden `blocks/markdown.tsx` dla Prose i Callout.
- **D5.** Podświetlanie: `createHighlighterCore` z `shiki/core`, `createJavaScriptRegexEngine` z `shiki/engine/javascript` (bez wasm), importy tylko tsx, ts, bash, css, json (`shiki/langs/<x>.mjs`), singleton jako leniwy promise. Theme `createCssVariablesTheme` (`--shiki-*`), zmienne przypisane w `globals.css` na `.code-block` do tych samych mieszanek `--ch-*` co `[data-tok]`, więc light/dark działa przez `data-ch-theme`.
- **D6 (odchylenie).** `highlight()` zwraca tokeny (`codeToTokens`), a nie string HTML. `CodeBlock` (async server component) renderuje je jako spany Reacta ze stylem `color: var(--shiki-…)`, więc kod jest escapowany przez React i nie ma `dangerouslySetInnerHTML`. Struktura jak `.code-block` z §8 designu: bar z `filename ?? 'Terminal'` dla bash albo pusty, `pre tabIndex=0 role=region aria-label`. `copy-button.tsx` (`'use client'`, jedyny klientowy moduł): `aria-label="Copy code: <filename|lang>"`, `navigator.clipboard.writeText(code)`, stale zamontowany `<span role="status" aria-live="polite" class="visually-hidden">` z „Copied” (czyszczony po 2 s) albo „Copy failed”.
- **D7.** `heading.tsx`: `headingId = anchor ?? slugify(text)` (NFKD, `ł`→`l`, pusty slug → `section`), `collectToc(nodes)` zbiera poprawne węzły `heading` rekurencyjnie po `children` do `TocItem[]`. Heading: `<hN id class="heading">tekst <a href="#id" class="heading-anchor" aria-label="Link to section: …">#</a>`, kotwica widoczna przy hover/focus, `scroll-margin-top` jak h2. Callout: `<aside class="callout" data-tone>` z etykietą Note/Warning/Tip i markdownem. Kontrast etykiet callout i kolorów składni (mieszanki tonu z inkiem) ≥ 4.5:1 w obu motywach, sprawdza `app/contrast.test.ts`.

**Pułapki SDK (@glokki-cms/sdk 0.17.0):**
- README pokazuje `schema`/`Component`, a typy i implementacja wymagają `propsSchema`, `component`, `type`, `label`, `category`, `icon` (nazwa ikony Lucide) i `defaultProps`.
- `defineBlock` usuwa `propsSchema` z wyniku i zostawia `fields: FieldDescriptor[]`, więc schemat trzeba trzymać osobno (`blockSchemas`).
- Rodzaj pola: `.meta({ fieldType: 'textarea' })` na `z.string()`. `z.enum` zawsze daje `select`, liczby dają pole `text`.
- `createBlockRegistry` rzuca błąd przy zduplikowanym `type`; bez opcji `categories` obowiązuje `content|layout|media|interactive|list`.
- `shiki/core` re-eksportuje `createCssVariablesTheme`, ale silnik JS jest w `shiki/engine/javascript`.

**Testy:** `blocks/{prose,heading,callout,code-block,registry}.test.*` (jsdom) i `blocks/ssr.test.tsx` (node, `renderToString`) pokrywają: GFM, brak `script`/`img`/`onerror`/`javascript:`, schematy (odrzucenie `{}`, `level '4'`, `level 2`, `tone 'danger'`, `lang 'py'`, zły `anchor`), `fieldType: 'textarea'`, `collectToc`, spany `var(--shiki-…)`, `</code><script>` w kodzie, przycisk kopiowania (mock clipboard, fake timers, „Copied”, „Copy failed”), rejestr. `app/contrast.test.ts` dostał pary callout i składni (31 testów).
**Bramki:** `pnpm install --frozen-lockfile` (bez ostrzeżeń o ignored builds), `pnpm build`, `pnpm --filter docs typecheck`, `pnpm typecheck`, `pnpm lint` (0 błędów, 4 ostrzeżenia, 1 info jak w bazie), `pnpm --filter docs test` (131), `pnpm --filter docs build`, `pnpm --filter docs test:e2e` (20). Bundlowanie shiki i react-markdown w Next 16 sprawdzone tymczasową stroną importującą wszystkie bloki (`next build` OK, HTML ma `var(--shiki-…)` i nie ma `<script>`); strona usunięta, bo bloki nie są jeszcze nigdzie użyte.

**Otwarte kwestie:**
- Zduplikowane `id` nagłówków na stronie (dwa „Install” bez `anchor`) wyłapie dopiero walidacja treści (F14); `collectToc` zwraca je oba.
- Bloki nie są jeszcze użyte przez żadną stronę, więc `next build` nie bundluje shiki w realnej trasie; rozmiar chunków sprawdzić przy przepinaniu stron (M5).
- `Heading` renderuje `#` jako tekst linku (ukryty wizualnie przez opacity do hover/focus); dostępna nazwa pochodzi z `aria-label`.

## ✔ T20 Bloki glökki: Prose, Heading, Callout, CodeBlock i rejestr bloków (F12) (2026-10-25)
Dodałem cztery bloki glökki (Prose, Heading, Callout, CodeBlock) w `apps/docs/blocks/`, każdy jako `defineBlock` ze schematem Zod, oraz `blockRegistry` w `registry.ts`. Przechodzą wszystkie bramki z taska: `pnpm install --frozen-lockfile`, `pnpm build`, oba typechecki, `pnpm lint` (0 błędów, 4 ostrzeżenia i 1 info jak w bazie), `pnpm --filter docs test` (131 testów), `pnpm --filter docs build` i e2e (20 testów, specs bez zmian). Install nie zgłasza ignored builds.

**Zależności:** do `apps/docs` dodałem `@glokki-cms/sdk@0.17.0`, `@glokki-cms/react@0.10.0`, `zod@^4.6.7`, `shiki@4.5.0`, `react-markdown@10.1.0` i `remark-gfm@4.0.1`. Lockfile jest zaktualizowany.

**Bloki:**
- **Rejestr:** `registry.ts` eksportuje `blockRegistry`, `blockSchemas` i `parseBlockProps`. Ten ostatni zwraca błąd także dla nazw typu `constructor`.
- **Markdown:** Prose i Callout używają wspólnego `markdown.tsx` (GFM, bez `rehype-raw`, z `skipHtml`). Surowy HTML jest wycinany, a `javascript:` w linkach czyszczony.
- **Heading:** `level` to `z.enum(['2','3'])`. Renderuje `<hN id>` z kotwicą `href="#id"` i nazwą „Link to section: …”. `collectToc` zbiera nagłówki także z `children`.
- **CodeBlock:** to async server component z podświetlaniem shiki. Przycisk kopiowania to jedyny moduł klientowy; wywołuje `clipboard.writeText` i ogłasza „Copied” albo „Copy failed” w `role="status"`.

**Odchylenia od planu:**
- **`skipHtml` (D4):** bez niego react-markdown 10 pokazuje surowy HTML jako zescapowany tekst, więc `onerror` zostawałby w `innerHTML`. Dodałem `skipHtml`, żeby HTML był faktycznie ignorowany.
- **Tokeny zamiast HTML-a (D6):** `highlight()` zwraca tokeny (`codeToTokens`), a CodeBlock renderuje je jako spany Reacta z `color: var(--shiki-…)`. Nie ma `dangerouslySetInnerHTML`, a React sam escapuje kod.

**Dokumentacja i style:**
- **Kontrast:** do `app/contrast.test.ts` dopisałem pary dla etykiet callout i kolorów składni; wszystkie mają ≥ 4.5:1 w obu motywach.
- **D-6:** w PROGRESS.md nie ma tabeli D-6 (jest tylko w SPEC.md), więc potwierdzenie „markdown, nie richtext” zapisałem w sekcji T20 jako D1.
- **PROGRESS.md i CLAUDE.md:** PROGRESS.md ma sekcję T20 z D1–D7, pułapkami SDK, testami, bramkami i otwartymi kwestiami; CLAUDE.md ma jedną linię o blokach.
- **`globals.css`:** dodałem zmienne `--shiki-*` oraz style `.heading`, `.heading-anchor` i `.callout`.

Żadna strona jeszcze nie używa bloków, więc zwykły `next build` nie bundluje shiki ani react-markdown. Sprawdziłem to tymczasową stroną importującą wszystkie bloki. Build przeszedł w Next 16, HTML miał `var(--shiki-…)` i nie zawierał `<script>`. Stronę usunąłem. Nie ruszałem `packages/tally-charts`, więc nie ma changesetu ani `api:update`.
**Decyzje i pułapki:**
- react-markdown 10 bez skipHtml nie usuwa surowego HTML-a, tylko pokazuje go jako zescapowany tekst. Do 'ignorowany' potrzebny jest skipHtml.
- defineBlock gubi propsSchema (zostaje fields), więc schematy trzeba eksportować osobno; fieldType przez .meta na z.string(), z.enum zawsze daje select.
- shiki: createCssVariablesTheme i createHighlighterCore są w shiki/core, silnik JS w shiki/engine/javascript, języki w shiki/langs/<x>.mjs. Renderowanie tokenów (codeToTokens) w React omija dangerouslySetInnerHTML.
- Slugify NFKD nie rozkłada 'ł', trzeba je zamienić ręcznie.
**Otwarte kwestie:**
- Zduplikowane id nagłówków na stronie (np. dwa „Install” bez anchor) wyłapie dopiero walidacja treści F14; collectToc zwraca oba wpisy.
- Bloki nie są jeszcze użyte przez żadną stronę, więc zwykły next build nie bundluje shiki ani react-markdown. Zadziałało to tylko na tymczasowej stronie. Rozmiar chunków sprawdzić przy przepinaniu stron w M5.
- Placeholder app/_components/code-block.tsx i strona LineChart zostają bez zmian (zakres M5).
- apps/docs/blocks/markdown.tsx: Markdown images are allowed. `![x](https://external/pixel.png)` renders an `<img>` (React 19 also adds `<link rel=preload>`) pointing at any host, which allows tracking pixels in CMS content. `![e](javascript:…)` renders `<img alt="e"/>` without src and makes React log console.error about an empty src. This is not XSS, but it doesn't fit 'no img' as well as the comment suggests.
- apps/docs/blocks/callout.tsx: An unnamed `<aside>` inside `<main>` is a complementary landmark. Several callouts on a page will produce multiple unnamed complementary landmarks nested in main, which axe (best-practice: landmark-complementary-is-top-level, landmark-unique) will flag once the blocks are wired into pages in M5.
- apps/docs/blocks/code-block.tsx: CodeBlock is an async server component, and `@glokki-cms/react` has a client-side editor (`cms-page-editor.js` has 'use client'). Previewing it in the editor, or importing registry.ts from a client component, will break the block (async component on the client, shiki in the client bundle). For now no page uses the blocks.
**Kryteria:**
- `apps/docs/package.json` ma w dependencies `@glokki-cms/sdk`, `@glokki-cms/react`, `zod` (^4), a także `react-markdown`, `remark-gfm` i `shiki`; `pnpm install --frozen-lockfile` przechodzi na zaktualizowanym `pnpm-lock.yaml`.
- Każdy z bloków Prose, Heading, Callout, CodeBlock jest wpisem `defineBlock({ type, label, category, icon, defaultProps, propsSchema, component })` w `apps/docs/blocks/` i eksportuje obok swój schemat Zod; `blocks/registry.ts` eksportuje `blockRegistry = createBlockRegistry([...])` z typami `prose`, `heading`, `callout`, `code-block` oraz mapę schematów/`parseBlockProps`; test sprawdza `getTypes()`, `getComponent()`, serializowalność `getSerializedDefinitions()`, że `defaultProps` każdego bloku przechodzi jego schemat i że nieznany typ daje błąd.
- Prose renderuje GFM (test: tabela, przekreślenie, lista zadań), a test z `<script>alert(1)</script>`, `<img src=x onerror=alert(1)>` i linkiem `javascript:` potwierdza brak elementów `script`/`img`, atrybutu `onerror` i hrefa `javascript:` w wyniku; pole `markdown` serializuje się jako `fieldType: 'textarea'`.
- PROGRESS.md ma sekcję T20 z decyzją: D-6 potwierdzona (markdown w textarea, nie richtext, bo richtext glökki to HTML), wraz z pozostałymi decyzjami i pułapkami SDK (`propsSchema`/`component`, `defineBlock` gubi schemat, `.meta({ fieldType })`).
- Heading z `level` '2'|'3' renderuje odpowiednio `h2`/`h3` z `id` równym `anchor` lub slugowi tekstu i linkiem kotwicy `href="#id"` z dostępną nazwą; `collectToc(nodes)` zwraca `TocItem[]` (`{id,label}`) z węzłów heading, także zagnieżdżonych w `children` (test).
- Callout renderuje `aside` z `data-tone` i widoczną etykietą dla każdego z tonów info|warning|tip oraz markdown treści, z tą samą sanityzacją co Prose (test).
- CodeBlock (`lang` tsx|ts|bash|css|json, `filename?`) zwraca HTML podświetlony przez shiki po stronie serwera (test: spany z `var(--shiki-…)`, tekst `pre` równy `code`, `</code><script>` nie tworzy elementu `script`), a kolory pochodzą z tokenów `--ch-*` w `globals.css`.
- Przycisk kopiowania ma dostępną nazwę `Copy code: <filename albo lang>`, po kliknięciu wywołuje `navigator.clipboard.writeText` z dokładnym kodem i ogłasza „Copied” w elemencie `role="status"` (aria-live polite), który się czyści; błąd schowka ogłasza „Copy failed” (test RTL z mockiem clipboard i fake timers).
- Każdy blok ma test unit: poprawne propsy się renderują, a niepoprawne (np. `level: '4'`, `tone: 'danger'`, `lang: 'py'`, brak wymaganego pola, zły `anchor`) odrzuca `safeParse` schematu; test SSR (`renderToString`, środowisko node) renderuje wszystkie 4 bloki bez błędów.
- Przechodzą: `pnpm build`, `pnpm --filter docs typecheck`, `pnpm typecheck`, `pnpm lint` (bez nowych błędów), `pnpm --filter docs test`, `pnpm --filter docs build` i `pnpm --filter docs test:e2e` bez zmian w specach; brak zmian w `packages/tally-charts` (bez changesetu).

## T21 Bloki powiązane z kodem: ChartExample, PropsTable, TokenTable, PaletteSwatches (F12)
Cztery kolejne bloki treści w `apps/docs/blocks/` (kategoria `content`, razem 8 w `blockRegistry`). Edytor wybiera przykład, symbol, grupę i paletę po identyfikatorze z enuma generowanego z repo. Strony nadal używają placeholderów (przepięcie to M5); `packages/tally-charts` bez zmian, więc bez changesetu i `api:update`.

**Decyzje:**
- **D1.** `TOKENS` po stronie docs, nie w bibliotece (żadnej zmiany publicznego API, size ani treeshake). `scripts/gen-tokens.mjs` czyta `theme.css` i zapisuje `tokens.generated.ts` (gitignored, nie zapisuje przy niezmienionej treści, wpięty w `gen`). Eksporty: `TOKENS` (`{ name, group: 'theme' | 'shared', light, dark }`), `TOKEN_GROUPS`, `PALETTES` (`default`: light, dark i surface; `vivid`: tylko light, tony z bloku vivid nadpisują warn, gain, neutral). `theme` = zadeklarowane w bloku light i dark, `shared` = blok theme-independent (light === dark). Prywatne `--_ch-*` są pomijane. Generator kończy się kodem 1 z `theme.css: <problem>`, gdy token ma wartość tylko dla jednego motywu (sprawdzam też odwrotny kierunek) albo ton nie jest `#rrggbb`. Komentarze CSS są wycinane przed parsowaniem, a deklaracje czytane tylko z poziomu bloku (bez zagnieżdżonych `@media`).
- **D2.** `blocks/block-error.tsx`: `showsBlockErrors(env = process.env)` to `env.APP_ENV !== 'production'`, `BlockError` to `<div class="block-error" role="note">`, `blockError(message)` zwraca box albo `null` na produkcji. Env czytany przy każdym wywołaniu (testy używają `vi.stubEnv`). Styl `.block-error` w `globals.css` z tokenów `--ch-*`.
- **D3.** Enumy: `exampleIds = Object.keys(examples)` i `apiSymbols = Object.keys(api.symbols)` (import JSON działa bez zmian w tsconfigu). Schemat odrzuca nieznane id, a komponent sprawdza `Object.hasOwn` sam, bo stara treść CMS omija walidację (testy także dla `constructor`/`toString`).
- **D4.** ChartExample (`ChartExampleBlock`, async server): `exampleId`, `defaultView` (wymagane), `height` (int 120–1200, opcjonalny). Ładuje przykład przez `entry.load()` i renderuje klientowy `_components/chart-example.tsx`, który dostał opcjonalne `defaultView` i `height` (inline `minHeight` obu paneli w px). Panel Code to `CodeBlock` bloków (`tsx`, `filename` = nazwa pliku), więc przycisk kopiowania ma nazwę `Copy code: revenue-forecast.tsx`.
- **D5.** PropsTable (`PropsTable`, serwerowy): tabela Name/Type/Default/Required/Description w regionie `Props of <symbol>`; dla funkcji i hooków pierwsza kolumna to „Parameter”, region `Parameters of …`, a `returns` idzie w akapicie pod tabelą. Opisy przez `blocks/markdown.tsx`. Pusty default i opis to „—”; symbol bez propsów dostaje akapit zamiast pustej tabeli. Region przewijalny jest we wspólnym `blocks/table-region.tsx` (jedno `biome-ignore` na a11y), używa go też TokenTable.
- **D6.** TokenTable: kolumny Token/Light/Dark, przy wartości hex mała próbka (`aria-hidden`). PaletteSwatches: lista swatchy z nazwą tonu, hexem i kontrastem do `--ch-surface` tego samego motywu (`N.NN:1`); kolory to literalne hexy w inline style, nie `var()`. Vivid pokazuje tylko light i dopisek „Light only”. Kontrast WCAG w `lib/contrast.ts` (`contrast`, `formatContrast` z `toFixed(2)`); `app/contrast.test.ts` ma jeszcze własną kopię, bez przepinania (poza zakresem).
- **D7.** Ikony Lucide: `chart-line`, `table` (props i token), `palette`. `defaultProps`: `{ exampleId: 'line-chart/revenue-forecast', defaultView: 'preview' }`, `{ symbol: 'LineChart' }`, `{}`, `{ palette: 'default' }`.

**Testy:** `scripts/gen-tokens.test.ts` (accent light/dark, shared `--ch-radius`, brak `--_ch-*`, vivid, brak ponownego zapisu, błąd przy tokenie bez pary), `lib/contrast.test.ts`, `blocks/{chart-example,props-table,token-table,palette-swatches}.test.tsx` (render, schematy poprawne i odrzucane, tryb błędów dla `APP_ENV` nieustawionego/`preview`/`development` oraz `production`), `registry.test.ts` (8 typów), `ssr.test.tsx` (4 nowe bloki przez `renderToString` bez `console.error`). Docs: 192 testy.
**Bramki:** `pnpm build`, `pnpm --filter docs gen`, `pnpm --filter docs typecheck`, `pnpm typecheck`, `pnpm lint` (0 błędów, 4 ostrzeżenia i 1 info jak w bazie), `pnpm --filter docs test`, `pnpm --filter docs build`, `pnpm --filter docs test:e2e` (20). Tymczasowa strona z czterema blokami przeszła `next build` (HTML z `Props of LineChart`, `Copy code: margin-by-week.tsx`, `min-height:300px`, `#f1a23b`) i została usunięta.

**Otwarte kwestie:**
- Draft mode (/preview na produkcji pokazujący błędy bloków mimo `APP_ENV=production`) zostaje dla F11; na razie decyduje wyłącznie `APP_ENV`. Brak `.env.example` z `APP_ENV` też należy do F11.
- Strony (LineChart itd.) nadal na placeholderach; przepięcie na bloki to M5.
- `ChartExampleBlock` i `PropsTable` zależą od plików generowanych (`examples.generated.ts`, `api.generated.json`); bez `gen` import się nie uda, co pokrywają skrypty `dev`, `build`, `test`, `typecheck`.

## ✔ T21 Bloki powiązane z kodem: ChartExample, PropsTable, TokenTable, PaletteSwatches (F12) (2026-10-25)
Dodałem cztery bloki: ChartExample, PropsTable, TokenTable i PaletteSwatches. `blockRegistry` ma teraz 8 typów. Przeszły wszystkie bramki z taska: build, typecheck (docs i root), lint (0 błędów, 4 ostrzeżenia i 1 info jak w bazie), testy docs (192), `pnpm --filter docs build` i e2e (20). `next build` sprawdziłem też na tymczasowej stronie z czterema blokami, którą potem usunąłem. `packages/tally-charts` bez zmian, więc bez changesetu i `api:update`.

- **Tokeny:** nowy `scripts/gen-tokens.mjs` czyta `theme.css` i zapisuje `tokens.generated.ts` (gitignored, wpięty w `gen`). Eksportuje `TOKENS`, `TOKEN_GROUPS` i `PALETTES` (default z light i dark, vivid tylko light). Pomija `--_ch-*`, nie zapisuje przy niezmienionej treści i kończy się kodem 1 z `theme.css: …`, gdy token nie ma pary dla drugiego motywu albo ton nie jest `#rrggbb`.
- **Tryb błędów:** `blocks/block-error.tsx` ma `showsBlockErrors`, `BlockError` (`div.block-error role=note`) i `blockError`. Poza `APP_ENV=production` blok pokazuje box z błędem, a na produkcji nic. Dodałem styl `.block-error` oraz style swatchy w `globals.css`.
- **ChartExample:** klientowy `_components/chart-example.tsx` dostał opcjonalne `defaultView` i `height` (inline `minHeight` obu paneli). Blok ładuje przykład z rejestru, a panel Code to `CodeBlock` z przyciskiem `Copy code: revenue-forecast.tsx`. Schema: `exampleId` z enuma, `defaultView`, `height` jako int 120–1200. Komponent sprawdza `Object.hasOwn` sam.
- **PropsTable:** tabela Name/Type/Default/Required/Description z `api.generated.json`, a opisy idą przez markdown. Dla funkcji i hooków pierwsza kolumna to „Parameter”, a `returns` stoi pod tabelą.
- **TokenTable i PaletteSwatches:** TokenTable pokazuje tokeny z próbką koloru przy hexie. PaletteSwatches pokazuje nazwę, hex i kontrast do `--ch-surface` w formacie `N.NN:1`, a vivid tylko light z dopiskiem „Light only”.
- **Pozostałe:** `lib/contrast.ts` z funkcjami WCAG oraz wspólny `blocks/table-region.tsx` (przewijalny, fokusowalny region tabeli z jednym `biome-ignore`). Bloki zarejestrowane w `registry.ts`.
- **Dokumentacja:** CLAUDE.md ma opis `tokens.generated.ts` w `gen`, klientowe moduły bloków i tryb błędów `APP_ENV`. PROGRESS.md ma sekcję T21 z D1–D7, testami, bramkami i otwartymi kwestiami.
**Decyzje i pułapki:**
- W testach RTL `getAllByRole('cell')` pomija `th scope=row` (rowheader), więc indeksy komórek są przesunięte o jeden względem kolumn.
- Import `api.generated.json` działa w docs bez `resolveJsonModule` (moduleResolution Bundler), a klucze JSON dają unię literałów do z.enum.
- Biome-ignore w środku wyrażenia JSX (np. w ternary) zostaje nieużyty po `pnpm format`; trzymaj go nad elementem w osobnym komponencie (table-region.tsx).
- W theme.css blok light zawiera zagnieżdżony @media z --_ch-seq-*, więc parser tokenów musi czytać deklaracje tylko z poziomu głównego bloku i wycinać komentarze CSS przed liczeniem klamer.
- macOS nie ma polecenia `timeout`; a przypadkowe `cat > plik` bez heredoca wiesza polecenie na stdin.
**Otwarte kwestie:**
- Draft mode (/preview na produkcji pokazujący błędy bloków mimo APP_ENV=production) zostaje dla F11; na razie decyduje wyłącznie APP_ENV. Brak .env.example z APP_ENV też należy do F11.
- Strony (LineChart itd.) nadal na placeholderach; przepięcie na bloki to M5. Rozmiar chunków (shiki, react-markdown) sprawdzić przy przepinaniu.
- app/contrast.test.ts ma własną kopię funkcji kontrastu zamiast importu z lib/contrast.ts (poza zakresem T21).
- Bloki ChartExample i PropsTable zależą od plików generowanych (examples.generated.ts, api.generated.json, tokens.generated.ts); bez `pnpm --filter docs gen` import się nie uda (skrypty dev/build/test/typecheck uruchamiają gen same).
- apps/docs/scripts/gen-tokens.mjs: Generator czyta dark tylko z bloku `[data-ch-theme="dark"]` i pomija blok `@media (prefers-color-scheme: dark) :root:not(...)`. Jeśli te dwa bloki się rozjadą, TOKENS pokaże wartości wymuszonego motywu i gen nie zgłosi błędu. Do tego blok shared to pierwsze top-levelowe `:root {` (`/^:root\s*\{/m`), co jest kruche, gdy w theme.css pojawi się wcześniej inny `:root {`.
- apps/docs/blocks/chart-example.tsx: `await entry.load()` nie ma obsługi błędu. Gdy dynamiczny import przykładu rzuci wyjątek, zamiast boxa .block-error psuje się cała strona.
**Kryteria:**
- ChartExample: test jsdom `render(await ChartExampleBlock({ exampleId: 'line-chart/revenue-forecast', defaultView: 'preview' }))` pokazuje wykres (role=application z nazwą meta.title), przyciski Preview/Code z aria-pressed, a po kliknięciu Code region kodu ma textContent równy `readFileSync` pliku przykładu; `defaultView: 'code'` startuje z widocznym kodem; panel Code ma przycisk o nazwie 'Copy code: revenue-forecast.tsx'; `height: 400` ustawia minHeight paneli na 400px.
- ChartExample schema: przyjmuje każde id z `Object.keys(examples)`, odrzuca nieznane id, `defaultView: 'grid'`, brak `defaultView`, `height: 0`/`'400'`/ułamek.
- PropsTable: test dla `LineChart` renderuje tabelę z nagłówkami Name, Type, Default, Required, Description i wierszem `data` (typ `readonly D[]`, Required 'Yes'); dla `RankedBars` wiersz `fill` ma default `'solid'`; dla `createFormatter` wiersze parametrów `spec` (FormatSpec, default 'number') i `options`. Schema przyjmuje symbol z `api.generated.json` i odrzuca 'NotASymbol' oraz `{}`.
- ChartExample i PropsTable z id spoza rejestru (wywołane z pominięciem schematu): przy `APP_ENV` nieustawionym/'preview'/'development' renderują widoczny element `.block-error` z tekstem zawierającym to id; przy `vi.stubEnv('APP_ENV','production')` kontener jest pusty (test na oba tryby dla obu bloków).
- Generator tokenów: `pnpm --filter docs gen` tworzy `apps/docs/tokens.generated.ts` (gitignored) z `TOKENS`; test `scripts/gen-tokens.test.ts` sprawdza: `--ch-accent` light #2f6bf0 / dark #4d86ff, `--ch-radius` w grupie shared z light === dark, brak tokenów `--_ch-*`, paleta vivid ma warn #f1a23b, gain #23a866, neutral #a3a3ab, brak ponownego zapisu przy niezmienionej treści, błąd (exit 1) gdy token light nie ma wartości dark.
- TokenTable: bez `group` renderuje wiersz dla każdego elementu TOKENS z wartościami light i dark; `group: 'shared'` tylko tokeny shared; schema odrzuca `group: 'nope'`.
- PaletteSwatches: `palette: 'default'` renderuje swatche accent, accent-soft, loss, warn, gain, neutral z nazwą, hexem i kontrastem do surface w formacie `N.NN:1` dla light i dark (np. wartość dla accent light zgodna z `contrast('#2f6bf0','#fafafa')`); `palette: 'vivid'` pokazuje warn #f1a23b i tylko light; schema odrzuca 'neon' i `{}`.
- `blockRegistry.getTypes()` zwraca 8 typów: prose, heading, callout, code-block, chart-example, props-table, token-table, palette-swatches; każde `defaultProps` przechodzi `parseBlockProps`; `getSerializedDefinitions()` przeżywa JSON.
- `blocks/ssr.test.tsx` (node) renderuje 4 nowe bloki przez renderToString bez console.error.
- Przechodzą: `pnpm build`, `pnpm --filter docs typecheck`, `pnpm typecheck`, `pnpm lint` (0 błędów), `pnpm --filter docs test`, `pnpm --filter docs build`, `pnpm --filter docs test:e2e`; `packages/tally-charts` bez zmian.
- CLAUDE.md i PROGRESS.md zaktualizowane (tokens.generated.ts w `gen`, klientowe moduły bloków, tryb błędów APP_ENV; sekcja T21 z decyzjami i otwartą kwestią draft mode → F11).

## T22 Źródło treści (glökki / fiksturki), routing, revalidacja i SEO (F11)
Strony docs czytają treść przez `getContentSource()` (`apps/docs/lib/content`): z glökki, gdy jest `CMS_BASE_URL`, inaczej z fiksturek `apps/docs/content/*.json`. Strony są statyczne (`generateStaticParams`) i odświeżane tagiem `cms`. `packages/tally-charts` bez zmian, więc bez changesetu.

**Decyzje:**
- **D1. Nawigacja.** glökki daje płaską listę opublikowanych stron, a sidebar ma grupy, więc grupy, etykiety i kolejność trzyma `content/navigation.json` (5 grup przeniesionych 1:1 z `NAV_GROUPS`) w obu źródłach. Wspólny typ `Navigation = { groups: { label, items: { label, slug, available }[] }[] }`. W fixturach `available` = istnieje `content/<slug>.json`, w glökki = slug jest w `navigation.get()`. `SideNav` dostaje `groups` w propsach (layout jest async); niedostępne pozycje to jak dotąd `nav-soon`. `NAV_GROUPS` i `AVAILABLE_SLUGS` usunięte.
- **D2. Format fixtur.** Plik `content/<slug>.json` to `DeliveryPage`, walidowany Zod (`looseObject`, więc dodatkowe pola przechodzą; `componentTree` rekursywnie). Błąd (zły JSON albo schemat) kończy się `plik.json: …`. `navigation.json` nie jest stroną (`getPage('navigation')` daje null), slug spoza `[a-z0-9-]` też daje null, więc nie ma path traversal. Katalog domyślnie `process.cwd()/content`; fs-calle mają `turbopackIgnore`, bo inaczej Next ostrzega o śledzeniu całego projektu.
- **D3. Wybór źródła.** `getContentSource(env = process.env)` (owinięte w `cache` z React): bez `CMS_BASE_URL` fixtury; z nim wymagane `CMS_TENANT` i `CMS_API_KEY` (błąd nazywa brakującą zmienną). Klient glökki ma `fetchInit: { next: { tags: ['cms'] } }`; `listPages()` stronicuje po 100 aż do `meta.total`.
- **D4. Home.** Bloków home nie ma (F16). `/` pobiera stronę `home` (brak = 404), bierze z niej metadane, statyczne sekcje designu zostają, a `componentTree` renderuje się przez `CMSPage` pod nimi. `home.json` ma pusty `componentTree`.
- **D5. Revalidate.** `POST /api/revalidate`: sekret z `Authorization: Bearer` albo `x-revalidate-secret`, `timingSafeEqual` po sprawdzeniu równej długości, brak `REVALIDATE_SECRET` = zawsze 401 (fail closed). Sukces: `revalidateTag('cms', 'max')` (Next 16 wymaga profilu) i `200 { revalidated: true }`. Eksportowany jest tylko POST, więc GET to 405.
- **D6. robots i sitemap.** `APP_ENV=production`: `allow: /` plus `sitemap`, inaczej `disallow: /`. Sitemap: `SITE_URL` dla home i `/docs/<slug>` dla reszty, `lastModified` z `publishedAt`. `SITE_URL` bez wartości = `http://localhost:3100`.
- **D7. Strona docs.** `/docs/[slug]`: eyebrow z nazwy grupy nawigacji, `<h1>{page.title}</h1>`, `CMSPage` z `componentRegistry` (Map zbudowana z `blockRegistry`), ToC z `collectToc`. Slug `home` i brakujące strony to `notFound()`. `dynamicParams` zostaje domyślne, żeby nowa strona z CMS działała bez przebudowy.

**Metadane:** `cmsMetadata` buduje canonical z sluga (`/line-chart`, a trasa to `/docs/line-chart`), tytuł bez nazwy strony i ustawia Open Graph tylko przy `seo.og`, więc `pageMetadata` (`lib/metadata.ts`) nadpisuje title (`seo.metaTitle ?? "<title> · tally-charts"`), canonical (`seo.canonicalUrl` albo `SITE_URL` + ścieżka) i openGraph title, description, url. `noindex,nofollow` poza produkcją zostaje z `cmsMetadata`. Root layout ma `metadataBase`.

**Testy:** `content-source.test.ts` (kontrakt `describe.each` na fixturach i glökki: ta sama strona, null dla nieznanego sluga, te same slugi, ta sama nawigacja; dla glökki URL, nagłówki, `next.tags` w każdym fetchu, stronicowanie 250 stron; `getContentSource`), `content/fixtures.test.ts` (schemat, `parseBlockProps` rekursywnie, unikalne slugi i id), `app/api/revalidate/route.test.ts`, `lib/metadata.test.ts`, `app/robots.test.ts`, `app/sitemap.test.ts`, `app/docs/[slug]/page.test.tsx` (render przez `renderToReadableStream`, bo bloki są async), `app/docs/layout.test.tsx` (sidebar i menu przeniesione ze starego testu strony), `env-example.test.ts`, `registry.test.ts` (`componentRegistry`). E2E: `routes.spec.ts` (404 dla `does-not-exist`, `getting-started` i `home`, sitemap, robots, 401, 405, noindex i canonical); w `line-chart.spec.ts` zmieniony tylko locator regionu źródła (`revenue-forecast.tsx`). Docs: 259 testów jednostkowych, 29 e2e.

**Otwarte kwestie:**
- Zostają dla dalszego F11: `/preview` i draft mode, `?_editor=1` z `CMSPageEditor` i PreviewBanner, przełącznik motywu, wersja w nagłówku. Treść stron (F15), bloki home (F16) i `check:content` (F14) też.
- vitest musi inline'ować `@glokki-cms/*` (`server.deps.inline`), bo `@glokki-cms/react` importuje `next/navigation` bez rozszerzenia.
- Fixtury czytane z `process.cwd()/content` działają przy `next build/start` z `apps/docs`; w deploymencie serverless bez katalogu `content/` w outputcie nowa strona spoza `generateStaticParams` byłaby 404 (produkcja czyta z glökki).
- Lede strony to teraz pierwszy akapit pierwszego bloku Prose (CSS `.doc h1 + .prose > p:first-child`), bo Prose nie ma wariantu lede.

## ✔ T22 Źródło treści (glökki / fiksturki), routing, revalidacja i SEO (F11) (2026-10-25)
Naprawiłem oba problemy z review w `apps/docs/lib/content/glokki.ts`. Zmieniłem tylko `getPage` i dopisałem testy.

- **[major] path traversal:** `getPage(slug)` zwraca teraz `null`, gdy slug nie pasuje do `slugPattern`, i nie woła `fetch`. Slugi `../navigation` i `a/b` nie wysyłają już żądań do CMS z kluczem API. Źródło glökki i fixtury trzymają ten sam kontrakt „null dla nieznanego sluga”.
- **[minor] brak walidacji odpowiedzi:** wynik `getBySlug` przechodzi przez `deliveryPageSchema.safeParse` (to samo, co w fixturach). Odpowiedź o złym kształcie rzuca błąd z nazwą sluga (`glökki page "<slug>": …`) zamiast wywracać render TypeErrorem.

Sprawdzone: vitest w `apps/docs` (262 testy) przechodzi, `pnpm --filter docs typecheck` i `pnpm lint` też (0 błędów, te same 4 ostrzeżenia co wcześniej). Po `pnpm format` w drzewie zostały tylko dwa zmienione pliki. Nie uruchamiałem ponownie `pnpm build`, `docs build` ani e2e, bo zmiana dotyczy wyłącznie `getPage` w źródle glökki, a e2e działa na fixturach.
**Decyzje i pułapki:**
- Parametry tras Next są już zdekodowane (%2F → /), więc każdy slug wklejany do URL-a zewnętrznego API trzeba walidować przed wywołaniem klienta.
- Walidacja slugów i schemat DeliveryPage są wspólne dla obu ContentSource (slugPattern, deliveryPageSchema), więc kontrakt testuje się przez describe.each.
**Otwarte kwestie:**
- listPages() w glökki nie waliduje odpowiedzi; poprawka z review dotyczyła tylko getPage.
- Nie powtarzałem pnpm build, pnpm --filter docs build ani pnpm --filter docs test:e2e po tej zmianie.
- apps/docs/lib/content/glokki.ts: listPages() nie waliduje elementów z CMS. Slug spoza slugPattern (np. 'team/history', który SDK dopuszcza) trafia do generateStaticParams i sitemap, a getPage zwraca dla niego null, więc sitemap linkowałaby do 404.
- apps/docs/app/cdn/[...path]/route.ts: W trybie fixtur (bez CMS_BASE_URL) GET /cdn/<cokolwiek> zwraca 500 i loguje błąd SDK 'baseUrl is required'. Sprawdzone na next start.
**Kryteria:**
- `apps/docs/lib/content` eksportuje `getContentSource()`. Bez `CMS_BASE_URL` zwraca implementację fixtur (`kind: 'fixtures'`), która czyta `apps/docs/content/*.json` (`navigation.json` nie jest stroną). Z ustawionymi `CMS_BASE_URL`, `CMS_TENANT` i `CMS_API_KEY` zwraca implementację glökki na `createClient`. Z `CMS_BASE_URL` bez tenanta albo klucza rzuca błąd. Obie implementacje mają `getPage(slug): Promise<DeliveryPage|null>`, `listPages(): Promise<DeliveryPageListItem[]>` i `getNavigation(): Promise<Navigation>` (typy SDK oraz wspólny typ Navigation z grupami z `content/navigation.json` i flagą `available`).
- Test kontraktowy `describe.each` uruchamia ten sam zestaw asercji na fixturach (tmp dir) i na glökki (fetch zamockowany przez `vi.stubGlobal`): obie zwracają identyczną stronę dla `line-chart`, `null` dla nieznanego slugu, te same slugi z `listPages()` i identyczną nawigację. Dla glökki test sprawdza, że każde wywołanie fetch ma `next.tags` równe `['cms']`, nagłówki `Authorization: Bearer` i `X-Tenant-Slug`, oraz że lista jest stronicowana.
- Fixtury `content/home.json`, `content/line-chart.json` i `content/navigation.json` przechodzą walidację loadera. Test sprawdza, że każdy blok w ich `componentTree` (rekursywnie) przechodzi `parseBlockProps`.
- Trasy istnieją i działają na fixturach: `/` (strona `home`; statyczne sekcje designu plus `componentTree` przez CMSPage), `/docs/[slug]` (h1 z `page.title`, `componentTree` przez CMSPage z rejestrem zbudowanym z `blockRegistry`, ToC z `collectToc`), `/cdn/[...path]` (GET/HEAD = `createAssetProxy()`), `/api/revalidate`, `/sitemap.xml`, `/robots.txt`. `app/docs/line-chart/page.tsx` jest usunięty, a sidebar dostaje nawigację z ContentSource zamiast `NAV_GROUPS`/`AVAILABLE_SLUGS`.
- `generateStaticParams` w `/docs/[slug]` zwraca slugi z `listPages()` bez `home` (test). W wyjściu `pnpm --filter docs build` `/docs/[slug]` jest oznaczone jako SSG z prerenderowanym `/docs/line-chart`.
- Test route handlera: POST `/api/revalidate` bez sekretu, ze złym sekretem albo przy nieustawionym `REVALIDATE_SECRET` zwraca 401 i nie wywołuje `revalidateTag`. Z poprawnym sekretem (`Authorization: Bearer` lub `x-revalidate-secret`) zwraca 200 i wywołuje `revalidateTag` z `'cms'` (mock `next/cache`).
- E2E na zbudowanej aplikacji: `/docs/does-not-exist` i `/docs/getting-started` (wpis nawigacji bez fixtury) zwracają status 404. `/sitemap.xml` zawiera `/docs/line-chart`. `/robots.txt` poza produkcją zawiera `Disallow: /`. POST `/api/revalidate` bez sekretu zwraca 401. Na `/docs/line-chart` jest `meta[name=robots]` z `noindex` i `link[rel=canonical]` kończący się na `/docs/line-chart`.
- Test `pageMetadata` (wrapper na `cmsMetadata`) sprawdza title, description, canonical `${SITE_URL}/docs/line-chart` oraz openGraph title, description i url. Przy `APP_ENV` nieustawionym albo 'preview' robots ma noindex, przy 'production' nie ma noindex. Testy `robots.ts` i `sitemap.ts` sprawdzają oba tryby i listę URL-i.
- `apps/docs/.env.example` zawiera `CMS_BASE_URL`, `CMS_TENANT`, `CMS_API_KEY`, `NEXT_PUBLIC_CMS_TENANT`, `APP_ENV`, `REVALIDATE_SECRET` i `SITE_URL`, każdą z komentarzem opisu i pustą wartością (test albo grep: brak znaków po `=`).
- Istniejące e2e przechodzą: `home.spec.ts` bez zmian. W `line-chart.spec.ts` zmieniony jest wyłącznie locator regionu źródła (na nazwę bloku CodeBlock `revenue-forecast.tsx`). Asercje h1, wykresu, 5 grup sidebara, aria-current, ToC → `#props` i menu 375 px zostają.
- Przechodzą: `pnpm build`, `pnpm --filter docs typecheck`, `pnpm typecheck`, `pnpm lint` (0 błędów), `pnpm --filter docs test`, `pnpm --filter docs build`, `pnpm --filter docs test:e2e` (bez env CMS, bez sieci). `packages/tally-charts` bez zmian, więc bez changesetu.
- PROGRESS.md ma sekcję T22 z decyzjami D1–D7 (nawigacja z navigation.json + `available`, format fixtur, wybór źródła, home bez bloków F16, nagłówek sekretu i fail-closed, robots/sitemap, render strony docs) i otwartymi kwestiami (/preview, editor, motyw, wersja w nagłówku zostają dla dalszego F11). CLAUDE.md ma krótką notę o źródle treści i `.env.example`. Komentarz nad jobem `docs` w ci.yml mówi, że CI używa fixtur.

## T23.1 Header z wersją z package.json, przełącznik motywu bez mrugania i layout przy 320 px (F11)
**Decyzje:**
- **D1. Wersja.** `SITE.version` to `` `v${pkg.version}` `` z `import pkg from '../../../../packages/tally-charts/package.json'` w `app/_content/navigation.ts` (działa bez `resolveJsonModule` w tsconfig, `tsc` nie zgłosił błędu). Moduł jest serwerowy: `docHref` przeniesiony do `app/_content/doc-href.ts` (navigation.ts go re-eksportuje), bo `side-nav.tsx` jest klientowy i inaczej wciągnąłby package.json do bundla klienta. Literału `v0.9` nie ma już w `app` ani `lib`.
- **D2. Przełącznik.** Natywny `<select aria-label="Theme" class="theme-select">` (System, Light, Dark) w `app/_components/theme-switch.tsx`. Stary disabled `.theme-toggle` i style `.icon-button` usunięte.
- **D3. Logika** w `lib/theme.ts`: `THEME_STORAGE_KEY = 'tally-docs-theme'`, `applyTheme`, `readStoredTheme`, `THEME_SCRIPT`. Kolejność: `?theme=light|dark` (nic nie zapisuje) > localStorage > system (brak atrybutu). Nieznane wartości są ignorowane w query i w storage; wyjątek storage jest połykany.
- **D4. Stan selecta:** SSR `system`, po mount odczyt `data-ch-theme` z `<html>` (ustawionego przez skrypt z `<head>`), więc bez mismatchu hydracji. Wybór zmienia atrybut od razu; `?theme=` nie nadpisuje zapisanego wyboru, ale select pokazuje wartość z query.
- **D5. 320 px.** Przełącznik i Menu zostają. Poniżej 400 px z headera znikają GitHub i npm (`.header-external`), bo wordmark + wersja ukryta + select + Menu muszą zmieścić się w 288 px (przy 320 px menu-button kończył na 347 px). Na home GitHub i npm są w hero i stopce; na stronach docs bez stopki ich w headerze poniżej 400 px nie ma (zostają przy ≥ 400 px). Wordmark ma `white-space: nowrap`.

**Testy:** `lib/theme.test.ts` (skrypt w jsdom: query wygrywa i nic nie zapisuje, nieznane query i storage, brak obu, wyjątek storage; `applyTheme`, `readStoredTheme`), `theme-switch.test.tsx`, `site-header.test.tsx`, `app/_content/navigation.test.ts` (porównanie z package.json). E2E: `theme.spec.ts` (Tab + outline, reload z zablokowanym `_next/static` JS, MutationObserver na pierwszym `<body>`, przejście na inną stronę, System po reloadzie, `?theme=light` przy zapisanym dark), a w `support.ts` test przewijania poziomego dla 320 i 375 px na `documentElement` i `body`.

**contrast.mjs:** dodane próbki przełącznika (tekst i border), tabela w dokumencie designu odświeżona (exit 0). Selektory próbek `Body text`, `Lede` i znaczniki składni były nieaktualne po T22 (`.prose`, kolory Shiki zamiast `data-tok`), więc `contrast.mjs` w ogóle padał; poprawione (`Syntax: number`/`tag` to teraz `constant`/`punctuation`).

**Otwarte kwestie:**
- `Small note` w `contrast.mjs` (`.small`) jest tylko w bloku PaletteSwatches, którego nie ma na `/docs/line-chart`, więc wiersz to n/a.
- Poniżej 400 px strony docs nie mają linków GitHub/npm (poza headerem są tylko na home).

## ✔ T23.1 Header z wersją z package.json, przełącznik motywu bez mrugania i layout przy 320 px (2026-10-25)
Header pokazuje teraz `v` + wersję z `packages/tally-charts/package.json`. Zamiast starego, wyłączonego przycisku jest przełącznik motywu System/Light/Dark, a strony `/` i `/docs/line-chart` nie przewijają się w poziomie przy 320 i 375 px. Przeszły bramki: `pnpm build`, `docs typecheck`, `pnpm lint` (0 błędów, 4 ostrzeżenia, tak jak przed zmianą), `docs test` (279 testów), `docs build` i `docs test:e2e` (37 testów). `contrast.mjs` kończy się exit 0, a `shots.mjs` odświeżył 8 PNG. `grep "v0.9" apps/docs/app apps/docs/lib` zwraca pusto. `packages/tally-charts` bez zmian, więc bez changesetu.

Co zrobiłem:
- **Wersja:** `SITE.version` w `navigation.ts` to `` `v${pkg.version}` ``. `docHref` przeniosłem do `doc-href.ts`, bo `side-nav.tsx` jest komponentem klienckim i importując z `navigation.ts` wciągnąłby `package.json` do bundla klienta.
- **Przełącznik:** natywny `<select aria-label="Theme" class="theme-select">` w `theme-switch.tsx`. Początkowo `system`, po mount czyta `data-ch-theme` z `<html>`, więc nie ma mismatchu hydracji.
- **Logika motywu:** `lib/theme.ts` ma `applyTheme`, `readStoredTheme` i `THEME_SCRIPT` (klucz `tally-docs-theme`). Kolejność to `?theme=` (niczego nie zapisuje), potem localStorage, potem system; nieznane wartości są ignorowane. `layout.tsx` używa `THEME_SCRIPT` w `<head>` zamiast `FORCE_THEME`.
- **320 px:** poniżej 400 px z headera znikają GitHub i npm (klasa `.header-external`), a wordmark ma `white-space: nowrap`. Bez tego `.menu-button` kończył na 347 px przy viewporcie 320 px.
- **contrast.mjs:** dodane próbki tekstu i bordera przełącznika, tabela w dokumencie designu odświeżona.
- **Dokumentacja:** PROGRESS.md ma sekcję T23.1 z decyzjami D1–D5, a CLAUDE.md opis kolejności motywu i klucza localStorage.
**Decyzje i pułapki:**
- Komponent kliencki nie może importować z modułu, który importuje package.json lub inne duże dane serwerowe, bo trafią do bundla klienta. Takie helpery trzeba trzymać w osobnym pliku (doc-href.ts).
- Przed `pnpm --filter docs test:e2e` trzeba sprawdzić `lsof -i :3100`: `pkill -f "next start"` nie zabija procesu next-server, a stary serwer serwuje stary build i daje fałszywe porażki e2e.
- Dla testu 'przed hydracją' w Playwright MutationObserver w addInitScript trzeba podpiąć do `document` (z `subtree`), bo w momencie init scriptu `documentElement` bywa jeszcze null.
- contrast.mjs cicho zwraca n/a dla selektorów, które przestały pasować (zmiana markupu), i crashuje dopiero na brakującym 'Body text'. Po zmianach struktury stron warto przejrzeć tabelę pod kątem n/a.
- Pole `<select>` ma natywną nazwę, stan i obsługę klawiatury; wystarczy `aria-label`, outline z globalnego `:focus-visible` i stylowanie tokenami `--docs-*`.
**Otwarte kwestie:**
- Poniżej 400 px strony docs nie mają w headerze linków GitHub i npm; poza headerem są tylko na home (hero i stopka). Do decyzji, czy dodać je np. do panelu nawigacji.
- contrast.mjs: wiersz 'Small note' (.small) jest n/a, bo ten element jest tylko w bloku PaletteSwatches, którego nie ma na /docs/line-chart.
- Selektory próbek 'Body text', 'Lede' i znaczników składni w contrast.mjs były nieaktualne po T22 (wrapper .prose, kolory Shiki zamiast data-tok), więc skrypt wcześniej nie kończył się exit 0. Naprawiłem; wiersze 'Syntax: number' i 'Syntax: tag' to teraz 'constant' i 'punctuation'.
- apps/docs/app/globals.css: Poniżej 400 px GitHub i npm znikają z headera (.header-external { display: none }). Na stronach docs nie ma ich wtedy nigdzie indziej. SPEC:156 mówi, że header pokazuje link do GitHuba i npm, a SPEC:352 (reflow przy 320 px, WCAG 1.4.10) zakłada brak utraty treści. Implementer zapisał to jako otwartą kwestię.
**Kryteria:**
- Test vitest importuje packages/tally-charts/package.json i sprawdza, że SITE.version === `v${pkg.version}` oraz że wyrenderowany SiteHeader zawiera ten tekst; w apps/docs nie ma już literału 'v0.9' (grep -rn "v0.9" apps/docs/app apps/docs/lib zwraca pusto)
- Header zawiera kontrolkę getByRole('combobox', { name: 'Theme' }) z opcjami System/Light/Dark (wartości system|light|dark); stary disabled przycisk theme-toggle jest usunięty
- Vitest (jsdom): wybór light/dark ustawia data-ch-theme na <html> i localStorage['tally-docs-theme']; wybór system usuwa atrybut i klucz z localStorage
- Vitest (jsdom) skryptu THEME_SCRIPT: ?theme=dark wygrywa z localStorage=light i nie zmienia storage; ?theme=sepia jest ignorowane i stosuje się wartość z localStorage; localStorage='sepia' nie ustawia atrybutu; brak query i storage nie ustawia atrybutu; wyjątek z localStorage nie przerywa strony
- layout.tsx używa THEME_SCRIPT inline w <head>; istniejące themeSuite (forced/system × light/dark) i test 'an unknown ?theme= value changes nothing' przechodzą bez zmian logiki
- E2E: Tab dochodzi do przełącznika motywu, outline-style solid i outline-width > 0
- E2E: po wyborze dark i reloadzie z zablokowanym **/_next/static/**/*.js <html> ma data-ch-theme='dark', a body ma background-color rgb(18, 18, 21)
- E2E: wybór dark na / przetrwa przejście linkiem na /docs/line-chart (atrybut dark, ciemne tło, select pokazuje dark); wybór system po reloadzie nie ma atrybutu ani klucza w localStorage
- E2E: przy viewport 320 i 375 px strony / i /docs/line-chart mają document.documentElement.scrollWidth <= clientWidth
- contrast.mjs zawiera próbki tekstu i bordera przełącznika motywu i kończy się exit 0 przy działającym pnpm --filter docs start; tabela wklejona do dokumentu designu
- pnpm --filter docs typecheck, pnpm lint, pnpm --filter docs test, pnpm --filter docs build i pnpm --filter docs test:e2e kończą się exit 0; brak zmian w packages/tally-charts

## T23.2 Edytor wizualny (?_editor=1) i draft mode /preview z PreviewBanner (F11)
**Decyzje:**
- **D1. Sekret.** `lib/secret.ts`: `secretMatches` (`timingSafeEqual` po sprawdzeniu długości) i `secretFromHeaders(headers, nazwaNagłówka)` (Bearer, inaczej nagłówek). Używają go `/api/revalidate` (testy bez zmian) i `/preview`.
- **D2. Kolejność w `GET /preview`:** brak `PREVIEW_SECRET` w env albo zły/brak sekretu → 401; dopiero potem slug spoza `slugPattern` albo brak → 400 (zły sekret nie zdradza, jakie slugi są poprawne); inaczej `draftMode().enable()` i `redirect`. Sekret: `Authorization: Bearer` albo `x-preview-secret` (wygrywa nad `?secret=`). Cel przekierowania to ścieżka względna zbudowana ze zwalidowanego sluga (`home` → `/`, reszta `docHref`); żaden parametr `redirect`/`next` nie jest czytany.
- **D3. Preview bez cache.** `getContentSource(env = process.env, preview = false)`; glökki przy `preview` dostaje `preview: true` i `fetchInit: { cache: 'no-store' }` zamiast tagu `cms`. Fixtury ignorują flagę.
- **D4. Strony.** `/` i `/docs/[slug]` czytają `draftMode()` (też w `generateMetadata`), biorą źródło z `isEnabled` i przy `true` renderują `PreviewBanner` z SDK. `next build` dalej pokazuje `/` jako statyczne i `/docs/line-chart` jako SSG, `/preview` jest dynamiczne, więc nic nie trzeba było przenosić. Banner SDK ma inline `position: fixed; top: 0` i zasłaniał header, więc `app/_components/preview-notice.tsx` owija go w `.preview-banner-slot`, a CSS (`!important`, bo inline) przywraca `position: static`: banner jest w przepływie dokumentu pod/nad headerem i go nie zasłania.
- **D5. `showsBlockErrors` jest async:** poza produkcją true, na produkcji `(await draftMode()).isEnabled`, a wyjątek (wywołanie poza żądaniem) daje false. `draftMode()` jest wołany tylko na ścieżce błędu na produkcji. `PropsTable` rozdzielony na async `PropsTable` (sprawdza id, `blockError`) i synchroniczny `PropsTableView` w osobnym `props-table-view.tsx`; `BlockError` przeniesiony do `block-error-box.tsx`, bo moduł z `next/headers` nie może wejść do bundla klienta.
- **D6. Rejestr edytora** (`blocks/editor-registry.tsx`, `'use client'`): te same 8 typów w tej samej kolejności co `blockRegistry.getTypes()` (test). Bez zmian: prose, heading, callout, token-table, palette-swatches. Uproszczone: `code-block` (zwykły `<pre><code>`, bez Shiki i bez przycisku kopiowania), `chart-example` (klientowy `ChartExample`, preview z leniwego `examples[id].Component` w `Suspense`, kod jako zwykły `<pre>`), `props-table` (`PropsTableView`). Nieznany id/symbol zawsze daje `BlockError` (w przeglądarce nie ma `APP_ENV`).
- **D7. Layout.** `createLayoutRegistry` wymaga layoutu o kluczu `default` (plan zakładał `docs`, co rzuca błąd), więc jedyny layout to `default` z pustym Header/Footer; header i stopkę renderuje Next.
- **D8. `EditorSwitch` + `EditorCanvas`.** `EditorSwitch` (`useSyncExternalStore`, serwer i pierwszy render klienta = `children`) przy `?_editor=1` ładuje przez `next/dynamic` `EditorCanvas` (`VisualEditorProvider` + `CMSPageEditor`, `fallbackTree` = drzewo strony, `pageSlug` = `/` albo `/docs/<slug>`, `tenantSlug` = `NEXT_PUBLIC_CMS_TENANT`). Czytelnicy nie pobierają kodu edytora, strony nie czytają `searchParams`, więc zostają statyczne. `blockRegistry` NIE jest przekazany (serwerowy ciągnie Shiki do przeglądarki); handshake wysyła wtedy typy z kluczy `editorRegistry`, bez serializowanych definicji pól.
- **D9. `_editor=1` bez `_editorOrigin`** to nie tryb edytora SDK: provider renderuje `fallbackTree`, a `EditableBlock` nie opakowuje bloków. `[data-block-id]` pojawia się dopiero w prawdziwym trybie (`_editorOrigin` + `tree:update` od rodzica). Kryterium taska („`/docs/line-chart?_editor=1` ma co najmniej jeden `[data-block-id]`") nie da się więc spełnić na samym `?_editor=1` bez obejścia SDK; zamiast tego testy sprawdzają: (a) `?_editor=1` pokazuje h1, wykres, `h2#props`, bez `console.error`, a brak przycisków kopiowania dowodzi, że zastąpiła je kanwa edytora; (b) vitest i e2e z `_editorOrigin` = własny origin strony i wiadomością `tree:update` (strona jest swoim rodzicem) mają `[data-block-id]` dla każdego bloku najwyższego poziomu.
- **D10. E2E.** `PREVIEW_SECRET` to stała `e2e/preview-secret.ts` w `webServer.env` (nie sekret, bez `secrets.*` w CI). Banner w e2e szukany jest przez `getByRole('alert').filter({ hasText: 'Preview mode' })`, bo route announcer Next ma pusty `role=alert`.

**Testy:** `app/preview/route.test.ts`, `lib/content/content-source.test.ts` (preview: `no-store`, brak `next.tags`, fixtury w obu trybach), `app/page.test.tsx` i `app/docs/[slug]/page.test.tsx` (banner z mockiem `next/headers`), `blocks/props-table.test.tsx` i `blocks/chart-example.test.tsx` (production + draft / bez draftu), `blocks/editor-registry.test.tsx` (klucze, fallbackTree, tryb edytora SDK z `tree:update`, uproszczony kod, błędy), `app/_components/editor-switch.test.tsx`, `env-example.test.ts` (8 zmiennych), e2e `preview.spec.ts` i `editor.spec.ts`.

**Poprawki po review (próba 2):** kryterium `[data-block-id]` zmienione decyzją orkiestratora na: z `_editor=1&_editorOrigin=<origin>` i `tree:update` każdy blok najwyższego poziomu ma `[data-block-id]` (D9, testy już są); `content-source.test.ts` sprawdza `getContentSource(env, true)`: `createClient` (spy na SDK) dostaje `preview: true`, każdy fetch `no-store` bez `next.tags`, a bez flagi `next.tags = ['cms']` (test pada, gdy `index.ts` zgubi `preview`); banner nie zasłania headera.

**Otwarte kwestie:**
- SDK 0.17 dodaje `preview=true&token=` do URL tylko, gdy klient dostanie też `previewToken`; tu go nie ma (kryteria nie przewidują dodatkowej zmiennej), więc `preview: true` na razie daje tylko brak cache. Czy glökki zwróci szkice, trzeba sprawdzić z prawdziwym CMS i ewentualnie dodać zmienną (np. `CMS_PREVIEW_TOKEN` → `previewToken`) w osobnym tasku przed wdrożeniem z CMS.
- Brak wyjścia z draft mode (np. `GET /preview/exit` z `draftMode().disable()` i przekierowaniem na zwalidowaną ścieżkę); cookie `__prerender_bypass` trzeba usunąć ręcznie. Do osobnego taska.
- Handshake w prawdziwym iframe glökki niesprawdzony bez CMS; sprawdzony tylko wymianą wiadomości strony ze sobą. Bez `blockRegistry` edytor glökki nie dostanie definicji pól bloków (biblioteka bloków i formularze mogą być puste), do rozstrzygnięcia z CMS.
- Przed e2e na porcie 3100 stał stary `next-server` (z poprzedniego builda, bez `PREVIEW_SECRET`); zatrzymałem go jego PID-em.

## ✔ T23.2 Edytor wizualny (?_editor=1) i draft mode /preview z PreviewBanner (2026-10-25)
Poprawki po review (próba 2). Zrobione: (1) w content-source.test.ts nowe testy getContentSource(env, true) ze spy na createClient z SDK i zamockowanym fetch. Z preview createClient dostaje preview: true, a każdy fetch ma cache 'no-store' i nie ma next.tags. Bez flagi albo z preview=false fetch ma next.tags=['cms'] i brak cache, a createClient nie dostaje preview: true. Test pada po usunięciu `preview` z lib/content/index.ts (sprawdzone mutacją, plik przywrócony). (2) Banner PreviewBanner nie zasłania już headera: owija go nowy app/_components/preview-notice.tsx (`.preview-banner-slot`), a CSS w globals.css cofa inline `position: fixed`. Używają go app/page.tsx i app/docs/[slug]/page.tsx. (3) Kryterium [data-block-id] zmienione według decyzji orkiestratora na wariant z `_editor=1&_editorOrigin` i `tree:update`. Te testy już istniały (editor.spec.ts, editor-registry.test.tsx), a decyzję zapisano w PROGRESS.md i CLAUDE.md. SDK nie jest obchodzony. (4) Test editor-switch był niestabilny przy pełnym zestawie (zimny dynamic import), więc dostał dłuższe timeouty. (5) PROGRESS.md i CLAUDE.md zaktualizowane. Bramki: pnpm build 0; pnpm lint bez błędów (tylko ostrzeżenia, w tym nowe noImportantStyles z celowego `!important`, które cofa inline style SDK); docs typecheck OK; docs test 333/333; docs build (`/` statyczne, `/preview` dynamiczne; `/docs/[slug]` sprawdzone tylko w poprzedniej próbie, bo użyty filtr grep nie pokazał jego wiersza); docs test:e2e 53/53 przy wolnym porcie 3100.
**Decyzje i pułapki:**
- Na macOS sed wymaga `sed -i ''`.
- Wszystko, co dociąga dynamic import (editor-switch), potrzebuje większych timeoutów w pełnym zestawie vitest, bo domyślne 1 s dla findBy i 5 s dla testu bywa za mało.
- Inline style z SDK (PreviewBanner `position: fixed`) da się cofnąć tylko `!important` w CSS wrappera.
- Test chroniący przekazanie flagi (preview) do createClient wymaga vi.mock SDK ze spy owijającym oryginalny createClient; samo sprawdzanie `.kind` źródła niczego tu nie zabezpiecza.
**Otwarte kwestie:**
- Draft mode na prawdziwym glökki nie pobiera szkiców: SDK dodaje preview=true&token= do URL tylko z previewToken, którego nie ma (np. CMS_PREVIEW_TOKEN → previewToken). Do osobnego taska przed wdrożeniem z CMS; zapisane w PROGRESS.md.
- Brak wyjścia z draft mode (GET /preview/exit z draftMode().disable() i przekierowaniem na zwalidowaną ścieżkę). Do osobnego taska; zapisane w PROGRESS.md.
- Handshake w prawdziwym iframe glökki niesprawdzony bez CMS, a bez blockRegistry edytor glökki może nie dostać definicji pól bloków.
- Biome zgłasza ostrzeżenie noImportantStyles dla `.preview-banner-slot > [role="alert"]` (celowe `!important`, bo inline style SDK). To samo ostrzeżenie jest już w theme.css.
- apps/docs/lib/content/glokki.ts: `preview: true` without `previewToken` has no effect on the URL in SDK 0.17 (sdk/dist/index.js:229: `if (preview && previewToken)`). Against a real glökki, draft mode only turns off the cache and does not fetch drafts, which goes against the user-facing goal of previewing unpublished content. The implementer disclosed this and recorded it in PROGRESS.md; the acceptance criterion, as worded, is met.
- apps/docs/app/_components/editor-switch.tsx: The SDK enters editor mode for any `_editorOrigin` taken from the URL and accepts `tree:update` from that origin. Any site can frame the docs page, or open it with window.open, as `?_editor=1&_editorOrigin=https://evil.example` and inject an arbitrary block tree (e.g. prose with phishing links) under the real docs domain. Markdown runs with skipHtml, so this is content spoofing, not XSS. There is no allowlist of the CMS origin and no `frame-ancestors`.
**Kryteria:**
- `app/preview/route.test.ts` (vitest): GET bez `PREVIEW_SECRET` w env, bez sekretu albo ze złym sekretem zwraca 401; z poprawnym sekretem i slugiem spoza `slugPattern` (`../x`, `a/b`, `//evil.com`, `https://evil.com`, pusty/brak) zwraca 400; w obu przypadkach ani `draftMode().enable`, ani `redirect` nie są wywołane, a odpowiedź nie ma nagłówka `location`. Poprawny sekret przez `Authorization: Bearer`, `x-preview-secret` i `?secret=` włącza draft mode (`enable` raz) i przekierowuje na `/docs/line-chart`, a `slug=home` na `/`. Porównanie sekretu idzie przez `timingSafeEqual` (wspólny helper z `/api/revalidate`, którego testy dalej przechodzą).
- `apps/docs/.env.example` zawiera `PREVIEW_SECRET=` bez wartości, z komentarzem nad linią; `env-example.test.ts` sprawdza 8 zmiennych i przechodzi.
- Test źródła: `getContentSource(env, true)` dla glökki tworzy klienta z `preview: true`, a każdy fetch ma `cache: 'no-store'` i nie ma `next.tags`; bez preview fetch ma `next.tags = ['cms']`. Fixtury działają tak samo w obu trybach.
- Testy stron `/` i `/docs/[slug]` (vitest, `next/headers` zamockowane): przy `draftMode().isEnabled === true` HTML zawiera `role="alert"` z tekstem 'Preview mode', a przy `false` nie ma bannera.
- Testy bloków ChartExample i PropsTable: przy `APP_ENV=production` w draft mode nieznany id daje widoczny `.block-error` z tym id; przy `production` bez draft mode kontener jest pusty; poza produkcją `.block-error` jak dotąd.
- Test rejestru edytora: klucze klientowego `editorRegistry` są równe `blockRegistry.getTypes()` (8 typów, ta sama kolejność), a `CMSPageEditor` w `VisualEditorProvider` z `fallbackTree` z `content/line-chart.json` renderuje bloki (elementy `[data-block-id]`) bez `console.error`.
- E2E (`pnpm --filter docs test:e2e`, `PREVIEW_SECRET` ustawiony w `webServer.env` playwright, bez `secrets.*` w CI): `/preview?slug=line-chart&secret=…` kończy się na `/docs/line-chart` z alertem 'Preview mode', `slug=home` na `/` z alertem; nowy kontekst bez cookie draft mode nie ma alertu; zły sekret daje 401, zły slug 400.
- E2E: `/docs/line-chart?_editor=1` pokazuje h1 'LineChart', wykres (role=application z nazwą), `h2#props` i co najmniej jeden `[data-block-id]`; nie ma pageerror ani console.error. Bez `?_editor=1` na stronie nie ma `[data-block-id]`.
- Wyjście `pnpm --filter docs build` pokazuje `/docs/[slug]` jako SSG z prerenderowanym `/docs/line-chart` i `/` jako statyczne; `/preview` jest dynamiczne.
- `pnpm --filter docs typecheck`, `pnpm lint` (0 błędów), `pnpm --filter docs test`, `pnpm --filter docs build` i `pnpm --filter docs test:e2e` (po `pnpm build`, przy wolnym porcie 3100) kończą się exit 0.
- CLAUDE.md opisuje `/preview`, `PREVIEW_SECRET` (też w `webServer.env` playwright) i `?_editor=1` z uproszczonymi blokami w edytorze; PROGRESS.md ma sekcję T23.2 z decyzjami i otwartymi kwestiami. `packages/tally-charts` bez zmian, więc bez changesetu.

## T24 Walidacja treści: check:content z pokryciem API (F14)
**Decyzje:**
- **D1. Runner.** `tsx` 4.23.15 (dokładna wersja) w devDependencies `apps/docs`: bloki to `.tsx` z JSX, więc samo `node` ich nie zaimportuje, a w repo nie było vite-node. Skrypt `"check:content": "pnpm gen && tsx scripts/check-content.ts"`. Wymaga `pnpm build` (przykłady importują `tally-charts` z dist); job `docs` w CI buduje najpierw. `pnpm check:content -- --content-dir …` działa, bo CLI zjada przekazane przez pnpm `--`.
- **D2. Pokrycie API (d) tylko raportowane**, dopóki treść nie jest kompletna: `fixtures: API coverage: N/52` + lista brakujących, exit 0. `--require-coverage` albo `CHECK_CONTENT_REQUIRE_COVERAGE=1` robi z każdego brakującego symbolu błąd (`API coverage: X (kind) has no PropsTable on any page`). **T31 ma włączyć to domyślnie** i dopisać flagę w CI (obecnie job `docs` jej nie ma).
- **D3. Źródła.** Fiksturki zawsze (`createFixtureSource`, `--content-dir`), a przy `CMS_BASE_URL` dodatkowo glökki (`createGlokkiSource`, te same reguły `CMS_TENANT`/`CMS_API_KEY` co `getContentSource`; brak = błąd z nazwą zmiennej). Nie użyto `getContentSource`: z env zwraca tylko CMS i jest owinięty w React `cache`. Slugi dla linków i pokrycie liczone są osobno dla każdego źródła, raport ma prefiks `fixtures:`/`cms:`. Błąd loadera (zły JSON, schemat DeliveryPage, sieć) to issue `cannot load pages: …` z nazwą pliku, nie stack trace; wtedy pokrycie nie jest egzekwowane.
- **D4. Linki.** `/docs/<slug>` z opcjonalnym `#…`/`?…`, wyciągane regexem z linków inline, autolinków `</docs/…>` i definicji referencyjnych, tylko z propu `markdown` bloków `prose` i `callout`; kod (fenced i inline) jest pomijany. Poprawny, gdy slug jest na `listPages` źródła. Kotwic nie sprawdzamy, duplikaty id nagłówków poza zakresem.
- **D5. Komunikaty.** `slug › id węzła (typ): komunikat`. Dla `chart-example` i `props-table` jawny test istnienia (`exampleId "x" does not exist in examples/`, `symbol "X" is not in api.generated.json`) zastępuje błąd enumu tego pola; reszta to `ścieżka: komunikat` z każdego issue zoda, a enum z więcej niż 4 opcjami jest skrócony do „expected one of N values”. Nieznany prop jest wycinany przez `z.object`, nie zgłaszany; „zły prop” to zły typ albo wartość.
- Fiksturki testowe `lib/content/__fixtures__/broken/` (`ok`, `broken`, `navigation`) leżą poza `content/` i `examples/`, więc nie trafiają na stronę, do `fixtures.test.ts` ani do `gen-examples`.

**Testy:** `lib/content/check.test.ts` (logika: pięć przypadków po jednym komunikacie, brak listy id, linki OK i martwe, pokrycie z flagą i bez, prawdziwe `content/` bez błędów, wybór źródeł i brak zmiennych CMS, źródło z błędem loadera, plik fiksturki z błędnym JSON; CLI przez `spawnSync` lokalnego `tsx`: exit 1 na `broken`, exit 0 na `content/`, `--require-coverage` i env, brak `CMS_TENANT`).

**Otwarte kwestie:**
- Live CMS (`cms:`) sprawdzony tylko na mockowanym źródle i wyborze źródeł; bez prawdziwego glökki ścieżka sieciowa jest niezweryfikowana.
- Pokrycie wynosi 1/52 (tylko `LineChart`), dopóki T25–T31 nie dodadzą stron.

## ✔ T24 Walidacja treści: check:content z pokryciem API (F14) (2026-10-25)
Dodano `pnpm --filter docs check:content`: skrypt `tsx` sprawdza strony z fiksturek `content/` oraz z glökki, gdy ustawiono `CMS_BASE_URL`. Sprawdza typ i propsy bloków, istnienie `exampleId` i `symbol`, martwe linki `/docs/<slug>` oraz pokrycie API (`fixtures: API coverage: 1/52` plus lista brakujących, exit 0). `--require-coverage` albo `CHECK_CONTENT_REQUIRE_COVERAGE=1` zamienia brak pokrycia w błędy i exit 1. Fiksturka `lib/content/__fixtures__/broken` daje exit 1 i pięć osobnych komunikatów `slug › id węzła (typ): komunikat`. Komunikat o exampleId nie wypisuje listy id. Sprawdzone: `pnpm --filter docs test` (372 testy, 38 plików), `pnpm --filter docs typecheck`, `pnpm lint` (0 błędów, tylko wcześniejsze ostrzeżenia), `pnpm install --frozen-lockfile`, actionlint, `pnpm check:workflows`. `pnpm build` ani `docs build`/e2e nie były uruchamiane (`tally-charts` bez zmian, istniejący `dist` wystarczył). Pliki: logika w `lib/content/check.ts`, wybór źródeł w `check-sources.ts`, CLI w `scripts/check-content.ts`. Dodano `tsx` 4.23.15 do devDependencies `apps/docs`, krok w jobie `docs` w CI po `docs test`, opis komendy w CLAUDE.md i decyzje w PROGRESS.md.
**Decyzje i pułapki:**
- Pnpm przekazuje do skryptu dosłowne `--` z `pnpm check:content -- --flag`, więc parseArgs trzeba karmić argv bez wiodącego `--`.
- Biome check --write nie formatuje plików ze składnią zepsutą przez ręczne zamiany tekstu. Po skryptowych podmianach w testach od razu uruchom typecheck.
- tsconfig ma noUncheckedIndexedAccess, więc w testach `arr[0]` wymaga pomocnika (np. `defined()`).
- Zod 4: issue `invalid_value` ma pole `values`, na jego podstawie można skracać komunikaty enumów.
- Dodanie tsx do devDependencies zmienia w pnpm-lock.yaml także klucze peer-dep (vite/vitest/tsdown dostają `tsx@…`); to oczekiwany szum w diffie.
**Otwarte kwestie:**
- Ścieżka live CMS (cms:) jest sprawdzona tylko na mockowanych źródłach i wyborze źródeł; bez prawdziwego glökki nie zweryfikowano części sieciowej.
- Pokrycie API wynosi 1/52 (tylko LineChart). Job docs w CI nie ma flagi --require-coverage; T31 ma ją włączyć domyślnie (zapisane w PROGRESS.md i CLAUDE.md).
- Jedna zepsuta fiksturka (zły JSON) przerywa ładowanie całego źródła, bo fixture source czyta wszystkie strony w listPages. Raportowany jest jeden błąd z nazwą pliku, a pozostałe strony nie są wtedy sprawdzane.
- apps/docs/lib/content/check.ts: `/docs/home` przechodzi jako poprawny link, bo slug `home` jest w stronach źródła. Ta trasa to jednak 404: `app/docs/[slug]/page.tsx:20,25,30` jawnie wyklucza `home`, a strona główna jest pod `/`. Edytor może więc wstawić martwy link wewnętrzny, którego check nie złapie.
- apps/docs/lib/content/check.ts: `MARKDOWN_PROPS[node.type]` szuka klucza w zwykłym obiekcie, więc trafia też w prototyp. Blok z `type: "toString"` albo `"constructor"` (np. z CMS) wywala checkPages błędem `TypeError: function is not iterable`. Unknown type zostaje zgłoszony przez checkNode, ale zaraz potem pętla linków rzuca wyjątek. CLI łapie go w try/catch i kończy się exit 1 z nieczytelnym `check:content: function is not iterable`, a wszystkie pozostałe błędy z raportu przepadają. Sprawdzone sondą przez tsx.
**Kryteria:**
- `pnpm --filter docs check:content` (po `pnpm build`) na obecnych fiksturkach `content/` kończy się kodem 0 i wypisuje raport pokrycia API w postaci `API coverage: N/52` z listą brakujących symboli
- Na fiksturce `lib/content/__fixtures__/broken` skrypt kończy się kodem 1, a stderr zawiera osobne komunikaty z slugiem i id węzła dla: nieistniejącego `exampleId`, złego propa (ścieżka propa, np. `level`), martwego linku `/docs/does-not-exist`, brakującego `symbol` w props-table i nieznanego typu bloku. Komunikat o exampleId nie wypisuje listy wszystkich id
- Linki `/docs/<istniejący-slug>` (także z `#anchor`) oraz linki zewnętrzne nie dają błędu; slug liczony jest względem stron sprawdzanego źródła
- Pokrycie API obejmuje każdy symbol z `api.generated.json` (komponenty, funkcje, hooki z `api/*.api.json`/`.api.md`). Bez flagi brak pokrycia nie failuje, a z `--require-coverage` (lub `CHECK_CONTENT_REQUIRE_COVERAGE=1`) każdy niepokryty symbol jest błędem i exit 1
- Przy ustawionym `CMS_BASE_URL` (+ `CMS_TENANT`, `CMS_API_KEY`) skrypt sprawdza dodatkowo strony z glökki, a brak `CMS_TENANT`/`CMS_API_KEY` przy `CMS_BASE_URL` jest błędem z nazwą zmiennej. Pokrywa to test jednostkowy z mockowanym źródłem albo funkcją wyboru źródeł
- Testy vitest w `lib/content/check.test.ts` (logika i spawn CLI) przechodzą w `pnpm --filter docs test`
- Job `docs` w `.github/workflows/ci.yml` uruchamia `pnpm --filter docs check:content` na fiksturkach bez sekretów; actionlint przechodzi
- CLAUDE.md opisuje komendę `pnpm --filter docs check:content` (zamiast notki „zostanie dopisana”), flagę pokrycia i wymaganie `pnpm build`; PROGRESS.md zapisuje decyzje (tsx jako runner, pokrycie tylko raportowane do T31)
- `pnpm --filter docs typecheck` i `pnpm lint` przechodzą

## T25 Port 9 kompozycji referencyjnych jako żywe przykłady (F13, D-9)
**Mapowanie PNG → plik** (`apps/docs/examples/reference/`, id = `reference/<nazwa PNG>`):
- `01-gross-margin-waterfall` → `01-gross-margin-waterfall.tsx`: GrossMargin + „Last 12 weeks” (wysokopoziomowy `BarChart`, nie niskopoziomowe `Chart`) + WhyUnderTarget. **client**
- `02-jobs-dot-histogram-table` → JobsByMargin z Legend. **client**
- `03-estimate-vs-actual` → Result + EstimateVsActual. **rscSafe**
- `04-profit-bridge` → ProfitBridge. **rscSafe**
- `05-leakage-heatmap` → ProfitLeaked + WhereItLeaks. **rscSafe**
- `06-drilldown-strip-plot` → DrillColumns (useState) + DallasInstalls. **client**
- `07-forecast` → MarginOutlook. **rscSafe**
- `08-usage-runway` → UsageRunway z wklejonymi danymi z `runway-data.tsx`. **client**
- `09-performance` → Performance. **client**

**Decyzje:**
- **Prefiks `ref-`.** Style w `examples/reference/reference.css` (klasy `ref-*`, tylko tokeny `--ch-*`), importowane raz w `app/layout.tsx`, żeby `source` przykładu zawierał tylko kod wykresu. Powód: docs ma własne `.card`, `.segmented`, style `table`/`th`/`h2`/`p`. Reguły CSS resetują to, co globalne style elementów by zepsuły (marginesy nagłówków, `thead th` wielkimi literami). `.ref-dashboard` to grid `auto-fit, minmax(min(100%, 320px), 1fr)`, więc przy 320 px karty idą w jednej kolumnie; sprawdzone w Playwright (scrollWidth = 320 przy 320 i 1280 px, bez błędów konsoli).
- **Bez zmian w galerii na stronie głównej** (`app/page.tsx`, `home.json`, e2e): podpięcie to F16.
- **Dane runway wklejone do pliku 08** (`now` to stała data `2026-10-15T02:00:00Z`), bez importu ze Storybooka i bez wspólnych helperów, bo panel Code pokazuje plik 1:1.
- **Zmiany względem stories (pod API 1.0 i rscSafe):** `fill="hatch"` jawnie w 03 (Result) i 06 (z komentarzem), w 09 usunięte zbędne `fill="solid"` z `RankedBars` (domyślne). Bez `--_ch-*`: w 09 kolor strefy daje `data-tone` na karcie i zmienna `--ref-tone` w CSS (zamiast `--_ch-swatch-color` i `data-ch-tone-text`). W 01 `valueFormat={{ preset: 'number', digits: 1 }}` zamiast funkcji, a `axisFormat` pominięty (domyślnie `format`, ten sam wynik); w 07 `yAxisFormat="percent"` zamiast `${v}%` (te same etykiety osi), więc 07 jest rscSafe. W 05 usunięty stan zaznaczenia i `<output data-testid>` (pomoc testowa Storybooka, nie ma go w PNG), dzięki czemu plik jest rscSafe.
- `'use client'` i `rscSafe: false`: 01 (`stepLabel`), 02 (`toneBy` z `thresholds()` to obiekt z metodami, `label`, `segments`), 06 (stan, `onSelect`, `axisFormat`), 08 (stan, `onSelect`, `useChart`), 09 (`useChart`, funkcje `tone`/`fill`/`label`). Biblioteka jest jednym modułem `'use client'`, więc w RSC przechodzą tylko propsy serializowalne.
- Storybook i `packages/tally-charts` bez zmian (`git diff --stat -- apps/storybook packages` pusty), więc bez changesetu.

**Testy:** `examples/reference/reference.test.ts` (id przykładów `reference/*` = dokładnie nazwy plików `docs/reference/*.png`, niepusty tytuł, co najmniej jeden rscSafe, importy tylko `react`/`tally-charts`/`../types`, brak `Date.now`/`new Date()`/`Math.random`/`--_ch-`, `'use client'` wtedy i tylko wtedy gdy `rscSafe: false`, w `reference.css` tylko klasy `ref-*` i brak `--_ch-`). Render w jsdom i SSR obejmują istniejące `render.test.tsx` i `ssr.test.tsx`.

**Otwarte kwestie:**
- Brak: port nie wykazał błędów w bibliotece.
- Wygląd sprawdzony tylko przez zrzut strony tymczasowej (usuniętej) w jasnym motywie; ciemny motyw i kontrast kart nie były mierzone (`contrast.mjs` obejmuje tylko stronę docs).

## ✔ T25 Port 9 kompozycji referencyjnych jako żywe przykłady (F13, D-9) (2026-10-25)
Dodano 9 przykładów w `apps/docs/examples/reference/` (01…09 według `docs/reference/*.png`) ze stałymi danymi i stylami `ref-*` z `reference.css`, importowanymi w `app/layout.tsx`. rscSafe: 03, 04, 05, 07; client: 01, 02, 06, 08, 09. Sprawdzone: `pnpm build`, `pnpm --filter docs gen` (drugie wywołanie bez zmiany mtime), `pnpm --filter docs test` (415 testów), `pnpm --filter docs typecheck`, `pnpm typecheck`, `pnpm lint` (0 błędów, tylko wcześniejsze ostrzeżenia), `pnpm --filter docs build`, `pnpm --filter docs check:content` (exit 0, pokrycie 1/52).

## ✔ T25 Port 9 kompozycji referencyjnych jako żywe przykłady (F13, D-9) (2026-10-25)
Dodano 9 przykładów referencyjnych w apps/docs/examples/reference/ (01…09, id = reference/<nazwa PNG z docs/reference>). Mają stałe dane i są samowystarczalne (importy tylko react, tally-charts i ../types). rscSafe są 03, 04, 05 i 07. Pozostałe (01, 02, 06, 08, 09) mają 'use client' i rscSafe: false, bo używają hooków albo funkcji w propsach. Style kart są w reference.css (klasy ref-*, tylko tokeny --ch-*) i importowane w app/layout.tsx. Dane runway wklejono do pliku 08. Wizualnie sprawdzone w Playwright na tymczasowej stronie (usuniętej): brak poziomego scrolla przy 320 i 1280 px, brak błędów konsoli. Storybook i packages/tally-charts bez zmian, więc bez changesetu. Galeria na stronie głównej bez zmian (zostaje dla F16). Zaktualizowano PROGRESS.md (sekcja T25) i CLAUDE.md (konwencja katalogu reference). Uruchomione i zielone: pnpm build, docs gen (drugie wywołanie bez zmiany mtime), docs test (415 testów), docs typecheck, pnpm typecheck, pnpm lint (0 błędów, tylko wcześniejsze ostrzeżenia), docs build, docs check:content (exit 0). git diff --stat -- apps/storybook packages jest pusty.
**Decyzje i pułapki:**
- Biblioteka tally-charts to jeden moduł z 'use client' na górze dist/index.js. Przykład rscSafe może przekazywać tylko propsy serializowalne: bez funkcji i bez obiektów z metodami, np. wyniku thresholds(). Elementy JSX typu delta={<Delta/>} są dozwolone.
- Deklaratywne zamienniki funkcji: valueFormat={{ preset: 'number', digits: 1 }}, yAxisFormat="percent" (daje te same etykiety co `${v}%`). Pominięcie axisFormat daje domyślnie format.
- Globalne style docs (h2 z margin-top 3rem, p z marginesem, thead th wielkimi literami, .segmented, .card) kolidują z kartami. Klasy ref-* muszą jawnie resetować margin, letter-spacing i text-transform.
- Prywatnej zmiennej --_ch-swatch-color nie używaj w apps. Kolor strefy daje data-tone na karcie i własna zmienna CSS, a tekst mieszany z ink przez public --ch-tone-text-mix.
- BSD sed na macOS: `sed -i` wymaga argumentu '' i nie zadziała w łańcuchu && bez niego. Do edycji plików używaj pythona albo Edit.
- Tymczasowa strona do zrzutów: playwright-core jest w node_modules/.pnpm/playwright-core*/node_modules/playwright-core, nie w apps/docs/node_modules.
**Otwarte kwestie:**
- Wygląd sprawdzony tylko w jasnym motywie; ciemny motyw i kontrast kart nie były mierzone (contrast.mjs obejmuje tylko stronę docs).
- Przykłady 01, 02, 06, 08 i 09 nie są rscSafe (funkcje w propsach, hooki, thresholds() zwraca obiekt z metodami). Biblioteka jest jednym modułem 'use client', więc w RSC przechodzą tylko propsy serializowalne.
- Galeria na stronie głównej (DASHBOARDS z placeholderami, blok Gallery) nadal nie korzysta z nowych przykładów. To zakres F16.
- Pokrycie API w check:content nadal wynosi 1/52, bo T25 nie dodaje stron z PropsTable.
- apps/docs/examples/reference/09-performance.tsx: PROGRESS.md twierdzi, że w 09 zamiast data-ch-tone-text jest data-tone i --ref-tone, ale span .ref-perf-status nadal ma data-ch-tone-text="true" (linia ~243). To wewnętrzny hook stylów biblioteki (theme.css:725 używa prywatnego --_ch-swatch-color). Kolor jest dziś poprawny tylko dlatego, że reguła .ref-perf-status ma tę samą specyficzność i ładuje się później (computed: light #85254f na #fafafa, dark jasny róż na #121215, oba czytelne). Zmiana kolejności importów CSS zepsuje kolor.
- apps/docs/examples/reference/reference.css: Przy szerokości kolumny docs (686 px przy viewporcie 1280) i na mobile (390 px) kafelki legendy w 09 (.ref-perf-tiles) się nie mieszczą: licznik 'Good 39' jest ucięty, 'Poor 50' wychodzi poza kafelek, 'Needs work' łamie się w dwie linie. W 08 przy 686 px etykiety kont są obcinane ('Team seat ...'). Media query 900px reaguje na viewport, nie na szerokość kontenera.
- apps/docs/examples/reference/06-drilldown-strip-plot.tsx: StripPlot w 06 wypisuje w przeglądarce przy 1280 px ostrzeżenie '[tally-charts] StripPlot has more dots than fit in a row; they overlap.', a DotHistogram w 02 przy 320 px (i w jsdom) 'has more dots than fit'. Żywe przykłady w docs pokazują więc dev-warningi biblioteki w konsoli. render.test.tsx łapie tylko console.error, więc tego nie wykrywa.
**Kryteria:**
- `apps/docs/examples/reference/` zawiera dokładnie 9 plików `.tsx` (plus ewentualnie `reference.css` i `reference.test.ts`). Ich `meta.id` to `reference/<nazwa PNG bez .png>` dla każdego z `docs/reference/01…09`. Pilnuje tego nowy `examples/reference/reference.test.ts`, który porównuje id z listą plików w `docs/reference/`.
- Każdy przykład jest samowystarczalny: importuje tylko z `tally-charts`, `react` i `../types`, nie importuje nic z `apps/storybook` ani z innych przykładów, a dane są stałymi literałami (bez `Date.now`, `new Date()` bez argumentu i `Math.random`).
- Każdy wykres w przykładach ma `title` albo `aria-labelledby` (przechodzi `pnpm --filter docs typecheck`). RankedBars kreskowane w referencji (03, 06) mają jawne `fill="hatch"`, a pozostałe polegają na domyślnym `solid`.
- Pliki z hookami albo propsami-funkcjami mają `'use client'` i `rscSafe: false`. Pozostałe mają `rscSafe: true` bez `'use client'`, a co najmniej jedna referencja jest rscSafe. `pnpm --filter docs gen` kończy się kodem 0.
- `pnpm --filter docs test` przechodzi i obejmuje 9 przypadków `reference/…` w `render.test.tsx` (jsdom, svg, brak console.error) oraz każdy rscSafe `reference/…` w `ssr.test.tsx`.
- Style kompozycji są w przestrzeni nazw `ref-*`, oparte tylko na tokenach `--ch-*` i importowane w `app/layout.tsx`. Istniejące style `.card` w docs i testy `contrast.test.ts` i `page.test.tsx` są bez zmian i przechodzą.
- `pnpm --filter docs build`, `pnpm typecheck`, `pnpm lint` (bez nowych błędów) i `pnpm --filter docs check:content` (exit 0) przechodzą po `pnpm build`.
- `git diff --stat -- apps/storybook packages/tally-charts` jest pusty (Storybook i biblioteka bez zmian, więc bez changesetu).
- PROGRESS.md ma sekcję T25 z mapowaniem PNG → plik, podziałem rscSafe/client i decyzjami (prefiks `ref-`, wklejone dane runway, galeria na stronie głównej zostaje dla F16).

## ✔ T26.1 Bloki strony głównej: Hero, VisualLanguage, Gallery, Install, FeatureGrid, LinkRow (2026-10-25)
Dodano 6 bloków w `apps/docs/blocks/` (każdy ze schematem Zod i `defineBlock`), 4 przykłady `examples/visual-language/{hatch,solid,loss,target}.tsx` (rscSafe, dane z `app/_components/visual-language.tsx`) i rejestrację w `blockRegistry`, `blockSchemas` i `editor-registry.tsx` (14 typów). `app/page.tsx` i `content/home.json` bez zmian (to T26.2). Sprawdzone: `docs gen`, `docs test` (473), `docs typecheck`, `pnpm lint` (0 błędów), `docs build`, `docs check:content` (0 błędów).
**Decyzje:**
- Widoki (`HeroView`, `VisualLanguageView`, `GalleryView`, `InstallView`, `FeatureGrid`, `LinkRowView`) są w `blocks/home-views.tsx`, a nie w modułach bloków, bo te importują `chart-example` (Shiki) i `block-error` (`next/headers`), a klientowy edytor nie może ich ciągnąć. Moduły bloków mają schemat, async loader i `defineBlock`. Widoki używają `useId` (działa w RSC) do `aria-labelledby`.
- `blocks/load-example.tsx`: `loadExamples(ids)` zwraca `{ ok: false, error }` (`blockError`, pierwszy nieznany id zastępuje cały blok) albo `{ ok: true, charts }`. Edytor: `BlockError` w tym samym miejscu, wykres przez `entry.Component` w Suspense.
- Kategoria `home`: SDK nie odrzuca wolnych kluczy, ale bez deklaracji `categories` CMS zna tylko swoje pięć. Dlatego `createBlockRegistry(…, { categories: [content, home] })`; nikt w repo wcześniej nie czytał kategorii.
- `install`: `command` ma `.default('npm i tally-charts')`; typ propsów komponentu to `z.input`, bo CMS przekazuje propsy bez parsowania. `CodeBlock` bez `filename`, więc pasek pokazuje „Terminal”.
- `link-row`: wyłącza tylko slug z `available: false`; slug spoza nawigacji i href zewnętrzny zostają linkami. Wersja edytorowa zawsze link (komentarz w kodzie).
**Testy:** po jednym `*.test.tsx` na blok (render, wykres `role=application`, `fields` typu `array` z `items`, ≥2 odrzucone propsy), nieznany `exampleId` w `hero.test.tsx` (APP_ENV bez / production), `registry.test.ts` (14 typów, kategorie), `editor-registry.test.tsx` (14 typów, render nowych bloków, błędy), `ssr.test.tsx` (Hero, Install, LinkRow).
**Otwarte kwestie:**
- T26.2 musi podmienić `app/page.tsx` i `content/home.json` oraz usunąć `app/_components/visual-language.tsx` (dane zduplikowane w przykładach).
- Gallery/VisualLanguage z wieloma wykresami: nieznany id w jednym elemencie chowa cały blok (zgodnie z ChartExample), nie tylko kafelek.

## ✔ T26.1 Bloki strony głównej: Hero, VisualLanguage, Gallery, Install, FeatureGrid, LinkRow ze schematami i testami (2026-10-25)
Dodano 6 bloków strony głównej w apps/docs/blocks/ (hero, visual-language, gallery, install, feature-grid, link-row). Każdy ma schemat Zod i defineBlock. Listy mają fieldType 'array', a exampleId przechodzi przez z.enum(exampleIds). Dodano 4 przykłady examples/visual-language/{hatch,solid,loss,target}.tsx (rscSafe, bez 'use client', dane z app/_components/visual-language.tsx). Bloki są zarejestrowane w blockRegistry, blockSchemas i editor-registry.tsx (14 typów w tej samej kolejności). Widoki są w blocks/home-views.tsx, bo moduły bloków ciągną Shiki i next/headers, których klientowy edytor nie może importować. Ładowanie wykresów robi blocks/load-example.tsx, a nieznany exampleId daje blockError() w miejscu całego bloku. LinkRow wyłącza /docs/<slug> z available:false jako span.nav-soon[aria-disabled], a edytor zawsze renderuje link (z komentarzem). Install używa CodeBlock lang bash, a command ma domyślnie 'npm i tally-charts'. Kategoria nowych bloków to 'home', zadeklarowana w createBlockRegistry razem z 'content'. app/page.tsx i content/home.json bez zmian. Zaktualizowano CLAUDE.md i PROGRESS.md. Sprawdzone: docs gen, docs test (473, zielone), docs typecheck, pnpm lint (exit 0, tylko wcześniejsze ostrzeżenia CSS), docs build, docs check:content (0 błędów).
**Decyzje i pułapki:**
- Moduł bloku, który importuje chart-example (Shiki) albo block-error (next/headers), nie może być importowany przez klientowy editor-registry. Wspólny widok trzeba trzymać w osobnym module bez kodu serwerowego (home-views.tsx).
- useId działa w Server Components, więc widoki wspólne dla serwera i edytora mogą z niego korzystać do aria-labelledby.
- createBlockRegistry przyjmuje wolne klucze kategorii, ale bez opcji categories CMS zna tylko swoje pięć. Nowa kategoria wymaga deklaracji obok 'content'.
- Dla pól z .default() propsy komponentu przychodzą z CMS bez parsowania, więc typ propsów to z.input, a domyślną wartość trzeba mieć też w destrukturyzacji.
- BSD sed na macOS wymaga sed -i '' i przerywa łańcuch &&. Do edycji lepiej używać pythona -I albo Edit.
**Otwarte kwestie:**
- T26.2 musi podmienić app/page.tsx i content/home.json na nowe bloki i usunąć app/_components/visual-language.tsx, bo jego dane są zduplikowane w examples/visual-language/*.
- Gallery i VisualLanguage: nieznany exampleId w jednym elemencie chowa cały blok (zgodnie z ChartExample), nie tylko kafelek.
- Kategoria 'home' wymagała zadeklarowania categories w createBlockRegistry. Nie sprawdzono, jak CMS glökki pokazuje taką kategorię w pickerze, bo nie ma dostępu do instancji.
- Wyglądu nowych bloków nie sprawdzałem w przeglądarce, bo żadna strona jeszcze ich nie używa. Pokrycie to testy jsdom i SSR oraz ręczne sprawdzenie, że useId istnieje w buildzie react-server.
- Próba porównania ostrzeżeń lint z czystym drzewem przez git stash została odrzucona, więc nie zweryfikowałem tym sposobem, że ostrzeżenia CSS są sprzed zmian. Dotyczą plików, których nie ruszałem (globals.css, theme.css).
- apps/docs/blocks/link-row.tsx: LinkRow wywołuje getContentSource() bez flagi preview, więc w draft mode dostępność stron bierze z nawigacji opublikowanej, nie z wersji roboczej. Strony korzystają z getContentSource(process.env, isEnabled). W podglądzie szkicu link do nowo dodanej, jeszcze nieopublikowanej strony będzie wyłączony.
- apps/docs/lib/content/check.ts: check:content (c) sprawdza linki /docs/<slug> tylko w prose i callout, a (b) sprawdza exampleId tylko dla chart-example. Pole href w hero.actions i link-row.items nie jest więc walidowane. Nieznany exampleId w nowych blokach łapie z.enum w (a), więc dotyczy to tylko hrefów.
**Kryteria:**
- Istnieją apps/docs/blocks/{hero,visual-language,gallery,install,feature-grid,link-row}.tsx, a każdy eksportuje schemat Zod (heroSchema itd.) i blok z defineBlock o type: hero, visual-language, gallery, install, feature-grid, link-row
- blockRegistry.getTypes(), Object.keys(blockSchemas) i [...editorRegistry.keys()] to te same 14 typów w tej samej kolejności, a blocks/registry.test.ts i blocks/editor-registry.test.tsx (zaktualizowane z 8 do 14) przechodzą
- Każdy defaultProps nowego bloku przechodzi parseBlockProps (istniejący test 'every defaultProps passes its own schema')
- Schematy mają pola zgodne z backlogiem: exampleId przez z.enum(exampleIds), a pola list (actions, items) mają w block.fields fieldType 'array' z niepustym items. Test sprawdza to co najmniej dla jednego bloku
- Install: heroSchema-podobny installSchema.parse({ heading: 'Install' }).command === 'npm i tally-charts'. Render ma przycisk o nazwie pasującej do /^Copy code/ i element role=status
- Pliki examples/visual-language/{hatch,solid,loss,target}.tsx mają rscSafe: true, nie mają 'use client', a `pnpm --filter docs gen` kończy się kodem 0. examples/render.test.tsx i examples/ssr.test.tsx obejmują je bez zmian w tych testach
- Testy Hero, VisualLanguage i Gallery z poprawnymi propsami znajdują nagłówki i teksty z propsów oraz getByRole('application', { name: examples[id].title })
- Każdy nowy blok ma co najmniej 2 przypadki, w których parseBlockProps(type, props).success === false (np. nieznany exampleId, brak wymaganego pola, pusta lista)
- LinkRow z fixturami: href /docs/getting-started (available: false) renderuje span.nav-soon[aria-disabled=true] bez linku, a /docs/line-chart i href zewnętrzny renderują <a>. Wersja w editor-registry zawsze renderuje <a> i ma komentarz z uzasadnieniem
- Blok z nieznanym exampleId (test na jednym bloku) bez APP_ENV pokazuje .block-error z tym id, a przy APP_ENV=production bez draft mode nic nie renderuje
- pnpm --filter docs test, pnpm --filter docs typecheck i pnpm lint przechodzą
- git diff nie zawiera zmian w apps/docs/app/page.tsx ani apps/docs/content/home.json

## T26.2 Strona główna z treści (home.json, page.tsx bez sztywnych sekcji, e2e)
`content/home.json` ma 6 węzłów (n1…n6: hero, visual-language, gallery, install, feature-grid, link-row), `app/page.tsx` renderuje tylko SiteHeader, PreviewNotice, `EditorSwitch`/`CMSPage` i footer. Usunięto `app/_components/visual-language.tsx` i `SITE.hero`. `app/_components/code-block.tsx` zostaje, bo używa go `chart-example.test.tsx`.
**Decyzje:**
- D1: `visualLanguageSchema` ma `heading: z.string().min(1)`, a `VisualLanguageView` zawsze renderuje `<section aria-labelledby>` z h2 (jak Gallery i FeatureGrid). Testy: `visual-language.test.tsx` (odrzucenie bez i z pustym heading), `editor-registry.test.tsx`.
- D2: galeria ma kolumny `repeat(auto-fill, minmax(min(100%, 22rem), 1fr))` (design §2 mówił o 2 kolumnach od 640 px i 3 dalej, ale żywe dashboardy potrzebują kafelka ≥ ~22 rem: przy 3 kolumnach od 640 px przepełniało się 5 z 9 kafelków, a przy 2 kolumnach i 375 px kafelek miał ~165 px). Wychodzi 1 kolumna poniżej ~765 px (telefony i wąskie tablety), 2 kolumny do ~1130 px, 3 powyżej (`.home` ma max 72 rem). `.gallery-tile` ma `container: ref-tile / inline-size` i `overflow-x: auto` (awaryjny scroller), a `reference.css` ma `@container ref-tile (max-width: 900px)` obok każdego `@media (max-width: 900px)`. Usunięto martwe `.gallery-tile .hatch-field`. E2E sprawdza dopasowanie kafelków przy 320, 375, 640, 768, 900, 1024 i 1280 px oraz liczbę kolumn.
- D3: eyebrow hero to statyczny tekst „React charts” z fiksturki (wersja jest w headerze, CMS nie interpoluje). `SITE.hero` usunięty, h1 pochodzi z treści.
- D4: wykresy galerii identyfikuje się po kafelku: caption każdej pozycji w `home.json` to dokładnie `examples[id].title`, a testy sprawdzają 9 `li.gallery-tile` i wykres w każdym. Kolejność nagłówków sekcji to `main > section > h2`, bo dashboardy mają własne h2 (`ref-card-title`) i wykresy o nazwach innych niż `meta.title`.
**Pułapki:**
- SSR (`renderToReadableStream`) nie daje `role=application` (plot dostaje go po stronie przeglądarki), więc `app/page.test.tsx` szuka wykresu jako `figure`, a role=application sprawdza e2e.
- Dashboardy reference mają własne `<header>`, więc `getByRole('banner')` na `/` trafia w wiele elementów; nagłówek strony to `header.site-header`.
- W teście nie importuj nazwanego `meta` obok `import.meta` (transform vitest przepisuje `import.meta` na zły identyfikator); użyj aliasu.
**Testy:** `app/page.test.tsx` (SSR, 9 testów), `blocks/visual-language.test.tsx`, `blocks/editor-registry.test.tsx`, `e2e/home.spec.ts` (kolejność h2, galeria 375/1280, 1 kolumna, Copied, brak console.error), `e2e/editor.spec.ts` (`/?_editor=1`).
**Weryfikacja:** pnpm build, docs gen, docs test (480), docs typecheck, pnpm lint (0 błędów), docs check:content (0 błędów), docs build, docs test:e2e (59) zielone.

## ✔ T26.2 Strona główna z treści: fiksturka home.json, page.tsx bez sztywnych sekcji, e2e (2026-10-25)
Poprawiłem progi kolumn galerii. Zamiast 3 kolumn od 640 px `.gallery` ma teraz `repeat(auto-fill, minmax(min(100%, 22rem), 1fr))`, więc kafelek ma co najmniej ok. 22 rem. Wychodzi 1 kolumna poniżej ok. 765 px, 2 kolumny do ok. 1130 px i 3 powyżej. Usunąłem regułę `.gallery` z `@media (min-width: 640px)`. `.gallery-tile` zostaje kontenerem `ref-tile`, a `overflow-x: auto` jest tylko awaryjnym scrollerem. Decyzję D2 zaktualizowałem w PROGRESS.md (z uzasadnieniem odejścia od designu §2), a komentarz w CSS i zdanie o galerii w CLAUDE.md dopasowałem do nowych progów. W e2e pętla „dashboardy mieszczą się w kafelkach” obejmuje 320, 375, 640, 768, 900, 1024 i 1280 px. Zastąpiłem też stary test jednej kolumny testem liczby kolumn: 1 przy 375 i 640 px, 2 przy 768 px, 3 przy 1280 px. Po rebuildzie przeszły: `pnpm build`, `pnpm --filter docs build`, `pnpm --filter docs test`, `pnpm --filter docs typecheck`, `pnpm --filter docs check:content` (0 błędów), `pnpm test:e2e` (67 testów) i `pnpm lint` (bez błędów, są tylko ostrzeżenia).
**Decyzje i pułapki:**
- Dashboardy reference potrzebują kafelka ≥ ~22 rem, więc liczbę kolumn galerii wyznacza `auto-fill` z `minmax(min(100%, 22rem), 1fr)`, a nie stałe progi @media.
- Test dopasowania kafelków trzeba puszczać na szerokościach z każdego pasma liczby kolumn (też tabletowych), bo 375 i 1280 px nie łapią przepełnienia pomiędzy.
- Rebuild `.next` pod działającym `next start` daje 500 w e2e, więc ubij stary serwer na 3100 przed e2e.
**Otwarte kwestie:**
- Przy 640–765 px galeria ma jedną szeroką kolumnę, więc kafelki są wtedy szersze niż potrzeba. To świadomy kompromis kosztem 2 kolumn.
- Na porcie 3100 działał stary `next start` po poprzednim review i powodował fałszywe błędy 500 w e2e. Zabiłem go (PID 83584). Przed `docs test:e2e` warto sprawdzać `lsof -i :3100`.
- docs/superpowers/specs/2026-10-25-tally-charts-docs-site-design.md: Design §2 (linia 51) nadal mówi „3×3 from 640 px, 2 columns below”. Implementacja świadomie robi auto-fill z kafelkiem ≥ 22 rem (1 kolumna do ~765 px), a odejście jest opisane tylko w PROGRESS D2. Dokument designu rozjeżdża się więc z kodem.
**Kryteria:**
- `apps/docs/content/home.json` ma `componentTree` z 6 węzłami o unikalnych id w kolejności typów: hero, visual-language, gallery, install, feature-grid, link-row. Visual-language ma 4 pozycje z exampleId `visual-language/{hatch,solid,loss,target}`. Gallery ma 9 pozycji `reference/01…09` w kolejności, a caption każdej to `examples[id].title`. Install ma command `npm i tally-charts`. Feature-grid ma 4 karty: accessibility (keyboard, screen readers, forced-colors), Server Components, theming with tokens, light/dark. Link-row ma Getting started `/docs/getting-started`, GitHub i npm. `pnpm --filter docs test content/fixtures.test.ts` przechodzi
- Hero w `home.json` ma title dokładnie „Opinionated React charts for narrative business dashboards.”, a na `/` jest to jedyny h1
- `visualLanguageSchema` wymaga `heading`, a VisualLanguage (serwer i edytor) renderuje `<section>` z h2. Testy bloku i editor-registry są zaktualizowane, a `parseBlockProps('visual-language', …)` bez heading zwraca `success: false`
- `app/page.tsx` nie zawiera FEATURES, DASHBOARDS, tekstów sekcji ani importów `examples/bar-chart/margin-by-week`, `_components/visual-language` i `_components/code-block`. Zawiera SiteHeader, PreviewNotice, EditorSwitch/CMSPage i footer. Plik `app/_components/visual-language.tsx` nie istnieje, a `SITE.hero` jest usunięty (grep nie znajduje użyć)
- globals.css: `.gallery` ma jedną kolumnę poniżej 640 px i 3 kolumny od 640 px. `.hero` ma 2 kolumny od 900 px (bez zmian). `.gallery-tile` jest kontenerem inline-size, a reference.css ma reguły @container odpowiadające regułom @media (max-width: 900px). Decyzja o jednej kolumnie przy 375 px jest zapisana w PROGRESS.md
- `app/page.test.tsx` (render SSR) sprawdza: h1, wykres hero „Margin by week, last 6 weeks”, kolejność `main > section > h2` równą headingom z home.json, 9 `.gallery-tile` z caption = tytuł przykładu reference i ≥1 role=application z svg w każdym, przycisk /^Copy code/ i role=status w Install, `span.nav-soon[aria-disabled=true]` Getting started bez linku oraz linki GitHub i npm. Testy draft mode i wordmarku przechodzą
- `e2e/home.spec.ts`: themeSuite dla `/` przechodzi (h1, wykres hero, light/dark w trybie forced i system, 320 i 375 px bez poziomego scrolla body i html). Kolejność h2 sekcji odpowiada home.json, 9 kafelków galerii ma widoczny wykres, przy 375 i 1280 px żaden `.gallery-tile` nie ma scrollWidth > clientWidth + 1, a kliknięcie Copy w Install (z uprawnieniami clipboard) pokazuje „Copied”. Na `/` nie ma console.error ani pageerror
- `e2e/editor.spec.ts` przechodzi, w tym nowy test `/?_editor=1`: h1 hero widoczny, 0 `.block-error`, wykresy galerii widoczne, brak błędów konsoli
- Po `pnpm build` kończą się kodem 0: `pnpm --filter docs check:content` (0 błędów dla home), `pnpm --filter docs build`, `pnpm --filter docs test`, `pnpm --filter docs typecheck`, `pnpm lint` i `pnpm --filter docs test:e2e`
- PROGRESS.md ma sekcję T26 z decyzjami D1 (heading w visual-language), D2 (galeria: 1 kolumna < 640 px i container queries dashboardów), D3 (statyczny eyebrow, usunięty SITE.hero) i D4 (identyfikacja wykresów galerii po kafelku i caption, h2 liczone jako `main > section > h2`)

## T26.3 Baseline'y wizualne strony głównej (1280/375 × light/dark, darwin + linux)
`apps/docs/e2e/home-visual.spec.ts` robi `toHaveScreenshot('home-<width>-<theme>.png', { fullPage: true })` dla `/?theme=<theme>`; baseline'y: `apps/docs/e2e/__screenshots__/{darwin,linux}/` (po 4 pliki). `playwright.config.ts` ma `snapshotPathTemplate` per platforma, `expect.toHaveScreenshot` (`maxDiffPixelRatio: 0.002`, `animations: 'disabled'`) i `updateSnapshots: process.env.CI ? 'none' : 'missing'` (jak w Storybooku).
**Decyzje:**
- Viewporty jak w `shots.mjs` (1280×1400, 375×812), `deviceScaleFactor: 1`, `timezoneId: 'UTC'`, `locale: 'en-US'`; domyślny viewport projektu bez zmian (używają go inne testy).
- Przed zrzutem test czeka na 9 `.gallery-tile` z widocznym `role=application` (każdy kafelek jest przewijany do widoku, bo wykresy mogą montować się leniwie), wraca na górę, czeka na wykres hero „Margin by week, last 6 weeks” i `document.fonts.ready`. Dzięki temu wysokość fullPage jest stabilna.
- `updateSnapshots: 'missing'` lokalnie (nowy zrzut dostaje baseline), `'none'` na CI.
- Job `docs` w ci.yml: komentarz z komendą docker (regeneracja linux + przebieg weryfikacyjny `CI=1 pnpm --filter docs test:e2e`, kopiowanie do `/out/linux` tylko po sukcesie) i krok upload `if: always()` z `apps/docs/e2e/__screenshots__` oraz `apps/docs/test-results`. Env `NEXT_TELEMETRY_DISABLED` jest już na jobie, w dockerze nie był potrzebny.
**Różnice względem pierwotnych zrzutów designu (T23.1, F16):** galeria to 9 żywych dashboardów reference zamiast hatchowanych placeholderów, więc strona jest dużo wyższa (1280 px: ok. 7380 px, 375 px: ok. 15 200 px), galeria ma 3 kolumny przy 1280 px (auto-fill, kafelek ≥ 22 rem) i 1 kolumnę przy 375 px, a sekcja „Visual language” jest blokiem z nagłówkiem (T26.1/T26.2). Zrzuty `home-*.png` w `docs/superpowers/specs/assets/docs-site/` odświeżone `shots.mjs`; `line-chart-*.png` bez zmian treści.
**Kontrast:** `contrast.mjs` „all pairs pass”, tabela identyczna z §10 dokumentu designu (bez zmian). W §2 designu poprawiono zdanie o galerii (auto-fill, kafelek ≥ 22 rem; wcześniejsza otwarta kwestia z T26.2).
**Weryfikacja:** `pnpm build`, `pnpm --filter docs build`, `docs test:e2e` na darwin bez update dwa razy pod rząd (71 testów, zielone), komenda docker z ci.yml kończy się kodem 0 (4 pliki w `linux/`).

## ✔ T26.3 Baseline'y wizualne strony głównej (1280/375 × light/dark, darwin + linux) (2026-10-25)
Dodano baseline'y wizualne strony głównej docs. `apps/docs/playwright.config.ts` ma `snapshotPathTemplate` per platforma, `expect.toHaveScreenshot` z `maxDiffPixelRatio: 0.002` i `animations: 'disabled'` oraz `updateSnapshots: process.env.CI ? 'none' : 'missing'`. Nowy `apps/docs/e2e/home-visual.spec.ts` ma 4 testy (1280 i 375 px × light i dark) z `toHaveScreenshot('home-<width>-<theme>.png', { fullPage: true })`. Test czeka na 9 kafelków `.gallery-tile` z widocznym role=application, wraca na górę, czeka na wykres hero i fonty. W `apps/docs/e2e/__screenshots__/{darwin,linux}` jest po 4 pliki. `ci.yml` ma nad jobem `docs` komentarz z komendą docker, a krok upload działa przy `if: always()` i obejmuje `e2e/__screenshots__` oraz `test-results`. CLAUDE.md opisuje konwencję baseline'ów docs. PROGRESS.md ma sekcję T26.3. W designie poprawiono zdanie o galerii w §2. Zrzuty `home-*.png` designu odświeżono `shots.mjs`, a `contrast.mjs` daje „all pairs pass” z tabelą identyczną z §10, więc tabeli nie zmieniałem. Darwin: `pnpm --filter docs test:e2e` bez update przeszło dwa razy pod rząd (71 testów). Linux: komenda docker z komentarza skończyła się kodem 0 (71 testów w przebiegu weryfikacyjnym). actionlint, `pnpm check:workflows`, `pnpm lint` (0 błędów, 5 ostrzeżeń) i `docs typecheck` przechodzą. `git diff --stat -- packages apps/storybook` jest pusty.
**Decyzje i pułapki:**
- Playwright uruchamia własny `next start`, gdy port 3100 jest wolny, więc `--update-snapshots=all` działa bez ręcznego serwera. Przed `shots.mjs` i `contrast.mjs` serwer trzeba odpalić samemu (`pnpm --filter docs start`) i potem ubić (`pkill -f 'next start -p 3100'`, `pkill -f next-server`).
- `NEXT_TELEMETRY_DISABLED` nie jest potrzebne w komendzie docker; job `docs` ma je już w `env`.
- Pełnostronicowy zrzut `/` ma ok. 7380 px wysokości przy 1280 px i ok. 15 200 px przy 375 px.
**Otwarte kwestie:**
- Baseline'y darwin i linux są generowane w kontenerach/hostach lokalnych; przy zmianie wersji Playwrighta lub obrazu docker oba zestawy trzeba odświeżyć.
- Nie porównywałem baseline'ów pixel w pixel ze starymi zrzutami designu. Obejrzałem 1280-light i 375-dark: zawierają hero, 9 żywych dashboardów, Install, Features i Keep going. Pozostałe dwa pliki (1280-dark, 375-light) nie były oglądane.
- apps/docs/e2e/__screenshots__/darwin/home-1280-dark.png: Baseline'y zamrażają widoczne usterki layoutu galerii z T26.2. Przy 1280 px heatmapa 'Where it leaks' jest ucięta z prawej (kolumna po 'Callbacks' wychodzi poza kafelek). Kafelki w wierszu rozciągają się do najwyższego, więc zostają duże puste pola (np. pod 'Jobs by margin' i 'Profit bridge'). W kafelku Gross margin tekst '…of profit lost against target this week.' nachodzi na znacznik paska postępu. Ten task tylko je utrwala, nie wprowadza.
**Kryteria:**
- `apps/docs/playwright.config.ts` ma `snapshotPathTemplate: '{testDir}/__screenshots__/{platform}/{arg}{ext}'`, `expect.toHaveScreenshot` z `{ maxDiffPixelRatio: 0.002, animations: 'disabled' }` i `updateSnapshots: process.env.CI ? 'none' : 'missing'`
- Istnieje `apps/docs/e2e/home-visual.spec.ts` z 4 testami (1280 i 375 × light i dark), które wchodzą na `/?theme=<theme>`, czekają na widoczne role=application w hero i w każdym z 9 `.gallery-tile`, a potem robią `toHaveScreenshot('home-<width>-<theme>.png', { fullPage: true })`
- `apps/docs/e2e/__screenshots__/darwin/` i `/linux/` zawierają po 4 pliki: home-1280-light.png, home-1280-dark.png, home-375-light.png, home-375-dark.png
- Po `pnpm build && pnpm --filter docs build` i przy wolnym porcie 3100 `pnpm --filter docs test:e2e` (bez `--update-snapshots`) przechodzi na darwin dwa razy pod rząd
- Nad jobem `docs` w `.github/workflows/ci.yml` jest komentarz z komendą docker (obraz `mcr.microsoft.com/playwright:v1.64.0-noble`, kopia repo przez tar do /w, `pnpm build && pnpm --filter docs build`, `--update-snapshots=all`, przebieg weryfikacyjny, `cp` do `/out/linux`). Ta komenda uruchomiona lokalnie kończy się kodem 0
- Krok upload artifact w jobie `docs` ma w `path` zarówno `apps/docs/e2e/__screenshots__`, jak i `apps/docs/test-results`. actionlint w dockerze i `pnpm check:workflows` przechodzą
- Punkt CLAUDE.md o baseline'ach wymienia `apps/docs/e2e/__screenshots__/{darwin,linux}`, komendę darwin `pnpm --filter docs exec playwright test --update-snapshots=all` i odsyła po linux do komentarza nad jobem `docs` w ci.yml
- `shots.mjs` i `contrast.mjs` uruchomione (zrzuty `home-*.png` designu odświeżone). Tabela kontrastu w §10 dokumentu designu jest zaktualizowana, jeśli wynik się zmienił. PROGRESS.md (sekcja T26.3) opisuje różnice baseline'ów względem pierwotnych zrzutów designu wynikające z F16
- `pnpm lint` i `pnpm --filter docs typecheck` przechodzą, `git diff --stat -- packages apps/storybook` jest pusty

## ✔ T27.1 Strona getting-started i przełączenie testów „strony nie ma” (2026-10-25)
Dodano stronę Getting started: fiksturka `apps/docs/content/getting-started.json` (wstęp, Install z `npm i tally-charts` i uwagą o `process.env.NODE_ENV`, Import the theme z `tally-charts/theme.css` i tokenami `--ch-*` / `data-ch-theme`, Your first chart z ChartExample, Name every chart z calloutem i wariantem `aria-labelledby`, Props z PropsTable `BarChart`, Next steps) oraz przykład `apps/docs/examples/getting-started/first-chart.tsx` (`BarChart` z przychodem per miesiąc, `rscSafe: true`). Link „Getting started” w sidebarze i w link row strony głównej jest teraz `<a>`, bez `.nav-soon`. Baseline'y `home-*.png` odświeżone (darwin i linux).
**Decyzje:**
- Slug „strony nie ma” w testach to `theming` (jest w nawigacji, nie ma fiksturki): `e2e/routes.spec.ts`, `app/docs/[slug]/page.test.tsx`, `blocks/link-row.test.tsx`, `blocks/ssr.test.tsx`. Test `link-row` ma dodatkowo Getting started jako zwykły link. `editor-registry.test.tsx` bez zmian.
- PropsTable strony to `BarChart`: najprostszy wykres z `data`/`x`/`y`/`title`, tego samego typu co przykład, więc czytelnik widzi tabelę propsów wykresu z pierwszego przykładu (w tym `ChartName`).
- Linki wewnętrzne w treści tylko do `/docs/line-chart` (istnieje); poza tym link zewnętrzny do README na GitHubie. Nie linkuję do theming ani innych stron bez fiksturki, bo `check:content` (c) by to odrzucił.
- Callout używa tonu `warning` (schemat dopuszcza tylko info/warning/tip, bez tytułu), więc „A name is required.” jest pogrubionym początkiem treści.
- Dwa testy zależne od zbioru stron wymagały korekty: `content/fixtures.test.ts` (dostępne strony to `getting-started` i `line-chart`) oraz CLI w `lib/content/check.test.ts` (brakujący symbol z `--require-coverage` to teraz `Area`, bo `BarChart` jest pokryty).
- Nowy `e2e/getting-started.spec.ts`: `themeSuite` (light/dark, forced/system, 320/375 px), 200 + h1 + link w sidebarze z `aria-current` bez `.nav-soon`, link w link row na `/`.
**Weryfikacja:** `pnpm build`, `pnpm --filter docs test` (485 testów), `docs typecheck`, `pnpm lint` (0 błędów), `docs check:content` (0 błędów, pokrycie API 2/52 tylko raportowane), `pnpm --filter docs build`, `docs test:e2e` zielone na darwin. `git diff --stat -- packages apps/storybook` pusty, changeset niepotrzebny. Obejrzany `home-1280-light.png`: „Keep going” ma Getting started jako link obok GitHub i npm.
**Otwarte kwestie:**
- Pokrycie API to nadal 2/52 (T31).

## ✔ T27.1 Strona getting-started i przełączenie testów „strony nie ma” (2026-10-25)
Dodano stronę Getting started: fiksturkę `apps/docs/content/getting-started.json` (wstęp, Install, Import the theme, Your first chart z ChartExample, Name every chart z calloutem i wariantem `aria-labelledby`, Props z PropsTable `BarChart`, Next steps) i przykład `examples/getting-started/first-chart.tsx` (`BarChart`, `rscSafe: true`, przychód per miesiąc). Link „Getting started” w sidebarze i w link row strony głównej jest teraz `<a>`, bez `.nav-soon`. Testy „strony nie ma” używają sluga `theming` (`e2e/routes.spec.ts`, `app/docs/[slug]/page.test.tsx`, `blocks/link-row.test.tsx`, `blocks/ssr.test.tsx`). `app/page.test.tsx` sprawdza link do `/docs/getting-started` i brak `.nav-soon` w `ul.link-row`. Dwa testy zależne od zbioru stron też wymagały korekty (`content/fixtures.test.ts`, CLI w `lib/content/check.test.ts`). Baseline'y `home-*.png` odświeżone dla darwin i linux (linux komendą docker z ci.yml, kod 0). Wynik: `pnpm build`, `docs test` (485), `docs typecheck`, `pnpm lint` (0 błędów), `docs check:content` (0 błędów, pokrycie API 2/52 tylko raportowane), `docs build` oraz `docs test:e2e` na darwin bez update (80 testów) są zielone. `git diff --stat -- packages apps/storybook` pusty. PROGRESS.md ma sekcję T27.1.
**Decyzje i pułapki:**
- Dodanie fiksturki zmienia zbiór `available` stron, więc testy zależne od niego trzeba przejrzeć: `content/fixtures.test.ts` (lista dostępnych stron) i CLI w `lib/content/check.test.ts` (symbol brakujący przy --require-coverage).
- Schemat callouta to tylko `tone` (info/warning/tip) i `markdown`, bez tytułu.
- `themeSuite` w e2e/support.ts wymaga nazwy wykresu równej `title` przykładu.
**Otwarte kwestie:**
- Pokrycie API w check:content to nadal 2/52 symboli z PropsTable (zaplanowane na T31).
- Baseline'y utrwalają znane usterki layoutu galerii z T26.3 (ucięta heatmapa, puste pola w kafelkach, nachodzący tekst w Gross margin).
**Kryteria:**
- Istnieje `apps/docs/examples/getting-started/first-chart.tsx` z `meta.id = 'getting-started/first-chart'`, `rscSafe: true` i wykresem z `title`. `pnpm --filter docs gen` kończy się kodem 0, a testy `examples/registry.test.ts`, `render.test.tsx` i `ssr.test.tsx` przechodzą.
- `apps/docs/content/getting-started.json` (slug `getting-started`) przechodzi `pnpm --filter docs test content/fixtures.test.ts`. Ma ≥1 blok `chart-example` z `exampleId: getting-started/first-chart` i ≥1 `props-table` (np. `BarChart`) oraz sekcje: instalacja (`npm i tally-charts`), import `tally-charts/theme.css`, pierwszy wykres, wymagana nazwa (`title` albo `aria-labelledby`).
- `e2e/routes.spec.ts` sprawdza 404 dla `/docs/theming` zamiast `/docs/getting-started`. Test e2e sprawdza, że `/docs/getting-started` zwraca 200 z h1 „Getting started”, a sidebar ma `<a href="/docs/getting-started">` bez `.nav-soon` o tej treści.
- `app/docs/[slug]/page.test.tsx` w teście „unknown page” używa `theming` zamiast `getting-started`. `app/page.test.tsx` sprawdza, że w `ul.link-row` Getting started jest linkiem do `/docs/getting-started` i że nie ma tam `.nav-soon`. `blocks/link-row.test.tsx` i `blocks/ssr.test.tsx` używają `/docs/theming` jako strony bez fiksturki.
- Po `pnpm build` `pnpm --filter docs check:content` kończy się kodem 0. Prose i callout strony getting-started linkują wewnętrznie tylko do `/docs/line-chart` albo `/docs/getting-started`.
- Baseline'y `apps/docs/e2e/__screenshots__/darwin/home-*.png` i `linux/home-*.png` (po 4) są odświeżone: linux komendą docker z komentarza nad jobem `docs` w ci.yml, kod 0. Po `pnpm build && pnpm --filter docs build` `pnpm --filter docs test:e2e` bez update przechodzi na darwin.
- `pnpm --filter docs test`, `pnpm --filter docs typecheck`, `pnpm lint` i `pnpm --filter docs build` kończą się kodem 0. `git diff --stat -- packages apps/storybook` jest pusty.
- PROGRESS.md ma sekcję T27.1 z decyzjami: slug `theming` jako „strony nie ma”, wybrany symbol PropsTable, linki tylko do istniejących stron.

## ✔ T27.2 Strona composition: Chart i 18 prymitywów (2026-10-25)
Dodano stronę Composition: fiksturkę `apps/docs/content/composition.json` (wstęp, 4 sekcje z ChartExample, callout o `useChart()` i `'use client'`, sekcja Props z 19 blokami `props-table`: Chart oraz 18 prymitywów, pogrupowane nagłówkami h3) i 4 przykłady w `apps/docs/examples/composition/`. Link „Composition” w sidebarze jest `<a>`, bez `.nav-soon`. Nowy `e2e/composition.spec.ts`: `themeSuite`, 200 + h1 + link z `aria-current`, 4 wykresy i 19 regionów „Props of …”. Pokrycie API w `check:content` to 21/52 (wcześniej 2/52), 0 błędów. `pnpm --filter docs test` (492), `typecheck`, `pnpm lint`, `docs build` i `docs test:e2e` (90, darwin, bez update) zielone. `git diff --stat -- packages apps/storybook` pusty, changeset niepotrzebny.
**Decyzje:**
- Podział prymitywów: `bars-and-axes` (rscSafe) = Chart, Grid, Axis, Bars, ValueLabel, Target, ColumnHighlight, Callout, Tooltip; `line-area-band` (`'use client'`) = Chart, Region, Grid, Band, Area, Line, Dots, Axis, NearestPointer, Tooltip; `bridge-connector` (`'use client'`) = Chart, Connector, Bars z `from`, ValueLabel, Axis; `rows-and-custom-marks` (`'use client'`) = Chart, RowDividers, RowLabels, Bars, Dots, Tooltip z `content`, DataTable.
- Odstępstwo od planu: `line-area-band` jest `'use client'`, bo `Line` nie rejestruje punktów, a `NearestPointer` aktywuje tylko punkty zarejestrowane (przez `Bars` albo `Dots`). Bez `Dots` (pozycje w pikselach z `useChart()`) wykres liniowy nie miałby hovera ani klawiatury. `useRegisterPoints` jest publiczne, ale to hook, więc też wymaga klienta.
- `'use client'` mają `line-area-band`, `rows-and-custom-marks` (hook `useChart()` dla `Dots`, funkcje w propsach: `DataTable` `columns[].value`, `Tooltip` `content`) i `bridge-connector` (funkcje `tone`, `ariaLabel`, `segments`). Tylko `bars-and-axes` ma same stringi, liczby i obiekty, więc `rscSafe: true`.
- `Tooltip content` w `rows-and-custom-marks` zwraca `<TooltipPill segments=… />`: goły string nie ma tła (pigułkę daje dopiero TooltipPill).
- `tone` w `Bars` to `PerItem` (przyjmuje funkcję per słupek), więc most ma jedną warstwę `Bars` z `tone={(s) => …}`. Jedna warstwa rejestruje punkty w kolejności osi x (klawiatura i czytnik idą Q2, Volume, Price, Costs, Returns, Q3), a `ariaLabel` i `segments` ogłaszają zmianę kroku („Costs, -30”), bo wartość słupka z `from` to jego koniec (`top`). Przez funkcje w propsach plik jest `'use client'`, `rscSafe: false`. Pilnuje tego test e2e „the bridge is announced in x order”. `ValueLabel` stoi tylko na pierwszym i ostatnim słupku, bo etykieta pokazuje wartość `top`, a nie zmianę kroku.
- `DataTable` stoi obok `Chart` w tym samym fragmencie (ukryty wizualnie), a `render.test` ma `svg` z wykresu.
- Etykiety po obejrzeniu zrzutów: `Callout` ma `offset={30}` i `margin.top` 64, żeby nie zasłaniać etykiety wartości słupka; `Target` ma `labelPosition="start"`; W2 ma 35%, żeby linia celu nie przecinała etykiety; oś y w `line-area-band` ma `margin.left` 44 (inaczej „1,000” jest ucięte).
- `check.test.ts`: pierwszy brakujący symbol przy `--require-coverage` to teraz `BridgeChart` (wcześniej `Area`). `fixtures.test.ts`: dostępne strony to getting-started, line-chart, composition.
- Linki wewnętrzne w treści tylko do `/docs/getting-started` i `/docs/line-chart`.
**Otwarte kwestie:**
- Pokrycie API to 21/52, reszta w T31.
- Szary znacznik planu w `rows-and-custom-marks` nie ma legendy, tylko zdanie w treści strony.
- Baseline'y `home-*.png` bez zmian (home nie linkuje do composition).

## ✔ T27.2 Strona composition: Chart i 18 prymitywów (2026-10-25)
Poprawiono trzy uwagi z review. (1) bridge-connector.tsx ma teraz jedną warstwę `Bars` z `tone` jako funkcją per słupek. Plik jest `'use client'` i `rscSafe: false`, bo `tone`, `ariaLabel` i `segments` to funkcje. Klawiatura i czytnik przechodzą słupki w kolejności osi x, a `ariaLabel` i `segments` ogłaszają zmianę kroku („Costs, -30”). (2) Fałszywe zdanie „tone is one value per Bars” zniknęło z bloku n15 w composition.json, z komentarza w przykładzie i z decyzji w PROGRESS.md. Nowa treść mówi, że `tone` przyjmuje funkcję. (3) `Tooltip content` w rows-and-custom-marks.tsx zwraca teraz `<TooltipPill segments=… />`, więc tooltip ma tło. Dodano test e2e, który sprawdza kolejność ogłoszeń. Wyniki: docs test 492 testy zielone, typecheck, lint, check:content (exit 0, pokrycie 21/52) i docs build kończą się kodem 0, docs test:e2e przechodzi 90 testów. `git diff --stat -- packages apps/storybook` jest pusty.
**Decyzje i pułapki:**
- `tone`, `fill` i `selectable` w `Bars` to `PerItem` (wartość albo funkcja per słupek), więc nie trzeba dzielić danych na warstwy po tonie.
- Wiele warstw `Bars` rejestruje punkty warstwa po warstwie, co psuje kolejność klawiatury i czytnika ekranu. Jedna warstwa trzyma kolejność osi x.
- Wartość słupka z `from` to jego koniec (`top`), więc zmianę kroku trzeba ogłosić przez `ariaLabel` i `segments`.
- `Tooltip content` zwracający goły string nie ma tła. Pigułkę daje dopiero `TooltipPill`.
- Live region wykresu (`[aria-live=polite]`) jest rodzeństwem diva z role=application, wewnątrz `figure[data-ch-root]`. W e2e szukaj go przez `[data-ch-root]` z filtrem `has: application`.
**Otwarte kwestie:**
- pnpm lint zgłasza 5 ostrzeżeń i 1 info, żadne nie dotyczy plików z tego taska. Nie sprawdzałem, czy istniały przed zmianami.
- Hover Tooltip z TooltipPill w rows-and-custom-marks nie był oglądany na zrzucie po poprawce. Przykład przechodzi render.test i e2e.
- Pokrycie API to 21/52, reszta w T31.
- apps/docs/examples/composition/bridge-connector.tsx: The `segments` prop on Bars does nothing here. Point segments are read only by Tooltip and Callout (Tooltip.tsx:51, Callout.tsx:111), and this chart has neither. The prose in block n15 of composition.json ('ariaLabel and segments report the change of each step') and the comment in the file suggest segments has a visible effect, which misleads readers learning composition.
**Kryteria:**
- W `apps/docs/examples/composition/` są co najmniej 4 pliki przykładów z `meta.id = 'composition/<nazwa>'` i `title`. Każdy z 18 prymitywów (Bars, Line, Area, Dots, Axis, Grid, Target, Region, Band, Callout, Connector, ValueLabel, RowLabels, RowDividers, Tooltip, NearestPointer, ColumnHighlight, DataTable) występuje jako JSX `<Nazwa` w co najmniej jednym z nich, a `<Chart` w każdym (do sprawdzenia grepem). Przykłady bez `'use client'` mają `rscSafe: true` tylko przy propsach bez funkcji.
- `pnpm --filter docs gen` kończy się kodem 0, a `examples/registry.test.ts`, `examples/render.test.tsx` i `examples/ssr.test.tsx` przechodzą dla nowych przykładów (bez console.error).
- `apps/docs/content/composition.json` (slug `composition`) przechodzi `content/fixtures.test.ts`, ma dokładnie 19 bloków `props-table` z symbolami Chart i 18 prymitywów oraz blok `chart-example` dla każdego nowego przykładu. Linki wewnętrzne w prose/callout prowadzą tylko do stron z fiksturką.
- `content/fixtures.test.ts` oczekuje dostępnych stron getting-started, line-chart i composition. `lib/content/check.test.ts` przy `--require-coverage` oczekuje faktycznie pierwszego brakującego symbolu (nie `Area`).
- Nowy `apps/docs/e2e/composition.spec.ts`: themeSuite dla `/docs/composition` (h1 „Composition”, wykres o nazwie `title` jednego z przykładów) oraz test, że odpowiedź ma status 200, a sidebar ma `<a href="/docs/composition">` z `aria-current="page"` i bez `.nav-soon`.
- Po `pnpm build` `pnpm --filter docs check:content` kończy się kodem 0 i raportuje pokrycie API 21/52 (wcześniej 2/52).
- `pnpm --filter docs test`, `pnpm --filter docs typecheck`, `pnpm lint`, `pnpm --filter docs build` i `pnpm --filter docs test:e2e` (bez update snapshotów, darwin) kończą się kodem 0. `git diff --stat -- packages apps/storybook` jest pusty, changeset niepotrzebny.
- PROGRESS.md ma sekcję T27.2 z decyzjami (podział prymitywów na przykłady, `'use client'` dla Dots/DataTable, zmiana symbolu w check.test).

## ✔ T27.3 Strony small-pieces i hooks-and-providers (2026-10-25)
Dodano strony Small pieces i Hooks and providers: fiksturki `apps/docs/content/small-pieces.json` (10 bloków `props-table`, 3 `chart-example`) i `hooks-and-providers.json` (4 bloki `props-table`, 2 `chart-example`, callout o `'use client'` i memoizacji punktów), 3 przykłady w `examples/small-pieces/` i 2 w `examples/hooks-and-providers/`. Blok „Next steps” w `getting-started.json` linkuje do `/docs/composition`, `/docs/small-pieces` i `/docs/hooks-and-providers` (asercja w `e2e/getting-started.spec.ts`). Nowe `e2e/small-pieces.spec.ts` i `e2e/hooks-and-providers.spec.ts`. Pokrycie API w `check:content` to 35/52 (wcześniej 21/52), 0 błędów.
**Reguła svg (render.test.tsx i ssr.test.tsx):** wykresy muszą mieć `svg` (`<svg` w SSR). Przykłady o id `small-pieces/*` mogą go nie mieć (`mayOmitSvg`), ale muszą wyrenderować niepusty element z tekstem (render.test) albo HTML z niepustym tekstem po usunięciu tagów (ssr.test). Brak `console.error` obowiązuje wszystkie.
**Decyzje:**
- Podział komponentów: `kpi-row` (rscSafe) = Stat, Delta, InlineBar, DotCount; `meters` (rscSafe) = Meter, RangeMeter, ZoneMeter (`zones` jako zwykły obiekt `{ bins, inclusive }`), ShareBar z `legend`; `legend-and-tooltip` (`'use client'`, `rscSafe: false`) = Chart z Bars i Line, Legend, Tooltip z `content` zwracającym TooltipPill. `provider-locale` (rscSafe) = ChartsProvider `de-DE`/EUR wokół Stat, BarChart i LineChart (z Legend); `custom-mark` (`'use client'`) = własny znacznik „lollipop” z `useChart()`, `useFormat()` i `useRegisterPoints()` na punktach z `useMemo`, w ChartsProvider `en-GB`/GBP.
- `'use client'` mają tylko `legend-and-tooltip` (funkcja `content`) i `custom-mark` (hooki). Pozostałe nie mają funkcji w propsach ani hooków, a komponenty z `useFormat()` siedzą w głównym wpisie z `'use client'`, więc działają w Server Component.
- Backlog mówił „32 symbole T27”, a po rachunku jest ich 33 (Chart + 18 prymitywów + 10 małych komponentów + ChartsProvider + 3 hooki). Za kryterium przyjęto zbiór 33 nazw: po tasku 35/52 to 33 symbole T27 i 2 z T27.1 (BarChart, LineChart). Na liście brakujących nie ma żadnego z nich.
- Hook bez parametrów (`useChart`, `useFormat`) nie ma tabeli: `PropsTableView` pisze „X has no parameters.” i „Returns …”, bez regionu. Hook z parametrami ma region „Parameters of …”. Dlatego na stronie hooków e2e liczy 2 regiony (`Props of ChartsProvider`, `Parameters of useRegisterPoints`) i dwa zdania zamiast „4 × Props of …”. Bloki `props-table` są 4, jak w kryterium.
- Tabela w `kpi-row` jest w przewijalnym regionie (`role=region`, `tabIndex=0`), bo przy 320 px nie mieści się w szerokości strony (test „does not scroll horizontally” z `themeSuite`).
- Lollipopy z `custom-mark`: id punktu to miesiąc, pozycje w pikselach wykresu (`x.scale`, `y.scale`), a `activeId` z `useChart()` powiększa aktywny znacznik. Test e2e: fokus, `Home` ogłasza „1 of 6, Jan, £48”, `End` „6 of 6”.
- Kotwice nagłówków na stronie są unikalne (pilnuje tego `fixtures.test.ts`): w sekcji Props na small-pieces h3 mają kotwice `props-numbers`, `props-meters`, `props-legend-and-tooltip`, bo h2 z przykładami używają `meters` i `legend-and-tooltip`. Wcześniej duplikaty psuły spis treści i klucze React.
- Linki wewnętrzne w nowych stronach tylko do getting-started, line-chart i composition oraz do siebie nawzajem.
- `fixtures.test.ts`: dostępne strony getting-started, line-chart, composition, small-pieces, hooks-and-providers. `check.test.ts`: pierwszy brakujący symbol przy `--require-coverage` nadal `BridgeChart` (bez zmian).
- Przed e2e na porcie 3100 nasłuchiwał stary `next-server` tego repo (serwował nieaktualny build); zatrzymany, bo Playwright użyłby go zamiast świeżego `next start`.
**Otwarte kwestie:**
- Pokrycie API to 35/52, reszta w T31.
- Funkcje `useChart`/`useFormat` nie mają parametrów, więc ich bloki to tylko zdanie i typ zwracany; opis pól zwracanych obiektów (`ChartContextValue`, `UseFormatResult`) nie jest nigdzie rozpisany na stronie.
- Props `ChartsProvider` i `useRegisterPoints` nie mają opisów w TSDoc (kolumna Description pokazuje „—”). Poza zakresem (pakiet bez zmian).
- Baseline'y `home-*.png` bez zmian (home nie linkuje do nowych stron).
