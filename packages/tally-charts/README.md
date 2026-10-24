# tally-charts

Opinionated React charts for narrative business dashboards: hatched means plan or reference,
solid means actual, pink means loss, and targets are first-class.

> Status: 0.8. The public API is frozen for 1.0: see "Changes in 0.6" below.

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

An app whose dark mode is a class (`.dark`, as with Tailwind and shadcn) has to set the attribute
too; the class alone doesn't reach the tokens. With next-themes, write both:

```tsx
<ThemeProvider attribute={['class', 'data-ch-theme']}>{children}</ThemeProvider>
```

With your own provider, set `document.documentElement.dataset.chTheme = resolvedTheme` wherever it
toggles the class, and render the same `data-ch-theme` on `<html>` on the server so the first
paint is in the right theme.

## Styling

The public CSS surface is the `--ch-*` tokens below, `data-ch-part` on every part you might
style, and the `data-ch-*` state and variant attributes (`data-ch-tone`, `data-ch-fill`,
`data-ch-active`, `data-ch-dimmed`, `data-ch-direction`, …). Class names (`ch-*`) and `--_ch-*`
variables are private and can change in any release: select `[data-ch-part="…"]` instead.

| Group | Tokens |
|---|---|
| Roles | `--ch-accent`, `--ch-accent-soft`, `--ch-loss`, `--ch-warn`, `--ch-gain`, `--ch-neutral` |
| Text and surfaces | `--ch-ink`, `--ch-ink-muted`, `--ch-grid`, `--ch-surface`, `--ch-tooltip-bg`, `--ch-tooltip-ink`, `--ch-tooltip-shadow` |
| Hatching | `--ch-hatch-angle` (degrees, unitless), `--ch-hatch-width`, `--ch-hatch-gap` (px, unitless), `--ch-hatch-tint` (stripe background opacity, 0–1) |
| Share and zone | `--ch-share-gap` (gap between ShareBar segments), `--ch-zone-marker` (ZoneMeter marker color) |
| Sequential | `--ch-seq-base` (default `--ch-loss`) and `--ch-seq-mix-1` … `--ch-seq-mix-5` (each level's share of the base). `--ch-seq-1` … `--ch-seq-5` are computed from them on every chart, legend and heatmap: read them, but steer them with the base and the mixes, since overriding them has no effect. `data-ch-seq-tone="<tone>"` on an ancestor (Heatmap's `tone` sets it) picks that tone's base and its shares for the theme; it must sit on, or below, the element that sets `data-ch-theme`, or the ramp is computed in the outer theme |
| Heatmap | `--ch-heatmap-cell-height` (default 44px), `--ch-heatmap-min-cell` (default 56px: the narrowest a column gets before the grid scrolls sideways) |
| Misc | `--ch-font-numeric`, `--ch-radius` (px), `--ch-duration`, `--ch-ease`, `--ch-dim-opacity`, `--ch-tone-text-mix` |

### Palettes

`data-ch-palette="vivid"` restores the brighter pre-0.6b light colors of three tokens:
`--ch-warn: #f1a23b`, `--ch-gain: #23a866` and `--ch-neutral: #a3a3ab`.

```html
<html data-ch-palette="vivid"> <!-- or any ancestor of a chart, or the element with data-ch-theme -->
```

- Light only: where the effective theme is dark (`data-ch-theme="dark"` or a dark system
  preference) the tokens are the normal dark ones.
- Forced colors (Windows high contrast) win: the tokens stay system colors.
- Limit: a `data-ch-theme="dark"` element nested inside a light one, with a bare palette element
  below it, gets vivid colors in a dark region. Put the attribute on `<html>` or on the themed
  element itself to avoid it.
- Everything else is unchanged, and your own `--ch-*` overrides on a descendant still win.
- Accessibility: these three colors are below 3:1 against the light surface (warn 2.0:1, gain
  2.9:1, neutral 2.4:1), so marks in these tones are harder to see than by default; see
  `docs/a11y.md`.

## High-level charts

Each one is a thin composition of `<Chart>` and the building blocks, renders a hidden data table
for screen readers by default, and renders `children` after its own marks. `dataTable={false}`
turns the table off; `dataTable={{ caption, columns }}` sets its caption and renames columns,
keyed by the default header (`{ Week: 'Week ending' }`). The default headers are the field names
in sentence case ("grossMargin" reads "Gross margin") or the series labels. `keyboardHint` sets
the instructions read when the chart takes focus (see Accessibility below).

