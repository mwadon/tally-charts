import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ScaleSpec } from '../../core/scale'
import { Chart } from '../Chart'
import { Region, type RegionProps } from './Region'

const POINTS: ScaleSpec<unknown> = { type: 'point', domain: ['Apr', 'May', 'Jun'] }

// 300px with points at 50, 150, 250: each step is 100px wide.
function renderRegion(props: RegionProps, x: ScaleSpec<unknown> = POINTS) {
  return render(
    <Chart
      title="Region"
      width={300}
      height={100}
      margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
      x={x}
      y={{ domain: [0, 1] }}
    >
      <Region {...props} />
    </Chart>,
  )
}

const rect = (root: HTMLElement) => root.querySelector('[data-ch-part="region"]')

describe('<Region>', () => {
  it('shades from halfway before `from` to the end of the plot', () => {
    const { container } = renderRegion({ from: 'May' })
    expect(rect(container)).toHaveAttribute('x', '100')
    expect(rect(container)).toHaveAttribute('width', '200')
    expect(rect(container)).toHaveAttribute('y', '0')
    expect(rect(container)).toHaveAttribute('height', '100')
    expect(rect(container)).toHaveAttribute('data-ch-tone', 'accent')
  })

  it('stops at `to`, in either order', () => {
    const forward = renderRegion({ from: 'Apr', to: 'May' })
    expect(rect(forward.container)).toHaveAttribute('x', '0')
    expect(rect(forward.container)).toHaveAttribute('width', '200')
    forward.unmount()
    const reversed = renderRegion({ from: 'Jun', to: 'Apr' })
    expect(rect(reversed.container)).toHaveAttribute('width', '300')
  })

  it('spans whole bands on a band scale', () => {
    const { container } = renderRegion(
      { from: 'b' },
      { type: 'band', domain: ['a', 'b', 'c'], padding: 0 },
    )
    expect(rect(container)).toHaveAttribute('x', '100')
    expect(rect(container)).toHaveAttribute('width', '200')
  })

  it('warns and draws nothing for a category that is not on the scale', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { container } = renderRegion({ from: 'Dec' })
    expect(rect(container)).toBeNull()
    expect(warn.mock.calls[0]?.[0]).toContain('Region from "Dec"')
  })
})
