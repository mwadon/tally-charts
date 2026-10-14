// @vitest-environment node
import { version } from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { DrillColumn, EstimateVsActual, LastTwelveWeeks, SmallPieces } from '../test/fixtures'
import { Chart } from './react/Chart'

describe('server rendering', () => {
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
  })
})
