# StackedBarChart Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `StackedBarChart` (series stacked per category, with optional over-target colouring) to `tally-charts` as an additive 1.2.0 change, with stories, e2e gates and a docs page.

**Architecture:** A high-level chart in `src/react/charts/StackedBarChart.tsx` on `<Chart>`, built like `GroupedBarChart.tsx` (read it first; it is the model for structure, margins, axes, table and warnings). Running sums come from a pure helper in `core/bars.ts`. Each series is one decorative `<Bars from interactive={false}>` layer for the part up to the target and, when `target.over` is set, a second layer for the part beyond it. One internal mark (`StackedPoints`, same file) registers a point per segment and draws hit areas and total labels. What both bar charts share lives in `src/react/charts/bar-series.tsx`.

**Tech Stack:** React 18/19, TypeScript, vitest + Testing Library, Storybook + Playwright, Next.js docs app, changesets, pnpm.

**Spec:** `docs/superpowers/specs/2026-11-18-tally-charts-1.2-stacked-bar-chart-design.md` (read it first; §2 is the exact props type, copy it verbatim; where it says "as `GroupedBarChart`", copy that prop's TSDoc from `GroupedBarChart.tsx`).

## Global Constraints

- Read `CLAUDE.md` before starting; its commands and conventions apply.
- Implementers do not commit, branch, stash or push: the orchestrator commits after each task's review. The untracked `cha.png` in the repo root is not yours: leave it.
- Additive only: `api:update` may add `StackedBarChart` and `StackedBarChartProps` and nothing else. `Bars`, `BarChart`, `ValueLabel`, `computeBars` and the public behaviour of `GroupedBarChart` do not change (its tests pass unedited).
- No new user-visible English strings in `src/react/` outside `react/messages.ts`; "Total" comes from the existing `messages.total ?? TOTAL` and `messages.headerTotal ?? HEADER_TOTAL`.
- New top-level `createWarner()` / `createContext()` / `memo()` in src are marked `/* @__PURE__ */`; constants are literals.
- Default tones by series position: `accent`, `accent-soft`, `warn`, `neutral`, `gain`, repeating; never `loss`.
- Defaults: `padding` 0.3, `gap` 2, `valueLabel` 'total', `grid` true, `valueAxis` 'all', `axis` 'all', series `fill` 'solid', `orientation` 'vertical'.
- Segment id: `` `${rowId}:${series.id}` ``; `rowId` defaults to the data index. React keys use indexes, not the composite id.
- Sample data in tests, stories and docs is fictional and in English. Always spell "glokki".
- After any change in `packages/tally-charts/src` run `pnpm build` before `api:check`, `check:dts`, `check:treeshake`, `size` and anything in `apps/docs`.
- Size: `StackedBarChart` entry ≤ 15 KB gzip; `GroupedBarChart` stays ≤ 15 KB; `tally-charts/core` stays ≤ 8 KB.
- Hydration tests render the server markup before installing the `console.error` spy (React 18 warns about `useLayoutEffect` during `renderToString` in jsdom).

Shared test data ("months"): Jan–Jun with `labor` 24/26/27/28/27/29, `materials` 18/20/20/21/19/20, `subcontract` 9/10/11/17/10/20 (totals 51/56/58/66/56/69), target 60.

## Review Focus

1. **A segment boundary exactly on the target** (`from === target` or `to === target`): no zero-length piece, no doubled gap, the segment is wholly on one side.
2. **Missing or zero value in the middle series**: the stack closes up (no hole), no point and no hit area for it, the total leaves it out, the table cell is empty (missing) or shows the formatted zero.
3. **Mixed signs with `over`**: negatives stack down from zero on their own, `over` colours only the positive stack, the label shows the net sum, and its tone follows "positive sum > target".
4. **Segments not longer than the gap, and a 60 px wide chart**: every rect has width and height ≥ 0, a non-zero segment keeps at least 1 px, nothing throws.
5. **Controlled `activeId` naming a segment that is split at the target**: both pieces are active and, with `dimInactive`, every other piece in every layer is dimmed.

Each is pinned by a test in the task that owns the code (Tasks 1–3).

---

### Task 1: Stacking helper in core and the shared bar-series module

**Files:**
- Modify: `packages/tally-charts/src/core/bars.ts`, `packages/tally-charts/src/core/bars.test.ts`
- Create: `packages/tally-charts/src/react/charts/bar-series.tsx`
- Modify: `packages/tally-charts/src/react/charts/GroupedBarChart.tsx`, `packages/tally-charts/src/index.ts` (import path of `BarSeries` only)

**Interfaces:**
- Produces, exported from `core/bars.ts` only (not from `core/index.ts`):
  ```ts
  export interface StackSegment { series: number; value: number; from: number; to: number }
  export interface StackRow { segments: StackSegment[]; total: number; positive: number; negative: number }
  export function stackRow(values: readonly number[]): StackRow
  ```
  `values[k]` is series `k`'s value in one row. Non-finite and zero values produce no segment. Positive values run from the running positive sum upwards, negative values from the running negative sum downwards, both starting at 0. `positive` ≥ 0 and `negative` ≤ 0 are the two sums, `total` their sum.
- Produces, from `bar-series.tsx` (moved out of `GroupedBarChart.tsx` unchanged in behaviour): `interface BarSeries<D>`, `seriesTones(series): Tone[]`, `VerticalGrid({ ticks, chart })` (`chart` is the name passed to `useChartContext`), and `warnSeries(series, warn, chart, prefix)` for the repeated-id and empty-series warnings (`prefix` keeps the existing codes `grouped-series-id` / `grouped-series-empty`; the stacked chart uses `stacked-…`). `index.ts` keeps exporting `BarSeries` under the same name.

- [ ] **Step 1: Write failing tests**, `describe('stackRow')`:
  - `[24, 18, 9]` → segments `0→24`, `24→42`, `42→51` with `series` 0, 1, 2; `total` 51, `positive` 51, `negative` 0
  - `[10, -4, 5, -6]` → `0→10` (0), `0→-4` (1), `10→15` (2), `-4→-10` (3); `positive` 15, `negative` -10, `total` 5
  - `[10, Number.NaN, 0, 5]` → two segments, `0→10` (series 0) and `10→15` (series 3); `total` 15 (Review Focus 2)
  - `[]` and `[Number.NaN]` → no segments, all sums 0
- [ ] **Step 2:** `pnpm --filter tally-charts exec vitest run src/core/bars.test.ts` → FAIL.
- [ ] **Step 3:** Implement `stackRow` with TSDoc; extract `bar-series.tsx` and make `GroupedBarChart.tsx` use it.
- [ ] **Step 4:** `pnpm --filter tally-charts test` → all pass with `GroupedBarChart.test.tsx` unedited. `pnpm build && pnpm --filter tally-charts api:check && pnpm size && pnpm --filter tally-charts check:treeshake` → green, API report unchanged; report the `GroupedBarChart` size. `pnpm lint && pnpm typecheck` → clean.

### Task 2: StackedBarChart rendering

**Files:**
- Create: `packages/tally-charts/src/react/charts/StackedBarChart.tsx`, `StackedBarChart.test.tsx`
- Modify: `packages/tally-charts/src/theme/theme.css` only if the total label's tone colour needs a rule (see below)

**Interfaces:**
- Consumes: `stackRow`, `bar-series.tsx` (Task 1); `Chart`, `Bars`, `Grid`, `Axis`, `Target`, `shared.ts` helpers.
- Produces: `export type StackedBarChartProps<D>` and `export function StackedBarChart<D>(props)` exactly as spec §2. The internal `StackedPoints` mark is Task 3; this task renders layers, axes, grid, target and total labels.

Decisions the spec leaves to the plan:
- Rows are stacked once (`useMemo`) from the series getters: `stackRow(getters.map((g) => toNumber(g(d, i))))`.
- Default domain: `niceDomain(inferLinearDomain([...every row's positive, ...every row's negative, target], true), typeof valueAxis === 'number' ? valueAxis : undefined)`.
- Scales, margins, axes, grid, target line, table wiring, empty-series handling: as `GroupedBarChart`. Horizontal automatic height: `rows × (20 + 20) + margin.top + margin.bottom`.
- Pieces. Per row, each segment becomes one piece, or two when `target.over` is set, the target is > 0 and the segment is positive with `from < target < to` (split at the target). A positive piece lying wholly at or above the target is an "over" piece. Without `over`, nothing is split.
- Gap. Inside `<Chart>` (the linear scale is needed), convert `gap` px to value units. Every piece except the outermost piece of its direction (positive, negative) in its row gives up `gap` px at its far end; a piece whose length is ≤ gap + 1 px keeps 1 px. `gap` that is not finite or negative counts as 0.
- Layers. For series `k`: `<Bars data={data} y={to_k} from={from_k} (x when horizontal) id={compositeId_k} tone={tone_k} fill={row fill ?? series fill ?? 'solid'} interactive={false} />` for its base pieces, where the accessors return `NaN` for a row with no base piece of that series. With `over`: a second `<Bars>` per series for its over pieces with `tone={over}` and `fill="solid"`, same ids. A row whose value is missing (non-finite) must still produce the `Bars` development warning once, as in `GroupedBarChart`; a zero value and a row with only an over piece must not warn. If `Bars` cannot express that with accessors alone, filter each layer's `data` instead and keep the warning in the chart (code `stacked-value`), using the wording `Bars` uses.
- Total labels (`valueLabel === 'total'`): `<text data-ch-part="value-label">` per row with at least one segment, text = `create(valueFormat ?? format)(total)`, centred on the band, 6 px beyond the end of the positive stack (beyond zero when the row has only negatives); horizontal: 6 px right of the positive end, `dominantBaseline="middle"`. Vertical only: if any label is wider than the band (`text.length × 8`), render none. When `over` is set and the row's `positive > target`, the label carries `data-ch-tone={over}` and its colour is the tone mixed with ink through `--ch-tone-text-mix`: reuse the rule `theme.css` already has for toned value labels if there is one, otherwise add one for `[data-ch-part='value-label'][data-ch-tone]` next to the existing value-label rule (and its forced-colors counterpart, if value labels have one).
- Dev warnings through a memoized `createWarner()`: `stacked-series-count` (more than 5 series: "tones repeat from 6"), `stacked-series-id`, `stacked-series-empty` (via `warnSeries`), `stacked-target-over` (`over` with a target ≤ 0; `over` is then ignored).

- [ ] **Step 1: Write failing tests** (copy the render helpers and fixed-width setup from `GroupedBarChart.test.tsx`; data: months):
  - 18 `[data-ch-part="bar"]`; in Jan the three rects share `x` and `width`, sit bottom-up in series order and are 2 px apart; the top of the Jan stack is at the y of 51 on the value scale (the outermost piece gives up nothing)
  - default tones `accent`, `accent-soft`, `warn`; explicit `tone` wins; a sixth series gets `accent`
  - row `fill` over series `fill`, as in the grouped test
  - `target={{ value: 60, over: 'loss' }}`: Apr and Jun each have one extra rect with `data-ch-tone="loss"`; Apr's loss rect spans 60→66 on the value scale and the subcontract rect below it ends 2 px under the target; months under 60 have no loss rect; `target={60}` and `target={{ value: 60 }}` render the line and no loss rect
  - target exactly on a boundary (`target: 45` with a row 24/21/9): two base rects and one whole over rect, no rect with height 0, one 2 px gap at the target (Review Focus 1)
  - missing (`materials: null` in Feb) and zero (`materials: 0` in Mar): Feb and Mar have 2 rects, subcontract starts 2 px above labor, `console.warn` fires for the missing one only (Review Focus 2)
  - mixed signs (`[10, -4, 5, -6]` as four series, `target: { value: 12, over: 'loss' }`): two rects below the baseline, the loss rect spans 12→15, no loss rect below zero, label text is the formatted 5 with `data-ch-tone="loss"` (Review Focus 3)
  - tiny segments (values 50, 0.01, 50 at height 240) and a 60 px wide chart: every rect has `width ≥ 0` and `height ≥ 0`, the 0.01 segment has height ≥ 1 (Review Focus 4)
  - total labels: 6 labels with the formatted totals at width 584; none at width 120; `valueLabel="none"` renders none; `valueFormat` wins over `format`
  - `orientation="horizontal"`: the rects of a row share `y`, run left to right; `svg` height equals the formula; grid lines have `x1 === x2`
  - default domain contains the largest total and the target; `domain={[0, 100]}` is used as given
  - dev warnings: 6 series, repeated id, empty series, `over` with target 0 each warn once; empty series shows the `empty` content
- [ ] **Step 2:** `pnpm --filter tally-charts exec vitest run src/react/charts/StackedBarChart.test.tsx` → FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Same command → PASS; `pnpm --filter tally-charts test` → all pass; `pnpm lint && pnpm typecheck` → clean.

### Task 3: Points, hit areas, tooltip, data table, SSR

**Files:**
- Modify: `StackedBarChart.tsx`, `StackedBarChart.test.tsx`
- Modify: `packages/tally-charts/test/fixtures.tsx` (fixture `MonthlyCost`: months with `target={{ value: 60, over: 'loss' }}`), `src/ssr.node.test.tsx`, `src/hydration.test.tsx` (model on the `CrewQuarters` cases)

**Interfaces:**
- Consumes: Task 2's component and its stacked rows/pieces; `useRegisterPoints`.
- Produces: internal `StackedPoints` mark. No new exports.

Decisions:
- One `ChartPoint` per segment (not per piece), registered row by row, series order inside: `id` composite, `index` = row index, `datum` = the user's row, `x`/`y` = centre of the band at the segment's far end (`to`), `series: s.label`, `seriesId: s.id`, `label: "<category label>, <formatted value>"`, `segments: [{ value: categoryLabel }, { label: s.label, value: formatted, tone }, { label: messages.total ?? TOTAL, value: formatted total }]`.
- Hit area per segment: `<rect data-ch-part="bar-hit" fill="transparent">`. Along the band axis: the extent `Bars` uses for its own hit areas (read `Bars.tsx`). Along the value axis: from the segment's `from` to its `to`, with the boundary between neighbours in the middle of the gap; the outermost positive segment extends to the plot edge plus margin, the outermost negative one to the opposite edge plus margin; when a row has no negative segment its first positive one extends to that edge, and the mirror case likewise. `onPointerEnter`, `onClick`, `data-ch-selectable` as in `GroupedBarChart`.
- Data table: category column as in `GroupedBarChart`, one column per series (empty string when not finite), then a last column with header `messages.headerTotal ?? HEADER_TOTAL` and the formatted row total.

- [ ] **Step 1: Write failing tests** (data: months):
  - hovering Apr's materials hit area shows a tooltip containing "Apr", "Materials", "21", "Total" and "66"
  - click reports id `"3:materials"`, `seriesId: 'materials'`, `series: 'Materials'`, `datum` equal to the Apr row; with `id="month"` the id is `"Apr:materials"`
  - keyboard: focus the chart, ArrowRight four times walks Jan Labor, Jan Materials, Jan Subcontract, Feb Labor (assert each step); the live region text starts with the series label
  - the hit areas of one row tile the full chart height without overlap (sum of heights equals the chart height, sorted rects are contiguous); the same holds for the mixed-sign row
  - controlled `activeId="3:subcontract"` with `target.over` and `dimInactive`: exactly the two pieces of Apr's subcontract have `data-ch-active`, every other bar rect has `data-ch-dimmed` (Review Focus 5)
  - missing and zero values register no point and have no hit area; the table cell is empty for the missing one and shows `0` for the zero (Review Focus 2)
  - data table: headers `Month`, `Labor`, `Materials`, `Subcontract`, `Total`; 6 body rows; Apr's total cell is the formatted 66; `dataTable={{ columns: { Total: 'Cost' } }}` renames; `dataTable={false}` removes the table
  - `tooltip={false}` renders no tooltip; a function tooltip receives the user's row as `point.datum`
  - SSR (`ssr.node.test.tsx`): `MonthlyCost` renders 20 bar rects without a DOM; hydration (`hydration.test.tsx`): no recoverable error, no `console.error`, 20 bar rects before and after
- [ ] **Step 2:** run the files → FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** files → PASS; `pnpm --filter tally-charts test` → all pass; `pnpm lint && pnpm typecheck` → clean.

### Task 4: Public export and package gates

**Files:**
- Modify: `packages/tally-charts/src/index.ts` (export `StackedBarChart`, `StackedBarChartProps` after `GroupedBarChart`), `src/index.test.ts`, `.size-limit.js` (entry `StackedBarChart`, limit `15 KB`, after `GroupedBarChart`; follow how the `GroupedBarChart` entry and its treeshake fixture were added)
- Modify: `packages/tally-charts/api/*` via `api:update`
- Create: `.changeset/stacked-bar-chart.md` (`'tally-charts': minor`; one paragraph on `StackedBarChart` and `target.over`, with a short usage snippet)

- [ ] **Step 1:** Add the export to `index.test.ts` → `pnpm --filter tally-charts exec vitest run src/index.test.ts` FAILS.
- [ ] **Step 2:** Export, add the size entry, write the changeset.
- [ ] **Step 3:** `pnpm build && pnpm --filter tally-charts api:update`, then inspect `git diff packages/tally-charts/api/tally-charts.api.md`: only the two additions.
- [ ] **Step 4:** All green: `pnpm --filter tally-charts test`, `api:check`, `pnpm size`, `check:dev-strip`, `check:dts`, `check:treeshake`, `pnpm lint`, `pnpm typecheck`, `pnpm test:scripts`. Report the measured sizes of the `StackedBarChart` and `GroupedBarChart` entries.

### Task 5: Storybook stories and e2e gates

**Files:**
- Create: `apps/storybook/stories/StackedBarChart.stories.tsx` (title `Charts/StackedBarChart`; follow `GroupedBarChart.stories.tsx`)
- Modify: `apps/storybook/e2e/stories.ts`, `stories.spec.ts` (keyboard test: successive ArrowRight walk Jan Labor → Jan Materials → Jan Subcontract → Feb Labor), `forced-colors.spec.ts` (dedicated test, modelled on the `GroupedBarChart` ones)
- Create: baselines under `apps/storybook/e2e/__screenshots__/{darwin,linux}`

Stories (ids `charts-stackedbarchart--<name>`): `light`, `dark` (the artboard: monthly cost against a $60k budget with `over: 'loss'`, Subcontract `neutral`, a `<Legend>` under the chart that includes an "Over budget" item), `horizontal`, `negative` (mixed signs), `plain` (no target, default tones).

- [ ] **Step 1:** Write the stories; add them to the e2e lists and write the two dedicated tests.
- [ ] **Step 2:** `lsof -i :6007` is empty, then `pnpm build && pnpm test:e2e` → the new stories fail only for missing baselines; axe, contrast, reflow at 320 px, forced colors and keyboard pass. Fix the component (not the gate, and not by changing a story's data to dodge it) if one fails; report any such fix.
- [ ] **Step 3:** Darwin baselines: `pnpm --filter storybook-app exec playwright test --update-snapshots=all`; `git status` shows only new `charts-stackedbarchart--*.png` files. Look at the light and dark images and compare with the artboard (`StackedBars.dc.html` values are in the spec's §1 and this plan's test data).
- [ ] **Step 4:** Linux baselines: the docker command from the comment above the `e2e` job in `.github/workflows/ci.yml`. If docker is not available, stop and report it.
- [ ] **Step 5:** `pnpm test:e2e` → PASS.

### Task 6: Docs page

**Files:** as the `GroupedBarChart` page did it (`git show --stat 0f1460e -- apps/docs docs/a11y.md CLAUDE.md PROGRESS.md` lists every file):
- Create: `apps/docs/examples/stacked-bar-chart/{cost-by-type,over-budget,horizontal,with-legend}.tsx`, `apps/docs/content/stacked-bar-chart.json` (model on `grouped-bar-chart.json`; document `target.over`, diverging negatives, totals, the pointer-target note), `apps/docs/e2e/stacked-bar-chart.spec.ts`
- Modify: `content/navigation.json` (after GroupedBarChart), `blocks/chart-thumbs.tsx` (thumb `stacked-bars`), `content/home.json` (tile after GroupedBarChart; heading "Thirteen charts, one grammar"), tests that count pages, slugs, tiles or symbols, `e2e` specs whose link names now match two pages (`exact: true`), block `height` / `NARROW_CHART_HEIGHTS` where `e2e/lazy-mount.spec.ts` requires it
- Modify: `docs/a11y.md` (announcement row and pointer-target note), `CLAUDE.md` (counts that changed), `PROGRESS.md` (section "StackedBarChart 1.2 (2026-11-18)": what shipped, measured size, open items; do not touch ⛔ maintainer gates)
- Modify: home baselines under `apps/docs/e2e/__screenshots__/{darwin,linux}`

- [ ] **Step 1:** Write the examples, fixture, navigation entry, thumb and e2e spec.
- [ ] **Step 2:** `pnpm build && pnpm --filter docs test && pnpm --filter docs typecheck && pnpm --filter docs check:content` → PASS, coverage full.
- [ ] **Step 3:** `pnpm --filter docs build`, port 3100 free, `pnpm --filter docs test:e2e` → only the home visual baselines differ; fix anything else.
- [ ] **Step 4:** Refresh home baselines on darwin (command in CLAUDE.md) and on linux with the docker command above the `docs` job in `ci.yml`. That docker run also rewrites the linux `/docs/line-chart` baselines: restore them with `git checkout -- <those files>` (a path-limited checkout of files you did not mean to change is allowed), then run the docker command in compare mode to confirm all pass. Re-run `pnpm --filter docs test:e2e` → PASS.
- [ ] **Step 5:** Update `docs/a11y.md`, `CLAUDE.md`, `PROGRESS.md`.
