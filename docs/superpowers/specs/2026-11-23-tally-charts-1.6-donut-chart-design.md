# tally-charts 1.6 — DonutChart

Date: 2026-11-23. Status: draft for the owner's review. What the owner decided is listed in §9;
everything marked "author's call" is a default the owner has not seen in detail.

Design: the artboard "DonutChart" of the "tally-charts: nowe typy wykresów" canvas
(https://claude.ai/artifact/NrNdV95DyRP9m1NbgMdsVK; file `project/Donut.dc.html`).
Parent specs: `2026-10-14-tally-charts-design.md`, the 0.6–1.0 specs and the 1.1–1.5 chart specs.
Everything they require of a high-level chart (themes, a11y, reflow, forced colors, dev warnings,
size budgets, API report, i18n through `ChartMessages`) applies here unless this document says
otherwise.

## 1. Purpose

Show how one total splits into a few parts: revenue by service line, jobs by status, hours by
crew. The reader should see the total, the biggest part and roughly how much of the whole it
takes, and read exact values from the list next to the ring.

`DonutChart` is a high-level chart in `src/react/charts/`. Release: **1.6.0** (minor; additive
only).

Anti-goals: a rainbow of slice colours, more slices than a reader can tell apart, labels and
leader lines around the ring, a ring that is the only place where a value can be read.

## 2. API

```tsx
<DonutChart
  title="Revenue by service line"
  data={lines}            // one row per part
  x="line"                // part name
  y="revenue"             // part value
  format="currency-compact"
  centerLabel="total revenue"
/>
```

```ts
type DonutChartProps<D> = ChartName &
  Omit<ChartPassThroughProps<D>, 'aspectRatio' | 'height' | 'margin'> & {
    /** One row per part. */
    data: readonly D[]
    /** Part name. */
    x: Accessor<D, string>
    /** Part value. */
    y: Accessor<D, number>
    /** Part id. Default: the data index. */
    id?: Accessor<D, Id>
    /** Default 'accent'. The base tone of the slices; a fifth slice and the "Other" slice are neutral. */
    tone?: Tone
    /** Default 'number'. Formats part values and the total. */
    format?: FormatSpec
    /** Default 'value': largest part first. 'none' keeps the data order. */
    sort?: 'value' | 'none'
    /**
     * Default 5, from 2 to 5. With more parts than this, the smallest are summed into one
     * "Other" slice.
     */
    maxSlices?: number
    /** Outer diameter of the ring in px. Default 232. The ring shrinks in a narrower chart. */
    diameter?: number
    /** Text under the total in the centre, e.g. "total revenue". */
    centerLabel?: string
    /** The total in the centre. Default true. */
    showTotal?: boolean
    /** The list of parts. Default true. */
    legend?: boolean
    /** What each list row shows on the right. Default 'both' (value and percent). */
    legendValue?: 'both' | 'value' | 'percent'
    /** Default 'auto': the list right of the ring, under it when the chart is too narrow. */
    legendPosition?: 'auto' | 'right' | 'bottom'
    dataTable?: boolean | DataTableOptions
    tooltip?: ChartTooltip<D>
  }
```

Author's calls in the API:

- `x` / `y` name the part and its value, as in `FunnelChart` and `BarChart`.
- `legend` / `legendValue` use the names `ShareBar` already has.
- No per-slice tone or colour. The chart has one base tone; the order of the slices carries the
  rest.

Not in the API: a pie without a hole, a half ring, an inner-radius prop, a start angle, labels
on or around the ring, series (nested rings), a target, custom centre content, custom percent
formatting, per-slice tones.

## 3. Rendering

### Slices

- A row is a part when its value is a finite number > 0. Rows with a zero value are not drawn
  but stay in the data table. Other rows (missing, non-numeric, negative) are skipped with a
  development warning.
- Order: by value, largest first (ties keep the data order); `sort="none"` keeps the data order.
- With more parts than `maxSlices`, the first `maxSlices − 1` parts in that order are drawn and
  the rest are summed into the last slice, named "Other" (`ChartMessages`). With `sort="none"`
  the rest are still the smallest parts; the kept parts stay in data order and "Other" is last.
- Slices start at 12 o'clock and run clockwise.
- Ring: inner radius = 0.64 × outer radius (artboard: outer 100, inner 64 at 232 px, with a
  16 px margin for the outline). A 2 px gap in the surface colour separates neighbouring
  slices; a single slice is a full ring without a gap.
- A drawn slice is never shorter than 2 px along the outer edge; the room is taken from the
  largest slice.
- Slices are filled paths (`data-ch-part="donut-slice"`), not stroked circles, so forced colors
  and hit testing work as for bars.

### Colour

- One tone in steps: slice 1 is the base tone, the following slices are lighter steps of it,
  using the library's sequential ramp for that tone (`--ch-seq-5`, `-4`, `-3`, `-2` under
  `data-ch-seq-tone`; the ramp is already checked for contrast between neighbouring levels in
  both themes). No new tokens.
