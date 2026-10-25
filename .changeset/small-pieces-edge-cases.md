---
'tally-charts': patch
---

`ZoneMeter` and `ShareBar` handle non-finite values and very small pieces better.

- `ZoneMeter` warns in development about a `value` of `NaN` or `±Infinity` and shows "No data". A missing (`null`) value still shows "No data" without a warning.
- `ShareBar` shows "No data" when no segment has a valid value (finite and not negative): no segments in the bar, a new `<p data-ch-part="share-empty">No data</p>` instead of the legend list (a new public part), and `label: No data` as the accessible name when the legend is hidden. Before, a bar whose segments were all negative showed a list of 0% rows. A `NaN` or `±Infinity` segment value warns once that it is not finite and counts as 0.
- `ShareBar` segments with a share above 0 keep at least 2px (the CSS floor is 3px, as before), so a segment of 0.1% stays visible and the segments plus the gaps still fill the bar.
- `ZoneMeter` zones keep at least 2px of fill, so a zone of 0.1% of the range stays visible. The other zones give up the space. The track is now a flex row, and a zone has only an inline `width`, no `left`.
- `ZoneMeter` end labels stay inside the component: the first label starts at the left edge and the last ends at the right edge, as before, and a test now covers it.
