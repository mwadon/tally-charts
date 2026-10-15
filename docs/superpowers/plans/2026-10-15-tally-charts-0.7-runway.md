# tally-charts 0.7 — RunwayChart Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `RunwayChart` (runway strips), the `runwayForecast` helper and `Region fill="hatch"`, and recreate `docs/reference/08-usage-runway.png` as a reference story.

**Architecture:** Pure logic in `src/core/runway.ts` (forecast helper, public; cell model, date/status text, internal). `src/react/charts/RunwayChart.tsx` renders an HTML grid of rows (label | SVG strip | status) with one measured strip width shared by every row and the axis; rows are a listbox when selectable. CSS lives in `theme.css` like every other chart.

**Tech Stack:** React 18/19, TypeScript 6, d3-time, vitest + Testing Library, Playwright e2e in `apps/storybook`, size-limit, API Extractor, pnpm.

**Spec:** `docs/superpowers/specs/2026-10-15-tally-charts-0.7-runway-design.md`

## Global Constraints

- All changes additive; the API report gains only additions (`pnpm --filter tally-charts api:update`, then review `api/*.api.md`).
- Size: new size-limit entry `RunwayChart` ≤ 15 KB gzip; `tally-charts/core` ≤ 8 KB; `LineChart` ≤ 13 KB. Never raise a budget; report instead.
- Dev warnings: only inside `if (DEV)` via a `createWarner()` warner; every new warning phrase is listed in `scripts/check-dev-strip.mjs`.
- Public CSS surface: every new `data-ch-part` value goes into `PARTS` and every new `data-ch-*` state name into `STATES` in `src/theme/surface.test.ts`; no new `--ch-*` tokens; private variables are `--_ch-*`.
- New `theme.css` rules go **before** the `@media (forced-colors: active)` block, except forced-colors rules, which go inside it.
- Built-in strings are English. Dates use the `ChartsProvider` locale through `useFormat().date`, zone `'utc'` by default.
- Story data uses fictional, generic account names and generic icons — no real product names or logos.
- Commit trailer: `Co-Authored-By: <your model> <noreply@anthropic.com>`.
- Commands run from the repo root: `pnpm --filter tally-charts test`, `pnpm --filter tally-charts typecheck`, `pnpm lint`, `pnpm --filter tally-charts build`, `pnpm --filter tally-charts size`, `pnpm --filter tally-charts check:dev-strip`, `pnpm --filter tally-charts api:check`, `pnpm test:e2e`.

## Plan rulings on the spec

These settle what the spec left open or named differently from the codebase; the spec was amended to match where noted.

1. `tone` defaults to `'neutral'` and is always written as `data-ch-seq-tone`; an ancestor `--ch-seq-base` does not reach RunwayChart (pass `tone` instead). Simpler than Heatmap's inheritance, and the levels need a tone's mix shares anyway.
2. The "reset" label goes right of the tick or is omitted — never left, where it would sit on hatched cells and fail contrast.
3. Warning keys: the spec's `runway-projection` is split into `runway-projection` (dropped point) and `runway-projection-order` (sorted), because the warner dedupes by key and one would silence the other.
4. Levels use the Heatmap mapping of bins onto the five sequential levels (`binLevels`): four bins paint levels 1, 2, 4, 5.
5. `resetAt <= now` wins over `used >= 1` in `runwayForecast`: a window already over has no `runsOutAt`.
6. The status column is a fixed `11rem` track (not `max-content`) so every row's strip has the same width as the axis.

## Review Focus

1. **Rows from different windows share one axis** — a row whose `resetAt` is before `domain[0]` or whose projection starts after `domain[1]` must render all-empty or all-level cells without NaN in the markup (Task 2 test "row entirely outside the domain").
2. **Server rendering** — `renderToString(<RunwayChart initialWidth={…}/>)` must be deterministic and NaN-free, with the strip already drawn at the initial width (Task 6 SSR test).
3. **Narrow containers** — at 320 CSS px the stacked layout must keep every row readable and the cells at ≥ 1 px gap without overlapping rects (Task 4 test "stacked at 320 px", Task 8 reflow e2e).
4. **Keyboard focus across re-renders** — when `rows` changes and the focused id disappears, focus must fall back to the first row instead of pointing `aria-activedescendant` at a missing id (Task 5 test).
5. **Dates exactly on a boundary** — `runsOutAt` equal to a cell start belongs to that cell; `resetAt` equal to `domain[1]` draws no tick and its status has no arrow (Task 2 and Task 3 tests).

---

### Task 1: `runwayForecast` helper

**Files:**
- Create: `packages/tally-charts/src/core/runway.ts`
- Create: `packages/tally-charts/src/core/runway.test.ts`
- Modify: `packages/tally-charts/src/core/index.ts` (export)
- Modify: `packages/tally-charts/src/index.ts` (export)
- Modify: `packages/tally-charts/scripts/check-dev-strip.mjs` (phrase)

**Interfaces:**
- Produces: `runwayForecast(input: RunwayForecastInput): RunwayForecast`, types `RunwayForecastInput`, `RunwayForecast`, `RunwayPoint` — exported from `tally-charts/core` and `tally-charts`.

- [ ] **Step 1: Write the failing tests** in `src/core/runway.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { runwayForecast } from './runway'

const H = 36e5
const D = 24 * H
const start = Date.UTC(2026, 9, 9, 11, 22)
const reset = start + 7 * D
const at = (share: number) => start + share * 7 * D

describe('runwayForecast', () => {
  afterEach(() => vi.restoreAllMocks())

  it('reproduces the reference: 85% used at 81% of the window runs out about 8 h before reset', () => {
    const f = runwayForecast({ used: 0.85, windowStart: start, resetAt: reset, now: at(0.81) })
    expect(f.elapsed).toBeCloseTo(0.81, 6)
    expect(f.paceRatio).toBeCloseTo(0.85 / 0.81, 6)
    expect(f.usedAtReset).toBeCloseTo(0.85 + (0.85 / 0.81) * 0.19, 6)
    const runsOut = at(0.81) + (0.15 * 0.81 * 7 * D) / 0.85
    expect(f.runsOutAt?.getTime()).toBeCloseTo(runsOut, -1)
    expect(f.lockedMs).toBeCloseTo(reset - runsOut, -1)
    expect(f.lockedMs / H).toBeGreaterThan(7.5)
    expect(f.lockedMs / H).toBeLessThan(8.5)
    expect(f.projection.map((p) => [p.at.getTime(), p.used])).toEqual([
      [at(0.81), 0.85],
      [f.runsOutAt?.getTime(), 1],
    ])
    expect(f.resetAt.getTime()).toBe(reset)
  })

  it('projects to reset when the allowance lasts', () => {
    const f = runwayForecast({ used: 0.2, windowStart: start, resetAt: reset, now: at(0.5) })
    expect(f.runsOutAt).toBeUndefined()
    expect(f.usedAtReset).toBeCloseTo(0.4, 9)
    expect(f.lockedMs).toBe(0)
    expect(f.projection.at(-1)?.at.getTime()).toBe(reset)
    expect(f.projection.at(-1)?.used).toBeCloseTo(0.4, 9)
  })

  it('takes an explicit pace in share per ms', () => {
    const f = runwayForecast({ used: 0.5, windowStart: start, resetAt: reset, now: at(0.5), pace: 0.25 / D })
    expect(f.runsOutAt?.getTime()).toBe(at(0.5) + 2 * D)
    expect(f.paceRatio).toBeCloseTo(0.25 * 7, 9)
  })

  it('runs out now when the allowance is already used up', () => {
    const f = runwayForecast({ used: 1.02, windowStart: start, resetAt: reset, now: at(0.9) })
    expect(f.runsOutAt?.getTime()).toBe(at(0.9))
    expect(f.projection).toHaveLength(1)
    expect(f.lockedMs).toBe(reset - at(0.9))
  })

  it('never runs out at zero pace, or when now is the window start', () => {
    for (const f of [
      runwayForecast({ used: 0.3, windowStart: start, resetAt: reset, now: at(0.5), pace: 0 }),
      runwayForecast({ used: 0, windowStart: start, resetAt: reset, now: start }),
    ]) {
      expect(f.runsOutAt).toBeUndefined()
      expect(f.paceRatio).toBe(0)
      expect(f.usedAtReset).toBe(f.projection[0]?.used)
    }
  })

  it('has nothing ahead once the window is over, even if it was used up', () => {
    const f = runwayForecast({ used: 1.2, windowStart: start, resetAt: reset, now: reset + H })
    expect(f.runsOutAt).toBeUndefined()
    expect(f.projection).toHaveLength(1)
    expect(f.usedAtReset).toBe(1.2)
    expect(f.lockedMs).toBe(0)
  })

  it('warns once and returns no projection for bad input, without throwing', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const bad = [
      { used: Number.NaN, windowStart: start, resetAt: reset, now: at(0.5) },
      { used: -0.1, windowStart: start, resetAt: reset, now: at(0.5) },
      { used: 0.1, windowStart: 'nope', resetAt: reset, now: at(0.5) },
      { used: 0.1, windowStart: reset, resetAt: start, now: at(0.5) },
      { used: 0.1, windowStart: start, resetAt: reset, now: at(0.5), pace: -1 },
    ]
    for (const input of bad) {
      const f = runwayForecast(input)
      expect(f.projection).toEqual([])
      expect(f.runsOutAt).toBeUndefined()
      expect(f.usedAtReset).toBeNaN()
      expect(f.lockedMs).toBe(0)
    }
    expect(warn.mock.calls.filter(([m]) => String(m).includes('runwayForecast needs'))).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter tally-charts test src/core/runway.test.ts`
Expected: FAIL — cannot resolve `./runway`.

- [ ] **Step 3: Implement** `src/core/runway.ts`:

```ts
import { type TimeInput, toTime } from './time'
import { createWarner, DEV } from './warn'

/** A projected share of the allowance at a moment. */
export interface RunwayPoint {
  at: Date
  used: number
}

export interface RunwayForecastInput {
  /** Share of the allowance used so far, 0–1 (may exceed 1). */
  used: number
  windowStart: TimeInput
  resetAt: TimeInput
  now: TimeInput
  /** Share of the allowance per millisecond. Default: used / (now − windowStart). */
  pace?: number
}

export interface RunwayForecast {
  /** `[now, used]`, then a straight line at the pace to `runsOutAt` (used 1) or to `resetAt`. */
  projection: RunwayPoint[]
  /** When the projection reaches 1 before `resetAt`; undefined if it does not. */
  runsOutAt?: Date
  resetAt: Date
  /** Projected share at `resetAt`, uncapped (0.53 reads "~53% at reset"). */
  usedAtReset: number
  /** The pace over the even pace, 1 / (resetAt − windowStart). 1.0 reads "1.0x even". */
  paceRatio: number
  /** Share of the window elapsed at `now`, 0–1. */
  elapsed: number
  /** From `runsOutAt` to `resetAt` in ms, or 0. */
  lockedMs: number
}

const warn = createWarner()

/**
 * Where an allowance is heading at a steady pace: when it runs out, how long it then stays
 * locked, and how much is used at reset. Spread the result into a `RunwayChart` row.
 */
export function runwayForecast(input: RunwayForecastInput): RunwayForecast {
  const { used, pace } = input
  const start = toTime(input.windowStart)
  const reset = toTime(input.resetAt)
  const now = toTime(input.now)
  if (
    start === undefined ||
    reset === undefined ||
    now === undefined ||
    start >= reset ||
    !(Number.isFinite(used) && used >= 0) ||
    (pace !== undefined && !(Number.isFinite(pace) && pace >= 0))
  ) {
    if (DEV) {
      warn(
        'runway-forecast-input',
        'runwayForecast needs a used share of 0 or more, valid dates with windowStart before resetAt, and a pace of 0 or more; it returned no projection.',
      )
    }
    return {
      projection: [],
      resetAt: new Date(reset ?? Number.NaN),
      usedAtReset: Number.NaN,
      paceRatio: Number.NaN,
      elapsed: Number.NaN,
      lockedMs: 0,
    }
  }
  const window = reset - start
  const rate = pace ?? (now > start ? used / (now - start) : 0)
  const base = {
    resetAt: new Date(reset),
    paceRatio: rate * window,
    elapsed: Math.min(1, Math.max(0, (now - start) / window)),
  }
  const first: RunwayPoint = { at: new Date(now), used }
  if (reset <= now) return { ...base, projection: [first], usedAtReset: used, lockedMs: 0 }
  const usedAtReset = used + rate * (reset - now)
  if (used >= 1) {
    return { ...base, projection: [first], runsOutAt: new Date(now), usedAtReset, lockedMs: reset - now }
  }
  if (rate > 0 && usedAtReset >= 1) {
    const out = now + (1 - used) / rate
    return {
      ...base,
      projection: [first, { at: new Date(out), used: 1 }],
      runsOutAt: new Date(out),
      usedAtReset,
      lockedMs: reset - out,
    }
  }
  return {
    ...base,
    projection: [first, { at: new Date(reset), used: usedAtReset }],
    usedAtReset,
    lockedMs: 0,
  }
}
```

