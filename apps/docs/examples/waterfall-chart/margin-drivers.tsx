'use client'

import { fmt, WaterfallChart } from 'tally-charts'
import type { ExampleMeta } from '../types'

export const meta = {
  id: 'waterfall-chart/margin-drivers',
  title: 'Margin change by driver, Q2 to Q3',
  rscSafe: false,
} satisfies ExampleMeta

const drivers = [
  { label: 'Pricing', value: 1.2, meta: 5800 },
  { label: 'Labor mix', value: -0.9, meta: 4400 },
  { label: 'Materials', value: -1.4, meta: 6900 },
  { label: 'Callbacks', value: -0.5, meta: 2500 },
  { label: 'Job mix', value: 0.6, meta: 2900 },
]

// 'use client': `stepLabel` is a function, which a server component cannot pass.
export default function MarginDrivers() {
  return (
    <WaterfallChart
      title={meta.title}
      description="Margin slipped from 36.0% to 35.0%. Pricing and job mix added 1.8 points, materials, labor mix and callbacks took away 2.8."
      start={{ label: 'Q2 margin', value: 36 }}
      steps={drivers}
      end={{ label: 'Q3 margin' }}
      format="percent"
      domain={[32, 38]}
      connectors={false}
      stepLabel={(s) =>
        s.meta === undefined
          ? fmt.pts(s.value)
          : `${fmt.pts(s.value)} · ${fmt.currencyCompact(s.meta)}`
      }
    />
  )
}
