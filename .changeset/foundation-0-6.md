---
'tally-charts': minor
---

Time scales, the API freeze and accessibility. `<Chart x={{ type: 'time' }}>` and `LineChart`
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
