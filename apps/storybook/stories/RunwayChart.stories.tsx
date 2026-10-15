import type { Meta, StoryObj } from '@storybook/react-vite'
import { type CSSProperties, useState } from 'react'
import { RunwayChart } from 'tally-charts'
import { cell, domain, now, rows } from './runway-data'

// One row per state: runs out soon (pro), runs out with a long lock (team), runs out past the
// domain (editor-2), lasts to reset (research) and disconnected (starter).
const STATE_IDS = ['pro', 'team', 'editor-2', 'research', 'starter']
const stateRows = rows.filter((r) => STATE_IDS.includes(r.id))

function Runway({ width }: { width?: number }) {
  const [selected, setSelected] = useState<string | null>('pro')
  const style: CSSProperties | undefined = width ? { maxWidth: width } : undefined
  return (
    <article className={width ? 'card' : 'card card-wide'} style={style}>
      <RunwayChart
        rows={stateRows}
        domain={domain}
        now={now}
        cell={cell}
        title="Usage runway"
        description="Three of four connected accounts run out before reset; Starter needs reconnecting."
        // The stacked stories leave selection out, so the plain list variant is covered too.
        selectedId={width ? undefined : selected}
        onSelect={width ? undefined : setSelected}
        layout="auto"
      />
    </article>
  )
}

const meta = {
  title: 'Charts/RunwayChart',
  component: Runway,
} satisfies Meta<typeof Runway>

export default meta
type Story = StoryObj<typeof meta>

export const StatesLight: Story = { name: 'States light', parameters: { theme: 'light' } }
export const StatesDark: Story = { name: 'States dark', parameters: { theme: 'dark' } }
export const StackedLight: Story = {
  name: 'Stacked light',
  args: { width: 320 },
  parameters: { theme: 'light' },
}
export const StackedDark: Story = {
  name: 'Stacked dark',
  args: { width: 320 },
  parameters: { theme: 'dark' },
}
