// @vitest-environment node
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { LastTwelveWeeks } from '../test/fixtures'
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
    // The hydration test hydrates this exact node-rendered markup.
    await expect(html).toMatchFileSnapshot('./__snapshots__/last-twelve-weeks.ssr.html')
  })

  it('is deterministic', () => {
    expect(renderToString(<LastTwelveWeeks />)).toBe(renderToString(<LastTwelveWeeks />))
  })

  it('reserves the height with CSS aspect-ratio while measuring', () => {
    const html = renderToString(<Chart aspectRatio={2}>{null}</Chart>)
    const figure = html.match(/<figure[^>]*>/)?.[0] ?? ''
    expect(figure).toContain('aspect-ratio:2')
    expect(figure).not.toContain('height:')
  })

  it('keeps a fixed height for a fixed width', () => {
    const html = renderToString(
      <Chart width={400} aspectRatio={2}>
        {null}
      </Chart>,
    )
    expect(html.match(/<figure[^>]*>/)?.[0]).toContain('height:200px')
  })
})
