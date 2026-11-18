# GroupedBarChart Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `GroupedBarChart` (several series side by side per category) to `tally-charts` as an additive 1.1.0 change, with stories, e2e gates and a docs page.

**Architecture:** A high-level chart in `src/react/charts/GroupedBarChart.tsx` on `<Chart>` with a band scale for categories and a linear scale for values. Each series is one decorative `<Bars size align="start" offset interactive={false}>` layer; one internal mark (`GroupedPoints`, same file) registers a point per bar, draws the hit slices and the value labels. Slot geometry comes from a pure helper in `core/bars.ts`.

**Tech Stack:** React 18/19, TypeScript, vitest + Testing Library, Storybook + Playwright, Next.js docs app, changesets, pnpm.

**Spec:** `docs/superpowers/specs/2026-11-18-tally-charts-1.1-grouped-bar-chart-design.md` (read it first; §2 is the exact props type, copy it verbatim including TSDoc).

## Global Constraints

- Read `CLAUDE.md` before starting; its commands and conventions apply.
- Implementers do not commit, branch or push: the orchestrator commits after each task's review.
- Additive only: `api:update` may add `GroupedBarChart`, `GroupedBarChartProps`, `BarSeries`, `ChartPoint.seriesId` and nothing else. `Bars`, `BarChart`, `ValueLabel` do not change.
- No new user-visible English strings in `src/react/` outside `react/messages.ts` (`messages-literals.test.ts`).
- New top-level `createWarner()` / `createContext()` / `memo()` in src are marked `/* @__PURE__ */`.
- Default tones by series position: `accent`, `accent-soft`, `warn`, `neutral`, `gain`, repeating; never `loss`.
- Defaults: `padding` 0.3, `gap` 4, `valueLabel` 'all', `grid` true, `valueAxis` 'all', `axis` 'all', series `fill` 'solid', `orientation` 'vertical'.
- Bar id: `` `${rowId}:${series.id}` ``; `rowId` defaults to the data index.
- Sample data in tests, stories and docs is fictional and in English. Always spell "glokki".
- After any change in `packages/tally-charts/src` run `pnpm build` before `api:check`, `check:dts`, `check:treeshake`, `size` and anything in `apps/docs`.
- Size: `GroupedBarChart` entry ≤ 15 KB gzip; `tally-charts/core` stays ≤ 8 KB.

## Review Focus

1. **Width too small for the gaps** (`bandwidth < gap × (n − 1)`): bars must get width 0 or more, never negative, and nothing throws.
2. **Missing value in the middle series**: its slot stays empty, neighbours keep their slots, no point is registered for it, the data table cell is empty.
3. **Row ids containing `:` or repeated series ids**: ids stay distinct per bar where inputs are distinct; a repeated series id warns once and React keys do not collide.
4. **All values negative, or mixed signs**: domain includes zero, bars hang below the baseline, labels sit at the outer end.
5. **Controlled `activeId` naming a bar of one series**: only that bar is active, and with `dimInactive` every other bar in every layer is dimmed.

Each is pinned by a test in the task that owns the code (Tasks 1–3).

---

### Task 1: Slot helper in core

**Files:**
- Modify: `packages/tally-charts/src/core/bars.ts`
- Test: `packages/tally-charts/src/core/bars.test.ts`

**Interfaces:**
- Produces: `groupSlots(bandwidth: number, count: number, gap: number): { size: number; offsets: number[] }` exported from `core/bars.ts` only (not from `core/index.ts`, so the public core API does not change). `size = max(0, (bandwidth − gap × (count − 1)) / count)`; `offsets[i] = i × (size + gap)`. When the gaps alone exceed the band, `size` is 0 and offsets are spread evenly over the band (`i × bandwidth / count`). `count ≤ 0` gives `{ size: 0, offsets: [] }`. Non-finite or negative `gap` counts as 0.

