import { Axis, Bars, Chart, Target, Tooltip, ValueLabel } from '../src'

export const weeks = [
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

// Mirrors apps/storybook/stories/LastTwelveWeeks.stories.tsx (Task 12); keep the two in sync.
export function LastTwelveWeeks() {
  return (
    <Chart
      data={weeks}
      title="Margin by week, last 12 weeks"
      description="Margin stayed under the 38% target all 12 weeks; this week is 34.0%."
      height={260}
      margin={{ top: 24, bottom: 28 }}
      x={{ type: 'band', field: 'week', padding: 0.35 }}
      y={{ field: 'margin', domain: [26, 40] }}
    >
      <Target y={38} label="Target 38%" />
      <Bars
        fill={(_, i, all) => (i === all.length - 1 ? 'solid' : 'hatch-fade')}
        format="percent"
      />
      <ValueLabel at="last" format={(v) => v.toFixed(1)} />
      <Axis side="bottom" ticks="ends" />
      <Tooltip />
    </Chart>
  )
}
