import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TooltipPill } from './TooltipPill'

describe('<TooltipPill>', () => {
  it('renders one segment per entry with value and optional label', () => {
    const { container } = render(
      <TooltipPill
        segments={[
          { value: '#5819' },
          { value: '12.3%' },
          { value: '35.2%', label: 'on the current path', tone: 'accent' },
        ]}
      />,
    )
    const segments = container.querySelectorAll('.ch-pill-seg')
    expect(segments).toHaveLength(3)
    expect(segments[0]).toHaveTextContent('#5819')
    expect(segments[2]?.querySelector('.ch-pill-value')).toHaveTextContent('35.2%')
    expect(segments[2]?.querySelector('.ch-pill-label')).toHaveTextContent('on the current path')
    expect(segments[2]).toHaveAttribute('data-ch-tone', 'accent')
    expect(segments[0]).not.toHaveAttribute('data-ch-tone')
  })
})
