---
'tally-charts': minor
---

Fixes from the first app integration. `thresholds()` takes `{ inclusive: 'upper' }` for tiers that
include their upper edge (Core Web Vitals), and its result carries `inclusive`. `ZoneMeter` `zones`
also takes the plain `{ bins, inclusive }`, which can cross the server/client boundary.
`RankedBars` and `Bars` take `selectable` (per row), and `ChartPoint.selectable: false` makes
`onSelect` skip a point on click, Enter and Space. The README has a recipe for class-based dark mode
(next-themes). Additive; nothing changed or removed.
