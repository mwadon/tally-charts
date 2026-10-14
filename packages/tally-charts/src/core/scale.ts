import { type ScaleBand, scaleBand } from 'd3-scale'
import { type FieldGetter, toFieldGetter } from './accessor'
import { type LinearScale, linearScale, niceDomain } from './linear'
import type { Accessor } from './types'
import { DEV, type Warn } from './warn'

export interface LinearScaleSpec<D> {
  type?: 'linear'
  field?: Accessor<D, number>
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

export type ScaleSpec<D> = LinearScaleSpec<D> | BandScaleSpec<D>

export type ResolvedScale =
  | { kind: 'band'; scale: ScaleBand<string>; field?: FieldGetter }
  | { kind: 'linear'; scale: LinearScale; field?: FieldGetter }

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

function toNumber(value: unknown): number {
  return value === null || value === undefined ? Number.NaN : Number(value)
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
): ResolvedScale {
  const field = toFieldGetter<D>(spec?.field)

  if (spec?.type === 'band') {
    const domain = spec.domain ? spec.domain.map(String) : field ? uniqueStrings(data, field) : []
    if (DEV && domain.length === 0) {
      warn(
        `${axis}-band-domain`,
        `The ${axis} band scale has no domain. Set \`field\` or \`domain\` on <Chart ${axis}>.`,
      )
    }
    const scale = scaleBand<string>()
      .domain(domain)
      .range([0, length])
      .paddingInner(spec.padding ?? 0.2)
      .paddingOuter(spec.paddingOuter ?? 0)
    return { kind: 'band', scale, field }
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
