# GanttChart Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `GanttChart` (a schedule on a time axis: tasks, groups, milestones, a today line, progress, a baseline and red overruns) to `tally-charts` as an additive 1.7.0 change, with stories, e2e gates and a docs page.

**Architecture:** A pure module `src/react/charts/gantt-geometry.ts` turns times, a scale and widths into rows, bar segments, baselines and columns; it knows nothing of React. `src/react/charts/GanttChart.tsx` is a high-level chart on `<Chart>` with width-dependent layout and height through the internal `FittedChart` / `layoutFor`, exactly as `DonutChart.tsx` and `FunnelChart.tsx` do it. One internal mark draws everything in the chart's SVG and registers one point per row. The time scale, tick labels and hatch patterns are the existing ones; no change to an existing mark or core module.

**Tech Stack:** React 18/19, TypeScript, vitest + Testing Library, Storybook + Playwright, Next.js docs app, changesets, pnpm.

**Spec:** `docs/superpowers/specs/2026-11-23-tally-charts-1.7-gantt-chart-design.md` (read it first; §2 is the exact props type, copy it verbatim; where a prop exists on another chart with the same meaning, copy that prop's TSDoc). The artboards are `project/Main.dc.html` and `project/GanttDark.dc.html` of the canvas named in the spec; where they differ from the spec, the spec wins. `DonutChart` (commit `fe209dd`, `git show --stat fe209dd`) is the model for every step: same kind of chart, same files touched.

## Global Constraints

- Read `CLAUDE.md` before starting; its commands and conventions apply.
- Implementers do not commit, branch, stash or push: the orchestrator commits after each task. The untracked `cha.png` in the repo root is not yours: leave it. Do not leave timers, monitors, servers or background processes running after you reply.
- Additive only: `api:update` may add `GanttChart`, `GanttChartProps` and the new `ChartMessages` keys, nothing else. Existing charts and marks keep their public behaviour (their tests pass unedited).
- No new user-visible English strings in `src/react/` outside `react/messages.ts`. New keys and fallbacks (constant names follow the file's style), read as `messages.today ?? TODAY` etc.:
  - `today` "Today"; `keyDone` "Done", `keyPlanned` "Planned", `keyOverrun` "Overrun", `keyBaseline` "Baseline", `keyMilestone` "Milestone"
  - `statusDone` "done", `statusInProgress` "in progress", `statusPlanned` "planned", `milestone` "milestone", `statusReached` "reached", `statusUpcoming` "upcoming"
  - `percentDone` "{value} done", `overBaseline` "{duration} over baseline", `late` "{duration} late", `early` "{duration} early", `baselineRange` "baseline {range}"
  - `headerStart` "Start", `headerEnd` "End", `headerBaselineStart` "Baseline start", `headerBaselineEnd` "Baseline end", `headerProgress` "Progress", `headerStatus` "Status"; `headerName` and `headerGroup` exist.
  - If a key with the same English text already exists, reuse it instead of adding one.
- New top-level `createWarner()` / `createContext()` / `memo()` in src are marked `/* @__PURE__ */`; constants are literals. Dev warnings must strip in production (`check:dev-strip`): no destructuring inside `if (DEV && …)`.
- Defaults: `zone` 'utc', `tone` 'accent', `labelPosition` 'auto', `valueLabels` true, `legend` true, `dataTable` true, `tooltip` true. Chart margins are all 0.
- Times: every date goes through `toTime` (`core/time.ts`). The chart never reads the clock.
- Day counts: `days = Math.round(ms / DAY)`. Text by `new Intl.NumberFormat(locale, { style: 'unit', unit: 'day', unitDisplay })` with the locale the chart's formatters already use: `'narrow'` in value labels ("5d"), `'long'` elsewhere ("5 days", "1 day"). A task under half a day reads `'<' + format(1)` ("<1d", "<1 day"). An overrun or a milestone slip is shown only when it is at least 1 whole day: "+2d" late, "−2d" (U+2212) early.
- Dates in labels, tooltips and announcements: `createDateFormatter` with `{ month: 'short', day: 'numeric' }` when the domain's start and end are in the same year of `zone`, otherwise the `'day'` preset; the table always uses `'day'`. A range is `"Mar 14 – Mar 21"` (en dash with spaces).
- Vertical numbers (px): key line 24 each (0 without a key); tick label row 28, tick text at tick x + 6; row 32 with names on the left; with names on top 52 (name text in the first 20, then the 32 bar row); heading 32 in both; under the rows 28 more when the now line is drawn (the line runs 6 into it, the text is centred on the line and kept inside the plot).
- Inside a 32 px bar row: bar 14 high at 7 from the top, radius `--ch-radius`; baseline line 3 high at 24 from the top, radius 2; milestone: a square of side 12 turned 45°, 2 px ink outline, centred at 16; its baseline: a square of side 8 turned 45°, 1.5 px neutral outline, no fill; value label 12 px text, 8 px after the bar's end (14 px after a milestone's centre).
- Columns: names left when `labelPosition` is 'left', or 'auto' and the chart width ≥ 480. Label column = widest name or group name (width estimate of `core/text.ts`, `CHAR_WIDTH`) + 12, clamped to 96–220 and to 40% of the width. Gutter (only with `valueLabels`) = widest value label + 8, at most 96 and at most 25% of the width. Plot = what is left. With names on top the label column is 0.
- Ticks: `scale.ticks(Math.max(2, Math.round(plotWidth / 100)))`, labels from `autoTickLabels`, thinned with `thinTicks` as `marks/Axis.tsx` does; a label that would cross the chart's right edge is dropped and its grid line stays. Inferred domain: `niceTimeDomain(inferTimeDomain(all valid starts, ends and baseline dates), zone, tick count)`; the nice domain is computed once from the tick count at the first layout pass of a width (do not loop).
- Fills: the hatch is the library's existing pattern, used as `marks/Bars.tsx` uses it for `fill="hatch"`. The loss text colour is the tone mixed with ink through `--ch-tone-text-mix`, as existing coloured text. Only existing `--ch-*` tokens.
- Point id: `id` accessor or the data index (`resolveIds`). React keys use the data index; headings use `'heading:' + index of the group`.
- Sample data in tests, stories and docs is fictional and in English. Always spell "glokki".
- After any change in `packages/tally-charts/src` run `pnpm build` before `api:check`, `check:dts`, `check:treeshake`, `size` and anything in `apps/docs`.
- Size: `GanttChart` entry ≤ 15 KB gzip; every other entry stays within its limit. If an entry goes over after honest work, do not contort the code: report the measured number and what drives it.
- Hydration tests render the server markup before installing the `console.error` spy.
- Builds and e2e runs share `dist` and ports 6007 / 3100: never run two at once.

Shared test data ("remodel", 13 rows, in this order; `x="name" start="start" end="end" group="phase" baselineStart="plannedStart" baselineEnd="plannedEnd"`, `now="2026-03-27"`; all dates 2026, a missing `end` is a milestone):

| name | phase | start | end | plannedStart | plannedEnd |
| --- | --- | --- | --- | --- | --- |
| Site protection | Prep | 03-02 | 03-04 | 03-02 | 03-04 |
| Demolition | Prep | 03-04 | 03-09 | 03-04 | 03-08 |
| Haul-away | Prep | 03-09 | 03-10 | 03-08 | 03-09 |
| Framing changes | Rough-in | 03-10 | 03-14 | 03-09 | 03-13 |
| Plumbing rough-in | Rough-in | 03-14 | 03-21 | 03-13 | 03-18 |
| Electrical rough-in | Rough-in | 03-16 | 03-21 | 03-15 | 03-20 |
| Rough inspection | Rough-in | 03-23 | — | 03-20 | — |
| Drywall and paint | Rough-in | 03-23 | 03-31 | 03-20 | 03-28 |
| Cabinets | Finishes | 03-31 | 04-05 | 03-28 | 04-02 |
| Countertops | Finishes | 04-05 | 04-08 | 04-02 | 04-05 |
| Tile backsplash | Finishes | 04-08 | 04-12 | 04-05 | 04-09 |
| Fixtures and appliances | Finishes | 04-12 | 04-16 | 04-09 | 04-13 |
| Final walkthrough | Finishes | 04-17 | — | 04-14 | — |

With `now`: rows 1–6 are done, "Drywall and paint" is running at 50%, the last four tasks are planned; "Rough inspection" is reached, "Final walkthrough" is not. Overruns: Demolition 1 day, Plumbing rough-in 2 days. Milestone slips: +3d each. Value labels in row order: "2d", "5d" "+1d", "1d", "4d", "7d" "+2d", "5d", "Mar 23" "+3d", "50%", "5d", "3d", "4d", "4d", "Apr 17" "+3d". Component tests set `width={720}` unless they say otherwise and take expected x positions from the geometry functions and `timeScale`, not from hand-computed pixels.

## Review Focus

1. **Rows that cannot be drawn**: a null / invalid-string `start`, an invalid `end`, an `end` before `start`. The row is skipped without a `NaN` attribute, is not a point, warns `gantt-date` once, does not widen the domain, and still has a table row with empty cells.
2. **Degenerate spans**: a single milestone as the only row (a padded domain, a diamond inside the plot), every row at the same instant, a two-hour task (≥ 2 px wide, "<1d"), a three-year schedule (year or quarter ticks, not hundreds of them), an explicit `domain` that excludes some rows (name kept, no bar, no negative width), a reversed or invalid `domain` (ignored, `gantt-domain`).
3. **Progress and now**: `progress` of `null` on some rows and numbers on others (null rows fall back to `now`), `NaN`, `-1` and `2` (ignored or clamped, `gantt-progress` once), `progress` and `now` together (progress wins), `now` exactly at a start or an end (planned / done), `now` outside the domain (no line, states still follow it), an invalid `now` (`gantt-now`, treated as absent).
4. **Baselines**: half missing, reversed, or invalid (no baseline, `gantt-baseline` once); a baseline longer than the task (no overrun, nothing negative); a baseline wholly outside an explicit domain (not drawn).
5. **Layout**: server and first client render agree at `initialWidth`; a measured narrow width moves names above the bars without a hydration error; forced positions never switch; a 60 px wide chart draws no negative width or height and no `NaN`; a 40-character name is cut with an ellipsis and keeps a `<title>`.
6. **Groups**: rows of one group that are not adjacent in the data are drawn together under one heading; rows with a null group among grouped rows come first without a heading; a group named like a task causes no key warning; repeated ids warn and do not throw.
7. **Stable registration**: re-rendering with the same props registers the same points (no render loop), with inline accessor functions and an inline `domain` array.
8. **Locale and zone**: under `locale="pl-PL"` day counts and dates follow the locale ("7 dni"); with `zone="local"` a task across a DST change still reads whole days.

Each is pinned by a test in the task that owns the code (Tasks 1–4; the 320 px reflow part in Task 6).

---

### Task 1: Gantt geometry

**Files:**
- Create: `packages/tally-charts/src/react/charts/gantt-geometry.ts`, `gantt-geometry.test.ts`

**Interfaces:**
- Produces:

```ts
/** Share of a task that is done, 0–1. `progress` wins over `now`; without either it is 1. */
export function doneShare(
  start: number,
  end: number,
  progress: number | undefined,
  now: number | undefined,
): number

export interface GanttItem {
  start: number
  /** null for a milestone. */
  end: number | null
  /** A valid baseline (end after start for a task), or nulls. A milestone has only the start. */
  baselineStart: number | null
  baselineEnd: number | null
  /** 0–1; for a milestone 1 when reached, else 0. */
  done: number
}
export interface GanttSegment {
  x: number
  width: number
  over: boolean
  fill: 'solid' | 'hatch'
}
export interface GanttMark {
  milestone: boolean
  /** Bar start, or the diamond's centre, in plot px. */
  x: number
  /** 0 for a milestone. */
  width: number
  /** Left to right, touching, covering the bar. Empty for a milestone. */
  segments: GanttSegment[]
  /** Baseline line, or a milestone's baseline centre with width 0. Null when absent or outside the plot. */
  baseline: { x: number; width: number } | null
  /** Overrun in ms (duration minus baseline duration), 0 when none or no baseline. */
  overMs: number
  /** False when the row is wholly outside [0, plotWidth]. */
  visible: boolean
}
export function ganttMark(item: GanttItem, scale: (ms: number) => number, plotWidth: number): GanttMark

export interface GanttEntry {
  /** Index into the `groups` argument for a row; null for a heading. */
  row: number | null
  /** Group name for a heading; null for a row. */
  heading: string | null
  /** Index of the group among headings, for keys; null for a row. */
  groupIndex: number | null
  y: number
  height: number
}
/** Drawn order: ungrouped rows first, then each group (order of first appearance) under a heading. */
export function ganttRows(
  groups: readonly (string | null)[],
  top: boolean,
): { entries: GanttEntry[]; height: number }

export function ganttColumns(input: {
  width: number
  /** Estimated width of the widest name or group name. */
  nameWidth: number
  /** Estimated width of the widest value label; 0 without value labels. */
  valueWidth: number
  position: 'auto' | 'left' | 'top'
}): { top: boolean; plotX: number; plotWidth: number }
```

Decisions:
- `doneShare`: `progress` when finite, clamped to 0–1; else with `now`: 1 when `end ≤ now`, 0 when `start ≥ now`, else `(now − start) / (end − start)`; else 1.
- `ganttMark`, task: raw `x0 = scale(start)`, `x1 = scale(end)`; split points at `x0 + done × (x1 − x0)` (solid before, hatch after) and at `x1 − overPx` (over after), where `overPx = scale(start + overMs) − x0` and `overMs = max(0, (end − start) − (baselineEnd − baselineStart))` with a baseline, else 0. Then clip everything to `[0, plotWidth]` and drop empty segments. A bar whose clipped width is under 2 and that is visible becomes 2 px wide (kept inside the plot) with one segment: solid when `done ≥ 0.5`, over when `overMs > 0`.
- Milestone: `x = scale(start)`, visible when `0 ≤ x ≤ plotWidth`; baseline `{ x: scale(baselineStart), width: 0 }` when inside the plot.
- Task baseline: clipped to the plot, null when wholly outside.
- All numbers through `round2` (`core/path`). Non-finite scale output or `plotWidth ≤ 0`: `visible: false`, empty segments, no `NaN`, no throw.
- `ganttRows`: rows 32 (52 when `top`), headings 32, `y` cumulative from 0. No groups at all (every entry null): no headings.
- `ganttColumns`: the Global Constraints rules. All results ≥ 0.

- [ ] **Step 1: Write failing tests** (scale: `(ms) => (ms − Date.UTC(2026, 2, 1)) / DAY × 10`, `plotWidth` 490, so Mar 1 is 0 and one day is 10 px)
  - `doneShare`: progress 0.4 with a `now` after the end → 0.4; progress 2 → 1, −1 → 0, `NaN` → falls to `now`; `now` at the end → 1, at the start → 0, halfway → 0.5; neither → 1
  - Site protection (done 1): `x` 10, `width` 20, one segment solid, not over, `overMs` 0, baseline `{ x: 10, width: 20 }`
  - Demolition (done 1): `x` 30, `width` 50, segments `[solid 30–70, solid over 70–80]`, `overMs` = 1 day
  - Drywall and paint (done 0.5): `x` 220, `width` 80, segments `[solid 220–260, hatch 260–300]`, baseline `{ x: 190, width: 80 }`
  - a planned task with a 2-day overrun: `[hatch, hatch over]`; a running task whose done share ends inside the overrun: `[solid, solid over, hatch over]`
  - a task that starts late with an equal baseline duration: no over segment; a baseline longer than the task: `overMs` 0 (Review Focus 4)
  - milestone Rough inspection: `milestone` true, `x` 220, `width` 0, no segments, baseline `{ x: 190, width: 0 }`
  - clipping: a task from Feb 20 to Mar 5 → `x` 0, `width` 40; a task wholly before Mar 1 → `visible` false, no segments; a baseline wholly outside → null (Review Focus 2, 4)
  - a two-hour task → `width` 2, one segment (Review Focus 2); a scale returning `NaN`, and `plotWidth` 0 → `visible` false, nothing `NaN`
  - `ganttRows(['Prep', 'Prep', 'Finishes'], false)`: heading Prep y 0, rows 0 and 1 at 32 and 64, heading Finishes 96, row 2 at 128, height 160; `top: true` → rows 52 high
  - Review Focus 6: `['A', 'B', 'A']` → heading A, rows 0 and 2, heading B, row 1; `[null, 'A', null]` → rows 0 and 2 first without a heading, then heading A, row 1; all null → three rows, no heading
  - `ganttColumns`: width 720, nameWidth 161, valueWidth 70, auto → `top` false, `plotX` 173, `plotWidth` 720 − 173 − 78; nameWidth 400 → `plotX` 220; nameWidth 20 → 96; width 479 auto → `top` true, `plotX` 0; `position: 'left'` at 300 → `plotX` 120 (40%); valueWidth 200 at 720 → gutter 96; valueWidth 0 → no gutter; width 60 → nothing negative (Review Focus 5)
- [ ] **Step 2:** `pnpm --filter tally-charts exec vitest run src/react/charts/gantt-geometry.test.ts` → FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Same command → PASS; `pnpm lint && pnpm typecheck` → clean.

### Task 2: GanttChart rows, axis, bars, baselines, milestones, names

**Files:**
- Create: `packages/tally-charts/src/react/charts/GanttChart.tsx`, `GanttChart.test.tsx`
- Modify: `packages/tally-charts/src/theme/theme.css` and the tests that enumerate parts or selectors (`theme/surface.test.ts`, `theme/theme.test.ts`)

**Interfaces:**
- Consumes: Task 1's functions; `FittedChart` / `layoutFor`, `resolveAccessor`, `resolveIds`, `truncateLabel`, `CHAR_WIDTH`, `createWarner` exactly as `DonutChart.tsx` uses them; `toTime`, `inferTimeDomain`, `niceTimeDomain`, `timeScale`, `DAY` (`core/time.ts`); `autoTickLabels` (`core/date.ts`); `thinTicks` (`core/ticks.ts`); the hatch pattern as `marks/Bars.tsx` references it.
- Produces: `export type GanttChartProps<D>` and `export function GanttChart<D>(props)` exactly as spec §2. This task renders rows, headings, names, the time axis, grid, bars, baselines and milestones, and the layout. Value labels, the gutter, the now line and the key are Task 3 (until then `valueWidth` is 0 and `now` only drives states); points, pointer, tooltip, active state, data table and messages are Task 4. Accept all props in the type now.

Decisions the spec leaves to the plan:
- Internal row per data row: `{ datum, index, rowId, name, group, start, end, milestone, baselineStart, baselineEnd, done, valid }`. `valid` when `start` is a time and `end` is absent, equal to the start (milestone) or a later time. Baseline values are kept only when valid (spec §3 Baseline), else null.
- Layout is decided in `layoutFor(width)` from `ganttColumns` and `ganttRows` and returned as `{ margin: zeros, height }`; the mark recomputes the same layout from `ctx.width`.
- Markup inside the plot group: `<g data-ch-part="gantt" data-ch-labels="left|top">` containing `<g data-ch-part="gantt-axis">` (one `<text data-ch-part="gantt-tick">` per labelled tick and one `<line data-ch-part="gantt-grid">` per tick, from the first row's top to the last row's bottom), then per entry in drawn order either `<g data-ch-part="gantt-heading">` (`<text>` and `<line data-ch-part="gantt-heading-rule">` across the plot) or `<g data-ch-part="gantt-row" data-ch-kind="task|milestone" transform="translate(0,y)">` with `<text data-ch-part="gantt-name">` (with `<title>` when cut), then for a task `<g data-ch-part="gantt-bar">` holding one `<rect data-ch-part="gantt-segment" data-ch-tone={tone | 'loss'} data-ch-fill="solid|hatch">` per segment (the bar's corner radius through a clip or by rounding the outer corners only; the junctions are square) and `<rect data-ch-part="gantt-baseline">`; for a milestone `<rect data-ch-part="gantt-milestone-baseline">` and `<rect data-ch-part="gantt-milestone" data-ch-reached="true|false">`, both rotated 45° about their centre.
- `theme.css`: segments get their paint the way `bar` does by `data-ch-tone` and `data-ch-fill`; `gantt-baseline` fill `--ch-neutral`; `gantt-milestone` stroke `--ch-ink`, fill `--ch-ink` when reached and `--ch-surface` when not; text in existing ink / muted tokens (names 13 px ink, headings 13 px / 600, ticks 12 px muted); `gantt-grid` and `gantt-heading-rule` in `--ch-grid`; forced-colors counterparts following what the file does for `bar` (diamonds and lines `CanvasText`). Prefer joining selector lists over copying declarations.
- Dev warnings through a memoized `createWarner()`: `gantt-date` ("GanttChart skipped a row with a missing or invalid start, an invalid end, or an end before its start."), `gantt-baseline` ("GanttChart ignored a baseline that is invalid, half missing or ends before it starts."), `gantt-progress` ("GanttChart progress must be a number from 0 to 1; it was clamped or ignored."), `gantt-now` ("GanttChart ignored an invalid `now`."), `gantt-domain` ("GanttChart ignored a domain that is not two valid dates, start before end.").

- [ ] **Step 1: Write failing tests** (render helpers and fixed-size setup from `DonutChart.test.tsx`; data: remodel; `width={720}`; `valueLabels={false}` and `legend={false}` so later tasks do not move these numbers):
  - defaults: `data-ch-labels="left"`; 13 `gantt-row` groups (11 `task`, 2 `milestone`) and 3 `gantt-heading` groups reading Prep, Rough-in, Finishes in that order; row and heading `y` equal `ganttRows` + 28; SVG height = 28 + `ganttRows` height
  - the name column: `plotX` equals `ganttColumns` for the widest of the names and group names; names in data order within groups
  - bars: for each task, segment `x` / `width` / `data-ch-fill` / `data-ch-tone` equal `ganttMark` with the chart's scale (`timeScale(niceTimeDomain(...), [0, plotWidth], 'utc')`): Site protection one solid accent segment; Demolition a second segment with tone `loss`; Drywall and paint solid then hatch; Cabinets one hatch segment; bar rect y 7, height 14; `tone="gain"` changes the base tone and not the loss one
  - baselines: 11 `gantt-baseline` rects 3 high at y 24 matching `ganttMark`; 2 `gantt-milestone-baseline`; without the baseline accessors none of either
  - milestones: Rough inspection `data-ch-reached="true"`, Final walkthrough `"false"`, centred at the scale's x and y 16
  - states without `now`: every segment solid, both milestones reached; with `progress` accessor returning 0.25 for one row and `undefined` for the rest and no `now`: that bar is solid then hatch, the rest solid
  - axis: tick texts equal `autoTickLabels(scale.ticks(count), { zone: 'utc' })` after thinning, at x = tick + 6; one `gantt-grid` line per tick; `domain={['2026-03-01', '2026-04-26']}` is used as given
  - no groups (`group` omitted): no heading, 13 rows
  - names on top: `width={400}` → `data-ch-labels="top"`, rows 52 high, bar y 27, name left-aligned at x 0; `labelPosition="left"` at 400 stays left; `labelPosition="top"` at 720 is top
  - Review Focus 1: rows with `start: null`, `start: 'soon'`, `end: 'later'` and an end before the start are not drawn, no attribute is `NaN`, `gantt-date` warns once, and the domain is the same as without them
  - Review Focus 2: one milestone alone → one diamond with `0 ≤ x ≤ plotWidth`; three rows at one instant → three diamonds, no `NaN`; a two-hour task → a 2 px bar; a schedule from 2024 to 2027 → fewer than 20 ticks; `domain` excluding Prep rows → their names are drawn and they have no `gantt-bar`; `domain={['2026-04-01', '2026-03-01']}` and `domain={['x', 'y']}` → the inferred domain and one `gantt-domain` warning
  - Review Focus 3: `progress` values `NaN`, `-1`, `2` → no `NaN`, one `gantt-progress` warning; `progress` 0 with `now` after the task's end → a hatch bar; `now` equal to a task's start → hatch, equal to its end → solid; `now="never"` → `gantt-now` once and every bar solid
  - Review Focus 4: rows with only `plannedStart`, with `plannedEnd` before `plannedStart`, with `plannedStart: 'x'` → no baseline for them, one `gantt-baseline` warning, no over segment
  - Review Focus 5: `width={60}` → no `NaN` and no negative `width`, `height`, `x` anywhere; a 40-character name at 720 is cut with "…" and has a `<title>` with the full name
  - Review Focus 6: remodel reordered so Prep rows are not adjacent → still three headings with the same rows under each; two rows with `phase: null` → drawn first, before the first heading; a group named "Demolition" → no React key warning
- [ ] **Step 2:** `pnpm --filter tally-charts exec vitest run src/react/charts/GanttChart.test.tsx` → FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Same command → PASS; `pnpm --filter tally-charts test` → all pass (including theme tests); `pnpm lint && pnpm typecheck` → clean.

### Task 3: Value labels, gutter, now line, key

**Files:**
- Modify: `GanttChart.tsx`, `GanttChart.test.tsx`, `theme.css` (+ theme tests)
- Modify: `packages/tally-charts/src/react/messages.ts` (+ `messages.test.tsx`, `messages-literals.test.ts` if it lists constants): `today` and the five `key*` keys of the Global Constraints

**Interfaces:**
- Consumes: Task 2's component and layout; the locale the chart's existing formatters read (`useFormat()` or what `DonutChart.tsx` uses).
- Produces: internal only. Markup added: per row `<text data-ch-part="gantt-value">` holding the muted text and, when there is one, `<tspan data-ch-part="gantt-over">` (loss text colour, weight 600) or for an early milestone the "−Nd" in the muted text itself; `data-ch-side="right|left"` on the text; `<line data-ch-part="gantt-now">` and `<text data-ch-part="gantt-now-label">`; `<g data-ch-part="gantt-key">` with one `<g data-ch-part="gantt-key-item" data-ch-kind="done|planned|overrun|baseline|milestone">` per item (swatch 18 × 10 drawn like the mark it stands for: a solid rect, a hatch rect, a loss rect, a 18 × 3 neutral line, a reached diamond of side 9; text 13 px muted, 6 px after the swatch; 20 px between items).

Decisions:
- Label text per row, by the Global Constraints rules: task `daysText`; a running task (0 < done < 1) the whole percent of `done` instead; plus `+Nd` when `overMs` rounds to ≥ 1 day; milestone the date, plus `+Nd` / `−Nd` against `baselineStart`.
- The gutter comes from the widest label's estimated width (12 px text: scale `CHAR_WIDTH` by font size as `DonutChart.tsx` does), so `layoutFor` computes the label texts before the columns.
- Side: right of the bar unless the label's estimated end crosses the chart's right edge; then left of the bar's start, right-aligned 8 px before it, unless that would overlap the row's baseline marker or cross x 0 of the plot; then the label is not drawn. Rows that are not visible have no label.
- Now line: when `now` is valid and inside the domain; from the first row's top to 6 px under the last row; under the tick thinning it is unaffected. Label `"{today} · {date}"`, text-anchor middle, its x clamped so the estimated text stays inside the plot. The chart is 28 px taller when the line is drawn.
- Key: the items present, in the order done, planned, overrun, baseline, milestone: done when any segment is solid and not over; planned when any is hatch; overrun when any is over; baseline when any row has a baseline; milestone when any row is one. Drawn when `legend` and at least two items. Items flow left to right from x 0 across the chart width and wrap to a new 24 px line when the next item would cross it; the tick row and everything under it move down by the key's height.
- `theme.css`: styles for the new parts with existing tokens; forced colors as the marks they mirror.

- [ ] **Step 1: Write failing tests** (data: remodel, `width={720}`):
  - label texts in row order equal the list in the shared data ("2d", "5d" + "+1d", …, "Apr 17" + "+3d"); the "+Nd" parts are `gantt-over` tspans
  - a label's x is its bar's end + 8 (milestone: centre + 14), `data-ch-side="right"`; the plot is narrower than in Task 2's tests by `ganttColumns`' gutter for the widest label
  - `valueLabels={false}` → no `gantt-value`, no gutter
  - flipping: with `domain={['2026-03-01', '2026-04-17']}` and `labelPosition="left"` at `width={300}` (gutter capped at 75) the last milestone's label that would cross the edge is on the left or absent, never past the chart width; a row whose flipped label would meet its baseline marker has no label; no label has a negative x
  - a milestone two days early reads "−2d" without a `gantt-over` tspan; a slip of 10 hours shows no slip
  - Review Focus 2: a two-hour task reads "<1d"
  - Review Focus 8: `locale="pl-PL"` through `ChartsProvider` → the Demolition label is what `Intl.NumberFormat('pl-PL', { style: 'unit', unit: 'day', unitDisplay: 'narrow' }).format(5)` returns; `zone="local"` with a task from 2026-03-07T00:00 to 2026-03-09T00:00 local (run the test under `TZ=America/New_York` as the suite's existing zone tests do, or compute the expectation with the same rounding) reads "2d"
  - now line: `gantt-now` at the scale's x for Mar 27, spanning the rows; label "Today · Mar 27"; SVG height 28 more than without `now`; `now="2026-06-01"` (outside) → neither, height unchanged, last four tasks solid; `messages={{ today: 'Dziś' }}` changes the label; a `now` one day after the domain start keeps the label's estimated box inside the plot
  - key: remodel → five items in order done, planned, overrun, baseline, milestone with texts "Done", "Planned", "Overrun", "Baseline", "Milestone"; the axis and rows are 24 px lower than with `legend={false}`; a plain schedule (start and end only, no `now`) → no key; tasks plus one milestone without `now` → two items (done, milestone); `width={300}` → the key wraps to more than one line and the offset is 24 × lines; `messages={{ keyDone: 'Gotowe' }}` changes the text
- [ ] **Step 2:** run the files → FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** files → PASS; `pnpm --filter tally-charts test` → all pass; `pnpm lint && pnpm typecheck` → clean.

### Task 4: Points, pointer, tooltip, active state, data table, SSR

**Files:**
- Modify: `GanttChart.tsx`, `GanttChart.test.tsx`, `theme.css` (+ theme tests) for the active state
- Modify: `packages/tally-charts/src/react/messages.ts` (+ its tests): the remaining keys of the Global Constraints
- Modify: `packages/tally-charts/test/fixtures.tsx` (fixture `RemodelSchedule`: remodel with all accessors and `now`; import the component from its source file until Task 5 exports it), `src/ssr.node.test.tsx`, `src/hydration.test.tsx` (model on the `RevenueByLine` cases)

**Interfaces:**
- Consumes: Task 3's component; `useRegisterPoints`, `samePoints`, `Tooltip`, `tooltipContent`, `userCallbacks`, `withTableOptions`, `headerOf` as `DonutChart.tsx` uses them.
- Produces: internal marks only; `ChartMessages` gains the keys.

Decisions:
- Points: one per valid row in drawn order (`ganttRows` order, headings skipped): `id` = row id, `datum` = the wrapped row, anchor at the bar's middle (the diamond's centre) on the row's bar centre line, in plot coordinates; a row that is not visible anchors at the plot's nearest edge. The points array is memoized on the values it is built from (Review Focus 7).
- Facts of a task, in order: name; the range; the long day count; the status (`statusDone`; `statusInProgress` followed by ", " and the whole percent; `statusPlanned`); `overBaseline` when the overrun is ≥ 1 day. Milestone: name; `milestone`; the date; `statusReached` / `statusUpcoming`; `late` / `early` when the slip is ≥ 1 day. `label` = the facts joined with ", ".
- Tooltip `segments`, task: name; range; long day count; `percentDone` with the whole percent, only for a running task; `overBaseline` when it applies; `baselineRange` with the baseline's range when the row has a baseline. Milestone: name; date; `late` / `early` when it applies.
- Pointer: one transparent `<rect data-ch-part="gantt-hit">` per row over the whole row (label column, plot and gutter; the full row height) activates the row on pointer enter and selects on click, with the handlers `DonutChart.tsx` puts on `donut-hit` (including its touch handling).
- Active state: with `ctx.dimInactive` and an active id, every other row's `gantt-bar`, `gantt-baseline`, `gantt-milestone` and `gantt-milestone-baseline` get `data-ch-dimmed="true"` (the existing rule); the active `gantt-row` gets `data-ch-active="true"` (name at weight 600). Texts are never dimmed. Forced colors: active bar segments and diamond `Highlight`.
- Data table: columns name (`headerOf(x, messages.headerName ?? …)`), group (only with `group`; `headerOf(group, headerGroup)`), `headerStart`, `headerEnd`, `headerBaselineStart` and `headerBaselineEnd` (only when a baseline accessor is given), `headerProgress` (whole percent of `done`; empty for a milestone), `headerStatus` (the status word; a milestone reads `"{milestone}, {reached|upcoming}"`); one row per data row in data order; dates with the `'day'` preset; a skipped row has its name and empty cells.

- [ ] **Step 1: Write failing tests** (data: remodel, `width={720}`):
  - keyboard: focus announces exactly "1 of 13, Site protection, Mar 2 – Mar 4, 2 days, done"; ArrowDown and ArrowRight → "2 of 13, Demolition, Mar 4 – Mar 9, 5 days, done, 1 day over baseline"; ArrowUp back; End → "13 of 13, Final walkthrough, milestone, Apr 17, upcoming, 3 days late"; the eighth point reads "8 of 13, Drywall and paint, Mar 23 – Mar 31, 8 days, in progress, 50%"; the seventh "7 of 13, Rough inspection, milestone, Mar 23, reached, 3 days late"
  - messages through `ChartsProvider` (`statusDone: 'gotowe'`, `overBaseline: '{duration} ponad plan'`) replace the texts in the announcement; `locale="pl-PL"` makes the duration what `Intl.NumberFormat('pl-PL', { style: 'unit', unit: 'day', unitDisplay: 'long' }).format(5)` returns (Review Focus 8)
  - hovering the Plumbing rough-in row (on its name and on its bar) shows a tooltip with "Plumbing rough-in", "Mar 14 – Mar 21", "7 days", "2 days over baseline", "baseline Mar 13 – Mar 18"; Drywall and paint adds "50% done"; `tooltip={false}` renders none; a function tooltip receives the user's row as `point.datum`
  - `onSelect` on click of a row receives the row id and `datum` equal to the user's row; `id="name"` makes the id "Demolition"; headings are not focusable and do not select
  - active state: with `activeId` of the third row the other rows' bars, baselines and diamonds are dimmed and the third row has `data-ch-active`; `dimInactive={false}` dims none; no segment geometry changes with `activeId`
  - Review Focus 1 (points): a skipped row has no point (the position total counts valid rows) but has a table row with its name and empty cells
  - Review Focus 2: a row outside an explicit `domain` is still a point and can be focused without a `NaN` anchor
  - Review Focus 6: two rows with the same `id` value warn about repeated ids and do not throw
  - Review Focus 7: registers the same points array again when re-rendered with the same props, inline accessor functions and an inline `domain` array (model: the test of that name in `DonutChart.test.tsx`)
  - data table: headers `Name`, `Phase`, `Start`, `End`, `Baseline start`, `Baseline end`, `Progress`, `Status`; 13 rows in data order; the Drywall row reads "Mar 23, 2026", "Mar 31, 2026", "Mar 20, 2026", "Mar 28, 2026", "50%", "in progress"; the Final walkthrough row has an empty End and Progress and "milestone, upcoming"; without the baseline accessors and `group` those columns are absent; `dataTable={{ columns: { Start: 'Starts' } }}` renames; `dataTable={false}` removes it
  - SSR (`ssr.node.test.tsx`): `RemodelSchedule` renders 13 rows, the key and the now line without a DOM; hydration: no recoverable error, no `console.error`; Review Focus 5: hydrating it server-rendered at `initialWidth={640}` into a 320 px container ends with `data-ch-labels="top"` and no hydration error
- [ ] **Step 2:** run the files → FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** files → PASS; `pnpm --filter tally-charts test` → all pass; `pnpm lint && pnpm typecheck` → clean.

### Task 5: Public export and package gates

**Files:**
- Modify: `packages/tally-charts/src/index.ts` (export `GanttChart`, `GanttChartProps`), `src/index.test.ts`, `.size-limit.js` (entry `GanttChart`, limit `15 KB`, after `DonutChart`), `test/fixtures.tsx` (the fixture imports like the others), the `check:treeshake` fixture list if it is not derived from `.size-limit.js`
- Modify: `packages/tally-charts/api/*` via `api:update`
- Create: `.changeset/gantt-chart.md` (`'tally-charts': minor`; one paragraph for library users: what the chart shows, tasks and milestones, groups, how `now` and `progress` decide solid and hatched, the baseline and the red overrun, that `end` is an exact instant, value labels, the key, names above the bars in a narrow chart, the new `ChartMessages` keys, which rows are skipped; a short usage snippet. Every sentence must be true of the code.)
- `git show fe209dd --stat -- packages/tally-charts .changeset` shows how `DonutChart` did these steps.

- [ ] **Step 1:** Add the exports to `index.test.ts` → `pnpm --filter tally-charts exec vitest run src/index.test.ts` FAILS.
- [ ] **Step 2:** Export, add the size entry, write the changeset.
- [ ] **Step 3:** `pnpm build && pnpm --filter tally-charts api:update`, then inspect `git diff packages/tally-charts/api/tally-charts.api.md`: only `GanttChart`, `GanttChartProps` and the new `ChartMessages` members.
- [ ] **Step 4:** All green: `pnpm --filter tally-charts test`, `api:check`, `pnpm size`, `check:dev-strip`, `check:dts`, `check:treeshake`, `pnpm lint`, `pnpm typecheck`, `pnpm test:scripts`. Report the measured size of `GanttChart` and of any entry within 200 B of its limit.

### Task 6: Storybook stories and e2e gates

**Files** (`git show --stat fe209dd -- apps/storybook` lists how `DonutChart` did it; mirror it, `touch.spec.ts` included):
- Create: `apps/storybook/stories/GanttChart.stories.tsx` (title `Charts/GanttChart`)
- Modify: `apps/storybook/e2e/stories.ts` (story list, and `THEMELESS` for every story without a `theme` parameter), `stories.spec.ts` (keyboard test asserting exact announcements with `toHaveText`), `forced-colors.spec.ts` (dedicated test with assertions that can fail: every segment has a system-colour fill that differs from the canvas, hatch segments keep a pattern, the active row's bar differs from the others, diamonds and value labels are visible; reuse that file's `resolve()` / `isRealColor` helpers), `touch.spec.ts` (tap a row, as the donut case)
- Create: baselines under `apps/storybook/e2e/__screenshots__/{darwin,linux}`

Stories (ids `charts-ganttchart--<name>`): `light`, `dark` (remodel with all accessors and `now`), `plain` (themeless: `x`, `start`, `end` only, six tasks), `progress` (a `progress` field on each row, no `now`, no baseline), `months` (twelve tasks over a year in three groups with `now`), `narrow` (remodel in a 360 px wide container, names on top).

- [ ] **Step 1:** Write the stories; add them to the e2e lists and write the dedicated tests.
- [ ] **Step 2:** `lsof -i :6007` is empty, then `pnpm build && pnpm test:e2e` → the new stories fail only for missing baselines; axe, contrast, reflow at 320 px, forced colors and keyboard pass. If a gate fails and the cause is in `packages/tally-charts/src`, stop and report BLOCKED with the output and diagnosis; do not weaken a gate or change story data to dodge it.
- [ ] **Step 3:** Darwin baselines: `pnpm --filter storybook-app exec playwright test --update-snapshots=all`; `git status` shows only new `charts-ganttchart--*.png`. Open the light, dark, narrow and months images and compare with the artboard and the spec: group headings with hairlines, solid bars before the today line and hatched after it, the running bar split at the line, red tails on Demolition and Plumbing rough-in, a grey baseline under every bar, filled and hollow diamonds, value labels after the bars with nothing clipped or overlapping, the key above the tick labels, "Today · Mar 27" under the line; in dark the hatch and the solid are clearly different.
- [ ] **Step 4:** Linux baselines: the docker command from the comment above the `e2e` job in `.github/workflows/ci.yml`. If docker is not available, stop and report it.
- [ ] **Step 5:** `pnpm test:e2e` → PASS, and a compare-only docker run.

### Task 7: Docs page

**Files:** as the `DonutChart` page did it (`git show --stat fe209dd -- apps/docs docs/a11y.md CLAUDE.md PROGRESS.md` lists every file):
- Create: `apps/docs/examples/gantt-chart/{schedule-vs-baseline,plain-schedule,progress,year-plan}.tsx` (the artboard's data with all accessors and `now`; start and end only; a `progress` field without `now`; twelve tasks over a year in groups; all rscSafe: field names and literal dates, no functions), `apps/docs/content/gantt-chart.json` (model on `donut-chart.json`; every behavioural sentence checked against `GanttChart.tsx`: what a row is and when it is a milestone, that `end` is an exact instant and a date-only string is UTC midnight, groups and their order, how `now` and `progress` decide solid and hatched, the baseline and what counts as an overrun, value labels, the today line, the key and when it appears, names above the bars under 480 px, skipped rows, keyboard and tooltip content, the `ChartMessages` fallbacks and that day counts follow the locale, week ticks on Sundays, what is not built in), `apps/docs/e2e/gantt-chart.spec.ts`
- Modify: `content/navigation.json` (after DonutChart), `blocks/chart-thumbs.tsx` (thumb `gantt`: four staggered bars, the last hatched, and a vertical line), `content/home.json` (tile after DonutChart; heading "Eighteen charts, one grammar"), tests that count pages, slugs, tiles or symbols, block `height` and `NARROW_CHART_HEIGHTS` (cards have names on the left at 1280 px and on top at 375 px, so every card needs both, measured as `e2e/lazy-mount.spec.ts` requires), the messages docs page if it lists `ChartMessages` keys, `tabTo`'s Tab limit in `e2e/support.ts` if the sidebar outgrows it
- Modify: `docs/a11y.md` (announcement rows quoting the Storybook keyboard test's exact strings; a note that fill, the "+Nd" label and the spoken status, not colour alone, carry done / planned / overrun), `CLAUDE.md` (counts and pitfalls that changed; a short `gantt-chart` page note like the other chart pages), `PROGRESS.md` (section "GanttChart 1.7 (2026-11-23)": what shipped, measured sizes, test counts from your own final runs, open items; do not touch ⛔ maintainer gates)
- Modify: home baselines under `apps/docs/e2e/__screenshots__/{darwin,linux}`

- [ ] **Step 1:** Write the examples, fixture, navigation entry, thumb and e2e spec.
- [ ] **Step 2:** `pnpm build && pnpm --filter docs test && pnpm --filter docs typecheck && pnpm --filter docs check:content` → PASS, coverage full.
- [ ] **Step 3:** `pnpm --filter docs build`, port 3100 free, `pnpm --filter docs test:e2e` → only the home visual baselines differ; fix anything else in `apps/docs`.
- [ ] **Step 4:** Refresh home baselines on darwin (command in CLAUDE.md) and on linux with the docker command above the `docs` job in `ci.yml`. That docker run also rewrites the linux `/docs/line-chart` baselines: restore them with `git checkout -- <those files>`, then run the docker command in compare mode to confirm all pass. Re-run `pnpm --filter docs test:e2e` → PASS.
- [ ] **Step 5:** Update `docs/a11y.md`, `CLAUDE.md`, `PROGRESS.md`.