- [ ] **Step 4: Export.** In `src/core/index.ts` add (keep the file's alphabetical-by-module order):

```ts
export type { RunwayForecast, RunwayForecastInput, RunwayPoint } from './runway'
export { runwayForecast } from './runway'
```

Add the same two lines to `src/index.ts` (after the `./core/format` exports, keeping module order). Add `'runwayForecast needs'` to `phrases` in `scripts/check-dev-strip.mjs`.

- [ ] **Step 5: Run tests and typecheck**

Run: `pnpm --filter tally-charts test src/core/runway.test.ts && pnpm --filter tally-charts typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/tally-charts/src/core/runway.ts packages/tally-charts/src/core/runway.test.ts packages/tally-charts/src/core/index.ts packages/tally-charts/src/index.ts packages/tally-charts/scripts/check-dev-strip.mjs
git commit -m "feat(core): runwayForecast helper"
```

---

### Task 2: Runway cell model (internal core)

**Files:**
- Modify: `packages/tally-charts/src/core/runway.ts` (append; nothing here is exported from an index)
- Modify: `packages/tally-charts/src/core/runway.test.ts` (append)

**Interfaces:**
- Consumes: `toTime`, `DAY` from `./time`; `levelFor`, `binLevels`, `sequentialBreaks` from `./thresholds`; `Warn`, `DEV` from `./warn`.
- Produces (internal, used by Task 4/5):
  - `DEFAULT_CELL: number` (6 h in ms), `MAX_CELLS = 200`, `DEFAULT_BREAKS = [0.25, 0.5, 0.75]`
  - `parseCell(cell: string | number | undefined): number | undefined` — undefined means invalid
  - `cellBounds(domain: readonly [number, number], cellMs: number): { bounds: [number, number][]; cut: boolean }`
  - `RunwayRowInput` = `{ id: string; projection?: readonly { at: TimeInput; used: number }[]; runsOutAt?: TimeInput; resetAt?: TimeInput; disconnected?: boolean }`
  - `RunwayTimes` = `{ points: { at: number; used: number }[]; runsOutAt?: number; resetAt?: number; forecast: boolean }`
  - `normalizeRow(row: RunwayRowInput, warn: Warn): RunwayTimes`
  - `projectionAt(points: readonly { at: number; used: number }[], t: number): number` (NaN for no points)
  - `RunwayCellState = 'level' | 'runs-out' | 'locked' | 'empty'`
  - `RunwayCell = { start: number; end: number; state: RunwayCellState; level: SeqLevel | 0 }`
  - `runwayCells(times: RunwayTimes, bounds: readonly [number, number][], edges: readonly number[], levels: readonly SeqLevel[]): RunwayCell[]`

- [ ] **Step 1: Write the failing tests** (append to `runway.test.ts`; add the new names to the import from `./runway`, and `binLevels` from `./thresholds`):

```ts
describe('parseCell', () => {
  it('reads minutes, hours, days and milliseconds, defaulting to 6 h', () => {
    expect(parseCell(undefined)).toBe(6 * H)
    expect(parseCell('30m')).toBe(30 * 6e4)
    expect(parseCell('6h')).toBe(6 * H)
    expect(parseCell('1.5d')).toBe(1.5 * D)
    expect(parseCell(42)).toBe(42)
  })
  it('rejects anything else', () => {
    for (const bad of ['6', 'h', '0h', '-1d', '6 h', 0, -5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(parseCell(bad as string | number)).toBeUndefined()
    }
  })
})

describe('cellBounds', () => {
  it('cuts the last cell at the domain end', () => {
    expect(cellBounds([0, 10], 4)).toEqual({ bounds: [[0, 4], [4, 8], [8, 10]], cut: false })
  })
  it('keeps at most 200 cells', () => {
    const { bounds, cut } = cellBounds([0, 1000], 1)
    expect(bounds).toHaveLength(200)
    expect(cut).toBe(true)
  })
})

describe('projectionAt', () => {
  const pts = [{ at: 10, used: 0.2 }, { at: 20, used: 0.6 }]
  it('interpolates and holds the ends', () => {
    expect(projectionAt(pts, 15)).toBeCloseTo(0.4, 9)
    expect(projectionAt(pts, 0)).toBe(0.2)
    expect(projectionAt(pts, 99)).toBe(0.6)
    expect(projectionAt([], 5)).toBeNaN()
  })
})

describe('normalizeRow', () => {
  it('parses dates, sorts points and warns', () => {
    const warn = vi.fn()
    const t = normalizeRow(
      {
        id: 'a',
        projection: [
          { at: 20, used: 0.5 },
          { at: '1970-01-01T00:00:00.010Z', used: 0.1 },
          { at: 'bad', used: 0.3 },
          { at: 30, used: -1 },
        ],
        runsOutAt: 'nope',
        resetAt: 40,
      },
      warn,
    )
    expect(t.points).toEqual([{ at: 10, used: 0.1 }, { at: 20, used: 0.5 }])
    expect(t.runsOutAt).toBeUndefined()
    expect(t.resetAt).toBe(40)
    expect(t.forecast).toBe(true)
    expect(warn.mock.calls.map(([key]) => key).sort()).toEqual([
      'runway-dates',
      'runway-projection',
      'runway-projection-order',
    ])
  })
  it('drops a runsOutAt after resetAt', () => {
    const warn = vi.fn()
    const t = normalizeRow({ id: 'a', projection: [{ at: 0, used: 0 }], runsOutAt: 50, resetAt: 40 }, warn)
    expect(t.runsOutAt).toBeUndefined()
    expect(warn).toHaveBeenCalledWith('runway-runs-out', expect.stringContaining('"a"'))
  })
  it('has no forecast when disconnected or without points', () => {
    expect(normalizeRow({ id: 'a', projection: [{ at: 0, used: 0 }], disconnected: true }, vi.fn()).forecast).toBe(false)
    expect(normalizeRow({ id: 'a' }, vi.fn()).forecast).toBe(false)
  })
})

describe('runwayCells', () => {
  const edges = [0.25, 0.5, 0.75]
  const levels = binLevels(4) // [1, 2, 4, 5]
  const bounds = cellBounds([0, 100], 10).bounds
  const states = (cells: { state: string; level: number }[]) =>
    cells.map((c) => (c.state === 'level' ? `L${c.level}` : c.state))

  it('levels, runs out, locks until reset, then empties', () => {
    const times = {
      points: [{ at: 0, used: 0 }, { at: 40, used: 1 }],
      runsOutAt: 40,
      resetAt: 70,
      forecast: true,
    }
    expect(states(runwayCells(times, bounds, edges, levels))).toEqual([
      'L1', 'L2', 'L4', 'L5', 'runs-out', 'locked', 'locked', 'empty', 'empty', 'empty',
    ])
  })

  it('puts a runsOutAt on a cell start into that cell', () => {
    const times = { points: [{ at: 0, used: 0.9 }], runsOutAt: 30, resetAt: 100, forecast: true }
    expect(runwayCells(times, bounds, edges, levels)[3]?.state).toBe('runs-out')
    expect(runwayCells(times, bounds, edges, levels)[2]?.state).toBe('level')
  })

  it('is all empty without a forecast', () => {
    const times = { points: [], forecast: false }
    expect(new Set(states(runwayCells(times, bounds, edges, levels)))).toEqual(new Set(['empty']))
  })

  it('row entirely outside the domain: reset before it empties all, a later forecast holds its first value', () => {
    const before = { points: [{ at: -50, used: 0.3 }], resetAt: -10, forecast: true }
    expect(new Set(states(runwayCells(before, bounds, edges, levels)))).toEqual(new Set(['empty']))
    const after = { points: [{ at: 500, used: 0.6 }], forecast: true }
    expect(new Set(states(runwayCells(after, bounds, edges, levels)))).toEqual(new Set(['L4']))
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm --filter tally-charts test src/core/runway.test.ts`
Expected: FAIL — `parseCell` etc. not exported.

- [ ] **Step 3: Implement** — append to `src/core/runway.ts` (merge the imports at the top: `DAY` from `./time`, `binLevels`/`levelFor`/`sequentialBreaks` are used by Task 4 only via their own import; here only `levelFor` and the `SeqLevel` type are needed, plus `Warn`):

```ts
// --- Internal: the cell model RunwayChart draws. Not exported from any index. ---

const MINUTE = 6e4
const UNIT: Record<string, number> = { m: MINUTE, h: 60 * MINUTE, d: DAY }

export const DEFAULT_CELL = 6 * 60 * MINUTE
export const MAX_CELLS = 200
export const DEFAULT_BREAKS: readonly number[] = [0.25, 0.5, 0.75]

/** Cell length in ms from `'30m'`, `'6h'`, `'1d'` or ms; undefined when it is not one. */
export function parseCell(cell: string | number | undefined): number | undefined {
  if (cell === undefined) return DEFAULT_CELL
  if (typeof cell === 'number') return Number.isFinite(cell) && cell > 0 ? cell : undefined
  const m = /^(\d+(?:\.\d+)?)([mhd])$/.exec(cell)
  const ms = m ? Number(m[1]) * (UNIT[m[2] as string] as number) : Number.NaN
  return ms > 0 ? ms : undefined
}

/** Consecutive cells from the domain start; the last is cut at the end; at most MAX_CELLS. */
export function cellBounds(
  domain: readonly [number, number],
  cellMs: number,
): { bounds: [number, number][]; cut: boolean } {
  const [d0, d1] = domain
  const bounds: [number, number][] = []
  for (let t = d0; t < d1 && bounds.length < MAX_CELLS; t += cellMs) {
    bounds.push([t, Math.min(t + cellMs, d1)])
  }
  const last = bounds[bounds.length - 1]
  return { bounds, cut: last !== undefined && last[1] < d1 }
}

export interface RunwayRowInput {
  id: string
  projection?: readonly { at: TimeInput; used: number }[]
  runsOutAt?: TimeInput
  resetAt?: TimeInput
  disconnected?: boolean
}

export interface RunwayTimes {
  points: { at: number; used: number }[]
  runsOutAt?: number
  resetAt?: number
  forecast: boolean
}

/** A row's dates as epoch ms, its projection cleaned and sorted, with warnings for what was fixed. */
export function normalizeRow(row: RunwayRowInput, warn: Warn): RunwayTimes {
  const points: { at: number; used: number }[] = []
  for (const p of row.projection ?? []) {
    const at = toTime(p.at)
    if (at === undefined || !(Number.isFinite(p.used) && p.used >= 0)) {
      if (DEV) {
        warn(
          'runway-projection',
          `RunwayChart dropped a projection point without a valid date or a used share of 0 or more in row "${row.id}".`,
        )
      }
      continue
    }
    points.push({ at, used: p.used })
  }
  if (points.some((p, i) => i > 0 && (points[i - 1] as { at: number }).at > p.at)) {
    if (DEV) {
      warn('runway-projection-order', `RunwayChart sorted the projection of row "${row.id}" by date.`)
    }
    points.sort((a, b) => a.at - b.at)
  }
  const date = (value: TimeInput | undefined, name: string) => {
    if (value === undefined) return undefined
    const t = toTime(value)
    if (t === undefined && DEV) {
      warn('runway-dates', `RunwayChart ignored an invalid ${name} in row "${row.id}".`)
    }
    return t
  }
  let runsOutAt = date(row.runsOutAt, 'runsOutAt')
  const resetAt = date(row.resetAt, 'resetAt')
  if (runsOutAt !== undefined && resetAt !== undefined && runsOutAt > resetAt) {
    if (DEV) {
      warn('runway-runs-out', `RunwayChart ignored a runsOutAt after resetAt in row "${row.id}".`)
    }
    runsOutAt = undefined
  }
  return { points, runsOutAt, resetAt, forecast: !row.disconnected && points.length > 0 }
}

/** The projection at `t`: linear between points, the end values outside them; NaN without points. */
export function projectionAt(points: readonly { at: number; used: number }[], t: number): number {
  const first = points[0]
  const last = points[points.length - 1]
  if (!first || !last) return Number.NaN
  if (t <= first.at) return first.used
  if (t >= last.at) return last.used
  const i = points.findIndex((p) => p.at >= t)
  const b = points[i] as { at: number; used: number }
  const a = points[i - 1] as { at: number; used: number }
  return b.at === a.at ? b.used : a.used + ((b.used - a.used) * (t - a.at)) / (b.at - a.at)
}

export type RunwayCellState = 'level' | 'runs-out' | 'locked' | 'empty'

export interface RunwayCell {
  start: number
  end: number
  state: RunwayCellState
  /** Sequential level for 'level' cells, else 0. */
  level: SeqLevel | 0
}

/** Each cell's state, decided at its midpoint (spec §3.1). */
export function runwayCells(
  times: RunwayTimes,
  bounds: readonly [number, number][],
  edges: readonly number[],
  levels: readonly SeqLevel[],
): RunwayCell[] {
  const { points, runsOutAt, resetAt, forecast } = times
  return bounds.map(([start, end]) => {
    const mid = (start + end) / 2
    const cell = (state: RunwayCellState, level: SeqLevel | 0 = 0) => ({ start, end, state, level })
    if (!forecast) return cell('empty')
    if (resetAt !== undefined && mid >= resetAt) return cell('empty')
    if (runsOutAt !== undefined && start <= runsOutAt && runsOutAt < end) return cell('runs-out')
    if (runsOutAt !== undefined && mid > runsOutAt) return cell('locked')
    return cell('level', levelFor(projectionAt(points, mid), edges, levels))
  })
}
```

Imports at the top of the file become:

```ts
import { levelFor } from './thresholds'
import { DAY, type TimeInput, toTime } from './time'
import type { SeqLevel } from './types'
import { createWarner, DEV, type Warn } from './warn'
```

- [ ] **Step 4: Run tests** — `pnpm --filter tally-charts test src/core/runway.test.ts && pnpm --filter tally-charts typecheck` → PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/tally-charts/src/core/runway.ts packages/tally-charts/src/core/runway.test.ts
git commit -m "feat(core): runway cell model"
```

---

### Task 3: Runway status text (internal core)

**Files:**
- Modify: `packages/tally-charts/src/core/runway.ts` (append)
- Modify: `packages/tally-charts/src/core/runway.test.ts` (append)

**Interfaces:**
- Consumes: `DateFormatter` type from `./date`; `RunwayTimes`, `projectionAt` from Task 2.
- Produces (internal):
  - `RunwayDateFormats = { weekday: DateFormatter; day: DateFormatter; time: DateFormatter }`
  - `runwayDate(ms: number, now: number, end: number, f: RunwayDateFormats): { text: string; beyond: boolean }`
  - `RunwayFacts` (public type, re-exported by Task 4 from the component module): `{ runsOutAt?: Date; resetAt?: Date; usedAtReset: number; runsOutBeyond: boolean; resetBeyond: boolean; forecast: boolean }`
  - `runwayFacts(times: RunwayTimes, end: number): RunwayFacts`
  - `statusLines(facts: RunwayFacts, disconnected: boolean, now: number, end: number, f: RunwayDateFormats): string[]`

- [ ] **Step 1: Write the failing tests** (append; import `createDateFormatter` from `./date`):

```ts
describe('status text', () => {
  const f = {
    weekday: createDateFormatter({ weekday: 'short' }),
    day: createDateFormatter({ month: 'short', day: 'numeric' }),
    time: createDateFormatter({ hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }),
  }
  const now = Date.UTC(2026, 9, 15, 2) // Thu Oct 15 02:00 UTC
  const end = now + 7 * D

  it('writes a weekday within 6 days, the date later in the domain, and the day past it', () => {
    expect(runwayDate(Date.UTC(2026, 9, 16, 3, 24), now, end, f)).toEqual({ text: 'Fri 03:24', beyond: false })
    expect(runwayDate(Date.UTC(2026, 9, 21, 9, 21), now, end, f)).toEqual({ text: 'Oct 21 09:21', beyond: false })
    expect(runwayDate(Date.UTC(2026, 10, 9, 8), now, end, f)).toEqual({ text: 'Nov 9', beyond: true })
    expect(runwayDate(end, now, end, f).beyond).toBe(false)
  })

  it('covers the four cases', () => {
    const base = { usedAtReset: Number.NaN, runsOutBeyond: false, resetBeyond: false, forecast: true }
    const reset = new Date(Date.UTC(2026, 9, 16, 11, 22))
    expect(
      statusLines({ ...base, runsOutAt: new Date(Date.UTC(2026, 9, 16, 3, 24)), resetAt: reset, usedAtReset: 1.05 }, false, now, end, f),
    ).toEqual(['Runs out Fri 03:24', 'Resets Fri 11:22'])
    expect(statusLines({ ...base, resetAt: reset, usedAtReset: 0.534 }, false, now, end, f)).toEqual([
      '~53% at reset',
      'Resets Fri 11:22',
    ])
    expect(
      statusLines({ ...base, resetAt: new Date(Date.UTC(2026, 10, 9)), resetBeyond: true, usedAtReset: 0.6 }, false, now, end, f),
    ).toEqual(['~60% at reset', 'Resets Nov 9 →'])
    expect(statusLines({ ...base, forecast: false, resetAt: reset }, false, now, end, f)).toEqual([
      'No forecast',
      'Resets Fri 11:22',
    ])
    expect(statusLines({ ...base, forecast: false }, true, now, end, f)).toEqual(['Disconnected'])
  })

  it('derives the facts, reading the projection at reset', () => {
    const facts = runwayFacts(
      { points: [{ at: now, used: 0.2 }, { at: now + 2 * D, used: 0.6 }], resetAt: now + 2 * D, forecast: true },
      end,
    )
    expect(facts.usedAtReset).toBeCloseTo(0.6, 9)
    expect(facts.resetBeyond).toBe(false)
    expect(runwayFacts({ points: [], forecast: false }, end).usedAtReset).toBeNaN()
  })
})
```

- [ ] **Step 2: Run to verify failure** — FAIL, names not exported.

- [ ] **Step 3: Implement** (append; add `import type { DateFormatter } from './date'`):

```ts
export interface RunwayDateFormats {
  weekday: DateFormatter
  day: DateFormatter
  time: DateFormatter
}

/** What RunwayChart derived for a row: passed to a custom `status`. */
export interface RunwayFacts {
  runsOutAt?: Date
  resetAt?: Date
  /** The projection at `resetAt` (uncapped), or NaN without a forecast or a reset. */
  usedAtReset: number
  /** True when `runsOutAt` falls after the domain end. */
  runsOutBeyond: boolean
  /** True when `resetAt` falls after the domain end. */
  resetBeyond: boolean
  forecast: boolean
}

const SIX_DAYS = 6 * DAY

/** "Fri 03:24" within six days of now, "Oct 21 09:21" later in the domain, "Nov 9" past its end. */
export function runwayDate(
  ms: number,
  now: number,
  end: number,
  f: RunwayDateFormats,
): { text: string; beyond: boolean } {
  if (ms > end) return { text: f.day(ms), beyond: true }
  const date = ms - now < SIX_DAYS ? f.weekday(ms) : f.day(ms)
  return { text: `${date} ${f.time(ms)}`, beyond: false }
}

export function runwayFacts(times: RunwayTimes, end: number): RunwayFacts {
  const { runsOutAt, resetAt, forecast, points } = times
  return {
    runsOutAt: runsOutAt === undefined ? undefined : new Date(runsOutAt),
    resetAt: resetAt === undefined ? undefined : new Date(resetAt),
    usedAtReset: forecast && resetAt !== undefined ? projectionAt(points, resetAt) : Number.NaN,
    runsOutBeyond: runsOutAt !== undefined && runsOutAt > end,
    resetBeyond: resetAt !== undefined && resetAt > end,
    forecast,
  }
}

/** The default two-line status (spec §3.2). */
export function statusLines(
  facts: RunwayFacts,
  disconnected: boolean,
  now: number,
  end: number,
  f: RunwayDateFormats,
): string[] {
  if (disconnected) return ['Disconnected']
  const lines: string[] = []
  if (facts.runsOutAt) {
    lines.push(`Runs out ${runwayDate(facts.runsOutAt.getTime(), now, end, f).text}`)
  } else if (facts.forecast && Number.isFinite(facts.usedAtReset)) {
    lines.push(`~${Math.round(facts.usedAtReset * 100)}% at reset`)
  } else {
    lines.push('No forecast')
  }
  if (facts.resetAt) {
    const d = runwayDate(facts.resetAt.getTime(), now, end, f)
    lines.push(`Resets ${d.text}${d.beyond ? ' →' : ''}`)
  }
  return lines
}
```

If `createDateFormatter` with these option objects writes anything other than `Fri`, `Oct 21`, `09:21` in `en-US`/UTC (e.g. a comma or `24:00`), fix the option objects here and in Task 4 — the expected strings in the test are the contract.

- [ ] **Step 4: Run tests** → PASS. **Step 5: Commit** `git commit -m "feat(core): runway status text"` (same two files).

---

### Task 4: `RunwayChart` rendering

**Files:**
- Create: `packages/tally-charts/src/react/charts/RunwayChart.tsx`
- Create: `packages/tally-charts/src/react/charts/RunwayChart.test.tsx`
- Modify: `packages/tally-charts/src/index.ts` (export component and types)
- Modify: `packages/tally-charts/src/theme/theme.css` (rules before the forced-colors block)
- Modify: `packages/tally-charts/src/theme/surface.test.ts` (`PARTS`, `STATES`)
- Modify: `packages/tally-charts/.size-limit.json` (new entry)
- Modify: `packages/tally-charts/scripts/check-dev-strip.mjs` (phrases)

**Interfaces:**
- Consumes: everything from Tasks 1–3; `useFormat` (`../ChartsProvider`); `useWidth` (`../useWidth`); `useIsoLayoutEffect`; `PatternDefs` (`../PatternDefs`); `DEFAULT_HATCH`, `readHatchGeometry`, `patternId` (`../../theme/patterns`); `timeScale`, `toTime`, `DAY`, `TimeZone`, `TimeInput` (`../../core/time`); `thinTicks`, `Tick` (`../../core/ticks`); `binLevels`, `sequentialBreaks` (`../../core/thresholds`); `unixDay`, `timeDay` (`d3-time`); `cx` (`../ui/util`).
- Produces: `RunwayChart`, `RunwayChartProps`, `RunwayRow`, `RunwayFacts` exported from `tally-charts`. Internal for Task 5: the rows container element carries `data-ch-part="runway-rows"`; each row has id `${baseId}-row-${index}`; name span id `${baseId}-name-${index}`; status div id `${baseId}-status-${index}`.

- [ ] **Step 1: Write the failing tests** `src/react/charts/RunwayChart.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RunwayChart, type RunwayChartProps, type RunwayRow } from './RunwayChart'

