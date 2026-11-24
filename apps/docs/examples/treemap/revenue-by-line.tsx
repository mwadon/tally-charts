import { Treemap } from 'tally-charts'
import type { ExampleMeta } from '../types'

export const meta = {
  id: 'treemap/revenue-by-line',
  title: 'Revenue and margin by service line',
  rscSafe: true,
} satisfies ExampleMeta

// Fictional revenue of a contractor by service line in four groups, with gross margin in
// percent; total $1.84M.
const lines = [
  { line: 'Kitchen', group: 'Remodels', revenue: 412000, margin: 34 },
  { line: 'Bath', group: 'Remodels', revenue: 286000, margin: 31 },
  { line: 'Basement', group: 'Remodels', revenue: 148000, margin: 22 },
  { line: 'Whole-home', group: 'Remodels', revenue: 96000, margin: 8 },
  { line: 'Plumbing', group: 'Repairs', revenue: 188000, margin: 42 },
  { line: 'Electrical', group: 'Repairs', revenue: 142000, margin: 38 },
  { line: 'Roofing', group: 'Repairs', revenue: 96000, margin: 16 },
  { line: 'Handyman', group: 'Repairs', revenue: 54000, margin: 18 },
  { line: 'Decks', group: 'Outdoor', revenue: 164000, margin: 27 },
  { line: 'Fencing', group: 'Outdoor', revenue: 82000, margin: 24 },
  { line: 'Landscaping', group: 'Outdoor', revenue: 48000, margin: 12 },
  { line: 'Annual plans', group: 'Maintenance plans', revenue: 86000, margin: 46 },
  { line: 'Seasonal', group: 'Maintenance plans', revenue: 38000, margin: 41 },
]

// Field names, preset formats and literal breaks: the page is a server component. Area is
// revenue, the shade is the margin's bin.
export default function RevenueByLine() {
  return (
    <Treemap
      data={lines}
      name="line"
      value="revenue"
      group="group"
      shade="margin"
      breaks={[10, 20, 30, 40]}
      format="currency-compact"
      shadeFormat={{ preset: 'percent', digits: 0 }}
      shadeLabel="Gross margin"
      title={meta.title}
      description="Remodels bring in just over half of revenue; whole-home remodels run at an 8% margin."
    />
  )
}
