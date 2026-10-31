import type { Meta, StoryObj } from '@storybook/react-vite'
import { Delta, Meter, Stat } from 'tally-charts'

// docs/reference/01-gross-margin-waterfall.png, card "Gross margin".
function GrossMargin() {
  return (
    <article className="card">
      <header className="card-header card-header-stack">
        <h2 className="card-title">Gross margin</h2>
        <span className="card-meta">Week of Sep 21 to 27</span>
      </header>
      <Stat
        value={34}
        format="percent"
        delta={<Delta value={-1.2} format="pts" />}
        caption="vs last week"
      />
      <p className="card-text">
        4.0 pts under the 38.0% target. $19.3K of profit lost against target this week.
      </p>
      <Meter
        value={34}
        min={20}
        max={45}
        target={38}
        format="percent"
        fill="hatch"
        label="Gross margin against the 38% target"
        minLabel="20%"
        targetLabel="Target 38%"
      />
      <dl className="stat-rows">
        <div>
          <dt>Revenue</dt>
          <dd>
            $482K <Delta value={6.2} format="percent" />
          </dd>
        </div>
        <div>
          <dt>Gross profit</dt>
          <dd>
            $164K <Delta value={2.5} format="percent" />
          </dd>
        </div>
        <div>
          <dt>Jobs completed</dt>
          <dd>158</dd>
        </div>
      </dl>
    </article>
  )
}

const meta = { title: 'Reference/Gross margin', component: GrossMargin } satisfies Meta<
  typeof GrossMargin
>

export default meta
type Story = StoryObj<typeof meta>

export const Light: Story = { parameters: { theme: 'light' } }
export const Dark: Story = { parameters: { theme: 'dark' } }