const H = 36e5
const D = 24 * H
const now = Date.UTC(2026, 9, 15, 2)
const domain = [Date.UTC(2026, 9, 15), Date.UTC(2026, 9, 22)] as const

const rows: RunwayRow[] = [
  {
    id: 'pro',
    label: 'Pro plan',
    projection: [{ at: now, used: 0.85 }, { at: now + 25 * H, used: 1 }],
    runsOutAt: now + 25 * H,
    resetAt: now + 33 * H,
  },
  {
    id: 'team',
    label: 'Team seat',
    projection: [{ at: now, used: 0.2 }, { at: now + 3 * D, used: 0.53 }],
    resetAt: now + 3 * D,
  },
  { id: 'starter', label: 'Starter', disconnected: true, status: 'Reconnect to forecast' },
]

function renderRunway(props: Partial<RunwayChartProps> = {}) {
  return render(
    <RunwayChart rows={rows} domain={domain} now={now} title="Runway" initialWidth={900} {...props} />,
  )
}

const part = (root: ParentNode, name: string) =>
  [...root.querySelectorAll(`[data-ch-part="${name}"]`)] as HTMLElement[]

describe('<RunwayChart>', () => {
  afterEach(() => vi.restoreAllMocks())

  it('draws 28 six-hour cells per row with their states', () => {
    const { container } = renderRunway()
    const strips = part(container, 'runway-strip')
    expect(strips).toHaveLength(3)
    const states = (strip: Element) =>
      [...strip.querySelectorAll('[data-ch-part="runway-cell"]')].map((c) => c.getAttribute('data-ch-state'))
    const pro = states(strips[0] as Element)
    expect(pro).toHaveLength(28)
    expect(pro.slice(0, 4)).toEqual(['level', 'level', 'level', 'level'])
    expect(pro[4]).toBe('runs-out')
    expect(pro[5]).toBe('locked')
    expect(pro.at(-1)).toBe('empty')
    expect(new Set(states(strips[2] as Element))).toEqual(new Set(['empty']))
  })

  it('paints levels with the sequential level and locked cells with the loss hatch', () => {
    const { container } = renderRunway()
    const level = container.querySelector('[data-ch-state="level"]')
    expect(level?.getAttribute('data-ch-level')).toMatch(/^[1-5]$/)
    const locked = container.querySelector('[data-ch-state="locked"]') as SVGElement
    expect(locked.style.fill).toMatch(/^url\(#ch-.*-hatch-loss\)$/)
    expect(container.querySelector('pattern[id$="-hatch-loss"]')).not.toBeNull()
  })

  it('marks now, the reset and the runs-out dot at their exact times', () => {
    const { container } = renderRunway()
    const [proStrip] = part(container, 'runway-strip')
    const width = Number(proStrip?.getAttribute('width'))
    const x = (t: number) => ((t - domain[0]) / (domain[1] - domain[0])) * width
    const dot = proStrip?.querySelector('[data-ch-part="runway-dot"]')
    expect(Number(dot?.getAttribute('cx'))).toBeCloseTo(x(now + 25 * H), 3)
    const reset = proStrip?.querySelector('[data-ch-part="runway-reset"]')
    expect(Number(reset?.getAttribute('x')) + 1).toBeCloseTo(x(now + 33 * H), 3)
    expect(proStrip?.querySelector('[data-ch-part="runway-reset-label"]')?.textContent).toBe('reset')
    expect(part(container, 'runway-now')).toHaveLength(4) // axis + three rows
  })

  it('omits the reset label when it would not fit before the end', () => {
    const late = [{ ...rows[1], id: 'late', resetAt: domain[1] - H } as RunwayRow]
    const { container } = renderRunway({ rows: late })
    expect(container.querySelector('[data-ch-part="runway-reset"]')).not.toBeNull()
    expect(container.querySelector('[data-ch-part="runway-reset-label"]')).toBeNull()
  })

  it('draws no reset tick at the domain end itself', () => {
    const edge = [{ ...rows[1], id: 'edge', resetAt: domain[1] } as RunwayRow]
    const { container } = renderRunway({ rows: edge })
    expect(container.querySelector('[data-ch-part="runway-reset"]')).toBeNull()
    expect(container.querySelector('[data-ch-part="runway-status"]')?.textContent).not.toContain('→')
  })

  it('writes the default status, a row status, and a status prop', () => {
    renderRunway({ status: (row) => (row.id === 'team' ? 'Custom' : undefined) })
    const statuses = part(document.body, 'runway-status').map((el) => el.textContent)
    expect(statuses).toEqual(['Runs out Fri 03:00 Resets Fri 11:00', 'Custom', 'Reconnect to forecast'])
  })

  it('labels the axis with day names and Now', () => {
    const { container } = renderRunway()
    const axis = part(container, 'runway-axis')[0] as HTMLElement
    const labels = [...axis.querySelectorAll('[data-ch-part="axis-label"]')].map((t) => t.textContent)
    expect(labels).toEqual(['Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Tue', 'Wed'])
    expect(axis.querySelector('[data-ch-part="runway-now-label"]')?.textContent).toBe('Now')
  })

  it('shows the legend from the breaks, and hides it on request', () => {
    const { container, rerender } = renderRunway()
    expect(container.querySelector('[data-ch-part="legend"]')?.textContent).toContain('under 25, 50, 75, 100%')
    rerender(<RunwayChart rows={rows} domain={domain} now={now} title="Runway" legend={false} />)
    expect(container.querySelector('[data-ch-part="legend"]')).toBeNull()
  })

  it('mutes a disconnected row and sets the sequential tone', () => {
    const { container } = renderRunway({ tone: 'accent' })
    expect(part(container, 'runway-row')[2]?.getAttribute('data-ch-muted')).toBe('true')
    expect(part(container, 'runway')[0]?.getAttribute('data-ch-seq-tone')).toBe('accent')
    const { container: plain } = renderRunway()
    expect(part(plain, 'runway')[0]?.getAttribute('data-ch-seq-tone')).toBe('neutral')
  })

  it('stacked at 320 px: switches layout and keeps every cell at least 1 px apart', () => {
    const { container } = renderRunway({ initialWidth: 320 })
    expect(part(container, 'runway')[0]?.getAttribute('data-ch-layout')).toBe('stacked')
    const cells = [...part(container, 'runway-strip')[0]!.querySelectorAll('[data-ch-part="runway-cell"]')]
    for (let i = 1; i < cells.length; i++) {
      const prev = cells[i - 1] as Element
      const end = Number(prev.getAttribute('x')) + Number(prev.getAttribute('width'))
      expect(Number(cells[i]?.getAttribute('x')) - end).toBeGreaterThanOrEqual(1 - 1e-9)
    }
    expect(renderRunway({ layout: 'columns', initialWidth: 320 }).container.querySelector('[data-ch-layout="columns"]')).not.toBeNull()
  })

  it('renders empty for no rows or a bad domain, with warnings', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(renderRunway({ rows: [] }).container.textContent).toContain('No data')
    expect(renderRunway({ domain: [domain[1], domain[0]] }).container.textContent).toContain('No data')
    expect(warn.mock.calls.some(([m]) => String(m).includes('RunwayChart needs a domain'))).toBe(true)
  })

  it('warns about a bad cell, too many cells, bad breaks, duplicate ids and a missing title', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    renderRunway({ cell: 'often', title: undefined })
    renderRunway({ cell: 60_000 })
    renderRunway({ breaks: [0.5, 0.25, Number.NaN] })
    renderRunway({ rows: [rows[0] as RunwayRow, rows[0] as RunwayRow] })
    const text = warn.mock.calls.map(([m]) => String(m)).join('\n')
    for (const phrase of [
      'RunwayChart `cell`',
      'RunwayChart shows at most 200 cells',
      'RunwayChart `breaks`',
      'RunwayChart has a duplicate row id',
      'RunwayChart has no `title`',
    ]) {
      expect(text).toContain(phrase)
    }
  })
})
```

Note on the status test: rows[0] runs out at `now + 25 h` = Fri Oct 16 03:00 UTC, resets at `now + 33 h` = Fri 11:00. The `status` prop returns `undefined` for other rows, so they keep their default or own status.

- [ ] **Step 2: Run to verify failure** — `pnpm --filter tally-charts test src/react/charts/RunwayChart.test.tsx` → FAIL, module missing.

- [ ] **Step 3: Implement** `src/react/charts/RunwayChart.tsx`. Task 5 adds keyboard, pointer and the data table; write this task's version with the role/aria wiring already in place as shown.

```tsx
// biome-ignore-all lint/a11y/useSemanticElements: rows are ARIA options laid out with CSS grid; <select> can't hold them
import {
  type CSSProperties,
  Fragment,
  type ReactNode,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react'
import { timeDay, unixDay } from 'd3-time'
import {
  cellBounds,
  DEFAULT_BREAKS,
  normalizeRow,
  parseCell,
  type RunwayCell,
  type RunwayDateFormats,
  type RunwayFacts,
  runwayCells,
  runwayFacts,
  statusLines,
} from '../../core/runway'
import { binLevels, sequentialBreaks } from '../../core/thresholds'
import { estimateWidth, thinTicks, type Tick } from '../../core/ticks'
import { DAY, type TimeInput, type TimeZone, timeScale, toTime } from '../../core/time'
import type { Tone } from '../../core/types'
import { createWarner, DEV } from '../../core/warn'
import { DEFAULT_HATCH, patternId, readHatchGeometry } from '../../theme/patterns'
import { useFormat } from '../ChartsProvider'
import { PatternDefs } from '../PatternDefs'
import { cx } from '../ui/util'
import { useIsoLayoutEffect } from '../useIsoLayoutEffect'
import { useWidth } from '../useWidth'
import type { DataTableOptions } from './shared'

export type { RunwayFacts } from '../../core/runway'

export interface RunwayRow {
  id: string
  label: string
  icon?: ReactNode
  /** Extra description, e.g. "Side project". Not drawn in the strip; shown in the data table. */
  sublabel?: string
  /** Projected cumulative use, 0–1, linear between points. Absent or empty: no forecast. */
  projection?: readonly { at: TimeInput; used: number }[]
  runsOutAt?: TimeInput
  resetAt?: TimeInput
  /** A muted row with every cell empty. */
  disconnected?: boolean
  /** Replaces the default status text. */
  status?: ReactNode
}

export interface RunwayChartProps {
  rows: readonly RunwayRow[]
  /** Time span of the strips. */
  domain: readonly [TimeInput, TimeInput]
  now: TimeInput
  /** Cell length: '30m', '6h', '1d' or ms. Default '6h'. */
  cell?: string | number
  /** Ascending level edges as shares. Default [0.25, 0.5, 0.75]: four levels. 1–4 edges. */
  breaks?: readonly number[]
  /** Sequential tone of the levels and the legend. Default 'neutral'. */
  tone?: Tone
  /** 'auto' stacks the rows when the strip would be under 240 px. Default 'auto'. */
  layout?: 'auto' | 'columns' | 'stacked'
  /** Width before the first measurement and on the server. Default 640. */
  initialWidth?: number
  /** Label column width in px in the columns layout. Default 200. */
  labelWidth?: number
  /** With `onSelect`, the rows are a listbox. */
  selectedId?: string | null
  onSelect?: (id: string, row: RunwayRow) => void
  activeId?: string | null
  onActiveChange?: (id: string | null, row: RunwayRow | null) => void
  /** Custom status per row; return undefined to keep the default. A row's own `status` wins. */
  status?: (row: RunwayRow, facts: RunwayFacts) => ReactNode
  /** Default true. */
  legend?: boolean
  title?: string
  description?: string
  dataTable?: boolean | DataTableOptions
  empty?: ReactNode
  className?: string
  style?: CSSProperties
  chartId?: string
  /** Zone of the day boundaries and the dates. Default 'utc'. */
  timeZone?: TimeZone
}

const STRIP_HEIGHT = 32
const STATUS_WIDTH = 176 // 11rem
const COLUMN_GAP = 16
const MIN_STRIP = 240
const AXIS_HEIGHT = 40

interface RowModel {
  row: RunwayRow
  cells: RunwayCell[]
  facts: RunwayFacts
  status: ReactNode
  statusText: string
}

export function RunwayChart({
  rows,
  domain: domainProp,
  now: nowProp,
  cell,
  breaks = DEFAULT_BREAKS,
  tone = 'neutral',
  layout = 'auto',
  initialWidth = 640,
  labelWidth = 200,
  selectedId,
  onSelect,
  activeId,
  onActiveChange,
  status,
  legend = true,
  title,
  description,
  dataTable,
  empty,
  className,
  style,
  chartId,
  timeZone = 'utc',
}: RunwayChartProps) {
  const warn = useMemo(() => createWarner(), [])
  const { date } = useFormat()
  const reactId = useId()
  const baseId = `ch-${(chartId ?? reactId).replace(/[^a-zA-Z0-9_-]/g, '')}`
  const titleId = `${baseId}-title`
  const descId = `${baseId}-desc`
  if (DEV && !title) {
    warn('runway-title', 'RunwayChart has no `title`, so screen readers announce an unnamed list.')
  }

  const rootRef = useRef<HTMLDivElement>(null)
  const axisRef = useRef<HTMLDivElement>(null)
  // jsdom and display:none containers measure 0: keep the initial width then.
  const measuredRoot = useWidth(rootRef, initialWidth, true)
  const rootWidth = measuredRoot > 0 ? measuredRoot : initialWidth
  const stacked =
    layout === 'stacked' ||
    (layout === 'auto' && rootWidth - labelWidth - STATUS_WIDTH - 2 * COLUMN_GAP < MIN_STRIP)
  const initialStrip = stacked
    ? initialWidth
    : Math.max(0, initialWidth - labelWidth - STATUS_WIDTH - 2 * COLUMN_GAP)
  const measuredStrip = useWidth(axisRef, initialStrip, true)
  const width = measuredStrip > 0 ? measuredStrip : initialStrip

  const [hatch, setHatch] = useState(DEFAULT_HATCH)
  useIsoLayoutEffect(() => {
    const el = rootRef.current
    if (el) setHatch(readHatchGeometry(getComputedStyle(el)))
  }, [])

  const d0 = toTime(domainProp[0])
  const d1 = toTime(domainProp[1])
  const now = toTime(nowProp)
  const valid = d0 !== undefined && d1 !== undefined && now !== undefined && d0 < d1
  if (DEV && !valid) {
    warn('runway-domain', 'RunwayChart needs a domain of two valid dates, start before end, and a valid `now`.')
  }

  const cellMs = useMemo(() => {
    const ms = parseCell(cell)
    if (ms === undefined) {
      if (DEV) warn('runway-cell', "RunwayChart `cell` must be like '30m', '6h', '1d' or a positive number of ms; using '6h'.")
      return parseCell(undefined) as number
    }
    return ms
  }, [cell, warn])

  const edges = useMemo(() => {
    const clean = sequentialBreaks(breaks)
    if (DEV && (clean.length !== breaks.length || clean.some((b, i) => b !== breaks[i]))) {
      warn('runway-breaks', 'RunwayChart `breaks` must be 1–4 finite ascending shares; they were cleaned.')
    }
    return clean.length > 0 ? clean : [...DEFAULT_BREAKS]
  }, [breaks, warn])
  const levels = useMemo(() => binLevels(edges.length + 1), [edges])

  const formats = useMemo<RunwayDateFormats>(
    () => ({
      weekday: date({ weekday: 'short' }, { zone: timeZone }),
      day: date({ month: 'short', day: 'numeric' }, { zone: timeZone }),
      time: date({ hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }, { zone: timeZone }),
    }),
    [date, timeZone],
  )

  const model = useMemo((): RowModel[] => {
    if (!valid) return []
    const { bounds, cut } = cellBounds([d0, d1], cellMs)
    if (DEV && cut) warn('runway-cells', 'RunwayChart shows at most 200 cells; use a longer `cell`.')
    const seen = new Set<string>()
    return rows.map((row) => {
      if (DEV && seen.has(row.id)) {
        warn('runway-id', `RunwayChart has a duplicate row id "${row.id}"; the first one is selected.`)
      }
      seen.add(row.id)
      const times = normalizeRow(row, warn)
      const facts = runwayFacts(times, d1)
      const lines = statusLines(facts, !!row.disconnected, now, d1, formats)
      const custom = row.status ?? status?.(row, facts)
      return {
        row,
        cells: runwayCells(times, bounds, edges, levels),
        facts,
        status:
          custom ??
          // A space between the lines keeps them apart in the accessible name and textContent;
          // grid layout drops the whitespace.
          lines.map((line, j) => (
            <Fragment key={line}>
              {j > 0 ? ' ' : null}
              <span className="ch-runway-status-line" data-ch-part="runway-status-line">
                {line}
              </span>
            </Fragment>
          )),
        statusText: typeof row.status === 'string' ? row.status : lines.join(', '),
      }
    })
  }, [valid, d0, d1, now, cellMs, rows, edges, levels, formats, status, warn])

  const rootProps = {
    ref: rootRef,
    className: cx('ch-runway', className),
    'data-ch-part': 'runway',
    'data-ch-seq-tone': tone,
    'data-ch-layout': stacked ? 'stacked' : 'columns',
    style: { ...style, '--_ch-runway-label': `${labelWidth}px` } as CSSProperties,
  }

  if (!valid || model.length === 0) {
    return (
      <div {...rootProps}>
        <div data-ch-part="empty" className="ch-empty">
          {empty ?? 'No data'}
        </div>
      </div>
    )
  }

  const x = timeScale([d0, d1], [0, width], timeZone)
  const nowX = now >= d0 && now <= d1 ? x(now) : null
  const selectable = onSelect !== undefined

  return (
    <div {...rootProps}>
      {title ? <span hidden id={titleId}>{title}</span> : null}
      {description ? <span hidden id={descId}>{description}</span> : null}
      <svg aria-hidden="true" width={0} height={0} style={{ position: 'absolute' }}>
        <PatternDefs chartId={baseId} geometry={hatch} />
      </svg>
      <div className="ch-runway-head" data-ch-part="runway-head-row">
        <div ref={axisRef} className="ch-runway-axis" data-ch-part="runway-axis">
          <RunwayAxis x={x} width={width} nowX={nowX} zone={timeZone} weekday={formats.weekday} />
        </div>
      </div>
      <div
        className="ch-runway-rows"
        data-ch-part="runway-rows"
        role={selectable ? 'listbox' : 'list'}
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descId : undefined}
      >
        {model.map((m, i) => (
          <div
            key={`${m.row.id}-${i}`}
            id={`${baseId}-row-${i}`}
            role={selectable ? 'option' : 'listitem'}
            aria-selected={selectable ? m.row.id === selectedId : undefined}
            aria-labelledby={selectable ? `${baseId}-name-${i} ${baseId}-status-${i}` : undefined}
            className="ch-runway-row"
            data-ch-part="runway-row"
            data-ch-muted={m.row.disconnected ? 'true' : undefined}
            data-ch-selectable={selectable ? 'true' : undefined}
          >
            <div className="ch-runway-label" data-ch-part="runway-label">
              {m.row.icon ? (
                <span aria-hidden="true" className="ch-runway-icon" data-ch-part="runway-icon">
                  {m.row.icon}
                </span>
              ) : null}
              <span id={`${baseId}-name-${i}`} className="ch-runway-name" data-ch-part="runway-name" title={m.row.label}>
                {m.row.label}
              </span>
            </div>
            <RunwayStrip model={m} x={x} width={width} nowX={nowX} hatchFill={`url(#${patternId(baseId, 'loss')})`} />
            <div id={`${baseId}-status-${i}`} className="ch-runway-status" data-ch-part="runway-status">
              {m.status}
            </div>
          </div>
        ))}
      </div>
      {legend ? <RunwayLegend edges={edges} levels={levels} /> : null}
    </div>
  )
}

