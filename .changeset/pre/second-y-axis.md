---
'tally-charts': minor
---

`Chart` takes a second linear value scale, `y2`, and `useChart()` reports it. `Line`, `Area`, `Band`, `Bars`, `ValueLabel`, `Target` and `Axis` draw on it with `scale="y2"`, and their field defaults come from it. `Axis` also gets `tone`, to tie a value axis to its series. The grid stays on `y`, and ticks of the two scales aren't aligned. Charts without `y2` do the same work as before.
