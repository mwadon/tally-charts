# DonutChart Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `DonutChart` (one total split into at most five slices of one tone, the total in the centre, a list of the parts beside or under the ring) to `tally-charts` as an additive 1.6.0 change, with stories, e2e gates and a docs page.

**Architecture:** A pure geometry module `src/react/charts/donut-geometry.ts` turns slice values and radii into angles and SVG arc paths; it knows nothing of React. `src/react/charts/DonutChart.tsx` is a high-level chart on `<Chart>` without scales, with width-dependent layout and height through the internal `FittedChart` / `layoutFor`, exactly as `FunnelChart.tsx` does it. One internal mark draws the ring, the centre text, the list and the hit areas, all in the chart's SVG, and registers one point per slice. No change to an existing mark or core module.

**Tech Stack:** React 18/19, TypeScript, vitest + Testing Library, Storybook + Playwright, Next.js docs app, changesets, pnpm.

**Spec:** `docs/superpowers/specs/2026-11-23-tally-charts-1.6-donut-chart-design.md` (read it first; §2 is the exact props type, copy it verbatim; where a prop exists on `FunnelChart` or `ShareBar` with the same meaning, copy that prop's TSDoc). The artboard is `project/Donut.dc.html` of the canvas named in the spec; its numbers are in Global Constraints. `FunnelChart` (commit `0eb1a54`, `git show --stat 0eb1a54`) is the model for every step: same kind of chart, same files touched.

## Global Constraints

- Read `CLAUDE.md` before starting; its commands and conventions apply.
- Implementers do not commit, branch, stash or push: the orchestrator commits after each task. The untracked `cha.png` in the repo root is not yours: leave it. Do not leave timers, monitors, servers or background processes running after you reply.
- Additive only: `api:update` may add `DonutChart`, `DonutChartProps` and the new `ChartMessages` keys, nothing else. Existing charts and marks keep their public behaviour (their tests pass unedited).
- No new user-visible English strings in `src/react/` outside `react/messages.ts`. New keys and fallbacks: `other` (`OTHER = 'Other'`), `ofTotal` (`OF_TOTAL = 'of total'`), `headerPart` (`HEADER_PART = 'Part'`), `headerShare` (`HEADER_SHARE = 'Share'`), read as `messages.other ?? OTHER` etc. `headerValue` exists. If a key with the same English text already exists, reuse it instead of adding one. Percents come from the helpers in `react/ui/share.ts` (largest remainder, `percentText`); do not write a second copy (export what is private there if needed, as the FunnelChart commit did).
- New top-level `createWarner()` / `createContext()` / `memo()` in src are marked `/* @__PURE__ */`; constants are literals. Dev warnings must strip in production (`check:dev-strip`): no destructuring inside `if (DEV && …)`.
- Defaults: `tone` 'accent', `format` 'number', `sort` 'value', `maxSlices` 5 (clamped to 2–5), `diameter` 232, `showTotal` true, `legend` true, `legendValue` 'both', `legendPosition` 'auto', `dataTable` true, `tooltip` true. Chart margins are all 0.
- Ring numbers: ring box `D = min(diameter, chart width)`; outer radius `D / 2 − 16`, inner radius `0.64 × outer` (232 → 100 and 64); 2 px gap between slices (constant width: each side of a slice is trimmed by 1 px, i.e. by `1 / r` radians at radius `r`); no gap for a single slice; a slice is at least 2 px long on the outer edge after trimming, the room taken from the largest slice; start at 12 o'clock, clockwise.
- Centre: total at 28 px / 600, baseline 2 px under the centre when a `centerLabel` is drawn (label baseline 20 px lower), vertically centred alone otherwise; 20 px when wider than `2 × inner − 16`; not drawn when 20 px is still too wide. Width by the estimate in `core/text.ts` (`CHAR_WIDTH`), scaled by font size as `FunnelChart.tsx` does.
- List: rows 40 px; swatch 10 × 10 (rx 2) at the row start, name 20 px after the row start (13 px ink), percent right-aligned at the row end (13 px / 600), value right-aligned 12 px left of the percent column (13 px muted); column widths = the widest text by the estimate; hairline in the grid colour between rows (none after the last); name truncated to what is left less 12 px.
- Layout: right when `legend` and (`legendPosition` 'right', or 'auto' and width ≥ `diameter + 32 + 220`): ring at x 0, list from `D + 32` to the chart width, list block centred vertically on the taller of the two, height `max(D, rows × 40)`. Bottom: ring centred horizontally, list from x 0 to the width starting at `D + 8`, height `D + 8 + rows × 40`. No legend: ring centred, height `D`.
- Slice colour: slices 1–4 use `--ch-seq-5`, `-4`, `-3`, `-2` of the base tone; a fifth slice and every "Other" slice is neutral (`color-mix(in srgb, var(--ch-neutral) var(--_ch-seq-neutral-3), var(--ch-surface))`). Only existing `--ch-*` tokens.
- "Other": id `'other'`, `selectable: false` on its point, name from `messages.other`.
- Point id: `id` accessor or the data index (`resolveIds`). React keys use the data index (`'other'` for that slice).
- Sample data in tests, stories and docs is fictional and in English. Always spell "glokki".
- After any change in `packages/tally-charts/src` run `pnpm build` before `api:check`, `check:dts`, `check:treeshake`, `size` and anything in `apps/docs`.
- Size: `DonutChart` entry ≤ 15 KB gzip; every other entry stays within its limit. If an entry goes over after honest work, do not contort the code: report the measured number.
- Hydration tests render the server markup before installing the `console.error` spy.
- Builds and e2e runs share `dist` and ports 6007 / 3100: never run two at once.

Shared test data ("lines", 8 rows, in this order; `x="line" y="revenue"`):

| line | revenue |
| --- | --- |
| Installs | 773000 |
| Service plans | 442000 |
| Repairs | 294000 |
| Inspections | 184000 |
| Maintenance | 62000 |
| Consulting | 41000 |
| Parts | 28000 |
| Permits | 16000 |

Total 1,840,000. With the default `maxSlices` the slices are Installs 42 %, Service plans 24 %, Repairs 16 %, Inspections 10 %, Other 147,000 = 8 %. "five" is the first four rows plus `{ line: 'Warranty', revenue: 147000 }` (same percents, no "Other"). With `format="currency-compact"` the total reads "$1.84M" and the values "$773K", "$442K", "$294K", "$184K", "$147K" (check the exact strings against `core/format.ts` once and use what it returns). Geometry tests set `width={584}` unless they say otherwise.

## Review Focus

1. **Rows that cannot be a part**: a null / NaN / string / negative value. The row is skipped without a `NaN` attribute, is not a slice or a point, warns `donut-value` once, is not in the total, and still has a table row with empty cells. A zero row: no slice, no warning, in the table with "0%".
2. **Degenerate totals**: one valid row (a full ring: no gap, a path that actually draws 360°, "100%"), all zeros or no valid rows (the empty state, no division by zero), one huge and several tiny parts (every slice ≥ 2 px, angles still sum to 2π, the tiny ones read "<1%").
3. **The "Other" boundary**: exactly `maxSlices` rows (no "Other"), `maxSlices + 1` (two rows grouped), `maxSlices={2}` (one slice + "Other"), `maxSlices` 1, 9 and 2.5 (clamped / floored, warned), a data row already named "Other" (drawn as a normal part; no key or id collision with the grouped slice), `id` accessor returning the string 'other' while a grouped slice exists (dev warning for repeated ids, no crash).
4. **Layout switch**: server and first client render agree at `initialWidth`; a measured narrow width moves the list under the ring without a hydration error; forced positions never switch; a 60 px wide chart draws no negative radius, width or height and no `NaN`.
5. **Long texts**: a 40-character part name is cut with an ellipsis and keeps a `<title>`; a total such as "$1,840,000.00" drops to 20 px and then disappears instead of overflowing the hole; a 40-character `centerLabel` is cut.
6. **Stable registration**: re-rendering with the same props registers the same points (no render loop), with inline `format` and accessor functions.

Each is pinned by a test in the task that owns the code (Tasks 1–3; the 320 px reflow part in Task 5).

---

### Task 1: Donut geometry

**Files:**
- Create: `packages/tally-charts/src/react/charts/donut-geometry.ts`, `donut-geometry.test.ts`

**Interfaces:**
- Produces:

```ts
export interface DonutArc {
  /** Angles in radians from 12 o'clock, clockwise, before the gap is cut. */
  start: number
  end: number
  /** Closed path of the slice around (0, 0), gap already cut. */
  path: string
  /** Point at the middle angle on the middle radius. */
  centroid: [number, number]
}
export function donutGeometry(input: {
  /** All finite and > 0, in ring order. */
  values: readonly number[]
  outer: number
  inner: number
  /** Width of the gap between neighbours in px. */
  gap: number
  /** Minimum length of a slice on the outer edge in px, after the gap. */
  minArc: number
}): DonutArc[]
```

Decisions:
- Span of slice `i` = `value_i / total × 2π`, raised to `(minArc + gap) / outer` when smaller; what was added is subtracted from the largest slice. `start_0 = 0`, `end_last = 2π`.
- Path of a slice: outer arc from `start + gap / 2 / outer` to `end − gap / 2 / outer` (sweep clockwise), line to the inner radius at `end − gap / 2 / inner`, inner arc back to `start + gap / 2 / inner`, close. Large-arc flag when the trimmed span is over π. A point at angle `a`, radius `r` is `(r sin a, −r cos a)`.
- One value: no gap; the path is two half arcs on each radius (a single 360° arc command draws nothing), the inner contour wound the other way so a non-zero fill leaves the hole.
- Numbers rounded to 2 decimals (`round2` from `core/path`). Empty `values`, `outer` ≤ 0 or `inner` ≥ `outer`: finite numbers, no throw (empty array for empty values).

- [ ] **Step 1: Write failing tests**
  - values [773, 442, 294, 184, 147], outer 100, inner 64, gap 2, minArc 2: five arcs; `start` of arc 0 is 0; `end` of arc 0 ≈ 2.6396 (0.001); every `start_i` equals `end_{i−1}`; last `end` ≈ 2π; every path starts with `M`, contains `A100,100` and `A64,64` and ends with `Z`; arc 0's path has the large-arc flag 0 on both arcs (151°), and values [900, 100] give flag 1 on the first slice
  - the first point of arc 0 is at angle 0.01 on the outer radius (`M1,-100` or `M1,-99.99` after rounding: assert by parsing the numbers, tolerance 0.02); centroid of arc 0 lies at radius 82 at the middle angle
  - gap: the distance between the end point of arc 0's outer arc and the start point of arc 1's outer arc is 2 (0.05); the same on the inner radius
  - Review Focus 2: one value → one arc, `start` 0, `end` 2π, the path has four `A` commands and no `NaN`; values [100000, 1, 1] → arcs 1 and 2 span `(2 + 2) / 100` rad, spans sum to 2π
  - empty values → `[]`; `outer: 0` and `inner: 10, outer: 5` → no throw, no `NaN` in any path
- [ ] **Step 2:** `pnpm --filter tally-charts exec vitest run src/react/charts/donut-geometry.test.ts` → FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Same command → PASS; `pnpm lint && pnpm typecheck` → clean.

### Task 2: DonutChart rendering

**Files:**
- Create: `packages/tally-charts/src/react/charts/DonutChart.tsx`, `DonutChart.test.tsx`
- Modify: `packages/tally-charts/src/theme/theme.css` and the tests that enumerate parts or selectors (`theme/surface.test.ts`, `theme/theme.test.ts`), `react/ui/share.ts` only to export a helper

**Interfaces:**
- Consumes: `donutGeometry` (Task 1); `FittedChart` / `layoutFor`, `resolveAccessor`, `resolveIds`, `toNumber`, `truncateLabel`, `CHAR_WIDTH`, `createWarner` exactly as `FunnelChart.tsx` uses them; the percent helpers of `react/ui/share.ts`.
- Produces: `export type DonutChartProps<D>` and `export function DonutChart<D>(props)` exactly as spec §2. This task renders the ring, colours, centre, list and layout. Points, pointer, tooltip, active state, data table and the `ChartMessages` keys are Task 3; accept those props in the type now and use the `OTHER` fallback constant from `messages.ts` (add that one key here).

Decisions the spec leaves to the plan:
- Rows: one internal row per data row `{ datum, index, rowId, name, value, valid }`; `valid` when the value is finite and ≥ 0; a part when also > 0. Slices: parts ordered (`sort`), cut to `maxSlices − 1` + "Other" when there are more than `maxSlices` (the grouped ones are always the smallest by value, ties: later in data order); each slice `{ key, id, name, value, percent, percentText, valueText, level: 5 | 4 | 3 | 2 | 'neutral', row | null }`.
- Layout is decided in `layoutFor(width)` by the Global Constraints rule and returned as `{ margin: zeros, height }`; the mark recomputes the same layout from `ctx.width`.
- Markup inside the plot group: `<g data-ch-part="donut" data-ch-seq-tone={tone} data-ch-layout="right|bottom|none">` containing `<g data-ch-part="donut-ring" transform="translate(cx,cy)">` with one `<path data-ch-part="donut-slice" data-ch-level="5|4|3|2|neutral">` per slice, `<text data-ch-part="donut-total">` (`data-ch-size="small"` at 20 px) and `<text data-ch-part="donut-center-label">`; then `<g data-ch-part="donut-list">` with one `<g data-ch-part="donut-row">` per slice: `<rect data-ch-part="donut-swatch" data-ch-level>`, `<text data-ch-part="donut-name">` (with `<title>` when cut), `<text data-ch-part="donut-value">`, `<text data-ch-part="donut-percent">`, and `<line data-ch-part="donut-rule">` between rows.
- `theme.css`: add `[data-ch-part="donut"]` to the selector list that resolves `--ch-seq-1…5` (so `data-ch-seq-tone` on that group picks the ramp); `donut-slice` / `donut-swatch` fill `var(--ch-seq-N)` by `data-ch-level`, the neutral level by the mix in Global Constraints; `donut-slice` joins the fade-in rule that `funnel-area` joined; text styles as in Global Constraints with existing ink / muted / grid tokens; forced-colors counterparts following what the file does for `bar` (system colour fill, Canvas gap is the page showing through). Prefer joining selector lists over copying declarations.
- Dev warnings through a memoized `createWarner()`: `donut-value` ("DonutChart skipped a row with a missing, non-numeric or negative value."), `donut-max-slices` ("DonutChart maxSlices must be a whole number from 2 to 5; it was clamped.").

- [ ] **Step 1: Write failing tests** (render helpers and fixed-size setup from `FunnelChart.test.tsx`; data: lines; `width={584}`):
  - defaults: `data-ch-layout="right"`, SVG height 232; 5 `donut-slice` paths with levels 5, 4, 3, 2, neutral whose `d` equal `donutGeometry({ values: [773000, 442000, 294000, 184000, 147000], outer: 100, inner: 64, gap: 2, minArc: 2 })`; ring group translated to (116, 116); `data-ch-seq-tone="accent"`, `tone="gain"` changes it
  - list: names Installs, Service plans, Repairs, Inspections, Other in that order; percents 42%, 24%, 16%, 10%, 8%; values "773,000" …; `format="currency-compact"` changes values and the total; `legendValue="percent"` drops the value texts, `"value"` the percents; row `i` is translated to y `16 + i × 40` (list of 200 centred on 232); 4 `donut-rule` lines; swatch levels match the slices; `legend={false}` → no `donut-list`, `data-ch-layout="none"`, ring centred at x 292
  - centre: total "1,840,000" at 28 px with no label (fits: check `data-ch-size` absent); `centerLabel="total revenue"` renders it; `showTotal={false}` renders neither; Review Focus 5: a `format` returning "$1,840,000.00" → `data-ch-size="small"`; one returning a 30-character string → no `donut-total`; a 40-character `centerLabel` is cut with "…" and has a `<title>`
  - ordering: `sort="none"` with data [Repairs, Installs, Inspections] keeps that order and levels 5, 4, 3 follow it; ties keep data order; "five" → no Other, fifth slice "Warranty" neutral; three rows → levels 5, 4, 3
  - Review Focus 3: 6 rows → 4 + Other (sum of the two smallest); `maxSlices={2}` → Installs + Other "58%"; `maxSlices={1}`, `{9}`, `{2.5}` → 2, 5, 2 slices and one `donut-max-slices` warning each; a data row named "Other" among 8 rows renders two rows reading "Other" without a React key warning; `sort="none"` with 8 rows keeps the four largest in data order and "Other" last
  - layout: `width={400}` → `data-ch-layout="bottom"`, ring centred at x 200, list rows start at y 240, height 232 + 8 + 200; `legendPosition="right"` at 400 stays right; `legendPosition="bottom"` at 584 is bottom; `diameter={160}` → outer radius 64 and the auto threshold 412; `width={180}` → ring box 180
  - Review Focus 1: rows with `revenue: null`, `'n/a'`, `-5` are not drawn, no attribute is `NaN`, `donut-value` warns once, percents are of the valid total; a zero row has no slice and no warning
  - Review Focus 2: one row → one slice, "100%", level 5; all zeros → the empty content; empty `data` → the empty content; [1000000, 1, 1] → three slices, the small ones "<1%"
  - Review Focus 4: `width={60}` → no `NaN`, no negative `r`, `width` or `height` anywhere
  - Review Focus 5: a 40-character name at 584 is truncated with "…" and has a `<title>` with the full name
- [ ] **Step 2:** `pnpm --filter tally-charts exec vitest run src/react/charts/DonutChart.test.tsx` → FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Same command → PASS; `pnpm --filter tally-charts test` → all pass (including theme tests); `pnpm lint && pnpm typecheck` → clean.

### Task 3: Points, pointer, tooltip, active state, data table, SSR

**Files:**
- Modify: `DonutChart.tsx`, `DonutChart.test.tsx`, `theme.css` (+ theme tests) for the active state
- Modify: `packages/tally-charts/src/react/messages.ts` (+ `messages.test.tsx`, `messages-literals.test.ts` if it lists constants): the keys of the Global Constraints, as the FunnelChart commit added its four
- Modify: `packages/tally-charts/test/fixtures.tsx` (fixture `RevenueByLine`: lines with `format="currency-compact"` and `centerLabel="total revenue"`; import the component from its source file until Task 4 exports it), `src/ssr.node.test.tsx`, `src/hydration.test.tsx` (model on the `LeadFunnel` cases)

**Interfaces:**
- Consumes: Task 2's component; `useRegisterPoints`, `samePoints`, `Tooltip`, `tooltipContent`, `userCallbacks`, `withTableOptions`, `headerOf` as `FunnelChart.tsx` uses them.
- Produces: internal marks only; `ChartMessages` gains the keys.

Decisions:
- Points: one per slice in ring order: `id` = row id (`'other'` for the grouped slice), `datum` = the wrapped row (for "Other": a wrapped row whose `datum` is `undefined`), `selectable: false` for "Other", anchor at the slice centroid in plot coordinates, `label` = `[name, value text, `${percentText} ${ofTotal}`]` joined with ", ", `segments` = `[{ value: name }, { value: value text }, { value: `${percentText} ${ofTotal}` }]`. The points array is memoized on the values it is built from (Review Focus 6).
- Pointer: each `donut-slice` path and one transparent `<rect data-ch-part="donut-hit">` per list row (the whole row) activate the slice on pointer enter and select on click, with the same handlers `FunnelChart.tsx` puts on `funnel-hit` (including its touch handling).
- Function `tooltip`: called for data slices with the user's row; for "Other" the default pill is shown. Read `overlays/Tooltip.tsx` first: if a `content` function cannot fall back to the default pill, render the same `TooltipPill` from `point.segments` for that point.
- Active state: with `ctx.dimInactive` and an active id, every other `donut-slice` and `donut-swatch` gets `data-ch-dimmed="true"` (the existing rule); the active `donut-row` gets `data-ch-active="true"` (name at weight 600). Texts are never dimmed. Forced colors: active slice `Highlight`.
- Data table: columns part name (header `headerOf(x, messages.headerPart ?? HEADER_PART)`), `headerValue`, `headerShare`; one row per data row in data order; share = that row's whole percent of the total by the same largest-remainder helper over all valid rows; a skipped row has its name and empty cells.

- [ ] **Step 1: Write failing tests** (data: lines, `width={584}`):
  - keyboard: focus announces exactly "1 of 5, Installs, 773,000, 42% of total"; ArrowRight and ArrowDown → "2 of 5, Service plans, 442,000, 24% of total"; ArrowLeft back; End → "5 of 5, Other, 147,000, 8% of total"
  - `messages={{ other: 'Pozostałe', ofTotal: 'całości' }}` through `ChartsProvider` replaces both texts (list row, announcement)
  - hovering the third slice shows a tooltip with "Repairs", "294,000", "16% of total"; hovering the third list row does the same; `tooltip={false}` renders none; a function tooltip receives the user's row as `point.datum` for Repairs and is not called for Other (the default pill with "Other" shows)
  - `onSelect` on click of a slice and of a list row receives the row id and `datum` equal to the user's row; `id="line"` makes the id "Installs"; clicking Other and pressing Enter on it do not call `onSelect`; `onActiveChange` reports `'other'`
  - active state: with `activeId` of the third slice the other four slices and swatches are dimmed and the third row has `data-ch-active`; `dimInactive={false}` dims none; no slice `d` changes with `activeId`
  - Review Focus 1 (points): a skipped row has no point (position total counts slices) but has a table row
  - Review Focus 3: `id={() => 'other'}` style collision warns about repeated ids and does not throw
  - Review Focus 6: registers the same points array again when re-rendered with the same props and inline `format` / accessor functions (model: the test of that name in `FunnelChart.test.tsx`)
  - data table: headers `Line`, `Value`, `Share`; 8 rows in data order; "Maintenance" row "62,000", "3%"; shares sum to 100; `dataTable={{ columns: { Value: 'Revenue' } }}` renames; `dataTable={false}` removes it
  - SSR (`ssr.node.test.tsx`): `RevenueByLine` renders five `donut-slice` paths and the list without a DOM; hydration: no recoverable error, no `console.error`; Review Focus 4: hydrating it server-rendered at `initialWidth={640}` into a 320 px container ends with `data-ch-layout="bottom"` and no hydration error
- [ ] **Step 2:** run the files → FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** files → PASS; `pnpm --filter tally-charts test` → all pass; `pnpm lint && pnpm typecheck` → clean.

### Task 4: Public export and package gates

**Files:**
- Modify: `packages/tally-charts/src/index.ts` (export `DonutChart`, `DonutChartProps`), `src/index.test.ts`, `.size-limit.js` (entry `DonutChart`, limit `15 KB`, after `FunnelChart`), `test/fixtures.tsx` (the fixture imports like the others), the `check:treeshake` fixture list if it is not derived from `.size-limit.js`
- Modify: `packages/tally-charts/api/*` via `api:update`
- Create: `.changeset/donut-chart.md` (`'tally-charts': minor`; one paragraph for library users: what the ring shows, the five-slice limit and "Other", the one-tone steps, the centre total and `centerLabel`, the list and its position, `sort`, the new `ChartMessages` keys, which rows are skipped; a short usage snippet. Every sentence must be true of the code.)
- `git show 0eb1a54 --stat -- packages/tally-charts .changeset` shows how `FunnelChart` did these steps.

- [ ] **Step 1:** Add the exports to `index.test.ts` → `pnpm --filter tally-charts exec vitest run src/index.test.ts` FAILS.
- [ ] **Step 2:** Export, add the size entry, write the changeset.
- [ ] **Step 3:** `pnpm build && pnpm --filter tally-charts api:update`, then inspect `git diff packages/tally-charts/api/tally-charts.api.md`: only `DonutChart`, `DonutChartProps` and the new `ChartMessages` members.
- [ ] **Step 4:** All green: `pnpm --filter tally-charts test`, `api:check`, `pnpm size`, `check:dev-strip`, `check:dts`, `check:treeshake`, `pnpm lint`, `pnpm typecheck`, `pnpm test:scripts`. Report the measured size of `DonutChart` and of any entry within 200 B of its limit.

### Task 5: Storybook stories and e2e gates

**Files** (`git show --stat 0eb1a54 -- apps/storybook` lists how `FunnelChart` did it; mirror it, `touch.spec.ts` included):
- Create: `apps/storybook/stories/DonutChart.stories.tsx` (title `Charts/DonutChart`)
- Modify: `apps/storybook/e2e/stories.ts` (story list, and `THEMELESS` for every story without a `theme` parameter), `stories.spec.ts` (keyboard test asserting exact announcements with `toHaveText`, with the strings the stories' format produces), `forced-colors.spec.ts` (dedicated test with assertions that can fail: every slice has a system-colour fill that differs from the canvas, the active slice differs from the others, list texts are visible; reuse that file's `resolve()` / `isRealColor` helpers), `touch.spec.ts` (tap a slice, as the funnel case)
- Create: baselines under `apps/storybook/e2e/__screenshots__/{darwin,linux}`

Stories (ids `charts-donutchart--<name>`): `light`, `dark` (the artboard: lines, `format="currency-compact"`, `centerLabel="total revenue"`), `few` (three parts), `bottom` (`legendPosition="bottom"`), `plain` (themeless: `x` and `y` only), `many` (the 8 rows plus a ninth, default `maxSlices`, `sort="none"`).

- [ ] **Step 1:** Write the stories; add them to the e2e lists and write the dedicated tests.
- [ ] **Step 2:** `lsof -i :6007` is empty, then `pnpm build && pnpm test:e2e` → the new stories fail only for missing baselines; axe, contrast, reflow at 320 px, forced colors and keyboard pass. If a gate fails and the cause is in `packages/tally-charts/src`, stop and report BLOCKED with the output and diagnosis; do not weaken a gate or change story data to dodge it.
- [ ] **Step 3:** Darwin baselines: `pnpm --filter storybook-app exec playwright test --update-snapshots=all`; `git status` shows only new `charts-donutchart--*.png`. Open the light, dark, bottom and many images and compare with the artboard: a ring of five slices from 12 o'clock clockwise, darkest first, grey last, even 2 px gaps, the total and label centred in the hole, list rows aligned with hairlines between them and nothing clipped or overlapping; in dark the steps are still distinguishable.
- [ ] **Step 4:** Linux baselines: the docker command from the comment above the `e2e` job in `.github/workflows/ci.yml`. If docker is not available, stop and report it.
- [ ] **Step 5:** `pnpm test:e2e` → PASS, and a compare-only docker run.

### Task 6: Docs page

**Files:** as the `FunnelChart` page did it (`git show --stat 0eb1a54 -- apps/docs docs/a11y.md CLAUDE.md PROGRESS.md` lists every file):
- Create: `apps/docs/examples/donut-chart/{revenue-by-line,many-parts,list-below,ring-only}.tsx` (the artboard; nine rows grouped into "Other"; `legendPosition="bottom"`; `legend={false}` beside a `Stat`; all rscSafe unless a function is needed), `apps/docs/content/donut-chart.json` (model on `funnel-chart.json`; every behavioural sentence checked against `DonutChart.tsx`: what a slice is, the order and `sort`, the five-slice limit and "Other", the colour steps and the neutral last slice, the centre total and when it shrinks or hides, the list and when it moves under the ring, skipped and zero rows, keyboard and tooltip content, "Other" and callbacks, the `ChartMessages` fallbacks, what is not built in), `apps/docs/e2e/donut-chart.spec.ts`
- Modify: `content/navigation.json` (after FunnelChart), `blocks/chart-thumbs.tsx` (thumb `donut`: a small ring of four slices), `content/home.json` (tile after FunnelChart; heading "Seventeen charts, one grammar"), tests that count pages, slugs, tiles or symbols, block `height` and `NARROW_CHART_HEIGHTS` (cards have the list on the right at 1280 px and under the ring at 375 px, so every card with a list needs both, measured as `e2e/lazy-mount.spec.ts` requires), the messages docs page if it lists `ChartMessages` keys, `tabTo`'s Tab limit in `e2e/support.ts` if the sidebar outgrows it
- Modify: `docs/a11y.md` (announcement row quoting the Storybook keyboard test's exact string; a note that the list order, not colour alone, identifies a slice), `CLAUDE.md` (counts and pitfalls that changed; a short `donut-chart` page note like the other chart pages), `PROGRESS.md` (section "DonutChart 1.6 (2026-11-23)": what shipped, measured sizes, test counts from your own final runs, open items; do not touch ⛔ maintainer gates)
- Modify: home baselines under `apps/docs/e2e/__screenshots__/{darwin,linux}`

- [ ] **Step 1:** Write the examples, fixture, navigation entry, thumb and e2e spec.
- [ ] **Step 2:** `pnpm build && pnpm --filter docs test && pnpm --filter docs typecheck && pnpm --filter docs check:content` → PASS, coverage full.
- [ ] **Step 3:** `pnpm --filter docs build`, port 3100 free, `pnpm --filter docs test:e2e` → only the home visual baselines differ; fix anything else in `apps/docs`.
- [ ] **Step 4:** Refresh home baselines on darwin (command in CLAUDE.md) and on linux with the docker command above the `docs` job in `ci.yml`. That docker run also rewrites the linux `/docs/line-chart` baselines: restore them with `git checkout -- <those files>`, then run the docker command in compare mode to confirm all pass. Re-run `pnpm --filter docs test:e2e` → PASS.
- [ ] **Step 5:** Update `docs/a11y.md`, `CLAUDE.md`, `PROGRESS.md`.
