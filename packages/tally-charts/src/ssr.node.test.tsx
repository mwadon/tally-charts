// @vitest-environment node
import { version } from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import {
  DrillColumn,
  EstimateVsActual,
  InstallsStrip,
  JobsHistogram,
  LastTwelveWeeks,
  LeakHeatmap,
  LeakWaffle,
  MarginOutlook,
  ProfitBridge,
  SmallPieces,
  UnderTarget,
  UsageRunway,
} from '../test/fixtures'
import { Chart } from './react/Chart'
import { RunwayChart } from './react/charts/RunwayChart'

describe('server rendering', () => {
  it('renders the 0.3 charts without a DOM, deterministically', () => {
    for (const Example of [UnderTarget, ProfitBridge]) {
      const html = renderToString(<Example />)
      expect(html).toBe(renderToString(<Example />))
      expect(html).not.toContain('NaN')
    }
    const waterfall = renderToString(<UnderTarget />)
    expect(waterfall).toContain('−1.6 pts · $7.7K')
    expect(waterfall.match(/data-ch-part="connector"/g)).toHaveLength(6)
    const bridge = renderToString(<ProfitBridge />)
    expect(bridge).toContain('−$260 discount')
    expect(bridge).toContain('data-ch-part="column-highlight"')
    expect(bridge).toContain('data-ch-part="area"')
    // The callout lives in the HTML overlay, which only exists after mount.
    expect(bridge).not.toContain('data-ch-part="callout"')
  })

  it('renders without a DOM', async () => {
    expect(typeof document).toBe('undefined')
    const html = renderToString(<LastTwelveWeeks />)
    expect(html).toContain('<svg')
    expect(html.match(/data-ch-part="bar"/g)).toHaveLength(12)
    expect(html).toContain('<pattern')
    expect(html).toContain('Target 38%')
    expect(html).toContain('width="640"')
    // The hydration test hydrates this exact node-rendered markup. The file is React 19 output:
    // React 18 formats useId values differently (`R0` instead of `_R_0_`), and nothing else, so
    // the CI React 18 leg skips only this comparison.
    if (version.startsWith('19')) {
      await expect(html).toMatchFileSnapshot('./__snapshots__/last-twelve-weeks.ssr.html')
    }
  })

  it('is deterministic', () => {
    expect(renderToString(<LastTwelveWeeks />)).toBe(renderToString(<LastTwelveWeeks />))
  })

  it('reserves the height with CSS aspect-ratio while measuring', () => {
    const html = renderToString(<Chart aspectRatio={2}>{null}</Chart>)
    const figure = html.match(/<figure[^>]*>/)?.[0] ?? ''
    expect(figure).toContain('aspect-ratio:2')
    // The 640px-wide server svg must not give the box an automatic min-height in narrow containers.
    expect(figure).toContain('min-height:0')
    expect(figure).not.toContain('overflow')
    expect(figure).not.toMatch(/[";]height:/)
  })

  it('keeps a fixed height for a fixed width', () => {
    const html = renderToString(
      <Chart width={400} aspectRatio={2}>
        {null}
      </Chart>,
    )
    expect(html.match(/<figure[^>]*>/)?.[0]).toContain('height:200px')
  })

  it('renders the 0.2 charts and pieces without a DOM, deterministically', () => {
    for (const Example of [EstimateVsActual, DrillColumn, SmallPieces]) {
      const html = renderToString(<Example />)
      expect(html).toBe(renderToString(<Example />))
      expect(html).not.toContain('NaN')
    }
    const comparison = renderToString(<EstimateVsActual />)
    expect(comparison).toContain('$640 → $1,060')
    expect(comparison).toContain('+$420')
    expect(comparison.match(/data-ch-part="bar"/g)).toHaveLength(8)
    expect(renderToString(<DrillColumn />)).toContain('data-ch-part="row-highlight"')
    expect(renderToString(<SmallPieces />)).toContain('role="meter"')
    expect(renderToString(<SmallPieces />)).toContain('data-ch-part="share-segment"')
    expect(renderToString(<SmallPieces />)).toContain('aria-valuetext="4.1, Poor"')
  })

  it('renders the 0.4 dot charts without a DOM, deterministically', () => {
    for (const Example of [JobsHistogram, InstallsStrip, LeakWaffle]) {
      const html = renderToString(<Example />)
      expect(html).toBe(renderToString(<Example />))
      expect(html).not.toContain('NaN')
      // Pinned callouts live in the overlay, which only exists after mount.
      expect(html).not.toContain('data-ch-part="callout"')
    }
    expect(renderToString(<JobsHistogram />).match(/data-ch-part="dot"/g)).toHaveLength(10)
    const strip = renderToString(<InstallsStrip />)
    expect(strip.match(/data-ch-part="dot"/g)).toHaveLength(10)
    expect(strip).toContain('6.1 h')
    expect(strip).toContain('8.2 h')
    const waffle = renderToString(<LeakWaffle />)
    // 9800 → 5, 10200 → 5, 10100 → 5, 23400 → 12 dots at $2K each.
    expect(waffle.match(/data-ch-part="dot"/g)).toHaveLength(27)
    expect(waffle).toContain('September')
  })

  it('renders the 0.5 charts without a DOM, deterministically', () => {
    for (const Example of [MarginOutlook, LeakHeatmap]) {
      const html = renderToString(<Example />)
      expect(html).toBe(renderToString(<Example />))
      expect(html).not.toContain('NaN')
    }
    const lines = renderToString(<MarginOutlook />)
    expect(lines.match(/data-ch-part="line-group"/g)).toHaveLength(3)
    expect(lines).toContain('data-ch-part="band"')
    expect(lines).toContain('data-ch-part="region"')
    expect(lines).toContain('Target 38%')
    // The tooltip lives in the overlay, which only exists after mount.
    expect(lines).not.toContain('data-ch-part="tooltip"')
    const heatmap = renderToString(<LeakHeatmap />)
    expect(heatmap).toContain('role="grid"')
    expect(heatmap.match(/data-ch-part="heatmap-cell"/g)).toHaveLength(6)
    expect(heatmap).toContain('$14.8K')
    expect(heatmap).toContain('$13K and up')
  })

  it('renders the runway without a DOM, with its strips drawn at the initial width', () => {
    const html = renderToString(<UsageRunway />)
    expect(html).toBe(renderToString(<UsageRunway />))
    expect(html).not.toContain('NaN')
    expect(html.match(/data-ch-part="runway-strip"/g)).toHaveLength(3)
    expect(html).toContain('data-ch-state="locked"')
    expect(html).toContain('Runs out Fri')
  })

  it('renders the runway in columns with the default initial width', () => {
    const html = renderToString(
      <RunwayChart
        title="Usage runway"
        rows={[{ id: 'a', label: 'A', projection: [{ at: '2026-10-15T02:00:00Z', used: 0.4 }] }]}
        domain={['2026-10-15T00:00:00Z', '2026-10-22T00:00:00Z']}
        now="2026-10-15T02:00:00Z"
      />,
    )
    expect(html).toContain('data-ch-layout="columns"')
    expect(html).toContain('data-ch-part="data-table"')
  })
})