type Scale = ReturnType<typeof timeScale>

function RunwayStrip({
  model,
  x,
  width,
  nowX,
  hatchFill,
}: {
  model: RowModel
  x: Scale
  width: number
  nowX: number | null
  hatchFill: string
}) {
  const [d0, d1] = x.domain()
  const first = model.cells[0]
  const cellWidth = first ? x(first.end) - x(first.start) : 0
  const gap = cellWidth < 6 ? 1 : 2
  const { runsOutAt, resetAt } = model.facts
  const out = runsOutAt?.getTime()
  const reset = resetAt?.getTime()
  const inside = (t: number | undefined): t is number => t !== undefined && t >= d0 && t < d1
  const resetX = inside(reset) ? x(reset) : null
  // "reset" in 12px text is about 33px wide; it only goes right of the tick (plan ruling 2).
  const labelFits = resetX !== null && resetX + 6 + estimateWidth({ label: 'reset' } as Tick) <= width
  return (
    <svg
      aria-hidden="true"
      className="ch-runway-strip ch-svg"
      data-ch-part="runway-strip"
      width={width}
      height={STRIP_HEIGHT}
    >
      {model.cells.map((c) => {
        const x0 = x(c.start) + gap / 2
        const w = Math.max(0, x(c.end) - x(c.start) - gap)
        return (
          <rect
            key={c.start}
            data-ch-part="runway-cell"
            data-ch-state={c.state}
            data-ch-level={c.state === 'level' ? c.level : undefined}
            x={x0}
            y={0}
            width={w}
            height={STRIP_HEIGHT}
            rx={2}
            style={c.state === 'locked' ? { fill: hatchFill } : undefined}
          />
        )
      })}
      {nowX !== null ? <line data-ch-part="runway-now" x1={nowX} x2={nowX} y1={0} y2={STRIP_HEIGHT} /> : null}
      {resetX !== null ? (
        <rect data-ch-part="runway-reset" x={resetX - 1} y={0} width={2} height={STRIP_HEIGHT} />
      ) : null}
      {inside(out) ? <circle data-ch-part="runway-dot" cx={x(out)} cy={STRIP_HEIGHT / 2} r={5} /> : null}
      {labelFits && resetX !== null ? (
        <text data-ch-part="runway-reset-label" x={resetX + 6} y={STRIP_HEIGHT / 2} dominantBaseline="central">
          reset
        </text>
      ) : null}
    </svg>
  )
}

