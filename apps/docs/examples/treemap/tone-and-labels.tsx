import { Treemap } from 'tally-charts'
import type { ExampleMeta } from '../types'

export const meta = {
  id: 'treemap/tone-and-labels',
  title: 'Hours by job and overrun',
  rscSafe: true,
} satisfies ExampleMeta

// Fictional hours booked in October by job and crew, with the overrun against the estimate in
// percent. The warranty visit had no estimate, so it has no overrun.
const jobs = [
  { job: 'Alder Court kitchen', crew: 'North crew', hours: 312, overrun: 28 },
  { job: 'Birch Lane bath', crew: 'North crew', hours: 164, overrun: 6 },
  { job: 'Cedar Row deck', crew: 'North crew', hours: 96, overrun: -4 },
  { job: 'Dogwood fence', crew: 'North crew', hours: 44, overrun: 12 },
  { job: 'Elm Street basement', crew: 'South crew', hours: 248, overrun: 18 },
  { job: 'Fir Hill roof', crew: 'South crew', hours: 132, overrun: 34 },
  { job: 'Grove Park plumbing', crew: 'South crew', hours: 58, overrun: 2 },
  { job: 'Hazel Way warranty visit', crew: 'South crew', hours: 26, overrun: null },
  { job: 'Ivy Road addition', crew: 'East crew', hours: 284, overrun: 9 },
  { job: 'Juniper bath', crew: 'East crew', hours: 118, overrun: 22 },
  { job: 'Kestrel patio', crew: 'East crew', hours: 72, overrun: -8 },
]

// The loss tone and bins named in words. A row without an overrun number has no shade.
export default function ToneAndLabels() {
  return (
    <Treemap
      data={jobs}
      name="job"
      value="hours"
      group="crew"
      shade="overrun"
      breaks={[0, 10, 25]}
      binLabels={['On or under plan', 'Up to 10% over', '10 to 25% over', 'Over 25%']}
      format="hours"
      shadeFormat={{ preset: 'percent', digits: 0 }}
      tone="loss"
      height={400}
      title={meta.title}
      description="Alder Court and Fir Hill ran more than a quarter over their estimates."
    />
  )
}
