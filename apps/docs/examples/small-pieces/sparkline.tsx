import { Delta, Sparkline, Stat } from 'tally-charts'
import type { ExampleMeta } from '../types'

export const meta = {
  id: 'small-pieces/sparkline',
  title: 'Sparklines in a KPI row and a table',
  rscSafe: true,
} satisfies ExampleMeta

const clicks = [212, 240, 228, 265, 301, 288, 320, 344, 331, 372, 398, 421]
const refunds = [14, 12, 15, 11, null, 9, 10, 8, 9, 7, 8, 6]
const regions = [
  { name: 'North', values: [30, 34, 33, 38, 41, 44], tone: 'gain' },
  { name: 'South', values: [52, 49, 47, 41, 40, 36], tone: 'loss' },
  { name: 'East', values: [20, 22, 21, 20, 22, 21], tone: 'neutral' },
] as const

const cell = { padding: '0.5rem 0.5rem 0.5rem 0', textAlign: 'left' } as const
const head = { ...cell, color: 'var(--ch-ink-muted)', fontWeight: 'normal' } as const

// A Sparkline fills the width of its container and never measures it, so give it a box. Props
// stay serializable, so the example also renders in a Server Component.
export default function SparklineExample() {
  return (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem' }}>
        <div style={{ width: 200 }}>
          <Stat
            label="Clicks"
            value={421}
            delta={<Delta value={12.5} format={{ preset: 'percent', digits: 1 }} />}
          />
          <Sparkline
            values={clicks}
            label="Clicks, last 12 days"
            tone="gain"
            area
            endpoint
            height={36}
          />
        </div>
        <div style={{ width: 200 }}>
          <Stat label="Refunds" value={6} tone="loss" />
          <Sparkline
            values={refunds}
            label="Refunds, last 12 days"
            tone="loss"
            endpoint
            target={10}
            domain={[0, 16]}
            height={36}
          />
        </div>
      </div>
      <table style={{ borderCollapse: 'collapse' }}>
        <caption style={{ ...head, captionSide: 'top' }}>Margin by region, last 6 months</caption>
        <thead>
          <tr>
            <th style={head} scope="col">
              Region
            </th>
            <th style={head} scope="col">
              Trend
            </th>
          </tr>
        </thead>
        <tbody>
          {regions.map((r) => (
            <tr key={r.name}>
              <th style={cell} scope="row">
                {r.name}
              </th>
              <td style={{ ...cell, width: 120 }}>
                <Sparkline values={r.values} label={`${r.name} margin`} tone={r.tone} endpoint />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
