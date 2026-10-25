// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * The public CSS surface: what users may style and override. Adding a token or a part is an API
 * change: add it here, to the README token table if it is a token, and to the changeset.
 */
const TOKENS = [
  // Roles
  '--ch-accent',
  '--ch-accent-soft',
  '--ch-loss',
  '--ch-warn',
  '--ch-gain',
  '--ch-neutral',
  // Text and surfaces
  '--ch-ink',
  '--ch-ink-muted',
  '--ch-grid',
  '--ch-surface',
  '--ch-tooltip-bg',
  '--ch-tooltip-ink',
  '--ch-tooltip-shadow',
  // Hatching
  '--ch-hatch-angle',
  '--ch-hatch-width',
  '--ch-hatch-gap',
  '--ch-hatch-tint',
  // Share bar and zone meter
  '--ch-share-gap',
  '--ch-zone-marker',
  // Sequential: steer the levels with the base and the mixes; the levels are computed outputs.
  '--ch-seq-base',
  '--ch-seq-mix-1',
  '--ch-seq-mix-2',
  '--ch-seq-mix-3',
  '--ch-seq-mix-4',
  '--ch-seq-mix-5',
  '--ch-seq-1',
  '--ch-seq-2',
  '--ch-seq-3',
  '--ch-seq-4',
  '--ch-seq-5',
  '--ch-heatmap-cell-height',
  '--ch-heatmap-min-cell',
  // Misc
  '--ch-font-numeric',
  '--ch-radius',
  '--ch-duration',
  '--ch-ease',
  '--ch-dim-opacity',
  '--ch-tone-text-mix',
]

const PARTS = [
  'area',
  'area-group',
  'axis',
  'axis-label',
  'band',
  'bar',
  'bar-hit',
  'bar-track',
  'bars',
  'callout',
  'callout-stem',
  'column-highlight',
  'column-note',
  'column-total',
  'column-totals',
  'connector',
  'connectors',
  'data-table',
  'delta',
  'delta-arrow',
  'delta-value',
  'dot',
  'dot-count',
  'dot-count-dot',
  'dot-count-dots',
  'dot-count-label',
  'dot-ring',
  'dots',
  'empty',
  'grid',
  'grid-line',
  'group-label',
  'group-labels',
  'heatmap',
  'heatmap-cell',
  'heatmap-corner',
  'heatmap-grid',
  'heatmap-header',
  'heatmap-row',
  'heatmap-rowheader',
  'heatmap-scroll',
  'heatmap-total',
  'heatmap-total-header',
  'heatmap-total-row',
  'inline-bar',
  'inline-bar-fill',
  'inline-bar-target',
  'legend',
  'legend-count',
  'legend-item',
  'legend-label',
  'legend-swatch',
  'line',
  'line-dot',
  'line-group',
  'median',
  'median-label',
  'medians',
  'meter',
  'meter-fill',
  'meter-labels',
  'meter-min-label',
  'meter-target',
  'meter-target-label',
  'meter-track',
  'overlay',
  'pill-label',
  'pill-segment',
  'pill-value',
  'plot',
  'pointer-layer',
  'range-dot',
  'range-gap',
  'range-labels',
  'range-meter',
  'range-reference-label',
  'range-ring',
  'range-scale',
  'range-scale-max',
  'range-scale-min',
  'range-track',
  'range-value-label',
  'region',
  'row-divider',
  'row-dividers',
  'row-highlight',
  'row-label',
  'row-labels',
  'row-sublabel',
  'row-text',
  'runway',
  'runway-axis',
  'runway-cell',
  'runway-dot',
  'runway-head-row',
  'runway-icon',
  'runway-label',
  'runway-name',
  'runway-now',
  'runway-now-label',
  'runway-reset',
  'runway-reset-label',
  'runway-row',
  'runway-rows',
  'runway-status',
  'runway-status-line',
  'runway-strip',
  'share',
  'share-bar',
  'share-empty',
  'share-label',
  'share-list',
  'share-row',
  'share-segment',
  'share-swatch',
  'share-value',
  'stat',
  'stat-caption',
  'stat-label',
  'stat-meta',
  'stat-value',
  'target',
  'target-group',
  'target-label',
  'tooltip',
  'tooltip-pill',
  'value-label',
  'value-labels',
  'zone-meter',
  'zone-meter-label',
  'zone-meter-labels',
  'zone-meter-marker',
  'zone-meter-track',
  'zone-meter-zone',
]

