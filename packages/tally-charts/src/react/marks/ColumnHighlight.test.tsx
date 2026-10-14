import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Chart } from '../Chart'
import { ColumnHighlight } from './ColumnHighlight'

const rect = (root: HTMLElement) => root.querySelector('[data-ch-part="column-highlight"]')

describe('<ColumnHighlight>', () => {
  it('backs one column across the whole chart height', () => {
    const { container } = render(
      <Chart
        width={300}
        height={130}
        margin={{ top: 10, right: 0, bottom: 20, left: 0 }}
        x={{ type: 'band', domain: ['a', 'b', 'c'], padding: 0 }}
        y={{ domain: [0, 1] }}
      >
        <ColumnHighlight at="b" />
      </Chart>,
    )
    expect(rect(container)).toHaveAttribute('x', '88')
    expect(rect(container)).toHaveAttribute('width', '124')
    expect(rect(container)).toHaveAttribute('y', '-10')
    expect(rect(container)).toHaveAttribute('height', '130')
    expect(rect(container)).toHaveAttribute('rx', '16')
  })

  it('backs one row across the whole chart width when the band is on y', () => {
    const { container } = render(
      <Chart
        width={300}
        height={120}
        margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
        x={{ domain: [0, 1] }}
        y={{ type: 'band', domain: ['a', 'b', 'c'], padding: 0 }}
      >
        <ColumnHighlight at="b" pad={4} />
      </Chart>,
    )
    expect(rect(container)).toHaveAttribute('y', '36')
    expect(rect(container)).toHaveAttribute('height', '48')
    expect(rect(container)).toHaveAttribute('x', '0')
    expect(rect(container)).toHaveAttribute('width', '300')
  })

  it('draws nothing for an unknown band', () => {
    const { container } = render(
      <Chart width={300} x={{ type: 'band', domain: ['a'] }} y={{ domain: [0, 1] }}>
        <ColumnHighlight at="zzz" />
      </Chart>,
    )
    expect(rect(container)).toBeNull()
  })
})
