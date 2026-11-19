---
'tally-charts': minor
---

New `FunnelChart`: one row per step, in funnel order, drawn as a single ribbon that narrows from
step to step. The thickness of the ribbon at a step line is proportional to the step value (the
largest step fills the available thickness, and a positive step is never thinner than 2 px). After
each step line the ribbon stays flat for a fifth of its column and only then eases to the next
thickness, so the flat run is where the measured value is and the curve is only a transition. Give
`x` (step name) and `y` (step value) for one stream, or `series` (`{ id, label, value, tone? }`)
to split each step into layers stacked across the ribbon; a step's value is then the sum of its
series values. `tone` colours a single stream. Each step after the first shows its continue rate,
the share of the previous step, and the lowest continue rate is shown in the loss colour and bold
(`highlight="weakest"`, the default, with at least three steps; `highlight="none"` turns it off); the
ribbon does not change colour.
`orientation` is `'auto'` by default: steps run left to right, and the chart turns vertical (steps
top to bottom, with a label column `labelWidth` px wide, default 128) when a step gets less than
96 px of length or a header value or rate would not fit its column. Step names that do not fit are
cut, with the full text kept in a `<title>`. `'horizontal'` and `'vertical'` never switch. The four
new `ChartMessages` keys `headerStep`, `headerContinued`, `ofPreviousStep` and `ofFirstStep` set
the default table headers and the tooltip texts. A row is skipped, with a development warning,
when its value (or any series value) is missing, not a number or negative; skipped rows are not
points, but they keep a row in the data table. Each drawn step is a `ChartPoint` whose id is the
`id` accessor or the data index; there is a tooltip with the rate and the share of the first
step, keyboard navigation along the funnel and a hidden data table. Stylable parts: `funnel`,
`funnel-area`, `funnel-guide`, `funnel-step`, `funnel-value`, `funnel-name`, `funnel-rate`.

```tsx
<FunnelChart
  title="From lead to paid job"
  data={steps}
  x="step"
  y="count"
/>
```
