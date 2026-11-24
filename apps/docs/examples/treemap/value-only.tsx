import { Treemap } from 'tally-charts'
import type { ExampleMeta } from '../types'

export const meta = {
  id: 'treemap/value-only',
  title: 'Open estimates by branch',
  rscSafe: true,
} satisfies ExampleMeta

// Fictional open estimates of three branches, in dollars.
const estimates = [
  { job: 'Alder Court kitchen', branch: 'Dallas', amount: 84000 },
  { job: 'Birch Lane bath', branch: 'Dallas', amount: 36000 },
  { job: 'Cedar Row deck', branch: 'Dallas', amount: 22000 },
  { job: 'Dogwood fence', branch: 'Dallas', amount: 9000 },
  { job: 'Elm Street basement', branch: 'Austin', amount: 61000 },
  { job: 'Fir Hill roof', branch: 'Austin', amount: 28000 },
  { job: 'Grove Park plumbing', branch: 'Austin', amount: 12000 },
  { job: 'Ivy Road addition', branch: 'Houston', amount: 47000 },
  { job: 'Juniper bath', branch: 'Houston', amount: 19000 },
  { job: 'Kestrel patio', branch: 'Houston', amount: 14000 },
]

// No `shade`: every tile is the middle level of the tone and there is no legend.
export default function ValueOnly() {
  return (
    <Treemap
      data={estimates}
      name="job"
      value="amount"
      group="branch"
      format="currency-compact"
      height={320}
      title={meta.title}
      description="Dallas has the most open work, $151K, most of it one kitchen."
    />
  )
}
