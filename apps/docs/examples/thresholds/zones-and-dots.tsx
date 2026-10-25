'use client'

import { DotHistogram, Legend, thresholds, ZoneMeter } from 'tally-charts'
import type { ExampleMeta } from '../types'

export const meta = {
  id: 'thresholds/zones-and-dots',
  title: 'Page loads by largest contentful paint, colored by tier',
  rscSafe: false,
} satisfies ExampleMeta

// Core Web Vitals tiers for LCP in seconds: breaks 2.5 and 4, one more tone and label than breaks.
const tones = ['gain', 'warn', 'loss'] as const
const labels = ['Good', 'Needs improvement', 'Poor']
// 'upper' counts a value on a break in the bin below it, as Core Web Vitals do.
const tiers = thresholds([2.5, 4], tones, labels, { inclusive: 'upper' })
// The default, 'lower': a value on a break falls in the bin above it.
const strict = thresholds([2.5, 4], tones, labels)

const loads = [
  1.2, 1.4, 1.5, 1.7, 1.8, 1.9, 2, 2.1, 2.2, 2.3, 2.4, 2.5, 2.5, 2.6, 2.8, 3, 3.2, 3.5, 3.8, 4, 4.3,
  4.8, 5.4,
].map((lcp, i) => ({ id: `load-${i + 1}`, lcp }))

const grid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 16rem), 1fr))',
  gap: '1.5rem',
} as const

// 'use client': a thresholds() result has methods, so it can't be passed from a Server Component
// to a chart as `toneBy`. ZoneMeter alone could take the plain `{ bins, inclusive }` instead.
export default function ZonesAndDots() {
  return (
    <div style={{ display: 'grid', gap: '1.75rem' }}>
      <div style={grid}>
        <ZoneMeter
          label="LCP of 2.5 s, inclusive upper"
          value={2.5}
          zones={tiers}
          max={6}
          maxLabel="6 s+"
          format={{ preset: 'number', digits: 1 }}
        />
        <ZoneMeter
          label="LCP of 2.5 s, inclusive lower"
          value={2.5}
          zones={strict}
          max={6}
          maxLabel="6 s+"
          format={{ preset: 'number', digits: 1 }}
        />
      </div>
      <Legend shape="dot" items={tiers.legend(loads.map((l) => l.lcp))} />
      <DotHistogram
        title={meta.title}
        description="Of 23 page loads, 12 are Good, 7 need improvement and 4 are Poor. The two loads of exactly 2.5 s count as Good."
        data={loads}
        value="lcp"
        id="id"
        toneBy={tiers}
        binWidth={0.25}
        domain={[0, 6]}
        format={{ preset: 'number', digits: 1 }}
        height={220}
      />
    </div>
  )
}
