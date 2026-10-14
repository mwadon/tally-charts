---
'tally-charts': minor
---

Bar charts and small pieces: `BarChart`, `ComparisonBars`, `RankedBars`, `RowLabels`,
`RowDividers`, a hidden data table on `<Chart>` (`dataTable`), and the HTML pieces `Stat`,
`Delta`, `Meter`, `RangeMeter`, `InlineBar` and `DotCount`.

Fixes: a click or tap now selects the bar under the pointer (it could select the previously
hovered bar); keyboard navigation no longer repeats items shared by layered marks; `hatch-fade`
fades toward the baseline for negative and horizontal bars; bars animate only along the value
axis; `aspectRatio` charts no longer shift the page on load; band `ends` labels on a left or
right `<Axis>` now sit level with their rows; development warnings are removed from production
builds and now also show in browser development builds. Like React, the package reads
`process.env.NODE_ENV`, so the bundler must define it (Vite, webpack, Next.js and esbuild with
`define` do).

New: `--ch-radius` (previously a 4px token with no effect) now drives the default bar corner
radius, default `3px`; `<Chart chartId>` for charts in several React roots; `<Bars>` gains
`from`, `size`, `align`, `offset`, `track`, `interactive` and `ariaLabel`; `<ValueLabel data>`.
