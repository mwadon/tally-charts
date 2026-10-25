import { Heatmap } from 'tally-charts'
import type { ExampleMeta } from '../types'

export const meta = {
  id: 'heatmap/on-call-pages',
  title: 'On-call pages by team and shift',
  rscSafe: true,
} satisfies ExampleMeta

const shifts = ['Night', 'Morning', 'Afternoon', 'Evening']
const pages: Record<string, number[]> = {
  Platform: [14, 6, 9, 21],
  Payments: [3, 8, 12, 17],
  Search: [2, 5, 7, 4],
  Mobile: [9, 11, 6, 13],
  Data: [1, 2, 3, 2],
}
const data = Object.entries(pages).flatMap(([team, counts]) =>
  counts.map((count, i) => ({ team, shift: shifts[i] ?? '', count })),
)

// Props stay serializable (no functions): the page is a server component.
export default function OnCallPages() {
  return (
    <Heatmap
      title={meta.title}
      description="Evening is the busiest shift with 57 of 155 pages; Platform's evening alone is 21."
      data={data}
      row="team"
      column="shift"
      value="count"
      rows={Object.keys(pages)}
      columns={shifts}
      rowLabel="Team"
      breaks={[5, 10, 20]}
      binLabels={['Under 5', '5 to 9', '10 to 19', '20 and up']}
      format="number"
    />
  )
}
