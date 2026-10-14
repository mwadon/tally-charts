import { toNumber } from './number'

export interface WaffleCell {
  /** Index of the column (period) in `counts`. */
  column: number
  /** Index of the dot inside its column. */
  dot: number
  /** Position across the column, 0 … wide − 1. */
  col: number
  /** 0 is the bottom row. */
  row: number
}

export interface WaffleLayout {
  cells: WaffleCell[]
  /** Rows in the tallest column. */
  maxRows: number
}

/** Dot cells per column, filled bottom-up `wide` across. Counts are rounded; bad counts draw nothing. */
export function packWaffle(counts: readonly unknown[], wide = 2): WaffleLayout {
  const across = Number.isFinite(wide) && wide >= 1 ? Math.floor(wide) : 2
  const cells: WaffleCell[] = []
  let maxRows = 0
  counts.forEach((raw, column) => {
    const n = toNumber(raw)
    const count = Number.isFinite(n) && n > 0 ? Math.round(n) : 0
    for (let dot = 0; dot < count; dot++) {
      cells.push({ column, dot, col: dot % across, row: Math.floor(dot / across) })
    }
    maxRows = Math.max(maxRows, Math.ceil(count / across))
  })
  return { cells, maxRows }
}
