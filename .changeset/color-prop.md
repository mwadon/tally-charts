---
'tally-charts': minor
---

`color` paints a `ShareBar` segment, a `Legend` item or the solid bars of `Bars` with any CSS colour, including `var(--x)`. Tones stay semantic: `data-ch-tone` is unchanged, and forced-colors mode still uses system colours. Contrast in light and dark is up to you. On `Bars` it applies only to `fill="solid"`; a hatched bar keeps its tone and warns in development (`bars-color-fill`). `LegendItem.color` is ignored when `level` is set. The `Sparkline` `endpoint` docs now say the dot overhangs the box by about 6 px at the right edge.
