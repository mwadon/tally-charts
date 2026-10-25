import {
  Axis,
  Bars,
  Callout,
  Chart,
  ColumnHighlight,
  Grid,
  Target,
  Tooltip,
  ValueLabel,
} from 'tally-charts'
import type { ExampleMeta } from '../types'

export const meta = {
  id: 'composition/bars-and-axes',
  title: 'Gross margin by week, against a 40% target',
  rscSafe: true,
} satisfies ExampleMeta

const percent = { preset: 'percent', digits: 0 } as const

const weeks = [
  { week: 'W1', margin: 34 },
  { week: 'W2', margin: 35 },
  { week: 'W3', margin: 31 },
  { week: 'W4', margin: 42 },
  { week: 'W5', margin: 45 },
  { week: 'W6', margin: 39 },
]

// Chart owns the scales, the size and the interaction; every child reads them from context.
// Props stay serializable (strings and numbers, no functions): the page is a server component.
export default function BarsAndAxes() {
  return (
    <Chart
      data={weeks}
      x={{ type: 'band', field: 'week', padding: 0.35 }}
      y={{ field: 'margin', domain: [0, 50] }}
      margin={{ top: 64, left: 36 }}
      height={280}
      title={meta.title}
      description="Margin passed the 40% target in W4 and peaked at 45% in W5."
    >
      <Grid ticks={5} />
      <ColumnHighlight at="W5" />
      <Target y={40} label="Target 40%" labelPosition="start" />
      <Bars id="week" format={percent} fill="hatch-fade" />
      <ValueLabel at="all" format={percent} />
      <Callout
        id="W5"
        offset={30}
        segments={[{ value: 'Best week' }, { value: '45%', tone: 'gain' }]}
      />
      <Axis side="left" ticks={5} />
      <Axis side="bottom" highlight="W5" />
      <Tooltip />
    </Chart>
  )
}
