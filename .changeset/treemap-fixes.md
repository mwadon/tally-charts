---
'tally-charts': patch
---

`Treemap` fixes:

- Tiles too small for text no longer render larger than their share: they used to keep a 16 × 12 px minimum from their padding (more in forced colors), so tiles of a long-tailed data set overlapped and stuck out of the chart.
- The tooltip can be reached with the pointer when it is drawn above or below its tile (it used to jump to a neighbouring tile on the way). Drawn inside a tile as tall as the chart, it lets clicks through to the tile, so `onSelect` fires there too.
- A server-rendered `Treemap` no longer makes a narrow page scroll sideways before it has measured its container.
- A tile focused by a mouse click no longer keeps its tooltip open after the pointer leaves the chart, and a tooltip dismissed with Escape is not reopened by the pointer leaving.
- Reordering `data` keeps keyboard focus on the same tile.
- The development warnings about `breaks` of `Treemap` and `Heatmap` are stripped from production bundles.
