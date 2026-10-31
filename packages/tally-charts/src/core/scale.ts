import { type FieldGetter, toFieldGetter } from './accessor'
import { bandScale, pointScale } from './band'
import { type LinearScale, linearScale, niceDomain } from './linear'
import { toNumber } from './number'
import {
  inferTimeDomain,
  niceTimeDomain,
  type TimeInput,
  type TimeScale,
  type TimeZone,
  timeScale,
  toTime,
} from './time'
import type { Accessor } from './types'
import { DEV, type Warn } from './warn'

export interface LinearScaleSpec<D> {
  type?: 'linear'
  field?: Accessor<D, number>
  /**
   * Explicit `[min, max]`; the order may be reversed. `y={{ domain: [10, 1] }}` puts 1 at the top
   * and 10 at the bottom, e.g. for search positions where 1 is best. Axis, Grid, Line, Area, Band,
   * Target and the pointer and keyboard follow it. `Bars` hang from the edge nearest zero, here
   * the top, so a reversed scale is rarely right for bars.
   */
  domain?: readonly [number, number]
  /** Round an inferred domain to tick values. Default true; explicit domains are never niced. */
  nice?: boolean
  /** Include zero in an inferred domain. Default true. */
  zero?: boolean
}

export interface BandScaleSpec<D> {
  type: 'band'
  field?: Accessor<D, string | number>
  domain?: readonly (string | number)[]
  /** Inner padding between bands, 0–1. Default 0.2. */
  padding?: number
  paddingOuter?: number
}

export interface PointScaleSpec<D> {
  type: 'point'
  field?: Accessor<D, string | number>
  domain?: readonly (string | number)[]
  /** Space before the first and after the last point, as a share of one step, 0–1. Default 0.5. */
  padding?: number
}

export interface TimeScaleSpec<D> {
  type: 'time'
  /** Dates as `Date`, epoch ms or ISO strings; values `toTime` rejects are skipped. */
  field?: Accessor<D, TimeInput>
  domain?: readonly [TimeInput, TimeInput]
  /**
   * Round the domain out to tick interval boundaries. Default true for an inferred domain and
   * false for an explicit one.
   */
  nice?: boolean
  /** Default 'utc', which renders the same on the server and the client. */
  zone?: TimeZone
}

export type ScaleSpec<D> =
  | LinearScaleSpec<D>
  | BandScaleSpec<D>
  | PointScaleSpec<D>
  | TimeScaleSpec<D>

/** Categories to bands: `scale(category)` is the band's start in px. */
export interface BandScale {
  (value: string): number | undefined
  domain(): string[]
  range(): [number, number]
  /** Width of one band in px. */
  bandwidth(): number
  /** Distance between the starts of neighbouring bands in px. */
  step(): number
}

/** Categories to points: `scale(category)` is the point's position in px. */
export interface PointScale {
  (value: string): number | undefined
  domain(): string[]
  range(): [number, number]
  /** Always 0: points have no width. */
  bandwidth(): number
  /** Distance between neighbouring points in px. */
  step(): number
}

/** A chart axis's scale, as `useChart()` reports it. Narrow on `kind` to use `scale`. */
export type ResolvedScale =
  | { kind: 'linear'; scale: LinearScale }
  | { kind: 'band'; scale: BandScale }
  | { kind: 'point'; scale: PointScale }
  | { kind: 'time'; scale: TimeScale }

/** Internal: a resolved scale plus the field its axis reads, which marks fall back to. */
export type FieldScale = ResolvedScale & { field?: FieldGetter }

export function inferLinearDomain(values: readonly number[], zero = true): [number, number] {
  let min = Number.POSITIVE_INFINITY
  let max = Number.NEGATIVE_INFINITY
  for (const v of values) {
    if (!Number.isFinite(v)) continue
    if (v < min) min = v
    if (v > max) max = v
  }
  if (min > max) return [0, 1]
  if (zero) {
    min = Math.min(0, min)
    max = Math.max(0, max)
  }
  if (min === max) {
    if (min === 0) return [0, 1]
    const pad = Math.abs(min) * 0.1
    return [min - pad, max + pad]
  }
  return [min, max]
}

