---
'tally-charts': patch
---

Built declaration files no longer start with a bare `import "d3-time"`, which made type checkers resolve `d3-time` for types that do not use it. `pnpm check:dts` guards this.
