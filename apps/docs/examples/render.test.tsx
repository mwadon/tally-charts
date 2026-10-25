import { render } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { examples } from '../examples.generated'

let errors: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  errors = vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  errors.mockRestore()
})

// Charts draw an <svg>. The small pieces (Stat, Meter, Legend…) and the Heatmap are plain HTML
// and CSS, so their examples may have none, but they must still render something.
const mayOmitSvg = (id: string) => id.startsWith('small-pieces/') || id.startsWith('heatmap/')

test.each(Object.values(examples))('$id renders in jsdom without errors', async (entry) => {
  const { default: Example } = await entry.load()
  const { container } = render(<Example />)

  if (mayOmitSvg(entry.id)) {
    expect(container.firstElementChild).not.toBeNull()
    expect(container.textContent).not.toBe('')
  } else {
    expect(container.querySelector('svg')).not.toBeNull()
  }
  expect(errors).not.toHaveBeenCalled()
})
