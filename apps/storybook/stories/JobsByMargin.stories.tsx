import type { Meta, StoryObj } from '@storybook/react-vite'
import { DotHistogram, fmt, Legend, thresholds } from 'tally-charts'

// docs/reference/02-jobs-dot-histogram-table.png, card "158 jobs by margin".
const customers = [
  'Brookside Apartments',
  'Cedar Park Lofts',
  'Lakeview Dental',
  'ABC Property Group',
  'Garza residence',
]

/** n deterministic values between from and to, bunched towards the middle. */
function spread(n: number, from: number, to: number, a: number, b: number): number[] {
  return Array.from({ length: n }, (_, i) => {
    const u = (((i * a) % n) / n + ((i * b) % n) / n) / 2
    return Math.round((from + (to - from) * u) * 10) / 10
  })
}

const margins = [
  3.1,
  4.2,
  6.1,
  7.7,
  8.8,
  9.4,
  ...spread(16, 10.2, 24.6, 7, 11),
  ...spread(42, 25.3, 37.7, 13, 17),
  ...spread(94, 38.2, 57.4, 37, 53),
]
const jobs = margins.map((margin, i) => ({
  id: i === 8 ? 5819 : 5600 + i,
  margin: i === 8 ? 12.3 : margin,
  customer: i === 8 ? 'ABC Property Group' : (customers[i % customers.length] as string),
}))

const bands = thresholds(
  [10, 25, 38],
  ['loss', 'warn', 'accent-soft', 'gain'],
  ['Critical', 'At risk', 'Below target', 'On target'],
)

function JobsByMargin() {
  return (
    <article className="card card-wide">
      <header className="card-header-row">
        <div>
          <h2 className="card-title">158 jobs by margin</h2>
          <span className="card-meta">One dot per job completed this week</span>
        </div>
        <Legend shape="dot" items={bands.legend(jobs.map((j) => j.margin))} />
      </header>
      <DotHistogram
        title="Jobs by margin this week"
        description="94 of 158 jobs reached the 38% target; 6 are critical, below 10%."
        data={jobs}
        value="margin"
        id="id"
        label={(d) => `#${d.id}`}
        segments={(d) => [
          { value: `#${d.id}` },
          { value: fmt.percent(d.margin) },
          { value: d.customer },
        ]}
        format="percent"
        toneBy={bands}
        domain={[0, 60]}
        target={{ value: 38, label: 'Target 38%' }}
        calloutId={5819}
        height={240}
      />
    </article>
  )
}

const meta = {
  title: 'Reference/Jobs by margin',
  component: JobsByMargin,
} satisfies Meta<typeof JobsByMargin>

export default meta
type Story = StoryObj<typeof meta>

export const Light: Story = { parameters: { theme: 'light' } }
export const Dark: Story = { parameters: { theme: 'dark' } }
