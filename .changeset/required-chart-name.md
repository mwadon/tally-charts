---
'tally-charts': major
---

`Chart` and the 11 high-level charts (`BarChart`, `ComparisonBars`, `RankedBars`, `WaterfallChart`,
`BridgeChart`, `DotHistogram`, `StripPlot`, `WaffleColumns`, `LineChart`, `Heatmap`,
`RunwayChart`) now require an accessible name in their types: a `title`, or an `aria-labelledby`
that points at an element naming the chart. A chart without either is a type error. The
development warning stays for calls from JavaScript. With both props, `aria-labelledby` names the
chart and `title` stays the default caption of the data table.

New exported type `ChartName`: `{ title: string; 'aria-labelledby'?: string } | { title?:
undefined; 'aria-labelledby': string }`. `ChartPassThroughProps` no longer has `title`; the name
comes from `ChartName`. `ChartProps` and every `*Props` of the 11 charts are now type aliases
(an intersection with `ChartName`), not interfaces, so `interface … extends BarChartProps<D>` no
longer compiles. Use `&`. Do not wrap them in `Pick` or `Omit`: they collapse the union and lose
the requirement; add the name back with `& ChartName`.

Migration: give every chart a `title` or an `aria-labelledby`, and replace `interface … extends`
of a props type with `type … = … & {…}`.

Before (no name; the chart was announced as an unnamed figure):

```tsx
<BarChart data={weeks} x="week" y="margin" />
```

After (a `title`):

```tsx
<BarChart data={weeks} x="week" y="margin" title="Margin by week" />
```

After (a heading that already names the chart):

```tsx
<h2 id="m">Margin by week</h2>
<BarChart data={weeks} x="week" y="margin" aria-labelledby="m" />
```

Before (extending a props type):

```tsx
interface MyBarsProps<D> extends BarChartProps<D> {
  accent?: boolean
}
```

After:

```tsx
type MyBarsProps<D> = BarChartProps<D> & {
  accent?: boolean
}
```
