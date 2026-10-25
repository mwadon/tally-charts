---
'tally-charts': major
---

`Area` and `LineChart` no longer join the line, band or area across a date that isn't a date or
across a missing value. They break there, as `Line` and `Band` already did: a series with a bad
date in the middle draws two segments instead of one. `Area` also breaks at a missing `y`, and
`between` skips a pair that touches a gap. `Line`, `Band` and `Area` now warn once per series on a
time axis, not once per chart. `LineChart` skips the row as before (it stays out of the tooltip,
the keyboard and the data table) and breaks every line and the band after the row before it in
data order. With unsorted data that is the row before it in the data, not in date order, so the
break can fall between two other dates: sort the rows first, or drop the invalid ones.

Also: the highlighted axis label (for example the last column of a `BridgeChart`) now stays when
the axis thins its labels on a narrow chart.

Migration: filter the rows before you pass them to keep the old joined line.

Before (the line joined across the row with the invalid date):

```tsx
<LineChart data={rows} x={{ type: 'time', field: 'date' }} series={series} />
```

After (drop the rows with an invalid date first):

```tsx
<LineChart
  data={rows.filter((r) => !Number.isNaN(new Date(r.date).getTime()))}
  x={{ type: 'time', field: 'date' }}
  series={series}
/>
```

The same filter keeps an `Area` joined: `<Area data={rows.filter(isValid)} />`. For a missing
value, filter out the rows whose value is `null` or `NaN`.
