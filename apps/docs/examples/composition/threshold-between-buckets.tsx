import { Axis, Bars, Chart, Grid, Target, Tooltip } from 'tally-charts'
import type { ExampleMeta } from '../types'

export const meta = {
  id: 'composition/threshold-between-buckets',
  title: 'Scores by bucket, with a pass mark at 73',
  rscSafe: true,
} satisfies ExampleMeta

const scores = [
  { range: '0–9', students: 1 },
  { range: '10–19', students: 2 },
  { range: '20–29', students: 4 },
  { range: '30–39', students: 7 },
  { range: '40–49', students: 11 },
  { range: '50–59', students: 16 },
  { range: '60–69', students: 19 },
  { range: '70–79', students: 14 },
  { range: '80–89', students: 8 },
  { range: '90–99', students: 3 },
]

// A bucket is 10 wide, so 73 sits 0.3 of the way across "70–79": position = (73 - 70) / 10.
export default function ThresholdBetweenBuckets() {
  return (
    <Chart
      data={scores}
      x={{ type: 'band', field: 'range', padding: 0.2 }}
      y={{ field: 'students' }}
      margin={{ left: 36 }}
      height={240}
      title={meta.title}
      description="Most students scored between 50 and 79. The pass mark of 73 falls inside the 70 to 79 bucket."
    >
      <Grid ticks={4} />
      <Bars id="range" />
      <Target x="70–79" position={0.3} label="Pass mark 73" />
      <Axis side="left" ticks={4} />
      <Axis side="bottom" />
      <Tooltip />
    </Chart>
  )
}