function RunwayAxis({
  x,
  width,
  nowX,
  zone,
  weekday,
}: {
  x: Scale
  width: number
  nowX: number | null
  zone: TimeZone
  weekday: (ms: number) => string
}) {
  const [d0, d1] = x.domain()
  const days = (zone === 'utc' ? unixDay : timeDay).range(new Date(d0 - DAY), new Date(d1))
  const ticks: Tick[] = []
  for (const day of days) {
    const a = Math.max(d0, +day)
    const b = Math.min(d1, +day + DAY)
    // A sliver of a day at either end gets no label.
    if (b - a < DAY / 2) continue
    ticks.push({ value: a, position: x((a + b) / 2), label: weekday(+day), anchor: 'middle' })
  }
  const shown = thinTicks(ticks)
  const nowAnchor = nowX === null ? 'middle' : nowX < 16 ? 'start' : nowX > width - 16 ? 'end' : 'middle'
  return (
    <svg aria-hidden="true" className="ch-svg" width={width} height={AXIS_HEIGHT}>
      {nowX !== null ? (
        <>
          <text data-ch-part="runway-now-label" x={nowX} y={10} textAnchor={nowAnchor} dominantBaseline="central">
            Now
          </text>
          <line data-ch-part="runway-now" x1={nowX} x2={nowX} y1={18} y2={AXIS_HEIGHT} />
        </>
      ) : null}
      {shown.map((t) => (
        <text
          key={t.value}
          data-ch-part="axis-label"
          x={t.position}
          y={30}
          textAnchor={t.anchor}
          dominantBaseline="central"
        >
          {t.label}
        </text>
      ))}
    </svg>
  )
}

function RunwayLegend({ edges, levels }: { edges: readonly number[]; levels: readonly number[] }) {
  const shares = [...edges, 1].map((b) => Math.round(b * 100)).join(', ')
  const swatch = (attrs: Record<string, string | undefined>, color?: string) => (
    <span
      aria-hidden="true"
      className="ch-swatch ch-fillable"
      data-ch-part="legend-swatch"
      {...attrs}
      style={color ? ({ '--_ch-swatch-color': color } as CSSProperties) : undefined}
    />
  )
  return (
    <ul className="ch-legend ch-runway-legend" data-ch-part="legend">
      <li className="ch-legend-item" data-ch-part="legend-item">
        <span className="ch-legend-label" data-ch-part="legend-label">Projected use</span>
        {levels.map((level) =>
          <span key={level}>{swatch({ 'data-ch-level': String(level), 'data-ch-shape': 'bar' }, `var(--ch-seq-${level})`)}</span>,
        )}
        <span className="ch-legend-label" data-ch-part="legend-label">{`under ${shares}%`}</span>
      </li>
      <li className="ch-legend-item" data-ch-part="legend-item">
        {swatch({ 'data-ch-tone': 'loss', 'data-ch-shape': 'runs-out' }, 'var(--ch-loss)')}
        <span className="ch-legend-label" data-ch-part="legend-label">Runs out</span>
      </li>
      <li className="ch-legend-item" data-ch-part="legend-item">
        {swatch({ 'data-ch-tone': 'loss', 'data-ch-fill': 'hatch', 'data-ch-shape': 'bar' }, 'var(--ch-loss)')}
        <span className="ch-legend-label" data-ch-part="legend-label">Locked until reset</span>
      </li>
      <li className="ch-legend-item" data-ch-part="legend-item">
        {swatch({ 'data-ch-shape': 'tick' })}
        <span className="ch-legend-label" data-ch-part="legend-label">Reset</span>
      </li>
      <li className="ch-legend-item" data-ch-part="legend-item">
        {swatch({ 'data-ch-shape': 'empty' })}
        <span className="ch-legend-label" data-ch-part="legend-label">New window, no forecast</span>
      </li>
    </ul>
  )
}
```

Adjust while implementing (the tests are the contract): Biome formatting (`pnpm lint --write` style is the repo's; run `pnpm lint`), unused imports, and the `RunwayLegend` level swatch wrapper — if the extra `<span>` breaks the legend's flex layout, render the swatches directly with `key`.

- [ ] **Step 4: Export** from `src/index.ts`, after the `RankedBars` exports:

```ts
export type { RunwayChartProps, RunwayFacts, RunwayRow } from './react/charts/RunwayChart'
export { RunwayChart } from './react/charts/RunwayChart'
```

- [ ] **Step 5: CSS.** In `src/theme/theme.css`, add a `/* ---------- Runway ---------- */` section **immediately before** `@media (forced-colors: active)`:

```css
/* ---------- Runway ---------- */
[data-ch-part="runway"] {
  display: grid;
  gap: 4px;
  color: var(--ch-ink);
  font-family: inherit;
}

[data-ch-part="runway-head-row"],
[data-ch-part="runway-row"] {
  display: grid;
  grid-template-columns: var(--_ch-runway-label) minmax(0, 1fr) 11rem;
  column-gap: 16px;
  align-items: center;
}

[data-ch-part="runway-axis"] {
  grid-column: 2;
  min-width: 0;
}

[data-ch-part="runway-rows"] {
  display: grid;
  border-radius: var(--ch-radius);
}

[data-ch-part="runway-row"] {
  min-height: 52px;
  padding: 6px 8px;
  margin: 0 -8px;
  border-radius: var(--ch-radius);
  border-top: 1px solid var(--ch-grid);
}

[data-ch-part="runway-row"][data-ch-selectable="true"] {
  cursor: pointer;
}

[data-ch-part="runway-row"][data-ch-active="true"] {
  background: color-mix(in srgb, var(--ch-ink) 4%, transparent);
}

