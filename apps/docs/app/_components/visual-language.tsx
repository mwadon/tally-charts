import { BarChart } from 'tally-charts'

const quarters = [
  { q: 'Q1', v: 42 },
  { q: 'Q2', v: 48 },
  { q: 'Q3', v: 53 },
  { q: 'Q4', v: 61 },
]

interface Card {
  title: string
  text: string
  chart: 'hatch' | 'solid' | 'loss' | 'target'
}

const CARDS: readonly Card[] = [
  {
    title: 'Hatched is plan',
    text: 'Stripes mark a plan, a forecast or a reference.',
    chart: 'hatch',
  },
  { title: 'Solid is actual', text: 'Filled marks are what really happened.', chart: 'solid' },
  { title: 'Pink is loss', text: 'One loud color, saved for what went wrong.', chart: 'loss' },
  {
    title: 'Targets come first',
    text: 'The goal is drawn on the chart, not in a footnote.',
    chart: 'target',
  },
]

function Mini({ chart }: { chart: Card['chart'] }) {
  const common = {
    data: quarters,
    x: 'q' as const,
    y: 'v' as const,
    domain: [0, 70] as const,
    height: 140,
    valueLabel: 'none' as const,
    axis: 'all' as const,
  }
  switch (chart) {
    case 'hatch':
      return (
        <BarChart
          {...common}
          fill="hatch"
          title="Plan by quarter, hatched"
          description="Four hatched bars, Q1 42 to Q4 61."
        />
      )
    case 'solid':
      return (
        <BarChart
          {...common}
          fill="solid"
          title="Actual by quarter, solid"
          description="Four solid bars, Q1 42 to Q4 61."
        />
      )
    case 'loss':
      return (
        <BarChart
          {...common}
          fill="solid"
          tone="loss"
          title="Loss by quarter, pink"
          description="Four pink bars, Q1 42 to Q4 61."
        />
      )
    case 'target':
      return (
        <BarChart
          {...common}
          fill="solid"
          target={{ value: 55, label: 'Target' }}
          title="Actual by quarter against a target"
          description="Four bars against a target of 55; only Q4 reaches it."
        />
      )
  }
}

export function VisualLanguage() {
  return (
    <ul className="card-grid card-grid-4">
      {CARDS.map((card) => (
        <li key={card.title} className="card">
          <Mini chart={card.chart} />
          <h3>{card.title}</h3>
          <p>{card.text}</p>
        </li>
      ))}
    </ul>
  )
}
