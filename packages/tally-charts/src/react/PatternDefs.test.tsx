import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PatternDefs } from './PatternDefs'

describe('PatternDefs', () => {
  it('defines one hatch pattern per tone and two fade masks', () => {
    const { container } = render(
      <svg aria-hidden="true">
        <PatternDefs chartId="c1" geometry={{ angle: 45, gap: 6 }} />
      </svg>,
    )
    expect(container.querySelectorAll('pattern')).toHaveLength(6)
    expect(container.querySelector('#c1-hatch-loss')).not.toBeNull()
    expect(container.querySelector('#c1-fade-y')).not.toBeNull()
    expect(container.querySelector('#c1-fade-x')).not.toBeNull()
  })

  it('turns the stripe angle into a pattern rotation and uses the gap as tile size', () => {
    const { container } = render(
      <svg aria-hidden="true">
        <PatternDefs chartId="c1" geometry={{ angle: 30, gap: 8 }} />
      </svg>,
    )
    const pattern = container.querySelector('#c1-hatch-accent')
    expect(pattern).toHaveAttribute('patternTransform', 'rotate(60)')
    expect(pattern).toHaveAttribute('width', '8')
  })
})