```tsx
import { BarChart, ComparisonBars, RankedBars } from 'tally-charts'

<BarChart data={weeks} x="week" y="margin" target={{ value: 38, label: 'Target 38%' }} format="percent" />

<ComparisonBars data={costs} label="name" sublabel="note" plan="estimate" actual="actual" format="currency" />

<RankedBars data={causes} label="name" value="amount" format="currency-compact"
  layout="stacked" selectedId={selected} onSelect={(id) => setSelected(id)} />
```

- `BarChart`: history `hatch-fade`, last bar `solid`, optional target and value label;
  `orientation="horizontal"` puts categories on the left.
- `ComparisonBars`: hatched plan bar over a solid actual bar, the overrun as a separate pink
  segment, and a `$640 → $1,060  +$420` / "On plan" column. `good="up"` for revenue-like rows, where
  going over plan is good news. `layout="stacked"` puts the label and the values above bars that
  span the full width; the default `'auto'` switches to it when the bars would get less than 120px,
  and `layout="columns"` keeps the columns at any width. The auto layout follows the measured width,
  so on a server-rendered page a narrow screen first renders columns at the 640px default and stacks
  after hydration: pass `initialWidth` or an explicit `layout` to avoid the jump.
- `RankedBars`: label, bar on a faint track, value; sorted by size; `layout="stacked"` for drill
  columns. Bars show magnitudes, so negative "lost" amounts extend right and keep their sign in
  the text. Selection uses `selectedId` + `onSelect`; ids are the original data index unless you
  pass `id`. `selectable={(d) => d.key !== 'other'}` leaves a row out of `onSelect`.
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
- `Heatmap`: an HTML CSS grid (`role="grid"`) of long-format data (`row`, `column`, `value`) with a
  row of column totals under the headers, a row total column, and `breaks` binned onto
  `--ch-seq-1…5` with a legend. One tab stop: arrow keys, Home/End, Ctrl+Home/End and
  PageUp/PageDown move (the totals included), Enter selects. `rowLabel` names the row header column
  for screen readers (default: the `row` field in sentence case). `tone` changes the base color of
  the cells and the legend; every tone keeps cell text at 4.5:1 or more, neighbouring levels at
  1.3:1 and the top level at 3:1 against the surface, in both themes. Without `tone`, the levels use
  a `--ch-seq-base` set on an ancestor, else `--ch-loss`; for another tone's tuned ramp, set
  `data-ch-seq-tone` instead. Columns never get narrower than their name or `--ch-heatmap-min-cell`;
  below that the grid scrolls sideways, and the scroll region becomes a tab stop before the grid, so
  it has two. Cell ids are `"<row>:<column>"`, so names containing `:` can collide (`a:b` + `c` and
  `a` + `b:c`), and each row and column name must be unique. Missing values show a dash.
- `onSelect` and `onActiveChange` receive your original data object as `point.datum`, typed:
  `ChartPoint<D>`. `tooltip` takes `true`, `false`, or a function that renders the content for
  a point, with the same `point.datum`.

### RunwayChart

One strip per account across a time axis: each cell is coloured by the projected share of the
allowance in use, a dot marks the moment it runs out, hatched cells are the locked span until the
reset tick, and a "Now" line shows today. Beside each strip are the label and a two-line status
("Runs out Fri 03:24", "Resets Mon 09:21"). `runwayForecast` computes the facts from usage, the
window and the pace (by default the pace so far; `pace` takes a share per day, so `0.113` is 11.3
points a day).

```tsx
import { RunwayChart, runwayForecast } from 'tally-charts'

const rows = accounts.map((a) => ({
  id: a.id,
  label: a.name,
  ...runwayForecast({ used: a.used, windowStart: a.windowStart, resetAt: a.resetAt, now }),
}))

<RunwayChart title="Usage runway" rows={rows} domain={[now, weekEnd]} now={now}
  selectedId={selected} onSelect={(id) => setSelected(id)} />
```

