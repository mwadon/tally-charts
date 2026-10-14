// @vitest-environment node
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { LastTwelveWeeks } from '../test/fixtures'

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
})
