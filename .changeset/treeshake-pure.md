---
'tally-charts': patch
---

Importing one component pulls in less of the library with bundlers that don't read side-effect
analysis across modules (esbuild, Rollup, webpack). The module-level `createWarner()` and
`createContext()` calls are now marked `/* @__PURE__ */`, and the RunwayChart time constants are
plain numbers. Before, a bundle with only `LineChart`, `Stat` or a bar chart still contained the
RunwayChart, ZoneMeter and ShareBar setup code (and `Heatmap` and `Stat` a `ChartContext`). No API
change.
