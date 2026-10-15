# tally-charts 0.7 — RunwayChart

Date: 2026-10-15. Status: approved in brainstorming, pending written review.

Reference: `docs/reference/08-usage-runway.png` ("4 accounts run out before reset").
Parent specs: `2026-10-14-tally-charts-design.md` and `2026-10-14-tally-charts-0.6-design.md`. Everything they require of a chart (themes, a11y, reflow, forced colors, dev warnings, size budgets, API report) applies here unless this document says otherwise.

## 1. Purpose and release

The library must reproduce the reference card as a Storybook reference story, like references 01–07. Only what cannot be composed from existing parts is new:

| Part of the card | How |
|---|---|
| Runway strips (left panel) | **New:** `RunwayChart` component (§3–§6) |
| Forecast numbers | **New:** pure `runwayForecast()` helper in `tally-charts/core` (§2) |
| Burn-up detail chart | Existing `LineChart`/`Chart` marks + **new** `Region fill="hatch"` (§7) |
| "Recent pace" bars | Existing `Bars` (per-item tone) + `Target` |
| Pace / Runs out / Locked stats | Existing `Stat` |
| Forecast / Table toggle | Existing data table pattern |

Release: **0.7.0**, before 1.0, so the new API goes through the 1.0 freeze and appears on the docs site from day one. All changes are additive. No npm publish in 0.7 (that stays in 1.0). One spec, one plan, one branch.

### Success criteria

- `Reference/Usage runway` recreates the reference card in both themes, built only from public API.
- `RunwayChart` passes the same e2e gates as every chart: screenshots (darwin + linux, both themes), axe, contrast, reflow at 320 CSS px, forced colors, keyboard.
- `runwayForecast` reproduces the reference's numbers from its inputs (e.g. 85 % used at 81 % of the window → pace ≈ 1.0× even).
- Size: `RunwayChart` entry ≤ 15 KB; `tally-charts/core` stays ≤ 8 KB; `LineChart` entry stays ≤ 13 KB.
- `api:check`, lint, typecheck, dev-strip pass; the API report gains only additions.

## 2. `runwayForecast` (core)

A pure function, no React, exported from `tally-charts/core` and the root.

```ts
interface RunwayForecastInput {
  /** Share of the allowance used so far, 0–1 (may exceed 1). */
  used: number
  windowStart: TimeInput
  resetAt: TimeInput
  now: TimeInput
  /** Share of the allowance per millisecond. Default: used / (now − windowStart). */
  pace?: number
}

interface RunwayPoint { at: Date; used: number }

interface RunwayForecast {
  /** [now, used] then the straight line at `pace` to resetAt, or to runsOutAt if earlier. */
  projection: RunwayPoint[]
  /** When `used` reaches 1 before resetAt; undefined if it does not. */
  runsOutAt?: Date
  resetAt: Date
  /** Projected share at resetAt, uncapped (0.53 → "~53% at reset"). */
  usedAtReset: number
  /** pace ÷ even pace, where even pace = 1 / (resetAt − windowStart). 1.0 → "1.0x even". */
  paceRatio: number
  /** Share of the window elapsed at now, 0–1. */
  elapsed: number
  /** resetAt − runsOutAt in ms, or 0. */
  lockedMs: number
}
```

Rules:
- `used >= 1` → `runsOutAt = now`, projection is the single point `[now, used]`.
- `pace` 0 (or `now == windowStart` with no `pace`) → no `runsOutAt`, `usedAtReset = used`, `paceRatio` 0.
- `resetAt <= now` → projection `[now, used]`, `usedAtReset = used`, `lockedMs` 0.
- Invalid input (NaN, negative `used` or `pace`, unparseable dates, `windowStart >= resetAt`) → dev warning (`runway-forecast-input`), result with `projection: []`, `usedAtReset` NaN, `paceRatio` NaN, `elapsed` NaN, `lockedMs` 0. Never throws.

The result spreads into a `RunwayRow` (`{ id, label, ...runwayForecast(input) }`); extra fields are ignored by the component.

## 3. `RunwayChart` API

