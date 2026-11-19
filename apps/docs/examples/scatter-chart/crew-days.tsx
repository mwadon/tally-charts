import { ScatterChart } from 'tally-charts'
import type { ExampleMeta } from '../types'

export const meta = {
  id: 'scatter-chart/crew-days',
  title: 'Margin by crew hours, one dot per job',
  rscSafe: true,
} satisfies ExampleMeta

const jobs = [
  { name: 'Alder Court', estimate: 8000, margin: 44, hours: 40 },
  { name: 'Birch Lane', estimate: 12000, margin: 38, hours: 58 },
  { name: 'Cedar Row', estimate: 15000, margin: 52, hours: 40 },
  { name: 'Dune House', estimate: 22000, margin: 41, hours: 103 },
  { name: 'Elm Terrace', estimate: 26000, margin: 35, hours: 79 },
  { name: 'Fern Hill', estimate: 34000, margin: 46, hours: 103 },
  { name: 'Grove Flats', estimate: 38000, margin: 33, hours: 160 },
  { name: 'Hazel Yard', estimate: 48000, margin: 39, hours: 160 },
  { name: 'Ivy Works', estimate: 60000, margin: 36, hours: 231 },
  { name: 'Juniper Mill', estimate: 88000, margin: 34, hours: 520 },
  { name: 'Kestrel Barn', estimate: 18000, margin: 29, hours: 79 },
  { name: 'Larch Depot', estimate: 30000, margin: 24, hours: 130 },
  { name: 'Maple Arcade', estimate: 44000, margin: 18, hours: 231 },
  { name: 'North Quay', estimate: 55000, margin: 27, hours: 271 },
  { name: 'Orchard Mews', estimate: 74000, margin: 30, hours: 361 },
  { name: 'Harbor Lofts', estimate: 68000, margin: 12, hours: 410 },
]

// Without `size` every point is a dot. Props stay serializable (field names, a preset format and a
// constant tone): the page is a server component.
export default function CrewDays() {
  return (
    <ScatterChart
      data={jobs}
      x="hours"
      y="margin"
      label="name"
      xLabel="Crew hours"
      yLabel="Margin, %"
      target={{ value: 32, label: 'target 32%' }}
      height={260}
      title={meta.title}
      description="16 jobs. Harbor Lofts, at 410 crew hours, has the lowest margin, 12%."
    />
  )
}
