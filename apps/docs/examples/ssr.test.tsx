// @vitest-environment node
import { renderToString } from 'react-dom/server'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { examples } from '../examples.generated'

let errors: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  errors = vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  errors.mockRestore()
})

const all = Object.values(examples)
const safe = all.filter((e) => e.rscSafe)

test('there is at least one rscSafe and one non-rscSafe example', () => {
  expect(safe.length).toBeGreaterThan(0)
  expect(all.length - safe.length).toBeGreaterThan(0)
})

test.each(safe)('$id (rscSafe) renders to an HTML string with an svg', async (entry) => {
  const { default: Example } = await entry.load()
  const html = renderToString(<Example />)

  expect(html).toContain('<svg')
  expect(errors).not.toHaveBeenCalled()
})