/**
 * `data-ch-*` state and variant attributes (besides `data-ch-part`): public like the parts, so
 * renaming one is an API change.
 */
const STATES = [
  'active',
  'animate',
  'dashed',
  'dimmed',
  'direction',
  'fill',
  'focus',
  'hollow',
  'layout',
  'level',
  'marker',
  'muted',
  'palette',
  'peak',
  'placement',
  'root',
  'selectable',
  'selected',
  'seq-tone',
  'shape',
  'side',
  'size',
  'soft',
  'state',
  'theme',
  'tone',
  'tone-text',
  'totals',
  'variant',
]

/** Classes theme.css may still select: private plumbing, never documented. */
const PRIVATE_CLASSES = ['ch-fillable', 'ch-overlay', 'ch-sr-only', 'ch-svg', 'ch-tooltip']

const src = new URL('..', import.meta.url).pathname
const css = readFileSync(new URL('./theme.css', import.meta.url), 'utf8')
const readme = readFileSync(new URL('../../README.md', import.meta.url), 'utf8')

/** The tokens the README's styling table lists; "`--ch-x-1` … `--ch-x-5`" is a range. */
function readmeTokens(): string[] {
  const table = readme.split('## Styling')[1]?.split('\n## ')[0] ?? ''
  const rows = table
    .split('\n')
    .filter((line) => line.startsWith('| ') && !line.startsWith('| Group'))
  return rows.flatMap((row) =>
    [...row.matchAll(/`(--ch-[a-z0-9-]+)`(?:\s*…\s*`(--ch-[a-z0-9-]+)`)?/g)].flatMap((m) => {
      const [, first = '', last] = m
      const from = /^(.*-)(\d+)$/.exec(first)
      const to = last ? /^(.*-)(\d+)$/.exec(last) : null
      if (!from || !to) return [first]
      return Array.from(
        { length: Number(to[2]) - Number(from[2]) + 1 },
        (_, i) => `${from[1]}${Number(from[2]) + i}`,
      )
    }),
  )
}

function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return sources(path)
    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [path] : []
  })
}
const code = sources(src).map((file) => readFileSync(file, 'utf8'))

/** `--ch-…` names, skipping template literals such as `--ch-${tone}`. */
const TOKEN = /--ch-[a-z0-9]+(?:-[a-z0-9]+)*(?![a-z0-9-]|\$)/g
const unique = (values: Iterable<string>) => [...new Set(values)].sort()

describe('the public CSS surface', () => {
  it('uses exactly the listed --ch-* tokens, in theme.css and in components', () => {
    const used = unique([css, ...code].flatMap((text) => text.match(TOKEN) ?? []))
    expect(used).toEqual(unique(TOKENS))
  })

  it('documents exactly the listed tokens in the README table', () => {
    expect(unique(readmeTokens())).toEqual(unique(TOKENS))
  })

  it('uses exactly the listed data-ch-part values', () => {
    const parts = [css, ...code].flatMap((text) =>
      [...text.matchAll(/data-ch-part(?:="|': ')([a-z-]+)/g)].map((m) => m[1] ?? ''),
    )
    expect(unique(parts)).toEqual(unique(PARTS))
  })

  it('uses exactly the listed data-ch-* state attributes', () => {
    const states = [css, ...code].flatMap((text) =>
      [...text.matchAll(/data-ch-([a-z0-9]+(?:-[a-z0-9]+)*)/g)].map((m) => m[1] ?? ''),
    )
    expect(unique(states.filter((name) => name !== 'part'))).toEqual(unique(STATES))
  })

  it('styles sub-parts through data-ch-part, not classes', () => {
    const classes = unique([...css.matchAll(/\.(ch-[a-z-]+)(?![\w-])/g)].map((m) => m[1] ?? ''))
    expect(classes.filter((c) => !PRIVATE_CLASSES.includes(c))).toEqual([])
  })

  it('keeps private variables in the --_ch- namespace', () => {
    for (const name of ['--_ch-swatch-color', '--_ch-range-ref', '--_ch-heatmap-columns']) {
      expect(css).toContain(name)
    }
    expect(css).toContain('--_ch-seq-ink-strong')
    // Neither the stylesheet nor a component uses the pre-0.6 private names.
    for (const text of [css, ...code]) {
      expect(text).not.toMatch(/--ch-(?:swatch-color|range-ref|heatmap-columns|seq-ink)/)
      expect(text).not.toMatch(/data-ch-dir\b/)
    }
  })
})
