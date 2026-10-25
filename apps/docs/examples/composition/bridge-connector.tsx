import { Axis, Bars, Chart, Connector, ValueLabel } from 'tally-charts'
import type { ExampleMeta } from '../types'

export const meta = {
  id: 'composition/bridge-connector',
  title: 'Profit bridge from Q2 to Q3',
  rscSafe: true,
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

// `tone` is one value per Bars, so each tone gets its own layer over the same chart scales.
const ofKind = (kind: string) => steps.filter((s) => s.kind === kind)

// Props stay serializable: `from` is a field name and every tone is a literal, no functions.
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
      <Bars data={ofKind('total')} x="step" y="top" from="base" id="step" />
      <Bars data={ofKind('gain')} x="step" y="top" from="base" id="step" tone="gain" />
      <Bars data={ofKind('loss')} x="step" y="top" from="base" id="step" tone="loss" />
      <ValueLabel at="first" />
      <ValueLabel at="last" />
      <Axis side="bottom" />
    </Chart>
  )
}
