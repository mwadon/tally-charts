import { BarChart, Stat } from 'tally-charts'
import type { ExampleMeta } from '../types'

export const meta = {
  id: 'formatting/presets',
  title: 'Presets as strings and as objects',
  rscSafe: true,
} satisfies ExampleMeta

const channels = [
  { channel: 'Email', conversion: 4.2 },
  { channel: 'Search', conversion: 3.1 },
  { channel: 'Social', conversion: 1.8 },
  { channel: 'Referral', conversion: 5.6 },
]

// A preset is a string or `{ preset, digits, signed }`. Both are plain values, so this example
// renders in a Server Component, unlike a formatter function.
export default function Presets() {
  return (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem' }}>
        <Stat label="Monthly revenue" value={1840000} format="currency-compact" />
        <Stat label="Conversion" value={3.9} format="percent" />
        <Stat label="Change since March" value={0.6} format={{ preset: 'pts', digits: 1 }} />
        <Stat label="Support time" value={126.5} format="hours" />
      </div>
      <BarChart
        data={channels}
        x="channel"
        y="conversion"
        domain={[0, 6]}
        format={{ preset: 'percent', digits: 0 }}
        height={240}
        title="Conversion by channel, whole percents"
        description="Referral converts best at 6%, social worst at 2%. Values are rounded to whole percents."
      />
    </div>
  )
}
