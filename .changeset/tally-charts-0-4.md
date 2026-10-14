---
'tally-charts': minor
---

Dot charts: `DotHistogram` (binned, stacked, threshold tones, target, pinned callout),
`StripPlot` (rows per series, overlap stacking, medians) and `WaffleColumns` (dot columns per
period, group tints, peak callout). New building blocks `Dots` and `NearestPointer`;
`thresholds()` for tones and legend counts; `tally-charts/core` gains `binDots`, `stackStrip`,
`medianOf`, `packWaffle` and `thresholds`. Arrow keys move within and across stacks and rows
(`ChartPoint.group`).

Changes: bars and scales now use the strict number rule, so blank strings and booleans in data
are missing instead of 0 or 1. Stacked `RankedBars` rows give each label more room from the
bar above.
