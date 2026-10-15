// @vitest-environment node
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/** A committed API report; `pnpm --filter tally-charts api:check` keeps it in step with dist. */
const report = (name: 'tally-charts' | 'core') =>
  readFileSync(new URL(`../api/${name}.api.md`, import.meta.url), 'utf8')

describe('the committed API reports', () => {
  it.each(['tally-charts', 'core'] as const)(
    '%s needs no d3 types and no unexported ones',
    (name) => {
      expect(report(name)).not.toMatch(/from 'd3-/)
      expect(report(name)).not.toContain('ae-forgotten-export')
    },
  )

  it('records the custom-mark API and leaves out what 0.6 removed', () => {
    const root = report('tally-charts')
    expect(root).toContain('export function useChart(): ChartContextValue;')
    expect(root).toContain(
      'export function useRegisterPoints(points: readonly ChartPoint[]): void;',
    )
    for (const removed of [
      'ComparisonStatus',
      'WaterfallKind',
      'DeltaDirection',
      'LineRange',
      'overIsBad',
      'onPlanText',
      'registerPoints',
    ]) {
      expect(root).not.toContain(removed)
    }
  })

  it('keeps layout internals out of tally-charts/core', () => {
    const core = report('core')
    for (const internal of [
      'createScale',
      'computeBars',
      'createWarner',
      'isDev',
      'categoryTicks',
      'placeTooltip',
      'FieldGetter',
      'binDots',
    ]) {
      expect(core).not.toContain(internal)
    }
  })
})
