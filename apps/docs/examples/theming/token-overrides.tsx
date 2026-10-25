import type { CSSProperties } from 'react'
import { BarChart } from 'tally-charts'
import type { ExampleMeta } from '../types'

export const meta = {
  id: 'theming/token-overrides',
  title: 'Revenue by month, default tokens',
  rscSafe: true,
} satisfies ExampleMeta

const months = [
  { month: 'Jan', revenue: 118 },
  { month: 'Feb', revenue: 126 },
  { month: 'Mar', revenue: 141 },
  { month: 'Apr', revenue: 137 },
  { month: 'May', revenue: 152 },
  { month: 'Jun', revenue: 164 },
]

const grid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 16rem), 1fr))',
  gap: '1.5rem',
} satisfies CSSProperties

// Tokens are inherited custom properties, so a style on the container reaches every chart
// inside it. Here one token is pointed at another one, and two are plain numbers.
const overrides = {
  '--ch-accent': 'var(--ch-loss)',
  '--ch-radius': '0',
  '--ch-hatch-gap': '4',
} as CSSProperties

// Props stay serializable (no functions): the page is a server component.
export default function TokenOverrides() {
  return (
    <div style={grid}>
      <BarChart
        data={months}
        x="month"
        y="revenue"
        height={220}
        title={meta.title}
        description="Revenue grew from 118k in January to 164k in June, in the default accent color."
      />
      <div style={overrides}>
        <BarChart
          data={months}
          x="month"
          y="revenue"
          height={220}
          title="Revenue by month, overridden tokens"
          description="The same revenue, drawn with the accent set to the loss color, square corners and tighter hatching."
        />
      </div>
    </div>
  )
}