[data-ch-part="runway-row"][aria-selected="true"] {
  background: color-mix(in srgb, var(--ch-ink) 8%, transparent);
}

[data-ch-part="runway-label"] {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

[data-ch-part="runway-icon"] {
  display: inline-flex;
  flex: none;
  width: 20px;
  height: 20px;
}

[data-ch-part="runway-name"] {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

[data-ch-part="runway-status"] {
  display: grid;
  font-size: 14px;
  line-height: 1.3;
  font-variant-numeric: tabular-nums;
}

[data-ch-part="runway-status-line"] + [data-ch-part="runway-status-line"] {
  color: var(--ch-ink-muted);
}

[data-ch-part="runway-row"][data-ch-muted="true"] :is(
    [data-ch-part="runway-label"],
    [data-ch-part="runway-strip"],
    [data-ch-part="runway-status"]
  ) {
  color: var(--ch-ink-muted);
  opacity: 0.6;
}

[data-ch-part="runway-cell"][data-ch-state="level"] {
  fill: var(--_ch-runway-level);
}
[data-ch-part="runway-cell"][data-ch-level="1"] { --_ch-runway-level: var(--ch-seq-1); }
[data-ch-part="runway-cell"][data-ch-level="2"] { --_ch-runway-level: var(--ch-seq-2); }
[data-ch-part="runway-cell"][data-ch-level="3"] { --_ch-runway-level: var(--ch-seq-3); }
[data-ch-part="runway-cell"][data-ch-level="4"] { --_ch-runway-level: var(--ch-seq-4); }
[data-ch-part="runway-cell"][data-ch-level="5"] { --_ch-runway-level: var(--ch-seq-5); }

[data-ch-part="runway-cell"][data-ch-state="runs-out"] {
  fill: color-mix(in srgb, var(--ch-loss) 35%, var(--ch-surface));
}

/* The hatch pattern comes in through the inline fill; the outline is the one hatched marks get. */
[data-ch-part="runway-cell"][data-ch-state="locked"] {
  stroke: color-mix(in srgb, var(--ch-loss) var(--ch-tone-text-mix), var(--ch-ink));
  stroke-width: 1px;
}

[data-ch-part="runway-cell"][data-ch-state="empty"] {
  fill: none;
  stroke: var(--ch-ink-muted);
  stroke-opacity: 0.6;
  stroke-width: 1px;
  stroke-dasharray: 3 2;
}

[data-ch-part="runway-now"] {
  stroke: var(--ch-ink-muted);
  stroke-width: 1px;
  stroke-dasharray: 2 3;
}

[data-ch-part="runway-reset"] {
  fill: var(--ch-ink);
}

[data-ch-part="runway-dot"] {
  fill: var(--ch-loss);
  stroke: var(--ch-surface);
  stroke-width: 2px;
}

[data-ch-part="runway-reset-label"],
[data-ch-part="runway-now-label"] {
  fill: var(--ch-ink-muted);
  font-size: 12px;
}

[data-ch-part="runway-now-label"] {
  fill: var(--ch-ink);
}

[data-ch-part="legend-swatch"][data-ch-shape="tick"] {
  width: 2px;
  background: var(--ch-ink);
}

[data-ch-part="legend-swatch"][data-ch-shape="empty"] {
  background: none;
  outline: 1px dashed var(--ch-ink-muted);
  outline-offset: -1px;
}

[data-ch-part="legend-swatch"][data-ch-shape="runs-out"] {
  background: color-mix(in srgb, var(--ch-loss) 35%, var(--ch-surface));
}

[data-ch-part="runway"][data-ch-layout="stacked"] :is([data-ch-part="runway-head-row"], [data-ch-part="runway-row"]) {
  grid-template-columns: minmax(0, 1fr) auto;
  row-gap: 6px;
}

[data-ch-part="runway"][data-ch-layout="stacked"] [data-ch-part="runway-axis"] {
  grid-column: 1 / -1;
}

[data-ch-part="runway"][data-ch-layout="stacked"] [data-ch-part="runway-strip"] {
  grid-column: 1 / -1;
  grid-row: 2;
}

[data-ch-part="runway"][data-ch-layout="stacked"] [data-ch-part="runway-status"] {
  text-align: end;
}
```

Check the computed contrast mentally against the spec: the "reset" label (`--ch-ink-muted` on the surface) is the axis-label color, which already passes the contrast gate. The empty-cell outline at 0.6 opacity must stay ≥ 3:1 per spec §5 — Task 7's contrast run decides; if it fails, drop `stroke-opacity` (record in the report).

- [ ] **Step 6: Public surface lists.** In `src/theme/surface.test.ts` add to `PARTS` (keep sorted): `runway`, `runway-axis`, `runway-dot`, `runway-head-row`, `runway-icon`, `runway-label`, `runway-name`, `runway-now`, `runway-now-label`, `runway-reset`, `runway-reset-label`, `runway-row`, `runway-rows`, `runway-status`, `runway-status-line`, `runway-strip`, `runway-cell`. Add to `STATES`: `layout`, `state`. (`runway-head-row` is one more part than the spec listed: the header row's grid needs a hook.)

- [ ] **Step 7: Size and dev-strip.** Append to `.size-limit.json`:

```json
  {
    "name": "RunwayChart",
    "path": "dist/index.js",
    "import": "{ RunwayChart }",
    "ignore": ["react", "react-dom"],
    "limit": "15 KB",
    "gzip": true
  }
```

Add phrases to `scripts/check-dev-strip.mjs`: `'RunwayChart needs a domain'`, `'RunwayChart dropped a projection point'`.

- [ ] **Step 8: Verify**

Run: `pnpm --filter tally-charts test && pnpm --filter tally-charts typecheck && pnpm lint && pnpm --filter tally-charts build && pnpm --filter tally-charts size && pnpm --filter tally-charts check:dev-strip`
Expected: all PASS; `RunwayChart` under 15 KB, `LineChart` unchanged.

- [ ] **Step 9: Commit**

```bash
git add packages/tally-charts
git commit -m "feat: RunwayChart rendering"
```

---

### Task 5: `RunwayChart` interaction, accessibility and data table

**Files:**
- Modify: `packages/tally-charts/src/react/charts/RunwayChart.tsx`
- Modify: `packages/tally-charts/src/react/charts/RunwayChart.test.tsx`

**Interfaces:**
- Consumes: Task 4's component, ids (`${baseId}-row-${i}`), `RowModel.statusText`; `DataTable` (`../DataTable`); `withTableOptions` (`./shared`).
- Produces: listbox behaviour (spec §5); `dataTable` prop working.

- [ ] **Step 1: Write the failing tests** (append inside the `describe`; add `act, fireEvent, within` to the Testing Library import):

```tsx
  it('is a plain list without onSelect, with no tab stop', () => {
    renderRunway()
    const list = screen.getByRole('list', { name: 'Runway' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(3)
    expect(list).not.toHaveAttribute('tabindex')
  })

  it('is a listbox with named options when selectable', () => {
    renderRunway({ onSelect: vi.fn(), selectedId: 'team', description: 'Two run out' })
    const box = screen.getByRole('listbox', { name: 'Runway' })
    expect(box).toHaveAccessibleDescription('Two run out')
    expect(box).toHaveAttribute('tabindex', '0')
    const options = within(box).getAllByRole('option')
    expect(options[0]).toHaveAccessibleName('Pro plan Runs out Fri 03:00 Resets Fri 11:00')
    expect(options[1]).toHaveAttribute('aria-selected', 'true')
    expect(options[2]).toHaveAccessibleName('Starter Reconnect to forecast')
  })

  it('moves with the arrow, Home, End and Page keys and selects with Enter and Space', () => {
    const onSelect = vi.fn()
    const onActiveChange = vi.fn()
    renderRunway({ onSelect, onActiveChange })
    const box = screen.getByRole('listbox')
    act(() => box.focus())
    const activeId = () => box.getAttribute('aria-activedescendant')
    const optionIds = within(box).getAllByRole('option').map((o) => o.id)
    expect(activeId()).toBe(optionIds[0])
    fireEvent.keyDown(box, { key: 'ArrowDown' })
    expect(activeId()).toBe(optionIds[1])
    expect(onActiveChange).toHaveBeenLastCalledWith('team', expect.objectContaining({ id: 'team' }))
    fireEvent.keyDown(box, { key: 'End' })
    expect(activeId()).toBe(optionIds[2])
    fireEvent.keyDown(box, { key: 'PageUp' })
    expect(activeId()).toBe(optionIds[0])
    fireEvent.keyDown(box, { key: 'PageDown' })
    expect(activeId()).toBe(optionIds[2])
    fireEvent.keyDown(box, { key: 'Home' })
    fireEvent.keyDown(box, { key: 'Enter' })
    expect(onSelect).toHaveBeenLastCalledWith('pro', expect.objectContaining({ id: 'pro' }))
    fireEvent.keyDown(box, { key: 'ArrowDown' })
    fireEvent.keyDown(box, { key: ' ' })
    expect(onSelect).toHaveBeenLastCalledWith('team', expect.objectContaining({ id: 'team' }))
  })

  it('starts keyboard focus on the selected row', () => {
    renderRunway({ onSelect: vi.fn(), selectedId: 'starter' })
    const box = screen.getByRole('listbox')
    act(() => box.focus())
    expect(box.getAttribute('aria-activedescendant')).toBe(within(box).getAllByRole('option')[2]?.id)
  })

  it('leaves modified keys to the browser', () => {
    renderRunway({ onSelect: vi.fn() })
    const box = screen.getByRole('listbox')
    act(() => box.focus())
    for (const init of [{ altKey: true }, { ctrlKey: true }, { metaKey: true }]) {
      const event = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true, ...init })
      box.dispatchEvent(event)
      expect(event.defaultPrevented).toBe(false)
    }
    expect(box.getAttribute('aria-activedescendant')).toBe(within(box).getAllByRole('option')[0]?.id)
  })

  it('selects on click and activates on hover; Escape clears the active row', () => {
    const onSelect = vi.fn()
    const onActiveChange = vi.fn()
    renderRunway({ onSelect, onActiveChange })
    const options = screen.getAllByRole('option')
    fireEvent.pointerEnter(options[1] as HTMLElement)
    expect(options[1]).toHaveAttribute('data-ch-active', 'true')
    fireEvent.click(options[1] as HTMLElement)
    expect(onSelect).toHaveBeenCalledWith('team', expect.objectContaining({ id: 'team' }))
    const box = screen.getByRole('listbox')
    act(() => box.focus())
    fireEvent.keyDown(box, { key: 'Escape' })
    expect(onActiveChange).toHaveBeenLastCalledWith(null, null)
  })

  it('falls back to the first row when the focused row disappears', () => {
    const { rerender } = renderRunway({ onSelect: vi.fn() })
    const box = screen.getByRole('listbox')
    act(() => box.focus())
    fireEvent.keyDown(box, { key: 'End' })
    rerender(
      <RunwayChart rows={rows.slice(0, 2)} domain={domain} now={now} title="Runway" onSelect={vi.fn()} />,
    )
    const ids = within(screen.getByRole('listbox')).getAllByRole('option').map((o) => o.id)
    expect(ids).toContain(screen.getByRole('listbox').getAttribute('aria-activedescendant'))
  })

  it('renders the data table with one row per entity', () => {
    const { container } = renderRunway({
      dataTable: { columns: { Name: 'Account' } },
      rows: [{ ...(rows[0] as RunwayRow), sublabel: 'Side project' }, ...rows.slice(1)],
    })
    const table = container.querySelector('[data-ch-part="data-table"]') as HTMLTableElement
    expect([...table.querySelectorAll('thead th')].map((th) => th.textContent)).toEqual([
      'Account', 'Detail', 'Runs out', 'Resets', 'Projected at reset', 'Status',
    ])
    const first = [...(table.querySelectorAll('tbody tr')[0]?.children ?? [])].map((c) => c.textContent)
    expect(first).toEqual(['Pro plan', 'Side project', 'Fri 03:00', 'Fri 11:00', '100%', 'Runs out Fri 03:00, Resets Fri 11:00'])
    const starter = [...(table.querySelectorAll('tbody tr')[2]?.children ?? [])].map((c) => c.textContent)
    expect(starter.at(-1)).toBe('Reconnect to forecast')
  })
```

- [ ] **Step 2: Run to verify failure** — the listbox and keyboard tests FAIL.

- [ ] **Step 3: Implement.** In `RunwayChart`:

```tsx
// imports to add
import type { KeyboardEvent } from 'react'
import { DataTable } from '../DataTable'
import { withTableOptions } from './shared'
import { runwayDate } from '../../core/runway'

const PAGE = 5
```

State and helpers, after `model` is computed (before the early return; hooks must not be conditional, so declare them above the `if (!valid || …)` return):

```tsx
  const [innerActive, setInnerActive] = useState<string | null>(null)
  const controlled = activeId !== undefined
  const active = controlled ? activeId : innerActive
  const activeRef = useRef(active)
  activeRef.current = active
  const activeProp = useRef(activeId)
  activeProp.current = activeId
  const [focusIndex, setFocusIndex] = useState<number | null>(null)
  const [focused, setFocused] = useState(false)
  const byId = useMemo(() => {
    const map = new Map<string, number>()
    model.forEach((m, i) => {
      if (!map.has(m.row.id)) map.set(m.row.id, i)
    })
    return map
  }, [model])
  // A focus index past the end (rows removed) falls back to the first row.
  const current = focusIndex !== null && focusIndex < model.length ? focusIndex : null

  const setActive = (next: string | null) => {
    if (next === activeRef.current) return
    activeRef.current = next
    if (controlled) {
      queueMicrotask(() => {
        activeRef.current = activeProp.current ?? null
      })
    } else {
      setInnerActive(next)
    }
    onActiveChange?.(next, next === null ? null : (model[byId.get(next) ?? -1]?.row ?? null))
  }
  const moveTo = (i: number) => {
    const m = model[i]
    if (!m) return
    setFocusIndex(i)
    setActive(m.row.id)
    document.getElementById(`${baseId}-row-${i}`)?.scrollIntoView?.({ block: 'nearest' })
  }
  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return
    const last = model.length - 1
    const at = current ?? 0
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      const m = model[at]
      if (m) onSelect?.(m.row.id, m.row)
      return
    }
    if (event.key === 'Escape') {
      if (activeRef.current !== null) {
        event.preventDefault()
        setActive(null)
      }
      return
    }
    const next =
      event.key === 'ArrowDown' ? Math.min(last, at + 1)
      : event.key === 'ArrowUp' ? Math.max(0, at - 1)
      : event.key === 'Home' ? 0
      : event.key === 'End' ? last
      : event.key === 'PageDown' ? Math.min(last, at + PAGE)
      : event.key === 'PageUp' ? Math.max(0, at - PAGE)
      : null
    if (next === null) return
    event.preventDefault()
    moveTo(next)
  }
