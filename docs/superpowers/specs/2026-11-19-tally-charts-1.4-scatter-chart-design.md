# tally-charts 1.4 — ScatterChart

Date: 2026-11-19. Status: approved by the owner, who asked for the recommended option on every
open decision (§9).

Design: the `ScatterChart` artboard ("Proposed · ScatterChart (size = bubble)") of the
"tally-charts: nowe typy wykresów" canvas (https://claude.ai/artifact/NrNdV95DyRP9m1NbgMdsVK).
Parent specs: `2026-10-14-tally-charts-design.md`, the 0.6–1.0 specs and the 1.1–1.3 chart specs.
Everything they require of a high-level chart (themes, a11y, reflow, forced colors, dev warnings,
size budgets, API report, i18n through `ChartMessages`) applies here unless this document says
otherwise.

## 1. Purpose

Show how two measures of the same items relate: job size against margin, crew size against days
late. Optionally a third measure as the area of each point (a bubble chart). Today this needs
`<Chart>` with two linear scales, hand-placed `<Dots>` and hand-written tooltips; `StripPlot` and
`DotHistogram` place dots along one value axis only.

`ScatterChart` is a high-level chart on `<Chart>`, in `src/react/charts/`. It is the library's
first chart with a value scale on both axes. Release: **1.4.0** (minor; additive only).

The artboard's own idea: the bubbles under the margin target are drawn in `loss`, and bubbles are
translucent with an outline so that overlapping ones stay readable.

## 2. API

```tsx
<ScatterChart
  title="Job size against margin"
  data={jobs}
  x="estimate"
  y="margin"
  size="hours"
  label="name"
  xLabel="Estimate"
  yLabel="Margin"
  sizeLabel="Hours"
  xFormat="currency-compact"
  yFormat={(v) => `${v}%`}
  sizeFormat={(v) => `${v} h`}
  tone={(job) => (job.margin < 32 ? 'loss' : 'accent')}
  target={{ value: 32, label: 'target 32%' }}
/>
```

```ts
type ScatterChartProps<D> = ChartName &
  Omit<ChartPassThroughProps<D>, 'aspectRatio'> & {
    data: readonly D[]
    /** Horizontal position: a number per row. */
    x: Accessor<D, number>
    /** Vertical position: a number per row. */
    y: Accessor<D, number>
    /**
     * A third measure drawn as the area of each point (a bubble chart). Without it every point
     * is a dot of `radius`.
     */
    size?: Accessor<D, number>
    /** Point id. Default: the data index. */
    id?: Accessor<D, Id>
    /** Item name for tooltips, announcements and the data table. */
    label?: Accessor<D, string>
    /** Default 'accent'. */
    tone?: PerItem<D, Tone>
    /**
     * Name of the x measure: in tooltips, announcements and the data table header, and drawn
     * under the x axis when set. Default for the texts: the field name in sentence case, or "X".
     */
    xLabel?: string
    /** As `xLabel`, for y; drawn above the y axis when set. Default: the field name, or "Y". */
    yLabel?: string
    /** As `xLabel`, for `size`; never drawn. Default: the field name, or "Size". */
    sizeLabel?: string
    /** Default 'number'. */
    xFormat?: FormatSpec
    /** Default 'number'. */
    yFormat?: FormatSpec
    /** Default 'number'. */
    sizeFormat?: FormatSpec
    /** Default: the range of x including zero, rounded to nice ticks. */
    xDomain?: readonly [number, number]
    /** Default: the range of y and the target, including zero, rounded to nice ticks. */
    yDomain?: readonly [number, number]
    /** Dot radius in px when `size` is not set. Default 5. */
    radius?: number
    /** Radius in px of the bubble with the largest `size`. Default 18. */
    maxRadius?: number
    /** A horizontal target line on y, optionally with a label. */
    target?: number | { value: number; label?: string }
    xAxis?: TickSpec | 'none'
    /** Default: `xFormat`. */
    xAxisFormat?: AxisFormat
    yAxis?: TickSpec | 'none'
    /** Default: `yFormat`. */
    yAxisFormat?: AxisFormat
    /** Horizontal grid lines at the y ticks. Default true. */
    grid?: boolean
    dataTable?: boolean | DataTableOptions
    tooltip?: ChartTooltip<D>
  }
```

`ChartMessages` gains `headerX` ("X"), `headerY` ("Y") and `headerSize` ("Size"): the fallback
names when an accessor is a function and no `xLabel` / `yLabel` / `sizeLabel` is set.

Not in the API: a `series` array (tone is per item, as in `BarChart`; compose `<Legend>`), a
vertical target (compose `<Target x>` as a child), a trend line, a log scale, a time scale on x
(`LineChart` has it), a shared size scale between charts (`sizeDomain`), a vertical grid, point
labels drawn in the plot, clustering or jitter, brushing and zoom.

## 3. Rendering

- Scales: linear on both axes. Default domains come from the drawn rows, include zero and are
  rounded to nice ticks (the `<Chart>` default, and what the artboard shows); `xDomain` and
  `yDomain` replace them. The default y domain also covers the target.
- A row is drawn when its x and y are finite and inside the domains and, with `size` set, its
  size is finite and not negative. Other rows are skipped: a development warning for a missing or
  non-numeric x, y or size and for a negative size; no warning for a point outside an explicit
  domain.
- Points: a circle per row (`data-ch-part="bubble"`), filled with its tone at 22 % over the
  surface and outlined 1.5 px in the tone, with or without `size`. An `accent-soft` point gets the
  inked outline that other `accent-soft` marks have.
- Size: the area is proportional to the value: `r = maxRadius × √(size / largest size)`, never
  less than 3 px. The largest size is taken over all valid rows, including rows outside an
  explicit domain, so sizes do not change when a domain narrows. Without `size`, `r = radius`.
  A non-finite `radius` or `maxRadius` falls back to the default (5 / 18). A chart whose sizes are
  all zero draws 3 px dots.
- Draw order: larger bubbles first, so a small bubble is never hidden behind a large one.
- Points are not clipped: a bubble at the edge of the domain reaches into the margin.
- Target: the line as `Target` draws it, under the bubbles. Its label sits outside the plot, in
  the right margin centred on the line, as in `StackedBarChart` (inside the plot it would land on
  bubbles); the right margin grows to fit it. A target outside the y domain draws nothing.
- Axis names: `yLabel` is drawn above the y axis, left-aligned to the figure's left edge;
  `xLabel` under the x tick labels, right-aligned to the plot's right edge
  (`data-ch-part="axis-title"`, the muted axis text style). The top and bottom margins grow by
  the line they take. Neither is drawn when its axis is `'none'`.
- Grid: horizontal lines at the y ticks. Height: 280 by default.
- Active point: solid fill in its tone, a 2 px surface-coloured stroke and a ring in the tone
  3 px outside it (`bubble-ring`); with `dimInactive`, the others dim.

## 4. Interaction and accessibility

- Every drawn row is a point. Keyboard order follows the screen: left to right on screen, then bottom to top; data order for
  equal positions (also on reversed domains). Arrow keys step through
  it, Home / End jump to the ends.
- Pointer: the nearest point centre within `max(24, maxRadius + 6)` px (or `radius + 6` without
  `size`).
- Default tooltip: the item name, then each measure with its name: "Harbor Lofts · Estimate $68K
  · Margin 12% · Hours 410 h"; the y value carries the point's tone.
- Announcement: "3 of 16, Harbor Lofts, Estimate $68K, Margin 12%, Hours 410 h". Without `label`
  the name is left out; without `size` the last part is.
- Data table: one row per data row, in data order (skipped rows included, with empty cells for
  missing values): the name (when `label` is set), x, y and, with `size`, the size.
- Tone is not the only carrier of a state: values are in the tooltip, the announcement and the
  table; a legend is composed with `<Legend>`.
- Forced colors: bubbles keep an outline in the system colour of their tone and a Canvas fill;
  the active bubble is solid `Highlight` (its fill is in the stylesheet, not inline) with a
  Canvas stroke, and its ring is `Highlight`.
- Pointer targets: small dots are small targets; the pointer snaps to the nearest one, and the
  keyboard and the table reach every value (documented in `docs/a11y.md`).

## 5. Dev warnings

- A missing or non-numeric x or y (`scatter-value`); a missing, non-numeric or negative size
  (`scatter-size`).
- Repeated ids, as every chart with `id`.

## 6. Tests and gates

- Unit: geometry on fixed domains (positions, radius from area, minimum radius, draw order),
  tones (constant, function), skipped rows and warnings, default and explicit domains, target
  (line, label in the margin, domain), axis names and margins, points (order, labels, segments,
  ids, `onSelect` datum), tooltip, keyboard, active state and dimming, data table, SSR and
  hydration (server render before the `console.error` spy), a 60 px wide chart and a single row.
- Storybook stories (`light` and `dark`: the artboard; `dots`: no `size`; `plain`: themeless
  defaults; `dense`: many overlapping points) with e2e gates: screenshots darwin + linux, axe,
  contrast, reflow at 320 CSS px, forced colors, keyboard.
- New size-limit entry `ScatterChart` ≤ 15 KB gzip; `check:treeshake` fixture; other entries
  stay within their limits.
- `api:update`: the report gains `ScatterChart`, `ScatterChartProps` and the three
  `ChartMessages` keys, nothing else.
- Changeset: `minor`.

## 7. Docs

- Page `scatter-chart` (fixture, `navigation.json`, `PropsTable`), examples under
  `examples/scatter-chart/`: basic dots, bubbles against a target, explicit domains, with
  `Legend`.
- A `chart-index` tile with a new thumb and an entry in `home.json`; heading becomes "Fifteen
  charts, one grammar" (refreshes the home baselines on both platforms).
- Sample data is fictional and in English.

## 8. Out of scope

Series arrays and a built-in legend, trend lines, log and time scales, a size legend, point
labels in the plot, brushing, zoom, clustering.

## 9. Decisions (owner: "as recommended", 2026-11-19)

1. **Tone:** per item (`tone` as a value or a function), as `BarChart`; no `series` array and no
   `target.under`. The under-target colouring of the artboard is one line of user code.
2. **One point style:** translucent fill with an outline for dots and bubbles alike.
3. **Size:** area proportional to the value from zero, `maxRadius` 18, minimum 3 px; no
   `sizeDomain`.
4. **Domains:** include zero by default on both axes; `xDomain` / `yDomain` override.
5. **Axis names:** `xLabel` / `yLabel` name the measures in texts and are drawn at the axes when
   set.
6. **Target:** horizontal on y only, label outside the plot as in `StackedBarChart`.
7. **Pointer:** nearest centre, reusing `NearestPointer`; no per-bubble hit shapes.
8. **Version:** 1.4.0 with this chart alone.
9. **Size scale under explicit domains:** stable (final review).
10. **Keyboard order:** screen order, also on reversed domains (final review).
