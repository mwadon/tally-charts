---
'tally-charts': major
---

`RunwayChart`: the `timeZone` prop is now `zone`, the name `TimeScaleSpec` and `DateFormatOptions`
already use. The values (`'utc'`, `'local'`) and the default (`'utc'`) are the same. There is no
alias: `timeZone` is a type error, and a call from JavaScript that still passes it gets the
default, UTC.

Migration: rename the prop.

Before:

```tsx
<RunwayChart title="API quotas" rows={rows} timeZone="local" />
```

After:

```tsx
<RunwayChart title="API quotas" rows={rows} zone="local" />
```

See the migration guide: https://tally-charts-docs.vercel.app/docs/migration-1-0