- [ ] **Step 1: Write failing tests** in `bars.test.ts`, `describe('groupSlots')`:
  - `groupSlots(92, 3, 4)` → `size` 28, `offsets` `[0, 32, 64]`
  - `groupSlots(40, 1, 4)` → `size` 40, `offsets` `[0]`
  - `groupSlots(6, 4, 4)` → `size` 0, `offsets` `[0, 1.5, 3, 4.5]` (Review Focus 1)
  - `groupSlots(92, 0, 4)` → `{ size: 0, offsets: [] }`
  - `groupSlots(90, 3, Number.NaN)` and `groupSlots(90, 3, -5)` → `size` 30, `offsets` `[0, 30, 60]`
- [ ] **Step 2:** `pnpm --filter tally-charts exec vitest run src/core/bars.test.ts` → FAIL (not exported).
- [ ] **Step 3:** Implement `groupSlots` with TSDoc.
- [ ] **Step 4:** Same command → PASS. `pnpm lint && pnpm typecheck` → clean.

### Task 2: GroupedBarChart rendering

**Files:**
- Create: `packages/tally-charts/src/react/charts/GroupedBarChart.tsx`
- Create: `packages/tally-charts/src/react/charts/GroupedBarChart.test.tsx`
- Modify: `packages/tally-charts/src/react/types.ts` (add `/** Stable key of the point's series, when the chart has several. */ seriesId?: string` to `ChartPoint`)

