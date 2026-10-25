import { DotHistogram } from 'tally-charts'
import type { ExampleMeta } from '../types'

export const meta = {
  id: 'dot-histogram/first-reply-times',
  title: 'Hours to the first reply, one dot per ticket',
  rscSafe: true,
} satisfies ExampleMeta

const hours = [
  1, 1.9, 2.3, 1.7, 1.5, 1.9, 2.6, 1.8, 1.5, 2.4, 1.9, 1.7, 5.8, 2.6, 2.2, 8.4, 6.2, 1.1, 5.5, 2.6,
  5.8, 3.6, 7.2, 2.6, 1.2, 1.3, 1.2, 1.5, 2.7, 9.4, 3.6, 2.3, 3.4, 2.9, 3.6, 2.4, 3.9, 1.5, 4, 2.9,
  0.4, 3,
]
const tickets = hours.map((h, i) => ({ ticket: `#${4100 + i}`, hours: h }))

// Props stay serializable (accessor strings, no functions): the page is a server component.
export default function FirstReplyTimes() {
  return (
    <DotHistogram
      title={meta.title}
      description="Of 42 tickets, 35 got a first reply within the 4-hour target and 7 took longer. The slowest took 9.4 hours."
      data={tickets}
      value="hours"
      label="ticket"
      format="hours"
      binWidth={0.5}
      domain={[0, 10]}
      target={{ value: 4, label: 'Target 4 h' }}
    />
  )
}
