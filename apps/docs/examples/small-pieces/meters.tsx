import { Meter, RangeMeter, ShareBar, ZoneMeter } from 'tally-charts'
import type { ExampleMeta } from '../types'

export const meta = {
  id: 'small-pieces/meters',
  title: 'Meters and a share bar',
  rscSafe: true,
} satisfies ExampleMeta

// The `{ bins, inclusive }` shape of `thresholds()`, written out so it is plain data. Each bin is
// [min, max); the first starts at -Infinity and the last ends at Infinity.
const pageLoad = {
  inclusive: 'lower',
  bins: [
    { label: 'Good', tone: 'gain', min: Number.NEGATIVE_INFINITY, max: 2.5 },
    { label: 'Needs work', tone: 'warn', min: 2.5, max: 4 },
    { label: 'Poor', tone: 'loss', min: 4, max: Number.POSITIVE_INFINITY },
  ],
} as const

const stack = { display: 'grid', gap: '1.75rem', maxWidth: '32rem' } as const

// Props stay serializable (no functions, only plain objects), so this example also renders in a
// Server Component.
export default function Meters() {
  return (
    <div style={stack}>
      <Meter
        label="Sales target"
        value={68}
        max={100}
        target={80}
        format={{ preset: 'percent', digits: 0 }}
      />
      <RangeMeter
        label="Margin"
        value={31}
        reference={38}
        max={50}
        format={{ preset: 'percent', digits: 0 }}
        referenceLabel="Plan 38%"
      />
      <ZoneMeter
        label="Largest contentful paint"
        value={3.1}
        zones={pageLoad}
        max={6}
        maxLabel="6 s+"
        format={{ preset: 'number', digits: 1 }}
      />
      <ShareBar
        label="Revenue by channel"
        format="currency-compact"
        segments={[
          { label: 'Direct', value: 2711, tone: 'accent' },
          { label: 'Partners', value: 1890, tone: 'gain' },
          { label: 'Online', value: 1240, tone: 'warn', fill: 'hatch' },
        ]}
      />
    </div>
  )
}
