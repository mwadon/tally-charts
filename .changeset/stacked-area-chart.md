---
'tally-charts': minor
---

New `StackedAreaChart`: layers stacked over an ordered x, the first series on the baseline. Each
layer is an `AreaSeries` (`id`, `label`, `value`, optional `tone`; default tones by position are
accent, accent-soft, warn, neutral, gain, repeating). The x is a category (point scale) or a date
on a time axis, as in `LineChart`. `forecastFrom` is a category or, on a time axis, any date: a
dashed rule with `forecastLabel` above it is drawn at the x before it, and the layers are hatched
from there to the end (with `forecastFrom="W10"` the rule is at W9); when no x comes before it,
nothing is hatched. End labels (series name and last value) sit at the right edge and the right
margin grows to fit them; none is drawn when the last row is incomplete, for a layer that is zero
there, when no area reaches the last x (it is outside the x domain, or a lone x after an
incomplete row), or at all when two neighbouring labels would be closer than 36 px, so compose a `Legend`
instead (`endLabels={false}` turns them off). A negative value counts as zero in the geometry and
the total (with a development warning), and a row with a missing value breaks every layer at that
x. With `interactive` (the default), each x with at least one value is a `ChartPoint` whose id is
the row key; the tooltip lists the series top layer first and adds the total for complete rows.
There is also a data table. Stylable parts: `area-layers`, `area-layer`, `area-edge`,
`area-separator`, `forecast-rule`, `forecast-label`, `end-label`, `end-value`, `cursor`,
`cursor-dot`.

```tsx
<StackedAreaChart
  title="Crew hours per week"
  data={weeks}
  x={(w) => w.week}
  series={[
    { id: 'install', label: 'Install', value: (w) => w.install },
    { id: 'service', label: 'Service', value: (w) => w.service },
  ]}
  forecastFrom="W10"
  forecastLabel="today"
/>
```
