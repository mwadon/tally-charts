# tally-charts

Opinionated React charts for narrative business dashboards: hatched means plan or reference,
solid means actual, pink means loss, and targets are first-class.

## Install

```bash
npm i tally-charts
```

Like React, the package reads `process.env.NODE_ENV` to turn development warnings on, so it
expects a bundler that defines it (Vite, webpack, Next.js and esbuild with `define` all do).

## Use

Import the stylesheet once, near the root of your app, then render a chart:

```tsx
import 'tally-charts/theme.css'
import { BarChart } from 'tally-charts'

const weeks = [
  { week: 'W1', margin: 29.4 },
  { week: 'W2', margin: 31.2 },
  { week: 'W3', margin: 33.8 },
  { week: 'W4', margin: 36.1 },
]

<BarChart data={weeks} x="week" y="margin" title="Margin by week" format="percent" />
```

Every chart needs a `title` (or an `aria-labelledby`) for its accessible name. Light and dark
themes both work out of the box.

## Stability

From 1.0 the package follows strict semver for its public surface: the exports of `tally-charts`
and `tally-charts/core`, the `--ch-*` tokens, `data-ch-part`, the `data-ch-*` state and variant
attributes, and `theme.css`. Everything else (`ch-*` classes, `--_ch-*` variables, the DOM
structure outside the parts, the wording of built-in strings) can change in any release. The full
text is at <https://tally-charts-docs.vercel.app/docs/stability>.

## Links

- Documentation, with every chart, live examples and the API: <https://tally-charts-docs.vercel.app>
- Moving to 1.0: <https://tally-charts-docs.vercel.app/docs/migration-1-0>
- Source and issues: <https://github.com/mwadon/tally-charts>
- Changelog: <https://github.com/mwadon/tally-charts/blob/main/packages/tally-charts/CHANGELOG.md>

MIT licensed.
