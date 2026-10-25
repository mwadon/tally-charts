'use client'

import { Axis, Bars, Chart, Connector, ValueLabel } from 'tally-charts'
import type { ExampleMeta } from '../types'

export const meta = {
  id: 'composition/bridge-connector',
  title: 'Profit bridge from Q2 to Q3',
  rscSafe: false,
} satisfies ExampleMeta

// Each step floats between `base` and `top`: Bars reads the end from `y` and the start from `from`.
const steps = [
  { step: 'Q2', base: 0, top: 120, kind: 'total' },
  { step: 'Volume', base: 120, top: 150, kind: 'gain' },
  { step: 'Price', base: 150, top: 170, kind: 'gain' },
  { step: 'Costs', base: 140, top: 170, kind: 'loss' },
  { step: 'Returns', base: 128, top: 140, kind: 'loss' },
  { step: 'Q3', base: 0, top: 128, kind: 'total' },
]

type Step = (typeof steps)[number]

// `tone` takes a function per bar, so one layer holds the whole bridge. One layer also keeps the
// bars registered in x order, which is the order the keyboard and screen readers walk them in.
const toneOf = (s: Step) => (s.kind === 'gain' ? 'gain' : s.kind === 'loss' ? 'loss' : 'accent')

// A floating bar's value is its end (`top`), so say the change in the announcement and tooltip.
const change = (s: Step) =>
  s.kind === 'total' ? `${s.top}` : s.kind === 'gain' ? `+${s.top - s.base}` : `-${s.top - s.base}`

// The functions in `tone`, `ariaLabel` and `segments` cannot cross the server boundary, so this
// file starts with 'use client'.
export default function BridgeConnector() {
  return (
    <Chart
      data={steps}
      x={{ type: 'band', field: 'step', padding: 0.4 }}
      y={{ field: 'top', domain: [0, 200] }}
      margin={{ top: 28 }}
      height={280}
      title={meta.title}
      description="Profit rose from 120 to 170 on volume and price, then fell back to 128 after costs and returns."
    >
      <Connector
        links={[
          { at: 120, from: 'Q2', to: 'Volume' },
          { at: 150, from: 'Volume', to: 'Price' },
          { at: 170, from: 'Price', to: 'Costs' },
          { at: 140, from: 'Costs', to: 'Returns' },
          { at: 128, from: 'Returns', to: 'Q3' },
        ]}
      />
      <Bars
        x="step"
        y="top"
        from="base"
        id="step"
        tone={toneOf}
        ariaLabel={(s) => `${s.step}, ${change(s)}`}
        segments={(s) => [{ value: s.step }, { value: change(s) }]}
      />
      <ValueLabel at="first" />
      <ValueLabel at="last" />
      <Axis side="bottom" />
    </Chart>
  )
}
