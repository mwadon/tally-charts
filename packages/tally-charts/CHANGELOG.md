# tally-charts

## 1.0.0-rc.0

### Major Changes

- 0110f67: `Area` and `LineChart` no longer join the line, band or area across a date that isn't a date or
  across a missing value. They break there, as `Line` and `Band` already did: a series with a bad
  date in the middle draws two segments instead of one. `Area` also breaks at a missing `y`, and
  `between` skips a pair that touches a gap. `Line`, `Band` and `Area` now warn once per series on a
  time axis, not once per chart. `LineChart` skips the row as before (it stays out of the tooltip,
  the keyboard and the data table) and breaks every line and the band after the row before it in
  data order. With unsorted data that is the row before it in the data, not in date order, so the
  break can fall between two other dates: sort the rows first, or drop the invalid ones.
  
  Also: the highlighted axis label (for example the last column of a `BridgeChart`) now stays when
  the axis thins its labels on a narrow chart.
  
  Migration: filter the rows before you pass them to keep the old joined line.
  
  Before (the line joined across the row with the invalid date):
  
  ```tsx
  <LineChart data={rows} x={{ type: 'time', field: 'date' }} series={series} />
  ```
  
  After (drop the rows with an invalid date first):
  
  ```tsx
  <LineChart
    data={rows.filter((r) => !Number.isNaN(new Date(r.date).getTime()))}
    x={{ type: 'time', field: 'date' }}
    series={series}
  />
  ```
  
  The same filter keeps an `Area` joined: `<Area data={rows.filter(isValid)} />`. For a missing
  value, filter out the rows whose value is `null` or `NaN`.
  
  See the migration guide: https://tally-charts-docs.vercel.app/docs/migration-1-0
- 91cc9c0: RankedBars: the default `fill` changes from `'hatch'` to `'solid'`. In the library, solid is an
  actual value and hatch is a plan or reference, so a bare `<RankedBars>` now draws solid bars.
  
  Migration: RankedBars: pass `fill="hatch"` to keep the old look.
  
  Before (hatched bars):
  
  ```tsx
  <RankedBars data={causes} label="name" value="amount" />
  ```
  
  After (add `fill="hatch"` for the same look):
  
  ```tsx
  <RankedBars data={causes} label="name" value="amount" fill="hatch" />
  ```
  
  See the migration guide: https://tally-charts-docs.vercel.app/docs/migration-1-0
- a39520a: `Chart` and the 11 high-level charts (`BarChart`, `ComparisonBars`, `RankedBars`, `WaterfallChart`,
  `BridgeChart`, `DotHistogram`, `StripPlot`, `WaffleColumns`, `LineChart`, `Heatmap`,
  `RunwayChart`) now require an accessible name in their types: a `title`, or an `aria-labelledby`
  that points at an element naming the chart. A chart without either is a type error. The
  development warning stays for calls from JavaScript. With both props, `aria-labelledby` names the
  chart and `title` stays the default caption of the data table.
  
  New exported type `ChartName`: `{ title: string; 'aria-labelledby'?: string } | { title?:
  undefined; 'aria-labelledby': string }`. `ChartPassThroughProps` no longer has `title`; the name
  comes from `ChartName`. `ChartProps` and every `*Props` of the 11 charts are now type aliases
  (an intersection with `ChartName`), not interfaces, so `interface … extends BarChartProps<D>` no
  longer compiles. Use `&`. Do not wrap them in `Pick` or `Omit`: they collapse the union and lose
  the requirement; add the name back with `& ChartName`.
  
  Migration: give every chart a `title` or an `aria-labelledby`, and replace `interface … extends`
  of a props type with `type … = … & {…}`.
  
  Before (no name; the chart was announced as an unnamed figure):
  
  ```tsx
  <BarChart data={weeks} x="week" y="margin" />
  ```
  
  After (a `title`):
  
  ```tsx
  <BarChart data={weeks} x="week" y="margin" title="Margin by week" />
  ```
  
  After (a heading that already names the chart):
  
  ```tsx
  <h2 id="m">Margin by week</h2>
  <BarChart data={weeks} x="week" y="margin" aria-labelledby="m" />
  ```
  
  Before (extending a props type):
  
  ```tsx
  interface MyBarsProps<D> extends BarChartProps<D> {
    accent?: boolean
  }
  ```
  
  After:
  
  ```tsx
  type MyBarsProps<D> = BarChartProps<D> & {
    accent?: boolean
  }
  ```
  
  See the migration guide: https://tally-charts-docs.vercel.app/docs/migration-1-0
