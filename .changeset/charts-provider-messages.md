---
'tally-charts': minor
---

`ChartsProvider` takes a `messages` prop that translates the built-in text: "No data", "no value", the keyboard hint, the "n of total" position, target text, "Now" and "Total", the column headers of the hidden data tables (a header taken from a string accessor still keeps the field name), the RunwayChart status and legend, the Heatmap bin labels, the Delta direction words and the spoken rows of ComparisonBars and WaterfallChart. Strings use `{placeholders}`, and any key left out, or set to `undefined`, keeps its English default. The `ChartMessages` type and `DEFAULT_MESSAGES` are exported; a per-chart prop such as `empty`, `keyboardHint`, `targetLabel`, `totalLabel` or `dataTable.columns` still wins. A test now fails when a new user-visible English literal appears in the React sources outside the defaults.