**Interfaces:**
- Consumes: `groupSlots` (Task 1); `Chart`, `Bars`, `Grid`, `Axis`, `Target`, `Tooltip`, `shared.ts` helpers. Read `BarChart.tsx` and `LineChart.tsx` first and follow their structure (margins, `withTableOptions`, `tooltipContent(tooltip, false)`: rows are the user's data, no wrapping).
- Produces: `export interface BarSeries<D>`, `export type GroupedBarChartProps<D>`, `export function GroupedBarChart<D>(props)`, exactly as spec §2. Internal `GroupedPoints` mark is filled in by Task 3; in this task render the layers, axes, grid and target only.

Decisions the spec leaves to the plan:
- Scales: band `{ type: 'band', field: x, padding }`; linear `{ domain }` where the default domain is `niceDomain(inferLinearDomain([...all series values, target], true), typeof valueAxis === 'number' ? valueAxis : undefined)`.
- Layers: for series `i`, `<Bars data={data} y={getter_i} (x when horizontal) id={compositeId_i} tone={tone_i} fill={(d, j, all) => rowFill(d, j, all) ?? series.fill ?? 'solid'} size={slots.size} align="start" offset={slots.offsets[i]} interactive={false} />`, key `` `${i}:${s.id}` ``. `Bars` skips non-finite values itself; do not pre-filter rows.
- Slots need the band width, which only exists inside `<Chart>`: compute them in a small inner component that reads `useChartContext`, and render the layers from there.
- Margins: vertical `{ top: 24, right: 0, bottom: 28, left: valueAxis === 'none' ? 0 : 40 }`; horizontal `{ top: 8, right: 48, bottom: valueAxis === 'none' ? 8 : 28, left: 96 }`; user `margin` merges over them.
- Vertical: `<Grid ticks>` + `<Axis side="left">` for values, `<Axis side="bottom">` for categories. Horizontal: `<Axis side="bottom">` for values, `<Axis side="left">` for categories; `Grid` only rules a linear `y`, so the inner component draws vertical lines itself at `linearTicks(ctx.x.scale, ticks, String)` with the same `data-ch-part="grid"` / `"grid-line"` attributes.
- Horizontal automatic height (no `height`, no `aspectRatio`): `rows × (n × 16 + (n − 1) × gap + 20) + margin.top + margin.bottom`. Vertical default height 280.
- Dev warnings through a memoized `createWarner()` as in `LineChart`: codes `grouped-series-count` (more than 4 series), `grouped-series-id` (repeated id), `grouped-series-empty`. With an empty `series` render `<Chart>` with `data={[]}` so its `empty` state shows.

- [ ] **Step 1: Write failing tests** (`GroupedBarChart.test.tsx`; copy the render helpers and fixed-width setup from `BarChart.test.tsx`). Data: quarters Q1–Q4 with `north` 42/48/55/61, `south` 35/38/36/44, `west` 18/27/33/41, `forecast` true on Q4.
  - renders 12 `[data-ch-part="bar"]`; within the first group the three bars have increasing `x`, equal widths, and are 4 px apart
  - default tones: `data-ch-tone` of the first group is `accent`, `accent-soft`, `warn`; a fourth and fifth series get `neutral`, `gain`; a sixth `accent`; explicit `tone` wins
  - `fill`: series `fill: 'hatch-fade'` sets `data-ch-fill` on that series' bars; row `fill={(d) => d.forecast ? 'hatch' : undefined}` makes all three Q4 bars `hatch` and leaves the others on the series fill
  - missing value (`south: null` on Q2): 11 bars, and Q2's `west` bar has the same offset from its group start as in Q1 (Review Focus 2)
  - negative and mixed values (`[-5, 10]`, `[-8, -3]`): bars with `data-ch-direction="down"` exist and every bar has `height ≥ 0` (Review Focus 4)
  - `orientation="horizontal"`: bars in a group share `x` and have increasing `y`; `svg` height equals the formula above
  - grid and axes: vertical default renders `[data-ch-part="grid-line"]` and two axes; `grid={false}` and `valueAxis="none"` remove them; horizontal default also renders grid lines, with `x1 === x2`
  - `target={{ value: 50, label: 'Target' }}` renders the target and a domain that contains 50 when all values are below it
  - `domain={[0, 100]}` is used as given
  - dev warnings: 5 series, repeated id, empty series each call `console.warn` once (use the existing warn-spy pattern from `LineChart.test.tsx`); empty series shows the `empty` content
  - a width of 60 px with 4 groups × 3 series renders without throwing and no bar has a negative width (Review Focus 1)
- [ ] **Step 2:** `pnpm --filter tally-charts exec vitest run src/react/charts/GroupedBarChart.test.tsx` → FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Same command → PASS; `pnpm --filter tally-charts test` → all pass; `pnpm lint && pnpm typecheck` → clean.

### Task 3: Points, hit areas, labels, tooltip, data table

**Files:**
- Modify: `packages/tally-charts/src/react/charts/GroupedBarChart.tsx`
- Modify: `packages/tally-charts/src/react/charts/GroupedBarChart.test.tsx`

**Interfaces:**
- Consumes: Task 2's component; `useRegisterPoints`, `computeBars` (call it once per series with `size`/`align: 'start'`/`offset` to get each bar's rect and anchor, the same geometry `Bars` draws), `estimateWidth` from `core/ticks`.
- Produces: internal `GroupedPoints` mark inside the chart. No new exports.

Decisions:
- One `ChartPoint` per drawn bar, registered in visual order (group by group, series order inside): `id` composite, `index` = row index, `datum` = the user's row, `x`/`y` = the bar's anchor, `series: s.label`, `seriesId: s.id`, `label: "<category label>, <formatted value>"`, `segments: [{ value: categoryLabel }, { label: s.label, value: formatted, tone }]`. No `group`.
- Hit slice per bar: `<rect data-ch-part="bar-hit" fill="transparent">` covering the bar's slot along the band axis plus half the gap on each side (the first and last slot extend to the band edge), and the full plot plus margins along the value axis, like `Bars`. `onPointerEnter` → `ctx.setActive(id, 'pointer')`, `onClick` → `ctx.select(point)`, `data-ch-selectable` as in `Bars`.
- React keys of hit slices and labels are `` `${rowIndex}:${seriesIndex}` ``, not the composite id, which can collide when a row id contains `:`.
- Value labels (`valueLabel === 'all'`): `<text data-ch-part="value-label">` at each bar's anchor, placed as `ValueLabel` does (offset 6, below the bar when it points down and fits). Vertical only: if any label's `estimateWidth` exceeds `slots.size`, render no labels at all. Horizontal always renders them.
- Data table: first column as in `BarChart` (`headerOf(x, messages.headerCategory ?? HEADER_CATEGORY)`, value = label or category), then one column per series with `header: s.label` and the formatted value, empty string when the value is not finite.

