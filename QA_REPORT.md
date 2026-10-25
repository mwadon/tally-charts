# QA, runda 1: tally-charts 1.0 na `main` (846c8fd), 2026-10-25

**Wynik: NIE PRZESZŁO.** Wszystko, co jest na `main`, działa: każda bramka jest zielona, każda strona odpowiada 200, axe nie zgłasza błędów. Zakres SPEC nie jest jednak kompletny. Część braków to otwarte taski z backlogu (T30, T31, T33–T43). Dwa problemy nie mają w backlogu żadnego pokrycia (opis niżej).

Środowisko: node v24.14.0, pnpm 12.4.2, darwin. Porty 3100 i 6007 były wolne przed e2e. Po QA drzewo jest czyste, a serwer `next start`, który uruchomiłem, jest zatrzymany.

## Bramki (wszystkie exit 0)

| Komenda | Wynik |
|---|---|
| `pnpm install --frozen-lockfile`, `pnpm build` | OK |
| `pnpm typecheck`, `pnpm lint` | OK (5 ostrzeżeń, 1 info, bez błędów) |
| `pnpm test` | 83 pliki, **1152/1152** |
| `api:check`, `check:dev-strip`, `check:dts`, `check:treeshake` | OK (15 fixture'ów bundluje tylko własny graf importów) |
| `pnpm size` | OK, LineChart 13.19 kB przy limicie 14 kB |
| `pnpm check:workflows`, `pnpm test:scripts` | OK |
| `pnpm test:e2e` (Storybook) | **314/314** |
| `pnpm --filter docs typecheck` / `test` / `build` | OK, vitest **604/604** (49 plików) |
| `pnpm --filter docs check:content` | 0 błędów na 18 stronach; pokrycie API **46/52** (brakuje DotHistogram, Heatmap, RunwayChart, StripPlot, WaffleColumns, runwayForecast) |
| `pnpm --filter docs test:e2e` | **233/233** |

## Przejście ręczne (Playwright i curl na `next start`)
- **Strony:** `/` i 17 stron z nawigacji, w motywie light i dark (36 widoków):
  - wszystkie zwracają 200, bez `console.error` i `pageerror`;
  - **axe (WCAG 2.0/2.1/2.2 A/AA): 0 naruszeń**;
  - wszystkie linki wewnętrzne rozwiązują się do 200.
- **Strony, których jeszcze nie ma:** sidebar pokazuje 8 brakujących jako `nav-soon`, bez linku: Accessibility, DotHistogram, StripPlot, WaffleColumns, Heatmap, RunwayChart, Stability, Migration to 1.0. Ich adresy zwracają 404.
- **Routing:**
  - nieznany slug daje 404;
  - `POST /api/revalidate` bez sekretu daje 401, z `Bearer` 200 `{"revalidated":true}`;
  - `/preview` ze złym sekretem daje 401, z dobrym 307 na stronę, a na `/` widać baner „Preview mode”;
  - `/docs/bar-chart?_editor=1` renderuje edytor z 2 wykresami i bez błędów.
- **SEO:**
  - poza produkcją jest `noindex, nofollow`, a `robots.txt` ma `Disallow: /`;
  - canonical i OG są ustawione;
  - sitemap zawiera 18 URL-i.
- **Motyw:** wybór Dark w `select` zapisuje `data-ch-theme=dark` i `localStorage`. Po przeładowaniu z zablokowanym JS Next atrybut i tło (rgb(18,18,21)) są już ustawione przed hydracją, więc nie ma mignięcia jasnego motywu.
- **Header:** wersja 0.9.0, linki do GitHuba i npm.
- **Klawiatura:** pierwszy Tab trafia w „Skip to content” (`#main`).
- **Strona główna:**
  - sekcje idą w kolejności z F16: hero z wymaganym zdaniem, visual language, galeria 9 dashboardów, Install, features, Keep going;
  - przy 375 i 320 px `scrollWidth == clientWidth`, więc nic nie przewija się w poziomie;
  - przycisk kopiowania ma nazwę „Copy code: bash”, po kliknięciu live region ogłasza „Copied”, a w schowku jest `npm i tally-charts`.
- **ChartExample:** przełącznik Code pokazuje kod.

## Co nie działa albo czego brakuje względem SPEC

### Problemy bez pokrycia w backlogu (są z nich follow-upy)
1. **F2 (`underlay` w LineChart) nie istnieje na `main`.**
   - Grep po `underlay` znajduje tylko SPEC.md i PROGRESS.md. Commity T06 (8129a40, c27b514) nie są przodkami HEAD.
   - Brakuje też story „LineChart / Underlay” i jej baseline'ów.
   - Podobnie T09.2: na `main` nie ma baseline'u ZoneMeter przy 320 px dla żadnej platformy. W `darwin` i `linux` brakuje `primitives-small-pieces--edge-cases`.
   - Oba taski zablokowała uszkodzona baza Dockera. **Teraz Docker działa:** `docker image ls` przechodzi, a `docker image inspect mcr.microsoft.com/playwright:v1.64.0-noble` zwraca 0, więc obraz jest lokalnie. Blokada najpewniej zniknęła.
2. **Bramka F10 (T04) jest oznaczona jako zrobiona, ale akceptacji nigdzie nie zapisano.**
   - PROGRESS.md nie ma linii „F10 zaakceptowany: …”. Sekcja T04 sama mówi „Gate OTWARTY” i „Orkiestrator nie powinien oznaczać T04 ✔”.
   - Dokument designu nadal ma status „proposal, waiting for the maintainer's approval”, a pole `Decision: —` jest puste.
   - M5 ruszył bez zapisanej akceptacji, co łamie D-12.

### Znane i zaplanowane (bez nowych tasków)
- **F15, F7, F23:** brakuje 9 stron (accessibility, stability, migration-1-0, dot-histogram, strip-plot, waffle-columns, heatmap, runway-chart). `line-chart` ma 1 ChartExample zamiast co najmniej 2. Pokrycie API to 46/52. To zakres T30 i T31.
- **F17:**
  - docs e2e nie ma jeszcze axe, sprawdzania linków ani baseline'u `line-chart` (T33); moje ręczne axe i linki są czyste;
  - hosting Vercel to T33 i T36.
- **NFR:** Lighthouse nie był mierzony (T34).
- **F18:** README ma 508 linii (cel to ~120), a `homepage` wskazuje GitHub (T37).
- **F9, F20–F22:** wymagają maintainera (T17, T35–T43). Brak `NPM_TOKEN` potwierdza `check:workflows`. D-8: RC idą na dist-tag `rc` zamiast `next`, zgodnie z fallbackiem zapisanym w PROGRESS.md.

### Drobne (bez taska)
- `/cdn/<path>` bez `CMS_BASE_URL`, czyli w trybie fixtur, zwraca 500 („createAssetProxy: baseUrl is required”) zamiast 404. W trybie CMS nie ma to znaczenia.
- Wersja w headerze to 0.9.0: tak powinno być do Version PR.
