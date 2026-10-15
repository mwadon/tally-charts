# tally-charts

Opinionated React charts for narrative business dashboards: hatched means plan or reference,
solid means actual, pink means loss, and targets are first-class.

> Status: 0.6. The public API is frozen for 1.0: see "Changes in 0.6" below.

```bash
npm i tally-charts
```

Like React, the package reads `process.env.NODE_ENV` to turn development warnings on, so it
expects a bundler that defines it (Vite, webpack, Next.js, esbuild with `define` all do).

```tsx
import 'tally-charts/theme.css'
import { Axis, Bars, Chart, Target, Tooltip, ValueLabel } from 'tally-charts'

const weeks = [
  { week: 'W1', margin: 29.4 },
  { week: 'W2', margin: 31.2 },
  { week: 'W3', margin: 33.8 },
  { week: 'W4', margin: 36.1 },
]

<Chart
  data={weeks}
  title="Margin by week"
  height={260}
  x={{ type: 'band', field: 'week', padding: 0.35 }}
  y={{ field: 'margin', domain: [26, 40] }}
>
  <Target y={38} label="Target 38%" />
  <Bars fill={(_, i, all) => (i === all.length - 1 ? 'solid' : 'hatch-fade')} format="percent" />
  <ValueLabel at="last" format={(v) => v.toFixed(1)} />
  <Axis side="bottom" ticks="ends" />
  <Tooltip />
</Chart>
```

Theme with CSS custom properties (`--ch-accent`, `--ch-loss`, `--ch-hatch-gap`, …). Dark mode
follows `prefers-color-scheme` unless an ancestor sets `data-ch-theme="light"` or `"dark"`.

## Styling

The public CSS surface is the `--ch-*` tokens below, `data-ch-part` on every part you might
style, and the
`data-ch-*` state and variant attributes (`data-ch-tone`, `data-ch-fill`, `data-ch-active`,
`data-ch-dimmed`, `data-ch-direction`, …). Class names (`ch-*`) and `--_ch-*` variables are
private and can change in any release: select `[data-ch-part="…"]` instead.