```

Rows container props when `selectable`:

```tsx
        tabIndex={selectable ? 0 : undefined}
        aria-activedescendant={selectable && focused ? `${baseId}-row-${current ?? 0}` : undefined}
        onKeyDown={selectable ? onKeyDown : undefined}
        onFocus={() => {
          if (!selectable) return
          setFocused(true)
          const start = current ?? (selectedId != null ? (byId.get(selectedId) ?? 0) : 0)
          moveTo(start)
        }}
        onBlur={(event) => {
          if (event.currentTarget.contains(event.relatedTarget)) return
          setFocused(false)
          setActive(null)
        }}
        onPointerLeave={() => setActive(focused && current !== null ? (model[current]?.row.id ?? null) : null)}
```

Each row:

```tsx
            data-ch-active={m.row.id === active ? 'true' : undefined}
            data-ch-focus={selectable && focused && i === (current ?? 0) ? 'true' : undefined}
            onPointerEnter={() => {
              if (selectable) setFocusIndex(i)
              setActive(m.row.id)
            }}
            onClick={selectable ? () => {
              setFocusIndex(i)
              onSelect?.(m.row.id, m.row)
            } : undefined}
```

`data-ch-focus` is a new state attribute: add `focus` to `STATES` in `surface.test.ts`. Focus ring CSS (before the forced-colors block, after the runway section):

```css
[data-ch-part="runway-rows"]:focus-visible {
  outline: none;
}

[data-ch-part="runway-rows"]:focus-visible [data-ch-part="runway-row"][data-ch-focus="true"] {
  outline: 2px solid transparent;
  box-shadow:
    0 0 0 2px var(--ch-surface),
    0 0 0 4px var(--ch-accent);
}
```

Data table: build the spec after the early return (where `now` and `d1` are known numbers) and render it after the legend:

```tsx
  const dateText = (d: Date | undefined) => (d ? runwayDate(d.getTime(), now, d1, formats).text : '')
  const table = withTableOptions<RowModel>(
    {
      caption: title,
      columns: [
        { header: 'Name', value: (m) => m.row.label },
        { header: 'Detail', value: (m) => m.row.sublabel ?? '' },
        { header: 'Runs out', value: (m) => dateText(m.facts.runsOutAt) },
        { header: 'Resets', value: (m) => dateText(m.facts.resetAt) },
        {
          header: 'Projected at reset',
          value: (m) =>
            Number.isFinite(m.facts.usedAtReset) ? `${Math.round(m.facts.usedAtReset * 100)}%` : '',
        },
        { header: 'Status', value: (m) => m.statusText },
      ],
    },
    dataTable,
  )
  // …in the JSX, after the legend:
  {dataTable && table ? <DataTable data={model} columns={table.columns} caption={table.caption} /> : null}
```

Note: `runsOutAt` past `runsOutAt` cell rules mean `usedAtReset` for the Pro plan row is the held last point, 1 → `100%`, as the test expects.

- [ ] **Step 4: Run** `pnpm --filter tally-charts test && pnpm --filter tally-charts typecheck && pnpm lint` → PASS.

- [ ] **Step 5: Commit** `git commit -am "feat: RunwayChart keyboard, selection and data table"`.

---

### Task 6: Forced colors, SSR and theme tests

**Files:**
- Modify: `packages/tally-charts/src/theme/theme.css` (inside the forced-colors block)
- Modify: `packages/tally-charts/src/theme/theme.test.ts`
- Modify: `packages/tally-charts/src/ssr.node.test.tsx`
- Modify: `packages/tally-charts/test/fixtures.tsx` (a `UsageRunway` fixture)

**Interfaces:**
- Consumes: `RunwayChart`, `runwayForecast`.
- Produces: `UsageRunway` fixture component in `test/fixtures.tsx` (Task 7 does not depend on it).

- [ ] **Step 1: Failing tests.** In `theme.test.ts`, inside `describe('theme.css')`, add (use the file's existing helpers for reading rules inside the forced-colors block; mirror `'keeps HTML marks visible and levels distinct in forced-colors mode'`):

```ts
  it('keeps runway cells, marks and the focused row visible in forced-colors mode', () => {
    const forced = css.slice(css.indexOf('@media (forced-colors: active)'))
    for (const selector of [
      '[data-ch-part="runway-cell"]',
      '[data-ch-part="runway-cell"][data-ch-state="empty"]',
      '[data-ch-part="runway-dot"]',
      '[data-ch-part="runway-reset"]',
      '[data-ch-part="runway-row"][aria-selected="true"]',
      '[data-ch-part="runway-row"][data-ch-focus="true"]',
    ]) {
      expect(forced).toContain(selector)
    }
  })

  it('puts the runway rules before the forced-colors block', () => {
    expect(css.indexOf('/* ---------- Runway ---------- */')).toBeLessThan(css.indexOf('@media (forced-colors: active)'))
  })
```

In `test/fixtures.tsx` add:

```tsx
export function UsageRunway() {
  const now = '2026-10-15T02:00:00Z'
  const rows = [
    { id: 'pro', label: 'Pro plan', ...runwayForecast({ used: 0.85, windowStart: '2026-10-09T11:22:00Z', resetAt: '2026-10-16T11:22:00Z', now }) },
    { id: 'team', label: 'Team seat', ...runwayForecast({ used: 0.48, windowStart: '2026-10-09T20:13:00Z', resetAt: '2026-10-16T20:13:00Z', now }) },
    { id: 'starter', label: 'Starter', disconnected: true, status: 'Reconnect to forecast' },
  ]
  return (
    <RunwayChart
      title="Usage runway"
      rows={rows}
      domain={['2026-10-15T00:00:00Z', '2026-10-22T00:00:00Z']}
      now={now}
      initialWidth={900}
      onSelect={() => {}}
      selectedId="pro"
      dataTable
    />
  )
}
```

(import `RunwayChart` and `runwayForecast` the way the fixture file imports other components.)

In `ssr.node.test.tsx` add:

```tsx
  it('renders the runway without a DOM, with its strips drawn at the initial width', () => {
    const html = renderToString(<UsageRunway />)
    expect(html).toBe(renderToString(<UsageRunway />))
    expect(html).not.toContain('NaN')
    expect(html.match(/data-ch-part="runway-strip"/g)).toHaveLength(3)
    expect(html).toContain('data-ch-state="locked"')
    expect(html).toContain('Runs out Fri')
  })
```

- [ ] **Step 2: Run** — the forced-colors test FAILS; SSR may already pass (if it fails, fix the component, not the test).

- [ ] **Step 3: Implement** — inside `@media (forced-colors: active)`, after the heatmap rules:

```css
  /* Runway: SVG fills aren't forced; paint the levels with steps of the text color. */
  [data-ch-part="runway-cell"] {
    stroke: CanvasText;
    stroke-width: 1px;
  }

  [data-ch-part="runway-cell"][data-ch-state="level"] {
    fill: CanvasText;
  }

  [data-ch-part="runway-cell"][data-ch-level="1"] { fill-opacity: 0.15; }
  [data-ch-part="runway-cell"][data-ch-level="2"] { fill-opacity: 0.35; }
  [data-ch-part="runway-cell"][data-ch-level="3"] { fill-opacity: 0.5; }
  [data-ch-part="runway-cell"][data-ch-level="4"] { fill-opacity: 0.7; }
  [data-ch-part="runway-cell"][data-ch-level="5"] { fill-opacity: 1; }

  [data-ch-part="runway-cell"][data-ch-state="runs-out"] {
    fill: Canvas;
    stroke-width: 2px;
  }

  [data-ch-part="runway-cell"][data-ch-state="empty"] {
    fill: none;
    stroke: GrayText;
    stroke-opacity: 1;
  }

  [data-ch-part="runway-dot"] {
    fill: Highlight;
    stroke: Canvas;
  }

  [data-ch-part="runway-reset"] {
    fill: CanvasText;
  }

  [data-ch-part="runway-now"] {
    stroke: CanvasText;
  }

  [data-ch-part="legend-swatch"][data-ch-shape="tick"] {
    forced-color-adjust: none;
    background: CanvasText;
  }

  [data-ch-part="runway-row"][aria-selected="true"] {
    outline: 2px dashed CanvasText;
  }

  [data-ch-part="runway-row"][data-ch-focus="true"] {
    outline: 2px solid Highlight;
  }
