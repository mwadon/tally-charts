# tally-charts 1.2 — StackedBarChart

Date: 2026-11-18. Status: approved by the owner (decisions in §9).

Design: the `StackedBarChart` artboard of the "tally-charts: nowe typy wykresów" canvas
(https://claude.ai/artifact/NrNdV95DyRP9m1NbgMdsVK).
Parent specs: `2026-10-14-tally-charts-design.md`, the 0.6–1.0 specs and
`2026-11-18-tally-charts-1.1-grouped-bar-chart-design.md`. Everything they require of a high-level
chart (themes, a11y, reflow, forced colors, dev warnings, size budgets, API report, i18n through
`ChartMessages`) applies here unless this document says otherwise.

## 1. Purpose

Show a total per category and what it is made of: monthly cost split into labor, materials and
subcontract; jobs per quarter split by crew. Today this needs `<Chart>` with one `<Bars from>`
layer per series, hand-computed running sums and hand-written hit areas.

`StackedBarChart` is a high-level chart on `<Chart>`, next to `GroupedBarChart` in
`src/react/charts/`. It takes the same wide rows and the same `BarSeries` array, so switching
between grouped and stacked is a change of component name. Release: **1.2.0** (minor; additive
only).

The artboard's own idea is the budget: the part of a stack above the target is drawn in `loss`,
whichever series it belongs to ("Coral is only the part above the $60k budget").

## 2. API

```tsx
<StackedBarChart
  title="Monthly cost against budget"
  data={months}
  x="month"
  series={[
    { id: 'labor', label: 'Labor', value: 'labor' },
    { id: 'materials', label: 'Materials', value: 'materials' },
    { id: 'subcontract', label: 'Subcontract', value: 'subcontract', tone: 'neutral' },
  ]}
  target={{ value: 60_000, label: 'budget $60k', over: 'loss' }}
  format="currency-compact"
/>
```

```ts
type StackedBarChartProps<D> = ChartName &
  ChartPassThroughProps<D> & {
    data: readonly D[]
    /** Category field: the band axis in both orientations. One row is one stack. */
    x: Accessor<D, string | number>
    /** One segment per series in every stack; the first series sits on the baseline. */
    series: readonly BarSeries<D>[]
    /** Row id. A segment's id is `${rowId}:${series.id}`. Default: the data index. */
    id?: Accessor<D, Id>
    /** Category label for tooltips, announcements and the data table. Defaults to `x`. */
    label?: Accessor<D, string>
    /** Default 'vertical'. */
    orientation?: 'vertical' | 'horizontal'
    /** Value domain. Default: every stack total and the target, including zero, nice ticks. */
    domain?: readonly [number, number]
    /**
     * A target value, optionally with a label. `over` paints the part of each stack beyond the
     * target in that tone (usually 'loss') and gives the total label the same tone.
     */
    target?: number | { value: number; label?: string; over?: Tone }
    /** Fill for every segment of a row; `undefined` keeps each series' own fill. */
    fill?: PerItem<D, Fill | undefined>
    /** 'total' labels each stack with its total. Default 'total'. */
    valueLabel?: 'total' | 'none'
    /** Format for value labels. Defaults to `format`. */
    valueFormat?: FormatSpec
    /** Format for tooltips, announcements and the data table. Default 'number'. */
    format?: FormatSpec
    axis?: TickSpec | 'none'
    axisFormat?: AxisFormat
    valueAxis?: TickSpec | 'none'
    valueAxisFormat?: AxisFormat
    /** Grid lines at the value ticks. Default true. */
    grid?: boolean
    /** Padding between stacks, 0–1 of the step. Default 0.3. */
    padding?: number
    /** Gap between the segments of a stack in px. Default 2. */
    gap?: number
    dataTable?: boolean | DataTableOptions
    tooltip?: ChartTooltip<D>
  }
```

Every prop shared with `GroupedBarChart` has the same name, type and default, except `valueLabel`
(`'total' | 'none'` instead of `'all' | 'none'`), `gap` (2 instead of 4, between segments) and
`target` (gains `over`). `BarSeries` is reused unchanged. `ChartPoint.seriesId` is set as in
`GroupedBarChart`.

Not in the API: 100 % stacks (`normalize`), per-segment value labels, a built-in legend, per-bar
tone functions, `color`, sorting, grouped-and-stacked.

## 3. Rendering

- Tone is the series, fill is the state, as in `GroupedBarChart`: same default tone order
  (`accent`, `accent-soft`, `warn`, `neutral`, `gain`, repeating), never `loss` by default; a
  row's `fill` wins over a series' `fill`.
- Stacking: series in array order from the zero baseline outwards. Positive values stack up
  (right when horizontal), negative values stack down from zero independently. A pure helper in
  `core/bars.ts` returns `{ from, to }` per segment and the row totals.
- Segment gap: `gap` px is taken from the far end of every segment except the outermost one, so
  the stack's total length stays exact. A segment not longer than the gap keeps 1 px. A zero value
  draws nothing and registers no point.
- Missing or non-numeric value: the segment is skipped and counts as zero in the total;
  development warning as in `Bars`.
- Total label: above the stack (beside it when horizontal), the sum of the row's finite values.
  With negative values the label shows the net sum above the positive stack. If any label is
  wider than the band (8 px per character, as in `GroupedBarChart`), none is drawn in the vertical
  orientation.
- `target.over`: the part of the positive stack beyond the target is painted in the `over` tone,
  solid, instead of the series' tone. A segment that crosses the target is split in two at the
  target, with the same gap between the parts. The total label of a stack over the target uses
  the tone's text colour (tone mixed with ink through `--ch-tone-text-mix`). Without `over`, the
  target is only a line. `over` ignores the negative stack.
- Corner radius: the `--ch-radius` token on every segment, as `Bars` draws it.
- Horizontal: label column on the left, automatic height `rows × (20 + 20) + margins` unless
  `height` or `aspectRatio` is set.
- Margins, value axis and grid: as `GroupedBarChart`.

Implementation sketch (not verified beyond reading `Bars`, `computeBars` and
`GroupedBarChart.tsx`): one decorative `<Bars from interactive={false}>` layer per series, with
`from` and the value accessor returning the running sums; when `over` is set, one more layer for
the over parts, and the series layers clamp at the target. An internal mark registers points, hit
areas and total labels. What `GroupedBarChart` and this chart share (`BarSeries`, default tones,
`VerticalGrid`, warnings for series ids) moves to a module under `charts/`; public exports do not
change.

## 4. Interaction and accessibility

- Every segment is a point, in visual order: stack by stack, from the baseline outwards. Arrow
  keys walk them in that order; Home / End as in `BarChart`.
- Hit area of a segment: the band extent `Bars` uses for its own hit areas by the segment's
  extent on the value axis. The outermost segment's area extends to the plot edge,
  the first one's to the baseline margin, so the whole column is covered.
- Default tooltip: the category, the series with its tone swatch and value, then the total:
  "Apr · Materials $21k · Total $66k". "Total" comes from the existing `ChartMessages.total`.
- Announcement: "Materials, 4 of 6, Apr, $21k" (the `GroupedBarChart` format).
- `dimInactive` dims every segment except the active one.
- Data table: one row per category; columns are the category, one per series and a last "Total"
  column (`headerTotal`).
- The over-target state is not colour-only: the total label and the target label are both text,
  and the table has the totals.
- Forced colors: as documented for `GroupedBarChart`; the gap keeps segments apart. The `over`
  part falls back to the system colour of its tone.
- Pointer targets: a thin segment is a small target. Keyboard and the data table reach every
  value; this is documented in `docs/a11y.md` as for `GroupedBarChart`.

## 5. Dev warnings

- A repeated series `id`; an empty `series` array (the chart renders its `empty` state).
- More than 5 series (tones repeat from 6).
- `target.over` with a target at or below zero.

## 6. Tests and gates

- Unit: the stacking helper (positive, negative, mixed, missing, zero, gap, split at the target);
  component tests for both orientations, fills, default tones, totals, labels fitting, `over`
  (split, label tone, none without `over`), ids and `seriesId` in callbacks, data table with the
  total column, dev warnings, SSR and hydration (server render before the `console.error` spy, as
  fixed for `GroupedBarChart` on the React 18 leg).
- Storybook stories (`light`, `dark`, `horizontal`, `negative`, `over-budget`) with e2e gates:
  screenshots darwin + linux, axe, contrast, reflow at 320 CSS px, forced colors, keyboard.
- New size-limit entry `StackedBarChart` ≤ 15 KB gzip; `check:treeshake` fixture;
  `GroupedBarChart` stays ≤ 15 KB after the shared module is extracted; `tally-charts/core`
  stays ≤ 8 KB.
- `api:update`: the report gains `StackedBarChart` and `StackedBarChartProps`, nothing else.
- Changeset: `minor`.

## 7. Docs

- Page `stacked-bar-chart` (fixture, `navigation.json`, `PropsTable`), examples under
  `examples/stacked-bar-chart/`: basic, over budget, horizontal, with `Legend`.
- A `chart-index` tile with a new thumb and an entry in `home.json`; heading becomes "Thirteen
  charts, one grammar" (refreshes the home baselines on both platforms).
- Sample data is fictional and in English.

## 8. Out of scope

100 % stacks, grouped-and-stacked, per-segment value labels, a built-in legend, sorting of series
or categories, bar width caps, `StackedAreaChart` (own spec).

## 9. Decisions (owner, 2026-11-18)

1. **Over-target colouring:** built in as `target.over` (§3). It is what the artboard is about,
   and users would otherwise compute a fourth "over" series and clamp the others by hand.
2. **Points:** one point per segment (§4), consistent with `GroupedBarChart` and `seriesId`; the
   tooltip carries the stack total.
3. **Negative values:** diverging stacks with the net sum as the label (§3).
4. **Value labels:** totals only.
5. **Version:** 1.2.0 with this chart alone.
