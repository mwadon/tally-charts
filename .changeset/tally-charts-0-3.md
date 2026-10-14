---
'tally-charts': minor
---

Waterfall and bridge: `WaterfallChart` (start → steps → calculated end, dotted connectors) and
`BridgeChart` (remaining bars with leaked caps, gradient area, highlighted last column, pinned
callout). New building blocks `Connector`, `ColumnHighlight`, `Area` and `Callout`;
`<Axis highlight>` emphasizes one label. `tally-charts/core` gains `runningTotals`,
`areaPath` and `toNumber`.

New optional props on existing pieces: `<Axis extent>` labels a value range when the scale runs
past it; `linearTicks` takes a matching `extent` argument; `<Area between>` fills only the gaps
between bands; `<Callout clearance>` lifts the pill clear of what it would cover; and
`<Callout placement>` (`'auto' | 'top'`) keeps a pinned pill above its point instead of flipping
below it.

Waterfall scales are padded a little beyond the domain end that touches the baseline, so the
start and end bars stay visible when a total equals that end. An explicit `domain` still sets the
axis labels (and is padded the same way).