- 1b37bcc: The small pieces are never pink or hatched by default. In the library, solid is an actual value
  and hatch is a plan or reference, and pink means loss and is only chosen explicitly. Four defaults
  change:
  
  - InlineBar: `tone` from `'loss'` to `'accent'`, `fill` from `'hatch'` to `'solid'`.
  - Meter: `fill` from `'hatch'` to `'solid'`.
  - RangeMeter: `tone` from `'loss'` to `'accent'`, `referenceTone` from `'accent'` to `'neutral'`.
    The hatched gap stays.
  - DotCount: `tone` from `'loss'` to `'accent'`.
  
  Migration: pass the old values to keep the old look.
  
  Before (pink or hatched):
  
  ```tsx
  <InlineBar value={12.3} max={40} label="Margin" />
  <Meter value={34} min={20} max={45} label="Gross margin" />
  <RangeMeter value={12.3} reference={36} max={40} label="Margin" />
  <DotCount count={29} />
  ```
  
  After (explicit props for the same look):
  
  ```tsx
  <InlineBar value={12.3} max={40} tone="loss" fill="hatch" label="Margin" />
  <Meter value={34} min={20} max={45} fill="hatch" label="Gross margin" />
  <RangeMeter value={12.3} reference={36} max={40} tone="loss" referenceTone="accent" label="Margin" />
  <DotCount count={29} tone="loss" />
  ```
  
  See the migration guide: https://tally-charts-docs.vercel.app/docs/migration-1-0

### Minor Changes

- d3b997b: `ChartsProvider` takes a `messages` prop that translates the built-in text: "No data", "no value", the keyboard hint, the "n of total" position, target text, "Now" and "Total", the column headers of the hidden data tables (a header taken from a string accessor still keeps the field name), the RunwayChart status and legend, the Heatmap bin labels, the Delta direction words and the spoken rows of ComparisonBars and WaterfallChart. Strings use `{placeholders}`, and any key left out, or set to `undefined`, keeps its English default. A nested provider without `messages` inherits its parent's; one with `messages` replaces them, and any key it leaves out goes back to English. The `ChartMessages` type and a read-only `DEFAULT_MESSAGES` are exported; the keys and placeholder names are public, and new keys can arrive in a minor, so type a translation as `Partial<ChartMessages>`. A bundle holds only the English strings its own components can show. A per-chart prop such as `empty`, `keyboardHint`, `targetLabel`, `totalLabel` or `dataTable.columns` still wins. A test now fails when a new user-visible English literal appears in the React sources outside the defaults.
- c421c4a: `color` paints a `ShareBar` segment, a `Legend` item or the solid bars of `Bars` with any CSS colour, including `var(--x)`. Tones stay semantic: `data-ch-tone` is unchanged, and forced-colors mode still uses system colours. Contrast in light and dark is up to you. On `Bars` it applies only to `fill="solid"`; a hatched bar keeps its tone and warns in development (`bars-color-fill`). `LegendItem.color` is ignored when `level` is set. The `Sparkline` `endpoint` docs now say the dot overhangs the box by about 6 px at the right edge.
- 4923fd5: `tally-charts/core` exports `createDateFormatter` and its types `DateFormatOptions`, `DateFormatSpec` and `DateFormatter`. It formats a single date (epoch ms) with a preset (`'day'`, `'month'`, `'quarter'`, `'year'`), `'auto'` or any `Intl.DateTimeFormatOptions`, and gives an empty string for an invalid date.
  
  ```ts
  import { createDateFormatter } from 'tally-charts/core'
  
  createDateFormatter('month', { locale: 'en-US' })(Date.UTC(2026, 0, 15)) // "Jan 2026"
  ```
