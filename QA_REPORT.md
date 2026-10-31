# QA runda 3: tally-charts 1.0 na `main` (25b2b54), 2026-10-25

**Wynik: NIE PRZESZŁO.** Kod z repo działa. Każda bramka kończy się kodem 0, a przejście 26 stron docs w obu motywach (52 widoki) nie znalazło żadnego błędu. Od rundy 2 (b1c6ef2) zmieniły się tylko `PROGRESS.md` i `QA_REPORT.md`, a stan zewnętrzny jest taki sam. Zakres SPEC jest otwarty, bo kroki maintainera nie są zrobione:
- nie ma publicznej strony docs;
- nie ma `1.0.0-rc.0` na npm;
- nie ma trusted publishera ani environment `npm-publish`;
- bramka designu F10 jest otwarta;
- nie było ręcznego audytu a11y.

Do tego `PROGRESS.md` na main nadal ma nagłówki ✔ dla bramek, których nikt nie potwierdził. Na to jest nowy task QA3-01.

**Środowisko:** node v24.14.0, pnpm 12.4.2, darwin. Porty 3100, 3101 i 6007 były wolne; na 6006 działa Storybook dev, ale testy go nie używają. Na koniec QA serwer jest zatrzymany, a `git status` jest czysty.

## Bramki (wszystkie exit 0)
| Komenda | Wynik |
|---|---|
| `pnpm install --frozen-lockfile`, `pnpm build` | OK |
| `pnpm typecheck`, `pnpm --filter docs typecheck` | OK |
| `pnpm lint` | OK: 7 ostrzeżeń (`noImportantStyles` w theme.css), 1 info, 0 błędów |
| `REQUIRE_DIST=1 pnpm test` | 83 pliki, 1154/1154 |
| `api:check` | OK |
| `pnpm size` | OK: LineChart 13.19 kB przy limicie 14 kB, RunwayChart 8.62 kB przy 15 kB, małe elementy 2 kB przy 8 kB |
| `check:dev-strip` | 34/34 frazy |
| `check:treeshake` | 15 fixture'ów |
| `check:dts` | OK |
| `check:workflows` | OK |
| `test:scripts` | OK |
| `pnpm --filter docs test` | 54 pliki, 698/698 |
| `pnpm --filter docs check:content` | 0 błędów na 26 stronach, API coverage 52/52 |
| `pnpm --filter docs build` | OK: `/`, 25 stron SSG `/docs/*`, `robots.txt`, `sitemap.xml`; `/api/revalidate`, `/cdn/[...path]` i `/preview` są dynamiczne |
| `pnpm test:e2e` (Storybook) | 333/333 |
| `pnpm --filter docs test:e2e` | 448/448 |

## Ręczne przejście (Playwright i curl na `next start -p 3101`, fiksturki)

**Wszystkie strony.** Sprawdziłem `/` i 25 slugów z `navigation.json` w light i dark, czyli 52 widoki: **52/52 OK**. Każdy widok:
- zwraca 200, bez `console.error` i `pageerror`;
- ma 0 naruszeń axe (wcag2a/2aa/21a/21aa/22aa);
- po przewinięciu nie zostawia żadnego `[data-lazy-placeholder]`;
- ma `data-ch-theme` zgodny z `?theme`;
- przy 320 px nie przewija się poziomo.

**F15.** Jest 26 fiksturek i 5 grup nawigacji: Start 1, Guides 8, Charts 11, Building blocks 3, Reference 2. Każda z 11 stron wykresów ma:
- ≥ 2 `ChartExample` (ranked-bars ma 3);
- `PropsTable` (runway-chart także `runwayForecast`);
- sekcję „When to use” i „Keyboard and screen readers”.

**F16, strona główna:**
- h1 to „Opinionated React charts for narrative business dashboards.”;
- sekcje idą w kolejności: visual language, „Nine reference dashboards” (9 kafelków `.gallery-tile`), Install, „Built for real dashboards”, „Keep going” (Getting started, GitHub, npm);
- strona ma 23 żywe wykresy;
- przycisk „Copy code: bash” kopiuje do schowka `npm i tally-charts`, a live region ogłasza „Copied”;
- przy 375 px `body.scrollWidth` = `clientWidth` = 375.

**F11, header i motyw:**
- header ma wordmark `tally-charts`, `v0.9.0`, link Docs, linki do GitHuba i npm oraz select System/Light/Dark;
- Dark ustawia `data-ch-theme=dark` i `localStorage tally-docs-theme=dark`;
- po przeładowaniu, już na DOMContentLoaded, jest `dark` i tło `rgb(18, 18, 21)`, więc jasny motyw nie miga;
- System czyści atrybut i localStorage.

**F12/F13, `/docs/line-chart`:**
- przycisk Code dostaje `aria-pressed=true`;
- kod pokazany w obu przykładach jest identyczny z `examples/line-chart/revenue-forecast.tsx` i `orders-last-year.tsx`;
- przyciski kopiowania mają nazwy „Copy code: bash / app/revenue.tsx / revenue-forecast.tsx”;
- wykres ma nazwę przez `aria-labelledby`, a strzałki ogłaszają „3 of 10, Mar, $498 Actual”;
- spis treści ma `#when-to-use`, `#install`, `#examples`, `#props` i `#keyboard`.

