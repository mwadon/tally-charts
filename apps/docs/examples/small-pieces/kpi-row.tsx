import { Delta, DotCount, InlineBar, Stat } from 'tally-charts'
import type { ExampleMeta } from '../types'

export const meta = {
  id: 'small-pieces/kpi-row',
  title: 'Headline numbers and a per-region table',
  rscSafe: true,
} satisfies ExampleMeta

const regions = [
  { name: 'North', revenue: 482, target: 450, open: 6 },
  { name: 'South', revenue: 391, target: 450, open: 14 },
  { name: 'East', revenue: 436, target: 450, open: 9 },
  { name: 'West', revenue: 268, target: 450, open: 27 },
]

const row = { display: 'flex', flexWrap: 'wrap', gap: '2rem' } as const
const cell = { padding: '0.5rem 0.5rem 0.5rem 0', textAlign: 'left' } as const
const head = { ...cell, color: 'var(--ch-ink-muted)', fontWeight: 'normal' } as const

// None of these pieces draws an <svg>: they are HTML and CSS. Props stay serializable (no
// functions), so the example also renders in a Server Component.
export default function KpiRow() {
  return (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      <div style={row}>
        <Stat
          label="Revenue"
          value={1577}
          format="currency-compact"
          delta={<Delta value={4.2} format={{ preset: 'percent', digits: 1 }} />}
          caption="vs last month"
        />
        <Stat
          label="Gross margin"
          value={34.1}
          format={{ preset: 'percent', digits: 1 }}
          delta={<Delta value={-1.2} format={{ preset: 'pts', digits: 1 }} good="up" />}
          caption="vs last month"
        />
        <Stat
          label="Cost per job"
          value={212}
          format="currency"
          size="md"
          tone="loss"
          delta={<Delta value={8} format="currency" good="down" signed />}
          caption="vs last month"
        />
      </div>
      {/* biome-ignore lint/a11y/useSemanticElements lint/a11y/noNoninteractiveTabindex: a scrollable region must be focusable, or keyboard users cannot scroll it on a narrow screen */}
      <div role="region" aria-label="Regions" tabIndex={0} style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse' }}>
          <caption style={{ ...head, captionSide: 'top' }}>Revenue and open jobs by region</caption>
          <thead>
            <tr>
              <th style={head} scope="col">
                Region
              </th>
              <th style={head} scope="col">
                Revenue, k
              </th>
              <th style={head} scope="col">
                Open jobs
              </th>
            </tr>
          </thead>
          <tbody>
            {regions.map((r) => (
              <tr key={r.name}>
                <th style={cell} scope="row">
                  {r.name}
                </th>
                <td style={cell}>
                  <InlineBar
                    label={`${r.name} revenue`}
                    value={r.revenue}
                    max={500}
                    target={r.target}
                    width={56}
                    tone={r.revenue >= r.target ? 'gain' : 'loss'}
                  />{' '}
                  {r.revenue}
                </td>
                <td style={cell}>
                  <DotCount
                    count={r.open}
                    max={30}
                    perRow={10}
                    tone={r.open > 20 ? 'loss' : 'neutral'}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
