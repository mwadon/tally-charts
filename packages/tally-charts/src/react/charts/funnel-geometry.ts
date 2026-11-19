export interface FunnelGeometry {
  /** Position of every step line along the funnel, from 0. */
  lines: number[]
  /** Ribbon edges across the funnel at every step line: [near, far]; equal when the step is zero. */
  extents: [number, number][]
  /** One closed path per layer, in layer order; null for a layer that is zero at every step. */
  paths: (string | null)[]
}

const FLAT_RUN = 0.2
const MIN_THICKNESS = 2

const round = (value: number): number => Math.round(value * 100) / 100

export function funnelGeometry(input: {
  /** values[step][layer], all finite and ≥ 0; one layer for a single stream. */
  values: readonly (readonly number[])[]
  /** Plot size along the funnel. */
  length: number
  /** Plot size across the funnel. */
  thickness: number
  /** false: along = x, across = y. true: along = y, across = x. */
  vertical: boolean
}): FunnelGeometry {
  const { values, length, thickness, vertical } = input
  const steps = values.length
  if (steps === 0) return { lines: [], extents: [], paths: [] }

  const column = length / steps
  const lines = values.map((_, i) => i * column)
  const totals = values.map((row) => row.reduce((sum, v) => sum + v, 0))
  const peak = Math.max(...totals)
  const centre = thickness / 2

  const widths = totals.map((total) =>
    total > 0 ? Math.max(MIN_THICKNESS, (total / peak) * thickness) : 0,
  )
  const extents = widths.map((w): [number, number] => [centre - w / 2, centre + w / 2])

  const point = (along: number, across: number): string =>
    vertical ? `${round(across)},${round(along)}` : `${round(along)},${round(across)}`
  const flat = (along: number): string => `${vertical ? 'V' : 'H'}${round(along)}`
  const curve = (from: number, to: number, a: number, b: number): string => {
    const mid = (from + to) / 2
    return `C${point(mid, a)} ${point(mid, b)} ${point(to, b)}`
  }

  const layerCount = values[0]?.length ?? 0
  const paths: (string | null)[] = []
  for (let layer = 0; layer < layerCount; layer++) {
    if (!values.some((row) => row[layer]! > 0)) {
      paths.push(null)
      continue
    }
    // Boundaries of this layer at every step: near edge and far edge.
    const near: number[] = []
    const far: number[] = []
    values.forEach((row, i) => {
      const total = totals[i]!
      let before = 0
      for (let k = 0; k < layer; k++) before += row[k]!
      const share = (v: number): number => (total > 0 ? (v / total) * widths[i]! : 0)
      near.push(extents[i]![0] + share(before))
      far.push(extents[i]![0] + share(before + row[layer]!))
    })

    const forward = (edge: number[]): string[] => {
      const out: string[] = []
      for (let i = 0; i < steps - 1; i++) {
        const knee = lines[i]! + FLAT_RUN * column
        out.push(flat(knee), curve(knee, lines[i + 1]!, edge[i]!, edge[i + 1]!))
      }
      out.push(flat(length))
      return out
    }
    const backward = (edge: number[]): string[] => {
      const out: string[] = []
      for (let i = steps - 1; i > 0; i--) {
        const knee = lines[i - 1]! + FLAT_RUN * column
        out.push(flat(lines[i]!), curve(lines[i]!, knee, edge[i]!, edge[i - 1]!))
      }
      out.push(flat(lines[0]!))
      return out
    }

    paths.push(
      [
        `M${point(0, near[0]!)}`,
        ...forward(near),
        `L${point(length, far[steps - 1]!)}`,
        ...backward(far),
        'Z',
      ].join(' '),
    )
  }

  return { lines, extents, paths }
}
