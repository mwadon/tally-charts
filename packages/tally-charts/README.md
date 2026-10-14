# tally-charts

Opinionated React charts for narrative business dashboards: hatched means plan or reference,
solid means actual, pink means loss, and targets are first-class.

> Status: 0.2. The API may change before 1.0.

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

## High-level charts

Each one is a thin composition of `<Chart>` and the building blocks, renders a hidden data table
for screen readers by default (`dataTable={false}` turns it off), and renders `children` after
its own marks.

```tsx
import { BarChart, ComparisonBars, RankedBars } from 'tally-charts'

<BarChart data={weeks} x="week" y="margin" target={{ value: 38, label: 'Target 38%' }} format="percent" />

<ComparisonBars data={costs} label="name" sublabel="note" plan="estimate" actual="actual" format="currency" />

<RankedBars data={causes} label="name" value="amount" format="currency-compact"
  layout="stacked" selectedId={selected} onSelect={(id) => setSelected(id)} />
```

- `BarChart`: history `hatch-fade`, last bar `solid`, optional target and value label; `orientation="horizontal"` puts categories on the left.
- `ComparisonBars`: hatched plan bar over a solid actual bar, the overrun as a separate pink segment, and a `$640 → $1,060  +$420` / "On plan" column. `overIsBad={false}` for revenue-like rows.
- `RankedBars`: label, bar on a faint track, value; sorted by size; `layout="stacked"` for drill columns. Bars show magnitudes, so negative "lost" amounts extend right and keep their sign in the text. Selection uses `selectedId` + `onSelect`; ids are the original data index unless you pass `id`.
- `onSelect` and `onActiveChange` receive your original data object as `point.datum`.

## Small pieces

HTML, styled by the same tokens: `Stat`, `Delta` (▲/▼ pill toned by `good="up" | "down"`), `Meter`
(progress + target tick), `RangeMeter` (actual dot → hatched gap → plan ring), `InlineBar`
(table-cell bar), `DotCount`, `Legend`, `TooltipPill`. Colored text mixes the tone with
`--ch-ink` (`--ch-tone-text-mix`, default 55%) to stay readable.

## Several React roots on one page

Pattern ids come from React's `useId`, which is only unique within one root. When charts render
in separate roots (islands, micro-frontends), give each chart a `chartId`.

## Server Components

Chart components are client components: the main entry `tally-charts` starts with `'use client'`,
so you can render `<Chart>` from a Server Component file. In server code, import `fmt` and
`createFormatter` from `tally-charts/core`, which has no React and is server-safe. Function props
(`fill`, `tone`, function `format`, `tooltip`) can't cross the server/client boundary, so pass
them from a client component.

MIT licensed.
