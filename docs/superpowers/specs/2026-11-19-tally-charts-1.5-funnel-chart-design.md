# tally-charts 1.5 — FunnelChart

Date: 2026-11-19. Status: draft for the owner's review. What the owner decided is listed in §9;
everything marked "author's call" is a default the owner has not seen in detail.

Design: the artboards "FunnelChart · A, one stream" and "FunnelChart · C, split by source" of
the "tally-charts: nowe typy wykresów" canvas
(https://claude.ai/artifact/NrNdV95DyRP9m1NbgMdsVK; files `project/FunnelStream.dc.html` and
`project/FunnelStreamSplit.dc.html`). The older artboard "FunnelChart" (rows of rectangles with a
hatched drop-out part) is **not** the design; the owner replaced it with the stream shape.
Parent specs: `2026-10-14-tally-charts-design.md`, the 0.6–1.0 specs and the 1.1–1.4 chart specs.
Everything they require of a high-level chart (themes, a11y, reflow, forced colors, dev warnings,
size budgets, API report, i18n through `ChartMessages`) applies here unless this document says
otherwise.

## 1. Purpose

Show how many items survive each step of a process: leads → site visits → quotes sent → quotes
accepted → jobs paid. The reader should see the funnel as one narrowing shape, read the count at
every step and spot the step that loses the most.

The owner asked for a chart that looks like a funnel: a smooth ribbon that narrows from step to
step, not a list of bars. `FunnelChart` is a high-level chart on `<Chart>`, in
`src/react/charts/`. Release: **1.5.0** (minor; additive only).

Anti-goals: gradients, a multi-colour palette, a shape whose thickness between steps suggests
data that does not exist (see the flat run in §3).

## 2. API

```tsx
// One stream
<FunnelChart
  title="From lead to paid job"
  data={steps}          // one row per step, in funnel order
  x="step"              // step name
  y="count"             // step value
/>

// Split into series
<FunnelChart
  title="From lead to paid job, by source"
  data={steps}
  x="step"
  series={[
    { id: 'referral', label: 'Referral', value: 'referral' },
    { id: 'website', label: 'Website', value: 'website' },
    { id: 'ads', label: 'Ads', value: 'ads' },
    { id: 'other', label: 'Other', value: 'other', tone: 'neutral' },
  ]}
/>
```

```ts
interface FunnelSeries<D> {
  /** Stable key of the series; unique within the chart. */
  id: string
  /** Name for the tooltip, announcements and the data table header. */
  label: string
  /** Value field of the series. */
  value: Accessor<D, number>
  /** Default: the next tone of the default order, as in `StackedBarChart`. */
  tone?: Tone
}

type FunnelChartProps<D> = ChartName &
  Omit<ChartPassThroughProps<D>, 'aspectRatio' | 'dimInactive'> & {
    /** One row per step, in funnel order. */
    data: readonly D[]
    /** Step name. */
    x: Accessor<D, string>
    /** Step id. Default: the data index. */
    id?: Accessor<D, Id>
    /** Default 'number'. Formats step values and series values. */
    format?: FormatSpec
    /**
     * Default 'auto': horizontal (steps left to right), vertical (steps top to bottom) when the
     * chart is too narrow for its steps.
     */
    orientation?: 'auto' | 'horizontal' | 'vertical'
    /** Default 'weakest': the lowest continue rate is drawn in the loss tone. */
    highlight?: 'weakest' | 'none'
    /**
     * Width in px of the label column of a vertical funnel. Default 128. A vertical `margin.left`
     * adds room left of this column.
     */
    labelWidth?: number
    dataTable?: boolean | DataTableOptions
    tooltip?: ChartTooltip<D>
  } & (
    | { /** Step value. */ y: Accessor<D, number>; /** Default 'accent'. */ tone?: Tone; series?: undefined }
    | { series: readonly FunnelSeries<D>[]; y?: undefined; tone?: undefined }
  )
```

`y` and `series` are exclusive. With `series`, the value of a step is the sum of its series
values.

Author's calls in the API:

- Series entries use the library's existing shape (`id`, `label`, `value`, `tone`), not the
  `key` sketched in the conversation. No `fill`: a hatched ribbon is not drawn.
- Default series tones follow the library's default order (accent, accent-soft, warn, neutral,
  gain; `seriesTones` in `bar-series.tsx`), **not** the accent tint steps of artboard C. The
  library has no tint-step tokens, and every other series chart uses this order. The docs
  example sets tones explicitly.
- `x` / `y` keep their names in both orientations, as in `BarChart`.

Not in the API: `dimInactive` (nothing on this chart dims, see Active step), a built-in legend (compose `<Legend>`), a target, a second measure, percent of
the first step drawn in the header (it is in the tooltip), custom percent formatting, a
right-to-left or bottom-to-top funnel, the rectangle-and-hatch look of the old artboard.

## 3. Rendering

Terms: *step line* is the position of a step along the funnel; *thickness* is the size of the
ribbon across the funnel.

