import { RunwayChart } from 'tally-charts'
import { runwayForecast } from 'tally-charts/core'
import type { ExampleMeta } from '../types'

export const meta = {
  id: 'migration/runway-zone',
  title: 'Checkout API quota this week',
  rscSafe: true,
} satisfies ExampleMeta

// A fixed "now" and a fixed window, so the forecast is the same on every render. One row and no
// legend keep the chart short enough for its card at every width.
const now = '2026-10-21T08:00:00Z'
const domain = ['2026-10-21T00:00:00Z', '2026-10-28T00:00:00Z'] as const

const rows = [
  {
    id: 'checkout',
    label: 'Checkout API',
    ...runwayForecast({
      used: 0.72,
      windowStart: '2026-10-18T00:00Z',
      resetAt: '2026-10-25T00:00Z',
      now,
    }),
  },
]

// `zone` (in 0.9: `timeZone`) sets the day boundaries and the dates in the status. 'utc' is the
// default; it is spelled out here to show the prop.
export default function RunwayZone() {
  return (
    <RunwayChart
      title={meta.title}
      rows={rows}
      domain={domain}
      now={now}
      cell="6h"
      labelWidth={140}
      legend={false}
      zone="utc"
    />
  )
}
