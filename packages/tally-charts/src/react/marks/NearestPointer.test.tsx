import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Id } from '../../core/types'
import { Chart, type ChartProps } from '../Chart'
import { useChart } from '../context'
import { useRegisterPoints } from '../useRegisterPoints'
import { NearestPointer, type NearestPointerProps } from './NearestPointer'

function Points({ at, hit }: { at: [Id, number, number][]; hit?: [number, number][] }) {
  const ctx = useChart('Points')
  useRegisterPoints(
    ctx,
    at.map(([id, x, y], index) => ({
      id,
      index,
      datum: null,
      x,
      y,
      hitX: hit?.[index]?.[0],
      hitY: hit?.[index]?.[1],
      label: String(id),
      segments: [],
    })),
  )
  return null
}

function renderLayer(props: NearestPointerProps = {}, chart: Partial<ChartProps<unknown>> = {}) {
  return render(
    <Chart
      width={200}
      height={100}
      margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
      x={{ domain: [0, 1] }}
      y={{ domain: [0, 1] }}
      {...chart}
    >
      <Points
        at={[
          ['a', 20, 20],
          ['b', 80, 80],
        ]}
      />
      <NearestPointer {...props} />
    </Chart>,
  )
}

const layer = (root: HTMLElement) => root.querySelector('[data-ch-part="pointer-layer"]') as Element

describe('<NearestPointer>', () => {
  it('covers the plot', () => {
    const { container } = renderLayer()
    expect(layer(container)).toHaveAttribute('width', '200')
    expect(layer(container)).toHaveAttribute('height', '100')
  })

  it('activates the nearest point within the radius', () => {
    const onActiveChange = vi.fn()
    const { container } = renderLayer({}, { onActiveChange })
    // jsdom's bounding box is at 0,0, so client coordinates are plot coordinates.
    fireEvent.pointerMove(layer(container), { clientX: 25, clientY: 22 })
    expect(onActiveChange).toHaveBeenLastCalledWith('a', expect.objectContaining({ id: 'a' }))
  })

  it('clears when nothing is near', () => {
    const onActiveChange = vi.fn()
    const { container } = renderLayer({}, { onActiveChange })
    fireEvent.pointerMove(layer(container), { clientX: 25, clientY: 22 })
    fireEvent.pointerMove(layer(container), { clientX: 50, clientY: 50 })
    expect(onActiveChange).toHaveBeenLastCalledWith(null, null)
  })

  it('measures only along x on request', () => {
    const onActiveChange = vi.fn()
    const { container } = renderLayer({ axis: 'x' }, { onActiveChange })
    fireEvent.pointerMove(layer(container), { clientX: 78, clientY: 5 })
    expect(onActiveChange).toHaveBeenLastCalledWith('b', expect.objectContaining({ id: 'b' }))
  })

  it('measures to the hit centre when a point sets one', () => {
    const onActiveChange = vi.fn()
    const { container } = render(
      <Chart
        width={200}
        height={100}
        margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
        x={{ domain: [0, 1] }}
        y={{ domain: [0, 1] }}
        onActiveChange={onActiveChange}
      >
        <Points at={[['a', 20, 20]]} hit={[[20, 60]]} />
        <NearestPointer />
      </Chart>,
    )
    // The anchor (20, 20) is 40px away, outside the radius; the hit centre is right here.
    fireEvent.pointerMove(layer(container), { clientX: 20, clientY: 60 })
    expect(onActiveChange).toHaveBeenLastCalledWith('a', expect.objectContaining({ id: 'a' }))
    fireEvent.pointerMove(layer(container), { clientX: 20, clientY: 20 })
    expect(onActiveChange).toHaveBeenLastCalledWith(null, null)
  })

  it('selects the nearest point on click and is selectable only with onSelect', () => {
    const onSelect = vi.fn()
    const { container, unmount } = renderLayer({}, { onSelect })
    expect(layer(container)).toHaveAttribute('data-ch-selectable', 'true')
    fireEvent.click(layer(container), { clientX: 79, clientY: 81 })
    expect(onSelect).toHaveBeenCalledWith('b', expect.objectContaining({ id: 'b' }))
    unmount()
    const plain = renderLayer()
    expect(layer(plain.container)).not.toHaveAttribute('data-ch-selectable')
  })
})
