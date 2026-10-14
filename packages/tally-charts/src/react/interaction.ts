import { useCallback, useMemo, useRef, useState } from 'react'
import type { Id } from '../core/types'
import type { ActiveSource, ChartPoint, TooltipSegment } from './types'
import { useIsoLayoutEffect } from './useIsoLayoutEffect'

/** Next active id for a key press; `undefined` when the key isn't handled. */
export function navigate(
  points: readonly ChartPoint[],
  currentId: Id | null,
  key: string,
): Id | null | undefined {
  if (key === 'Escape') return currentId === null ? undefined : null
  if (points.length === 0) return undefined
  const last = points.length - 1
  const index = currentId === null ? -1 : points.findIndex((p) => p.id === currentId)
  switch (key) {
    case 'ArrowRight':
    case 'ArrowDown':
      return points[index < 0 ? 0 : Math.min(index + 1, last)]?.id
    case 'ArrowLeft':
    case 'ArrowUp':
      return points[index < 0 ? last : Math.max(index - 1, 0)]?.id
    case 'Home':
      return points[0]?.id
    case 'End':
      return points[last]?.id
    default:
      return undefined
  }
}

/** The first point per id, in order. Marks layered over the same rows register the same ids. */
export function uniquePoints(points: readonly ChartPoint[]): ChartPoint[] {
  const seen = new Set<Id>()
  const unique: ChartPoint[] = []
  for (const point of points) {
    if (seen.has(point.id)) continue
    seen.add(point.id)
    unique.push(point)
  }
  return unique
}

function sameSegments(a: readonly TooltipSegment[], b: readonly TooltipSegment[]): boolean {
  if (a.length !== b.length) return false
  return a.every((s, i) => {
    const t = b[i]
    return (
      t !== undefined &&
      Object.is(s.value, t.value) &&
      Object.is(s.label, t.label) &&
      s.tone === t.tone
    )
  })
}

export function samePoints(
  a: readonly ChartPoint[] | undefined,
  b: readonly ChartPoint[],
): boolean {
  if (!a || a.length !== b.length) return false
  return a.every((p, i) => {
    const q = b[i]
    return (
      q !== undefined &&
      p.id === q.id &&
      p.index === q.index &&
      p.x === q.x &&
      p.y === q.y &&
      p.label === q.label &&
      p.datum === q.datum &&
      sameSegments(p.segments, q.segments)
    )
  })
}

export interface InteractionOptions {
  activeId?: Id | null
  onActiveChange?: (id: Id | null, point: ChartPoint | null) => void
}

export interface Interaction {
  activeId: Id | null
  activePoint: ChartPoint | null
  source: ActiveSource
  points: ChartPoint[]
  setActive: (id: Id | null, source: ActiveSource) => void
  registerPoints: (key: string, points: ChartPoint[]) => void
  unregisterPoints: (key: string) => void
}

export function useInteraction({
  activeId: controlledId,
  onActiveChange,
}: InteractionOptions): Interaction {
  const [innerId, setInnerId] = useState<Id | null>(null)
  const [source, setSource] = useState<ActiveSource>('pointer')
  const [registry, setRegistry] = useState<Record<string, ChartPoint[]>>({})
  const controlled = controlledId !== undefined
  const activeId: Id | null = controlledId !== undefined ? controlledId : innerId
  const points = useMemo(() => uniquePoints(Object.values(registry).flat()), [registry])
  const activePoint = activeId === null ? null : (points.find((p) => p.id === activeId) ?? null)

  const latest = useRef({ activeId, points, onActiveChange, controlled })
  useIsoLayoutEffect(() => {
    latest.current = { activeId, points, onActiveChange, controlled }
  })

  const setActive = useCallback((id: Id | null, nextSource: ActiveSource) => {
    const current = latest.current
    setSource(nextSource)
    if (id === current.activeId) return
    if (!current.controlled) {
      setInnerId(id)
      // The ref otherwise updates after render; a second call in the same event must see this id.
      latest.current = { ...current, activeId: id }
    }
    current.onActiveChange?.(
      id,
      id === null ? null : (current.points.find((p) => p.id === id) ?? null),
    )
  }, [])

  const registerPoints = useCallback((key: string, next: ChartPoint[]) => {
    setRegistry((prev) => (samePoints(prev[key], next) ? prev : { ...prev, [key]: next }))
  }, [])

  const unregisterPoints = useCallback((key: string) => {
    setRegistry((prev) => {
      if (!(key in prev)) return prev
      const { [key]: _removed, ...rest } = prev
      return rest
    })
  }, [])

  return { activeId, activePoint, source, points, setActive, registerPoints, unregisterPoints }
}
