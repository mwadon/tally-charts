# StackedAreaChart Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `StackedAreaChart` (series stacked as layers over an ordered x, with an optional hatched forecast part and end labels) to `tally-charts` as an additive 1.3.0 change, with stories, e2e gates and a docs page.

**Architecture:** A high-level chart in `src/react/charts/StackedAreaChart.tsx` on `<Chart>`, built like `LineChart.tsx` (read it first: rows keyed by x on a point or time scale, one point per x, `NearestPointer`). Row building moves out of `LineChart.tsx` into a shared module so both charts use one implementation. Stacking reuses `stackRow` from `core/bars.ts`; default tones reuse `seriesTones` from `charts/bar-series.tsx`. One internal mark draws layer paths, separators, the hatched forecast part, the rule and end labels; another registers the points and draws the active-x cursor.

**Tech Stack:** React 18/19, TypeScript, vitest + Testing Library, Storybook + Playwright, Next.js docs app, changesets, pnpm.

**Spec:** `docs/superpowers/specs/2026-11-18-tally-charts-1.3-stacked-area-chart-design.md` (read it first; §2 is the exact props type, copy it verbatim; where it says "as `LineChart`", copy that prop's TSDoc from `LineChart.tsx`).

## Global Constraints

- Read `CLAUDE.md` before starting; its commands and conventions apply.
- Implementers do not commit, branch, stash or push: the orchestrator commits after each task. The untracked `cha.png` in the repo root is not yours: leave it. Do not leave timers or monitors running after you reply.
- Additive only: `api:update` may add `StackedAreaChart`, `StackedAreaChartProps`, `AreaSeries` and nothing else. `LineChart`, `Line`, `Area`, `Region`, `Target`, `NearestPointer` keep their public behaviour (their tests pass unedited); `LineChart`'s warning codes and texts stay as they are.
- No new user-visible English strings in `src/react/` outside `react/messages.ts`; "Total" comes from `messages.total ?? TOTAL` and `messages.headerTotal ?? HEADER_TOTAL`.
- New top-level `createWarner()` / `createContext()` / `memo()` in src are marked `/* @__PURE__ */`; constants are literals. Dev warnings must strip in production (`check:dev-strip`): no destructuring inside `if (DEV && …)`.
- Default tones by series position: `accent`, `accent-soft`, `warn`, `neutral`, `gain`, repeating; never `loss`.
- Defaults: `endLabels` true, `grid` true, `yAxis` 'all', `xAxis` 'all', `interactive` true, height 280, margins as `LineChart` (`{ top: 24, right: 16, bottom: 32, left: 44 }`).
- Point id: the row key as in `LineChart` (the category as a string, or the ISO date). React keys use indexes where ids may repeat.
- Sample data in tests, stories and docs is fictional and in English. Always spell "glokki".
- After any change in `packages/tally-charts/src` run `pnpm build` before `api:check`, `check:dts`, `check:treeshake`, `size` and anything in `apps/docs`.
- Size: `StackedAreaChart` entry ≤ 15 KB gzip; `LineChart` stays ≤ 14 KB; `tally-charts/core` stays ≤ 8 KB. If an entry goes over after honest work, do not contort the code: report the measured number.
- Hydration tests render the server markup before installing the `console.error` spy.

Shared test data ("weeks"): W1–W12 with `install` 180/190/200/210/205/220/235/240/250/255/262/270, `service` 120/125/118/130/140/138/145/150/155/158/162/165, `warranty` 60/55/65/68/62/58/66/72/70/74/76/78 (totals: W1 360, W4 408, W9 475, W12 513), format `(v) => `${v} h``, `forecastFrom="W10"`, `forecastLabel="today"`.

## Review Focus

1. **A row with a missing value in the middle**: every layer breaks at that x on both sides, a lone x between two breaks draws no area, the row still has a point that lists the finite series and no total.
2. **`forecastFrom` at the edges**: at the first x nothing is hatched and no rule is drawn; at the last x only the last interval is hatched; a value not on the axis warns and hatches nothing; a break inside the forecast part still breaks the hatched layers.
3. **Negative values**: counted as zero in the geometry and the total, one development warning, the tooltip and table show the real value.
4. **One row, one series, and a 60 px wide chart**: nothing throws, no path has NaN, a single row draws no area but has its point.
5. **End labels that would overlap, and long series names**: none is drawn and the right margin does not grow; when drawn, the margin fits the longest line.
6. **Unsorted dates on a time axis**: layers, the forecast split and keyboard order follow date order.

Each is pinned by a test in the task that owns the code (Tasks 1–3).

---

### Task 1: Shared x rows

**Files:**
- Create: `packages/tally-charts/src/react/charts/x-rows.ts` (+ `x-rows.test.ts` if logic becomes testable on its own)
- Modify: `packages/tally-charts/src/react/charts/LineChart.tsx`

**Interfaces:**
- Produces, from `x-rows.ts`: what `StackedAreaChart` needs from `LineChart`'s row handling, with `LineChart` as the first caller: building rows keyed by x from `data`, the `x` prop (accessor or time scale spec) and a list of value getters (skipping missing and repeated x with the existing warnings, `gapAfter`, date sort); the x label formatter (`xAxisFormat`, 'auto' dates, locale, zone); `minGap`; and the `<Chart x>` scale spec for the rows. Suggested shape, adjust names to fit: `interface XRow<D> { key; time; label; datum; index; values: number[]; gapAfter? }`, `buildXRows(data, x, getters, warn, chart, prefix)`, `useXLabels(rows, x, xAxisFormat)`, `xScaleOf(x)`. Warning codes are `${prefix}-x-missing` / `${prefix}-x-repeated` with the chart name in the text, so `LineChart` keeps `line-x-missing` and its exact texts. `LineChart`'s band `low`/`high` ride along as two extra value getters or stay local, whichever keeps `LineChart.tsx` simplest.
- If a new function takes the chart name as a string literal argument, add it to `NAME_CALLEES` in `src/react/messages-literals.test.ts`.

- [ ] **Step 1:** Extract; `LineChart.tsx` imports from `x-rows.ts`. No behaviour change.
- [ ] **Step 2:** `pnpm --filter tally-charts test` → all pass with `LineChart.test.tsx` and the other LineChart-using tests unedited. `pnpm build && pnpm --filter tally-charts api:check && pnpm size && pnpm --filter tally-charts check:treeshake && pnpm --filter tally-charts check:dev-strip` → green, API report unchanged; report the `LineChart` size before and after. `pnpm lint && pnpm typecheck` → clean.

### Task 2: StackedAreaChart layers and forecast part

**Files:**
- Create: `packages/tally-charts/src/react/charts/StackedAreaChart.tsx`, `StackedAreaChart.test.tsx`
- Modify: `packages/tally-charts/src/theme/theme.css` for the new parts (see below), and whatever test enumerates parts or selectors if one does

**Interfaces:**
- Consumes: `x-rows.ts` (Task 1), `stackRow` (`core/bars.ts`), `seriesTones` and `warnSeries` (`charts/bar-series.tsx`), `Chart`, `Grid`, `Axis`, hatch patterns (`theme/patterns.ts`; read how `Bars` gets a tone's hatch paint and how the pattern defs reach the SVG).
- Produces: `export interface AreaSeries<D>`, `export type StackedAreaChartProps<D>`, `export function StackedAreaChart<D>(props)` exactly as spec §2. This task renders layers, separators, the forecast part, grid and axes. End labels, points, tooltip, cursor and the table's Total column are Task 3; accept those props in the type now.

Decisions the spec leaves to the plan:
- Stacking per row: values `< 0` count as 0 (warning `stacked-area-negative`, once); a row is "complete" when every series value is finite. Stack complete rows with `stackRow`; note that `stackRow` drops zero values, so derive each series' `[from, to]` so that a zero-value layer has `from === to` at that x (it must still be part of the path). An incomplete row breaks every layer: paths end at the previous complete row and restart at the next; a run of a single complete row draws nothing.
- Default domain: `niceDomain([0, largest total of complete rows], yAxis tick count)`; `domain` wins.
- Layers: one `<path data-ch-part="area-layer" data-ch-tone data-ch-fill="solid|hatch">` per series per run, closed between the series' upper and lower boundaries, straight segments. With `forecastFrom` on the axis and not the first x: the split x is the x before it; each run is cut at the split x into a solid part and a hatched part (both include the split x). Hatched parts use the tone's hatch paint and get an upper-edge line in the tone, 1.5 px (`data-ch-part="area-edge"`).
- Separators: for every boundary between two neighbouring layers in the solid part, a 2 px line in the surface colour (`data-ch-part="area-separator"`), none on the top layer's upper edge and none along the baseline.
- Forecast rule: a dashed vertical line at the split x over the plot height (`data-ch-part="forecast-rule"`) and, with `forecastLabel`, a text centred above the plot (`data-ch-part="forecast-label"`, baseline 6 px above the plot top, clamped so the estimated text stays inside the SVG).
- `theme.css`: add rules for `area-layer` (fill from the tone paint, like bars), `area-edge`, `area-separator`, `forecast-rule`, `forecast-label`, with forced-colors counterparts following what the file does for `bar`, `target` and `target-label`; only `--ch-*` tokens that already exist. If a rule for an existing part can be extended by adding a selector, do that instead of copying declarations.
- Time axis: rows sort by date (Task 1's builder); `forecastFrom` is compared as a date; off-domain dates are not drawn (follow `LineChart`).
- Dev warnings through a memoized `createWarner()`: `stacked-area-series-count` (more than 5), `stacked-area-series-id` / `-series-empty` via `warnSeries`, `stacked-area-negative`, `stacked-area-forecast` (`forecastFrom` not on the axis). An empty `series` shows the chart's `empty` state.

- [ ] **Step 1: Write failing tests** (copy render helpers and fixed-size setup from `LineChart.test.tsx`; data: weeks; parse path `d` into points to assert geometry against a known scale):
  - three solid `area-layer` paths with tones `accent`, `accent-soft`, `warn`; explicit `tone` wins; at W1 the install layer spans 0→180, service 180→300, warranty 300→360 on the value scale, at W12 0→270, 270→435, 435→513
  - default domain reaches at least 513 and starts at 0; `domain={[0, 800]}` is used as given
  - two `area-separator` lines for three layers, each following the boundary between its layers
  - `forecastFrom="W10"`: each series has a solid path ending at W9 and a hatched path from W9 to W12, three `area-edge` lines, one `forecast-rule` at W9's x, `forecast-label` "today" above the plot; without `forecastLabel` no label
  - Review Focus 2: `forecastFrom="W1"` → no hatched path, no rule; `forecastFrom="W12"` → hatched from W11; `forecastFrom="W99"` → warns once, nothing hatched; a missing value at W11 with `forecastFrom="W10"` → hatched parts cover W9–W10 only (W12 alone draws nothing)
  - Review Focus 1 (geometry): `service: null` at W5 → every series has two solid paths (W1–W4, W6–W12), none touching W5's x; additionally null at W7 → W6 alone draws nothing
  - Review Focus 3 (geometry): `warranty: -20` at W3 → the warranty layer has zero thickness there, the total boundary equals install + service, one warning
  - a zero value in the middle series keeps that series' path continuous with zero thickness at that x
  - Review Focus 4: one row → no `area-layer`, no throw; one series → one path, no separator; width 60 → no `NaN` in any `d`
  - time axis with unsorted dates (Review Focus 6): path x coordinates increase; `forecastFrom` as an ISO date splits at the date before it
  - grid and axes present by default; `grid={false}`, `yAxis="none"`, `xAxis="none"` remove them
  - dev warnings: 6 series, repeated id, empty series each warn once; empty series shows the `empty` content
- [ ] **Step 2:** `pnpm --filter tally-charts exec vitest run src/react/charts/StackedAreaChart.test.tsx` → FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Same command → PASS; `pnpm --filter tally-charts test` → all pass (including any theme/surface test); `pnpm lint && pnpm typecheck` → clean.

### Task 3: End labels, points, cursor, tooltip, data table, SSR

**Files:**
- Modify: `StackedAreaChart.tsx`, `StackedAreaChart.test.tsx`, `theme.css` if the cursor needs a rule
- Modify: `packages/tally-charts/test/fixtures.tsx` (fixture `CrewHours`: weeks with the forecast props; import the component from its source file until Task 4 exports it), `src/ssr.node.test.tsx`, `src/hydration.test.tsx` (model on the `MonthlyCost` cases)

**Interfaces:**
- Consumes: Task 2's component; `useRegisterPoints`, `NearestPointer`, `tooltipContent`, `userCallbacks`, `withTableOptions` as `LineChart` uses them (the chart's rows wrap the user's rows; callbacks and a function tooltip must receive the user's row as `point.datum`, as in `LineChart`).
- Produces: internal marks only. No new exports.

Decisions:
- End labels (`endLabels` true): for the last complete row that is also the last row, per series with a non-zero layer there: `<text data-ch-part="end-label">` with the series label and under it `<text data-ch-part="end-value">` with the formatted value, starting 10 px right of the plot, the pair centred vertically on the layer's extent at the last x. They are drawn only if every pair of neighbouring label centres is at least 30 px apart; otherwise none. The right margin: when labels are drawn, `10 + widest estimated line + 8` (use `estimateWidth` from `core/ticks`), else the default 16. The decision needs the value scale before `<Chart>` lays out: derive it from `height`, the top and bottom margins and the domain, and verify in a test that it agrees with the rendered scale. A user `margin` merges over the defaults. If the last row is incomplete, no end labels.
- Points: one per row with at least one finite value: `id` = row key, `index`, `x` at the row's x, `y`/`hitY` at the top of the stack (top of the plot area for an incomplete row), `label` = `[x label, ...top layer first "<value> <series label>", "<total> <Total>"].join(', ')`, `segments` = `[{ value: x label }, ...top layer first { value, label, tone }, { value: total, label: Total }]`; an incomplete row lists its finite series and has no total. Values shown are the real ones (a negative shows as negative); the total is the drawn sum. `<NearestPointer axis="x">` with the radius rule `LineChart` uses.
- Cursor: at the active point's x, a vertical line from the baseline to the top of the stack (`data-ch-part="cursor"`) and a dot (radius 4) on each layer's upper edge, styled like the existing `dot` part; nothing when no point is active. Add a `cursor` rule to `theme.css` (1 px, ink, with a forced-colors counterpart) unless an existing rule fits.
- `interactive={false}`: no points, no pointer mark, no cursor, no tooltip; title, end labels and table stay.
- Data table: x column as `LineChart` (header by axis type), one column per series (real values; empty when not finite), last column `messages.headerTotal ?? HEADER_TOTAL` with the drawn total, empty for an incomplete row.

- [ ] **Step 1: Write failing tests** (data: weeks):
  - end labels: three label/value pairs to the right of the plot, "Install" / "270 h" centred on the install layer's extent at W12, and the plot is narrower than with `endLabels={false}`; the pre-computed scale agrees with the rendered one (label y equals the midpoint of the rendered layer at W12 within 0.5 px)
  - Review Focus 5: a thin middle layer (service 5 at W12) → no end labels and the right margin equals the `endLabels={false}` case; a 30-character series name → labels drawn and the margin fits it; incomplete last row → none
  - hovering near W4 shows a tooltip with "W4", then "68 h" Warranty, "130 h" Service, "210 h" Install in that order, then "Total" and "408 h"
  - keyboard: focus, ArrowRight twice → W1 then W2; exact live-region text for W1: "W1, 60 h Warranty, 120 h Service, 180 h Install, 360 h Total" (after the chart's position prefix, if `LineChart`'s announcements have one: follow the same form and assert the exact string); End lands on W12
  - `onSelect` on click receives id "W4" and `datum` equal to the user's W4 row; a function tooltip receives the user's row
  - cursor: with `activeId="W4"` one `cursor` line at W4's x from the baseline to the y of 408, and three dots at the y of 210, 340 and 408; no cursor without an active point
  - Review Focus 1 (points): the row with `service: null` has a point whose label lists Warranty and Install and no total; its table Total cell is empty and its Service cell is empty
  - Review Focus 3 (points): `warranty: -20` at W3 → tooltip shows "-20 h" for Warranty and the total 318 h; the table shows the same
  - Review Focus 4: one row → one point, no cursor crash when it is active
  - Review Focus 6: unsorted dates → ArrowRight walks in date order
  - registers the same points array again when re-rendered with the same props (model: the test of that name in `StackedBarChart.test.tsx`)
  - data table: headers `Week`, `Install`, `Service`, `Warranty`, `Total`; 12 rows; W12 total "513 h"; `dataTable={{ columns: { Total: 'All work' } }}` renames; `dataTable={false}` removes it
  - `interactive={false}`: no tab stop, no tooltip on hover, end labels and table still there
  - `tooltip={false}` renders no tooltip
  - SSR (`ssr.node.test.tsx`): `CrewHours` renders 6 `area-layer` paths (3 solid, 3 hatched) without a DOM; hydration: no recoverable error, no `console.error`, 6 layers before and after
- [ ] **Step 2:** run the files → FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** files → PASS; `pnpm --filter tally-charts test` → all pass; `pnpm lint && pnpm typecheck` → clean.

### Task 4: Public export and package gates

**Files:**
- Modify: `packages/tally-charts/src/index.ts` (export `StackedAreaChart`, `StackedAreaChartProps`, `AreaSeries`), `src/index.test.ts`, `.size-limit.js` (entry `StackedAreaChart`, limit `15 KB`, after `StackedBarChart`), `test/fixtures.tsx` (`CrewHours` imports like the other fixtures)
- Modify: `packages/tally-charts/api/*` via `api:update`
- Create: `.changeset/stacked-area-chart.md` (`'tally-charts': minor`; one paragraph for library users: layers stacked over an ordered x, `forecastFrom`/`forecastLabel`, end labels and when they are dropped, negatives count as zero, a missing value breaks the layers; a short usage snippet)
- `git show e20ffae -- packages/tally-charts/.size-limit.js packages/tally-charts/src/index.ts packages/tally-charts/src/index.test.ts` shows how `StackedBarChart` did these steps.

- [ ] **Step 1:** Add the export to `index.test.ts` → `pnpm --filter tally-charts exec vitest run src/index.test.ts` FAILS.
- [ ] **Step 2:** Export, add the size entry, write the changeset.
- [ ] **Step 3:** `pnpm build && pnpm --filter tally-charts api:update`, then inspect `git diff packages/tally-charts/api/tally-charts.api.md`: only the three additions.
- [ ] **Step 4:** All green: `pnpm --filter tally-charts test`, `api:check`, `pnpm size`, `check:dev-strip`, `check:dts`, `check:treeshake`, `pnpm lint`, `pnpm typecheck`, `pnpm test:scripts`. Report the measured sizes of `StackedAreaChart` and `LineChart`. If `StackedAreaChart` is over 15 KB, look for honest savings (shared computations done once, duplicated branches); if still over, report the number and stop there.

### Task 5: Storybook stories and e2e gates

**Files** (`git show --stat e20ffae -- apps/storybook` lists how `StackedBarChart` did it; mirror it):
- Create: `apps/storybook/stories/StackedAreaChart.stories.tsx` (title `Charts/StackedAreaChart`)
- Modify: `apps/storybook/e2e/stories.ts` (story list, and `THEMELESS` for every story without a `theme` parameter), `stories.spec.ts` (keyboard test asserting exact announcements with `toHaveText`: ArrowRight → W1, W2), `forced-colors.spec.ts` (dedicated test: layers keep distinct system colours or are kept apart by separators, the hatched part is still distinguishable, the rule and labels are visible)
- Create: baselines under `apps/storybook/e2e/__screenshots__/{darwin,linux}`

Stories (ids `charts-stackedareachart--<name>`): `light`, `dark` (the artboard: crew hours per week, Warranty `neutral`, forecast from W10 with "today", end labels, a `<Legend>` under the chart including a hatched "Booked" item if `Legend` supports a hatch swatch, otherwise without it), `time` (monthly dates), `plain` (no forecast, default tones, `endLabels={false}`), `many-series` (five series; end labels drop out).

- [ ] **Step 1:** Write the stories; add them to the e2e lists and write the two dedicated tests.
- [ ] **Step 2:** `lsof -i :6007` is empty, then `pnpm build && pnpm test:e2e` → the new stories fail only for missing baselines; axe, contrast, reflow at 320 px, forced colors and keyboard pass. If a gate fails and the cause is in `packages/tally-charts/src`, stop and report BLOCKED with the output and diagnosis; do not weaken a gate or change story data to dodge it.
- [ ] **Step 3:** Darwin baselines: `pnpm --filter storybook-app exec playwright test --update-snapshots=all`; `git status` shows only new `charts-stackedareachart--*.png`. Open the light, dark and many-series images and check: layers in accent / accent-soft / neutral with light separators, hatched part right of the dashed rule with "today" above it, end labels readable and not overlapping, nothing clipped at the right edge, no label or rule crossing text.
- [ ] **Step 4:** Linux baselines: the docker command from the comment above the `e2e` job in `.github/workflows/ci.yml`. If docker is not available, stop and report it.
- [ ] **Step 5:** `pnpm test:e2e` → PASS, and a compare-only docker run.

### Task 6: Docs page

**Files:** as the `StackedBarChart` page did it (`git show --stat e20ffae -- apps/docs docs/a11y.md CLAUDE.md PROGRESS.md` lists every file):
- Create: `apps/docs/examples/stacked-area-chart/{hours-by-type,booked-weeks,time-axis,with-legend}.tsx`, `apps/docs/content/stacked-area-chart.json` (model on `stacked-bar-chart.json`; every behavioural sentence checked against `StackedAreaChart.tsx`: stacking, forecast split, end labels and when they drop, negatives, missing values, one point per x, the tooltip order and total, the data-table limit for forecast rows), `apps/docs/e2e/stacked-area-chart.spec.ts`
- Modify: `content/navigation.json` (after LineChart), `blocks/chart-thumbs.tsx` (thumb `stacked-area`), `content/home.json` (tile; heading "Fourteen charts, one grammar"), tests that count pages, slugs, tiles or symbols, block `height` / `NARROW_CHART_HEIGHTS` where `e2e/lazy-mount.spec.ts` requires it
- Modify: `docs/a11y.md` (announcement row quoting the Storybook keyboard test's exact string; notes on the forecast state and the cursor), `CLAUDE.md` (counts and pitfalls that changed), `PROGRESS.md` (section "StackedAreaChart 1.3 (2026-11-18)": what shipped, measured sizes, test counts from your own final runs, open items; do not touch ⛔ maintainer gates)
- Modify: home baselines under `apps/docs/e2e/__screenshots__/{darwin,linux}`

- [ ] **Step 1:** Write the examples, fixture, navigation entry, thumb and e2e spec.
- [ ] **Step 2:** `pnpm build && pnpm --filter docs test && pnpm --filter docs typecheck && pnpm --filter docs check:content` → PASS, coverage full.
- [ ] **Step 3:** `pnpm --filter docs build`, port 3100 free, `pnpm --filter docs test:e2e` → only the home visual baselines differ; fix anything else in `apps/docs`.
- [ ] **Step 4:** Refresh home baselines on darwin (command in CLAUDE.md) and on linux with the docker command above the `docs` job in `ci.yml`. That docker run also rewrites the linux `/docs/line-chart` baselines: restore them with `git checkout -- <those files>`, then run the docker command in compare mode to confirm all pass. Re-run `pnpm --filter docs test:e2e` → PASS.
- [ ] **Step 5:** Update `docs/a11y.md`, `CLAUDE.md`, `PROGRESS.md`.
