# tally-charts 1.3 — StackedAreaChart

Date: 2026-11-18. Status: approved by the owner (decisions in §9).

Design: the `StackedAreaChart` artboard of the "tally-charts: nowe typy wykresów" canvas
(https://claude.ai/artifact/NrNdV95DyRP9m1NbgMdsVK).
Parent specs: `2026-10-14-tally-charts-design.md`, the 0.6–1.0 specs and the 1.1 / 1.2 bar chart
specs. Everything they require of a high-level chart (themes, a11y, reflow, forced colors, dev
warnings, size budgets, API report, i18n through `ChartMessages`) applies here unless this
document says otherwise.

## 1. Purpose

Show how a total and its parts move over an ordered x: crew hours per week by work type, revenue
per month by service line. `LineChart` draws series as lines that cross; `StackedBarChart` stacks
parts but reads as separate periods. The `Area` mark is a soft gradient under one line and does
not stack.

`StackedAreaChart` is a high-level chart on `<Chart>`, next to `LineChart` in
`src/react/charts/`. It takes `LineChart`'s x (categories on a point scale, or a time scale spec)
and wide rows with a `series` array. Release: **1.3.0** (minor; additive only).

The artboard's own idea is the split at "today": the weeks after it are booked, not worked, and
are drawn hatched in each series' tone.

## 2. API

```tsx
<StackedAreaChart
  title="Crew hours per week"
  data={weeks}
  x="week"
  series={[
    { id: 'install', label: 'Install', value: 'install' },
    { id: 'service', label: 'Service', value: 'service' },
    { id: 'warranty', label: 'Warranty', value: 'warranty', tone: 'neutral' },
  ]}
  forecastFrom="W10"
  forecastLabel="today"
  format={(v) => `${v} h`}
/>
```

```ts
interface AreaSeries<D> {
  /** Stable key of the series; unique within the chart. */
  id: string
  /** Name for the end label, the tooltip, announcements and the data table header. */
  label: string
  value: Accessor<D, number>
  /** Default: the next tone of the default order (§3). */
  tone?: Tone
}

type StackedAreaChartProps<D> = ChartName &
  Omit<ChartPassThroughProps<D>, 'aspectRatio'> & {
    data: readonly D[]
    /** As `LineChart`: an accessor for categories, or a time scale spec with a `field`. */
    x: Accessor<D, string | number> | (TimeScaleSpec<D> & { field: Accessor<D, TimeInput> })
    /** One layer per series; the first series sits on the baseline. */
    series: readonly AreaSeries<D>[]
    /**
     * The first forecast x: a category, or any date on a time axis. The layers are hatched from
     * the last x before it to the end, and a dashed rule sits at that last x before it (with
     * `forecastFrom="W10"`, at W9). Nothing is hatched when no x comes before it.
     */
    forecastFrom?: TimeInput
    /** Text above the rule, e.g. "today". */
    forecastLabel?: string
    /** Value domain. Default: zero to the largest total, rounded to nice ticks. */
    domain?: readonly [number, number]
    /** Series name and last value at the right edge of each layer. Default true. */
    endLabels?: boolean
    /** Default 'number'. */
    format?: FormatSpec
    yAxis?: TickSpec | 'none'
    yAxisFormat?: AxisFormat
    xAxis?: TickSpec | 'none'
    xAxisFormat?: AxisFormat
    /** Horizontal grid lines at the value ticks. Default true. */
    grid?: boolean
    dataTable?: boolean | DataTableOptions
    tooltip?: ChartTooltip<D>
    /** As `LineChart`. Default true. */
    interactive?: boolean
  }
```

Axis props are named as in `LineChart` (`xAxis`, `yAxis`), because the chart has no orientation.
`AreaSeries` is `BarSeries` without `fill`: a layer's fill is its state along x (worked or
booked), not a property of the series.

Not in the API: `target` (a line across stacked layers reads as a limit on the total only; add it
when someone needs it), 100 % stacks, a horizontal orientation, per-series fill, a built-in
legend, a second value scale, smoothing (straight segments, as `Line`).

## 3. Rendering

- Layers: solid tone fills stacked from zero in `series` order; a 2 px surface-coloured line
  separates neighbouring layers, so they stay apart in forced colors too. Not the gradient of the
  `Area` mark, which does not change.
- Default tones by series position: `accent`, `accent-soft`, `warn`, `neutral`, `gain`, then
  repeating (the bar charts' order). Never `loss`.
- Forecast part: from the x before `forecastFrom` to the last x every layer is painted with the
  tone's existing hatch pattern and outlined on its upper edge (1.5 px, the tone mixed with ink,
  as the outline of hatched bars). A solid `accent-soft` layer on top of the stack gets the same
  edge, as solid `accent-soft` bars have an outline. On a time axis `forecastFrom` can be any
  date: the hatched part starts at the last x before it. A dashed
  vertical rule sits at that x with `forecastLabel` above it. `forecastFrom` at the first x or not
  on the axis: nothing is hatched, with a development warning in the second case.
