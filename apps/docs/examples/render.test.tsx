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

test.each(Object.values(examples))('$id renders in jsdom without errors', async (entry) => {
  const { default: Example } = await entry.load()
  const { container } = render(<Example />)

  expect(container.querySelector('svg')).not.toBeNull()
  expect(errors).not.toHaveBeenCalled()
})