| Group | Tokens |
|---|---|
| Roles | `--ch-accent`, `--ch-accent-soft`, `--ch-loss`, `--ch-warn`, `--ch-gain`, `--ch-neutral` |
| Text and surfaces | `--ch-ink`, `--ch-ink-muted`, `--ch-grid`, `--ch-surface`, `--ch-tooltip-bg`, `--ch-tooltip-ink`, `--ch-tooltip-shadow` |
| Hatching | `--ch-hatch-angle` (degrees, unitless), `--ch-hatch-width`, `--ch-hatch-gap` (px, unitless), `--ch-hatch-tint` (stripe background opacity, 0–1) |
| Sequential | `--ch-seq-base` (default `--ch-loss`) and `--ch-seq-mix-1` … `--ch-seq-mix-5` (each level's share of the base). `--ch-seq-1` … `--ch-seq-5` are computed from them on every chart, legend and heatmap: read them, but steer them with the base and the mixes, since overriding them has no effect |
| Heatmap | `--ch-heatmap-cell-height` (default 44px), `--ch-heatmap-min-cell` (default 56px: the narrowest a column gets before the grid scrolls sideways) |
| Misc | `--ch-font-numeric`, `--ch-radius` (px), `--ch-duration`, `--ch-ease`, `--ch-dim-opacity`, `--ch-tone-text-mix` |

## High-level charts

Each one is a thin composition of `<Chart>` and the building blocks, renders a hidden data table
for screen readers by default (`dataTable={false}` turns it off), and renders `children` after
its own marks.

```tsx
import { BarChart, ComparisonBars, RankedBars } from 'tally-charts'

<BarChart data={weeks} x="week" y="margin" target={{ value: 38, label: 'Target 38%' }} format="percent" />

<ComparisonBars data={costs} label="name" sublabel="note" plan="estimate" actual="actual" format="currency" />

<RankedBars data={causes} label="name" value="amount" format="currency-compact"
  layout="stacked" selectedId={selected} onSelect={(id) => setSelected(id)} />
```

- `BarChart`: history `hatch-fade`, last bar `solid`, optional target and value label; `orientation="horizontal"` puts categories on the left.
- `ComparisonBars`: hatched plan bar over a solid actual bar, the overrun as a separate pink segment, and a `$640 → $1,060  +$420` / "On plan" column. `good="up"` for revenue-like rows, where going over plan is good news.
- `RankedBars`: label, bar on a faint track, value; sorted by size; `layout="stacked"` for drill columns. Bars show magnitudes, so negative "lost" amounts extend right and keep their sign in the text. Selection uses `selectedId` + `onSelect`; ids are the original data index unless you pass `id`.
- `WaterfallChart`: horizontal steps from a start value to a calculated end, with dotted
  connectors. Start is hatched neutral, steps are `loss`/`gain`, the end is solid accent. The
  domain leaves out zero by default, like a 34%–38% gap chart; the scale then runs a little past
  the domain so the start and end bars stay visible, while the axis labels the domain itself.
  Row ids are `'start'`, `step.id ?? index`, `'end'`. The end row's `point.datum` is a
  synthetic `{ label, value }` created on every render: compare by `id === 'end'`, not identity.
- `BridgeChart`: vertical columns of what remains after each step, with the leaked (or gained)
  part as a hatched cap, a gradient joining the totals between the columns, and a highlighted
  last column. `callout` pins a pill above the last column, lifted clear of any column labels it
  reaches over. Column ids are `'start'` and `step.id ?? index`.
- `DotHistogram`: one dot per item, binned on x and stacked; `toneBy` takes a `thresholds()`
  result; `target` and a pinned `calloutId` (with a stem). Arrow keys walk bins (←/→) and
  stacks (↑/↓). Dots shrink to a minimum size when crowded, then warn.
- `StripPlot`: one row of dots per `series`, lifted where they'd overlap, with a dashed median
  per row. ←/→ walk a row, ↑/↓ change rows. Point ids are `"<series id>:<row id>"`.
- `WaffleColumns`: a column of dots per period (`unit` is the value of one dot), periods tinted
  by `group`, the peak column solid with a pinned "Peak" pill. Hover and keys work per column.
- `LineChart`: `series` with `style` `'actual'` (solid), `'forecast'` (dashed, hollow dots) or
  `'scenario'` (dashed, green); `band` for a likely range, `forecastFrom` shades the forecast,
  `target`. Hover snaps to the nearest x and one tooltip lists every series there; ←/→ walk the
  x values. Point ids are the x values as strings, so `activeId` takes `'2025'`, not `2025`;
  for the same reason `1` and `'1'` are the same x, and a repeat is skipped with a warning. Give
  each series its own `id`. `yAxis` and `yAxisFormat` set the value axis, `xAxis` and
  `xAxisFormat` the x axis (tooltip headers, announcements and the data table use the x format
  too). `grid` follows the `yAxis` ticks, or `'all'` with `yAxis="none"`. A
  forecast that continues the actuals repeats the last actual value, so the lines join; the
  tooltip lists that value once. Without `domain`, the inferred domain covers every series, the
  band and the target. For dates, pass a time scale spec as `x`:
  `x={{ type: 'time', field: 'date' }}` (`Date`, epoch ms or ISO strings). Rows are sorted by
  date, point ids are ISO strings (`'2026-01-04T00:00:00.000Z'`), and `forecastFrom` takes a
  date.
- `Heatmap`: an HTML CSS grid (`role="grid"`) of long-format data (`row`, `column`, `value`) with
  column totals under the headers, a row total column, and `breaks` binned onto `--ch-seq-1…5`
  with a legend. One tab stop: arrow keys, Home/End and Enter move and select. `tone` changes
  the base color of the cells and the legend; every tone keeps cell text at 4.5:1 or more in
  both themes. Without `tone`, the levels use a `--ch-seq-base` set on an ancestor, else
  `--ch-loss`; only loss and accent bases are tuned for contrast that way. Cell ids are
  `"<row>:<column>"`, so names containing `:` can collide (`a:b` + `c` and `a` + `b:c`), and
  each row and column name must be unique. Missing values show a dash.
- `onSelect` and `onActiveChange` receive your original data object as `point.datum`, typed:
  `ChartPoint<D>`. `tooltip` takes `true`, `false`, or a function that renders the content for
  a point, with the same `point.datum`.

## Small pieces

HTML, styled by the same tokens: `Stat`, `Delta` (▲/▼ pill toned by `good="up" | "down"`), `Meter`
(progress + target tick), `RangeMeter` (actual dot → hatched gap → plan ring), `InlineBar`
(table-cell bar), `DotCount`, `Legend`, `TooltipPill`. Colored text mixes the tone with
`--ch-ink` (`--ch-tone-text-mix`, default 55%) to stay readable.

Building blocks added in 0.3: `Connector` (dotted lines between bands at a value),
`ColumnHighlight` (soft backdrop behind one band), `Area` (gradient through band centres, or only
in the gaps between bands with `between`) and `Callout` (a pill pinned to one point, with an
optional stem; `clearance` lifts it over labels it would cover). `Axis` takes an `extent` to label
only part of a padded linear scale. Callouts live in the HTML overlay:
they appear after mount and are hidden from screen readers, so put the same facts in the title,
description or data.

Thresholds drive tones and legend counts:

```tsx
const bands = thresholds([10, 25, 38], ['loss', 'warn', 'accent-soft', 'gain'],
  ['Critical', 'At risk', 'Below target', 'On target'])

<Legend shape="dot" items={bands.legend(jobs.map((j) => j.margin))} />
<DotHistogram data={jobs} value="margin" toneBy={bands} format="percent" />
```

Building blocks added in 0.4: `Dots` (circles at given positions, with a ring on the active one)
and `NearestPointer` (one layer that activates the point nearest the pointer, in 2-D or along x).
Numbers in data follow one rule: numbers and numeric strings count, while blanks, booleans and
other values are missing.

Building blocks added in 0.5: `Line`, `Band` (area between two values), `Grid` (horizontal
lines at the y ticks) and `Region` (shaded run of categories), plus `type: 'point'` scales for
`<Chart x>`. `Legend` draws `shape="line"` swatches (`dashed` for forecasts) and sequential
`level` swatches; `heatmapLevel(value, breaks)` gives the level a Heatmap uses for a value.

## Time scales

`<Chart x={{ type: 'time', field: 'date' }}>` puts dates on the x axis; `LineChart` takes the
same spec as `x`. Values may be `Date`s, epoch ms or ISO 8601 strings (a date-only string is UTC
midnight). Anything else, including an epoch outside the JS Date range (±8.64e15 ms), is skipped
with one warning per chart (`Line`, `Band` and `Area` alike), and such a date formats as an empty
string. The domain is inferred and rounded out to tick boundaries, a single date is padded by a
day on each side, and an explicit `domain` is kept as given unless you also set `nice: true`.
Dates outside an explicit domain are skipped, like invalid ones: not drawn, not reachable by
pointer or keyboard, with one warning per chart.
Ticks snap to calendar units from seconds to decades and are labelled multi-scale ("Jan 2026",
"Feb", …, "2027"), or with a date format: `'day'`, `'month'`, `'quarter'`, `'year'` or any
`Intl.DateTimeFormatOptions`, in the `ChartsProvider` locale.
`zone` is `'utc'` by default, which renders the same on the server and the client; `'local'`
uses the viewer's zone and can differ between them, so prefer `'utc'` for server rendering.
`'utc'` is only stable if the dates are: a date-time string without a zone
(`'2026-01-01T10:00'`) parses as the runtime's local time (ECMAScript `Date.parse`), so pass
date-only strings (`'2026-01-01'`), strings ending in `Z` or an offset, `Date`s or epoch ms.
`Line`, `Band`, `Area`, `Region`, `Target` (`x` as a date), `Grid`, `Axis` and `NearestPointer`
work on time scales; `Bars` and `ColumnHighlight` need a band scale and warn instead.

## Formatting

`format` takes a preset (`'currency'`, `'currency-compact'`, `'percent'`, `'pts'`, `'number'`,
`'hours'`), a preset with options (`{ preset: 'percent', digits: 0, signed: true }`), or a
function of the number. Axes take the same, a date format on a time axis, or a function of the
tick (`AxisValue`: a number, the category, or a `Date`). On an axis whose ticks are all whole
numbers, percent and pts drop their decimals ("0%", not "0.0%"). `axis` and `axisFormat` mean the
chart's only axis; `LineChart` has two, so it uses `xAxis` / `yAxis`.

## Conventions

- `BarChart`'s `x` is the category and `y` the value in both orientations.
- `at` is scoped by its mark: a data index (number) on `ValueLabel`, a category on
  `ColumnHighlight`, a value on a `Connector` link.
- `radius` is the corner radius on `Bars` and `ColumnHighlight`, and the dot radius elsewhere.
- Toggles are bare booleans (`legend`, `totals`, `grid`, `tooltip`, …); only `showValues` and
  `showScale` carry `show`, where the bare word would be ambiguous.
- Defaults follow the reference cards, so they differ by chart: heights (Chart 240, LineChart
  280, DotHistogram 220, WaffleColumns 200, BridgeChart 360), band padding (0.2 on a band
  scale, 0.35 BarChart, 0.45 BridgeChart, 0.3 WaffleColumns), tick counts (5, DotHistogram 6)
  and tones (InlineBar, RangeMeter and DotCount 'loss', Meter 'accent').
- `meta` is a number on a `WaterfallStep` and an accessor on `RankedBars`. To carry more per
  step, extend the step type (`WaterfallChart<MyStep>`) rather than packing it into `meta`.

## Custom marks

Inside `<Chart>`, `useChart()` returns the size, the margins, the data, the scales (`x` and
`y`, narrowed on `kind`: `'linear'`, `'band'`, `'point'` or `'time'`), the number formatter and
the active point. `useRegisterPoints(points)` registers a mark's points for hover, keyboard and
tooltips; memoize the array.

## Several React roots on one page

Pattern ids come from React's `useId`, which is only unique within one root. When charts render
in separate roots (islands, micro-frontends), give each chart a `chartId`.

## Server Components

Chart components are client components: the main entry `tally-charts` starts with `'use client'`,
so you can render `<Chart>` from a Server Component file. In server code, import from
`tally-charts/core`, which has no React and is server-safe: the formatters (`fmt`,
`createFormatter`, `createFormatters`), `thresholds`, `heatmapLevel`, `toNumber`, `toTime` and
the shared types. Function props
(`fill`, `tone`, function `format`, `tooltip`) can't cross the server/client boundary, so pass
them from a client component.

## Changes in 0.6

0.6 freezes the public API. Every breaking rename, before → after:

- `<LineChart axis={…} axisFormat={…}>` → `<LineChart yAxis={…} yAxisFormat={…}>`, plus a new
  `xAxisFormat`.
- `<LineChart band={…}>`'s type `LineRange` → `LineBand`.
- `<Bars tooltip={(d) => segments}>` → `<Bars segments={(d) => segments}>`.
- `<ComparisonBars overIsBad={false}>` → `<ComparisonBars good="up">` (default `good="down"`);
  `onPlanText` → `onPlanLabel`.
- `useChart('MyMark')` → `useChart()`, which returns only the public fields (`chartId`, `warn`,
  `radius`, `registerPoints` and `unregisterPoints` are gone).
- `useRegisterPoints(ctx, points)` → `useRegisterPoints(points)`.
- `ctx.x.scale` / `ctx.y.scale` are the library's own `LinearScale`, `BandScale`, `PointScale`
  and `TimeScale`; d3-only methods such as `.copy()` are gone. d3-scale is no longer a
  dependency.
- Axis format functions get an `AxisValue` (`string | number | Date`): `(v: string | number) =>
  string` → `(v: AxisValue) => string`, or drop the annotation.
- The types `ComparisonStatus`, `WaterfallKind` and `DeltaDirection` are no longer exported; use
  string literals.
- `tally-charts/core` keeps only formatting, `thresholds`, `heatmapLevel`, `toNumber`, `toTime`
  and the shared and scale types. `createScale`, `computeBars`, `categoryTicks` and the other
  layout helpers, `createWarner` and `isDev` are internal now.
- CSS: style `[data-ch-part="…"]`, not classes (`.ch-pill-seg` → `[data-ch-part="pill-segment"]`,
  `.ch-swatch` → `[data-ch-part="legend-swatch"]`, …). `--ch-swatch-color`,
  `--ch-range-ref-color`, `--ch-heatmap-columns` and `--ch-seq-ink-strong` became private
  `--_ch-*` variables. `[data-ch-dir]` on bars → `[data-ch-direction]`, as on `Delta`.
- Percent and pts axes drop their decimals when every tick is whole: "0%", not "0.0%".
- `<Chart>` (and so every high-level chart) and `Heatmap` warn in development when `title` is
  missing.

Additions: time scales, `ChartPoint<D>` in callbacks, a function `tooltip` on high-level charts,
`{ preset, digits, signed }` formats, `axisFormat` on `BarChart` and `DotHistogram`, `chartId`
on `Heatmap`, `heatmapLevel`, and readonly arrays everywhere.

MIT licensed.
