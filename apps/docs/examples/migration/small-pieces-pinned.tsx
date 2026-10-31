import { DotCount, InlineBar, Meter, RangeMeter } from 'tally-charts'
import type { ExampleMeta } from '../types'

export const meta = {
  id: 'migration/small-pieces-pinned',
  title: 'Small pieces with the 0.9 look',
  rscSafe: true,
} satisfies ExampleMeta

const stack = { display: 'grid', gap: '1.5rem', maxWidth: '24rem' } as const

// 0.9 drew these pink or hatched with no props. In 1.0 you ask for it.
export default function SmallPiecesPinned() {
  return (
    <div style={stack}>
      <InlineBar value={12.3} max={40} format="percent" tone="loss" fill="hatch" label="Margin" />
      <Meter value={34} min={20} max={45} format="percent" fill="hatch" label="Gross margin" />
      <RangeMeter
        value={12.3}
        reference={36}
        max={40}
        format="percent"
        tone="loss"
        referenceTone="accent"
        label="Margin, actual against estimated"
      />
      <DotCount count={29} tone="loss" label="29 jobs" />
    </div>
  )
}
