---
'tally-charts': minor
---

Dot charts: `DotHistogram` (binned, stacked, threshold tones, target, pinned callout),
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