- [ ] **Step 1: Write failing tests** (same data as Task 2):
  - hovering the second hit slice of Q3 shows a tooltip containing "Q3", "South" and "36"
  - `onSelect` on click receives id `"2:south"` and a point with `seriesId: 'south'`, `series: 'South'`, `datum` equal to the Q3 row; with `id="quarter"` the id is `"Q3:south"`
  - row id `"a:b"` with series `"c"` and row `"a"` with series `"b:c"`: both bars render and are selectable (ids collide by construction; assert no React key warning and that each click reports its own `seriesId`) (Review Focus 3)
  - keyboard: focus the chart, ArrowRight three times lands on Q1 West then Q2 North; the live region text starts with the series label
  - controlled `activeId="2:south"` with `dimInactive`: exactly one bar has `data-ch-active`, the other 11 have `data-ch-dimmed` (Review Focus 5)
  - the bar with a missing value has no hit slice and registers no point; its table cell is empty (Review Focus 2)
  - value labels: 12 `[data-ch-part="value-label"]` at width 584; none at width 200; `valueLabel="none"` renders none; `valueFormat` wins over `format`
  - data table: headers `Quarter`, `North`, `South`, `West`; 4 body rows; `dataTable={{ columns: { North: 'North crew' } }}` renames; `dataTable={false}` removes the table
  - `tooltip={false}` renders no tooltip; a function tooltip receives the user's row as `point.datum`
- [ ] **Step 2:** run the file → FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** file → PASS; `pnpm --filter tally-charts test` → all pass (including `messages-literals.test.ts`, `ssr.node.test.tsx`, `hydration.test.tsx`; add `GroupedBarChart` to the SSR and hydration tests if they list charts by name); `pnpm lint && pnpm typecheck` → clean.

### Task 4: Public export and package gates

**Files:**
- Modify: `packages/tally-charts/src/index.ts` (export `GroupedBarChart`, `GroupedBarChartProps`, `BarSeries` next to `BarChart`)
- Modify: `packages/tally-charts/src/index.test.ts` (export list)
- Modify: `packages/tally-charts/.size-limit.js` (entry `GroupedBarChart`, `import: '{ GroupedBarChart }'`, limit `15 KB`, after `BarChart`)
- Modify: whatever `scripts/treeshake.mjs` derives its fixtures from (read it; it follows the size-limit entries)
- Modify: `packages/tally-charts/api/*` via `api:update`
- Create: `.changeset/grouped-bar-chart.md` (`'tally-charts': minor`; body: one paragraph on `GroupedBarChart`, `BarSeries` and `ChartPoint.seriesId`, with a short usage snippet)

- [ ] **Step 1:** Add the export to `index.test.ts` → `pnpm --filter tally-charts exec vitest run src/index.test.ts` FAILS.
- [ ] **Step 2:** Export, add the size entry, write the changeset.
- [ ] **Step 3:** `pnpm build && pnpm --filter tally-charts api:update`, then inspect `git diff packages/tally-charts/api/tally-charts.api.md`: only the four additions listed in Global Constraints.
- [ ] **Step 4:** Run and expect all green: `pnpm --filter tally-charts test`, `pnpm --filter tally-charts api:check`, `pnpm size`, `pnpm --filter tally-charts check:dev-strip`, `pnpm --filter tally-charts check:dts`, `pnpm --filter tally-charts check:treeshake`, `pnpm lint`, `pnpm typecheck`, `pnpm test:scripts`. Report the measured size of the `GroupedBarChart` entry.

### Task 5: Storybook stories and e2e gates

