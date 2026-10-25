import { BarChart, ZoneMeter } from 'tally-charts'
import { thresholds } from 'tally-charts/core'
import type { ExampleMeta } from '../types'

export const meta = {
  id: 'server-components/server-chart',
  title: 'Median load time by page, rendered on the server',
  rscSafe: true,
} satisfies ExampleMeta

// `tally-charts/core` has no React, so a Server Component can call thresholds() itself.
const lcp = thresholds([2.5, 4], ['gain', 'warn', 'loss'], ['Good', 'Needs improvement', 'Poor'], {
  inclusive: 'upper',
})

const pages = [
  { page: 'Home', seconds: 1.8 },
  { page: 'Pricing', seconds: 2.4 },
  { page: 'Docs', seconds: 2.9 },
  { page: 'Checkout', seconds: 3.6 },
  { page: 'Search', seconds: 4.4 },
]

// No 'use client' and no function props. The format is a preset string, and ZoneMeter gets the
// plain part of the thresholds() result, not the result itself, which has methods.
export default function ServerChart() {
  return (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      <ZoneMeter
        label="Median load time of the checkout page"
        value={3.6}
        zones={{ bins: lcp.bins, inclusive: lcp.inclusive }}
        max={6}
        maxLabel="6 s+"
        format={{ preset: 'number', digits: 1 }}
      />
      <BarChart
        title={meta.title}
        description="Search is the slowest page at 4.4 seconds; home is the fastest at 1.8."
        data={pages}
        x="page"
        y="seconds"
        format={{ preset: 'number', digits: 1 }}
        height={240}
      />
    </div>
  )
}
