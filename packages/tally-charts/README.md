# tally-charts

Opinionated React charts for narrative business dashboards: hatched means plan or reference,
solid means actual, pink means loss, and targets are first-class.

> Status: 0.5. The API may change before 1.0.

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
- `ComparisonBars`: hatched plan bar over a solid actual bar, the overrun as a separate pink segment, and a `$640 → $1,060  +$420` / "On plan" column. `overIsBad={false}` for revenue-like rows.
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
  each series its own `id`. `grid` follows the `axis` ticks, or `'all'` with `axis="none"`. A
  forecast that continues the actuals repeats the last actual value, so the lines join; the
  tooltip lists that value once. Without `domain`, the inferred domain covers every series, the
  band and the target.
- `Heatmap`: an HTML CSS grid (`role="grid"`) of long-format data (`row`, `column`, `value`) with
  column totals under the headers, a row total column, and `breaks` binned onto `--ch-seq-1…5`
  with a legend. One tab stop: arrow keys, Home/End and Enter move and select. `tone` changes
  the base color of the cells and the legend; every tone keeps cell text at 4.5:1 or more in
  both themes. Without `tone`, the levels use a `--ch-seq-base` set on an ancestor, else
  `--ch-loss`; only loss and accent bases are tuned for contrast that way. Cell ids are
  `"<row>:<column>"`, so names containing `:` can collide (`a:b` + `c` and `a` + `b:c`), and
  each row and column name must be unique. Missing values show a dash.
- `onSelect` and `onActiveChange` receive your original data object as `point.datum`.

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
`<Chart x>`. Time scales aren't in yet: put dates on a point scale with formatted labels.
`Legend` draws `shape="line"` swatches (`dashed` for forecasts) and sequential `level` swatches.

## Several React roots on one page

Pattern ids come from React's `useId`, which is only unique within one root. When charts render
in separate roots (islands, micro-frontends), give each chart a `chartId`.

## Server Components

Chart components are client components: the main entry `tally-charts` starts with `'use client'`,
so you can render `<Chart>` from a Server Component file. In server code, import `fmt` and
`createFormatter` from `tally-charts/core`, which has no React and is server-safe. Function props
(`fill`, `tone`, function `format`, `tooltip`) can't cross the server/client boundary, so pass
them from a client component.

MIT licensed.
