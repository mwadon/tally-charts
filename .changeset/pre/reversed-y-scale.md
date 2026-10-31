---
'tally-charts': minor
---

A reversed value axis is documented and tested: `y={{ domain: [10, 1] }}` on `Chart`, or `domain={[10, 1]}` on `LineChart`, puts 1 at the top, for search positions and rankings. `Area`'s fade now runs toward its baseline when the line is below it, so on a reversed axis (or with negative values) the strong end stays at the line. `Bars` on a reversed scale hang from the top edge, the baseline.
