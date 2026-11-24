import { Treemap } from 'tally-charts'
import type { ExampleMeta } from '../types'

export const meta = {
  id: 'treemap/flat',
  title: 'Service lines without groups',
  rscSafe: true,
} satisfies ExampleMeta

// The same fictional service lines, without their groups.
const lines = [
  { line: 'Kitchen', revenue: 412000, margin: 34 },
  { line: 'Bath', revenue: 286000, margin: 31 },
  { line: 'Plumbing', revenue: 188000, margin: 42 },
  { line: 'Decks', revenue: 164000, margin: 27 },
  { line: 'Basement', revenue: 148000, margin: 22 },
  { line: 'Electrical', revenue: 142000, margin: 38 },
  { line: 'Whole-home', revenue: 96000, margin: 8 },
  { line: 'Roofing', revenue: 96000, margin: 16 },
  { line: 'Annual plans', revenue: 86000, margin: 46 },
  { line: 'Fencing', revenue: 82000, margin: 24 },
  { line: 'Handyman', revenue: 54000, margin: 18 },
  { line: 'Landscaping', revenue: 48000, margin: 12 },
  { line: 'Seasonal', revenue: 38000, margin: 41 },
]

// No `group`: the tiles fill the whole box, largest first, and there are no headers. A lower
// box than the default 480 px.
export default function Flat() {
  return (
    <Treemap
      data={lines}
      name="line"
      value="revenue"
      shade="margin"
      breaks={[10, 20, 30, 40]}
      format="currency-compact"
      shadeFormat={{ preset: 'percent', digits: 0 }}
      shadeLabel="Gross margin"
      height={360}
      title={meta.title}
      description="Kitchen remodels alone are 22% of revenue."
    />
  )
}
