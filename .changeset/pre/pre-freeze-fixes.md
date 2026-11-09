---
'tally-charts': patch
---

Fixes found in a review before the 1.0 freeze, with no API change:

- Touch: a tap on a chart keeps the tapped point active. Before, the focus that follows a tap was
  taken for keyboard focus and activated the first point. The tapped point stays until the next
  tap or until focus leaves the chart; a touch that turns into a scroll (`pointercancel`) clears
  it. `NearestPointer` (and so `LineChart`, `DotHistogram`, `StripPlot` and `WaffleColumns`) now
  also activates the nearest point on `pointerdown`, since a tap sends no `pointermove`.
- `Chart`: when the pointer leaves a chart that has keyboard focus, the active point falls back to
  the point the keyboard was on, with its tooltip and announcement, as in `Heatmap` and
  `RunwayChart`. Before, it was cleared and the next arrow key started from the first or last
  point.
- `useRegisterPoints`: points that change only their `selectable` are registered again, so Enter
  and click agree on what can be selected.
- `Meter`: a `target` that is not a finite number draws no tick and no "Target" label and is left
  out of `aria-valuetext`, as in `InlineBar`.
- Formatters: a negative value that rounds to zero is written without a sign (`$0`, `0.0%`, not
  `−$0`, `−0.0%`), also with `signed`.
- Time scales: without valid dates the fallback domain is a fixed day (1970-01-01 UTC), not the
  day before `Date.now()`, so a server render and its hydration match.
- `Heatmap`: cells whose row and column names contain `:` no longer collide (row `a:b` with column
  `c`, and row `a` with column `b:c`). Both are drawn, focused and highlighted on their own. The
  public cell id is still `"<row>:<column>"`, so those two cells share it; a controlled `activeId`
  with such an id highlights the first of them.
- `BridgeChart`: for totals below zero the bar runs from zero to the total nearer zero and the cap
  covers the rest. Before, the bar ran to the far total and the cap was drawn over it.
