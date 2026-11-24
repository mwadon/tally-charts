import type { Meta, StoryObj } from '@storybook/react-vite'
import type { CSSProperties } from 'react'
import { Treemap } from 'tally-charts'

// Fictional revenue of a contractor by service line in four groups, with gross margin as the
// shade; total $1.84M. Group totals: Remodels $942K, Repairs $480K, Outdoor $294K, Maintenance
// plans $124K.
const lines = [
  ['Kitchen', 'Remodels', 412, 34],
  ['Bath', 'Remodels', 286, 31],
  ['Basement', 'Remodels', 148, 22],
  ['Whole-home', 'Remodels', 96, 8],
  ['Plumbing', 'Repairs', 188, 42],
  ['Electrical', 'Repairs', 142, 38],
  ['Roofing', 'Repairs', 96, 16],
  ['Handyman', 'Repairs', 54, 18],
  ['Decks', 'Outdoor', 164, 27],
  ['Fencing', 'Outdoor', 82, 24],
  ['Landscaping', 'Outdoor', 48, 12],
  ['Annual plans', 'Maintenance plans', 86, 46],
  ['Seasonal', 'Maintenance plans', 38, 41],
].map(([line, group, revenue, margin]) => ({
  key: String(line).toLowerCase(),
  line: line as string,
  group: group as string,
  revenue: (revenue as number) * 1000,
  margin: margin as number,
}))

const MARGIN = { preset: 'percent', digits: 0 } as const

// The artboard: the chart 1024 px wide (card padding 28 on each side).
const ARTBOARD: CSSProperties = { maxWidth: 1080 }

function RevenueByLine({
  style = ARTBOARD,
  grouped = true,
}: {
  style?: CSSProperties
  grouped?: boolean
}) {
  return (
    <article className="card card-wide" style={style}>
      <header className="card-header">
        <h2 className="card-title">Revenue by service line</h2>
        <span className="card-meta">$1.84M · 13 lines</span>
      </header>
      <Treemap
        data={lines}
        id="key"
        name="line"
        value="revenue"
        group={grouped ? 'group' : undefined}
        shade="margin"
        breaks={[10, 20, 30, 40]}
        format="currency-compact"
        shadeFormat={MARGIN}
        shadeLabel="Gross margin"
        title="Revenue by service line"
        description="Remodels bring in just over half of revenue; whole-home remodels run at an 8% margin."
      />
    </article>
  )
}

const meta = {
  title: 'Charts/Treemap',
  component: RevenueByLine,
} satisfies Meta<typeof RevenueByLine>

export default meta
type Story = StoryObj<typeof meta>

export const Light: Story = { parameters: { theme: 'light' } }
export const Dark: Story = { parameters: { theme: 'dark' } }

// The same lines without `group`: the tiles fill the whole box and no headers are drawn.
export const Flat: Story = {
  parameters: { theme: 'light' },
  args: { grouped: false },
}

// The service lines in a chart 360 px wide (card padding 28 on each side).
export const Narrow: Story = {
  parameters: { theme: 'light' },
  args: { style: { maxWidth: 416 } },
}

// Defaults only: no theme of its own, `name` and `value`. Every tile is the middle level.
export const Plain: Story = {
  render: () => (
    <article className="card card-wide">
      <Treemap data={lines} name="line" value="revenue" title="Revenue by service line" />
    </article>
  ),
}

// Hours by job with the overrun as the shade, in the loss tone and with bins of its own. The
// warranty visit has no estimate, so no overrun: its tile has no shade.
const jobs = [
  ['Alder Court kitchen', 'North crew', 312, 28],
  ['Birch Lane bath', 'North crew', 164, 6],
  ['Cedar Row deck', 'North crew', 96, -4],
  ['Dogwood fence', 'North crew', 44, 12],
  ['Elm Street basement', 'South crew', 248, 18],
  ['Fir Hill roof', 'South crew', 132, 34],
  ['Grove Park plumbing', 'South crew', 58, 2],
  ['Hazel Way warranty visit', 'South crew', 26, null],
  ['Ivy Road addition', 'East crew', 284, 9],
  ['Juniper bath', 'East crew', 118, 22],
  ['Kestrel patio', 'East crew', 72, -8],
].map(([job, crew, hours, overrun]) => ({
  job: job as string,
  crew: crew as string,
  hours: hours as number,
  overrun: overrun as number | null,
}))

export const Tone: Story = {
  parameters: { theme: 'light' },
  render: () => (
    <article className="card card-wide">
      <header className="card-header">
        <h2 className="card-title">Hours by job</h2>
        <span className="card-meta">October</span>
      </header>
      <Treemap
        data={jobs}
        name="job"
        value="hours"
        group="crew"
        shade="overrun"
        breaks={[0, 10, 25]}
        binLabels={['On or under plan', 'Up to 10% over', '10 to 25% over', 'Over 25%']}
        shadeFormat={MARGIN}
        shadeLabel="Overrun"
        format="hours"
        tone="loss"
        title="Hours by job"
        description="Alder Court and Fir Hill ran more than a quarter over their estimates."
      />
    </article>
  ),
}

// About forty jobs in five branches: most tiles are too small for text.
const branches = ['Dallas', 'Austin', 'Houston', 'San Antonio', 'Fort Worth']
const streets = [
  'Oak',
  'Pine',
  'Maple',
  'Cedar',
  'Willow',
  'Aspen',
  'Spruce',
  'Laurel',
  'Magnolia',
  'Sycamore',
  'Hickory',
  'Juniper',
  'Poplar',
  'Chestnut',
  'Linden',
  'Hawthorn',
  'Redbud',
  'Cypress',
  'Walnut',
  'Alder',
  'Birch',
  'Elm',
  'Holly',
  'Sumac',
  'Rowan',
  'Beech',
  'Hazel',
  'Larch',
  'Myrtle',
  'Olive',
  'Pecan',
  'Quince',
  'Sage',
  'Tamarack',
  'Yew',
  'Ash',
  'Fir',
  'Ivy',
  'Locust',
  'Mesquite',
]
const counts = [11, 9, 8, 7, 5]
const many = counts.flatMap((count, b) =>
  Array.from({ length: count }, (_, i) => {
    const n = counts.slice(0, b).reduce((sum, c) => sum + c, 0) + i
    return {
      job: `${streets[n]} Street`,
      branch: branches[b] as string,
      // Falls off within a branch, with a fixed pseudo-random wobble.
      revenue: Math.round((120 - b * 12) * 0.78 ** i * (1 + ((n * 37) % 11) / 20)) * 1000,
      margin: 6 + ((n * 23) % 41),
    }
  }),
)

export const Many: Story = {
  parameters: { theme: 'light' },
  render: () => (
    <article className="card card-wide">
      <header className="card-header">
        <h2 className="card-title">Revenue by job</h2>
        <span className="card-meta">40 jobs in 5 branches</span>
      </header>
      <Treemap
        data={many}
        name="job"
        value="revenue"
        group="branch"
        shade="margin"
        breaks={[10, 20, 30, 40]}
        format="currency-compact"
        shadeFormat={MARGIN}
        shadeLabel="Gross margin"
        title="Revenue by job"
        description="Dallas brings the most revenue; most jobs run between 20% and 40% margin."
      />
    </article>
  ),
}