```ts
interface RunwayRow {
  id: string
  label: string
  icon?: ReactNode
  /** Extra description, e.g. "Side project". Not drawn in the strip; shown in the data table and available to a detail panel. */
  sublabel?: string
  /** Projected cumulative use, 0–1, linearly interpolated between points. Absent or empty → no forecast. */
  projection?: readonly { at: TimeInput; used: number }[]
  runsOutAt?: TimeInput
  resetAt?: TimeInput
  /** Muted row; every cell empty. */
  disconnected?: boolean
  /** Replaces the default status text (§3.2). */
  status?: ReactNode
}

interface RunwayChartProps {
  rows: readonly RunwayRow[]
  /** Time span of the strip. */
  domain: readonly [TimeInput, TimeInput]
  now: TimeInput
  /** Cell length: `<number>m|h|d` ('30m', '6h', '1d') or milliseconds. Default '6h'. */
  cell?: string | number
  /** Ascending level edges, as shares. Default [0.25, 0.5, 0.75]: four levels. 1–4 edges. */
  breaks?: readonly number[]
  /** Sequential tone of the levels and the legend swatches. Default 'neutral' (an ancestor --ch-seq-base does not apply; pass `tone`). */
  tone?: Tone
  /** 'auto' stacks rows below the stack width (§4.1). Default 'auto'. */
  layout?: 'auto' | 'columns' | 'stacked'
  /** Width used before the first measurement (SSR). */
  initialWidth?: number
  /** Width of the label column in the columns layout, px. Default 200. */
  labelWidth?: number
  /** Rows become a listbox when set. */
  selectedId?: string | null
  onSelect?: (id: string, row: RunwayRow) => void
  activeId?: string | null
  onActiveChange?: (id: string | null, row: RunwayRow | null) => void
  /** Custom status per row; overrides the default but not a row's own `status`. */
  status?: (row: RunwayRow, facts: RunwayFacts) => ReactNode
  /** Built-in legend under the rows. Default true. */
  legend?: boolean
  title?: string
  description?: string
  dataTable?: boolean | DataTableOptions
  empty?: ReactNode
  className?: string
  style?: CSSProperties
  chartId?: string
  /** Time zone of labels and day boundaries. Default 'utc', like the time scale. */
  timeZone?: TimeZone
}

/** What the component derived for a row; passed to `status`. */
interface RunwayFacts {
  runsOutAt?: Date
  resetAt?: Date
  /** Projection at resetAt (uncapped), or NaN with no forecast. */
  usedAtReset: number
  /** True when runsOutAt / resetAt fall after the domain end. */
  runsOutBeyond: boolean
  resetBeyond: boolean
  forecast: boolean
}
```

Name and shape follow the existing charts (`Heatmap`: `selectedId`-style control, `title`, `description`, `empty`, `chartId`; `ComparisonBars`: `layout`, `initialWidth`, `labelWidth`). Exact prop names are checked against the 0.6 API audit conventions in the plan; the audit wins on conflict.

### 3.1 Cell model

Cells are consecutive intervals of length `cell` from `domain[0]`; the last cell is cut at `domain[1]`. A cell's state is decided at its **midpoint** `m`:

| Condition (first match) | State |
|---|---|
| row `disconnected`, or no usable projection | `empty` |
| `resetAt` defined and `m >= resetAt` | `empty` ("new window, no forecast") |
| the cell contains `runsOutAt` | `runs-out` |
| `runsOutAt` defined and `m > runsOutAt` | `locked` |
| otherwise | `level-1` … `level-N` from the projection at `m` against `breaks` |

The projection at `m` is linearly interpolated; before the first point it takes the first point's value, after the last point the last value. The level is `1 + number of breaks <= value`, capped at `breaks.length + 1`.

The classification is a pure function in core (`runwayCells(row, domain, cellMs, breaks)`), internal (not exported), unit-tested without React.

Marks drawn at exact times, not cell edges: the "Now" line, the reset tick, the runs-out dot. Times outside the domain are not drawn.

### 3.2 Default status

Two lines, English, with dates formatted in `timeZone`:

| Case | Line 1 | Line 2 |
|---|---|---|
| `runsOutAt` | `Runs out <date>` | `Resets <date>` |
| forecast, no `runsOutAt` | `~53% at reset` (from `usedAtReset`, rounded) | `Resets <date>` |
| no forecast, not disconnected | `No forecast` | `Resets <date>` if known |
| disconnected | `Disconnected` | — |