| Prop | Default | |
| --- | --- | --- |
| `rows` | | `{ id, label, icon?, sublabel?, projection?, runsOutAt?, resetAt?, disconnected?, status? }`. `projection` is `{ at, used }[]` (used 0-1, linear between points); no projection means no forecast. Cells before the first point take its value, so start the domain at `now` or include history |
| `domain`, `now` | | Time span of the strips and the "Now" line; dates, epoch ms or ISO strings |
| `cell` | `'6h'` | Cell length: `'30m'`, `'6h'`, `'1d'` or ms. At most 200 cells, then a warning |
| `breaks` | `[0.25, 0.5, 0.75]` | 1-4 ascending level edges as shares; `n` edges make `n + 1` levels |
| `tone` | `'neutral'` | Tone of the levels and the legend, always applied: an ancestor's `--ch-seq-base` does not reach it |
| `layout` | `'auto'` | `'auto'` stacks the rows when the strip would be under 240px; or `'columns'` / `'stacked'` |
| `initialWidth`, `labelWidth` | `960`, `200` | Width before the first measurement and on the server (960 renders columns); label column in px |
| `selectedId`, `onSelect` | | The selected row is marked in both modes; with `onSelect` the rows are a listbox |
| `activeId`, `onActiveChange` | | Hovered or keyboard-focused row, controlled or not |
| `status` | | `(row, facts) => ReactNode` for a custom status: `undefined` keeps the default, `null` shows none, a string is also the table's Status; a row's own `status` wins |
| `legend` | `true` | |
| `title`, `description` | | Name and describe the list |
| `dataTable` | `true` | Hidden table: Name, Detail, Runs out, Resets, Projected at reset, Status |
| `empty` | `'No data'` | Shown for an invalid domain or no rows |
| `timeZone` | `'utc'` | Zone of the day boundaries and the dates; `'local'` can differ between server and client |

Each cell is decided at its midpoint:

| Cell | Drawn as |
| --- | --- |
| Before the run-out, with a forecast | A level from the projection there, binned by `breaks` |
| Holds the run-out | The "runs out" cell (the dot sits in it) |
| After the run-out, before the reset | Locked: hatched |
| After the reset, or no forecast | Empty |

The default status is `Runs out <date>`, or `~N% at reset` when it does not run out, or
`No forecast`; then `Resets <date>`. Dates read `Fri 03:24` within six days of `now`, `Oct 21
09:21` later in the domain and `Nov 9` past its end (with ` →` after a reset). A `disconnected`
row reads `Disconnected`. The built-in strings ("Now", "reset", "Runs out", the legend and the
table headers) are English; pass `status`, `legend={false}` or your own `title` to change what you
can. `runwayForecast` returns `projection`, `runsOutAt` (when it reaches 1 before the reset),
`resetAt`, `usedAtReset` (uncapped), `paceRatio` (1.0 is an even pace), `elapsed` and `lockedMs`;
spread it into a row. The parts are `runway`, `runway-axis`, `runway-now-label`, `runway-head-row`,
`runway-rows`, `runway-row`, `runway-label`, `runway-icon`, `runway-name`, `runway-strip`,
`runway-cell`, `runway-now`, `runway-reset`, `runway-reset-label`, `runway-dot`, `runway-status`
and `runway-status-line`; the attributes are `data-ch-layout` (`columns` / `stacked`),
`data-ch-state` (on cells: `level`, `runs-out`, `locked`, `empty`), `data-ch-focus` and, on rows,
`data-ch-active`, `data-ch-muted`, `data-ch-selectable` and `data-ch-selected`. See
`docs/a11y.md` for the keys.

## Small pieces

HTML, styled by the same tokens: `Stat`, `Delta` (▲/▼ pill toned by `good="up" | "down"`), `Meter`
(progress + target tick), `RangeMeter` (actual dot → hatched gap → plan ring), `InlineBar`
(table-cell bar), `DotCount`, `Legend`, `TooltipPill`. Colored text mixes the tone with
`--ch-ink` (`--ch-tone-text-mix`, default 55%) to stay readable.

Building blocks added in 0.3: `Connector` (dotted lines between bands at a value),
`ColumnHighlight` (soft backdrop behind one band), `Area` (gradient through band centres, or only
in the gaps between bands with `between`) and `Callout` (a pill pinned to one point, with an
optional stem; `clearance` lifts it over labels it would cover). `Axis` takes an `extent` to label
only part of a padded linear scale. Callouts live in the HTML overlay: they appear after mount,
are hidden from screen readers (put the same facts in the title, description or data), and never
get wider than the chart, wrapping instead.

`ShareBar` shows the parts of a whole: one bar split by `value / total`, in the given order, and a
list of the parts ("2,711 · 46%"; `legendValue` is `'both'`, `'value'` or `'percent'`, and
`legend={false}` keeps only the bar). A `total` larger than the sum leaves the rest as empty track.
Percents add up to 100, a part that rounds to 0% reads "<1%" and stays visible as a 3px sliver. Segments
without a `tone` take `accent`, `accent-soft`, `warn`, `neutral`, `gain` in turn, never `loss`
(pink is only ever chosen explicitly).

