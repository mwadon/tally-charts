# FunnelChart Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `FunnelChart` (a smooth ribbon that narrows from step to step, optionally split into series, horizontal or vertical) to `tally-charts` as an additive 1.5.0 change, with stories, e2e gates and a docs page.

**Architecture:** A pure geometry module `src/react/charts/funnel-geometry.ts` turns step values and a plot size into step lines and SVG paths; it knows nothing of React. `src/react/charts/FunnelChart.tsx` is a high-level chart on `<Chart>` without scales (as `WaffleColumns.tsx` uses `<Chart>`), with width-dependent orientation, height and margins through the internal `FittedChart` / `layoutFor` (as `ComparisonBars.tsx`). One internal mark draws guides, ribbon, headers and hit rects and registers one point per step. No change to an existing mark or core module.

**Tech Stack:** React 18/19, TypeScript, vitest + Testing Library, Storybook + Playwright, Next.js docs app, changesets, pnpm.

**Spec:** `docs/superpowers/specs/2026-11-19-tally-charts-1.5-funnel-chart-design.md` (read it first; §2 is the exact props type, copy it verbatim; where a prop exists on `StackedBarChart` or `RankedBars` with the same meaning, copy that prop's TSDoc). The artboards are saved as plain HTML/SVG; Task 1's expected path is taken from them.

## Global Constraints

- Read `CLAUDE.md` before starting; its commands and conventions apply.
- Implementers do not commit, branch, stash or push: the orchestrator commits after each task. The untracked `cha.png` in the repo root is not yours: leave it. Do not leave timers, monitors, servers or background processes running after you reply.
- Additive only: `api:update` may add `FunnelChart`, `FunnelChartProps`, `FunnelSeries` and the new `ChartMessages` keys, nothing else. Existing charts and marks keep their public behaviour (their tests pass unedited). `NearestPointer` gets no new axis.
- No new user-visible English strings in `src/react/` outside `react/messages.ts`. New keys and fallbacks: `headerStep` (`HEADER_STEP = 'Step'`), `headerContinued` (`HEADER_CONTINUED = 'Continued'`), `ofPreviousStep` (`OF_PREVIOUS_STEP = 'of previous step'`), `ofFirstStep` (`OF_FIRST_STEP = 'of first step'`), read as `messages.headerStep ?? HEADER_STEP` etc. `headerValue` and `headerTotal` exist. The "<1%" text and percent formatting reuse what `ShareBar` uses; do not write a second copy.
- New top-level `createWarner()` / `createContext()` / `memo()` in src are marked `/* @__PURE__ */`; constants are literals. Dev warnings must strip in production (`check:dev-strip`): no destructuring inside `if (DEV && …)`.
- Defaults: `tone` 'accent', `format` 'number', `orientation` 'auto', `highlight` 'weakest', `labelWidth` 128, `dataTable` true, `tooltip` true. Horizontal: height 280, margins `{ top: 70, right: 0, bottom: 10, left: 0 }`. Vertical: 64 px per step, margins `{ top: 8, right: 0, bottom: 8, left: labelWidth }`, height = steps × 64 + 16 unless `height` is given. A user `margin` merges over these.
- Ribbon numbers: flat run 20 % of a column, minimum thickness 2 px for a positive step, separator stroke 1 px, guide 1 px (active 1.5 px), guide over the ribbon at 0.45 opacity, header baselines 16 / 33 / 50 px from the figure top, header text 8 px after the step line.
- `'auto'` is vertical when `plot length ÷ steps < 96` or any header value or rate text is wider than its column − 12 (step names never trigger the switch; they are truncated to the column − 12 in horizontal; width by `estimateWidth` in `core/ticks` or the estimate in `core/text.ts`, scaled by font size ÷ the size that estimate assumes).
- Point id: `id` accessor or the data index (`resolveIds`). React keys use the data index.
- Sample data in tests, stories and docs is fictional and in English. Always spell "glokki".
- After any change in `packages/tally-charts/src` run `pnpm build` before `api:check`, `check:dts`, `check:treeshake`, `size` and anything in `apps/docs`.
- Size: `FunnelChart` entry ≤ 15 KB gzip; every other entry stays within its limit. If an entry goes over after honest work, do not contort the code: report the measured number.
- Hydration tests render the server markup before installing the `console.error` spy.
- Builds and e2e runs share `dist` and ports 6007 / 3100: never run two at once.

Shared test data ("steps", 5 rows), in this order:

| step | count | referral | website | ads | other |
| --- | --- | --- | --- | --- | --- |
| Leads | 1240 | 420 | 380 | 300 | 140 |
| Site visits | 806 | 330 | 250 | 150 | 76 |
| Quotes sent | 532 | 250 | 160 | 80 | 42 |
| Quotes accepted | 298 | 170 | 80 | 30 | 18 |
| Jobs paid | 262 | 155 | 68 | 24 | 15 |

Continue rates: 65 %, 66 %, 56 % (weakest), 88 %. Share of the first step: 65 %, 43 %, 24 %, 21 %. One stream: `x="step" y="count"`. Series: `x="step" series={[{ id: 'referral', label: 'Referral', value: 'referral' }, { id: 'website', label: 'Website', value: 'website' }, { id: 'ads', label: 'Ads', value: 'ads' }, { id: 'other', label: 'Other', value: 'other', tone: 'neutral' }]}`. Geometry tests set `width={584}` and `orientation` explicitly; horizontal then has a 584 × 200 plot with columns of 116.8.

## Review Focus

1. **Rows that cannot be a step**: a null / NaN / string / negative value, or one bad series value. The row is skipped without a `NaN` attribute, is not a point, warns `funnel-value` once, the rates of its neighbours are computed across it, and it still has a table row with empty cells.
2. **Zeros**: a zero step in the middle (ribbon closes and reopens, the next step has no rate), a zero first step, all zeros, a series that is zero everywhere: no division by zero, no `NaN`, no stray separator, no "Infinity%".
3. **Few or many steps**: one step (a flat band, no guide, no rate, no highlight), two steps (no highlight), eight steps at 584 px (auto goes vertical) and at 60 px wide (nothing throws, no negative size).
4. **Orientation switch**: server and first client render agree at `initialWidth`; a measured narrow width switches to vertical without a hydration error; forced values never switch; height follows the orientation unless `height` is set.
5. **Long texts**: a 40-character step name is cut with an ellipsis and keeps a `<title>` in forced horizontal and in vertical; a value such as "$1,240,000" makes `'auto'` choose vertical instead of overlapping.
6. **Stable registration**: re-rendering with the same props registers the same points (no render loop), with an inline `series` array and inline format function.

Each is pinned by a test in the task that owns the code (Tasks 1–3; the 320 px reflow part in Task 5).

---

### Task 1: Funnel geometry

**Files:**
- Create: `packages/tally-charts/src/react/charts/funnel-geometry.ts`, `funnel-geometry.test.ts`

**Interfaces:**
- Produces:

```ts
export interface FunnelGeometry {
  /** Position of every step line along the funnel, from 0. */
  lines: number[]
  /** Ribbon edges across the funnel at every step line: [near, far]; equal when the step is zero. */
  extents: [number, number][]
  /** One closed path per layer, in layer order; null for a layer that is zero at every step. */
  paths: (string | null)[]
}
export function funnelGeometry(input: {
  /** values[step][layer], all finite and ≥ 0; one layer for a single stream. */
  values: readonly (readonly number[])[]
  /** Plot size along the funnel. */
  length: number
  /** Plot size across the funnel. */
  thickness: number
  /** false: along = x, across = y. true: along = y, across = x. */
  vertical: boolean
}): FunnelGeometry
```

Decisions:
- `column = length / steps`; `lines[i] = i × column`. Ribbon thickness at step `i` = `total_i / max(total) × thickness`, raised to 2 when `total_i > 0`; centred on `thickness / 2`. Layers share that thickness in proportion to their values, stacked from the near edge in layer order.
- A boundary runs: at `lines[i]` level `b_i`, flat to `lines[i] + 0.2 × column`, then a cubic to `lines[i+1]` with both control points at the midpoint of the remaining run along the funnel, the first level with `b_i`, the second with `b_{i+1}`. The last step runs flat to `length`. A layer path is its near boundary forward and its far boundary backward, closed.
- Numbers rounded to 2 decimals in the path. Every result is finite for `length` or `thickness` of 0 and for all-zero values (paths null).

- [ ] **Step 1: Write failing tests**
  - steps `count`, `length: 584`, `thickness: 200`, horizontal: `lines` = [0, 116.8, 233.6, 350.4, 467.2]; `extents[0]` = [0, 200], `extents[1]` ≈ [35, 165], `extents[4]` ≈ [78.87, 121.13] (0.01); the single path starts `M0,0 H23.36 C70.08,0 70.08,35 116.8,35` and ends with `Z`; it contains `H584` (the last step runs flat to the end)
  - vertical with the same input: the same numbers with x and y swapped (`M0,0 V23.36 C0,70.08 35,70.08 35,116.8`)
  - series values: four paths; the far boundary of layer 0 at step 0 is 420/1240 × 200 ≈ 67.74; layer 3's far boundary equals `extents[i][1]` at every step; layer boundaries are shared (layer k far = layer k+1 near)
  - minimum: values [[1000], [1]] → `extents[1]` is 2 wide; series [[500, 500], [1, 1]] → the two layers are 1 wide each (the minimum is on the ribbon)
  - Review Focus 2: [[10], [0], [5]] → `extents[1]` has zero width, no `NaN` in the path; [[0], [0]] → `paths` = [null]; series [[5, 0], [3, 0]] → `paths[1]` is null
  - Review Focus 3: one step → `lines` = [0], a rectangle path over the whole length; `length: 0` and `thickness: 0` → finite numbers, no throw
- [ ] **Step 2:** `pnpm --filter tally-charts exec vitest run src/react/charts/funnel-geometry.test.ts` → FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Same command → PASS; `pnpm lint && pnpm typecheck` → clean.

### Task 2: FunnelChart rendering

**Files:**
- Create: `packages/tally-charts/src/react/charts/FunnelChart.tsx`, `FunnelChart.test.tsx`
- Modify: `packages/tally-charts/src/theme/theme.css` and the tests that enumerate parts or selectors (`theme/surface.test.ts`, `theme/theme.test.ts`)

**Interfaces:**
- Consumes: `funnelGeometry` (Task 1); `Chart` with `FittedChart` / `layoutFor` as `ComparisonBars.tsx` uses them; `resolveAccessor`, `resolveIds`, `toNumber`, `seriesTones`, `warnSeries` (`bar-series.tsx`), `truncateLabel` (`core/text.ts`, with `<title>` as `RowLabels.tsx`), `toneVar`, the percent / "<1%" helper `ShareBar` uses, how `StackedAreaChart.tsx` draws `area-edge` for `accent-soft`.
- Produces: `export interface FunnelSeries<D>`, `export type FunnelChartProps<D>` and `export function FunnelChart<D>(props)` exactly as spec §2. This task renders guides, ribbon, headers / labels in both orientations and the weakest-step highlight. Points, pointer, tooltip, active state, data table and the `ChartMessages` keys are Task 3; accept those props in the type now.

Decisions the spec leaves to the plan:
- Steps: one internal row per data row `{ datum, index, rowId, name, values, total, valid }`; `valid` when every value is finite and ≥ 0. Drawn steps are the valid rows. `rate_i = total_i / total_{i-1}` over drawn steps, `null` for the first and when the previous total is 0. Weakest = the lowest non-null rate, first on a tie, only with ≥ 3 drawn steps and `highlight="weakest"`.
- Input check: both `y` and `series`, or neither → `funnel-input` warning and the empty state.
- Orientation and size are decided in `layoutFor(width)`: `'auto'` by the Global Constraints rule, using the horizontal plot length.
- Markup inside the plot group, in this order: `<g data-ch-part="funnel-guides">` with one `<line data-ch-part="funnel-guide">` per step except the first (horizontal: from the figure top to the plot bottom; vertical: from the figure left to the plot right); `<path data-ch-part="funnel-area" data-ch-tone>` per non-null layer (series: `data-ch-series` = series id); `area-edge` paths where §3 asks for them; a second set of guide segments over the ribbon only (`data-ch-part="funnel-guide-inner"`, from `extents`); `<g data-ch-part="funnel-step">` per drawn step with `<text data-ch-part="funnel-value">`, `funnel-name`, `funnel-rate` (`data-ch-weakest="true"` on the weakest rate). Root carries `data-ch-orientation="horizontal|vertical"`.
- Vertical label block: name baseline 14 px under the step line, value and rate on the next line 18 px lower, all starting at `x = -labelWidth`; name truncated to `labelWidth − 12`.
- `theme.css`: `funnel-area` joins the fill-by-tone rules of `area` and its fade-in rule; separator stroke `var(--ch-surface)` 1 px with round join when the chart has series; `funnel-guide` uses the grid colour, `funnel-guide-inner` the surface colour at 0.45; `funnel-value` 18 px / 600 ink (13 px in vertical), `funnel-name` the muted axis text style (ink 13 px in vertical), `funnel-rate` 12 px ink, `[data-ch-weakest]` the loss text mix (`--ch-tone-text-mix`) at 600; forced-colors counterparts following what the file does for `bar` and `area`. Only existing `--ch-*` tokens. Prefer joining selector lists over copying declarations.
- Dev warnings through a memoized `createWarner()`: `funnel-value` ("FunnelChart skipped a row with a missing, non-numeric or negative value."), `funnel-input` ("FunnelChart needs either y or series, not both."), plus `warnSeries(series, warn, 'FunnelChart', 'funnel')`.

- [ ] **Step 1: Write failing tests** (render helpers and fixed-size setup from `ComparisonBars.test.tsx` / `StackedBarChart.test.tsx`; data: steps; `width={584}`):
  - horizontal one stream: root `data-ch-orientation="horizontal"`, SVG height 280; one `funnel-area` path with tone `accent` whose `d` equals `funnelGeometry` for a 584 × 200 plot; `tone="gain"` changes the tone; 4 `funnel-guide` lines at x 116.8 … 467.2 and 4 `funnel-guide-inner`
  - headers: values "1,240", "806", "532", "298", "262"; names in data order; rates "65%", "66%", "56%", "88%" and none on the first step; first header at x 0, second at 124.8; `format="currency"` changes the values and not the rates
  - weakest: only "56%" has `data-ch-weakest`; `highlight="none"` → none; a tie marks the first; two steps → none
  - series: 4 `funnel-area` paths with tones accent, accent-soft, warn, neutral (the explicit one) and `data-ch-series` ids; header values are the totals; an `area-edge` exists only when the first or last series is `accent-soft`
  - vertical (`orientation="vertical"`): height 5 × 64 + 16 = 336; guides are horizontal at y 64 … 256; names start at x −128; `labelWidth={160}` moves them and narrows the ribbon; `height={400}` gives steps of (400 − 16) / 5
  - auto: `width={584}` with 5 steps is horizontal; `width={400}` is vertical (80 px per step); Review Focus 3: 8 steps at 584 is vertical; Review Focus 5: `format` returning "$1,240,000" at 584 is vertical; a 40-character step name at 584 stays horizontal (names do not switch); forced `orientation="horizontal"` at 400 stays horizontal and a 40-character name is truncated with "…" and has a `<title>` with the full name; the same name in vertical is truncated with a `<title>`
  - Review Focus 1: rows with `count: null`, `'n/a'`, `-5` are not drawn, no attribute is `NaN`, `funnel-value` warns once; with [1000, null, 500] the second drawn step's rate is "50%"; one bad series value skips the whole row
  - Review Focus 2: [10, 0, 5] → the third step has no rate text and nothing reads "Infinity"; all zeros → no `funnel-area`, headers still drawn; a rate under 0.5 % reads "<1%"
  - Review Focus 3: one step → no guide, no rate, one area; width 60 → no `NaN`, no negative `width` / `height`
  - `y` and `series` together, and neither → empty content and one `funnel-input` warning; empty `data` → empty content; empty `series` → the `warnSeries` warning
- [ ] **Step 2:** `pnpm --filter tally-charts exec vitest run src/react/charts/FunnelChart.test.tsx` → FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Same command → PASS; `pnpm --filter tally-charts test` → all pass (including theme tests); `pnpm lint && pnpm typecheck` → clean.

### Task 3: Points, pointer, tooltip, active state, data table, SSR

**Files:**
- Modify: `FunnelChart.tsx`, `FunnelChart.test.tsx`, `theme.css` (+ theme tests) for the active guide and dimmed headers
- Modify: `packages/tally-charts/src/react/messages.ts` (+ its tests): the four keys of the Global Constraints, following how `headerX` is declared, defaulted and tested
- Modify: `packages/tally-charts/test/fixtures.tsx` (fixtures `LeadFunnel`: one stream; `LeadFunnelBySource`: series; import the component from its source file until Task 4 exports it), `src/ssr.node.test.tsx`, `src/hydration.test.tsx` (model on the `JobMargins` cases)

**Interfaces:**
- Consumes: Task 2's component; `useRegisterPoints`, `Tooltip`, `tooltipContent`, `userCallbacks`, `withTableOptions`, `headerOf`; the private hit-rect pattern of `GroupedBarChart.tsx`.
- Produces: internal marks only; `ChartMessages` gains the four keys.

Decisions:
- Points: one per drawn step in data order, no `group` and no `series`: `id` = row id, `datum` = the wrapped row, anchor at the ribbon's near edge on the step line (horizontal: `x` = line + half the flat run, `y` = near edge; vertical likewise swapped), `label` = `[name, value text, `${rate} ${ofPreviousStep}`, …series parts as `${series label} ${value text}`]` without the missing parts, joined with ", "; `segments` = `[{ value: name }, { value: value text }, { value: `${rate} ${ofPreviousStep}` }, { value: `${share} ${ofFirstStep}` }, …{ label: series label, value: value text, tone }]` without the missing parts (no rate segments on the first step or when the previous / first total is 0). The points array is memoized on the values it is built from (Review Focus 6).
- Pointer: one transparent `<rect data-ch-part="funnel-hit">` per drawn step covering its column (horizontal) or row including the label column (vertical), activating the step on pointer move and selecting on click, as `GroupedBarChart` does.
- Active state: the active step's guide gets `data-ch-active="true"` (ink, 1.5 px, drawn over the ribbon at full opacity); the first step gets a guide element only while active. With `ctx.dimInactive` and an active id, the other `funnel-step` groups get `data-ch-dimmed="true"`. Forced colors: active guide `Highlight`.
- Data table: columns step name (header `headerOf(x, messages.headerStep ?? HEADER_STEP)`), then `headerValue` (one stream) or one column per series label followed by `headerTotal`, then `headerContinued`; one row per data row in data order; a skipped row has its name and empty cells where values are not finite; the first step's rate cell is empty.
- Tooltip: `{tooltip ? <Tooltip content={tooltipContent(tooltip)} /> : null}`; `children` render last.

- [ ] **Step 1: Write failing tests** (data: steps, `width={584}`):
  - keyboard: focus announces exactly "1 of 5, Leads, 1,240"; ArrowRight → "2 of 5, Site visits, 806, 65% of previous step"; End → "5 of 5, Jobs paid, 262, 88% of previous step"; in `orientation="vertical"` ArrowDown moves to the next step and ArrowUp back
  - series announcement: "3 of 5, Quotes sent, 532, 66% of previous step, Referral 250, Website 160, Ads 80, Other 42"
  - `messages={{ ofPreviousStep: 'z poprzedniego kroku' }}` through `ChartsProvider` replaces the text
  - hovering inside the fourth column shows a tooltip with "Quotes accepted", "298", "56% of previous step", "24% of first step"; with series also "Referral" and "170"; hovering the first column shows no rate segments; `tooltip={false}` renders none; a function tooltip receives the user's row as `point.datum`
  - `onSelect` on click receives the row id and `datum` equal to the user's row; `id="step"` makes the id "Leads"
  - active state: with `activeId` of the fourth step, its guide has `data-ch-active` and the other four `funnel-step` groups are dimmed; `dimInactive={false}` dims none; `activeId` of the first step adds a guide at x 0; the `funnel-area` `d` is unchanged by `activeId`
  - Review Focus 1 (points): a skipped row has no point (position total counts drawn steps) but has a table row
  - Review Focus 6: registers the same points array again when re-rendered with the same props, an inline `series` array and an inline `format` (model: the test of that name in `StackedBarChart.test.tsx`)
  - data table: one stream headers `Step`, `Value`, `Continued`, rows in data order, "Quotes accepted" row "298", "56%", first row's last cell empty; series headers `Step`, `Referral`, `Website`, `Ads`, `Other`, `Total`, `Continued`; `dataTable={{ columns: { Value: 'Count' } }}` renames; `dataTable={false}` removes it
  - SSR (`ssr.node.test.tsx`): `LeadFunnel` renders one `funnel-area` without a DOM, `LeadFunnelBySource` four; hydration: no recoverable error, no `console.error`; Review Focus 4: hydrating `LeadFunnel` server-rendered at `initialWidth={640}` into a 320 px container ends vertical with no hydration error
- [ ] **Step 2:** run the files → FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** files → PASS; `pnpm --filter tally-charts test` → all pass; `pnpm lint && pnpm typecheck` → clean.

### Task 4: Public export and package gates

**Files:**
- Modify: `packages/tally-charts/src/index.ts` (export `FunnelChart`, `FunnelChartProps`, `FunnelSeries`), `src/index.test.ts`, `.size-limit.js` (entry `FunnelChart`, limit `15 KB`, after `ScatterChart`), `test/fixtures.tsx` (the two fixtures import like the others), the `check:treeshake` fixture list if it is not derived from `.size-limit.js`
- Modify: `packages/tally-charts/api/*` via `api:update`
- Create: `.changeset/funnel-chart.md` (`'tally-charts': minor`; one paragraph for library users: the ribbon and what its thickness means, `y` or `series`, `orientation` with the auto switch, `labelWidth`, the continue rate and `highlight`, the four new `ChartMessages` keys, which rows are skipped; a short usage snippet. Every sentence must be true of the code.)
- `git show a58b936 --stat -- packages/tally-charts .changeset` shows how `ScatterChart` did these steps.

- [ ] **Step 1:** Add the exports to `index.test.ts` → `pnpm --filter tally-charts exec vitest run src/index.test.ts` FAILS.
- [ ] **Step 2:** Export, add the size entry, write the changeset.
- [ ] **Step 3:** `pnpm build && pnpm --filter tally-charts api:update`, then inspect `git diff packages/tally-charts/api/tally-charts.api.md`: only `FunnelChart`, `FunnelChartProps`, `FunnelSeries` and the four `ChartMessages` members.
- [ ] **Step 4:** All green: `pnpm --filter tally-charts test`, `api:check`, `pnpm size`, `check:dev-strip`, `check:dts`, `check:treeshake`, `pnpm lint`, `pnpm typecheck`, `pnpm test:scripts`. Report the measured size of `FunnelChart` and of any entry within 200 B of its limit.

### Task 5: Storybook stories and e2e gates

**Files** (`git show --stat a58b936 -- apps/storybook` lists how `ScatterChart` did it; mirror it):
- Create: `apps/storybook/stories/FunnelChart.stories.tsx` (title `Charts/FunnelChart`)
- Modify: `apps/storybook/e2e/stories.ts` (story list, and `THEMELESS` for every story without a `theme` parameter), `stories.spec.ts` (keyboard test asserting exact announcements with `toHaveText`: focus → "1 of 5, Leads, 1,240", ArrowRight → the Site visits string of Task 3), `forced-colors.spec.ts` (dedicated test with assertions that can fail: the ribbon and every series layer has a system-colour fill that differs from the canvas, the active guide is visible, header texts are visible; reuse that file's `resolve()` / `isRealColor` helpers)
- Create: baselines under `apps/storybook/e2e/__screenshots__/{darwin,linux}`

Stories (ids `charts-funnelchart--<name>`): `light`, `dark` (artboard A: steps, one stream), `series` (artboard C: the series props with explicit tones `accent`, `accent-soft`, `gain`, `neutral` and a `<Legend>` under the chart), `vertical` (`orientation="vertical"`), `plain` (themeless: `x` and `y` only), `many` (eight steps, so `'auto'` is vertical at the story width).

- [ ] **Step 1:** Write the stories; add them to the e2e lists and write the two dedicated tests.
- [ ] **Step 2:** `lsof -i :6007` is empty, then `pnpm build && pnpm test:e2e` → the new stories fail only for missing baselines; axe, contrast, reflow at 320 px, forced colors and keyboard pass. If a gate fails and the cause is in `packages/tally-charts/src`, stop and report BLOCKED with the output and diagnosis; do not weaken a gate or change story data to dodge it.
- [ ] **Step 3:** Darwin baselines: `pnpm --filter storybook-app exec playwright test --update-snapshots=all`; `git status` shows only new `charts-funnelchart--*.png`. Open the light, dark, series and vertical images and compare with the artboards: a smooth ribbon with a short flat run after every guide, headers not overlapping each other or the ribbon, "56%" in the loss colour, guides faint over the ribbon, the last step reaching the right edge; in vertical the labels left of a downward-narrowing ribbon, nothing clipped.
- [ ] **Step 4:** Linux baselines: the docker command from the comment above the `e2e` job in `.github/workflows/ci.yml`. If docker is not available, stop and report it.
- [ ] **Step 5:** `pnpm test:e2e` → PASS, and a compare-only docker run.

### Task 6: Docs page

**Files:** as the `ScatterChart` page did it (`git show --stat a58b936 -- apps/docs docs/a11y.md CLAUDE.md PROGRESS.md` lists every file):
- Create: `apps/docs/examples/funnel-chart/{lead-to-paid,by-source,vertical,currency}.tsx` (artboard A; series with `Legend` and explicit tones; forced vertical; `format` from a preset; all rscSafe unless a function is needed), `apps/docs/content/funnel-chart.json` (model on `scatter-chart.json`; every behavioural sentence checked against `FunnelChart.tsx`: what the thickness means and that the curve between steps is a transition, the continue rate and "<1%", the weakest step and `highlight`, `y` or `series` and default tones, the auto orientation rule and `labelWidth`, skipped rows, keyboard and tooltip content, the `ChartMessages` fallbacks, what is not built in), `apps/docs/e2e/funnel-chart.spec.ts`
- Modify: `content/navigation.json` (after WaterfallChart / BridgeChart, with the other flow charts), `blocks/chart-thumbs.tsx` (thumb `funnel`: a small narrowing ribbon), `content/home.json` (tile; heading "Sixteen charts, one grammar"), tests that count pages, slugs, tiles or symbols, block `height` and `NARROW_CHART_HEIGHTS` (cards are vertical at 375 px and horizontal at 1280 px, so every funnel card needs both, measured as `e2e/lazy-mount.spec.ts` requires), the i18n / messages docs page if it lists `ChartMessages` keys
- Modify: `docs/a11y.md` (announcement row quoting the Storybook keyboard test's exact string; a note that tone is not the only carrier of the weakest step), `CLAUDE.md` (counts and pitfalls that changed; a short `funnel-chart` page note like the other chart pages), `PROGRESS.md` (section "FunnelChart 1.5 (2026-11-19)": what shipped, measured sizes, test counts from your own final runs, open items; do not touch ⛔ maintainer gates)
- Modify: home baselines under `apps/docs/e2e/__screenshots__/{darwin,linux}`

- [ ] **Step 1:** Write the examples, fixture, navigation entry, thumb and e2e spec.
- [ ] **Step 2:** `pnpm build && pnpm --filter docs test && pnpm --filter docs typecheck && pnpm --filter docs check:content` → PASS, coverage full.
- [ ] **Step 3:** `pnpm --filter docs build`, port 3100 free, `pnpm --filter docs test:e2e` → only the home visual baselines differ; fix anything else in `apps/docs`.
- [ ] **Step 4:** Refresh home baselines on darwin (command in CLAUDE.md) and on linux with the docker command above the `docs` job in `ci.yml`. That docker run also rewrites the linux `/docs/line-chart` baselines: restore them with `git checkout -- <those files>`, then run the docker command in compare mode to confirm all pass. Re-run `pnpm --filter docs test:e2e` → PASS.
- [ ] **Step 5:** Update `docs/a11y.md`, `CLAUDE.md`, `PROGRESS.md`.
