---
'tally-charts': minor
---

New `Sparkline`: a line of values for KPI rows and table cells. It fills its container's width at a fixed `height`, takes a `tone`, an `area` fill, a `target` rule and an `endpoint` dot on the last valid value, and a `null` breaks the line, leaving a value with no neighbour as a dot. An explicit `domain` is mapped as given, so `[10, 1]` puts 1 at the top, and a `target` outside it isn't drawn, with the dev warning `sparkline-target-domain`. It never measures anything and uses no effects, so the server and the client render the same markup. The endpoint is an HTML element placed in percent, so it stays round at any width.