`<date>`: within 6 days of `now` → `Fri 03:24`; later but inside the domain → `Oct 21 09:21`; after the domain → `Oct 24`, and line 2 gets a trailing ` →`. A row's `status` replaces both lines; the `status` prop replaces the default for rows without their own. Built-in strings stay English; an i18n hook is a 1.x item.

## 4. Rendering and layout

### 4.1 Layout

An HTML CSS grid, three columns in the columns layout: label (`labelWidth`), strip (`1fr`), status (`max-content`, min 9rem).

- Header row: empty, the axis SVG, empty. The axis shows day names at day starts in `timeZone`, thinned by the existing time-tick fitting, plus a "Now" label above the now line.
- Row: icon + label (ellipsis, full text in `title`), strip SVG, two-line status.
- Stacked layout (`layout='stacked'`, or `'auto'` when the strip column would be under 240 px): label and status share the first line, the strip spans the full width below. The axis keeps its own full-width row.

Width is measured once for the strip column with a ResizeObserver and shared by all rows and the axis (the `ComparisonBars` pattern). `initialWidth` renders before measurement and on the server.

### 4.2 Strip

One SVG per row, height 32 px, `aria-hidden`. Cells have a 2 px gap (1 px when a cell is under 6 px wide) and 2 px radius. Paint order:

1. cells by state: levels as `--ch-seq-1…N`; `empty` as an unfilled cell with a dashed `--ch-grid`-colored outline; `runs-out` as the soft `loss` fill; `locked` as the existing `hatch` pattern in `loss`
2. the now line: dashed, `--ch-ink-muted`, through every row's strip at `now`
3. the reset tick: 2 px `--ch-ink`, full strip height, at `resetAt`
4. the runs-out dot: radius 5, `loss` fill with a surface-colored 2 px ring, at `runsOutAt`
5. the "reset" label: right of the tick if it fits before the domain end, else omitted (the status says it anyway); never left, where it would sit on hatched cells; `--ch-ink-muted` text with a surface-coloured halo, 4.5:1 against the surface

Hatch patterns come from `PatternDefs`, rendered once in a hidden SVG at the chart root with ids prefixed by the chart id (the chart is not inside `<Chart>`).

### 4.3 Theme

Only existing tokens. New rules go in `theme.css` before the forced-colors block (enforced by the existing test). Parts (`data-ch-part`): `runway`, `runway-axis`, `runway-now-label`, `runway-rows`, `runway-row`, `runway-label`, `runway-icon`, `runway-name`, `runway-strip`, `runway-cell`, `runway-now`, `runway-reset`, `runway-reset-label`, `runway-dot`, `runway-status`, `runway-status-line`; the axis day labels reuse `axis-label` and the legend reuses the `legend` parts. Classes `ch-runway-*`. Cells carry the new state attribute `data-ch-state` (`level`, `runs-out`, `locked`, `empty`) and, for levels, the existing `data-ch-level` (1…N). Rows use `aria-selected` for selection, the existing `data-ch-active` for hover/focus and `data-ch-muted` for disconnected.

