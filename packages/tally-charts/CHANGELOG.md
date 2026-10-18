# tally-charts

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
