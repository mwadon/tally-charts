---
'tally-charts': minor
---

Time scales and the API freeze. `<Chart x={{ type: 'time' }}>` and `LineChart` take dates
(`Date`, epoch ms or ISO strings) with calendar ticks from seconds to decades, multi-scale
labels, date formats (`'auto'`, `'day'`, `'month'`, `'quarter'`, `'year'`, Intl options) and a
`'utc'` (default) or `'local'` zone. `Line`, `Band`, `Area`, `Region`, `Target`, `Grid`, `Axis`
and `NearestPointer` work on them. The public API is now recorded in `api/*.api.md` and checked
in CI.

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
