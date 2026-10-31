---
'tally-charts': minor
---

`ticks` on `Axis` and `Grid`, and the axis props built on `TickSpec` such as `yAxis` on `LineChart`, accept a list of values on a linear scale: `<Axis side="left" ticks={[0, 25, 50, 100]} />`. The list is sorted and deduplicated, and values outside the domain or `extent` are dropped. On a band, point or time scale a list gives the default ticks and a development warning.