```tsx
<ShareBar
  label="Where visitors come from"
  segments={[
    { label: 'Internal links', value: 2711, tone: 'gain' },
    { label: 'Search', value: 1968, tone: 'accent' },
    { label: 'Direct', value: 1101, tone: 'warn' },
    { label: 'Social', value: 43, tone: 'neutral', fill: 'hatch' },
  ]}
/>

<ShareBar
  label="Pages by review state"
  total={800}
  segments={[
    { label: 'Reviewed in the last 90 days', value: 62 },
    { label: 'Stale, untouched 90+ days', value: 738, tone: 'loss' },
  ]}
/>
```

`ZoneMeter` puts a value against the zones of a `thresholds()` result, on a linear track from `min`
to `max` with a marker and the breaks labelled underneath. `maxLabel` and `minLabel` replace the end
labels ("6 s+"), and a value outside the range is pinned to the end. The value text a screen reader
hears is the value and its zone, such as "4.1 s, Poor".

A value on a break goes in the zone above it. For tiers that include their upper edge, as Core Web
Vitals do (an LCP of 2.5 s is Good), pass `{ inclusive: 'upper' }` to `thresholds()`.

```tsx
const lcpZones = thresholds([2.5, 4], ['gain', 'warn', 'loss'], ['Good', 'Needs improvement', 'Poor'],
  { inclusive: 'upper' })

<ZoneMeter
  label="Largest Contentful Paint"
  value={4.1}
  zones={lcpZones}
  max={6}
  maxLabel="6 s+"
  format={(v) => `${v.toFixed(1)} s`}
/>
```

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
lines at the y ticks) and `Region` (shaded run of categories; `fill="hatch"` hatches it instead
of tinting it), plus `type: 'point'` scales for `<Chart x>`. `Legend` draws `shape="line"`
swatches (`dashed` for forecasts, and `marker: 'dot'` or `'ring'` for the series' points),
`shape="band"` swatches for a `Band`'s soft fill, and sequential `level` swatches;
`heatmapLevel(value, breaks)` gives the level a Heatmap uses for a value.

## Time scales

`<Chart x={{ type: 'time', field: 'date' }}>` puts dates on the x axis; `LineChart` takes the
same spec as `x`. Values may be `Date`s, epoch ms or ISO 8601 strings (a date-only string is UTC
midnight). Anything else, including an epoch outside the JS Date range (±8.64e15 ms), is skipped
with one warning per chart (`Line`, `Band` and `Area` alike), and such a date formats as an empty
string. The domain is inferred and rounded out to tick boundaries, a single date is padded by a
day on each side, and an explicit `domain` is kept as given unless you also set `nice: true` (a
domain with a value that isn't a date is ignored, with a warning). Dates outside an explicit
domain are skipped, like invalid ones: not drawn, not reachable by pointer or keyboard, with one
warning per chart. Ticks snap to calendar units from seconds to decades and are labelled
multi-scale ("Jan 2026", "Feb", …, "2027"), or with a date format: `'day'`, `'month'`,
`'quarter'`, `'year'` or any `Intl.DateTimeFormatOptions`, in the `ChartsProvider` locale. A tick
whose label repeats the one before it (a coarse format on fine ticks) is dropped.

`zone` is `'utc'` by default, which renders the same on the server and the client; `'local'`
uses the viewer's zone and can differ between them, so prefer `'utc'` for server rendering.
`'utc'` is only stable if the dates are: a date-time string without a zone (`'2026-01-01T10:00'`)
parses as the runtime's local time (ECMAScript `Date.parse`), so pass date-only strings
(`'2026-01-01'`), strings ending in `Z` or an offset, `Date`s or epoch ms. `Line`, `Band`,
`Area`, `Region`, `Target` (`x` as a date), `Grid`, `Axis` and `NearestPointer` work on time
scales; `Bars` and `ColumnHighlight` need a band scale and warn instead.

## Formatting

`format` takes a preset (`'currency'`, `'currency-compact'`, `'percent'`, `'pts'`, `'number'`,
`'hours'`), a preset with options (`{ preset: 'percent', digits: 0, signed: true }`), or a
function of the number. Axes take the same, a date format on a time axis, or a function of the
tick (`AxisValue`: a number, the category, or a `Date`). On an axis whose ticks are all whole
numbers, percent and pts drop their decimals ("0%", not "0.0%"). `axis` and `axisFormat` mean the
chart's only axis; `LineChart` has two, so it uses `xAxis` / `yAxis`. A category axis (BarChart's
`axisFormat`) takes only a function of the category: a preset or date format there is ignored,
with a warning.

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
`createFormatter`, `createFormatters`), `thresholds`, `heatmapLevel`, `runwayForecast`, `toNumber`,
`toTime` and the shared types. Function props (`fill`, `tone`, function `format`, `tooltip`, a
`thresholds()` result) can't cross the server/client boundary, so pass them from a client component.
ZoneMeter's `zones` also takes the plain part of a `thresholds()` result:
`zones={{ bins: lcp.bins, inclusive: lcp.inclusive }}` works from a Server Component.