- Levels: `tone` (default `neutral`) is always written as `data-ch-seq-tone`, which picks that tone's base and level shares.
- Selected row: the same background as other charts' highlighted item; active (hover/focus) row: the hover background; focus ring on the focused row per the 0.6b focus rules.
- Disconnected row: label, icon and strip in the muted text colour, with no extra opacity (4.5:1).
- Forced colors: cell outlines `CanvasText`; levels by fill opacity steps of `CanvasText`; locked hatch stays visible in `CanvasText`; runs-out dot `Highlight`; selected row a dashed `CanvasText` outline and keyboard focus a solid `Highlight` outline (Heatmap's convention); now line and reset tick `CanvasText`.

### 4.4 Legend

Built in, under the rows, off with `legend={false}`. Items: "Projected use" with N swatches and "under 25, 50, 75, 100%" (from `breaks`, as percentages), "Runs out", "Locked until reset", "Reset", "New window, no forecast". Uses the existing `Legend` component where it fits; any missing swatch kind is added as an internal marker, not new public API.

## 5. Accessibility and interaction

- With `onSelect`: the rows container is `role="listbox"` named by `title` (`aria-labelledby`) and described by `description`; each row is `role="option"` with `aria-selected`. Without `onSelect`: `role="list"` / `role="listitem"`, no tab stop.
- Each row's accessible name joins its label and status via `aria-labelledby` ("Pro plan, Runs out Fri 03:24, Resets Fri 11:22"); works for custom ReactNode status.
- Strips, axis and legend swatches are `aria-hidden`; the legend text stays readable. Per-cell detail lives in the data table.
- Missing `title`: dev warning, as `Chart` does.
- Keyboard (listbox): one tab stop on the container with `aria-activedescendant`; Up/Down, Home/End, PageUp/PageDown (5 rows); Enter and Space select; keys with Alt/Ctrl/Meta pass through; visible focus ring on the active row. Focus/hover drive `activeId`/`onActiveChange`.
- Pointer: click selects; hover sets active. No per-cell tooltips in 0.7.
- `dataTable`: one row per entity — label, sublabel, Runs out, Resets, Projected at reset (`usedAtReset` as %), Status (the row's `status` when it is a string, otherwise the default status text).
- Non-text contrast: levels are supplementary; the information is in the status text and the table. The runs-out dot, reset tick and empty-cell outlines meet 3:1 against the surface in both themes.

### 5.1 Bad input (dev warning, safe output, never throws)

| Input | Behaviour | Warning key |
|---|---|---|
| reversed or invalid `domain`, or bad `now` | render `empty` | `runway-domain` |
| more than 200 cells | cut to the first 200 | `runway-cells` |
| invalid `cell` | default '6h' | `runway-cell` |
| unsorted `projection` | sorted | `runway-projection` |
| projection point with NaN/negative `used` or bad `at` | point dropped | `runway-projection` |
| `runsOutAt` after `resetAt` | `runsOutAt` ignored | `runway-runs-out` |
| unparseable `runsOutAt`/`resetAt` | treated as absent | `runway-dates` |
| duplicate `id` | first wins for selection | `runway-id` |
| bad `breaks` | sorted, deduplicated, max 4 | `runway-breaks` |
| no rows | `empty` (default "No data") | — |

## 6. Testing

Unit (vitest):
- `runwayForecast`: the reference's numbers; every rule in §2.
- `runwayCells`: each state; midpoint boundaries; runs-out/reset outside the domain; disconnected; last cell cut at the domain end.
- Default status: three date formats, the arrow, all four cases, row `status` vs prop `status`.
- Component: roles with and without `onSelect`; accessible names; keyboard incl. modifier pass-through; `selectedId`/`activeId`; layout switch; data table; every warning key in §5.1; SSR snapshot with `initialWidth`.
- `Region fill="hatch"`.

E2e (Playwright, existing specs extended with new stories): screenshots both themes darwin + linux; axe; contrast gate (incl. the "reset" label over empty cells and the status text); reflow at 320 px; forced colors; keyboard selection.

## 7. `Region fill`

`RegionProps` gains `fill?: 'solid' | 'hatch'` (default `'solid'`, today's look). `'hatch'` paints the region with the existing hatch pattern in its tone, with the same outline hatched marks get. It must not grow the `LineChart` size entry past 13 KB; if it does, the plan reports it instead of raising the budget.

## 8. Stories, docs, release

- `Charts/RunwayChart`: every cell state, disconnected, runs-out beyond the domain, stacked layout, custom status, no `onSelect`.
- `Reference/Usage runway`: the whole card — `RunwayChart` left; right a detail panel for the selected row: header, burn-up (`LineChart` with area, even pace as a neutral dashed line, dashed current pace, an area under used, runs-out dot, `Region fill="hatch"`), three `Stat`s, "Recent pace" (`Bars` with per-item within/over tone and a `Target`), Forecast/Table toggle. Data from `runwayForecast`. **Account names and icons are fictional and generic** (no real product names or logos), since the repo becomes public.
- If composing the panel needs anything beyond §7, it is added additively in this cycle and called out in the plan.
- Size-limit: new `RunwayChart` entry, 15 KB.
- Docs: README section; `docs/a11y.md` entry (listbox model, where the detail lives); API report update; changeset `minor` (0.7.0).