- When there are five slices, the fifth (the smallest part or "Other") is neutral (level 3 of
  the neutral ramp), as on the artboard. With four or fewer slices and no "Other", every slice
  is a step of the base tone; "Other" is always neutral.
- Colour is not the only carrier: the list repeats the slices in ring order with name, value
  and percent, and the active slice is linked to its row (see Active slice).

### Centre

- The total, formatted with `format` (28 px, weight 600, ink), and `centerLabel` under it
  (muted axis text). The total is the sum of all valid rows, "Other" included.
- When the total text (by the library's width estimate) is wider than the hole less 16 px, it
  is drawn at 20 px; when it still does not fit, it is not drawn. `centerLabel` wider than the hole less 16 px is cut with
  `truncateLabel` and keeps the full text in a `<title>`.
- `showTotal={false}` draws neither the total nor the label.

### List

- A list next to the ring, one row per slice in ring order: a swatch in the slice colour, the
  name, the value (muted) and the percent (weight 600), with a hairline between rows, as on the
  artboard. `legendValue` picks value, percent or both. It is drawn in the chart's SVG, as all
  chart text is (author's call: `<Chart>` has no slot for HTML beside the plot, and the server
  render must contain the list).
- Percent: whole percents by the largest remainder method, so they add up to 100; above 0 and
  rounding to 0 reads "<1%" (the helpers `ShareBar` uses).
- Rows are 40 px high. The value and percent columns are as wide as their widest text (by the
  library's width estimate); the name takes the rest and is cut with `truncateLabel` when it
  does not fit (full text in a `<title>`, the tooltip and the table). Values are never cut.
- `legend={false}` draws the ring alone, centred.

### Layout

- `'auto'`: the list is right of the ring (32 px gap, rows vertically centred on the ring) when
  the chart is at least `diameter + 32 + 220` px wide (484 px with the defaults); otherwise the
  ring is centred and the list is under it (8 px gap) at full width. `'right'` and `'bottom'`
  never switch.
- The ring is `diameter` wide, or the chart width when that is smaller. The chart's height
  follows its content (right: the taller of the ring and the list; bottom: ring + 8 + list);
  there is no `height` prop.
- The server render and the first client render use `initialWidth`, so they agree; the chart
  may switch after it is measured.

### Empty state

No valid rows, or a total of 0: the empty state, as other charts.

### Active slice

With `dimInactive` (default as in bar charts) the other slices and their swatches are dimmed;
the active row's name is drawn at weight 600. Text is never dimmed. The ring geometry does not
change.

## 4. Interaction and accessibility

- Every slice is one point, in ring order, "Other" included. Arrow Right / Down go to the next
  slice (clockwise), Left / Up to the previous one, Home / End to the ends.
- Pointer: the slice under the pointer, or the slice whose list row is under the pointer.
- Default tooltip, as segments of the library's tooltip pill: the name, the value, "42% of
  total".
- Announcement: "1 of 5, Installs, $773K, 42% of total".
- "Other" has no data row. It can be focused and hovered and shows the default tooltip;
  `onSelect` is not called for it and a function `tooltip` is not called for it (the default
  pill is shown). Its id is the string `'other'`; `onActiveChange` reports it with a point
  whose `datum` is `undefined`.
- Data table: one row per data row in data order (zero and skipped rows included, skipped with
  empty cells): the name, the value, the share. Parts inside "Other" keep their own rows.
- The list is part of the plot, which is hidden from assistive technology as in every chart;
  the data table and the announcements carry the values.
- Forced colors: slices are filled with the system colour of the tone, as bars are, with
  Canvas gaps; the active slice is `Highlight`. Slices then differ only by position, and the
  list swatches are drawn the same way, so the list order is the key.
- Reflow: at 320 CSS px the list is under the ring and nothing scrolls horizontally.

`ChartMessages` gains what the texts above need and nothing else. Expected: `other` ("Other"),
`ofTotal` ("of total"), `headerPart` ("Part"), `headerShare` ("Share"); `headerValue` and
`headerTotal` exist. The builder may adjust names to the file's conventions and reuse existing
keys with the same text.

## 5. Dev warnings

- A missing, non-numeric or negative value (`donut-value`).
- `maxSlices` outside 2–5 (`donut-max-slices`); the value is clamped.
- Repeated ids, as every chart with `id`.

## 6. Tests and gates

- Unit: geometry on a fixed size (angles from values, start at 12 o'clock, clockwise, gap,
  inner radius, a single full ring, the 2 px minimum), ordering and `sort="none"`, grouping
  into "Other" at the `maxSlices` limit (exactly `maxSlices` rows: no "Other"), ramp levels and
  the neutral fifth slice, percents ("<1%"), centre fitting (28 px, 20 px, hidden) and
  `showTotal`, list content and `legendValue`, layout switch at the threshold and the forced
  positions, skipped and zero rows with warnings, points, tooltip, announcement, keyboard,
  hover on a list row, active state, "Other" and callbacks, data table, SSR and hydration
  (server render before the `console.error` spy; a wide server render hydrated into a narrow
  container), a 60 px wide chart and a single row.
- Storybook stories (`light` and `dark`: the artboard; `few`: three parts; `bottom`: the list
  under the ring; `plain`: themeless defaults; `many`: nine parts grouped into "Other") with e2e
  gates: screenshots darwin + linux, axe, contrast, reflow at 320 CSS px, forced colors,
  keyboard.
- New size-limit entry `DonutChart` ≤ 15 KB gzip; `check:treeshake` fixture; other entries stay
  within their limits.
- `api:update`: the report gains `DonutChart`, `DonutChartProps` and the new `ChartMessages`
  keys, nothing else.
- Changeset: `minor`.

## 7. Docs

- Page `donut-chart` (fixture, `navigation.json`, `PropsTable`), examples under
  `examples/donut-chart/`: basic (the artboard), many parts grouped into "Other", list under
  the ring, ring alone with `legend={false}` beside a `Stat`.
- A `chart-index` tile with a new thumb and an entry in `home.json`; the heading becomes
  "Seventeen charts, one grammar" (refreshes the home baselines on both platforms).
- Cards switch layout between 375 and 1280 px, so their heights differ: the block heights and
  `NARROW_CHART_HEIGHTS` entries follow the rules in `CLAUDE.md`.
- `CLAUDE.md` and `PROGRESS.md` updated as for the previous charts.
- Sample data is fictional and in English.

## 8. Out of scope

Pie, half ring, nested rings, labels around the ring, per-slice tones or colours, a multi-hue
palette, animated transitions between data sets, drill-down into "Other".

## 9. Decisions

Owner (2026-11-23):

1. **Next chart:** DonutChart, as the artboard shows it: one tone in steps from largest to
   smallest, grey for the rest, the total in the centre, a list with value and percent beside
   the ring.

Author's calls (not yet confirmed by the owner): the whole API of §2 (`x` / `y`, `sort`,
`maxSlices` with automatic "Other", `diameter`, `centerLabel`, `showTotal`, the `legend*`
props), the built-in list instead of a composed `<Legend>`, at most five slices, the sequential
ramp for the steps and the neutral fifth slice, the list moving under the ring below 484 px,
the centre text shrinking and then hiding, dimming as the active state, "Other" being
focusable but not selectable, the list hidden from assistive technology while the data table
exists, the message keys, version 1.6.0 with this chart alone.