- f8fa1e8: `InlineBar` `width` now takes a number (px) or any CSS length, so `width="100%"` fills a table cell. The default stays 64 px. Bar height stays plain CSS on the public parts `inline-bar` and `meter-track`; the small-pieces docs page shows how to override it.
- 9dc06c6: `LineChart` takes `interactive` (default `true`). With `interactive={false}` the chart is static, like `Bars interactive={false}`: no tab stop, no keyboard hint, no pointer response and no tooltip, even if `tooltip` is set, and `onSelect` and `onActiveChange` never fire. The title and the data table stay.
- bc35eae: `LineChart` has a new `underlay` prop: marks drawn under the series and above the grid, e.g. an `<Area>` on a time axis. `children` still draw above the series.
- 77f68a9: `BarChart` can label only its highest bar with `valueLabel="max"`, and draw value labels as a pill with `valueLabelVariant="pill"`. `ValueLabel` gets the same as `at="max"` and `variant="pill"`; the pill is the new part `value-label-pill`.
- c1f6357: A reversed value axis is documented and tested: `y={{ domain: [10, 1] }}` on `Chart`, or `domain={[10, 1]}` on `LineChart`, puts 1 at the top, for search positions and rankings. `Area`'s fade now runs toward its baseline when the line is below it, so on a reversed axis (or with negative values) the strong end stays at the line. `Bars` on a reversed scale hang from the top edge, the baseline.
- 2d9e95a: `Chart` takes a second linear value scale, `y2`, and `useChart()` reports it. `Line`, `Area`, `Band`, `Bars`, `ValueLabel`, `Target` and `Axis` draw on it with `scale="y2"`, and their field defaults come from it. `Axis` also gets `tone`, to tie a value axis to its series. The grid stays on `y`, and ticks of the two scales aren't aligned. Charts without `y2` do the same work as before.
- 2e21fa5: New `Sparkline`: a line of values for KPI rows and table cells. It fills its container's width at a fixed `height`, takes a `tone`, an `area` fill, a `target` rule and an `endpoint` dot on the last valid value, and a `null` breaks the line, leaving a value with no neighbour as a dot. An explicit `domain` is mapped as given, so `[10, 1]` puts 1 at the top, and a `target` outside it isn't drawn, with the dev warning `sparkline-target-domain`. It never measures anything and uses no effects, so the server and the client render the same markup. The endpoint is an HTML element placed in percent, so it stays round at any width.
- 25eecce: `Target` works on band and point scales. Pass the category as `x` (or `y`) and an optional `position`, a fraction of the category's step from 0 (start edge) to 1 (end edge), so a threshold of 73 can sit inside the bucket "70–79" at `position={0.3}`. `y` widens to `number | string`. New dev warnings: `target-category` for an unknown category and `target-position` for `position` outside 0 to 1 or on a linear or time scale. On any scale, the label of a vertical rule now moves to the left of the rule when it wouldn't fit before the chart's right edge and fits inside the plot on the left.

### Patch Changes

- 27f7f67: `createFormatter` has TSDoc: a summary, `@param spec`, `@param options` and `@returns`. The API Extractor doc model (`api/*.api.json`) is now generated and checked together with the API reports; it has no effect on the published package.
- 6b7bc50: Documentation only, no code change. `homepage` in `package.json` and the links in the README now
  point to the docs site at `https://tally-charts-docs.vercel.app`. The previous address belonged to
  an unrelated project.
- 4923fd5: Built declaration files no longer start with a bare `import "d3-time"`, which made type checkers resolve `d3-time` for types that do not use it. `pnpm check:dts` guards this.
- 522951c: The package README is a short page: a one-line description, install, the `theme.css` import, a minimal example, the stability summary and links. The full documentation is on the docs site, and `homepage` in `package.json` now points there. No code changes.
- df4fec1: `RunwayChart` pointer and controlled-state fixes, with no API change. A cancelled touch
  (`pointercancel`) or a pointer leaving the list no longer leaves a pressed row behind, so the next
  focus starts on the selected row. On touch, hover clears on `pointerup` and `pointercancel`. A
  controlled `activeId` that changes from outside moves the keyboard cursor as well as the
  highlight. Duplicate row ids now warn once with every duplicate id, and only the first row with
  an id is shown as active or selected.
- 280d1a0: The default keyboard hint mentions Enter ("Press Enter to select.") only while the active point
  can be selected: the chart has `onSelect` and the point is not `selectable: false`. Before a point
  is active, the first one decides. A custom `keyboardHint` is still used as is.
