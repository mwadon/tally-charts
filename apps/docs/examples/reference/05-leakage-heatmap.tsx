import { Delta, Heatmap, Legend, Stat, WaffleColumns } from 'tally-charts'
import type { ExampleMeta } from '../types'

export const meta = {
  id: 'reference/05-leakage-heatmap',
  title: 'Leakage: profit leaked by week, and by branch and cause',
  rscSafe: true,
} satisfies ExampleMeta

const weeks = [
  { week: 'Aug 3', leaked: 9800, month: 'August' },
  { week: 'Aug 10', leaked: 10200, month: 'August' },
  { week: 'Aug 17', leaked: 9600, month: 'August' },
  { week: 'Aug 24', leaked: 7900, month: 'August' },
  { week: 'Aug 31', leaked: 10100, month: 'September' },
  { week: 'Sep 7', leaked: 23400, month: 'September' },
  { week: 'Sep 14', leaked: 10600, month: 'September' },
  { week: 'Sep 21', leaked: 9400, month: 'September' },
]

const causes = ['Labor', 'Materials', 'Callbacks', 'Discounts', 'Unbilled']
const amounts: Record<string, number[]> = {
  Dallas: [14800, 7900, 6800, 3100, 3600],
  Austin: [9200, 5100, 3900, 4200, 1900],
  Houston: [7200, 5700, 3700, 2500, 2800],
}
const leaks = Object.entries(amounts).flatMap(([branch, values]) =>
  values.map((amount, i) => ({ branch, cause: causes[i] ?? '', amount })),
)

const bins = ['Under $4K', '$4K to 7K', '$7K to 13K', '$13K and up']
const binLevels = [1, 2, 4, 5] as const

// Props stay serializable (no functions): the page is a server component.
export default function LeakageHeatmap() {
  return (
    <div className="ref-dashboard">
      <article className="ref-card">
        <header className="ref-card-header ref-card-header-stack">
          <h2 className="ref-card-title">Profit leaked</h2>
          <span className="ref-card-meta">4.4 pts of margin on $1.86M revenue</span>
        </header>
        <Stat
          value={82400}
          format="currency-compact"
          delta={<Delta value={8300} format="currency-compact" good="down" />}
          caption="vs the same days in August"
        />
        <WaffleColumns
          title="Profit leaked by week"
          description="September leaked more than August; the week of Sep 7 peaked at $23.4K."
          data={weeks}
          x="week"
          y="leaked"
          group="month"
          unit={2000}
          format="currency-compact"
          height={216}
        />
      </article>

      <article className="ref-card ref-card-wide">
        <header className="ref-card-header-row">
          <div>
            <h2 className="ref-card-title">Where it leaks</h2>
            <span className="ref-card-meta">By branch and cause, September to date</span>
          </div>
          <Legend items={bins.map((label, i) => ({ label, level: binLevels[i] }))} />
        </header>
        <Heatmap
          title="Profit leaked by branch and cause"
          description="Dallas carries 44% of September leakage on 41% of revenue. Labor in Dallas alone is $14.8K."
          data={leaks}
          row="branch"
          column="cause"
          value="amount"
          breaks={[4000, 7000, 13000]}
          binLabels={bins}
          format="currency-compact"
          legend={false}
        />
        <p className="ref-card-text">
          Dallas carries 44% of September leakage on 41% of revenue. Labor in Dallas alone is
          $14.8K.
        </p>
      </article>
    </div>
  )
}
