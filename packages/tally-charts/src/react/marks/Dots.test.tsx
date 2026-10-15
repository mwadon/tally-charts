import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Chart, type ChartProps } from '../Chart'
import { type DotItem, Dots } from './Dots'

const items: DotItem[] = [
  { key: 'a', id: 'a', datum: null, cx: 10, cy: 90, tone: 'loss', label: 'Job A' },
  { key: 'b', id: 'b', datum: null, cx: 30, cy: 90, tone: 'gain', soft: true, label: 'Job B' },
]

function renderDots(chart: Partial<ChartProps<unknown>> = {}, interactive = true) {
  return render(
    <Chart
      width={100}
      height={100}
      margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
      x={{ domain: [0, 1] }}
      y={{ domain: [0, 1] }}
      animate={false}
      {...chart}
    >
      <Dots dots={items} radius={4} interactive={interactive} />
    </Chart>,
  )
}

const dots = (root: HTMLElement) => [...root.querySelectorAll('[data-ch-part="dot"]')]

describe('<Dots>', () => {
  it('draws one toned circle per dot', () => {
    const { container } = renderDots()
    const [a, b] = dots(container)
    expect(dots(container)).toHaveLength(2)
    expect(a).toHaveAttribute('cx', '10')
    expect(a).toHaveAttribute('r', '4')
    expect(a).toHaveAttribute('data-ch-tone', 'loss')
    expect(a).toHaveStyle({ fill: 'var(--ch-loss)' })
    expect(b).toHaveAttribute('data-ch-soft', 'true')
    expect(b?.getAttribute('style')).toContain('color-mix')
  })

  it('registers a point per dot for the keyboard', () => {
    const { container } = renderDots()
    fireEvent.keyDown(container.querySelector('[role="application"]') as Element, {
      key: 'ArrowRight',
    })
    expect(container.querySelector('[aria-live]')).toHaveTextContent('Job A')
  })

  it('registers nothing when not interactive', () => {
    const { container } = renderDots({}, false)
    expect(container.querySelector('[role="application"]')).toBeNull()
    fireEvent.keyDown(container.querySelector('[data-ch-part="plot"]') as Element, {
      key: 'ArrowRight',
    })
    expect(container.querySelector('[aria-live]')?.textContent).toBe('')
    expect(container.querySelector('[data-ch-part="dot-ring"]')).toBeNull()
  })

  it('rings the active dot and dims the others', () => {
    const { container } = renderDots({ activeId: 'b' })
    const ring = container.querySelector('[data-ch-part="dot-ring"]')
    expect(ring).toHaveAttribute('cx', '30')
    expect(ring).toHaveAttribute('r', '7')
    expect(dots(container)[0]).toHaveAttribute('data-ch-dimmed', 'true')
    expect(dots(container)[1]).toHaveAttribute('data-ch-active', 'true')
  })
})
