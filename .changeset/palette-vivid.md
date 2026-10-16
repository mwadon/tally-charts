---
'tally-charts': minor
---

Opt-in `data-ch-palette="vivid"`: on any ancestor of a chart (or on `<html>`, or next to
`data-ch-theme`), it restores the brighter pre-0.6b light colors of `--ch-warn`, `--ch-gain` and
`--ch-neutral`. Light theme only; the dark theme and your own token overrides are unchanged. The
three colors are below 3:1 against the light surface (see `docs/a11y.md`).
