---
'tally-charts': minor
---

New `GroupedBarChart`: bars of several series side by side in one group per category, vertical or
horizontal. Each series is a `BarSeries` with an `id`, a `label`, a `value` accessor and an optional
`tone` and `fill`. Every bar is a `ChartPoint` with the new optional `seriesId`, so handlers and
tooltips can tell which series a bar belongs to. A bar's id is `${rowId}:${series.id}`.

```tsx
<GroupedBarChart
  title="Revenue by quarter"
  data={quarters}
  x={(q) => q.name}
  series={[
    { id: 'plan', label: 'Plan', value: (q) => q.plan },
    { id: 'actual', label: 'Actual', value: (q) => q.actual },
  ]}
/>
```
