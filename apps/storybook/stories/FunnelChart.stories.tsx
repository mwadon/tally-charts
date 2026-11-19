import type { Meta, StoryObj } from '@storybook/react-vite'
import { FunnelChart, Legend } from 'tally-charts'

// Fictional Q3 pipeline of a contractor: leads to paid jobs, with the source of every lead.
const steps = [
  { step: 'Leads', count: 1240, referral: 420, website: 380, ads: 300, other: 140 },
  { step: 'Site visits', count: 806, referral: 330, website: 250, ads: 150, other: 76 },
  { step: 'Quotes sent', count: 532, referral: 250, website: 160, ads: 80, other: 42 },
  { step: 'Quotes accepted', count: 298, referral: 170, website: 80, ads: 30, other: 18 },
  { step: 'Jobs paid', count: 262, referral: 155, website: 68, ads: 24, other: 15 },
]

const sources = [
  { id: 'referral', label: 'Referral', value: 'referral' as const, tone: 'accent' as const },
  { id: 'website', label: 'Website', value: 'website' as const, tone: 'accent-soft' as const },
  { id: 'ads', label: 'Ads', value: 'ads' as const, tone: 'gain' as const },
  { id: 'other', label: 'Other', value: 'other' as const, tone: 'neutral' as const },
]

// The artboards are 640 px wide: five steps fit side by side (the default card is too narrow).
const ARTBOARD = { maxWidth: 640 }

function LeadsToJobs() {
  return (
    <article className="card" style={ARTBOARD}>
      <header className="card-header">
        <h2 className="card-title">From lead to paid job</h2>
        <span className="card-meta">21% of leads become paid jobs</span>
      </header>
      <FunnelChart
        data={steps}
        x="step"
        y="count"
        title="From lead to paid job"
        description="Q3. The percent is the share that continued from the step before; the weakest step is quotes sent to quotes accepted."
      />
    </article>
  )
}

const meta = {
  title: 'Charts/FunnelChart',
  component: LeadsToJobs,
} satisfies Meta<typeof LeadsToJobs>

export default meta
type Story = StoryObj<typeof meta>

export const Light: Story = { parameters: { theme: 'light' } }
export const Dark: Story = { parameters: { theme: 'dark' } }

// One layer per lead source, named by a composed legend with the paid jobs of each source.
export const Series: Story = {
  parameters: { theme: 'light' },
  render: () => (
    <article className="card" style={ARTBOARD}>
      <header className="card-header">
        <h2 className="card-title">From lead to paid job, by source</h2>
      </header>
      <FunnelChart
        data={steps}
        x="step"
        series={sources}
        title="From lead to paid job, by source"
        description="Q3. Referrals are a third of leads and over half of paid jobs."
      />
      <div className="legend-gap">
        <Legend
          items={[
            { label: 'Referral', tone: 'accent', count: 155 },
            { label: 'Website', tone: 'accent-soft', count: 68 },
            { label: 'Ads', tone: 'gain', count: 24 },
            { label: 'Other', tone: 'neutral', count: 15 },
          ]}
        />
      </div>
    </article>
  ),
}

// Steps top to bottom, labels in a column left of the ribbon.
export const Vertical: Story = {
  parameters: { theme: 'light' },
  render: () => (
    <article className="card">
      <header className="card-header">
        <h2 className="card-title">From lead to paid job</h2>
      </header>
      <FunnelChart
        data={steps}
        x="step"
        y="count"
        orientation="vertical"
        title="From lead to paid job"
        description="Q3. The weakest step is quotes sent to quotes accepted."
      />
    </article>
  ),
}

// Defaults only: no theme of its own, `x` and `y`.
export const Plain: Story = {
  render: () => (
    <article className="card">
      <FunnelChart data={steps} x="step" y="count" title="Leads to paid jobs" />
    </article>
  ),
}

const hiring = [
  { step: 'Applications', count: 480 },
  { step: 'Screened', count: 312 },
  { step: 'Phone calls', count: 190 },
  { step: 'Site trials', count: 96 },
  { step: 'Interviews', count: 64 },
  { step: 'Offers', count: 30 },
  { step: 'Accepted', count: 24 },
  { step: 'Started', count: 21 },
]

// Eight steps in the default card: too narrow for columns, so 'auto' draws vertical.
export const Many: Story = {
  render: () => (
    <article className="card">
      <header className="card-header">
        <h2 className="card-title">Crew hiring</h2>
      </header>
      <FunnelChart
        data={hiring}
        x="step"
        y="count"
        title="Crew hiring, applications to first day"
        description="The weakest step is interviews to offers, where 47% continue."
      />
    </article>
  ),
}
