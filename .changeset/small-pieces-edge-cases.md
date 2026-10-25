---
'tally-charts': patch
---

`ZoneMeter` and `ShareBar` handle non-finite values and very small pieces better.

- `ZoneMeter` warns in development about a `value` of `NaN` or `±Infinity` and shows "No data". A missing (`null`) value still shows "No data" without a warning.
- `ShareBar` shows "No data" (no segments, and `label: No data` as the name without a legend) when no segment has a valid value. A `NaN` or `±Infinity` segment value warns once that it is not finite and counts as 0.
- `ZoneMeter` zones keep at least 2px of fill, so a zone of 0.1% of the range stays visible. The other zones give up the space.
