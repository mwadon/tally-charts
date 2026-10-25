---
'tally-charts': major
---

RankedBars: the default `fill` changes from `'hatch'` to `'solid'`. In the library, solid is an
actual value and hatch is a plan or reference, so a bare `<RankedBars>` now draws solid bars.

Migration: RankedBars: pass `fill="hatch"` to keep the old look.

Before (hatched bars):

```tsx
<RankedBars data={causes} label="name" value="amount" />
```

After (add `fill="hatch"` for the same look):

```tsx
<RankedBars data={causes} label="name" value="amount" fill="hatch" />
```

See the migration guide: https://tally-charts.vercel.app/docs/migration-1-0
