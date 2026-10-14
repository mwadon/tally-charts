import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PatternDefs } from './PatternDefs'

describe('PatternDefs', () => {
  it('defines one hatch pattern per tone and one fade mask per bar direction', () => {
    const { container } = render(
      <svg aria-hidden="true">
        <PatternDefs chartId="c1" geometry={{ angle: 45, gap: 6 }} />
      </svg>,
    )
    expect(container.querySelectorAll('pattern')).toHaveLength(6)
    expect(container.querySelector('#c1-hatch-loss')).not.toBeNull()
    for (const dir of ['up', 'down', 'right', 'left']) {
      expect(container.querySelector(`#c1-fade-${dir}`)).not.toBeNull()
    }
    expect(container.querySelectorAll('mask')).toHaveLength(4)
  })

  it('fades toward the baseline for each direction', () => {
    const { container } = render(
      <svg aria-hidden="true">
        <PatternDefs chartId="c1" geometry={{ angle: 45, gap: 6 }} />
      </svg>,
    )
    const gradient = (dir: string) => container.querySelector(`#c1-fade-gradient-${dir}`)
    // Opaque (offset 0) at the bar's outer end.
    expect(gradient('up')).toHaveAttribute('y1', '0')
    expect(gradient('down')).toHaveAttribute('y1', '1')
    expect(gradient('right')).toHaveAttribute('x1', '1')
    expect(gradient('left')).toHaveAttribute('x1', '0')
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
