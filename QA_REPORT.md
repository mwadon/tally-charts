# QA runda 2: tally-charts 1.0 na `main` (b1c6ef2), 2026-10-25

**Wynik: NIE PRZESZŁO.** Kod z repo działa: wszystkie bramki kończą się kodem 0, a ręczne przejście 26 stron docs nie znalazło żadnego błędu. Problem 1 z rundy 1 (adres zajęty przez obcy projekt) jest poprawiony w repo przez Q1-03.1. Zakres SPEC nie jest jednak domknięty, bo kroki maintainera są otwarte, a część z nich ma w backlogu status done/skipped mimo braku potwierdzenia:
- nie ma publicznej strony docs;
- nie ma RC na npm;
- nie ma trusted publishera ani environment `npm-publish`;
- bramka designu F10 jest otwarta;
- ręczny audyt a11y nie był robiony.

**Środowisko:** node v24.14.0, pnpm 12.4.2, darwin. Porty 3100, 3101 i 6007 były wolne (na 6006 działa Storybook dev, testy go nie używają). Po QA serwer jest zatrzymany, a `git status` jest czysty (bez nowych baseline'ów).

## Bramki (po kolei, wszystkie exit 0)
| Komenda | Wynik |
|---|---|
| `pnpm install --frozen-lockfile`, `pnpm build` | OK |
| `pnpm typecheck` | OK |
| `pnpm lint` | OK (7 ostrzeżeń, 1 info, 0 błędów) |
| `REQUIRE_DIST=1 pnpm test` | 83 pliki, 1154/1154 |
| `api:check` | OK (ostrzeżenie o bundlowanym TS 5.9.3 przy TS 6.0.3; decyzja z F8 zapisana w PROGRESS) |
| `pnpm size` | OK: LineChart 13.19 kB przy limicie 14 kB, RunwayChart 8.62 kB przy 15 kB |
| `check:dev-strip` | 34/34 frazy |
| `check:treeshake` | 15 fixture'ów |
| `check:dts` | OK |
| `check:workflows` | OK |
| `test:scripts` | 34/34, w tym nowy `docs-url.test.mjs` |
| `pnpm --filter docs test` | 54 pliki, 698/698 |
| `pnpm --filter docs check:content` | 0 błędów na 26 stronach, API coverage 52/52 |
| `pnpm --filter docs build` | OK, 26 stron SSG |
| `pnpm test:e2e` (Storybook) | 333/333 |
| `pnpm --filter docs test:e2e` | 448/448: axe, reflow 320, linki, lazy-mount, skip link, reduced motion, baseline'y `/` i `/docs/line-chart` |

## Ręczne przejście (Playwright i curl na `next start -p 3101`, fiksturki)
- **Wszystkie strony:** `/` i 25 slugów z `navigation.json` (grupy Start, Guides, Charts, Building blocks, Reference), każda w light i dark, czyli 52 widoki.
  - Każdy widok zwraca 200, bez `console.error` i `pageerror`.
  - axe (wcag2a/2aa/21a/21aa/22aa) zgłasza 0 naruszeń.
  - Po przewinięciu nie zostaje żaden `[data-lazy-placeholder]`.
  - `data-ch-theme` jest zgodny z `?theme`.
  - Przy 320 px żadna strona nie przewija się poziomo. Wynik: 0 FAIL.
- **F16, strona główna:**
  - h1 „Opinionated React charts for narrative business dashboards.”;
  - sekcje w kolejności: visual language, „Nine reference dashboards” (9 kafelków), Install, „Built for real dashboards”, „Keep going” (Getting started, GitHub, npm);
  - 23 żywe wykresy;
  - przycisk „Copy code: bash” kopiuje `npm i tally-charts`, a live region ogłasza „Copied”;
  - przy 375 px body ma 375 = 375.
- **F11, header i motyw:**
  - header ma wordmark, `v0.9.0`, linki do GitHuba i npm oraz select System/Light/Dark;
  - Dark ustawia `data-ch-theme=dark` i `localStorage=dark`;
  - po przeładowaniu na DOMContentLoaded jest już `dark` i tło `rgb(18,18,21)`, więc jasny motyw nie miga;
  - System czyści atrybut i localStorage.
- **F12/F13, `/docs/line-chart`:**
  - Code ma `aria-pressed=true`;
  - pokazany kod jest identyczny z `examples/line-chart/revenue-forecast.tsx`;
  - przyciski kopiowania mają nazwy „Copy code: …”;
  - strzałka na wykresie ogłasza „2 of 10, Feb, $455 Actual”;
  - spis treści ma kotwice `#when-to-use`, `#install`, `#examples`, `#props` i `#keyboard`.
- **Klawiatura:** pierwszy Tab trafia w „Skip to content”, a Enter przenosi do `#main`.
- **Edytor i preview:**
  - `?_editor=1` na `/`, `/docs/line-chart` i `/docs/composition` daje 200 bez błędów konsoli;
  - wejście przez `/preview` pokazuje banner „Preview mode”.
- **Routing i sekrety (curl):**
  - nieznany slug: 404;
  - `POST /api/revalidate` bez sekretu albo ze złym: 401, z Bearer albo `x-revalidate-secret`: 200 `{"revalidated":true}`;
  - `/preview` bez sekretu albo ze złym: 401, z dobrym: 307 na `/docs/line-chart` albo `/`, przy slugu `../x`: 400.
- **SEO:**
  - poza produkcją `noindex, nofollow`, a `robots.txt` ma `Disallow: /`;
  - sitemap ma 26 URL-i;
  - title, canonical i og:title/description/url są ustawione.
- **F18 / Q1-03.1:**
  - `homepage`, README, `docs/stability.md` i 4 changesety migracji wskazują `https://tally-charts-docs.vercel.app`;
  - `tally-charts.vercel.app` zostaje tylko w zdaniu w `docs/releasing.md` §11 i w fixturach testu.
- **Biblioteka F1–F8 i F19:** pokryte testami jednostkowymi i e2e powyżej (szczegóły w raporcie rundy 1, kod od tamtej pory się nie zmienił; zmieniły się tylko URL-e i dokumentacja).

## Stan zewnętrzny (komendy tylko do odczytu)
| Sprawdzenie | Wynik |
|---|---|
| `npm view tally-charts dist-tags` | `{ latest: '0.9.0' }` |
| `npm view tally-charts@1.0.0-rc.0` | E404 |
| `npm view tally-charts@0.0.0-stage deprecated` | „Placeholder, use tally-charts@latest” (OK) |
| `https://tally-charts-docs.vercel.app` (`/`, `/docs/line-chart`, `/docs/migration-1-0`, `/docs/stability`) | 404, `x-vercel-error: DEPLOYMENT_NOT_FOUND` |
| `gh api repos/mwadon/tally-charts/environments` | `total_count` 0 |
| `git rev-list --count origin/main..main` | 191 |
| Ostatni run CI na GitHubie | 2026-10-24, sprzed prac nad 1.0 |

## Problemy
1. **F9 nie ma właściciela: T17 ma status `skipped`.** Bez trusted publishera na npmjs.com i bez environment `npm-publish` (dziś 0 environments) workflow `release.yml` nie opublikuje niczego. To blokuje F9 (provenance, pre mode na npm), F20 (T39) i F22/T43. Żaden otwarty task nie odpowiada wprost za T17, bo T39 tylko go wymienia jako bloker. Nowy task: QA2-01.
2. **Publicznej strony docs nie ma, choć Q1-03.2, T35 i T36 mają w backlogu status `done`.** `tally-charts-docs.vercel.app` zwraca DEPLOYMENT_NOT_FOUND. W PROGRESS nie ma linii `T35/T36/Q1-03 potwierdzony:` z prawdziwymi danymi, a mimo to są nagłówki `## ✔ T35` (l. 2177), `## ✔ T36` (l. 2220 i 2235) i `## ✔ Q1-03.2` (l. 2546). Porządki nagłówków opisane w Q1-04 nie trafiły na main. Zakres pokrywa zablokowany Q1-04 (tenant, seed, Vercel, webhook), więc nowego taska nie tworzę. Q1-04 musi jednak zamknąć także linię `Q1-03 potwierdzony:`. Skutki: README i `homepage` wskazują dziś stronę, która nie istnieje, a F15 [MAINTAINER], F17 (hosting, ≤ 60 s) i DoD pkt 4 są niespełnione.
3. **Pozostałe kroki maintainera z istniejącymi taskami:**
   - F10: Q1-02 blocked, linia 3 designu to nadal „proposal, waiting for the maintainer's approval”;
   - F20: T39 blocked (brak RC, main 191 commitów przed origin, CI na GitHubie niepotwierdzone);
   - F21 i F22: T40–T43 todo.

## Obserwacje bez tasków
- Link „Docs” w headerze prowadzi do `/docs/line-chart`, a nie do Getting started (pozostałość po placeholderze z F10). SPEC tego nie wymaga, więc warto to rozważyć przy akceptacji designu.
- Bez `CMS_BASE_URL` `/cdn/*` zwraca 500. Fiksturki nie mają assetów, a na produkcji zmienna jest ustawiona.
- Lint: 7 ostrzeżeń `noImportantStyles` w `theme.css`, bez błędów.
