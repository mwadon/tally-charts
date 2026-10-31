'use client'

import { Axis, Bars, Chart, Grid, Legend, Line, Tooltip, ValueLabel } from 'tally-charts'
import type { ExampleMeta } from '../types'

export const meta = {
  id: 'composition/dual-axis-traffic',
  title: 'Page views and unique visitors per day',
  rscSafe: false,
} satisfies ExampleMeta

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

// Both domains are explicit and both axes ask for 6 ticks, so the 7 tick lines sit at the same
// heights: 0, 200 ... 1200 views against 0, 100 ... 600 visitors.
// Functions as props (fill, color, segments, the data table), so the file is a client component.
export default function DualAxisTraffic() {
  return (
    <div style={{ display: 'grid', gap: 12 }}>
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
        height={280}
        title={meta.title}
        description="Views peaked at 1,040 on Oct 24; unique visitors followed the same shape on their own scale."
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
    </div>
  )
}
