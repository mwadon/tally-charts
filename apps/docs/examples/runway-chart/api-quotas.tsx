import { RunwayChart, type RunwayForecastInput } from 'tally-charts'
import { runwayForecast } from 'tally-charts/core'
import type { ExampleMeta } from '../types'

export const meta = {
  id: 'runway-chart/api-quotas',
  title: 'API quotas: which keys run out before they reset',
  rscSafe: true,
} satisfies ExampleMeta

// A fixed "now" and fixed windows, so the forecast is the same on every render.
const now = '2026-10-21T08:00:00Z'
const domain = ['2026-10-21T00:00:00Z', '2026-10-28T00:00:00Z'] as const

type Window = Omit<RunwayForecastInput, 'now'>

const keys: { id: string; label: string; sublabel: string; window: Window }[] = [
  {
    id: 'checkout',
    label: 'Checkout API',
    sublabel: 'Payments',
    window: { used: 0.72, windowStart: '2026-10-18T00:00Z', resetAt: '2026-10-25T00:00Z' },
  },
  {
    id: 'search',
    label: 'Search indexer',
    sublabel: 'Catalog',
    window: { used: 0.35, windowStart: '2026-10-16T12:00Z', resetAt: '2026-10-23T12:00Z' },
  },
  {
    id: 'mailer',
    label: 'Mailer',
    sublabel: 'Growth',
    window: { used: 0.18, windowStart: '2026-10-20T00:00Z', resetAt: '2026-10-27T00:00Z' },
  },
  {
    id: 'image',
    label: 'Image resize',
    sublabel: 'Catalog',
    window: { used: 0.64, windowStart: '2026-10-19T00:00Z', resetAt: '2026-10-26T00:00Z' },
  },
  {
    id: 'reports',
    label: 'Reports export',
    sublabel: 'Finance',
    window: { used: 0.9, windowStart: '2026-10-17T06:00Z', resetAt: '2026-10-24T06:00Z' },
  },
]

// runwayForecast comes from 'tally-charts/core', which is plain functions, so a server component
// can call it (the main entry is client code). Each row spreads the forecast: its projection, runsOutAt and resetAt come from the window.
const rows = [
  ...keys.map(({ window, ...key }) => ({ ...key, ...runwayForecast({ ...window, now }) })),
  { id: 'webhooks', label: 'Webhook relay', sublabel: 'Platform', disconnected: true },
]

// Props stay serializable (no functions): the page is a server component.
export default function ApiQuotas() {
  return (
    <RunwayChart
      title={meta.title}
      description="Three of five keys run out before reset: Reports export first, on Wednesday at 18:53, then locked for 59 hours."
      rows={rows}
      domain={domain}
      now={now}
      cell="6h"
      labelWidth={176}
    />
  )
}
