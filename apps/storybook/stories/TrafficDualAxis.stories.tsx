import type { Meta, StoryObj } from '@storybook/react-vite'
import { Axis, Bars, Chart, Grid, Legend, Line, Tooltip, ValueLabel } from 'tally-charts'

// The glokki editor's traffic chart as a composition: hatched views on the left scale, one solid
// peak with a value pill, and unique visitors as a line on its own right scale. The data is
// computed, not random, so the screenshots are stable.
type Day = { day: string; views: number; uniques: number; peak: boolean }

const days: Day[] = [
  [540, 260],
  [610, 300],
  [480, 240],
  [720, 350],
  [850, 410],
  [790, 380],
  [1040, 470],
  [660, 330],
  [590, 290],
  [700, 340],
  [880, 420],
  [830, 400],
  [760, 370],
  [920, 440],
].map(([views = 0, uniques = 0], i) => ({
  day: `Oct ${18 + i}`,
  views,
  uniques,
  peak: views === 1040,
}))

const peak = days.filter((d) => d.peak)

function Traffic() {
  return (
    <article className="card card-wide" style={{ maxWidth: 760 }}>
      <header className="card-header card-header-stack">
        <h2 className="card-title">Traffic over time</h2>
        <span className="card-meta">Last 14 days</span>
      </header>
      <Legend
        items={[
          { label: 'Views', fill: 'hatch' },
          { label: 'Peak day', color: 'var(--ch-warn)' },
          { label: 'Unique visitors', shape: 'line', tone: 'accent' },
        ]}
      />
      <Chart<Day>
        data={days}
        x={{ type: 'band', field: 'day', padding: 0.3 }}
        y={{ field: 'views', domain: [0, 1200] }}
        y2={{ field: 'uniques', domain: [0, 600] }}
        margin={{ top: 32, left: 44, right: 44 }}
        height={260}
        title="Traffic over time"
        description="Views peaked at 1,040 on Oct 24; unique visitors follow on their own scale."
        dataTable={{
          columns: [
            { header: 'Day', value: (d) => d.day },
            { header: 'Views', value: (d) => String(d.views) },
            { header: 'Unique visitors', value: (d) => String(d.uniques) },
          ],
        }}
      >
        <Grid ticks={6} />
        <Bars<Day>
          id="day"
          tone="neutral"
          fill={(d) => (d.peak ? 'solid' : 'hatch')}
          color={(d) => (d.peak ? 'var(--ch-warn)' : undefined)}
          segments={(d) => [
            { value: d.day },
            { value: `${d.views.toLocaleString('en-US')} views` },
            { value: `${d.uniques.toLocaleString('en-US')} unique`, tone: 'accent' },
          ]}
          ariaLabel={(d) => `${d.day}, ${d.views} views, ${d.uniques} unique visitors`}
        />
        <ValueLabel at="max" variant="pill" />
        <Line scale="y2" dots="none" />
        <Line data={peak} scale="y2" />
        <Axis side="left" ticks={6} />
        <Axis side="right" scale="y2" tone="accent" ticks={6} />
        <Axis side="bottom" />
        <Tooltip />
      </Chart>
    </article>
  )
}

const meta = { title: 'Reference/Traffic dual axis', component: Traffic } satisfies Meta<
  typeof Traffic
>

export default meta
type Story = StoryObj<typeof meta>

export const Light: Story = { parameters: { theme: 'light' } }
export const Dark: Story = { parameters: { theme: 'dark' } }
