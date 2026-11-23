---
'tally-charts': minor
---

New `DonutChart`: one row per part, drawn as a ring whose slices are proportional to the part values, starting at 12 o'clock and running clockwise, with a 2 px gap between slices. Give `x` (part name) and `y` (part value). At most five slices are drawn (`maxSlices`, default 5, from 2 to 5; other values are clamped with a development warning): when there are more parts, the smallest are summed into one neutral "Other" slice, which cannot be selected. Parts are ordered largest first (`sort="value"`, the default; `sort="none"` keeps the data order). Slices are the steps of one tone (`tone`, default `'accent'`): the first is the strongest step and the following slices fade toward the surface colour; the fifth slice and "Other" are neutral. The total sits in the centre of the ring (`showTotal`, default true), with an optional `centerLabel` under it; the total shrinks to a smaller size when it does not fit the hole and is left out when it still does not fit. The list of parts shows the swatch, the name, the value and the share of each part (`legendValue`: `'both'`, `'value'` or `'percent'`); it is on the right of the ring when the chart is wide enough and under it otherwise (`legendPosition`: `'auto'`, `'right'` or `'bottom'`), and `legend={false}` hides it. `diameter` (default 232) sets the outer size of the ring, which shrinks in a narrower chart. Shares are whole percents that add up to 100, and a part under 1 % reads "<1%". A row is skipped, with a development warning, when its value is missing, not a number or negative; skipped rows are not slices or points, but they keep a row in the data table. A row with a value of 0 has no slice and shows "0%" in the table. Each slice is a `ChartPoint` whose id is the `id` accessor or the data index (the grouped "Other" slice has the id `'other'`); there is a tooltip, keyboard navigation along the ring and a hidden data table. Four new `ChartMessages` keys, `other`, `ofTotal`, `headerPart` and `headerShare`, set the "Other" name, the tooltip text and the default table headers. Stylable parts: `donut`, `donut-ring`, `donut-slice`, `donut-total`, `donut-center-label`, `donut-list`, `donut-row`, `donut-swatch`, `donut-name`, `donut-value`, `donut-percent`, `donut-rule`, `donut-hit`.

```tsx
<DonutChart
  title="Revenue by service line"
  data={lines}
  x="line"
  y="revenue"
  format="currency-compact"
  centerLabel="total revenue"
/>
```
