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
    '--ch-tone-text-mix:',
  ])('defines %s', (token) => {
    expect(css).toContain(token)
  })

  it('keeps connectors, column highlights and areas out of pointer events', () => {
    const rule = css.match(/\[data-ch-part="bar"\],[\s\S]*?\{([^}]*)\}/)
    expect(rule?.[0]).toContain('[data-ch-part="column-highlight"]')
    expect(rule?.[0]).toContain('[data-ch-part="connector"]')
    expect(rule?.[0]).toContain('[data-ch-part="area"]')
    expect(rule?.[0]).toContain('[data-ch-part="dot"]')
    expect(rule?.[0]).toContain('[data-ch-part="dot-ring"]')
    expect(rule?.[0]).toContain('[data-ch-part="median"]')
    for (const part of ['line', 'line-dot', 'band', 'grid-line', 'region']) {
      expect(rule?.[0]).toContain(`[data-ch-part="${part}"]`)
    }
    expect(rule?.[1]).toContain('pointer-events: none')
  })

  it('disables motion for reduced-motion users', () => {
    expect(css).toContain('@media (prefers-reduced-motion: reduce)')
  })

  it('paints medians and their labels in the inked tone mix, like tinted text', () => {
    const mix = 'color-mix(in srgb, var(--ch-swatch-color) var(--ch-tone-text-mix), var(--ch-ink))'
    expect(css).toMatch(
      /\[data-ch-part="median"\] \{[^}]*stroke: color-mix\(in srgb, var\(--ch-swatch-color\) var\(--ch-tone-text-mix\), var\(--ch-ink\)\)/,
    )
    expect(css).toMatch(/\[data-ch-part="median-label"\] \{[^}]*fill: color-mix/)
    expect(css).toContain(mix)
  })
})
