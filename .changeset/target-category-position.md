---
'tally-charts': minor
---

`Target` works on band and point scales. Pass the category as `x` (or `y`) and an optional `position`, a fraction of the category's step from 0 (start edge) to 1 (end edge), so a threshold of 73 can sit inside the bucket "70–79" at `position={0.3}`. `y` widens to `number | string`. New dev warnings: `target-category` for an unknown category and `target-position` for `position` outside 0 to 1 or on a linear or time scale.
