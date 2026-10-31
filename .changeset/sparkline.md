---
'tally-charts': minor
---

New `Sparkline`: a line of values for KPI rows and table cells. It fills its container's width at a fixed `height`, takes a `tone`, an `area` fill, a `target` rule and an `endpoint` dot on the last valid value, and a `null` breaks the line. It never measures anything and uses no effects, so the server and the client render the same markup. The endpoint is an HTML element placed in percent, so it stays round at any width.