## Accessibility

Every chart is a `figure` named by `title` and described by `description`, with a hidden data
table. Its plot is one tab stop (`role="application"`, role description "chart"): focus shows
the first point and its tooltip, ←/→ (and ↑/↓) move, Home and End jump, Enter selects with
`onSelect`, Escape clears, and each point is announced as "{series}, {n} of {total}, {label}".
`keyboardHint` translates the instructions read on focus; `keyboardHint=""` turns them off. A
`<Chart>` whose marks register no points is not a tab stop. Escape also closes a hover tooltip,
and the pointer can rest on it. Text keeps 4.5:1 and marks 3:1 in both themes, forced-colors
(high-contrast) mode keeps marks and focus rings visible, and at 320px no chart text overlaps: bridge
totals thin out, row labels are cut with an ellipsis, ComparisonBars stacks and Heatmap scrolls.
`docs/a11y.md` in the repository has the keyboard model, what screen readers hear per chart, the
decorative elements and a manual checklist.

## Changes in 0.9

Added `thresholds(…, { inclusive: 'upper' })`, plain `{ bins, inclusive }` zones on `ZoneMeter`,
and `selectable` on `RankedBars`, `Bars` and `ChartPoint`. Nothing changed or removed.

## Changes in 0.8

Added `ShareBar` and `ZoneMeter`. Nothing changed or removed.

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

Accessibility changes you may notice (0.6b):

- The chart's focus, keys and `aria-*` moved from the `<figure>` to the plot inside it
  (`[data-ch-part="plot"]`, `role="application"`); tests that focus or send keys to the figure
  should use `getByRole('application')`. The focus ring is on the plot.
- Announcements start with the position: "Jul 6, 37.5%" → "1 of 12, Jul 6, 37.5%", and with the
  series when there are several. StripPlot point labels no longer repeat the series name.
- Data tables head each row with its first cell, read empty values as "no value", and use field
  names in sentence case ("week" → "Week").
- Toned text (row and value labels, bridge notes, waffle group labels, pill values) mixes the
  tone with ink, keyed on `data-ch-tone-text`; the `ch-tone-text` class is gone.
- Light `--ch-warn` is `#be802f` (was `#f1a23b`), `--ch-gain` `#22a363` (`#23a866`) and
  `--ch-neutral` `#8e8e95` (`#a3a3ab`). Hatched and soft-accent marks have a 1px outline in both
  themes (soft dots are decorative and get none).
- The sequential levels have new shares per tone and theme, and the dark top level is the pure
  base with dark text. `data-ch-seq-tone` now also sets `--ch-seq-base`.
- Heatmap column headers hold only the names; the column totals are a row of their own
  (`[data-ch-part="heatmap-total-row"]`), ending with the grand total, so 0.6's
  `heatmap-header-total` part is gone. The grid sits in `[data-ch-part="heatmap-scroll"]`.
- WaffleColumns' default top margin is 44px when it pins the peak pill (8px before), so the pill
  no longer sits on the tallest column.
- An axis keeps only its first label when even its first and last would overlap; every value stays
  reachable through the tooltip and the data table.

Additions: time scales, `ChartPoint<D>` in callbacks, a function `tooltip` on high-level charts,
`{ preset, digits, signed }` formats, `axisFormat` on `BarChart` and `DotHistogram`, `chartId`
on `Heatmap`, `heatmapLevel`, and readonly arrays everywhere. In 0.6b: `keyboardHint` on every
chart, `rowLabel` on `Heatmap`, `dataTable={{ caption, columns }}` on high-level charts, `layout`
on `ComparisonBars`, `marker` and `shape: 'band'` on `Legend` items, `series` on `ChartPoint`
and `DotItem`, the `--ch-heatmap-min-cell` token, the parts `plot`, `heatmap-total-row`,
`heatmap-scroll`, `meter-min-label`, `range-scale-min` and `range-scale-max`, and the state
attributes `data-ch-tone-text`, `data-ch-peak` and `data-ch-marker`.

MIT licensed.