**Files:**
- Create: `apps/storybook/stories/GroupedBarChart.stories.tsx` (title `Charts/GroupedBarChart`; follow `BarChart.stories.tsx`)
- Modify: `apps/storybook/e2e/stories.ts` and any spec whose story list is separate (`reflow`, `forced-colors`, `contrast`, `touch`: read each and add the new stories where `BarChart`'s are listed)
- Create: baselines under `apps/storybook/e2e/__screenshots__/darwin/`

Stories (ids `charts-groupedbarchart--<name>`): `light`, `dark` (the artboard: jobs by crew, Q4 forecast hatched, West `neutral`, with a `<Legend>` under the chart), `horizontal`, `negative` (mixed signs), `five-series`.

- [ ] **Step 1:** Write the stories; add them to the e2e lists.
- [ ] **Step 2:** `lsof -i :6007` is empty, then `pnpm build && pnpm test:e2e` → the new stories fail only for missing baselines; axe, contrast, reflow at 320 px, forced colors and keyboard specs pass for them. Fix the component (not the gate) if one fails.
- [ ] **Step 3:** Darwin baselines: `pnpm --filter storybook-app exec playwright test --update-snapshots=all`; check `git status` shows only new `charts-groupedbarchart--*.png` files (no changed existing baselines). Look at the light and dark images and compare with the artboard.
- [ ] **Step 4:** Linux baselines: run the docker command from the comment above the `e2e` job in `.github/workflows/ci.yml`. If docker is not available, stop and report it: do not hand-make linux files.
- [ ] **Step 5:** `pnpm test:e2e` → PASS.

### Task 6: Docs page

**Files:**
- Create: `apps/docs/examples/grouped-bar-chart/{jobs-by-crew,forecast-quarter,horizontal,with-legend}.tsx` (each with `export const meta = { id, title, rscSafe } satisfies ExampleMeta`; `rscSafe: false` where `fill` or `tone` is a function)
- Create: `apps/docs/content/grouped-bar-chart.json` (model on `bar-chart.json`: prose, `chart-example` blocks, `props-table` blocks for `GroupedBarChart`; document `BarSeries` and `ChartPoint.seriesId` in prose, the forced-colors limit from spec §4, and that the legend is composed with `<Legend>`)
- Modify: `apps/docs/content/navigation.json` (Charts group, after BarChart: label `GroupedBarChart`, slug `grouped-bar-chart`)
- Modify: `apps/docs/blocks/chart-thumbs.tsx` (new thumb `grouped-bars` in `thumbNames`, classes `ct-*` only) and `apps/docs/content/home.json` (`chart-index` item after BarChart)
- Create: `apps/docs/e2e/grouped-bar-chart.spec.ts` (model on `bar-chart.spec.ts`)
- Modify: `blocks/chart-example.tsx` `NARROW_CHART_HEIGHTS` and the block `height` in the JSON where `e2e/lazy-mount.spec.ts` requires it
- Modify: tests that count pages or slugs (CLAUDE.md mentions 25 slugs and `API coverage: 53/53`; update the numbers where a test or CLAUDE.md states them)
- Modify: baselines of `/` under `apps/docs/e2e/__screenshots__/{darwin,linux}` (the chart index gains a tile)

- [ ] **Step 1:** Write the examples, fixture, navigation entry, thumb and e2e spec.
- [ ] **Step 2:** `pnpm build && pnpm --filter docs test && pnpm --filter docs typecheck && pnpm --filter docs check:content` → PASS, coverage full.
- [ ] **Step 3:** `pnpm --filter docs build`, port 3100 free, `pnpm --filter docs test:e2e` → only the home visual baselines differ; fix anything else (lazy-mount heights, reflow at 320 px, axe).
- [ ] **Step 4:** Refresh home baselines on darwin (command in CLAUDE.md) and on linux with the docker command above the `docs` job in `ci.yml`; same rule as Task 5 if docker is missing. Re-run `pnpm --filter docs test:e2e` → PASS.
- [ ] **Step 5:** Update `CLAUDE.md` numbers that changed and add a `PROGRESS.md` entry for 1.1 GroupedBarChart (what shipped, measured size, anything left open). Do not touch ⛔ maintainer gates.
