// @vitest-environment node
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { TONES } from '../core/types'

const css = readFileSync(new URL('./theme.css', import.meta.url), 'utf8')

describe('theme.css', () => {
  it.each(TONES)('defines --ch-%s for light, system dark and forced dark', (tone) => {
    expect(css.match(new RegExp(`--ch-${tone}:`, 'g')) ?? []).toHaveLength(3)
  })

  it.each([
    '--ch-ink:',
    '--ch-ink-muted:',
    '--ch-grid:',
    '--ch-surface:',
    '--ch-tooltip-bg:',
    '--ch-tooltip-ink:',
  ])('defines %s in all three theme blocks', (token) => {
    expect(css.split(token).length - 1).toBe(3)
  })

  it.each([
    '--ch-hatch-angle:',
    '--ch-hatch-width:',
    '--ch-hatch-gap:',
    '--ch-seq-5:',
    '--ch-duration:',
    '--ch-ease:',
    '--ch-dim-opacity:',
    '--ch-radius:',
    '--ch-font-numeric:',
  ])('defines %s', (token) => {
    expect(css).toContain(token)
  })

  it('disables motion for reduced-motion users', () => {
    expect(css).toContain('@media (prefers-reduced-motion: reduce)')
  })
})
