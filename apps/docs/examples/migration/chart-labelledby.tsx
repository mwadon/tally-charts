import { BarChart, type BarChartProps } from 'tally-charts'
import type { ExampleMeta } from '../types'

export const meta = {
  id: 'migration/chart-labelledby',
  title: 'Weekly margin, named by its heading',
  rscSafe: true,
} satisfies ExampleMeta

interface Week {
  week: string
  margin: number
}

const weeks: Week[] = [
  { week: 'W1', margin: 31.2 },
  { week: 'W2', margin: 32.8 },
  { week: 'W3', margin: 33.5 },
  { week: 'W4', margin: 32.1 },
]

// 0.9 wrote `interface MyBarsProps<D> extends BarChartProps<D>`. In 1.0 the props are a type
// alias, so extend it with `&`.
type MyBarsProps<D> = BarChartProps<D> & {
  accent?: boolean
}

function MyBars<D>({ accent, ...props }: MyBarsProps<D>) {
  return <BarChart {...props} data-accent={accent ? '' : undefined} />
}

// The heading names the chart: aria-labelledby points at its id (a literal, so it is stable).
export default function ChartLabelledby() {
  return (
    <>
      <h3 id="migration-margin-heading">Weekly margin</h3>
      <MyBars
        data={weeks}
        x="week"
        y="margin"
        domain={[26, 40]}
        format="percent"
        height={220}
        aria-labelledby="migration-margin-heading"
        accent
      />
    </>
  )
}
