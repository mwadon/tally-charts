# tally-charts

Opinionated React charts for narrative business dashboards: hatched means plan or reference,
solid means actual, pink means loss, and targets are first-class.

> Status: 0.1 foundation. The API may change before 1.0.

```bash
npm i tally-charts
```

```tsx
import 'tally-charts/theme.css'
import { Axis, Bars, Chart, Target, Tooltip, ValueLabel } from 'tally-charts'

const weeks = [
  { week: 'W1', margin: 29.4 },
  { week: 'W2', margin: 31.2 },
  { week: 'W3', margin: 33.8 },
  { week: 'W4', margin: 36.1 },
]

<Chart
  data={weeks}
  title="Margin by week"
  height={260}
  x={{ type: 'band', field: 'week', padding: 0.35 }}
  y={{ field: 'margin', domain: [26, 40] }}
>
  <Target y={38} label="Target 38%" />
  <Bars fill={(_, i, all) => (i === all.length - 1 ? 'solid' : 'hatch-fade')} format="percent" />
  <ValueLabel at="last" format={(v) => v.toFixed(1)} />
  <Axis side="bottom" ticks="ends" />
  <Tooltip />
</Chart>
```

Theme with CSS custom properties (`--ch-accent`, `--ch-loss`, `--ch-hatch-gap`, …). Dark mode
follows `prefers-color-scheme` unless an ancestor sets `data-ch-theme="light"` or `"dark"`.

## Server Components

Chart components are client components: the main entry `tally-charts` starts with `'use client'`,
so you can render `<Chart>` from a Server Component file. In server code, import `fmt` and
`createFormatter` from `tally-charts/core`, which has no React and is server-safe. Function props
(`fill`, `tone`, function `format`, `tooltip`) can't cross the server/client boundary, so pass
them from a client component.

MIT licensed.
