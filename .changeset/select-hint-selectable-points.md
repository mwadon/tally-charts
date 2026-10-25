---
'tally-charts': patch
---

The default keyboard hint mentions Enter ("Press Enter to select.") only while the active point
can be selected: the chart has `onSelect` and the point is not `selectable: false`. Before a point
is active, the first one decides. A custom `keyboardHint` is still used as is.
