---
'tally-charts': minor
---

`LineChart` takes `interactive` (default `true`). With `interactive={false}` the chart is static, like `Bars interactive={false}`: no tab stop, no keyboard hint, no pointer response and no tooltip, even if `tooltip` is set, and `onSelect` and `onActiveChange` never fire. The title and the data table stay.