### Horizontal

- The plot length is divided into equal columns, one per drawn step; step line `i` is at the
  start of column `i`. The last step runs flat to the end of the plot.
- Header above the ribbon, one per step, left-aligned 8 px after the step line (at the plot edge
  for the first step): the value (18 px, weight 600, ink), the step name (muted axis text) and,
  from the second step, the continue rate (12 px, ink). The header takes the top of the figure;
  the ribbon gets the rest.
- Guide: a 1 px line in the grid colour at every step line except the first, from the top of
  the header to the bottom of the plot (`data-ch-part="funnel-guide"`). Where it crosses the
  ribbon it is drawn in the surface colour at reduced opacity, as on the artboard.
- Default height 280.

### Vertical

- Steps run top to bottom; the ribbon narrows downwards and is centred in the space right of
  the labels.
- Labels sit left of the ribbon, one block per step, top-aligned to its step line: the step
  name (13 px, ink), then on one line the value (13 px, weight 600) and the continue rate
  (12 px). The label column is `labelWidth` wide (default 128, as the fixed label columns of
  `RankedBars` and `StripPlot`; the library does not measure text). A name wider than the
  column is cut with `truncateLabel` and carries the full text in a `<title>`. A user
  `margin.left` adds room left of the column (left margin = `labelWidth` + `margin.left`); the
  labels stay at `-labelWidth`, and guides and hit rects run from the figure's left edge.
- Guides are horizontal, at every step line except the first, across labels and ribbon.
- Each step takes 64 px; the default height is the sum plus margins (automatic height, as the
  horizontal `BarChart`). An explicit `height` divides the space evenly instead.

### Orientation

