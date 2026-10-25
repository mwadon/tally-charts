import { WaterfallChart } from 'tally-charts'
import type { ExampleMeta } from '../types'

export const meta = {
  id: 'waterfall-chart/cash-flow',
  title: 'Cash position, March',
  rscSafe: true,
} satisfies ExampleMeta

const steps = [
  { label: 'Customer payments', value: 61500 },
  { label: 'Payroll', value: -38200 },
  { label: 'Materials', value: -24800 },
  { label: 'Equipment lease', value: -6500 },
  { label: 'Insurance refund', value: 2100 },
]

// `format` is a preset with digits, so it stays serializable (no functions): a server component can render it.
export default function CashFlow() {
  return (
    <WaterfallChart
      title={meta.title}
      description="Cash fell from $84.0K to $78.1K. Customer payments and a refund brought in $63.6K, payroll, materials and the lease took out $69.5K."
      start={{ label: 'Opening cash', value: 84000 }}
      steps={steps}
      end={{ label: 'Closing cash' }}
      format={{ preset: 'currency-compact', digits: 1 }}
    />
  )
}
