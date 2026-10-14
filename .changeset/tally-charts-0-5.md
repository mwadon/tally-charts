---
'tally-charts': minor
---

Line charts and heatmaps: `LineChart` (actual, forecast and scenario series, likely-range band,
shaded forecast region, target, one tooltip for every series at an x) and `Heatmap` (ARIA grid
on CSS grid, totals, threshold bins onto the sequential scale, legend, roving keyboard focus).
New building blocks `Line`, `Band`, `Grid` and `Region`; `type: 'point'` scales; `Legend` line
and sequential-level swatches. `tally-charts/core` gains `linePath`, `bandPath`, `pointTicks`,
`categoryCenter`, `categoryStep` and `clampToRange`.

Changes: `--ch-seq-4` is now 65% of the base (was 75%) and `--ch-seq-5` is the base darkened
with 25% black (was the base), so text on every level passes 4.5:1 in both themes. The levels
read `--ch-seq-base` from any ancestor (default `--ch-loss`) and are defined on legends and
heatmaps too. Time scales are deferred to 1.0; use a point scale with formatted labels.
