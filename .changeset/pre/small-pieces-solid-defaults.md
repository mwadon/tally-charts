---
'tally-charts': major
---

The small pieces are never pink or hatched by default. In the library, solid is an actual value
and hatch is a plan or reference, and pink means loss and is only chosen explicitly. Four defaults
change:

- InlineBar: `tone` from `'loss'` to `'accent'`, `fill` from `'hatch'` to `'solid'`.
- Meter: `fill` from `'hatch'` to `'solid'`.
- RangeMeter: `tone` from `'loss'` to `'accent'`, `referenceTone` from `'accent'` to `'neutral'`.
  The hatched gap stays.
- DotCount: `tone` from `'loss'` to `'accent'`.

Migration: pass the old values to keep the old look.

Before (pink or hatched):

```tsx
<InlineBar value={12.3} max={40} label="Margin" />
<Meter value={34} min={20} max={45} label="Gross margin" />
<RangeMeter value={12.3} reference={36} max={40} label="Margin" />
<DotCount count={29} />
```

After (explicit props for the same look):

```tsx
<InlineBar value={12.3} max={40} tone="loss" fill="hatch" label="Margin" />
<Meter value={34} min={20} max={45} fill="hatch" label="Gross margin" />
<RangeMeter value={12.3} reference={36} max={40} tone="loss" referenceTone="accent" label="Margin" />
<DotCount count={29} tone="loss" />
```

See the migration guide: https://tally-charts-docs.vercel.app/docs/migration-1-0