- 0f6e307: `ZoneMeter` and `ShareBar` handle non-finite values and very small pieces better.
  
  - `ZoneMeter` warns in development about a `value` of `NaN` or `±Infinity` and shows "No data". A missing (`null`) value still shows "No data" without a warning.
  - `ShareBar` shows "No data" when no segment has a valid value (finite and not negative): no segments in the bar, a new `<p data-ch-part="share-empty">No data</p>` instead of the legend list (a new public part), and `label: No data` as the accessible name when the legend is hidden. Before, a bar whose segments were all negative showed a list of 0% rows. A `NaN` or `±Infinity` segment value warns once that it is not finite and counts as 0.
  - `ShareBar` segments with a share above 0 keep at least 2px (the CSS floor is 3px, as before), so a segment of 0.1% stays visible and the segments plus the gaps still fill the bar.
  - `ZoneMeter` zones keep at least 2px of fill, so a zone of 0.1% of the range stays visible. The other zones give up the space. The track is now a flex row, and a zone has only an inline `width`, no `left`.
  - `ZoneMeter` end labels stay inside the component: the first label starts at the left edge and the last ends at the right edge, as before, and a test now covers it.
- ca07dee: Documentation only, no code change. The README has a Stability section, and `docs/stability.md`
  says what semver covers from 1.0 (exports, `--ch-*` tokens, `data-ch-part`, `data-ch-*`
  attributes, `theme.css`) and what it doesn't (`ch-*` classes, `--_ch-*` variables, DOM outside the
  parts, the wording of the built-in English strings, size budgets). `docs/a11y.md` lists the hover
  tooltip and lower-inclusive `breaks` among the known limits.
  
  Not public API from 1.0: the wording of the built-in English strings (such as "No data" or the
  keyboard hint) may change in a minor release (`ChartsProvider messages` translates them by key), and the `--_ch-*`
  variables (for example `--_ch-swatch-color`) may change or disappear in any release. Do not read or
  set them; use the `--ch-*` tokens. Where you need the exact words, pass your own text, such as
  `keyboardHint`, and in tests find a chart by its `title` and role, not by built-in text.
  
  See the migration guide: https://tally-charts-docs.vercel.app/docs/migration-1-0
- 4fd05d7: Importing one component pulls in less of the library with bundlers that don't read side-effect
  analysis across modules (esbuild, Rollup, webpack). The module-level `createWarner()` and
  `createContext()` calls are now marked `/* @__PURE__ */`, and the RunwayChart time constants are
  plain numbers. Before, a bundle with only `LineChart`, `Stat` or a bar chart still contained the
  RunwayChart, ZoneMeter and ShareBar setup code (and `Heatmap` and `Stat` a `ChartContext`). No API
  change.

## 0.9.0

### Minor Changes

- 70b9381: Fixes from the first app integration. `thresholds()` takes `{ inclusive: 'upper' }` for tiers that
  include their upper edge (Core Web Vitals), and its result carries `inclusive`. `ZoneMeter` `zones`
  also takes the plain `{ bins, inclusive }`, which can cross the server/client boundary.
  `RankedBars` and `Bars` take `selectable` (per row), and `ChartPoint.selectable: false` makes
  `onSelect` skip a point on click, Enter and Space. The README has a recipe for class-based dark mode
  (next-themes). Additive; nothing changed or removed.

## 0.8.0

### Minor Changes

- fdb3875: Foundation release: theme tokens with light and dark themes, `tally-charts/core` utilities
  (formatters, scales, ticks, bar layout, tooltip placement), `<Chart>`, `Bars`, `Axis`, `Target`,
  `ValueLabel`, `Tooltip`, `TooltipPill`, `Legend`, `ChartsProvider`, `useFormat` and `fmt`.
