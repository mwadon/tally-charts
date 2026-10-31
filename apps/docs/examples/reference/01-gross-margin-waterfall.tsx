'use client'

import { BarChart, Delta, fmt, Meter, Stat, WaterfallChart } from 'tally-charts'
import type { ExampleMeta } from '../types'

export const meta = {
  id: 'reference/01-gross-margin-waterfall',
  title: 'Gross margin: weekly result, 12-week trend and what pulls it under target',
  rscSafe: false,
} satisfies ExampleMeta

const weeks = [
  { week: 'Jul 6', margin: 37.5 },
  { week: 'Jul 13', margin: 36.9 },
  { week: 'Jul 20', margin: 35.6 },
  { week: 'Jul 27', margin: 37.1 },
  { week: 'Aug 3', margin: 34.9 },
  { week: 'Aug 10', margin: 33.9 },
  { week: 'Aug 17', margin: 35.1 },
  { week: 'Aug 24', margin: 33.7 },
  { week: 'Aug 31', margin: 32.6 },
  { week: 'Sep 7', margin: 35.9 },
  { week: 'Sep 14', margin: 36.6 },
  { week: 'Sep 21', margin: 34.0 },
]

const steps = [
  { label: 'Labor overruns', value: -1.6, meta: 7700 },
  { label: 'Material variance', value: -1.1, meta: 5300 },
  { label: 'Callbacks', value: -0.7, meta: 3400 },
  { label: 'Discounting', value: -0.4, meta: 1900 },
  { label: 'Other', value: -0.2, meta: 1000 },
]

// 'use client': WaterfallChart gets a function (stepLabel), which a server component cannot pass.
export default function GrossMarginWaterfall() {
  return (
    <div className="ref-dashboard">
      <div className="ref-stack">
        <article className="ref-card">
          <header className="ref-card-header ref-card-header-stack">
            <h2 className="ref-card-title">Gross margin</h2>
            <span className="ref-card-meta">Week of Sep 21 to 27</span>
          </header>
          <Stat
            value={34}
            format="percent"
            delta={<Delta value={-1.2} format="pts" />}
            caption="vs last week"
          />
          <p className="ref-card-text">
            4.0 pts under the 38.0% target. $19.3K of profit lost against target this week.
          </p>
          <Meter
            value={34}
            min={20}
            max={45}
            target={38}
            format="percent"
            fill="hatch"
            label="Gross margin against the 38% target"
            minLabel="20%"
            targetLabel="Target 38%"
          />
          <dl className="ref-stat-rows">
            <div>
              <dt>Revenue</dt>
              <dd>
                $482K <Delta value={6.2} format="percent" />
              </dd>
            </div>
            <div>
              <dt>Gross profit</dt>
              <dd>
                $164K <Delta value={2.5} format="percent" />
              </dd>
            </div>
            <div>
              <dt>Jobs completed</dt>
              <dd>158</dd>
            </div>
          </dl>
        </article>

        <article className="ref-card">
          <header className="ref-card-header">
            <h2 className="ref-card-title">Last 12 weeks</h2>
            <span className="ref-card-meta">Margin by week</span>
          </header>
          <BarChart
            data={weeks}
            x="week"
            y="margin"
            domain={[26, 40]}
            target={{ value: 38, label: 'Target 38%' }}
            height={260}
            format="percent"
            valueFormat={{ preset: 'number', digits: 1 }}
            title="Margin by week, last 12 weeks"
            description="Margin stayed under the 38% target all 12 weeks; this week is 34.0%."
          />
        </article>
      </div>

      <article className="ref-card">
        <header className="ref-card-header ref-card-header-stack">
          <h2 className="ref-card-title">Why it is under target</h2>
          <span className="ref-card-meta">4.0 points lost against the 38% target</span>
        </header>
        <WaterfallChart
          title="Why margin is under target"
          description="Labor and materials explain two thirds of the 4.0 point gap."
          start={{ label: 'Target', value: 38 }}
          steps={steps}
          end={{ label: 'Actual' }}
          format="percent"
          domain={[34, 38]}
          stepLabel={(s) => `${fmt.pts(s.value)} · ${fmt.currencyCompact(s.meta)}`}
        />
        <div className="ref-insight">
          <p>Labor and materials explain two thirds of the gap.</p>
          <p className="ref-muted">Both trace back to installs in Dallas.</p>
        </div>
      </article>
    </div>
  )
}
