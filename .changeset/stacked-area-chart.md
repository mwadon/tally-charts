---
'tally-charts': minor
---

New `StackedAreaChart`: layers stacked over an ordered x, the first series on the baseline. Each
layer is an `AreaSeries` (`id`, `label`, `value`, optional `tone`; default tones by position are
accent, accent-soft, warn, neutral, gain, repeating). The x is a category (point scale) or a date
on a time axis, as in `LineChart`. `forecastFrom` hatches the layers from the x before it to the
end and draws a dashed rule at that x, with `forecastLabel` above it. Each layer ends with an end
label (series name and last value), and the right margin grows to fit it; when two neighbouring
labels would overlap (centres closer than 30 px) none is drawn, so compose a `Legend` instead
(`endLabels={false}` turns them off). A negative value counts as zero in the geometry and the
total (with a development warning), and a row with a missing value breaks every layer at that x.
Every x is a `ChartPoint` with the row key as its id, the tooltip shows the total, and there is
a data table. Stylable parts: `area-layers`, `area-layer`, `area-edge`, `area-separator`,
`forecast-rule`, `forecast-label`, `end-label`, `end-value`, `cursor`, `cursor-dot`.

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
