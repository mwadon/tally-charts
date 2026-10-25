import { BarChart, ChartsProvider, Legend, LineChart, Stat } from 'tally-charts'
import type { ExampleMeta } from '../types'

export const meta = {
  id: 'hooks-and-providers/provider-locale',
  title: 'German locale for every chart on the page',
  rscSafe: true,
} satisfies ExampleMeta

const months = [
  { month: 'Jan', revenue: 12400, cost: 9100 },
  { month: 'Feb', revenue: 13850, cost: 9600 },
  { month: 'Mar', revenue: 15200, cost: 10400 },
  { month: 'Apr', revenue: 14700, cost: 10100 },
  { month: 'May', revenue: 16900, cost: 11200 },
  { month: 'Jun', revenue: 18350, cost: 11900 },
]

// One provider sets the locale and currency for everything inside it. Props stay serializable
// (no functions), so the page can render this in a Server Component.
export default function ProviderLocale() {
  return (
    <ChartsProvider locale="de-DE" currency="EUR">
      <div style={{ display: 'grid', gap: '1.5rem' }}>
        {/* md, not the default lg: the 72 px value is 314 px wide in linux fonts and overflows a 320 px screen. */}
        <Stat
          size="md"
          label="Revenue in June"
          value={18350}
          format="currency"
          caption="Jan to Jun: 91.400 €"
        />
        <BarChart
          data={months}
          x="month"
          y="revenue"
          domain={[0, 20000]}
          format="currency"
          height={240}
          title="Revenue by month, in euros"
          description="Revenue grew from 12.400 € in January to 18.350 € in June."
        />
        <div>
          <Legend
            shape="line"
            items={[
              { label: 'Revenue', tone: 'accent' },
              { label: 'Cost', tone: 'neutral' },
            ]}
          />
          <LineChart
            data={months}
            x="month"
            series={[
              { id: 'revenue', label: 'Revenue', value: 'revenue' },
              { id: 'cost', label: 'Cost', value: 'cost', tone: 'neutral' },
            ]}
            format="currency"
            height={240}
            title="Revenue and cost by month, in euros"
            description="Revenue stayed above cost every month, and the gap widened."
          />
        </div>
      </div>
    </ChartsProvider>
  )
}
