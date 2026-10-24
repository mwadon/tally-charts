import type { Metadata } from 'next'
import { ChartExample } from '../../_components/chart-example'
import { CodeBlock, Tok } from '../../_components/code-block'
import { TocColumn, TocInline, type TocItem } from '../../_components/toc'
import { SITE } from '../../_content/navigation'
import { LINE_EXAMPLE_TITLE, LineExample } from './line-example'

export const metadata: Metadata = { title: 'LineChart · tally-charts' }

const TOC: readonly TocItem[] = [
  { id: 'when-to-use', label: 'When to use it' },
  { id: 'install', label: 'Import' },
  { id: 'examples', label: 'Examples' },
  { id: 'props', label: 'Props' },
  { id: 'keyboard', label: 'Keyboard and screen readers' },
]

export default function LineChartPage() {
  return (
    <div className="doc-body">
      <TocInline items={TOC} />
      <article className="doc">
        <p className="eyebrow">Charts</p>
        <h1>LineChart</h1>
        <p className="lede">
          Trends over time with a clear line between what happened and what is expected. Actual
          values are solid, a forecast is dashed, and a target stays on the chart.
        </p>

        <h2 id="when-to-use">When to use it</h2>
        <p>
          Use <code>LineChart</code> for a handful of series that share an x axis: revenue against
          plan, a forecast that continues the actuals, a scenario next to the current path. For a
          single value per period, <code>BarChart</code> usually reads faster.
        </p>

        <h2 id="install">Import</h2>
        <CodeBlock filename="Terminal" label="Install tally-charts">
          <Tok k="fn">npm</Tok> i tally-charts
        </CodeBlock>
        <CodeBlock filename="app/revenue.tsx" label="Import LineChart and the theme">
          <Tok k="keyword">import</Tok> {'{'} LineChart {'}'} <Tok k="keyword">from</Tok>{' '}
          <Tok k="string">'tally-charts'</Tok>
          {'\n'}
          <Tok k="keyword">import</Tok> <Tok k="string">'tally-charts/theme.css'</Tok>
        </CodeBlock>

        <h2 id="examples">Examples</h2>
        <ChartExample
          title="Revenue with a forecast and a target"
          preview={<LineExample />}
          code={
            <CodeBlock filename="revenue.tsx" label={`Source of: ${LINE_EXAMPLE_TITLE}`}>
              <Tok k="keyword">const</Tok> months = [{'\n  '}
              {'{ '}month: <Tok k="string">'Jan'</Tok>, actual: <Tok k="number">410</Tok>, forecast:{' '}
              <Tok k="keyword">null</Tok>
              {' },'}
              {'\n  '}
              <Tok k="comment">{'// …one row per month, Feb to May'}</Tok>
              {'\n  '}
              {'{ '}month: <Tok k="string">'Jun'</Tok>, actual: <Tok k="number">640</Tok>, forecast:{' '}
              <Tok k="number">640</Tok>
              {' },'}
              {'\n  '}
              {'{ '}month: <Tok k="string">'Jul'</Tok>, actual: <Tok k="keyword">null</Tok>,
              forecast: <Tok k="number">700</Tok>
              {' },'}
              {'\n  '}
              <Tok k="comment">{'// …Aug and Sep'}</Tok>
              {'\n  '}
              {'{ '}month: <Tok k="string">'Oct'</Tok>, actual: <Tok k="keyword">null</Tok>,
              forecast: <Tok k="number">850</Tok>
              {' },'}
              {'\n]'}
              {'\n\n'}
              {'<'}
              <Tok k="tag">LineChart</Tok>
              {'\n  '}data={'{'}months{'}'}
              {'\n  '}x=<Tok k="string">"month"</Tok>
              {'\n  '}series={'{['}
              {'\n    '}
              {'{ '}id: <Tok k="string">'actual'</Tok>, label: <Tok k="string">'Actual'</Tok>,
              value: <Tok k="string">'actual'</Tok>
              {' },'}
              {'\n    '}
              {'{ '}id: <Tok k="string">'forecast'</Tok>, label: <Tok k="string">'Forecast'</Tok>,
              value: <Tok k="string">'forecast'</Tok>, style: <Tok k="string">'forecast'</Tok>
              {' },'}
              {'\n  ]}'}
              {'\n  '}forecastFrom=<Tok k="string">"Jul"</Tok>
              {'\n  '}target={'{{ '}value: <Tok k="number">800</Tok>, label:{' '}
              <Tok k="string">'Target'</Tok>
              {' }}'}
              {'\n  '}format=<Tok k="string">"currency-compact"</Tok>
              {'\n  '}height={'{'}
              <Tok k="number">260</Tok>
              {'}'}
              {'\n  '}title=<Tok k="string">"{LINE_EXAMPLE_TITLE}"</Tok>
              {'\n  '}description=
              <Tok k="string">
                "Revenue grew from 410 to 640 over six months; the forecast reaches 850 in October."
              </Tok>
              {'\n/>'}
            </CodeBlock>
          }
        />
        <p className="small">More examples arrive with the content site.</p>

        <h2 id="props">Props</h2>
        {/* biome-ignore lint/a11y/useSemanticElements lint/a11y/noNoninteractiveTabindex: a scrollable region must be focusable, or keyboard users cannot scroll it */}
        <div className="table-scroll" role="region" aria-label="Props table" tabIndex={0}>
          <table>
            <thead>
              <tr>
                <th scope="col">Prop</th>
                <th scope="col">Type</th>
                <th scope="col">Default</th>
                <th scope="col">Description</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">
                  <code>data</code>
                </th>
                <td>
                  <code>readonly D[]</code>
                </td>
                <td>—</td>
                <td>One row per x.</td>
              </tr>
              <tr>
                <th scope="row">
                  <code>series</code>
                </th>
                <td>
                  <code>LineSeries&lt;D&gt;[]</code>
                </td>
                <td>—</td>
                <td>Lines to draw; each is actual, forecast or scenario.</td>
              </tr>
              <tr>
                <th scope="row">
                  <code>target</code>
                </th>
                <td>
                  <code>number | {'{ value, label }'}</code>
                </td>
                <td>none</td>
                <td>A reference line that stays visible.</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="small">Placeholder: the generated props table arrives with F13.</p>

        <h2 id="keyboard">Keyboard and screen readers</h2>
        <p>
          The chart is a single tab stop. Arrow keys move between points, <kbd>Home</kbd> and{' '}
          <kbd>End</kbd> jump to the ends, and <kbd>Esc</kbd> hides the tooltip. Screen readers get
          the chart title and description, an announcement for each point, and a hidden data table
          with every value. The full notes are in the{' '}
          <a href={`${SITE.github}/blob/main/docs/a11y.md`}>accessibility guide</a>.
        </p>
      </article>
      <TocColumn items={TOC} />
    </div>
  )
}
