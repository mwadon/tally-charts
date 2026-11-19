import { FunnelChart, Legend } from 'tally-charts'
import type { ExampleMeta } from '../types'

export const meta = {
  id: 'funnel-chart/by-source',
  title: 'Leads to paid jobs, by source',
  rscSafe: true,
} satisfies ExampleMeta

const steps = [
  { step: 'Leads', referral: 420, website: 380, ads: 300, other: 140 },
  { step: 'Site visits', referral: 330, website: 250, ads: 150, other: 76 },
  { step: 'Quotes sent', referral: 250, website: 160, ads: 80, other: 42 },
  { step: 'Quotes accepted', referral: 170, website: 80, ads: 30, other: 18 },
  { step: 'Jobs paid', referral: 155, website: 68, ads: 24, other: 15 },
]

// Defined once, outside the component, with field names: the same array on every render.
const sources = [
  { id: 'referral', label: 'Referral', value: 'referral', tone: 'accent' },
  { id: 'website', label: 'Website', value: 'website', tone: 'accent-soft' },
  { id: 'ads', label: 'Ads', value: 'ads', tone: 'gain' },
  { id: 'other', label: 'Other', value: 'other', tone: 'neutral' },
] as const

// The chart has no legend of its own: compose `Legend` with the same tones. The counts are the
// paid jobs of each source.
export default function BySource() {
  return (
    <div>
      <Legend
        items={[
          { label: 'Referral', tone: 'accent', count: 155 },
          { label: 'Website', tone: 'accent-soft', count: 68 },
          { label: 'Ads', tone: 'gain', count: 24 },
          { label: 'Other', tone: 'neutral', count: 15 },
        ]}
      />
      <FunnelChart
        data={steps}
        x="step"
        series={sources}
        title={meta.title}
        description="Q3. Referrals are a third of leads and over half of paid jobs."
      />
    </div>
  )
}