function uniqueStrings(data: readonly unknown[], field: FieldGetter): string[] {
  const seen = new Set<string>()
  for (const [i, d] of data.entries()) {
    const v = field(d, i)
    if (v !== null && v !== undefined) seen.add(String(v))
  }
  return [...seen]
}

export function createScale<D>(
  spec: ScaleSpec<D> | undefined,
  data: readonly D[],
  axis: 'x' | 'y',
  length: number,
  warn: Warn,
): FieldScale {
  const field = toFieldGetter<D>(spec?.field)

  if (spec?.type === 'band' || spec?.type === 'point') {
    const domain = spec.domain ? spec.domain.map(String) : field ? uniqueStrings(data, field) : []
    if (DEV && domain.length === 0) {
      warn(
        `${axis}-${spec.type}-domain`,
        `The ${axis} ${spec.type} scale has no domain. Set \`field\` or \`domain\` on <Chart ${axis}>.`,
      )
    }
    if (spec.type === 'point') {
      return { kind: 'point', scale: pointScale(domain, [0, length], spec.padding ?? 0.5), field }
    }
    const scale = bandScale(domain, [0, length], spec.padding ?? 0.2, spec.paddingOuter ?? 0)
    return { kind: 'band', scale, field }
  }

  if (spec?.type === 'time') {
    const zone = spec.zone ?? 'utc'
    const explicit = spec.domain?.map(toTime)
    const valid = explicit?.every((t) => t !== undefined) ?? false
    if (DEV && explicit && !valid) {
      warn(
        `${axis}-time-domain-invalid`,
        `The ${axis} time scale's \`domain\` has a value that is not a date; using the dates in the data instead.`,
      )
    }
    const values = valid
      ? (explicit as number[])
      : field
        ? data.map((d, i) => toTime(field(d, i)) ?? Number.NaN)
        : []
    if (DEV && !values.some(Number.isFinite)) {
      warn(
        `${axis}-time-domain`,
        `The ${axis} time scale has no valid dates. Set \`field\` or \`domain\` on <Chart ${axis}>.`,
      )
    }
    let domain = inferTimeDomain(values)
    if (spec.nice ?? !valid) domain = niceTimeDomain(domain, zone)
    const range: [number, number] = axis === 'y' ? [length, 0] : [0, length]
    return { kind: 'time', scale: timeScale(domain, range, zone), field }
  }

  const linear = spec as LinearScaleSpec<D> | undefined
  let domain: [number, number]
  if (linear?.domain) {
    domain = [linear.domain[0], linear.domain[1]]
  } else if (field) {
    domain = inferLinearDomain(
      data.map((d, i) => toNumber(field(d, i))),
      linear?.zero ?? true,
    )
    if (linear?.nice ?? true) domain = niceDomain(domain)
  } else {
    if (DEV) {
      warn(
        `${axis}-linear-domain`,
        `The ${axis} scale has no domain. Set \`field\` or \`domain\` on <Chart ${axis}>.`,
      )
    }
    domain = [0, 1]
  }
  const range: [number, number] = axis === 'y' ? [length, 0] : [0, length]
  return { kind: 'linear', scale: linearScale(domain, range), field }
}

/**
 * Centre of a category in px: the middle of a band, or the position of a point. Undefined on a
 * linear or time scale and for a category the scale doesn't know.
 */
export function categoryCenter(resolved: ResolvedScale, value: unknown): number | undefined {
  if (resolved.kind === 'linear' || resolved.kind === 'time') return undefined
  if (value === null || value === undefined) return undefined
  const start = resolved.scale(String(value))
  return start === undefined ? undefined : start + resolved.scale.bandwidth() / 2
}

/** Distance between neighbouring categories in px; 0 on a linear or time scale. */
export function categoryStep(resolved: ResolvedScale): number {
  return resolved.kind === 'band' || resolved.kind === 'point' ? resolved.scale.step() : 0
}
