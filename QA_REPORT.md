# QA runda 1: tally-charts 1.0 na `main` (f5d6309), 2026-10-25

**Wynik: NIE PRZESZŁO.** Cały kod z repo działa: każda bramka kończy się kodem 0, a wszystkie 26 stron docs przechodzi ręczne przejście bez błędów. Zakres SPEC nie jest jednak domknięty, z dwóch powodów:

1. **Domena publicznej strony należy do kogoś innego.** `https://tally-charts.vercel.app` to obca aplikacja („Tally Response Viewer”). Wskazują na nią `homepage`, README paczki i changesety, a te trafią na npm razem z RC.
2. **Kroki maintainera są otwarte albo niepotwierdzone.** T35 i T36 mają w backlogu status done, ale w PROGRESS nie ma linii „T35 potwierdzony” ani „T36 potwierdzony”, a strona z treścią z glökki nie istnieje. Do tego zablokowane są T17, T39 i Q1-02, a T40–T43 nie są zaczęte.

**Środowisko:** node v24.14.0, pnpm 12.4.2, darwin. Porty 3100 i 6007 były wolne. Port 6006 był zajęty przez działający Storybook dev, ale testy go nie używają. Po QA serwer jest zatrzymany, a `git status` jest czysty, czyli nie powstały nowe baseline'y.

## Bramki (uruchamiane po kolei, wszystkie exit 0)
| Komenda | Wynik |
|---|---|
| `pnpm install --frozen-lockfile`, `pnpm build` | OK |
| `pnpm typecheck` | OK |
| `pnpm lint` | OK (7 ostrzeżeń, 1 info, 0 błędów) |
| `REQUIRE_DIST=1 pnpm test` | 1154/1154 |
| `api:check` | OK (tylko ostrzeżenie o bundlowanym TS 5.9; `dts-parse.test` przechodzi z `REQUIRE_DIST=1`) |
| `pnpm size` | OK; LineChart 13.19 kB przy limicie 14 kB, RunwayChart 8.62 kB |
| `check:dev-strip` / `check:treeshake` / `check:dts` | 34/34 frazy / 15 fixture'ów / OK |
| `check:workflows`, `test:scripts` | OK |
| `pnpm --filter docs test` | 698/698 (54 pliki) |
| `pnpm --filter docs check:content` | 0 błędów na 26 stronach, pokrycie API 52/52 |
| `pnpm --filter docs build` | OK |
| `pnpm test:e2e` (Storybook) | 333/333 |
| `pnpm --filter docs test:e2e` | 448/448 |

## Ręczne przejście (Playwright i curl na `next start -p 3101`, fiksturki)
**Strony.** Sprawdziłem `/` i wszystkie 25 slugów z `navigation.json`, w motywie light i dark, czyli 52 widoki:
- każdy widok zwraca 200, bez `console.error` i `pageerror`;
- axe (wcag2a/2aa/21a/21aa/22aa) zgłasza 0 naruszeń;
- po przewinięciu nie zostaje żaden lazy placeholder.

**Reflow i klawiatura:**
- przy 320 px żadna strona nie przewija się poziomo; przy 375 px `/` ma body 375 = 375;
- pierwszy Tab trafia w „Skip to content”, który prowadzi do `#main`;
- przy 375 px przycisk Menu przełącza `aria-expanded` i pokazuje 25 linków.

**F16, strona główna:**
- h1 brzmi „Opinionated React charts for narrative business dashboards.”;
- sekcje są w kolejności: visual language → 9 kafelków galerii → Install → „Built for real dashboards” → „Keep going” (Getting started, GitHub, npm);
- na stronie są 23 żywe wykresy;
- przycisk „Copy code: bash” zapisuje do schowka `npm i tally-charts`, a live region ogłasza „Copied”.

**F11, header i motyw:**
- header ma wordmark, `v0.9.0` (poprawnie przed Version PR), linki do GitHuba i npm oraz select Theme z opcjami System/Light/Dark;
- wybór Dark ustawia `data-ch-theme=dark` i `localStorage tally-docs-theme=dark`;
- po przeładowaniu na `DOMContentLoaded` jest już `dark` i tło `rgb(18,18,21)`, więc jasny motyw nie miga;
- wybór System usuwa atrybut i wpis w localStorage; przy `colorScheme: dark` tło jest ciemne.

**F12/F13, ChartExample na `/docs/line-chart`:**
- przełącznik Preview/Code działa (`aria-pressed`);
- pokazywany kod jest identyczny z plikiem `examples/line-chart/revenue-forecast.tsx`;
- przycisk kopiowania ma nazwę „Copy code: revenue-forecast.tsx”;
- strzałka na wykresie ogłasza „2 of 10, Feb, $455 Actual”;
- spis treści zawiera 5 kotwic.

**Routing i bezpieczeństwo:**

