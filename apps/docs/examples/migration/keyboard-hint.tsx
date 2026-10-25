import { BarChart } from 'tally-charts'
import type { ExampleMeta } from '../types'

export const meta = {
  id: 'migration/keyboard-hint',
  title: 'Orders by region, with your own keyboard hint',
  rscSafe: true,
} satisfies ExampleMeta

const regions = [
  { region: 'North', orders: 1280 },
  { region: 'South', orders: 940 },
  { region: 'East', orders: 1115 },
  { region: 'West', orders: 1460 },
]

// The built-in wording is not API and can change in a minor release. A text you pass is used as is,
// so tests and translations can rely on it.
export default function KeyboardHint() {
  return (
    <BarChart
      data={regions}
      x="region"
      y="orders"
      format="number"
      height={220}
      title={meta.title}
      keyboardHint="Arrow keys move between regions. Home and End jump to the first and last."
    />
  )
}
