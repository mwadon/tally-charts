import { WaffleColumns } from 'tally-charts'
import type { ExampleMeta } from '../types'

export const meta = {
  id: 'waffle-columns/weekly-signups',
  title: 'Newsletter signups per week',
  rscSafe: true,
} satisfies ExampleMeta

const weeks = [
  { week: 'Jul 6', signups: 410, month: 'July' },
  { week: 'Jul 13', signups: 460, month: 'July' },
  { week: 'Jul 20', signups: 380, month: 'July' },
  { week: 'Jul 27', signups: 520, month: 'July' },
  { week: 'Aug 3', signups: 490, month: 'August' },
  { week: 'Aug 10', signups: 1180, month: 'August' },
  { week: 'Aug 17', signups: 560, month: 'August' },
  { week: 'Aug 24', signups: 540, month: 'August' },
  { week: 'Aug 31', signups: 610, month: 'August' },
]

// Props stay serializable (accessor strings and the default callout): the page is a server component.
export default function WeeklySignups() {
  return (
    <WaffleColumns
      title={meta.title}
      description="Weekly signups ran between 380 and 610 except the week of Aug 10, which peaked at 1,180. August brought 3,380 against 1,770 in July."
      data={weeks}
      x="week"
      y="signups"
      group="month"
      unit={50}
      height={216}
    />
  )
}
