import type { CSSProperties } from 'react'
import { BarChart } from 'tally-charts'
import type { ExampleMeta } from '../types'

export const meta = {
  id: 'dark-mode/side-by-side',
  title: 'Orders by month, light theme',
  rscSafe: true,
} satisfies ExampleMeta

const months = [
  { month: 'Jan', orders: 420 },
  { month: 'Feb', orders: 385 },
  { month: 'Mar', orders: 460 },
  { month: 'Apr', orders: 510 },
  { month: 'May', orders: 475 },
  { month: 'Jun', orders: 540 },
]

const grid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 16rem), 1fr))',
  gap: '1.5rem',
} satisfies CSSProperties

const panel = {
  background: 'var(--ch-surface)',
  color: 'var(--ch-ink)',
  padding: '1rem',
  borderRadius: 'var(--ch-radius)',
} satisfies CSSProperties

// The attribute wins over the system preference, so each panel is in its own theme whatever
// the visitor's setting is. Props stay serializable (no functions): the page is a server component.
export default function SideBySide() {
  return (
    <div style={grid}>
      <div data-ch-theme="light" style={panel}>
        <BarChart
          data={months}
          x="month"
          y="orders"
          height={220}
          title={meta.title}
          description="Orders rose from 420 in January to 540 in June."
        />
      </div>
      <div data-ch-theme="dark" style={panel}>
        <BarChart
          data={months}
          x="month"
          y="orders"
          height={220}
          title="Orders by month, dark theme"
          description="The same orders in the dark theme."
        />
      </div>
    </div>
  )
}
