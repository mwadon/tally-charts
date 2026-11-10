---
'tally-charts': patch
---

Pin `d3-array` to 3.2.4 and `d3-time` to 3.1.0 instead of the `^` ranges. Their next patch releases (3.2.5 and 3.1.1) ship one bundled file in place of separate modules, which bundlers cannot tree-shake as well: every chart grew by about 0.6 kB min+gzip (LineChart 13.82 → 14.43 kB). A fresh install resolved to those releases through the ranges; it now gets the smaller build. If your app uses a different `d3-array` or `d3-time` version itself, the package manager installs both copies.