`'auto'` draws vertical when the plot length available per step is under 96 px, or when any
value or rate in the header (by the library's width estimate in `core/text.ts`, scaled to the
font size) is wider than its column less 12 px; otherwise horizontal (author's call). Step
names do not trigger the switch: a name wider than its column is cut. The
server render and the first client render use `initialWidth`, so they agree; the chart may
switch after it is measured. `'horizontal'` and `'vertical'` never switch. A horizontal step name wider than its column less 12 px is cut with
`truncateLabel` (full text in a `<title>`, the tooltip and the table). Values and rates are
never cut; in a forced horizontal chart they may run into the next column, which is the
caller's choice when forcing the orientation.

### Ribbon

- Thickness at a step line is proportional to the step value; the largest step fills the
  available thickness. The ribbon is symmetric around the centre line.
- After each step line the ribbon stays flat for 20 % of the column, then eases to the next
  thickness with a cubic curve whose two control points sit at the midpoint of the remaining
  run, level with the start and the end. The flat run shows where the measured value is; the
  curve is only a transition.
- A positive step value never draws thinner than 2 px. The minimum applies to the whole
  ribbon, not to single layers: with series, the layers share the ribbon's thickness in
  proportion to their values. A zero step draws nothing at its step line; a series whose value
  is zero at both ends of a run draws no path there (no stray separator stroke).
- A step larger than the one before it simply draws wider; nothing marks it.
- One stream: a single path in `tone` (`data-ch-part="funnel-area"`).
- Series: one path per series, stacked across the ribbon in series order (first series on top
  in horizontal, on the left in vertical), each in its tone, with a 1 px surface-coloured
  stroke (round join) between layers. The whole stack is symmetric around the centre line;
  single layers are not. An `accent-soft` stream or outer layer gets an inked edge on the outer
  side of the ribbon, as `StackedAreaChart` draws `area-edge`; inner layers get none.
- No gradients. The ribbon fades in like `[data-ch-part="area"]` (its selector joins that rule
  in `theme.css`); reduced motion is already global.
- Artboard measures for the 280 px figure: header 70 px (text baselines at 16, 33 and 50 px),
  ribbon up to 200 px, 10 px below; the guide over the ribbon is the surface colour at 0.45
  opacity.

### Values and percents

- A row is a step when its value (or every series value) is a finite number ≥ 0. Other rows are
  skipped with a development warning; the chart draws as if they were not in the data.
- Continue rate of a step = its value ÷ the value of the previous drawn step, as a whole
  percent. Above 0 and under 0.5 % it reads "<1%". When the previous value is 0 there is no
  rate.
- Weakest step: the lowest continue rate; on a tie, the first. With `highlight="weakest"` and at
  least three drawn steps, that rate is drawn in the loss text colour (loss mixed with ink
  through `--ch-tone-text-mix`) at weight 600. Nothing else changes colour.
- No drawn steps: the empty state, as other charts.

### Active step

The guide of the active step is drawn in ink at 1.5 px, over the ribbon too (the first step
gets a guide while it is active). Nothing else changes: the ribbon never does, and headers
and labels are never dimmed (dimmed text would fall under the 4.5:1 contrast the library keeps
for all text; no other chart dims text). So `dimInactive` is not part of FunnelChart's API.

## 4. Interaction and accessibility

- Every drawn step is one point, in data order, in both modes (series are not separate points).
  Arrow keys step through it, Home / End jump to the ends. In vertical orientation Up / Down
  follow the screen.
- Pointer: the step whose column (horizontal) or row (vertical) is under the pointer, through
  private per-step hit rects (as `GroupedBarChart`); `NearestPointer` gets no new axis.
- Default tooltip, as segments of the library's tooltip pill: the step name; the value; from
  the second step "65% of previous step" and "21% of first step"; with series, one segment per
  series with its value and tone, in series order.
- Announcement: "3 of 5, Quotes sent, 532, 66% of previous step". With series the series values
  follow.
- Data table: one row per data row in data order (skipped rows included, with empty cells): the
  step name, the value (with series: one column per series, then the total) and the continue
  rate.
- Tone is not the only carrier: the weakest step is also the lowest number in the header and the
  table; series are named in the tooltip, the table and a composed `<Legend>`.
- Forced colors: the ribbon and its layers are filled with the system colour of their tone, as
  bars are, with Canvas separators; the active guide is `Highlight`.
- Reflow: at 320 CSS px the chart is vertical under `'auto'` and has no horizontal scroll.

`ChartMessages` gains what the texts above need and nothing else. Expected: `headerStep`
("Step"), `headerContinued` ("Continued"), `ofPreviousStep` ("of previous step"),
`ofFirstStep` ("of first step"); `headerValue` and `headerTotal` exist. The builder may adjust
names to the file's conventions.

## 5. Dev warnings

- A missing, non-numeric or negative value (`funnel-value`).
- Both `y` and `series`, or neither (`funnel-input`); the chart shows the empty state.
- An empty series list and repeated series ids (`warnSeries`), repeated ids as every chart with
  `id`.

## 6. Tests and gates

- Unit: geometry on a fixed size (step lines, thickness from value, the flat run, minimum
  thickness, zero, a growing step), both orientations and the auto switch at the threshold,
  series stacking and tones, percents (rounding, "<1%", previous zero), weakest step (tie, two
  steps, `highlight="none"`), skipped rows and warnings, points, tooltip, announcement,
  keyboard in both orientations, active state (nothing dims), data table in both modes, SSR and
  hydration (server render before the `console.error` spy), a 60 px wide chart and a single
  step.
- Storybook stories (`light` and `dark`: artboard A; `series`: artboard C with a `Legend`;
  `vertical`; `plain`: themeless defaults; `many`: eight steps) with e2e gates: screenshots
  darwin + linux, axe, contrast, reflow at 320 CSS px, forced colors, keyboard.
- New size-limit entry `FunnelChart` ≤ 15 KB gzip; `check:treeshake` fixture; other entries
  stay within their limits.
- `api:update`: the report gains `FunnelChart`, `FunnelChartProps`, `FunnelSeries` and the new
  `ChartMessages` keys, nothing else.
- Changeset: `minor`.

## 7. Docs

- Page `funnel-chart` (fixture, `navigation.json`, `PropsTable`), examples under
  `examples/funnel-chart/`: basic, by source with `Legend`, forced vertical, custom format.
- A `chart-index` tile with a new thumb and an entry in `home.json`; the heading becomes
  "Sixteen charts, one grammar" (refreshes the home baselines on both platforms).
- Cards switch orientation between 375 and 1280 px, so their heights differ: the block heights
  and `NARROW_CHART_HEIGHTS` entries follow the rules in `CLAUDE.md`.
- `CLAUDE.md` and `PROGRESS.md` updated as for the previous charts.
- Sample data is fictional and in English.

## 8. Out of scope

The rectangle-and-hatch funnel, a drop-out mark, gradients, targets, a built-in legend,
time-based funnels, cohort comparison (two funnels in one chart), right-to-left layout.

## 9. Decisions

Owner (2026-11-19):

1. **Shape:** the smooth horizontal stream of artboard A is the default look; artboard C (the
   stream split into series) is an option.
2. **Narrow screens:** the funnel turns vertical.
3. **Usage as sketched in the conversation:** `data` / `x` / `y` or `series`,
   `orientation="auto"` with both forced values, percent against the previous step, the weakest
   step in the loss colour with `highlight="none"` to turn it off, keyboard over steps, tooltip
   with value, percent of previous and percent of first, plus the series breakdown, and the
   usual data table, `format`, forced colors and SSR.
4. **Out:** the old rectangle mockup with the hatched drop-out, gradients, any special mark for
   a step that grows.

Author's calls (not yet confirmed by the owner): the series entry shape and default series
tones (§2), the 96 px switch threshold and 64 px per vertical step (§3),
the fixed `labelWidth` column (a new prop), `'auto'` also
switching on header text that does not fit, the 2 px minimum on the whole ribbon, the active
state being the guide alone (`dimInactive` is not part of FunnelChart's API), the three-step rule for the highlight, skipping invalid rows, the active
state, one point per step in series mode, the message keys, version 1.5.0 with this chart alone.
