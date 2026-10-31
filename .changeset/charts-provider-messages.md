---
'tally-charts': minor
---

`ChartsProvider` takes a `messages` prop that translates the built-in text: "No data", "no value", the keyboard hint, the "n of total" position, target text, "Now" and "Total". Strings use `{placeholders}` and any key left out keeps its English default. The `ChartMessages` type and `DEFAULT_MESSAGES` are exported; a per-chart prop such as `empty`, `keyboardHint`, `targetLabel` or `totalLabel` still wins.
