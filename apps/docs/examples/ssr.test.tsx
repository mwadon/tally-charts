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

// Charts draw an <svg>. The small pieces (Stat, Meter, Legend…) and the Heatmap are plain HTML
// and CSS, so their examples may have none, but they must still render some HTML.
const mayOmitSvg = (id: string) =>
  id.startsWith('small-pieces/') ||
  id.startsWith('heatmap/') ||
  id === 'migration/small-pieces-pinned'

test.each(safe)('$id (rscSafe) renders to an HTML string', async (entry) => {
  const { default: Example } = await entry.load()
  const html = renderToString(<Example />)

  if (mayOmitSvg(entry.id)) expect(html.replace(/<[^>]*>/g, '').trim()).not.toBe('')
  else expect(html).toContain('<svg')
  expect(errors).not.toHaveBeenCalled()
})
