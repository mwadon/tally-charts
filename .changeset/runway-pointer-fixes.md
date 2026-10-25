---
'tally-charts': patch
---

`RunwayChart` pointer and controlled-state fixes, with no API change. A cancelled touch
(`pointercancel`) or a pointer leaving the list no longer leaves a pressed row behind, so the next
focus starts on the selected row. On touch, hover clears on `pointerup` and `pointercancel`. A
controlled `activeId` that changes from outside moves the keyboard cursor as well as the
highlight. Duplicate row ids now warn once with every duplicate id, and only the first row with
an id is shown as active or selected.
