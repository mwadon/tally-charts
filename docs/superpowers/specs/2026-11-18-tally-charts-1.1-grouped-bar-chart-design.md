# tally-charts 1.1 — GroupedBarChart

Date: 2026-11-18. Status: approved by the owner (decisions in §9).

Design: the `GroupedBarChart` artboard of the "tally-charts: nowe typy wykresów" canvas
(https://claude.ai/artifact/NrNdV95DyRP9m1NbgMdsVK).
Parent specs: `2026-10-14-tally-charts-design.md` and the 0.6–1.0 specs. Everything they require
of a high-level chart (themes, a11y, reflow, forced colors, dev warnings, size budgets, API
report, i18n through `ChartMessages`) applies here unless this document says otherwise.

## 1. Purpose

Compare a few series side by side within each category: jobs per crew per quarter, revenue per
service line per month. Today this needs `<Chart>` with one `<Bars size offset>` layer per series
and hand-written hit areas, because a `Bars` hit area covers the whole band. `BarChart` draws one
series; `ComparisonBars` is fixed to a plan/actual pair in rows.

`GroupedBarChart` is a high-level chart on `<Chart>`, next to `BarChart` in `src/react/charts/`.
It is the first of the chart types SPEC §4 deferred to 1.x. Release: **1.1.0** (minor; additive
only).

Rejected:

- A `series` prop on `BarChart`. Its defaults (`fill` history then solid, `valueLabel: 'last'`,
  per-bar `tone`) mean something else once there are several series, so half of its props would
  change meaning depending on another prop.
- Long-form data (`x`, `y` and a `series` accessor over one row per bar). `LineChart` already
  takes wide rows and a `series` array; two conventions for the same idea is worse than one.

## 2. API

```tsx
<GroupedBarChart
  title="Jobs completed by crew"
  data={quarters}
  x="quarter"
  series={[
    { id: 'north', label: 'North', value: 'north' },
    { id: 'south', label: 'South', value: 'south' },
    { id: 'west', label: 'West', value: 'west', tone: 'neutral' },
  ]}
  fill={(d) => (d.forecast ? 'hatch' : undefined)}
/>
```

```ts
interface BarSeries<D> {
  /** Stable key of the series; unique within the chart. */
  id: string
  /** Name for the tooltip, announcements and the data table header. */
  label: string
  value: Accessor<D, number>
  /** Default: the next tone of the default order (§3). */
  tone?: Tone
  /** Default 'solid'. */
  fill?: Fill
}

type GroupedBarChartProps<D> = ChartName &
  ChartPassThroughProps<D> & {
    data: readonly D[]
    /** Category field: the band axis in both orientations. One row is one group. */
    x: Accessor<D, string | number>
    /** One bar per series in every group, in this order. */
    series: readonly BarSeries<D>[]
    /** Row id. A bar's id is `${rowId}:${series.id}`. Default: the data index. */
    id?: Accessor<D, Id>
    /** Category label for tooltips, announcements and the data table. Defaults to `x`. */
    label?: Accessor<D, string>
    /** Default 'vertical'. */
    orientation?: 'vertical' | 'horizontal'
    /** Value domain. Default: every series and the target, including zero, rounded to nice ticks. */
    domain?: readonly [number, number]
    target?: number | { value: number; label?: string }
    /**
     * Fill for every bar of a row, e.g. 'hatch' for a forecast period. `undefined` keeps each
     * series' own fill. Default: undefined.
     */
    fill?: PerItem<D, Fill | undefined>
    /** 'all' labels every bar when the labels fit (§3). Default 'all'. */
    valueLabel?: 'all' | 'none'
    /** Format for value labels. Defaults to `format`. */
    valueFormat?: FormatSpec
    /** Format for tooltips, announcements and the data table. Default 'number'. */
    format?: FormatSpec
    /** Category axis ticks, or 'none'. Default: every category. */
    axis?: TickSpec | 'none'
    axisFormat?: AxisFormat
    /** Value axis ticks, or 'none'. Default: nice ticks. */
    valueAxis?: TickSpec | 'none'
    valueAxisFormat?: AxisFormat
    /** Grid lines at the value ticks. Default true. */
    grid?: boolean
    /** Padding between groups, 0–1 of the step. Default 0.3. */
    padding?: number
    /** Gap between the bars of a group in px. Default 4. */
    gap?: number
    dataTable?: boolean | DataTableOptions
    tooltip?: ChartTooltip<D>
  }
```

Naming follows `BarChart`: `x` is always the category, so the axes are `axis` (category) and
`valueAxis`, not `xAxis` / `yAxis`, which would swap meaning with `orientation`. `BarSeries` is
named for reuse by the planned `StackedBarChart`.

One additive change outside the component: `ChartPoint` gains `seriesId?: string`, so `onSelect`
and `onActiveChange` can tell the series without parsing the id. `point.datum` is the user's row,
`point.series` the series label.

Not in the API: a built-in legend (compose `<Legend>`, as with `LineChart`), per-bar `tone`
functions (tone is the series' identity), `color`, sorting, a second value scale.

## 3. Rendering

- Tone is the series, fill is the state. A row's `fill` (forecast, plan) applies across the group,
  so a hatched quarter reads as one thing; a series' `fill` marks a whole series (e.g. last year
  as `'hatch-fade'`). The row's `fill` wins when it returns a value.
- Default tones by series position: `accent`, `accent-soft`, `warn`, `neutral`, `gain`, then
  repeating. This is `ShareBar`'s order. Never `loss`: it is only ever chosen explicitly.
- Layout: the band scale places groups (`padding`); inside a band the bars share the width,
  `barSize = (bandwidth − gap × (n − 1)) / n`, in `series` order (left to right, or top to bottom
  when horizontal). A pure helper in `core/bars.ts` computes the slots.
- A missing or non-numeric value leaves its slot empty; the other bars keep their positions.
  Development warning as in `Bars`. Negative values draw below the zero baseline.
- Value labels sit above each bar (beside it when horizontal). If any label is wider than its
  slot (estimated with `CHAR_WIDTH`), no label is drawn at that width: values stay in the tooltip
  and the data table. At 320 CSS px with 4 groups of 3 the bars are about 14 px wide, so labels
  drop out there.
- Hatched bars use the existing pattern per tone, with the 1 px tone outline `theme.css` already
  draws.
- Horizontal: label column on the left, automatic height
  `rows × (n × 16 + (n − 1) × gap + 20) + margins` unless `height` or `aspectRatio` is set.
- Margins default to room for the value axis (left 40 when shown) and the category axis.

Implementation sketch (not verified against the code beyond reading it): one `<Bars>` per series
with `size`, `align="start"`, `offset`, `interactive={false}` and the composite id, plus an
internal mark that registers the points and draws one hit slice per bar (the bar's slot, full plot
height, reaching into the margins). `Bars` itself does not change.

## 4. Interaction and accessibility

- Every bar is a point. Points register in visual order; arrow keys walk them in that order
  (no `PointGroup`). Home / End as in `BarChart`.
- Default tooltip: the category, then the series label with its tone swatch and the formatted
  value: "Q3 · North 55".
- Announcement: "North, 3 of 4, Q3, 55" (series first, then the position within the series, as
  `ChartPoint.series` defines, then the category and the value).
- `dimInactive` dims every bar except the active one.
- Data table: one row per category; columns are the category and one per series, with the series
  label as the header.
- Forced colors: tones collapse to system colors, so series are told apart by position only. The
  gap between bars keeps them separate. Documented as a limit; the data table carries the values.

## 5. Dev warnings

- More than 4 series (bars get thin; from 6, tones repeat).
- A repeated series `id`.
- An empty `series` array (the chart renders its `empty` state).

## 6. Tests and gates

- Unit: slot helper in `core`; component tests for layout in both orientations, fills (row over
  series), default tones, missing values, label fitting, ids and `seriesId` in callbacks, data
  table, dev warnings, SSR and hydration.
- Storybook stories with e2e gates (screenshots darwin + linux in both themes, axe, contrast,
  reflow at 320 CSS px, forced colors, keyboard).
- New size-limit entry `GroupedBarChart` ≤ 15 KB gzip; `check:treeshake` fixture for it;
  `tally-charts/core` stays ≤ 8 KB.
- `api:update`: the report gains `GroupedBarChart`, `GroupedBarChartProps`, `BarSeries` and
  `ChartPoint.seriesId`, nothing else.
- Changeset: `minor`.

## 7. Docs

- Page `grouped-bar-chart` (fixture, `navigation.json`, `PropsTable`, so API coverage stays
  full), examples under `examples/grouped-bar-chart/`: basic, forecast row, horizontal, with
  `Legend`.
- A `chart-index` tile with a new thumb in `chart-thumbs.tsx` and an entry in `home.json`
  (refreshes the home baselines on both platforms).
- Sample data is fictional and in English.

## 8. Out of scope

Stacked bars (own spec, shares `BarSeries`), grouped-and-stacked, per-bar tone or color functions,
a built-in legend, long-form data, sorting, bar width caps, a second value scale.

## 9. Decisions (owner, 2026-11-18)

1. **Default tone order:** `ShareBar`'s (`accent`, `accent-soft`, `warn`, `neutral`, `gain`), one
   rule across the library. The artboard's `neutral` third is set explicitly in the example.
2. **Value axis and grid:** on by default, as designed; `valueAxis="none"` and `grid={false}`
   give the `BarChart` look.
3. **`ChartPoint.seriesId`:** added.
4. **Missing values:** the slot stays empty with a development warning, as in `Bars`.
5. **Version:** 1.1.0 with this chart alone; `StackedBarChart` follows in a later minor.