| Żądanie | Wynik |
|---|---|
| nieznany slug | 404 |
| `POST /api/revalidate` bez sekretu albo ze złym | 401 |
| `POST /api/revalidate` z Bearer albo z `x-revalidate-secret` | 200 `{"revalidated":true}` |
| `/preview` bez sekretu albo ze złym | 401 |
| `/preview` z dobrym sekretem | 307 na `/docs/line-chart` albo `/` |
| `/preview?slug=../x` | 400 |
| po wejściu przez preview | banner „Preview mode” widoczny |
| `?_editor=1` na `/docs/line-chart` i `/` | renderuje się bez błędów |

**SEO:**
- poza produkcją jest `noindex, nofollow`, a `robots.txt` ma `Disallow: /`;
- sitemap ma 26 URL-i;
- title, description, canonical i og:* są ustawione.

**Treść (F15, F23):**
- każda z 11 stron wykresów ma co najmniej 2 ChartExample, PropsTable oraz sekcje „When to use it” i „Keyboard and screen readers”;
- `migration-1-0` opisuje 4 zmiany łamiące z „przed” i „po” (przykłady w `examples/migration/`) oraz 3 zmiany addytywne.

**Biblioteka (F1–F8, F19), sprawdzone w kodzie i testach:**
- domyślny `fill ?? 'solid'` z TSDoc;
- `underlay` jest w api.md, a test sprawdza kolejność w DOM;
- 13 `@ts-expect-error` w `types.test.ts`;
- testy podpowiedzi Enter w Chart, Bars, RankedBars i NearestPointer;
- RunwayChart: pointercancel, kontrolowany `activeId` i zduplikowane id;
- thinTicks zachowuje wyróżniony tick;
- `nested-theme.spec.ts` (F19);
- `createDateFormatter` jest w `core.api.md`;
- `prepublishOnly` uruchamia pełny zestaw;
- komentarze o `--_ch-swatch-color` są na miejscu;
- `docs/a11y.md` ma §Known limits (tooltip z `pointer-events`, przedziały domknięte tylko od dołu) oraz §Manual results.

**F18:** README ma 51 linii (opis, install, `theme.css`, przykład, Stability, linki), a `homepage` jest ustawiony. Adres jest jednak zły, opis w problemie 1.

## Problemy
1. **Domena `tally-charts.vercel.app` jest zajęta przez obcy projekt (nowy, realny problem).**
   - `curl https://tally-charts.vercel.app/` zwraca 200 z `<title>Tally Response Viewer</title>` („View and visualize Tally.so survey responses”);
   - `/docs/line-chart`, `/docs/migration-1-0`, `/docs/stability`, `/sitemap.xml` i `/robots.txt` zwracają 404;
   - na ten adres wskazują `homepage` w `packages/tally-charts/package.json`, wszystkie linki README (w tym Stability i migration) i 4 linki `…/docs/migration-1-0` w changesetach, które trafią do CHANGELOG `1.0.0-rc.0`;
   - po publikacji RC użytkownicy npm trafią na cudzą stronę;
   - PROGRESS traktował ten adres jako „założenie do weryfikacji”, a teraz wiadomo, że projekt Vercel nie może dostać tej nazwy.
2. **T35 i T36 są oznaczone jako done bez potwierdzenia maintainera.**
   - Sekcje w PROGRESS mają nagłówki ⛔ i ✔ jednocześnie, a linii „T35 potwierdzony:” i „T36 potwierdzony:” nie ma (są tylko placeholdery).
   - Publicznej strony z treścią z glökki nie ma (problem 1), więc F15 [MAINTAINER] (tenant, seed, webhook) i F17 (Vercel, zmiana widoczna w ≤ 60 s) nie są spełnione.
   - DoD pkt 4 też nie jest spełniony: `check:content` na żywym CMS nie było uruchomione.
3. **Kroki maintainera, które już mają taski:**
   - F9: T17 skipped, nie ma trusted publishera ani environment `npm-publish`;
   - F10: bramka designu otwarta, status w linii 3 to nadal „proposal…” (Q1-02 blocked);
   - F20: brak RC, dist-tags to `{ latest: '0.9.0' }`, T39 blocked, main jest 183 commity przed origin, a ostatni run CI na GitHubie jest sprzed 1.0;
   - F21 i F22: T40–T43 todo.
   - `0.0.0-stage` jest już deprecated („Placeholder, use tally-charts@latest”).

## Obserwacje bez tasków
- Bez `CMS_BASE_URL` `/cdn/x.png` zwraca 500 (SDK: „baseUrl is required”). Fiksturki nie mają assetów, a na produkcji zmienna jest ustawiona, więc to nie jest problem w zakresie.
- Lint zgłasza 7 ostrzeżeń (`noImportantStyles` w `theme.css`), bez błędów.
