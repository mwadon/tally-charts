---
'tally-charts': minor
---

New `ScatterChart`: one point per row on two value axes, `x` and `y`. With `size` each point is a
bubble whose area follows the value: the largest bubble gets `maxRadius` (default 18 px) and none
is drawn smaller than 3 px; without `size` every point is a dot of `radius` (default 5). Larger
bubbles are drawn first so small ones stay visible on top. `tone` is per item (a tone, or a
function of the row; default `accent`). `target` draws a horizontal line on y (a number, or
`{ value, label }`); its label sits outside the plot and the right margin grows to fit it. `xLabel`
and `yLabel` name the measures in the tooltip, the announcement and the data table, and are also
drawn under the x axis and above the y axis (the plot margin grows to make room); `sizeLabel` names
the size and is never drawn. The three new `ChartMessages` keys `headerX`, `headerY` and
`headerSize` set the default column headers when a measure has no label. A row is skipped, with a
development warning, when x or y is not a number, or when `size` is set and is missing, not a
number or negative. A row outside an explicit `xDomain` or `yDomain` is not drawn (no warning).
Skipped rows are not points, but every row has a place in the data table, with the table's usual
placeholder for a missing value. Each drawn point is a
`ChartPoint` whose id is the `id` accessor or the data index; there is a tooltip, a keyboard order
by x, then y, and a hidden data table. Stylable parts: `bubbles`, `bubble`, `bubble-ring`,
`axis-title`, `target-label`.

```tsx
<ScatterChart
  title="Margin by job size"
  data={jobs}
  x="estimate"
  y="margin"
  size="hours"
  label="name"
  xLabel="Estimate"
  yLabel="Margin"
  xFormat="currency-compact"
  yFormat={(v) => `${v}%`}
  tone={(j) => (j.margin < 32 ? 'loss' : 'accent')}
  target={{ value: 32, label: 'target 32%' }}
/>
```
