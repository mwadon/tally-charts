import type { Meta, StoryObj } from '@storybook/react-vite'
import { Delta, StripPlot } from 'tally-charts'

// docs/reference/06-drilldown-strip-plot.png, card "29 Dallas installs, hours per job".
const estimated = [
  5.2, 5.6, 5.7, 5.8, 5.8, 5.9, 5.9, 6.0, 6.0, 6.0, 6.1, 6.1, 6.1, 6.1, 6.1, 6.2, 6.2, 6.2, 6.3,
  6.3, 6.4, 6.4, 6.5, 6.5, 6.6, 6.7, 6.8, 7.0, 7.2,
]
const actual = [
  6.3, 6.9, 7.1, 7.2, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 8.0, 8.0, 8.1, 8.1, 8.2, 8.2, 8.3, 8.4, 8.5,
  8.6, 8.8, 9.0, 9.2, 9.5, 9.8, 10.2, 10.6, 11.0, 11.6,
]
const installs = estimated.map((est, i) => ({ job: `#${5900 + i}`, est, act: actual[i] ?? null }))

function DallasInstalls() {
  return (
    <article className="card card-wide">
      <header className="card-header-row">
        <div>
          <h2 className="card-title">29 Dallas installs, hours per job</h2>
          <span className="card-meta">Each dot is one install, estimated against actual</span>
        </div>
        <Delta value={34} format="percent" good="down" signed />
      </header>
      <StripPlot
        title="Install hours, estimated against actual"
        description="Installs take 8.2 hours at the median against 6.1 estimated."
        data={installs}
        label="job"
        series={[
          { id: 'est', label: 'Estimated', value: 'est', tone: 'accent-soft' },
          { id: 'act', label: 'Actual', value: 'act', tone: 'loss' },
        ]}
        format="hours"
        domain={[4, 12]}
        axisFormat={(v) => `${v} h`}
        radius={4}
      />
    </article>
  )
}

const meta = {
  title: 'Reference/Dallas installs',
  component: DallasInstalls,
} satisfies Meta<typeof DallasInstalls>

export default meta
type Story = StoryObj<typeof meta>

export const Light: Story = { parameters: { theme: 'light' } }
export const Dark: Story = { parameters: { theme: 'dark' } }
