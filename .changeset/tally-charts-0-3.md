---
'tally-charts': minor
---

Waterfall and bridge: `WaterfallChart` (start → steps → calculated end, dotted connectors) and
`BridgeChart` (remaining bars with leaked caps, gradient area, highlighted last column, pinned
callout). New building blocks `Connector`, `ColumnHighlight`, `Area` and `Callout`;
`<Axis highlight>` emphasizes one label. `tally-charts/core` gains `runningTotals` and
`areaPath`.
