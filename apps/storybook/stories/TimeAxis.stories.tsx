import type { Meta, StoryObj } from '@storybook/react-vite'
import { LineChart } from 'tally-charts'

// LineChart on a time x axis, in UTC (the default), over three spans: a day of hourly readings,
// a quarter of daily ones and five years of monthly ones. The data is computed, not random, so
// the screenshots are stable.
const DAY = 864e5
const round1 = (v: number) => Math.round(v * 10) / 10

type Reading = { at: string | number | Date; value: number }

const SPANS = {
  hourly: {
    title: 'Line load today',
    meta: 'Share of capacity, hourly',
    description: 'Load peaks at 70% at 3 PM and bottoms out at 34% at 3 AM.',
    format: 'percent',
    // ISO strings, one per hour of March 2, 2026.
    data: Array.from(
      { length: 24 },
      (_, h): Reading => ({
        at: new Date(Date.UTC(2026, 2, 2, h)).toISOString(),
        value: round1(52 + 18 * Math.sin(((h - 9) / 24) * 2 * Math.PI)),
      }),
    ),
  },
  daily: {
    title: 'Margin this quarter',
    meta: 'Daily, January to March 2026',
    description: 'Margin rises from 32.0% on January 1 to 34.4% on March 31, dipping every week.',
    format: 'percent',
    // Epoch milliseconds, one per day of Q1 2026.
    data: Array.from(
      { length: 90 },
      (_, d): Reading => ({
        at: Date.UTC(2026, 0, 1) + d * DAY,
        value: round1(32 + d * 0.04 + 1.2 * Math.sin((d / 7) * 2 * Math.PI)),
      }),
    ),
  },
  monthly: {
    title: 'Revenue over five years',
    meta: 'Monthly, 2021 to 2025, $K',
    description:
      'Revenue grows from $365K in January 2021 to $725K in December 2025, peaking every summer.',
    format: 'number',
    // Dates, one per month from January 2021 to December 2025.
    data: Array.from(
      { length: 60 },
      (_, m): Reading => ({
        at: new Date(Date.UTC(2021, m, 1)),
        value: Math.round(410 + m * 6 + 45 * Math.sin(((m - 3) / 12) * 2 * Math.PI)),
      }),
    ),
  },
} as const

function TimeAxis({ span }: { span: keyof typeof SPANS }) {
  const s = SPANS[span]
  return (
    <article className="card">
      <header className="card-header card-header-stack">
        <h2 className="card-title">{s.title}</h2>
        <span className="card-meta">{s.meta}</span>
      </header>
      <LineChart<Reading>
        title={s.title}
        description={s.description}
        data={s.data}
        x={{ type: 'time', field: 'at' }}
        series={[{ id: 'value', label: s.title, value: 'value' }]}
        format={s.format}
        yAxis={4}
        height={240}
        radius={span === 'hourly' ? 3 : 0}
      />
    </article>
  )
}

const meta = { title: 'Charts/Time axis', component: TimeAxis } satisfies Meta<typeof TimeAxis>

export default meta
type Story = StoryObj<typeof meta>

export const HourlyLight: Story = { args: { span: 'hourly' }, parameters: { theme: 'light' } }
export const HourlyDark: Story = { args: { span: 'hourly' }, parameters: { theme: 'dark' } }
export const DailyLight: Story = { args: { span: 'daily' }, parameters: { theme: 'light' } }
export const DailyDark: Story = { args: { span: 'daily' }, parameters: { theme: 'dark' } }
export const MonthlyLight: Story = { args: { span: 'monthly' }, parameters: { theme: 'light' } }
export const MonthlyDark: Story = { args: { span: 'monthly' }, parameters: { theme: 'dark' } }
