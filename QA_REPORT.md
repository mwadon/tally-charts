# QA, runda 2: tally-charts 1.0 na `main` (85b75a4), 2026-10-25

**Wynik: NIE PRZESZŁO.** Na `main` działa wszystko, co tam jest. Każda bramka kończy się kodem 0, każda istniejąca strona zwraca 200 i axe nie zgłasza na nich naruszeń. Q1-01 rzeczywiście domknął F2 i F5 (szczegóły niżej). Zakres SPEC wciąż nie jest jednak pełny. Wszystkie braki mają już taski w backlogu: T30, T31, T33–T43 i Q1-02. Nie znalazłem nowego problemu bez pokrycia, więc nie ma nowych follow-upów.

**Środowisko:** node v24.14.0, pnpm 12.4.2, darwin. Porty 3100 i 6007 były wolne przed e2e. Po QA serwer `next start` jest zatrzymany, port 3100 wolny, a `git status` czysty.

## Bramki (wszystkie exit 0)

| Komenda | Wynik |
|---|---|
| `pnpm install --frozen-lockfile`, `pnpm build` | OK |
| `pnpm typecheck` | OK (cały monorepo, w tym docs) |
| `pnpm lint` | OK: 5 ostrzeżeń, 1 info, bez błędów |
| `pnpm test` | 83 pliki, **1155/1155** (w rundzie 1 było 1152; doszły testy underlay) |
| `api:check` | OK (`underlay?: ReactNode` jest w `tally-charts.api.md`) |
| `check:dev-strip` | OK (34/34 fraz) |
| `check:dts` | OK |
| `check:treeshake` | OK (15 fixture'ów) |
| `pnpm size` | OK; LineChart 13.19 kB przy limicie 14 kB |
| `pnpm check:workflows` | OK (brak `NPM_TOKEN`/`NODE_AUTH_TOKEN`) |
| `pnpm test:scripts` | 18/18 |
| `pnpm test:e2e` (Storybook, bez update) | **333/333** (było 314) |
| `pnpm --filter docs test` | **604/604** (49 plików) |
| `pnpm --filter docs build` | OK (24 strony statyczne) |
| `pnpm --filter docs check:content` | 0 błędów na 18 stronach; pokrycie API **46/52** |
| `pnpm --filter docs test:e2e` | **233/233** |

## Weryfikacja Q1-01 (follow-upy z rundy 1)

**F2, `underlay` w LineChart: działa.**
- Kod: prop `underlay` jest w `LineChart.tsx:129` (z TSDoc) i jest renderowany w `:418`, po gridzie, a przed seriami.
- Testy w `LineChart.test.tsx:688–737` sprawdzają:
  - kolejność DOM: grid → underlay → serie → children;
  - że `<Area>` w underlay leży pod linią;
  - że DOM bez underlay jest identyczny dla wariantów brak / `undefined` / `null`.
- Story `Charts/LineChart` Underlay Light/Dark ma baseline'y darwin i linux. Na PNG obszar leży pod linią.
- Changeset `line-chart-underlay.md` (minor) jest.

**F5 / T09.2, baseline ZoneMeter przy 320 px: jest.** `primitives-small-pieces--edge-cases.png` jest w obu katalogach (darwin i linux, po 49 PNG), a e2e przechodzi bez update.

## Przejście ręczne (Playwright i curl na `next start`)

**Strony.** Sprawdziłem `/` i wszystkie 25 slugów z `navigation.json`, w light i dark.
- 18 istniejących stron w każdym motywie zwraca 200, bez `console.error` i `pageerror`.
- **axe (WCAG 2.0/2.1/2.2 A/AA): 0 naruszeń** na wszystkich 36 widokach.
- Wszystkie 18 unikalnych linków wewnętrznych odpowiada 200.
- 8 slugów zwraca 404, bo stron jeszcze nie ma: accessibility, dot-histogram, strip-plot, waffle-columns, heatmap, runway-chart, stability, migration-1-0. Sidebar pokazuje je jako `nav-soon`.

**Reflow przy 320 px.** Na żadnej z 18 stron nie ma poziomego przewijania (`scrollWidth <= clientWidth` dla `html` i `body`).

**Routing:**
- nieznany slug daje 404;
- `POST /api/revalidate`: bez sekretu 401, z `Bearer` 200 `{"revalidated":true}`;
- `/preview`:
  - zły sekret daje 401;
  - dobry daje 307 na `/docs/line-chart`;
  - zły format sluga albo brak sluga daje 400;
  - poprawny slug, którego nie ma w fiksturach, daje 307. To zgodne z zamysłem, bo szkic może istnieć tylko w CMS.

**SEO:**
- poza produkcją jest `noindex, nofollow`;
- `robots.txt` ma `Disallow: /`;
- canonical i `og:title` są ustawione;
- sitemap ma 18 URL-i.

**Motyw:**
- wybór Dark zapisuje `localStorage tally-docs-theme=dark` i `data-ch-theme=dark`;
- po przeładowaniu `data-ch-theme=dark` i tło `rgb(18,18,21)` są ustawione już na `DOMContentLoaded`, czyli przed hydracją, więc nie ma mignięcia jasnego motywu.

**Header:** wordmark „tally-charts”, wersja `v0.9.0` (poprawnie do Version PR), linki do GitHuba i npm, przełącznik System/Light/Dark.

**Bloki na stronach wykresów:** każda istniejąca strona wykresu ma co najmniej 2 ChartExample i PropsTable. Wyjątek to `line-chart`, który ma 1 ChartExample (zakres T30).

## Czego brakuje względem SPEC (wszystko ma taski w backlogu)
- **F10 (bramka designu):**
  - dokument designu nadal ma status „proposal, waiting for the maintainer's approval”, a pola `Decision: —` i `Date: —` są puste;
  - PROGRESS.md nie ma linii „F10 zaakceptowany: …”;
  - czeka to na maintainera (Q1-02, blocked). M5 ruszył bez zapisanej akceptacji (naruszenie D-12, odnotowane w Q1-02).
- **F15, F7, F23:**
  - brakuje 8 stron (accessibility, stability, migration-1-0, dot-histogram, strip-plot, waffle-columns, heatmap, runway-chart);
  - `line-chart` ma 1 ChartExample zamiast co najmniej 2;
  - pokrycie API to 46/52: nie ma PropsTable dla DotHistogram, Heatmap, RunwayChart, StripPlot, WaffleColumns i runwayForecast;
  - zakres T30 i T31.
- **F17:**
  - docs e2e nie ma jeszcze axe, sprawdzania linków ani baseline'u `line-chart` (T33); ręcznie wszystkie trzy wychodzą czyste;
  - hosting Vercel to T33 i T36.
- **NFR:** Lighthouse nie był mierzony (T34).
- **F18:** README ma 508 linii zamiast ~120, a `homepage` wskazuje GitHub (T37).
- **F9, F20–F22:** wymagają maintainera (T17, T35–T43). Zgodnie z fallbackiem D-8 RC idą na dist-tag `rc`.

## Drobne (bez tasków)
- `/cdn/<path>` w trybie fixtur, bez `CMS_BASE_URL`, zwraca 500 zamiast 404. W trybie CMS nie ma to znaczenia.
- Komentarz nad `EdgeCasesStory` (`apps/storybook/stories/SmallPieces.stories.tsx:96`) odsyła do „PROGRESS.md T09.2” po opis kolizji ticków ZoneMeter przy 256 px. Opis jest jednak tylko w sekcji Q1-01 i nie ma go na liście „Backlog 1.0.x”. Warto go tam dopisać przy porządkowaniu backlogów w T42. Wymóg F5 (etykiety końców nie wychodzą poza box) jest spełniony.
