---
'tally-charts': minor
---

New `StackedBarChart`: one stack of segments per category, vertical or horizontal. Each segment is a
`BarSeries` (the same shape `GroupedBarChart` takes) stacked in series order, positive values up
from zero and negative values down. Every segment is a `ChartPoint` with a `seriesId`, its id is
`${rowId}:${series.id}`, and the total label and the tooltip total come with it. The `target`
prop accepts `{ value, over }`: the part of a stack that passes the target is drawn in the `over`
tone, and the total label takes the same tone.

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