- Values: negative values are not stackable as areas; a negative value counts as zero, with a
  development warning. A row with a missing or non-numeric value breaks every layer at that x, as
  a missing value breaks a `Line`; a lone x between two breaks draws nothing.
- End labels: at the right edge, per layer, the series name and under it the formatted last
  value, centred on the layer's last extent (name baseline 4 px above the midpoint, value
  baseline 14 px below it). The right margin grows to fit the longest (as the `StackedBarChart`
  target label; 8 px per character for the value line). If two neighbouring labels would overlap
  (centres closer than 36 px), or the last x is not drawn as part of an area (outside the x
  domain, or a lone x after an incomplete row), no end label is drawn and the margin does not
  grow: compose `<Legend>` instead.
- Margins as `LineChart`, plus the end-label column.

Implementation sketch (not verified beyond reading `LineChart.tsx` props and `Area.tsx` props):
`stackRow` from `core/bars.ts` per row; one internal mark draws the layer paths, separators,
hatched parts and end labels; points and pointer snapping reuse what `LineChart` uses for one
point per x. `seriesTones` comes from `charts/bar-series.tsx`.

## 4. Interaction and accessibility

- One point per x, carrying every series, as in `LineChart`: the pointer snaps along x, arrow
  keys move from x to x, Home / End jump to the ends. The active x is marked by a vertical rule
  from the baseline to the top of the stack and a dot on each layer's upper edge.
- Default tooltip: the x, then one line per series (tone swatch, label, value) top layer first,
  then the total. "Total" comes from `ChartMessages.total`.
- Announcement, in `LineChart`'s form with the same order as the tooltip:
  "W4, 68 h Warranty, 130 h Service, 210 h Install, 408 h Total".
- A row with a missing value still has a point: it lists the series that have a value and no
  total.
- Tooltip, announcement and table show a negative value as it is; the total is the sum the chart
  draws (negatives counted as zero).
- Data table: one row per x; columns are the x, one per series and a last "Total" column.
- The forecast state is not colour-only on screen: the hatch is a texture and the rule carries
  `forecastLabel`. The data table does not mark forecast rows (`LineChart`'s does not either);
  documented as a limit.
- Forced colors: layers fall back to the system colours of their tones; separators keep them
  apart; the hatch stays.

## 5. Dev warnings

- A repeated series `id`; an empty `series` array (the chart renders its `empty` state).
- More than 5 series (tones repeat from 6).
- A negative value; `forecastFrom` that is not on the axis.

## 6. Tests and gates

- Unit: component tests for stacking geometry, default tones, forecast split (hatch, rule,
  label), breaks on missing values, negative clamp, end labels (placement, margin, all-or-none),
  category and time x, points and tooltip per x, keyboard, data table with the total column, dev
  warnings, `interactive={false}`, SSR and hydration (server render before the `console.error`
  spy).
- Storybook stories (`light` and `dark` with the forecast split, `time`, `plain`, `many-series`)
  with e2e gates: screenshots darwin + linux, axe, contrast, reflow at 320 CSS px, forced colors,
  keyboard; themeless stories listed for both themes.
- New size-limit entry `StackedAreaChart` ≤ 15 KB gzip; `check:treeshake` fixture;
  `tally-charts/core` stays ≤ 8 KB.
- `api:update`: the report gains `StackedAreaChart`, `StackedAreaChartProps` and `AreaSeries`,
  nothing else.
- Changeset: `minor`.

## 7. Docs

- Page `stacked-area-chart` (fixture, `navigation.json`, `PropsTable`), examples under
  `examples/stacked-area-chart/`: basic, forecast split, time axis, with `Legend`.
- A `chart-index` tile with a new thumb and an entry in `home.json`; heading becomes "Fourteen
  charts, one grammar" (refreshes the home baselines on both platforms).
- Sample data is fictional and in English.

## 8. Out of scope

100 % stacks, streamgraphs, smoothing, a target line, negative stacks, a horizontal orientation,
per-series fill, a built-in legend.

## 9. Decisions (owner, 2026-11-18)

1. **Points:** one point per x with every series and the total in the tooltip, as `LineChart`.
2. **Forecast split:** chart-level `forecastFrom` + `forecastLabel` with hatched layers (§3).
3. **End labels:** built in, on by default, all-or-none when they would overlap (§3).
4. **Negative values:** count as zero with a development warning.
5. **Missing values:** break every layer at that x.
6. **Version:** 1.3.0 with this chart alone.
