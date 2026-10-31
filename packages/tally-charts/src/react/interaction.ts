import { useCallback, useMemo, useRef, useState } from 'react'
import type { Id } from '../core/types'
import { formatMessage, POSITION } from './messages'
import type { ActiveSource, ChartPoint, PointGroup, TooltipSegment } from './types'
import { useIsoLayoutEffect } from './useIsoLayoutEffect'

const ARROWS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'])

/**
 * Arrow keys for a point in a group. Vertical groups (stacks) move with ↑/↓ inside the stack
 * and ←/→ to the neighbouring stack; horizontal groups (rows) the other way round. Moving
 * across lands on the neighbour's point nearest along the group's own axis.
 */
function navigateGroup(
  points: readonly ChartPoint[],
  current: ChartPoint,
  group: PointGroup,
  key: string,
): Id {
  const vertical = group.axis === 'vertical'
  const along = vertical
    ? key === 'ArrowUp' || key === 'ArrowDown'
    : key === 'ArrowLeft' || key === 'ArrowRight'
  const forward = vertical
    ? along
      ? key === 'ArrowUp'
      : key === 'ArrowRight'
    : along
      ? key === 'ArrowRight'
      : key === 'ArrowDown'
  if (along) {
    const members = points.filter((p) => p.group?.key === group.key)
    const i = members.findIndex((p) => p.id === current.id)
    const next = members[forward ? Math.min(i + 1, members.length - 1) : Math.max(i - 1, 0)]
    return (next ?? current).id
  }
  const keys: (string | number)[] = []
  for (const p of points) {
    const k = p.group?.key
    if (k !== undefined && !keys.includes(k)) keys.push(k)
  }
  const target = keys[keys.indexOf(group.key) + (forward ? 1 : -1)]
  if (target === undefined) return current.id
  let best: ChartPoint | undefined
  let bestDistance = Number.POSITIVE_INFINITY
  for (const p of points) {
    if (p.group?.key !== target) continue
    const distance = vertical ? Math.abs(p.y - current.y) : Math.abs(p.x - current.x)
    if (distance < bestDistance) {
      best = p
      bestDistance = distance
    }
  }
  return (best ?? current).id
}

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
  const current = index >= 0 ? points[index] : undefined
  if (current?.group && ARROWS.has(key)) return navigateGroup(points, current, current.group, key)
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

/**
 * What the live region says for a point: "{series}, {n} of {total}, {label}". The position counts
 * within the point's series, and the series is left out when every point shares it.
 */
export function announcement(
  points: readonly ChartPoint[],
  point: ChartPoint,
  position: string = POSITION,
): string {
  const peers = points.filter((p) => p.series === point.series)
  const several = points.some((p) => p.series !== point.series)
  const at = peers.indexOf(point)
  return [
    several ? point.series : undefined,
    at < 0 ? undefined : formatMessage(position, { index: at + 1, total: peers.length }),
    point.label,
  ]
    .filter(Boolean)
    .join(', ')
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
      p.hitX === q.hitX &&
      p.hitY === q.hitY &&
      p.label === q.label &&
      p.series === q.series &&
      p.datum === q.datum &&
      p.group?.key === q.group?.key &&
      p.group?.axis === q.group?.axis &&
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
  registerPoints: (key: string, points: readonly ChartPoint[]) => void
  unregisterPoints: (key: string) => void
}

export function useInteraction({
  activeId: controlledId,
  onActiveChange,
}: InteractionOptions): Interaction {
  const [innerId, setInnerId] = useState<Id | null>(null)
  const [source, setSource] = useState<ActiveSource>('pointer')
  const [registry, setRegistry] = useState<Record<string, readonly ChartPoint[]>>({})
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

  const registerPoints = useCallback((key: string, next: readonly ChartPoint[]) => {
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