```

The locked cell keeps its hatch: the pattern paints `--ch-loss`, which is `CanvasText` in this mode.

- [ ] **Step 4: Run** `pnpm --filter tally-charts test` → PASS.

- [ ] **Step 5: Commit** `git commit -am "feat: RunwayChart forced colors and SSR coverage"` (add `test/fixtures.tsx` explicitly if it is new to the index: `git add -A packages/tally-charts`).

---

### Task 7: `Region fill="hatch"`

**Files:**
- Modify: `packages/tally-charts/src/react/marks/Region.tsx`
- Modify: `packages/tally-charts/src/react/marks/Region.test.tsx`
- Modify: `packages/tally-charts/src/theme/theme.css` (outline rule, before the forced-colors block)

**Interfaces:**
- Consumes: `paintFor` (`../../theme/patterns`), `ctx.chartId` (`useChartContext`).
- Produces: `RegionProps.fill?: 'solid' | 'hatch'` (default `'solid'`).

- [ ] **Step 1: Failing test** in `Region.test.tsx` (reuse the file's existing render helper that mounts a `<Chart>` with a time or category x; follow the nearest existing test):

```tsx
  it('paints a hatched region with the tone pattern and the hatch outline hook', () => {
    const { container } = renderWithRegion(<Region from="Mar" to="May" tone="loss" fill="hatch" />)
    const rect = container.querySelector('[data-ch-part="region"]') as SVGElement
    expect(rect.getAttribute('data-ch-fill')).toBe('hatch')
    expect(rect.style.fill).toMatch(/^url\(#ch-.*-hatch-loss\)$/)
  })

  it('stays solid by default', () => {
    const { container } = renderWithRegion(<Region from="Mar" />)
    const rect = container.querySelector('[data-ch-part="region"]') as SVGElement
    expect(rect.getAttribute('data-ch-fill')).toBeNull()
    expect(rect.style.fill).toBe('')
  })
```

(`renderWithRegion` stands for whatever helper `Region.test.tsx` already uses; if it has none, render `<Chart data={…} x={{ type: 'point', field: 'month' }} y={…}>{region}</Chart>` the way the first test in that file does.)

- [ ] **Step 2: Run** → FAIL (`fill` unknown / attribute missing).

- [ ] **Step 3: Implement** in `Region.tsx`:

```tsx
export interface RegionProps {
  // …existing props…
  /** 'hatch' paints the tone's hatch pattern, e.g. for a locked span. Default 'solid'. */
  fill?: 'solid' | 'hatch'
}

export function Region({ from, to, tone = 'accent', fill = 'solid' }: RegionProps) {
  // …unchanged until the return…
  const hatch = fill === 'hatch'
  return (
    <rect
      data-ch-part="region"
      data-ch-tone={tone}
      data-ch-fill={hatch ? 'hatch' : undefined}
      x={x0}
      y={0}
      width={Math.max(0, x1 - x0)}
      height={ctx.innerHeight}
      rx={hatch ? 2 : 8}
      style={hatch ? { ...toneVar(tone), fill: paintFor(ctx.chartId, tone, 'hatch').fill } : toneVar(tone)}
    />
  )
}
```

CSS: extend the existing hatched-mark outline selector list (`[data-ch-part="bar"][data-ch-fill="hatch"], …`) with `[data-ch-part="region"][data-ch-fill="hatch"]`, and update the theme test `'outlines hatched bars, soft-accent bars and dots, and hatched or soft swatches'` to expect it.

- [ ] **Step 4: Run** `pnpm --filter tally-charts test && pnpm --filter tally-charts build && pnpm --filter tally-charts size`.
Expected: PASS; `LineChart` entry ≤ 13 KB. If `LineChart` exceeds 13 KB, stop and report the measured size (do not raise the budget).

- [ ] **Step 5: Commit** `git commit -am "feat: Region fill hatch"`.

---

### Task 8: Stories and e2e

**Files:**
- Create: `apps/storybook/stories/RunwayChart.stories.tsx` (`Charts/RunwayChart`)
- Create: `apps/storybook/stories/UsageRunway.stories.tsx` (`Reference/Usage runway`)
- Create: `apps/storybook/stories/runway-data.tsx` (shared data and icons)
- Modify: `apps/storybook/e2e/stories.ts`, `apps/storybook/e2e/stories.spec.ts`, `apps/storybook/e2e/forced-colors.spec.ts`
- Create: baselines under `apps/storybook/e2e/__screenshots__/{darwin,linux}/`

**Interfaces:**
- Consumes: `RunwayChart`, `runwayForecast`, `LineChart`, `Region`, `BarChart`, `Stat`, `Legend` from `tally-charts`.

- [ ] **Step 1: Shared data** `stories/runway-data.tsx`. `now = '2026-10-15T02:00:00Z'`, domain `['2026-10-15T00:00:00Z', '2026-10-22T00:00:00Z']`, cell `'6h'`. Rows, all fictional, each `{ id, label, sublabel, icon, ...runwayForecast(input) }`:

| id | label | sublabel | used | windowStart | resetAt |
|---|---|---|---|---|---|
| pro | Pro plan | Side project | 0.85 | 2026-10-09T11:22Z | 2026-10-16T11:22Z |
| team | Team seat | Work | 0.30 | 2026-10-14T09:21Z | 2026-10-21T09:21Z |
| team-max | Team seat Max | Work | 0.45 | 2026-10-12T00:29Z | 2026-10-19T00:29Z |
| editor-2 | Editor (personal 2) | Personal | 0.40 | 2026-10-10T00:00Z | 2026-11-09T00:00Z |
| research | Research plan | Lab | 0.48 | 2026-10-09T20:13Z | 2026-10-16T20:13Z |
| assistant | Assistant seat | Work | 0.25 | 2026-10-02T00:00Z | 2026-11-01T00:00Z |
| code | Code plan | Work | 0.12 | 2026-10-13T09:55Z | 2026-10-20T09:55Z |
| studio | Studio Max | Personal | 0.22 | 2026-10-11T07:13Z | 2026-10-18T07:13Z |
| editor | Editor (personal) | Personal | 0.20 | 2026-10-11T12:46Z | 2026-10-18T12:46Z |
| code-team | Code team | Work | 0.24 | 2026-10-09T06:28Z | 2026-10-16T06:28Z |
| starter | Starter | Trial | — | — | — (`disconnected: true`, `status: 'Reconnect to forecast'`) |

Also export `windows` (the inputs per id, for the detail panel). Icons: five small generic inline SVGs (`aria-hidden`, 20×20, `currentColor`): asterisk, ring, cube, chevron, smiley — assigned round-robin. Export `runOuts = rows.filter(r => r.runsOutAt && r.resetAt && r.runsOutAt < r.resetAt)`.

- [ ] **Step 2: `Charts/RunwayChart` stories** (`RunwayChart.stories.tsx`), each in light and dark (follow `Sequential.stories.tsx` for how a story pins its theme): `States` (rows `pro`, `team`, `editor-2`, `research`, `starter`, `onSelect` with local state) and `Stacked` (same rows in a 320 px wide wrapper, `layout="auto"`). Story ids: `charts-runwaychart--states-light`, `--states-dark`, `--stacked-light`, `--stacked-dark`.

- [ ] **Step 3: `Reference/Usage runway`** (`UsageRunway.stories.tsx`), stories `Light` and `Dark`, 1280×760. A `card card-wide` article (classes from the existing reference stories) with:
  - Header: `<h2 className="card-title">{runOuts.length} accounts run out before reset</h2>` and meta `"{first.label} first, {Fri 03:24}, then locked {N} h"` computed from the earliest `runsOutAt` (format with `useFormat().date` like the component) — never hard-coded. A Forecast/Table segmented toggle (two `button`s with `aria-pressed`) switching between the forecast view and a visible `<table>` built from the same rows (Name, Runs out, Resets, Projected at reset).
  - Left: `<RunwayChart rows={rows} domain=… now=… cell="6h" title="Usage runway" description={headline} selectedId={selected} onSelect={setSelected} dataTable />`, `selected` initially `'pro'`.
  - Right panel for the selected row: label + sublabel; `"Used {used%} in {elapsed%} of the window"`; a burn-up `LineChart` over `[windowStart, resetAt]` with a time x (`x={{ type: 'time', field: 'at', domain: [windowStart, resetAt] }}`), `domain={[0, 1]}`, `format="percent"`, series `used` (actual, history from `windowStart` to `now`), `pace` (`style: 'forecast'`, the projection points) and `even` (`style: 'scenario'`, `tone: 'neutral'`, a straight line 0 → 1 from `windowStart` to `resetAt`), `target={{ value: 1, label: '100%' }}`, and as a child `<Region from={runsOutAt} to={resetAt} tone="loss" fill="hatch" />` when the row runs out. History: a deterministic staircase, `used * (i / n + 0.03 * Math.sin(i * 1.7))` clamped monotonic to `[0, used]`, one point per 6 h. If `LineChart` cannot take children, use `<Chart>` with `Line`, `Area`, `Axis`, `Region` marks the way `ProfitBridge.stories.tsx` composes marks — and note it in the report.
  - Three `Stat`s: Pace `"{paceRatio.toFixed(1)}x even"`, Runs out (date or "—"), Locked before reset (`"{Math.round(lockedMs / 36e5)} h"` or "—").
  - "Recent pace · pp used per day" `BarChart` over the last 7 days (deterministic values per row derived from `paceRatio`), `target={{ value: allowed, label: 'Allowed per day' }}` where `allowed = 100 / window days`, `tone={(d) => (d.value > allowed ? 'warn' : 'neutral')}`, plus a `Legend` (Within allowance / Over / Allowed per day).
  - A legend line under the runway is the component's own; add the note "Assumes the pace holds. Select a row for detail." as card meta.

- [ ] **Step 4: Register in e2e.** `e2e/stories.ts`: add to `STORIES` the six ids `reference-usage-runway--light`, `reference-usage-runway--dark`, `charts-runwaychart--states-light`, `charts-runwaychart--states-dark`, `charts-runwaychart--stacked-light`, `charts-runwaychart--stacked-dark`; add both reference ids to `WIDE_STORIES` with `{ width: 1280, height: 760 }`. Reflow, axe and contrast pick them up from `STORIES`.

`e2e/stories.spec.ts` — add:

```ts
test('arrow keys and Enter select a runway row and update the detail panel', async ({ page }) => {
  await open(page, 'reference-usage-runway--light')
  const box = page.getByRole('listbox', { name: 'Usage runway' })
  await box.focus()
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
  await expect(box.getByRole('option', { selected: true })).toHaveAccessibleName(/^Team seat Max /)
  await expect(page.getByTestId('runway-detail-title')).toHaveText('Team seat Max')
})
```

(Give the detail panel's title `data-testid="runway-detail-title"`. Focus starts on the selected `pro` row, so two steps down is `team-max`.)

`e2e/forced-colors.spec.ts` — add a runway test in the `forced colors` describe loop:

```ts
    test(`runway cells keep a visible edge (${colorScheme})`, async ({ page }) => {
      await openForced(page, 'charts-runwaychart--states-light', colorScheme)
      const strokes = await page
        .locator('#storybook-root [data-ch-part="runway-cell"]')
        .evaluateAll((els) => els.map((el) => getComputedStyle(el).stroke))
      expect(strokes.length).toBeGreaterThan(0)
      for (const stroke of strokes) expect(stroke).not.toBe('none')
    })
```

- [ ] **Step 5: Baselines.** Generate darwin baselines with `pnpm test:e2e -- --update-snapshots --grep "runway|usage-runway"` and linux ones the way 0.6b did (the repo's docker command for linux snapshots — see `apps/storybook/package.json` scripts or the 0.6b T16 commit `9e96ca1` message). Look at every new PNG: cells, hatch, dot, reset tick and label, Now line, stacked layout, dark theme. Existing baselines must not change; if one does, stop and report.

- [ ] **Step 6: Full e2e** — `pnpm test:e2e` → all pass (screens, axe, contrast incl. the "reset" label and statuses, reflow at 320 px, forced colors, keyboard). If the contrast gate flags the empty-cell outline or the reset label, fix the CSS (Task 4 Step 5 note), regenerate the affected baselines, and say so in the report.

- [ ] **Step 7: Commit**

```bash
git add apps/storybook
git commit -m "feat(storybook): RunwayChart stories and usage runway reference"
```

---

### Task 9: Docs, changeset, API report

**Files:**
- Modify: `packages/tally-charts/README.md`
- Modify: `docs/a11y.md`
- Create: `.changeset/runway-0-7.md`
- Modify: `packages/tally-charts/api/tally-charts.api.md` (and the core report if it is a separate file) via `api:update`

- [ ] **Step 1: README.** Add a `### RunwayChart` section next to the other chart sections: one paragraph on what it shows; a minimal example using `runwayForecast`; a props table (rows, domain, now, cell, breaks, tone, layout, initialWidth, labelWidth, selectedId/onSelect, activeId/onActiveChange, status, legend, title, description, dataTable, empty, timeZone); the cell rules from spec §3.1 as a short table; the default status formats; the note that built-in strings are English. Add `runwayForecast` to the core helpers list with its result fields. Add `Region`'s `fill` to the Region props. List the new `data-ch-part` values and the `layout`, `state`, `focus` state attributes wherever the README lists parts and states.

- [ ] **Step 2: `docs/a11y.md`.** A "RunwayChart" section: list without `onSelect`, listbox with it; one tab stop with `aria-activedescendant`; keys (Up/Down, Home/End, PageUp/PageDown by 5, Enter/Space, Escape, modifiers pass through); each option is named by its label and status; strips are hidden from assistive tech and the per-entity detail is in the data table and the status text; forced-colors treatment (levels as text-color steps, hatch kept, dot and focus in Highlight); the reset label is omitted when it would not fit.

- [ ] **Step 3: Changeset** `.changeset/runway-0-7.md`:

```md
---
"tally-charts": minor
---

RunwayChart: one strip per account across a time axis, with projected use, the moment it runs out, the locked span and the reset. New `runwayForecast` helper in `tally-charts/core` computes those facts from usage, window and pace. `Region` gains `fill="hatch"`.
```

- [ ] **Step 4: API report.** `pnpm --filter tally-charts build && pnpm --filter tally-charts api:update`, then read the diff of `api/*.api.md`: only additions (`RunwayChart`, `RunwayChartProps`, `RunwayRow`, `RunwayFacts`, `runwayForecast`, `RunwayForecast`, `RunwayForecastInput`, `RunwayPoint`, `RegionProps.fill`). Anything else changed → stop and report.

- [ ] **Step 5: Final checks** — `pnpm --filter tally-charts test && pnpm --filter tally-charts typecheck && pnpm lint && pnpm --filter tally-charts build && pnpm --filter tally-charts size && pnpm --filter tally-charts check:dev-strip && pnpm --filter tally-charts api:check` → all pass.

- [ ] **Step 6: Commit** `git add -A && git commit -m "docs: RunwayChart, runwayForecast and Region fill"`.
