import type { CSSProperties } from 'react'
import { LineChart } from 'tally-charts'
import type { ExampleMeta } from '../types'

export const meta = {
  id: 'theming/nested-dark',
  title: 'Active users, in a dark panel',
  rscSafe: true,
} satisfies ExampleMeta

const weeks = [
  { week: 'W1', users: 1820 },
  { week: 'W2', users: 1905 },
  { week: 'W3', users: 2010 },
  { week: 'W4', users: 1985 },
  { week: 'W5', users: 2140 },
  { week: 'W6', users: 2260 },
]

// The panel sets the theme for everything inside it; the surface and ink come from the theme's
// own tokens, so the box matches the chart.
const panel = {
  background: 'var(--ch-surface)',
  color: 'var(--ch-ink)',
  padding: '1rem',
  borderRadius: 'var(--ch-radius)',
} satisfies CSSProperties

// Props stay serializable (no functions): the page is a server component.
export default function NestedDark() {
  return (
    <div data-ch-theme="dark" style={panel}>
      <LineChart
        data={weeks}
        x="week"
        series={[{ id: 'users', label: 'Active users', value: 'users' }]}
        height={220}
        title={meta.title}
        description="Active users rose from 1,820 in W1 to 2,260 in W6."
      />
    </div>
  )
}
