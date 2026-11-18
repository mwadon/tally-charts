---
'tally-charts': minor
---

New `StackedBarChart`: one stack of segments per category, vertical or horizontal. Each segment is a
`BarSeries` (the same shape `GroupedBarChart` takes) stacked in series order, positive values up
from zero and negative values down. Every segment is a `ChartPoint` with a `seriesId`, its id is
`${rowId}:${series.id}`. Each stack has a total label, and the tooltip shows the stack total. The `target`
prop accepts `{ value, label, over }`: `over` paints only the positive part of a stack beyond the
target in that tone (the total label takes it too) and needs a target above zero. Unlike
`GroupedBarChart`, the target label is drawn outside the plot: in the right margin when vertical,
in the top margin when horizontal.

```tsx
<StackedBarChart
  title="Monthly cost against budget"
  data={months}
  x={(m) => m.month}
  series={[
    { id: 'labor', label: 'Labor', value: (m) => m.labor },
    { id: 'materials', label: 'Materials', value: (m) => m.materials },
  ]}
  target={{ value: 60, over: 'loss' }}
/>
```