**Edytor i preview:**
- `?_editor=1` na `/`, `/docs/line-chart` i `/docs/runway-chart` daje 200 bez błędów konsoli i z poprawnym h1;
- `/preview?slug=line-chart&secret=…` przekierowuje na `/docs/line-chart` i pokazuje alert „Preview mode”.

**Routing i sekrety (curl):**
- nieznany slug daje 404;
- `POST /api/revalidate` bez sekretu albo ze złym daje 401, a z Bearer i z `x-revalidate-secret` 200 `{"revalidated":true}`;
- `/preview` bez sekretu daje 401, z dobrym 307 (na `/docs/line-chart` albo `/` dla `home`), a dla slugu `../x` 400.

**SEO:**
- poza produkcją jest `noindex, nofollow`, a `robots.txt` ma `Disallow: /`;
- sitemap ma 26 URL-i;
- title, canonical i og:title/description/url są ustawione.

**Biblioteka (F1–F8, F19):** pokrywają ją testy jednostkowe (1154) i e2e Storybooka (333) powyżej. Kod od rund 1 i 2 się nie zmienił.

## Stan zewnętrzny (komendy tylko do odczytu)
| Sprawdzenie | Wynik |
|---|---|
| `npm view tally-charts dist-tags` | `{ latest: '0.9.0' }` |
| `npm view tally-charts@1.0.0-rc.0` | E404 |
| `npm view tally-charts@0.0.0-stage deprecated` | „Placeholder, use tally-charts@latest” (OK) |
| `https://tally-charts-docs.vercel.app` (`/`, `/docs/line-chart`, `/docs/stability`) | 404, `x-vercel-error: DEPLOYMENT_NOT_FOUND` |
| `gh api repos/mwadon/tally-charts/environments` | `total_count` 0 |
| `git rev-list --count origin/main..main` | 193 |
| Ostatni run CI na GitHubie | 2026-10-24 („docs: 1.0 candidate list…”), sprzed prac nad 1.0 |

## Status względem SPEC
- **Działa (część agentów):** F1–F8, F11–F14, F16, F18, F19, F23 oraz części agentowe F9, F10, F15 i F17 (workflow, design z placeholderem, fiksturki z seedem, job CI z vercel.json).
- **Nie spełnione, wymaga maintainera (taski już są, nie duplikuję):**
  - F9 i trusted publisher: Q2-01 blocked;
  - F10, bramka designu: Q1-02 blocked, a linia 3 dokumentu designu to nadal „proposal, waiting…”;
  - F15 i F17, tenant glokki, seed, Vercel i webhook: Q1-04 blocked, strona daje DEPLOYMENT_NOT_FOUND;
  - F20, RC: T39 blocked, 193 commity nie są wypchnięte, a CI na GitHubie nie jest potwierdzone;
  - F21 i F22: T40–T43 todo.
- **D-8:** dist-tag `rc` zamiast `next` jest zapisany w PROGRESS (changesets 3 odrzuca `--tag` w pre mode). `latest` się nie ruszy, więc to zgodne z fallbackiem ze SPEC.

## Problemy
1. **PROGRESS.md na main oznacza niepotwierdzone bramki maintainera jako zrobione (nowy task QA3-01).** Mimo braku linii `F10 zaakceptowany:`, `T35/T36 potwierdzony:` i `Q1-03 potwierdzony:` istnieją nagłówki:
   - `## ✔ T04` (l. 150);
   - `## ✔ T35` (l. 2177);
   - `## ✔ T36` (l. 2220 i l. 2235);
   - `## ✔ Q1-03.2` (l. 2546).

   W backlogu T04, T35, T36 i Q1-03.2 też mają status `done`. Raport Q1-04 twierdzi, że nagłówki `## ✔ T35/T36` usunięto, ale ta zmiana nie trafiła na main, bo Q1-04 jest blocked. To ten sam problem co w rundzie 2. Nie ma go w zakresie żadnego otwartego taska, który może zamknąć agent, a DoD pkt 1 opiera się właśnie na potwierdzeniach w PROGRESS.md.
2. **Otwarte bramki [MAINTAINER]** wymienione wyżej (Q1-02, Q1-04, Q2-01, T39, T40–T43). Blokują F9, F10, F15, F17, F20–F22 i DoD pkt 3, 4 i 6. README i `homepage` wskazują stronę, która dziś zwraca 404.

## Obserwacje bez tasków
- Link „Docs” w headerze prowadzi do `/docs/line-chart`, a nie do Getting started (to pozostałość placeholdera z F10). SPEC tego nie wymaga, więc warto o tym zdecydować przy akceptacji designu.
- Bez `SITE_URL` canonical i og:url wskazują `http://localhost:3100`. Na produkcji zmienną ustawia Vercel.
- Lint: 7 ostrzeżeń `noImportantStyles` w `theme.css`, bez błędów.