- a0c09a4: Time scales, the API freeze and accessibility. `<Chart x={{ type: 'time' }}>` and `LineChart`
  take dates (`Date`, epoch ms or ISO strings) with calendar ticks from seconds to decades,
  multi-scale labels, date formats (`'auto'`, `'day'`, `'month'`, `'quarter'`, `'year'`, Intl
  options) and a `'utc'` (default) or `'local'` zone. `Line`, `Band`, `Area`, `Region`, `Target`,
  `Grid`, `Axis` and `NearestPointer` work on them. The public API is now recorded in
  `api/*.api.md` and checked in CI.
  
  Breaking:
  - LineChart `axis` / `axisFormat` → `yAxis` / `yAxisFormat`, plus `xAxisFormat`; `LineRange` →
    `LineBand`.
  - `Bars` `tooltip` → `segments`.
  - ComparisonBars `overIsBad` → `good: 'up' | 'down'` (default `'down'`), `onPlanText` →
    `onPlanLabel`.
  - `useChart()` takes no argument and returns only the public context fields;
    `useRegisterPoints(points)` reads the chart itself.
  - Resolved scales use the library's own `LinearScale`, `BandScale`, `PointScale` and `TimeScale`;
    no d3 types in the published `.d.ts`, and d3-scale is no longer a dependency.
  - Axis format functions take `AxisValue` (`string | number | Date`).
  - `ComparisonStatus`, `WaterfallKind` and `DeltaDirection` are no longer exported.
  - `tally-charts/core` exports only formatting, thresholds, `heatmapLevel`, `toNumber`, `toTime`
    and types; the layout helpers, `createWarner` and `isDev` are internal.
  - CSS: sub-parts are styled through `data-ch-part`, classes are private, private variables are
    `--_ch-*`, and `data-ch-dir` is `data-ch-direction`.
  - Whole percent and pts axis ticks read "0%", not "0.0%".
  
  Added: `ChartPoint<D>` in callbacks, a function `tooltip` on every high-level chart,
  `{ preset, digits, signed }` format objects, `axisFormat` on BarChart and DotHistogram, `chartId`
  on Heatmap, `heatmapLevel`, readonly array props, and a development warning for charts and
  heatmaps without a `title`.
  
  Accessibility (WCAG 2.2 AA): the plot inside each chart's figure is the keyboard widget
  (`role="application"`, role description "chart") with an instructions hint (`keyboardHint`);
  focus shows the first point; announcements read "{series}, {n} of {total}, {label}"; Escape
  closes hover tooltips, which the pointer can rest on. Toned text is mixed with ink (4.5:1),
  light warn, gain and neutral are darker (3:1 marks: `#be802f`, `#22a363`, `#8e8e95`), hatched
  and soft-accent marks get a 1px outline, and the sequential ramp is tuned per tone and theme
  (text 4.5:1, levels 1.3:1 apart, top level 3:1; hot pink at the top of the loss ramp, the pure
  base in dark themes). Forced-colors mode keeps marks, levels and focus rings visible. Heatmap
  column headers hold only the names, with the totals in their own row, and grid navigation
  reaches the totals (Ctrl+Home/End, PageUp/PageDown). At 320px nothing overlaps: Heatmap scrolls
  sideways (`--ch-heatmap-min-cell`), ComparisonBars stacks (`layout`), row labels are cut with an
  ellipsis, bridge totals thin out and pills wrap. Data tables have row headers, readable headers
  and "no value" cells.
  
  Changed in 0.6b: the chart's focus and keys moved from the figure to its plot
  (`[data-ch-part="plot"]`); announcements start with the position; data-table headers are field
  names in sentence case; the `ch-tone-text` class became the `data-ch-tone-text` attribute; the
  `heatmap-header-total` part became the `heatmap-total-row` row; WaffleColumns leaves 44px above
  the plot for its peak pill.
  
  Added in 0.6b: `keyboardHint`, Heatmap `rowLabel`, `dataTable={{ caption, columns }}`,
  ComparisonBars `layout`, Legend item `marker` and `shape: 'band'`, `series` on `ChartPoint` and
  `DotItem`, the `--ch-heatmap-min-cell` token, the parts `plot`, `heatmap-total-row`,
  `heatmap-scroll`, `meter-min-label`, `range-scale-min` and `range-scale-max`, and the attributes
  `data-ch-tone-text`, `data-ch-peak` and `data-ch-marker`.
- 235fc0d: Opt-in `data-ch-palette="vivid"`: on any ancestor of a chart (or on `<html>`, or next to
  `data-ch-theme`), it restores the brighter pre-0.6b light colors of `--ch-warn`, `--ch-gain` and
  `--ch-neutral`. Light theme only; the dark theme and your own token overrides are unchanged. The
  three colors are below 3:1 against the light surface (see `docs/a11y.md`).
