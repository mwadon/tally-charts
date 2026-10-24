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
