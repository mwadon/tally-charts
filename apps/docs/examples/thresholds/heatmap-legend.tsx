import { BarChart, Heatmap, Legend } from 'tally-charts'
import { heatmapLevel } from 'tally-charts/core'
import type { ExampleMeta } from '../types'

export const meta = {
  id: 'thresholds/heatmap-legend',
  title: 'Support tickets by day and category, with a legend of the same bins',
  rscSafe: true,
} satisfies ExampleMeta

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
const tickets: Record<string, number[]> = {
  Billing: [12, 18, 9, 22, 31],
  Login: [41, 36, 28, 33, 19],
  Shipping: [5, 8, 14, 11, 7],
}
const data = Object.entries(tickets).flatMap(([category, counts]) =>
  counts.map((count, i) => ({ category, day: days[i] ?? '', count })),
)

const perDay = days.map((day, i) => ({
  day,
  count: Object.values(tickets).reduce((sum, counts) => sum + (counts[i] ?? 0), 0),
}))

// The breaks and the labels of the five bins; the Heatmap and the Legend both read them.
const breaks = [10, 20, 30, 40]
const labels = ['Under 10', '10 to 20', '20 to 30', '30 to 40', '40 and up']
// One value inside each bin: heatmapLevel gives the level the Heatmap paints it with, so the
// swatches match. Plain numbers, so this runs on the server.
const samples = [5, 15, 25, 35, 45]

// Props stay serializable (no functions): the page is a server component.
export default function HeatmapLegend() {
  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <Legend
        items={labels.map((label, i) => ({
          label,
          level: heatmapLevel(samples[i], breaks) || undefined,
        }))}
      />
      <Heatmap
        title={meta.title}
        description="Login tickets peak on Monday at 41; billing tickets peak on Friday at 31."
        data={data}
        row="category"
        column="day"
        value="count"
        columns={days}
        breaks={breaks}
        binLabels={labels}
        legend={false}
      />
      <BarChart
        title="Support tickets per day"
        description="Thursday is the busiest day with 66 tickets; Wednesday is the quietest with 51."
        data={perDay}
        x="day"
        y="count"
        height={180}
      />
    </div>
  )
}