- 7f4c06a: RunwayChart: one strip per account across a time axis, with projected use, the moment it runs out, the locked span and the reset. New `runwayForecast` helper in `tally-charts/core` computes those facts from usage, window and pace. `Region` gains `fill="hatch"`.
- ce9bc9e: `ShareBar`: one bar split into the parts of a whole, with a list of parts ("2,711 · 46%"); `total` leaves the rest as empty track. `ZoneMeter`: a value against zones from `thresholds()` (good / needs work / poor), with a marker and break labels.
- d5ea44a: Bar charts and small pieces: `BarChart`, `ComparisonBars`, `RankedBars`, `RowLabels`,
  `RowDividers`, a hidden data table on `<Chart>` (`dataTable`), and the HTML pieces `Stat`,
  `Delta`, `Meter`, `RangeMeter`, `InlineBar` and `DotCount`.
  
  Fixes: a click or tap now selects the bar under the pointer (it could select the previously
  hovered bar); keyboard navigation no longer repeats items shared by layered marks; `hatch-fade`
  fades toward the baseline for negative and horizontal bars; bars animate only along the value
  axis; `aspectRatio` charts no longer shift the page on load; band `ends` labels on a left or
  right `<Axis>` now sit level with their rows; development warnings are removed from production
  builds and now also show in browser development builds. Like React, the package reads
  `process.env.NODE_ENV`, so the bundler must define it (Vite, webpack, Next.js and esbuild with
  `define` do).
  
  New: `--ch-radius` (previously a 4px token with no effect) now drives the default bar corner
  radius, default `3px`; `<Chart chartId>` for charts in several React roots; `<Bars>` gains
  `from`, `size`, `align`, `offset`, `track`, `interactive` and `ariaLabel`; `<ValueLabel data>`.
- dde70a1: Waterfall and bridge: `WaterfallChart` (start → steps → calculated end, dotted connectors) and
  `BridgeChart` (remaining bars with leaked caps, gradient area, highlighted last column, pinned
  callout). New building blocks `Connector`, `ColumnHighlight`, `Area` and `Callout`;
  `<Axis highlight>` emphasizes one label. `tally-charts/core` gains `runningTotals`,
  `areaPath` and `toNumber`.
  
  New optional props on existing pieces: `<Axis extent>` labels a value range when the scale runs
  past it; `linearTicks` takes a matching `extent` argument; `<Area between>` fills only the gaps
  between bands; `<Callout clearance>` lifts the pill clear of what it would cover; and
  `<Callout placement>` (`'auto' | 'top'`) keeps a pinned pill above its point instead of flipping
  below it.
  
  Waterfall scales are padded a little beyond the domain end that touches the baseline, so the
  start and end bars stay visible when a total equals that end. An explicit `domain` still sets the
  axis labels (and is padded the same way).
- d8c9888: Dot charts: `DotHistogram` (binned, stacked, threshold tones, target, pinned callout),
  `StripPlot` (rows per series, overlap stacking, medians) and `WaffleColumns` (dot columns per
  period, group tints, peak callout). New building blocks `Dots` and `NearestPointer`;
  `thresholds()` for tones and legend counts; `tally-charts/core` gains `binDots`, `stackStrip`,
  `medianOf`, `packWaffle` and `thresholds`. Arrow keys move within and across stacks and rows
  (`ChartPoint.group`).
  
  **Breaking:** bars and scales now use the strict number rule: only numbers and non-blank numeric
  strings count. These are now missing instead of being coerced: blank strings, booleans, `Date`
  objects, `BigInt`, and objects whose `valueOf()` returns a number (e.g. Decimal.js or Big.js
  values). Convert them to numbers first.
  
  Changes: stacked `RankedBars` rows give each label more room from the bar above. Points may set
  `hitX`/`hitY` for `NearestPointer`.
- 5a0728f: Line charts and heatmaps: `LineChart` (actual, forecast and scenario series, likely-range band,
  shaded forecast region, target, one tooltip for every series at an x) and `Heatmap` (ARIA grid
  on CSS grid, totals, threshold bins onto the sequential scale, legend, roving keyboard focus).
  New building blocks `Line`, `Band`, `Grid` and `Region`; `type: 'point'` scales; `Legend` line
  and sequential-level swatches. `tally-charts/core` gains `linePath`, `bandPath`, `pointTicks`,
  `categoryCenter`, `categoryStep` and `clampToRange`.
  
  Changes: `--ch-seq-4` is now 65% of the base (was 75%) and `--ch-seq-5` is the base darkened
  with 25% black (was the base), so text on every level passes 4.5:1 in both themes for the
  default loss base and for accent. The levels read `--ch-seq-base` from any ancestor (default
  `--ch-loss`) and are defined on legends and heatmaps too. Each level's share of the base is a
  `--ch-seq-mix-1…5` token; Heatmap's `tone` picks per-tone shares for accent-soft, warn, gain
  and neutral, so every tone passes 4.5:1 on every level in both themes.
  
  Note: time scales are deferred to 1.0; use a point scale with formatted labels.
