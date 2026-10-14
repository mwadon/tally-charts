# tally-charts 0.6a API and Time Scale Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the first half of tally-charts 0.6: a time scale for `LineChart` and the line-family marks, every must-before-freeze API change (API-1 … API-11, API-15, API-16), a committed API report that CI checks, and the 0.4/0.5 backlog.

**Architecture:**
- `core` gains `time.ts`: `toTime`, a d3-style tick ladder built on `d3-time` intervals, and a `TimeScale` over the existing `linearScale`. It also gains `date.ts`, Intl date formatting with a multi-scale `'auto'` mode.
- `createScale` resolves `type: 'time'`. The marks that draw along x (`Line`, `Band`, `Area`, `Region`, `Target`, `Axis`) learn the `'time'` arm. `Bars` and `ColumnHighlight` already warn on any non-band scale.
- The public surface is then cut down to what 1.0 freezes: own scale interfaces (no d3 types), a public `ChartContextValue`, `ChartPoint<D>`, readonly inputs, a small `tally-charts/core`, and a declared CSS surface. `@microsoft/api-extractor` records it in `packages/tally-charts/api/*.api.md`.

**Tech Stack:** React 18/19, TypeScript 6.0.3, tsdown, Vitest 5 + Testing Library, Biome 2.5.15, Storybook 10 + Playwright 1.64, size-limit 14. New: `d3-time` (runtime) and `@microsoft/api-extractor` (dev). `d3-scale` is removed (see design decision 1).

**Spec:** `docs/superpowers/specs/2026-10-14-tally-charts-0.6-design.md` (§1 success criteria, §2, §3, §4 and the 0.6a parts of §8; not §5–§7, which are plan 0.6b). Evidence and current/proposed detail per ID: `docs/superpowers/specs/2026-10-14-tally-charts-0.6-api-audit.md`. Parent spec: `docs/superpowers/specs/2026-10-14-tally-charts-design.md`.

This is plan 0.6a. `main` is at `fb83f7a`. **Execute on a new branch `feat/0.6a-api-time` from `main`.** Push only if the user asks. Plan 0.6b starts from `main` after this branch is merged.

## Global Constraints

**Toolchain and packaging**
- Node `>=22`; `packageManager` is `pnpm@12.4.2`; TypeScript `6.0.3`; Biome `2.5.15`.
- Runtime dependencies after this plan: `d3-array@^3.2.4` and `d3-time@^3.1.0` only. Dev additions: `@types/d3-time@3.0.4` and `@microsoft/api-extractor@7.59.3`, both pinned exact. `d3-scale` and `@types/d3-scale` are removed (Task 1).
- ESM only. `sideEffects: ["*.css"]`. Subpath exports `tally-charts`, `tally-charts/core`, `tally-charts/theme.css`. The main entry keeps its `'use client'` banner; `core` stays React-free.
- Bundle budgets, min+gzip (spec §1): "`core` ≤ 8 KB, each chart ≤ 15 KB, LineChart (with time) ≤ 12 KB, small UI pieces ≤ 4 KB." Never raise a budget. If one is over, stop and report BLOCKED with the measured numbers. size-limit measures without a `NODE_ENV` define, so development warning text counts.
- Spec §1: "No `d3-*` type appears in the published `.d.ts`."

**Time scale (spec §2)**
- `TimeInput = Date | number | string`. `toTime`: "`Date` → `getTime()`, finite number → itself, string → `Date.parse` (so a date-only ISO string is UTC midnight, matching the default zone). Anything else, or `NaN`, is `undefined`."
- `zone` defaults to `'utc'`. Formatting uses `Intl.DateTimeFormat` with the `ChartsProvider` locale and `timeZone: 'UTC'` for `'utc'`, unset for `'local'`.
- "Points with an undefined x are skipped with one dev warning per chart … No throws." "A single distinct value is padded by one day on each side. With no valid values the domain is [now − 1 day, now], plus the dev warning." "Time domain spans under 1 ms: treated as a single value (padded ±1 day)."
- "A point's id is the ISO string of its x (`new Date(ms).toISOString()`)." "Same x means equal epoch ms."
- "Marks that need a band (`Bars`, `ColumnHighlight`) emit one dev warning on a time scale and render nothing."

**Naming and API surface**
- CSS tokens use the `--ch-` prefix; private variables use `--_ch-`. Part hooks are `data-ch-part` and the `data-ch-*` state attributes. `ch-*` class names are private.
- Shared prop names (main spec §6): `data`, `x`, `y`, `id`, `label`, `series`, `tone`, `fill`, `format`, `height`, `initialWidth`, `title`, `description`, `activeId`, `onActiveChange`, `onSelect`, `animate`, `dimInactive`, `className`, `style`.
- Every exported component has an exported `XxxProps` type. No `any` in the public API. Every type a public type references is exported from the same entry (API Extractor's `ae-forgotten-export` is an error).

**Errors and warnings**
- Bad data never throws. Development warnings go through `createWarner()` / `ctx.warn`, start with `[tally-charts] `, fire once per key per chart, and every call sits inside `if (DEV) { … }`. Each new warning gets a phrase in `scripts/check-dev-strip.mjs`.

**Tests**
- `vitest.config.ts` runs every test in `TZ=Europe/Warsaw` (Task 3), so `'local'` results are the same on every machine and in CI.

**Code style and commits**
- Biome: 2 spaces, single quotes, no semicolons, line width 100. Run `pnpm format` before every commit. `pnpm lint` must exit 0; 4 `noImportantStyles` warnings and 1 biome info are expected.
- Conventional commit messages. End every commit message with a blank line and a `Co-Authored-By:` trailer naming **your own** model (the implementer's model, not the planner's).
- Commands run from the repo root. Unit tests: `pnpm test`, or `pnpm --filter tally-charts exec vitest run <path>`. The shell is zsh: quote globs.

**Not in 0.6a:** keyboard model, contrast, forced colors, heatmap semantics, palette, reflow and docs/a11y.md (0.6b). Visual baselines are regenerated once at the end of 0.6b (spec §6); 0.6a only adds baselines for its new stories. The `--ch-heatmap-min-cell` token arrives with the 0.6b reflow work.

## Design decisions this plan makes

1. **d3-scale is replaced by two small core functions, `bandScale` and `pointScale` (Task 1).** Measured on this repo while planning: once the time scale lands, LineChart is already 12.22 kB with d3-scale, before any of its own time code; d3-scale's band machinery (ordinal scale, InternMap) costs about 0.75 kB, and the finished 0.6a LineChart is 11.94 kB without it, against the 12 KB budget. They use d3's layout formulas (align 0.5, no rounding), so every existing test, the SSR snapshot and every screenshot stay identical. Spec §2's dependency line is a ceiling ("d3-scale (band/point only), d3-array, d3-time, and d3-shape only"), so dropping one is within it. API-1 already asks for our own interfaces.
2. **The tick ladder is ours, over d3-time's intervals (Task 3).** It is the exact ladder of spec §2 and picks the same rungs as d3's `utcTickInterval` / `timeTickInterval`, verified case by case. Importing the intervals directly instead of d3-time's `ticks.js` saves about 0.35 kB gzipped.
3. **The time zone of the tests is pinned in `vitest.config.ts`** (`test.env.TZ = 'Europe/Warsaw'`). Verified: `TZ=America/New_York pnpm … vitest` still runs in Warsaw, in node and jsdom environments, and the existing 667 tests pass in that zone.
4. **`AxisFormat`'s function arm is declared as a method type (`AxisFormatter`), so it is bivariant.** A plain union with `FormatSpec`'s `(value: number) => string` leaves an unannotated `(v) => …` with an implicit `any` (verified with tsc). The method form gives arrows `AxisValue`, and number-only formatters stay assignable, which is what API-6 means by "Axis adapts number-only formatters internally".
5. **`LineChart`'s `x` takes either an accessor (categories, as today) or a time spec with a field:** `x={{ type: 'time', field: 'date' }}`. A time spec without a field can't say which value is the date.
6. **On a time axis, LineChart sorts its rows by date** (stably) and registers one point per date with the ISO string as id. There is no series prefix: one point per x carries every series, as on the point scale.
7. **`nice` defaults to true for an inferred time domain and false for an explicit one**, like the linear scale, and `nice: true` with an explicit domain still rounds it.
8. **`'auto'` dates.** The grain comes from the step: under a day writes the time, under 28 days the day, under a year the month, else the year. On an axis, the first tick is written in full ("Jan 2026") and later ticks show the coarsest field that changes at their boundary ("2026" on a year start, "Feb" on a month start). A single value (a tooltip header, an announcement or a table cell) is written in full at the grain of the data's smallest gap. Seconds appear under a minute. `'quarter'` is "Q1 2026". `'day'` is "Jan 5, 2026", `'month'` "Jan 2026" and `'year'` "2026".
9. **`FormatPresetSpec` (API-15)** is `{ preset; digits?; signed? }`. `digits` must be a whole number from 0 to 20; anything else falls back to the preset's digits instead of throwing. The caller's `signed` (Delta, step changes) wins over the spec's.
10. **The whole-number axis default applies to `'percent'` and `'pts'`**, the presets with fixed decimals, and only when the spec sets no `digits`. The others already drop trailing zeros.
11. **`ChartContextValue` is narrowed at the type level.** `useChart()` returns the same object, typed as the public interface. The library's marks read `InternalChartContext` through `useChartContext(component)`.
12. **Classes stay in the markup but theme.css no longer selects them.** It selects `data-ch-part` only, except six private plumbing classes (`ch-fillable`, `ch-overlay`, `ch-sr-only`, `ch-svg`, `ch-tone-text`, `ch-tooltip`). Specificity is unchanged (class → attribute), so the screenshots don't move. Verified: the full e2e suite passes on the darwin baselines after Task 12.
13. **Baselines.** The whole-tick default turns JobsByMargin's axis from "0.0%" into "0%". That diff is inside the suite's `maxDiffPixelRatio` (verified), and the spec regenerates every baseline at the end of 0.6b, so 0.6a leaves the old PNGs. Only the six new time-axis stories get baselines (Task 15).
14. **`check-dev-strip.mjs` reads `DEV` from `src/core/warn.ts`** once `isDev` leaves `core` (Task 13). tsdown keeps that module verbatim in its own chunk, so the check means the same thing.

## Review Focus

These failure modes follow from the spec but no feature test is obliged to cover them. Each has a pinned test in the task that owns the code.

1. **Dates arrive in any order.** A reasonable person expects the line drawn left to right, with ←/→ stepping in date order. Test: Task 6, "sorts rows by date, skips invalid dates and repeats with one warning each".
2. **One series mixes `Date`, epoch ms and ISO strings, with a few invalid values** (spec §8). Every valid one is placed, the invalid ones are skipped with one warning, and there is no `NaN`. Tests: Task 5, "draws lines, bands and areas through the dates" and "skips points whose x is not a date, with one warning".
3. **A single date, or a span under 1 ms.** The domain is padded by a day, the dot sits in the middle, the pointer still finds it, and there is no `NaN`. Tests: Task 3, "pads a single value, or a span under 1 ms, by a day on each side"; Task 6, "centres a single date without NaN and still snaps the pointer to it".
4. **A DST change in `zone: 'local'`.** Ticks stay on local midnights and hours (one 23-hour day; a skipped 02:00), and labels name local days. Tests: Task 3, "ticks local midnights, one 23-hour day apart" and "ticks local hours across the skipped hour"; Task 4, "labels local midnights in the local zone".
5. **Long first and last labels on a horizontal axis** ("Mar 2, 12:00 AM", or a point scale with padding 0) don't run past the plot. They anchor inward. Tests: Task 2, "anchors the labels of points on the plot edges inward at padding 0"; Task 5, "labels the axis with multi-scale dates at their positions".

---

## File Structure

```
packages/tally-charts/
  package.json                                  deps; api:check / api:update            (Tasks 1, 3, 14)
  vitest.config.ts                              TZ=Europe/Warsaw                          (Task 3)
  api-extractor.json, api-extractor.core.json   API report configs                        (Task 14)
  api/tally-charts.api.md, api/core.api.md      committed API reports                     (Task 14)
  scripts/check-dev-strip.mjs                   new phrases; DEV from source              (Tasks 5, 11, 13)
  .size-limit.json                              LineChart 12 KB                           (Task 6)
  README.md                                     ComparisonBars line; styling; 0.6 docs    (Tasks 10, 12, 16)
  src/core/band.ts (+ test)                     bandScale, pointScale                     (Task 1)
  src/core/scale.ts (+ test)                    own interfaces, FieldScale, time arm      (Tasks 1, 5)
  src/core/ticks.ts (+ test)                    categoryTicks                             (Tasks 1, 2)
  src/core/bars.ts                              BandScale type                            (Task 1)
  src/core/time.ts (+ test)                     toTime, ladder, TimeScale                 (Task 3)
  src/core/date.ts (+ test)                     DateFormatSpec, 'auto', 'quarter'         (Task 4)
  src/core/format.ts (+ test)                   FormatPresetSpec                          (Task 4)
  src/core/thresholds.ts (+ test)               readonly bins; heatmapLevel               (Tasks 8, 11)
  src/core/warn.ts (+ test)                     drop isDev                                (Task 13)
  src/core/index.ts, src/index.ts, src/index.test.ts   exports                          (Tasks 1–13)
  src/react/context.ts, useRegisterPoints.ts, interaction.ts, Chart.tsx (+ tests)        (Tasks 1, 7, 8, 11)
  src/react/ChartsProvider.tsx (+ test)         useFormat().date, useLocale               (Tasks 4, 5)
  src/react/marks/series.ts                     shared Line/Band guard                    (Tasks 2, 5)
  src/react/marks/Axis, Line, Band, Area, Region, Target (+ tests), time.test.tsx         (Tasks 2, 4, 5)
  src/react/marks/Bars.tsx (+ test)             segments; data-ch-direction               (Tasks 9, 12)
  src/react/charts/*.tsx (+ tests), shared.ts, tooltip.test.tsx                           (Tasks 4, 6, 8–12)
  src/react/ui/*.tsx (+ tests)                  readonly; data-ch-part; --_ch-*           (Tasks 8, 10, 12)
  src/theme/theme.css (+ theme.test.ts), surface.test.ts                                  (Task 12)
  src/types.test.ts, src/api-report.test.ts                                               (Tasks 8, 14)
apps/storybook/stories/MarginOutlook.stories.tsx   yAxisFormat                            (Task 6)
apps/storybook/stories/TimeAxis.stories.tsx        new                                    (Task 15)
apps/storybook/e2e/stories.spec.ts, e2e/__screenshots__/{darwin,linux}/                   (Task 15)
.github/workflows/ci.yml, .gitignore                                                     (Task 14)
.changeset/foundation-0-6.md                                                             (Task 16)
```

---

### Task 1: Own scale interfaces and implementations (API-1)

**Files:**
- Create: `packages/tally-charts/src/core/band.ts`, `packages/tally-charts/src/core/band.test.ts`
- Modify: `packages/tally-charts/src/core/scale.ts`, `packages/tally-charts/src/core/scale.test.ts`
- Modify: `packages/tally-charts/src/core/ticks.ts`, `packages/tally-charts/src/core/ticks.test.ts`
- Modify: `packages/tally-charts/src/core/bars.ts`, `packages/tally-charts/src/react/context.ts`, `packages/tally-charts/src/core/index.ts`
- Modify: `packages/tally-charts/package.json` (through pnpm)

**Interfaces:**
- Consumes: `LinearScale` (`core/linear.ts`), `FieldGetter` (`core/accessor.ts`).
- Produces:
  - `interface BandScale { (value: string): number | undefined; domain(): string[]; range(): [number, number]; bandwidth(): number; step(): number }` in `core/scale.ts`
  - `interface PointScale`, with the same members (`bandwidth()` is always 0)
  - `type ResolvedScale = { kind: 'linear'; scale: LinearScale } | { kind: 'band'; scale: BandScale } | { kind: 'point'; scale: PointScale }`, with no `field`
  - `type FieldScale = ResolvedScale & { field?: FieldGetter }`, internal. `createScale(...)` now returns `FieldScale`, and the context's `x` / `y` are `FieldScale`.
  - `bandScale(categories: readonly string[], range: readonly [number, number], paddingInner: number, paddingOuter: number): BandScale` in `core/band.ts`
  - `pointScale(categories: readonly string[], range: readonly [number, number], padding: number): PointScale` in `core/band.ts`

- [ ] **Step 1: Write the failing tests**

Create `packages/tally-charts/src/core/band.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { bandScale, pointScale } from './band'

describe('bandScale', () => {
  it('splits the range into equal bands', () => {
    const s = bandScale(['a', 'b', 'c', 'd'], [0, 400], 0, 0)
    expect(['a', 'b', 'c', 'd'].map((c) => s(c))).toEqual([0, 100, 200, 300])
    expect(s.bandwidth()).toBe(100)
    expect(s.step()).toBe(100)
    expect(s.domain()).toEqual(['a', 'b', 'c', 'd'])
    expect(s.range()).toEqual([0, 400])
  })

  it('pads between and around the bands and centres them, like d3', () => {
    // step = 200 / (2 − 0.5 + 2 × 0.25) = 100; the bands start 25px in and are 50px wide.
    const s = bandScale(['a', 'b'], [0, 200], 0.5, 0.25)
    expect([s('a'), s('b')]).toEqual([25, 125])
    expect(s.bandwidth()).toBe(50)
    expect(s.step()).toBe(100)
  })

  it('counts a repeated category once and knows nothing else', () => {
    const s = bandScale(['a', 'b', 'a'], [0, 200], 0, 0)
    expect(s.domain()).toEqual(['a', 'b'])
    expect(s('b')).toBe(100)
    expect(s('z')).toBeUndefined()
  })

  it('lays bands out right to left on a reversed range', () => {
    const s = bandScale(['a', 'b', 'c', 'd'], [400, 0], 0, 0)
    expect(['a', 'b', 'c', 'd'].map((c) => s(c))).toEqual([300, 200, 100, 0])
  })

  it('clamps the inner padding at 1 and survives an empty domain', () => {
    expect(bandScale(['a', 'b'], [0, 100], 3, 0).bandwidth()).toBe(0)
    const empty = bandScale([], [0, 100], 0.2, 0)
    expect(empty.domain()).toEqual([])
    expect(Number.isFinite(empty.step())).toBe(true)
  })
})

describe('pointScale', () => {
  it('spaces points evenly with the padding at each end', () => {
    const s = pointScale(['a', 'b', 'c'], [0, 300], 0.5)
    expect([s('a'), s('b'), s('c')]).toEqual([50, 150, 250])
    expect(s.bandwidth()).toBe(0)
    expect(s.step()).toBe(100)
  })

  it('puts the end points on the range ends at padding 0 and centres a single point', () => {
    const edge = pointScale(['a', 'b', 'c', 'd'], [0, 300], 0)
    expect([edge('a'), edge('d')]).toEqual([0, 300])
    expect(pointScale(['a'], [0, 300], 0.5)('a')).toBe(150)
  })
})
```

In `packages/tally-charts/src/core/scale.test.ts`, replace the first two lines:

```ts
import { describe, expect, it, vi } from 'vitest'
import { categoryCenter, categoryStep, createScale, inferLinearDomain } from './scale'
```

with:

```ts
import { describe, expect, expectTypeOf, it, vi } from 'vitest'
import type { LinearScale } from './linear'
import {
  type BandScale,
  categoryCenter,
  categoryStep,
  createScale,
  inferLinearDomain,
  type PointScale,
} from './scale'
```

and append:

```ts
describe('resolved scale types', () => {
  it("narrows to the library's own scale interfaces", () => {
    const s = createScale({ type: 'band', domain: ['a', 'b'] }, [], 'x', 200, noop)
    if (s.kind === 'band') expectTypeOf(s.scale).toEqualTypeOf<BandScale>()
    if (s.kind === 'point') expectTypeOf(s.scale).toEqualTypeOf<PointScale>()
    if (s.kind === 'linear') expectTypeOf(s.scale).toEqualTypeOf<LinearScale>()
    expect(s.kind).toBe('band')
  })
})
```

In `packages/tally-charts/src/core/ticks.test.ts`, the tests stop building d3 scales. Replace:

```ts
import { scaleBand, scalePoint } from 'd3-scale'
import { describe, expect, it } from 'vitest'
import { linearScale } from './linear'
```

with:

```ts
import { describe, expect, it } from 'vitest'
import { bandScale, pointScale } from './band'
import { linearScale } from './linear'
```

and make three more replacements in the same file:
- `const band = scaleBand<string>().domain(['a', 'b', 'c', 'd']).range([0, 400]).paddingInner(0)` → `const band = bandScale(['a', 'b', 'c', 'd'], [0, 400], 0, 0)`
- `const s = scalePoint<string>().domain(['Apr', 'May', 'Jun', 'Jul']).range([0, 400]).padding(0.5)` → `const s = pointScale(['Apr', 'May', 'Jun', 'Jul'], [0, 400], 0.5)`
- `expect(pointTicks(scalePoint<string>(), 'all', String)).toEqual([])` → `expect(pointTicks(pointScale([], [0, 1], 0), 'all', String)).toEqual([])`

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter tally-charts exec vitest run src/core/band.test.ts src/core/scale.test.ts src/core/ticks.test.ts`
Expected: FAIL. `./band` doesn't exist, and `BandScale` / `PointScale` aren't exported from `./scale`.

- [ ] **Step 3: Write `core/band.ts`**

Create `packages/tally-charts/src/core/band.ts`:

```ts
import type { BandScale, PointScale } from './scale'

/**
 * A band scale with d3's layout rules (align 0.5, no rounding), without d3-scale's ordinal
 * machinery: `scale(category)` is the band's start. Repeated categories count once; unknown
 * ones give undefined. A reversed range lays the bands out right to left.
 */
export function bandScale(
  categories: readonly string[],
  range: readonly [number, number],
  paddingInner: number,
  paddingOuter: number,
): BandScale {
  const domain = [...new Set(categories)]
  const index = new Map(domain.map((c, i) => [c, i]))
  const [r0, r1] = range
  const reverse = r1 < r0
  const stop = reverse ? r0 : r1
  let start = reverse ? r1 : r0
  const inner = Math.min(1, paddingInner)
  const n = domain.length
  const step = (stop - start) / Math.max(1, n - inner + paddingOuter * 2)
  start += (stop - start - step * (n - inner)) * 0.5
  const bandwidth = step * (1 - inner)
  const scale = ((value: string) => {
    const i = index.get(value)
    return i === undefined ? undefined : start + step * (reverse ? n - 1 - i : i)
  }) as BandScale
  scale.domain = () => [...domain]
  scale.range = () => [r0, r1]
  scale.bandwidth = () => bandwidth
  scale.step = () => step
  return scale
}

/** A point scale: a band scale whose bands have no width; `padding` is the outer padding. */
export function pointScale(
  categories: readonly string[],
  range: readonly [number, number],
  padding: number,
): PointScale {
  return bandScale(categories, range, 1, padding)
}
```

- [ ] **Step 4: Declare the interfaces and use them in `createScale`**

In `packages/tally-charts/src/core/scale.ts`:

Replace the first two import lines:

```ts
import { type ScaleBand, type ScalePoint, scaleBand, scalePoint } from 'd3-scale'
import { type FieldGetter, toFieldGetter } from './accessor'
```

with:

```ts
import { type FieldGetter, toFieldGetter } from './accessor'
import { bandScale, pointScale } from './band'
```

Replace `ResolvedScale` (lines 37–40):

```ts
export type ResolvedScale =
  | { kind: 'band'; scale: ScaleBand<string>; field?: FieldGetter }
  | { kind: 'point'; scale: ScalePoint<string>; field?: FieldGetter }
  | { kind: 'linear'; scale: LinearScale; field?: FieldGetter }
```

with:

```ts
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

/** Internal: a resolved scale plus the field its axis reads, which marks fall back to. */
export type FieldScale = ResolvedScale & { field?: FieldGetter }
```

In `createScale`, change the return type `): ResolvedScale {` to `): FieldScale {`, and replace:

```ts
    if (spec.type === 'point') {
      const scale = scalePoint<string>()
        .domain(domain)
        .range([0, length])
        .padding(spec.padding ?? 0.5)
      return { kind: 'point', scale, field }
    }
    const scale = scaleBand<string>()
      .domain(domain)
      .range([0, length])
      .paddingInner(spec.padding ?? 0.2)
      .paddingOuter(spec.paddingOuter ?? 0)
    return { kind: 'band', scale, field }
```

with:

```ts
    if (spec.type === 'point') {
      return { kind: 'point', scale: pointScale(domain, [0, length], spec.padding ?? 0.5), field }
    }
    const scale = bandScale(domain, [0, length], spec.padding ?? 0.2, spec.paddingOuter ?? 0)
    return { kind: 'band', scale, field }
```

`categoryCenter` and `categoryStep` keep taking `ResolvedScale`; a `FieldScale` is assignable to it.

- [ ] **Step 5: Use the interfaces everywhere d3 types were**

`packages/tally-charts/src/core/ticks.ts`: replace

```ts
import type { ScaleBand, ScalePoint } from 'd3-scale'
import type { LinearScale } from './linear'
```

with

```ts
import type { LinearScale } from './linear'
import type { BandScale, PointScale } from './scale'
```

and change the parameter `scale: ScaleBand<string>,` of `bandTicks` to `scale: BandScale,`, and `scale: ScalePoint<string>,` of `pointTicks` to `scale: PointScale,`.

`packages/tally-charts/src/core/bars.ts`: delete `import type { ScaleBand } from 'd3-scale'`, change `import type { ResolvedScale } from './scale'` to `import type { BandScale, ResolvedScale } from './scale'`, and change `band: ScaleBand<string>,` in `layoutBars` to `band: BandScale,`.

`packages/tally-charts/src/react/context.ts`: change `import type { ResolvedScale } from '../core/scale'` to `import type { FieldScale } from '../core/scale'`, and both `x: ResolvedScale` and `y: ResolvedScale` to `x: FieldScale` and `y: FieldScale`. API-3 (Task 7) gives the public context the plain `ResolvedScale`.

`packages/tally-charts/src/core/index.ts`: add `BandScale` and `PointScale` to the scale type export, which becomes:

```ts
export type {
  BandScale,
  BandScaleSpec,
  LinearScaleSpec,
  PointScale,
  PointScaleSpec,
  ResolvedScale,
  ScaleSpec,
} from './scale'
```

- [ ] **Step 6: Remove d3-scale**

Run: `pnpm --filter tally-charts remove d3-scale @types/d3-scale`
Then: `grep -rn "d3-scale" packages/tally-charts/src packages/tally-charts/package.json apps/storybook/stories`
Expected: matches only in comments (`core/band.ts`, `core/linear.ts`), none in imports or package.json.

- [ ] **Step 7: Run the tests and checks**

Run: `pnpm --filter tally-charts exec vitest run src/core/band.test.ts src/core/scale.test.ts src/core/ticks.test.ts`
Expected: PASS.

Run: `pnpm test && pnpm typecheck && pnpm lint`
Expected: all PASS, with 675 tests. The SSR snapshot test (`src/ssr.node.test.tsx`) passes unchanged, which shows the band layout is identical to d3's.

Run: `pnpm --filter tally-charts build && grep -rlE "from ['\"]d3-" packages/tally-charts/dist --include='*.d.ts'; pnpm --filter tally-charts size`
Expected: grep prints nothing: no d3 type is left in the published `.d.ts`. Every size check passes, and every chart is smaller than on `main` (about 0.75 kB less; BarChart was 9.22 kB).

- [ ] **Step 8: Commit**

```bash
pnpm format
git add packages/tally-charts pnpm-lock.yaml
git commit -m "feat(core)!: own band and point scales and scale interfaces, no d3 types

Co-Authored-By: <your own model trailer>"
```

(Here and in every later commit, write your own model's trailer.)

---

### Task 2: One `categoryTicks`, edge-anchored points, one Line/Band guard, Grid positions (backlog §4)

**Files:**
- Modify: `packages/tally-charts/src/core/ticks.ts`, `packages/tally-charts/src/core/ticks.test.ts`
- Create: `packages/tally-charts/src/react/marks/series.ts`
- Modify: `packages/tally-charts/src/react/marks/Line.tsx`, `packages/tally-charts/src/react/marks/Band.tsx`, `packages/tally-charts/src/react/marks/Axis.tsx`, `packages/tally-charts/src/react/marks/Axis.test.tsx`, `packages/tally-charts/src/react/marks/Grid.test.tsx`
- Modify: `packages/tally-charts/src/core/index.ts`, `packages/tally-charts/src/index.test.ts`

**Interfaces:**
- Consumes: `BandScale`, `PointScale` (Task 1); `categoryCenter`, `clampToRange`, `toNumber`.
- Produces:
  - `categoryTicks(scale: BandScale | PointScale, spec: TickSpec, format: (value: string) => string, options?: { anchorEnds?: boolean }): Tick[]`, replacing `bandTicks` and `pointTicks`. With `anchorEnds` (default true), band `'ends'` labels pin to the outer band edges, and a point on a plot edge gets `anchor: 'start'` or `'end'`.
  - `interface SeriesScales { x: (value: unknown) => number; y: (value: unknown) => number; key: (value: unknown) => string }` in `react/marks/series.ts`
  - `seriesScales(ctx, mark: 'Line' | 'Band'): SeriesScales | undefined`. It warns `'<mark>-scales'` once and returns undefined unless x is a point or band scale (time added in Task 5) and y is linear. `x` is NaN for an unknown category, `y` NaN for a missing value and clamped otherwise, and `key` is the point id an x value gets.

- [ ] **Step 1: Write the failing tests**

In `packages/tally-charts/src/core/ticks.test.ts`, change the ticks import to `import { categoryTicks, linearTicks, type Tick, thinTicks } from './ticks'`. Replace the whole `describe('bandTicks', …)` block with:

```ts
describe('categoryTicks on a band scale', () => {
  it('places ticks at band centres', () => {
    expect(categoryTicks(band, 'all', String).map((t) => t.position)).toEqual([50, 150, 250, 350])
  })

  it('anchors end ticks to the outer band edges', () => {
    const [first, last] = categoryTicks(band, 'ends', String)
    expect(first).toMatchObject({ value: 'a', position: 0, anchor: 'start' })
    expect(last).toMatchObject({ value: 'd', position: 400, anchor: 'end' })
  })

  it('centres end ticks on their bands when edge anchoring is off', () => {
    const [first, last] = categoryTicks(band, 'ends', String, { anchorEnds: false })
    expect(first).toMatchObject({ value: 'a', position: 50, anchor: 'middle' })
    expect(last).toMatchObject({ value: 'd', position: 350, anchor: 'middle' })
  })

  it('thins to a target count for a numeric spec', () => {
    expect(categoryTicks(band, 2, String).map((t) => t.value)).toEqual(['a', 'c'])
  })

  it('centres the only band of a one-band scale', () => {
    const one = bandScale(['a'], [0, 100], 0, 0)
    expect(categoryTicks(one, 'ends', String)).toEqual([
      { value: 'a', position: 50, label: 'a', anchor: 'middle' },
    ])
  })
})
```

and the whole `describe('pointTicks', …)` block with:

```ts
describe('categoryTicks on a point scale', () => {
  // 400px, padding 0.5: a 100px step, points at 50, 150, 250 and 350.
  const s = pointScale(['Apr', 'May', 'Jun', 'Jul'], [0, 400], 0.5)
  // Padding 0: the first and last points sit on the plot edges, at 0 and 300.
  const edge = pointScale(['Apr', 'May', 'Jun', 'Jul'], [0, 300], 0)

  it('labels every point, centred', () => {
    expect(categoryTicks(s, 'all', String).map((t) => [t.label, t.position, t.anchor])).toEqual([
      ['Apr', 50, 'middle'],
      ['May', 150, 'middle'],
      ['Jun', 250, 'middle'],
      ['Jul', 350, 'middle'],
    ])
  })

  it('labels the ends or every nth point', () => {
    expect(categoryTicks(s, 'ends', String).map((t) => t.label)).toEqual(['Apr', 'Jul'])
    expect(categoryTicks(s, 2, String).map((t) => t.label)).toEqual(['Apr', 'Jun'])
  })

  it('anchors the labels of points on the plot edges inward at padding 0', () => {
    expect(categoryTicks(edge, 'all', String).map((t) => [t.position, t.anchor])).toEqual([
      [0, 'start'],
      [100, 'middle'],
      [200, 'middle'],
      [300, 'end'],
    ])
    expect(categoryTicks(edge, 'ends', String).map((t) => t.anchor)).toEqual(['start', 'end'])
    // Every second point: Apr and Jun. Jun isn't on the edge, so it stays centred.
    expect(categoryTicks(edge, 2, String).map((t) => t.anchor)).toEqual(['start', 'middle'])
  })

  it('keeps edge labels centred on a side axis', () => {
    expect(
      categoryTicks(edge, 'all', String, { anchorEnds: false }).map((t) => t.anchor),
    ).toEqual(['middle', 'middle', 'middle', 'middle'])
  })

  it('formats labels and tolerates an empty domain', () => {
    expect(categoryTicks(s, 'ends', (v) => v.toUpperCase()).map((t) => t.label)).toEqual([
      'APR',
      'JUL',
    ])
    expect(categoryTicks(pointScale([], [0, 1], 0), 'all', String)).toEqual([])
  })
})
```

In `packages/tally-charts/src/react/marks/Axis.test.tsx`, insert before `it('puts band end labels on a side axis level with their rows', …)`:

```tsx
  it('anchors point labels on the plot edges inward at padding 0', () => {
    const { container } = render(
      <Chart
        {...frame}
        width={300}
        x={{ type: 'point', domain: ['Apr', 'May', 'Jun', 'Jul'], padding: 0 }}
        y={{ domain: [0, 1] }}
      >
        <Axis side="bottom" />
      </Chart>,
    )
    const all = [...container.querySelectorAll('[data-ch-part="axis-label"]')]
    expect(all.map((el) => el.getAttribute('x'))).toEqual(['0', '100', '200', '300'])
    expect(all.map((el) => el.getAttribute('text-anchor'))).toEqual([
      'start',
      'middle',
      'middle',
      'end',
    ])
  })
```

In `packages/tally-charts/src/react/marks/Grid.test.tsx`, replace the counts-only test

```tsx
  it('follows a tick count and an extent like the axis does', () => {
    expect(lines(renderGrid({ ticks: 2 }).container)).toHaveLength(3)
    expect(lines(renderGrid({ extent: [32, 38] }).container)).toHaveLength(7)
  })
```

with one that asserts positions:

```tsx
  it('follows a tick count and an extent like the axis does', () => {
    const y1 = (root: HTMLElement) => lines(root).map((l) => l.getAttribute('y1'))
    // y = 100 − 10 × (v − 30): 30, 35, 40 and then 32 … 38.
    expect(y1(renderGrid({ ticks: 2 }).container)).toEqual(['100', '50', '0'])
    expect(y1(renderGrid({ extent: [32, 38] }).container)).toEqual([
      '80',
      '70',
      '60',
      '50',
      '40',
      '30',
      '20',
    ])
  })
```

In `packages/tally-charts/src/index.test.ts`, in the `'core exports %s'` list replace `'bandTicks',` with `'categoryTicks',` and delete `'pointTicks',`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter tally-charts exec vitest run src/core/ticks.test.ts src/react/marks/Axis.test.tsx src/react/marks/Grid.test.tsx src/index.test.ts`
Expected: FAIL. `categoryTicks` doesn't exist, and the point axis labels are all `middle`. The Grid test already passes; it pins positions that were unasserted.

- [ ] **Step 3: Write `categoryTicks`**

In `packages/tally-charts/src/core/ticks.ts`, replace both `bandTicks` (with its doc comment) and `pointTicks` (with its doc comment), everything from `export function bandTicks(` up to `export function linearTicks(`, with:

```ts
/**
 * Labels for a band or point scale: every category ('all'), the first and last ('ends'), or
 * every nth. Labels sit at the band centres or on the points.
 *
 * `anchorEnds` (default true) suits an axis below or above the plot: band 'ends' labels pin to
 * the outer band edges, and points that sit on the plot edge (padding 0) anchor their labels
 * inward, so neither runs past the plot. A side axis passes false so every label stays level
 * with its row.
 */
export function categoryTicks(
  scale: BandScale | PointScale,
  spec: TickSpec,
  format: (value: string) => string,
  { anchorEnds = true }: { anchorEnds?: boolean } = {},
): Tick[] {
  const domain = scale.domain()
  const bandwidth = scale.bandwidth()
  const first = domain[0]
  const last = domain[domain.length - 1]
  const step = typeof spec === 'number' ? Math.max(1, Math.ceil(domain.length / spec)) : 1
  const picked =
    spec === 'ends'
      ? domain.filter((_, i) => i === 0 || i === domain.length - 1)
      : domain.filter((_, i) => i % step === 0)
  const [r0, r1] = scale.range()
  const lo = Math.min(r0, r1)
  const hi = Math.max(r0, r1)
  return picked.map((value): Tick => {
    const start = scale(value) ?? 0
    const tick: Tick = {
      value,
      position: start + bandwidth / 2,
      label: format(value),
      anchor: 'middle',
    }
    if (!anchorEnds || domain.length < 2) return tick
    if (bandwidth > 0) {
      if (spec !== 'ends') return tick
      return value === first
        ? { ...tick, position: start, anchor: 'start' }
        : { ...tick, position: start + bandwidth, anchor: 'end' }
    }
    if (value === first && Math.abs(start - lo) < 0.5) return { ...tick, anchor: 'start' }
    if (value === last && Math.abs(start - hi) < 0.5) return { ...tick, anchor: 'end' }
    return tick
  })
}

```

In `packages/tally-charts/src/core/index.ts`, change `export { bandTicks, estimateWidth, linearTicks, pointTicks, thinTicks } from './ticks'` to `export { categoryTicks, estimateWidth, linearTicks, thinTicks } from './ticks'`.

In `packages/tally-charts/src/react/marks/Axis.tsx`, replace the multi-line ticks import with `import { categoryTicks, linearTicks, type Tick, type TickSpec, thinTicks } from '../../core/ticks'`, and replace the `raw` expression:

```tsx
  const raw =
    resolved.kind === 'band'
      ? bandTicks(resolved.scale, spec, label, { anchorEnds: horizontal })
      : resolved.kind === 'point'
        ? pointTicks(resolved.scale, spec, label)
        : linearTicks(resolved.scale, spec, (v) => (custom ? custom(v) : numeric(v)), extent)
```

with:

```tsx
  const raw =
    resolved.kind === 'linear'
      ? linearTicks(resolved.scale, spec, (v) => (custom ? custom(v) : numeric(v)), extent)
      : categoryTicks(resolved.scale, spec, label, { anchorEnds: horizontal })
```

- [ ] **Step 4: Share one scale guard between `Line` and `Band`**

Create `packages/tally-charts/src/react/marks/series.ts`:

```ts
import { clampToRange } from '../../core/linear'
import { toNumber } from '../../core/number'
import { categoryCenter } from '../../core/scale'
import { DEV } from '../../core/warn'
import type { ChartContextValue } from '../context'

/** Pixel positions for marks that draw values along x, such as `Line` and `Band`. */
export interface SeriesScales {
  /** Plot x of a category; NaN when the scale doesn't know it. */
  x: (value: unknown) => number
  /** Plot y of a value, clamped into the plot; NaN when the value is missing. */
  y: (value: unknown) => number
  /**
   * The point id an x value gets: the category as a string, so a chart that registers one point
   * per x (as LineChart does) lights the matching dots.
   */
  key: (value: unknown) => string
}

/**
 * The shared scale guard of `Line` and `Band`: a point or band scale on x and a linear scale on
 * y. Otherwise it warns once per chart and returns undefined, and the mark draws nothing.
 */
export function seriesScales(
  ctx: ChartContextValue,
  mark: 'Line' | 'Band',
): SeriesScales | undefined {
  const { x, y } = ctx
  if (x.kind === 'linear' || y.kind !== 'linear') {
    if (DEV) {
      ctx.warn(
        `${mark.toLowerCase()}-scales`,
        `${mark} needs a point or band scale on <Chart x> and a linear scale on <Chart y>.`,
      )
    }
    return undefined
  }
  const linear = y.scale
  return {
    x: (value) => categoryCenter(x, value) ?? Number.NaN,
    y: (value) => {
      const v = toNumber(value)
      return Number.isFinite(v) ? clampToRange(linear, linear(v)) : Number.NaN
    },
    key: String,
  }
}
```

In `packages/tally-charts/src/react/marks/Line.tsx`:
- Delete the imports of `clampToRange`, `toNumber` and `categoryCenter`, and add `import { seriesScales } from './series'` after the `useChart` import.
- Replace the guard

```tsx
  const ctx = useChart('Line')
  if (ctx.x.kind === 'linear' || ctx.y.kind !== 'linear') {
    if (DEV) {
      ctx.warn(
        'line-scales',
        'Line needs a point or band scale on <Chart x> and a linear scale on <Chart y>.',
      )
    }
    return null
  }
```

with

```tsx
  const ctx = useChart('Line')
  const scales = seriesScales(ctx, 'Line')
  if (!scales) return null
```

- Replace

```tsx
  const xScale = ctx.x
  const linear = ctx.y.scale
  const rows = (data ?? ctx.data) as readonly D[]
  const points = rows.map((d, index) => {
    const category = getX(d, index)
    const value = toNumber(getY(d, index))
    return {
      index,
      key: String(category),
      x: categoryCenter(xScale, category) ?? Number.NaN,
      y: Number.isFinite(value) ? clampToRange(linear, linear(value)) : Number.NaN,
    }
  })
```

with

```tsx
  const rows = (data ?? ctx.data) as readonly D[]
  const points = rows.map((d, index) => {
    const category = getX(d, index)
    return {
      index,
      key: scales.key(category),
      x: scales.x(category),
      y: scales.y(getY(d, index)),
    }
  })
```

In `packages/tally-charts/src/react/marks/Band.tsx`:
- Delete the imports of `clampToRange`, `toNumber` and `categoryCenter`, and add `import { seriesScales } from './series'` after the `toneVar` import.
- Replace the guard (the `if (ctx.x.kind === 'linear' || ctx.y.kind !== 'linear') { … return null }` block) with `const scales = seriesScales(ctx, 'Band')` and `if (!scales) return null`.
- Replace

```tsx
  const xScale = ctx.x
  const linear = ctx.y.scale
  const px = (raw: unknown) => {
    const v = toNumber(raw)
    return Number.isFinite(v) ? clampToRange(linear, linear(v)) : Number.NaN
  }
  const rows = (data ?? ctx.data) as readonly D[]
  const d = bandPath(
    rows.map((row, i) => ({
      x: categoryCenter(xScale, getX(row, i)) ?? Number.NaN,
      low: px(getLow(row, i)),
      high: px(getHigh(row, i)),
    })),
  )
```

with

```tsx
  const rows = (data ?? ctx.data) as readonly D[]
  const d = bandPath(
    rows.map((row, i) => ({
      x: scales.x(getX(row, i)),
      low: scales.y(getLow(row, i)),
      high: scales.y(getHigh(row, i)),
    })),
  )
```

The warning keys (`line-scales`, `band-scales`) and texts are unchanged, so the existing "warns on a linear x scale" tests of Line and Band pin the shared guard.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm --filter tally-charts exec vitest run src/core/ticks.test.ts src/react/marks src/index.test.ts`
Expected: PASS.

Run: `pnpm test && pnpm typecheck && pnpm lint`
Expected: all PASS (678 tests).

- [ ] **Step 6: Commit**

```bash
pnpm format
git add packages/tally-charts
git commit -m "refactor: one categoryTicks with edge-anchored points; shared Line/Band scale guard

Co-Authored-By: <your own model trailer>"
```

---

### Task 3: `toTime`, the tick ladder and `TimeScale` (spec §2)

**Files:**
- Create: `packages/tally-charts/src/core/time.ts`, `packages/tally-charts/src/core/time.test.ts`
- Modify: `packages/tally-charts/vitest.config.ts`
- Modify: `packages/tally-charts/package.json` (through pnpm)

**Interfaces:**
- Consumes: `linearScale` (`core/linear.ts`); `tickStep` (`d3-array`); d3-time's intervals.
- Produces (all in `core/time.ts`):
  - `type TimeInput = Date | number | string`
  - `type TimeZone = 'utc' | 'local'`
  - `interface TimeScale { (value: number): number; invert(px: number): number; domain(): [number, number]; range(): [number, number]; ticks(count?: number): number[]; zone: TimeZone }`
  - `const DAY = 864e5`
  - `toTime(value: unknown): number | undefined`
  - `tickInterval(start: number, stop: number, count: number, zone: TimeZone): TimeInterval | null` (d3-time's `TimeInterval`, internal only)
  - `inferTimeDomain(values: readonly number[], now?: number): [number, number]`
  - `niceTimeDomain(domain: readonly [number, number], zone: TimeZone, count?: number): [number, number]`
  - `timeScale(domain: readonly [number, number], range: readonly [number, number], zone?: TimeZone): TimeScale`

- [ ] **Step 1: Add the dependency and pin the test time zone**

Run: `pnpm --filter tally-charts add d3-time@^3.1.0 && pnpm --filter tally-charts add -D @types/d3-time@3.0.4`
Expected: `package.json` lists `"d3-time": "^3.1.0"` under dependencies and `"@types/d3-time": "3.0.4"` under devDependencies. (d3-time 3.1.0 is already in the store as a d3-scale dependency.)

Replace `packages/tally-charts/vitest.config.ts` with:

```ts
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    // One zone with a DST change on every machine and in CI, so 'local' time tests mean the
    // same everywhere. Node applies TZ when it is set, before any Date is created.
    env: { TZ: 'Europe/Warsaw' },
  },
})
```

- [ ] **Step 2: Write the failing tests**

Create `packages/tally-charts/src/core/time.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { DAY, inferTimeDomain, niceTimeDomain, type TimeZone, timeScale, toTime } from './time'

const at = (iso: string) => Date.parse(iso)
const iso = (values: readonly number[]) => values.map((v) => new Date(v).toISOString())

/** Ticks of a scale over [a, b] with the domain niced first, as createScale does. */
function ticksOver(a: string, b: string, zone: TimeZone = 'utc', count?: number) {
  const scale = timeScale(niceTimeDomain([at(a), at(b)], zone, count), [0, 600], zone)
  return scale.ticks(count)
}

describe('toTime', () => {
  it('reads dates, epoch ms and ISO strings', () => {
    expect(toTime(new Date('2026-01-05T12:00:00Z'))).toBe(at('2026-01-05T12:00:00Z'))
    expect(toTime(1767225600000)).toBe(1767225600000)
    expect(toTime('2026-03-01T10:30:00Z')).toBe(at('2026-03-01T10:30:00Z'))
    expect(toTime(0)).toBe(0)
  })

  it('reads a date-only ISO string as UTC midnight', () => {
    expect(toTime('2026-01-01')).toBe(Date.UTC(2026, 0, 1))
  })

  it('rejects everything else', () => {
    for (const bad of [
      '',
      'soon',
      new Date(Number.NaN),
      Number.NaN,
      Number.POSITIVE_INFINITY,
      null,
      undefined,
      true,
      {},
    ]) {
      expect(toTime(bad)).toBeUndefined()
    }
  })
})

describe('inferTimeDomain', () => {
  it('spans the smallest and largest value', () => {
    expect(inferTimeDomain([at('2026-03-01'), at('2026-01-01'), Number.NaN])).toEqual([
      at('2026-01-01'),
      at('2026-03-01'),
    ])
  })

  it('pads a single value, or a span under 1 ms, by a day on each side', () => {
    const t = at('2026-01-05')
    expect(inferTimeDomain([t, t])).toEqual([t - DAY, t + DAY])
    expect(inferTimeDomain([t, t + 0.5])).toEqual([t - DAY, t + 0.5 + DAY])
  })

  it('falls back to the day before now without values', () => {
    expect(inferTimeDomain([], 1_000_000_000)).toEqual([1_000_000_000 - DAY, 1_000_000_000])
  })
})

describe('time ticks', () => {
  // Each rung is picked when the span is five of its steps (count 5), and its ticks sit that
  // far apart: one row per rung of the ladder.
  it.each([
    ['1s', 1e3],
    ['5s', 5e3],
    ['15s', 15e3],
    ['30s', 3e4],
    ['1min', 6e4],
    ['5min', 3e5],
    ['15min', 9e5],
    ['30min', 18e5],
    ['1h', 36e5],
    ['3h', 108e5],
    ['6h', 216e5],
    ['12h', 432e5],
    ['1d', DAY],
    ['2d', 2 * DAY],
  ])('uses the %s rung for five of its steps', (_, step) => {
    const start = at('2026-03-02T00:00:00Z')
    const ticks = timeScale([start, start + 5 * step], [0, 500]).ticks()
    expect(ticks).toHaveLength(6)
    expect(ticks.slice(1).map((t, i) => t - (ticks[i] as number))).toEqual(Array(5).fill(step))
  })

  it('uses weeks starting on Sunday', () => {
    const ticks = ticksOver('2026-03-01', '2026-04-05')
    expect(iso(ticks)).toEqual([
      '2026-03-01T00:00:00.000Z',
      '2026-03-08T00:00:00.000Z',
      '2026-03-15T00:00:00.000Z',
      '2026-03-22T00:00:00.000Z',
      '2026-03-29T00:00:00.000Z',
      '2026-04-05T00:00:00.000Z',
    ])
    expect(ticks.every((t) => new Date(t).getUTCDay() === 0)).toBe(true)
  })

  it('uses month starts, quarter starts and years for longer spans', () => {
    expect(iso(ticksOver('2026-01-01', '2026-06-01'))).toEqual([
      '2026-01-01T00:00:00.000Z',
      '2026-02-01T00:00:00.000Z',
      '2026-03-01T00:00:00.000Z',
      '2026-04-01T00:00:00.000Z',
      '2026-05-01T00:00:00.000Z',
      '2026-06-01T00:00:00.000Z',
    ])
    expect(iso(ticksOver('2025-01-06', '2026-12-28')).slice(0, 3)).toEqual([
      '2025-01-01T00:00:00.000Z',
      '2025-04-01T00:00:00.000Z',
      '2025-07-01T00:00:00.000Z',
    ])
    expect(iso(ticksOver('2021-01-01', '2025-12-01'))).toEqual([
      '2021-01-01T00:00:00.000Z',
      '2022-01-01T00:00:00.000Z',
      '2023-01-01T00:00:00.000Z',
      '2024-01-01T00:00:00.000Z',
      '2025-01-01T00:00:00.000Z',
      '2026-01-01T00:00:00.000Z',
    ])
  })

  it('uses year multiples for decades and milliseconds below a second', () => {
    expect(iso(ticksOver('1990-01-01', '2030-01-01'))).toEqual([
      '1990-01-01T00:00:00.000Z',
      '2000-01-01T00:00:00.000Z',
      '2010-01-01T00:00:00.000Z',
      '2020-01-01T00:00:00.000Z',
      '2030-01-01T00:00:00.000Z',
    ])
    const start = at('2026-03-02T10:00:00.000Z')
    expect(timeScale([start, start + 40], [0, 400]).ticks()).toEqual([
      start,
      start + 10,
      start + 20,
      start + 30,
      start + 40,
    ])
  })

  it('crosses a year on month boundaries', () => {
    expect(iso(ticksOver('2025-11-01', '2026-03-01'))).toEqual([
      '2025-11-01T00:00:00.000Z',
      '2025-12-01T00:00:00.000Z',
      '2026-01-01T00:00:00.000Z',
      '2026-02-01T00:00:00.000Z',
      '2026-03-01T00:00:00.000Z',
    ])
  })

  it('ticks a day span every six hours, niced to whole days', () => {
    const domain = niceTimeDomain([at('2026-03-02T00:00Z'), at('2026-03-02T23:00Z')], 'utc')
    expect(iso(domain)).toEqual(['2026-03-02T00:00:00.000Z', '2026-03-03T00:00:00.000Z'])
    const scale = timeScale(domain, [0, 600])
    expect(scale.ticks().map((t) => scale(t))).toEqual([0, 150, 300, 450, 600])
  })

  it('has one tick for a zero span and none for an invalid one', () => {
    const t = at('2026-03-02')
    expect(timeScale([t, t], [0, 100]).ticks()).toEqual([t])
    expect(timeScale([Number.NaN, t], [0, 100]).ticks()).toEqual([])
  })
})

// vitest.config.ts runs every test in Europe/Warsaw, where clocks go forward on 2026-03-29.
describe("the 'local' zone across a DST change", () => {
  it('ticks local midnights, one 23-hour day apart', () => {
    const ticks = ticksOver('2026-03-26T00:00:00+01:00', '2026-04-01T00:00:00+02:00', 'local')
    expect(ticks.map((t) => new Date(t).getHours())).toEqual([0, 0, 0, 0, 0, 0, 0])
    expect(ticks.map((t) => new Date(t).getDate())).toEqual([26, 27, 28, 29, 30, 31, 1])
    const gaps = ticks.slice(1).map((t, i) => (t - (ticks[i] as number)) / 36e5)
    expect(gaps).toEqual([24, 24, 24, 23, 24, 24])
  })

  it('ticks local hours across the skipped hour', () => {
    const ticks = ticksOver('2026-03-29T00:00:00+01:00', '2026-03-29T12:00:00+02:00', 'local')
    expect(ticks.map((t) => new Date(t).getHours())).toEqual([0, 3, 6, 9, 12])
    // 02:00 doesn't exist that night, so the first gap is two real hours.
    const gaps = ticks.slice(1).map((t, i) => (t - (ticks[i] as number)) / 36e5)
    expect(gaps).toEqual([2, 3, 3, 3])
  })

  it('keeps UTC ticks on UTC midnights on the same days', () => {
    const ticks = ticksOver('2026-03-26', '2026-04-01')
    expect(ticks.every((t) => new Date(t).getUTCHours() === 0)).toBe(true)
    expect(ticks.slice(1).map((t, i) => t - (ticks[i] as number))).toEqual(Array(6).fill(DAY))
  })
})

describe('timeScale', () => {
  it('maps epoch ms to px and back', () => {
    const scale = timeScale([at('2026-01-01'), at('2026-01-11')], [0, 1000])
    expect(scale(at('2026-01-06'))).toBe(500)
    expect(scale.invert(250)).toBe(at('2026-01-03T12:00:00Z'))
    expect(scale.domain()).toEqual([at('2026-01-01'), at('2026-01-11')])
    expect(scale.range()).toEqual([0, 1000])
    expect(scale.zone).toBe('utc')
  })

  it('inverts a zero-width range to the domain start', () => {
    const scale = timeScale([at('2026-01-01'), at('2026-01-11')], [0, 0])
    expect(scale.invert(0)).toBe(at('2026-01-01'))
  })
})
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `pnpm --filter tally-charts exec vitest run src/core/time.test.ts`
Expected: FAIL: `./time` doesn't exist.

- [ ] **Step 4: Write `core/time.ts`**

Create `packages/tally-charts/src/core/time.ts`:

```ts
import { tickStep } from 'd3-array'
import {
  type CountableTimeInterval,
  type TimeInterval,
  timeDay,
  timeHour,
  timeMinute,
  timeMonth,
  timeSecond,
  timeSunday,
  timeYear,
  unixDay,
  utcHour,
  utcMillisecond,
  utcMinute,
  utcMonth,
  utcSecond,
  utcSunday,
  utcYear,
} from 'd3-time'
import { linearScale } from './linear'

/** A point in time: a `Date`, epoch milliseconds, or an ISO 8601 string. */
export type TimeInput = Date | number | string

/** The calendar ticks and labels follow. `'utc'` renders the same on the server and the client. */
export type TimeZone = 'utc' | 'local'

/** Epoch milliseconds to pixels, with ticks on calendar boundaries. */
export interface TimeScale {
  /** Epoch ms → px. */
  (value: number): number
  /** px → epoch ms. */
  invert(px: number): number
  domain(): [number, number]
  range(): [number, number]
  /** Tick values in epoch ms, about `count` of them (default 5), on calendar boundaries. */
  ticks(count?: number): number[]
  zone: TimeZone
}

export const DAY = 864e5
const YEAR = 365 * DAY

/**
 * Epoch milliseconds from a `Date`, a finite number, or a string `Date.parse` accepts (so a
 * date-only ISO string is UTC midnight). Anything else, or an invalid date, is `undefined`.
 */
export function toTime(value: unknown): number | undefined {
  const ms =
    value instanceof Date
      ? value.getTime()
      : typeof value === 'number'
        ? value
        : typeof value === 'string'
          ? Date.parse(value)
          : Number.NaN
  return Number.isFinite(ms) ? ms : undefined
}

/** Second, minute, hour, day, week, month and year in each zone. */
const UNITS: Record<TimeZone, readonly CountableTimeInterval[]> = {
  utc: [utcSecond, utcMinute, utcHour, unixDay, utcSunday, utcMonth, utcYear],
  local: [timeSecond, timeMinute, timeHour, timeDay, timeSunday, timeMonth, timeYear],
}

type Rung = readonly [unit: number, step: number, ms: number]

/** 1s, 5s, 15s, 30s, 1min, 5min, 15min, 30min, 1h, 3h, 6h, 12h, 1d, 2d, 1w, 1mo, 3mo, 1y. */
const LADDER: readonly Rung[] = [
  [0, 1, 1e3],
  [0, 5, 5e3],
  [0, 15, 15e3],
  [0, 30, 3e4],
  [1, 1, 6e4],
  [1, 5, 3e5],
  [1, 15, 9e5],
  [1, 30, 18e5],
  [2, 1, 36e5],
  [2, 3, 108e5],
  [2, 6, 216e5],
  [2, 12, 432e5],
  [3, 1, DAY],
  [3, 2, 2 * DAY],
  [4, 1, 7 * DAY],
  [5, 1, 30 * DAY],
  [5, 3, 90 * DAY],
  [6, 1, YEAR],
]

/**
 * The calendar interval for about `count` ticks over [start, stop], picked like d3's
 * `tickInterval`: the rung closest to `span / count`, year multiples past the last rung, and
 * millisecond multiples below the first. Null when nothing fits, e.g. a zero span.
 */
export function tickInterval(
  start: number,
  stop: number,
  count: number,
  zone: TimeZone,
): TimeInterval | null {
  const target = Math.abs(stop - start) / count
  const units = UNITS[zone]
  const i = LADDER.findIndex((rung) => rung[2] > target)
  if (i === -1) {
    return (units[6] as CountableTimeInterval).every(tickStep(start / YEAR, stop / YEAR, count))
  }
  if (i === 0) return utcMillisecond.every(Math.max(tickStep(start, stop, count), 1))
  const below = LADDER[i - 1] as Rung
  const above = LADDER[i] as Rung
  const [unit, step] = target / below[2] < above[2] / target ? below : above
  return (units[unit] as CountableTimeInterval).every(step)
}

/**
 * [min, max] of the finite values. A single value, or a span under 1 ms, is padded by a day on
 * each side. Without values it is the day before `now`.
 */
export function inferTimeDomain(values: readonly number[], now = Date.now()): [number, number] {
  let min = Number.POSITIVE_INFINITY
  let max = Number.NEGATIVE_INFINITY
  for (const v of values) {
    if (!Number.isFinite(v)) continue
    if (v < min) min = v
    if (v > max) max = v
  }
  if (min > max) return [now - DAY, now]
  if (max - min < 1) return [min - DAY, max + DAY]
  return [min, max]
}

/** Rounds a domain out to the boundaries of its tick interval, as `nice` asks. */
export function niceTimeDomain(
  domain: readonly [number, number],
  zone: TimeZone,
  count = 5,
): [number, number] {
  const [d0, d1] = domain
  const interval = tickInterval(d0, d1, count, zone)
  if (!interval) return [d0, d1]
  return [+interval.floor(new Date(d0)), +interval.ceil(new Date(d1))]
}

/** A time scale over our own linear scale: d3-scale's `scaleTime` would pull in d3-time-format. */
export function timeScale(
  domain: readonly [number, number],
  range: readonly [number, number],
  zone: TimeZone = 'utc',
): TimeScale {
  const [d0, d1] = domain
  const [r0, r1] = range
  const linear = linearScale(domain, range)
  const scale = ((value: number) => linear(value)) as TimeScale
  scale.invert = (px) => (r1 === r0 ? d0 : d0 + ((px - r0) * (d1 - d0)) / (r1 - r0))
  scale.domain = () => [d0, d1]
  scale.range = () => [r0, r1]
  scale.ticks = (count = 5) => {
    const interval = tickInterval(d0, d1, count, zone)
    // d1 + 1: the last boundary counts when it equals the domain's end.
    return interval ? interval.range(new Date(d0), new Date(d1 + 1)).map(Number) : []
  }
  scale.zone = zone
  return scale
}
```

- [ ] **Step 5: Run the tests to verify they pass, in any shell zone**

Run: `pnpm --filter tally-charts exec vitest run src/core/time.test.ts`
Expected: PASS (31 tests).

Run: `TZ=America/New_York pnpm --filter tally-charts exec vitest run src/core/time.test.ts`
Expected: PASS too: `vitest.config.ts` sets the zone, whatever the shell has.

Run: `pnpm test && pnpm typecheck && pnpm lint`
Expected: all PASS (709 tests). The rest of the suite is zone-independent.

- [ ] **Step 6: Commit**

```bash
pnpm format
git add packages/tally-charts pnpm-lock.yaml
git commit -m "feat(core): toTime, a calendar tick ladder on d3-time and a time scale

Co-Authored-By: <your own model trailer>"
```

---

### Task 4: Date formats, `FormatPresetSpec`, `AxisValue` / `AxisFormat` and whole-number axes (spec §2 formatting; API-6, API-15; part of API-5)

**Files:**
- Create: `packages/tally-charts/src/core/date.ts`, `packages/tally-charts/src/core/date.test.ts`
- Modify: `packages/tally-charts/src/core/format.ts`, `packages/tally-charts/src/core/format.test.ts`
- Modify: `packages/tally-charts/src/react/ChartsProvider.tsx`, `packages/tally-charts/src/react/ChartsProvider.test.tsx`
- Modify: `packages/tally-charts/src/react/marks/Axis.tsx`, `packages/tally-charts/src/react/marks/Axis.test.tsx`
- Modify: `packages/tally-charts/src/react/charts/BarChart.tsx` (+ test), `DotHistogram.tsx` (+ test), `LineChart.tsx`, `StripPlot.tsx`, `WaterfallChart.tsx`
- Modify: `packages/tally-charts/src/core/index.ts`, `packages/tally-charts/src/index.ts`

**Interfaces:**
- Consumes: `DAY`, `TimeZone`, `timeScale`, `niceTimeDomain` (Task 3); d3-time `utcYear`, `utcMonth`, `unixDay`, `timeYear`, `timeMonth`, `timeDay`.
- Produces:
  - `core/format.ts`:
    - `interface FormatPresetSpec { preset: FormatPreset; digits?: number; signed?: boolean }`
    - `type FormatSpec = FormatPreset | FormatPresetSpec | ((value: number) => string)`
    - `createFormatter(spec, options)` accepts the object form
  - `core/date.ts`:
    - `type DateFormatSpec = 'auto' | 'day' | 'month' | 'quarter' | 'year' | Intl.DateTimeFormatOptions`
    - `interface DateFormatOptions { locale?: string; zone?: TimeZone; step?: number }`
    - `type DateFormatter = (ms: number) => string`
    - `isDateFormat(spec: unknown): spec is DateFormatSpec`
    - `createDateFormatter(spec?: DateFormatSpec, options?: DateFormatOptions): DateFormatter`
    - `autoTickLabels(ticks: readonly number[], options?: { locale?: string; zone?: TimeZone }): string[]`
  - `react/ChartsProvider.tsx`: `UseFormatResult.date(spec?: DateFormatSpec, options?: Omit<DateFormatOptions, 'locale'>): DateFormatter`
  - `react/marks/Axis.tsx`:
    - `type AxisValue = string | number | Date`
    - `type AxisFormatter = { format(value: AxisValue): string }['format']`
    - `type AxisFormat = FormatPreset | FormatPresetSpec | DateFormatSpec | AxisFormatter`
  - `BarChartProps.axisFormat?: AxisFormat` and `DotHistogramProps.axisFormat?: AxisFormat`

- [ ] **Step 1: Write the failing tests**

Create `packages/tally-charts/src/core/date.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { autoTickLabels, createDateFormatter, isDateFormat } from './date'
import { DAY, niceTimeDomain, type TimeZone, timeScale } from './time'

const at = (iso: string) => Date.parse(iso)

/** Ticks over [a, b] after nicing, with their 'auto' labels. */
function labelsOver(a: string, b: string, zone: TimeZone = 'utc') {
  const ticks = timeScale(niceTimeDomain([at(a), at(b)], zone), [0, 600], zone).ticks()
  return autoTickLabels(ticks, { zone })
}

describe("autoTickLabels ('auto' on an axis)", () => {
  it('shows the time under a day, and the day at midnight', () => {
    expect(labelsOver('2026-03-02T00:00Z', '2026-03-02T23:00Z')).toEqual([
      'Mar 2, 12:00 AM',
      '6:00 AM',
      '12:00 PM',
      '6:00 PM',
      'Mar 3',
    ])
  })

  it('shows days, with the month and year on the first tick', () => {
    expect(labelsOver('2026-03-01', '2026-04-05')).toEqual([
      'Mar 1, 2026',
      'Mar 8',
      'Mar 15',
      'Mar 22',
      'Mar 29',
      'Apr 5',
    ])
  })

  it('shows month names, and the year on a year boundary', () => {
    expect(labelsOver('2025-11-01', '2026-03-01')).toEqual([
      'Nov 2025',
      'Dec',
      '2026',
      'Feb',
      'Mar',
    ])
    expect(labelsOver('2025-01-06', '2026-12-28')).toEqual([
      'Jan 2025',
      'Apr',
      'Jul',
      'Oct',
      '2026',
      'Apr',
      'Jul',
      'Oct',
      '2027',
    ])
  })

  it('shows years for long spans', () => {
    expect(labelsOver('2021-01-01', '2025-12-01')).toEqual([
      '2021',
      '2022',
      '2023',
      '2024',
      '2025',
      '2026',
    ])
  })

  it('adds seconds under a minute', () => {
    const start = at('2026-03-02T10:00:00Z')
    expect(autoTickLabels([start, start + 15e3, start + 30e3])).toEqual([
      'Mar 2, 10:00:00 AM',
      '10:00:15 AM',
      '10:00:30 AM',
    ])
  })

  it('labels local midnights in the local zone', () => {
    // Europe/Warsaw (vitest.config.ts): local midnight on Mar 30 is 22:00 UTC the day before.
    expect(labelsOver('2026-03-27T00:00:00+01:00', '2026-04-01T00:00:00+02:00', 'local')).toEqual([
      'Mar 27, 2026',
      'Mar 28',
      'Mar 29',
      'Mar 30',
      'Mar 31',
      'Apr',
    ])
  })

  it('returns nothing for no ticks', () => {
    expect(autoTickLabels([])).toEqual([])
  })
})

describe('createDateFormatter', () => {
  const may10 = at('2026-05-10T15:30:00Z')

  it('writes the presets', () => {
    expect(createDateFormatter('day')(may10)).toBe('May 10, 2026')
    expect(createDateFormatter('month')(may10)).toBe('May 2026')
    expect(createDateFormatter('year')(may10)).toBe('2026')
    expect(createDateFormatter('quarter')(may10)).toBe('Q2 2026')
    expect(createDateFormatter('quarter')(at('2026-01-01'))).toBe('Q1 2026')
    expect(createDateFormatter('quarter')(at('2026-12-31'))).toBe('Q4 2026')
  })

  it("writes 'auto' at the grain of the data's step", () => {
    expect(createDateFormatter('auto', { step: 36e5 })(may10)).toBe('May 10, 3:30 PM')
    expect(createDateFormatter('auto', { step: DAY })(may10)).toBe('May 10, 2026')
    expect(createDateFormatter('auto', { step: 30 * DAY })(may10)).toBe('May 2026')
    expect(createDateFormatter('auto', { step: 365 * DAY })(may10)).toBe('2026')
    expect(createDateFormatter()(may10)).toBe('May 10, 2026')
  })

  it('takes Intl options, a locale and a zone', () => {
    expect(createDateFormatter({ weekday: 'long' })(may10)).toBe('Sunday')
    expect(createDateFormatter('month', { locale: 'de-DE' })(may10)).toBe('Mai 2026')
    // 23:30 UTC on Dec 31 is already Jan 1 in Warsaw.
    const late = at('2026-12-31T23:30:00Z')
    expect(createDateFormatter('year', { zone: 'utc' })(late)).toBe('2026')
    expect(createDateFormatter('year', { zone: 'local' })(late)).toBe('2027')
    expect(createDateFormatter('quarter', { zone: 'local' })(late)).toBe('Q1 2027')
  })

  it('writes an empty string for a non-finite value', () => {
    expect(createDateFormatter('day')(Number.NaN)).toBe('')
    expect(createDateFormatter('quarter')(Number.NaN)).toBe('')
  })
})

describe('isDateFormat', () => {
  it('tells date specs from number specs', () => {
    expect(isDateFormat('auto')).toBe(true)
    expect(isDateFormat('quarter')).toBe(true)
    expect(isDateFormat({ month: 'long' })).toBe(true)
    expect(isDateFormat('percent')).toBe(false)
    expect(isDateFormat({ preset: 'percent' })).toBe(false)
    expect(isDateFormat((v: number) => String(v))).toBe(false)
    expect(isDateFormat(undefined)).toBe(false)
  })
})
```

Append to `packages/tally-charts/src/core/format.test.ts`:

```ts
describe('createFormatter with a preset object', () => {
  it('sets the fraction digits', () => {
    expect(createFormatter({ preset: 'percent', digits: 0 })(34)).toBe('34%')
    expect(createFormatter({ preset: 'currency', digits: 2 })(3240.5)).toBe('$3,240.50')
    expect(createFormatter({ preset: 'pts', digits: 2 })(-1.6)).toBe('−1.60 pts')
    expect(createFormatter({ preset: 'number', digits: 0 })(1234.56)).toBe('1,235')
    expect(createFormatter({ preset: 'currency-compact', digits: 0 })(82400)).toBe('$82K')
  })

  it('takes the sign from the object unless the caller sets it', () => {
    expect(createFormatter({ preset: 'pts', signed: false })(1.5)).toBe('1.5 pts')
    expect(createFormatter({ preset: 'currency', signed: true })(420)).toBe('+$420')
    expect(createFormatter({ preset: 'currency', signed: true }, { signed: false })(420)).toBe(
      '$420',
    )
  })

  it('uses the given locale', () => {
    expect(norm(createFormatter({ preset: 'percent', digits: 0 }, { locale: 'de-DE' })(12))).toBe(
      '12 %',
    )
  })

  it('falls back to the preset digits for digits it cannot use, without throwing', () => {
    for (const digits of [-1, 2.5, 21, Number.NaN]) {
      expect(createFormatter({ preset: 'percent', digits })(34)).toBe('34.0%')
    }
  })
})
```

In `packages/tally-charts/src/react/ChartsProvider.test.tsx`:
- change `{f.currency(3240)} | {f.create('pts')(-1.6)}` to `{f.currency(3240)} | {f.create('pts')(-1.6)} | {f.date('month')(Date.UTC(2026, 4, 10))}`
- change `'$3,240 | −1.6 pts'` to `'$3,240 | −1.6 pts | May 2026'`
- change `'3.240 € | −1,6 pts'` to `'3.240 € | −1,6 pts | Mai 2026'`

In `packages/tally-charts/src/react/marks/Axis.test.tsx`, in `it('formats linear ticks on the left with a preset', …)` replace `expect(labels(container)).toEqual(['30.0%', '35.0%', '40.0%'])` with:

```tsx
    // Every tick is whole, so the percent preset drops its decimal.
    expect(labels(container)).toEqual(['30%', '35%', '40%'])
```

and insert after that test:

```tsx
  it('keeps the preset decimals when a tick is not whole', () => {
    const { container } = render(
      <Chart {...frame} width={300} x={{ domain: [0, 1] }} y={{ domain: [0, 1] }}>
        <Axis side="left" ticks={2} format="percent" />
      </Chart>,
    )
    expect(labels(container)).toEqual(['0.0%', '0.5%', '1.0%'])
  })

  it('drops whole-tick decimals for pts and keeps explicit digits', () => {
    const { container } = render(
      <Chart {...frame} width={300} x={{ domain: [-2, 2] }} y={{ domain: [30, 40] }}>
        <Axis side="bottom" ticks={2} format="pts" />
        <Axis side="left" ticks={2} format={{ preset: 'percent', digits: 2 }} />
      </Chart>,
    )
    expect(labels(container)).toEqual(['−2 pts', '0 pts', '+2 pts', '30.00%', '35.00%', '40.00%'])
  })

  it('gives a format function the number on a value axis', () => {
    const pct = (v: number) => `${v.toFixed(0)} pct`
    const { container } = render(
      <Chart {...frame} width={300} x={{ domain: [0, 1] }} y={{ domain: [30, 40] }}>
        <Axis side="left" ticks={2} format={pct} />
      </Chart>,
    )
    expect(labels(container)).toEqual(['30 pct', '35 pct', '40 pct'])
  })

  it('ignores a date spec on a value axis', () => {
    const { container } = render(
      <Chart {...frame} width={300} x={{ domain: [0, 1] }} y={{ domain: [30, 40] }}>
        <Axis side="left" ticks={2} format="month" />
      </Chart>,
    )
    expect(labels(container)).toEqual(['30', '35', '40'])
  })
```

The `pct` test is also a compile check: a `(v: number) => string` must stay assignable to `AxisFormat`.

In `packages/tally-charts/src/react/charts/DotHistogram.test.tsx`, in `it('draws the target and the value axis', …)` change `'0.0%'` to `'0%'` and `'60.0%'` to `'60%'`, and add after that test:

```tsx
  it('formats the axis with axisFormat', () => {
    const { container } = renderHistogram({ axisFormat: (v) => `${v} pct` })
    const labels = parts(container, '[data-ch-part="axis-label"]').map((t) => t.textContent)
    expect(labels[0]).toBe('0 pct')
    expect(labels.at(-1)).toBe('60 pct')
  })
```

In `packages/tally-charts/src/react/charts/BarChart.test.tsx`, insert before `it('draws a target from a number or from an object with a label', …)`:

```tsx
  it('formats the category axis with axisFormat', () => {
    const { container } = renderChart({ axisFormat: (v) => `Week ${String(v).slice(1)}` })
    expect(parts(container, 'axis-label').map((t) => t.textContent)).toEqual(['Week 1', 'Week 3'])
  })
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter tally-charts exec vitest run src/core/date.test.ts src/core/format.test.ts src/react/ChartsProvider.test.tsx src/react/marks/Axis.test.tsx src/react/charts/DotHistogram.test.tsx src/react/charts/BarChart.test.tsx`
Expected: FAIL. `./date` doesn't exist, the object specs crash `createFormatter`, `f.date` is undefined, the axes still read "30.0%", and `axisFormat` is ignored.

- [ ] **Step 3: Add the object form to `createFormatter`**

In `packages/tally-charts/src/core/format.ts`, replace the first two lines:

```ts
export type FormatPreset = 'currency' | 'currency-compact' | 'percent' | 'pts' | 'number' | 'hours'
export type FormatSpec = FormatPreset | ((value: number) => string)
```

with:

```ts
export type FormatPreset = 'currency' | 'currency-compact' | 'percent' | 'pts' | 'number' | 'hours'

/** A preset with options, resolved with the `ChartsProvider` locale and currency. */
export interface FormatPresetSpec {
  preset: FormatPreset
  /**
   * Fraction digits, a whole number from 0 to 20: exact for currency, percent and pts; the most
   * shown for number, hours and currency-compact. Default: the preset's own.
   */
  digits?: number
  /** Show `+` on positive values. Default: true for pts, false otherwise. */
  signed?: boolean
}

export type FormatSpec = FormatPreset | FormatPresetSpec | ((value: number) => string)
```

Replace the whole `presetConfig` function with:

```ts
/** `digits` fixed for currency, percent and pts; a maximum for the others. */
function presetConfig(preset: FormatPreset, currency: string, digits?: number): PresetConfig {
  const exact = (d: number) => ({ minimumFractionDigits: d, maximumFractionDigits: d })
  switch (preset) {
    case 'currency':
      return { intl: { style: 'currency', currency, ...exact(digits ?? 0) } }
    case 'currency-compact':
      return {
        intl: {
          style: 'currency',
          currency,
          notation: 'compact',
          ...(digits === undefined
            ? { maximumSignificantDigits: 3 }
            : { maximumFractionDigits: digits }),
        },
      }
    case 'percent':
      // Values are percentage points: 34 means 34%.
      return { intl: { style: 'percent', ...exact(digits ?? 1) }, divisor: 100 }
    case 'pts':
      return { intl: exact(digits ?? 1), suffix: ' pts' }
    case 'hours':
      return { intl: { maximumFractionDigits: digits ?? 1 }, suffix: ' h' }
    case 'number':
      return { intl: { maximumFractionDigits: digits ?? 1 } }
  }
}

/** Whole numbers 0–20 only; anything else falls back to the preset's digits instead of throwing. */
function validDigits(digits: number | undefined): number | undefined {
  return digits !== undefined && Number.isInteger(digits) && digits >= 0 && digits <= 20
    ? digits
    : undefined
}
```

In `createFormatter`, replace:

```ts
  if (typeof spec === 'function') return spec
  const { locale = DEFAULT_LOCALE, currency = DEFAULT_CURRENCY } = options
  const signed = options.signed ?? spec === 'pts'
  const { intl, divisor = 1, suffix = '' } = presetConfig(spec, currency)
```

with:

```ts
  if (typeof spec === 'function') return spec
  const { preset, digits, signed: specSigned } = typeof spec === 'string' ? { preset: spec } : spec
  const { locale = DEFAULT_LOCALE, currency = DEFAULT_CURRENCY } = options
  // A component that needs a sign (Delta, step changes) passes `signed`; it wins over the spec.
  const signed = options.signed ?? specSigned ?? preset === 'pts'
  const { intl, divisor = 1, suffix = '' } = presetConfig(preset, currency, validDigits(digits))
```

- [ ] **Step 4: Write `core/date.ts`**

Create `packages/tally-charts/src/core/date.ts`:

```ts
import { timeDay, timeMonth, timeYear, unixDay, utcMonth, utcYear } from 'd3-time'
import { DEFAULT_LOCALE } from './format'
import { DAY, type TimeZone } from './time'

/**
 * How dates are written: `'auto'` (the default on a time axis), a preset, or any
 * `Intl.DateTimeFormatOptions`. `'day'` is "Jan 5, 2026", `'month'` "Jan 2026", `'quarter'`
 * "Q1 2026" and `'year'` "2026".
 */
export type DateFormatSpec =
  | 'auto'
  | 'day'
  | 'month'
  | 'quarter'
  | 'year'
  | Intl.DateTimeFormatOptions

export interface DateFormatOptions {
  /** Default `en-US`, or the `ChartsProvider` locale through `useFormat()`. */
  locale?: string
  /** Default 'utc'. */
  zone?: TimeZone
  /**
   * Typical distance between the values in ms. `'auto'` writes the fields that tell such values
   * apart: the time under a day, the day under four weeks, the month under a year, else the
   * year. Default: one day.
   */
  step?: number
}

/** Formats one date, given in epoch ms. Non-finite values give an empty string. */
export type DateFormatter = (ms: number) => string

type Grain = 'year' | 'month' | 'day' | 'time'

const GRAINS: readonly Grain[] = ['year', 'month', 'day', 'time']
const DATE_PRESETS: ReadonlySet<unknown> = new Set(['auto', 'day', 'month', 'quarter', 'year'])

/** True for a `DateFormatSpec`; false for a number `FormatSpec` and for functions. */
export function isDateFormat(spec: unknown): spec is DateFormatSpec {
  return typeof spec === 'string'
    ? DATE_PRESETS.has(spec)
    : typeof spec === 'object' && spec !== null && !('preset' in spec)
}

function grainOf(step: number): Grain {
  if (!(step < 365 * DAY)) return 'year'
  if (step >= 28 * DAY) return 'month'
  return step >= DAY ? 'day' : 'time'
}

/** The coarsest calendar boundary `ms` sits on in `zone`. */
function boundaryOf(ms: number, zone: TimeZone): Grain {
  const d = new Date(ms)
  const [year, month, day] =
    zone === 'utc' ? [utcYear, utcMonth, unixDay] : [timeYear, timeMonth, timeDay]
  if (+year.floor(d) === ms) return 'year'
  if (+month.floor(d) === ms) return 'month'
  return +day.floor(d) === ms ? 'day' : 'time'
}

/** Every field a lone value needs, e.g. "Jan 2026" for monthly data. */
const FULL: Record<Grain, Intl.DateTimeFormatOptions> = {
  year: { year: 'numeric' },
  month: { month: 'short', year: 'numeric' },
  day: { month: 'short', day: 'numeric', year: 'numeric' },
  time: { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' },
}

/** The one field a tick after the first shows at a boundary of this grain. */
const TICK: Record<Grain, Intl.DateTimeFormatOptions> = {
  year: { year: 'numeric' },
  month: { month: 'short' },
  day: { month: 'short', day: 'numeric' },
  time: { hour: 'numeric', minute: '2-digit' },
}

/** Adds seconds under a minute, and milliseconds under a second, to time fields. */
function withSeconds(fields: Intl.DateTimeFormatOptions, step: number): Intl.DateTimeFormatOptions {
  if (!('hour' in fields) || !(step < 6e4)) return fields
  return step < 1e3
    ? { ...fields, second: '2-digit', fractionalSecondDigits: 3 }
    : { ...fields, second: '2-digit' }
}

function intl(locale: string, zone: TimeZone, fields: Intl.DateTimeFormatOptions) {
  // 'local' leaves the zone unset: the runtime's own zone.
  return new Intl.DateTimeFormat(locale, zone === 'utc' ? { ...fields, timeZone: 'UTC' } : fields)
}

/** A formatter for single dates: tooltip headers, announcements and data-table cells. */
export function createDateFormatter(
  spec: DateFormatSpec = 'auto',
  { locale = DEFAULT_LOCALE, zone = 'utc', step = DAY }: DateFormatOptions = {},
): DateFormatter {
  if (spec === 'quarter') {
    // Intl has no quarter field, so the quarter comes from the month.
    const year = intl(locale, zone, { year: 'numeric' })
    return (ms) => {
      if (!Number.isFinite(ms)) return ''
      const d = new Date(ms)
      const month = zone === 'utc' ? d.getUTCMonth() : d.getMonth()
      return `Q${Math.floor(month / 3) + 1} ${year.format(d)}`
    }
  }
  const fields =
    typeof spec === 'object'
      ? spec
      : spec === 'auto'
        ? withSeconds(FULL[grainOf(step)], step)
        : FULL[spec]
  const f = intl(locale, zone, fields)
  return (ms) => (Number.isFinite(ms) ? f.format(ms) : '')
}

/**
 * Multi-scale labels for time ticks. The first tick carries the full context ("Jan 2026"). Each
 * later tick shows the coarsest field that changes at its boundary: the year on a year
 * boundary, the month name on a month boundary, the day otherwise, and the time when the ticks
 * are under a day apart.
 */
export function autoTickLabels(
  ticks: readonly number[],
  { locale = DEFAULT_LOCALE, zone = 'utc' }: Omit<DateFormatOptions, 'step'> = {},
): string[] {
  const [first, second] = ticks
  if (first === undefined) return []
  const step = second === undefined ? Number.NaN : second - first
  const grain = second === undefined ? boundaryOf(first, zone) : grainOf(step)
  // One Intl formatter per field set, keyed by the FULL or TICK entry it was built from.
  const formats = new Map<Intl.DateTimeFormatOptions, Intl.DateTimeFormat>()
  const format = (fields: Intl.DateTimeFormatOptions, ms: number) => {
    let f = formats.get(fields)
    if (!f) {
      f = intl(locale, zone, withSeconds(fields, step))
      formats.set(fields, f)
    }
    return f.format(ms)
  }
  return ticks.map((ms, i) => {
    if (i === 0) return format(FULL[grain], ms)
    // Never finer than the ticks' grain: a monthly tick reads as a month.
    const field = GRAINS[Math.min(GRAINS.indexOf(boundaryOf(ms, zone)), GRAINS.indexOf(grain))]
    return format(TICK[field ?? grain], ms)
  })
}
```

- [ ] **Step 5: Give `useFormat()` a date formatter**

In `packages/tally-charts/src/react/ChartsProvider.tsx`, add after the `react` import:

```tsx
import {
  createDateFormatter,
  type DateFormatOptions,
  type DateFormatSpec,
  type DateFormatter,
} from '../core/date'
```

Add to `UseFormatResult` after `create`:

```tsx
  /** A date formatter in the provider's locale. */
  date: (spec?: DateFormatSpec, options?: Omit<DateFormatOptions, 'locale'>) => DateFormatter
```

and to the memoized object in `useFormat`, after the `create:` line:

```tsx
      date: (spec, options) => createDateFormatter(spec, { ...options, locale }),
```

- [ ] **Step 6: Widen `AxisFormat` and drop whole-tick decimals**

In `packages/tally-charts/src/react/marks/Axis.tsx`, replace the header:

```tsx
import type { FormatPreset } from '../../core/format'
import { categoryTicks, linearTicks, type Tick, type TickSpec, thinTicks } from '../../core/ticks'
import { useChart } from '../context'

export type AxisSide = 'bottom' | 'top' | 'left' | 'right'
export type AxisFormat = FormatPreset | ((value: string | number) => string)
```

with:

```tsx
import { type DateFormatSpec, isDateFormat } from '../../core/date'
import type { FormatPreset, FormatPresetSpec, Formatter } from '../../core/format'
import { categoryTicks, linearTicks, type Tick, type TickSpec, thinTicks } from '../../core/ticks'
import { type ChartContextValue, useChart } from '../context'

export type AxisSide = 'bottom' | 'top' | 'left' | 'right'

/** A tick value: a number on a value axis, the category on a band or point axis, a Date on a time axis. */
export type AxisValue = string | number | Date

/**
 * A tick label function. Declared as a method so that a number-only `(v: number) => string`
 * stays assignable for value axes, while an unannotated arrow gets `AxisValue`.
 */
export type AxisFormatter = { format(value: AxisValue): string }['format']

/**
 * Number presets label value axes, date specs label time axes, and a function labels any axis.
 * Category axes show the category unless a function is given.
 */
export type AxisFormat = FormatPreset | FormatPresetSpec | DateFormatSpec | AxisFormatter
```

Insert before `export function Axis({`:

```tsx
const FIXED_DECIMALS: ReadonlySet<FormatPreset> = new Set(['percent', 'pts'])

/**
 * The number formatter for a value axis. A preset that always shows decimals (percent, pts) drops
 * them when every tick is a whole number, so the axis reads "0%" rather than "0.0%"; explicit
 * `digits` are kept. Date specs don't apply to numbers and fall back to 'number'.
 */
function valueFormatter(
  ctx: ChartContextValue,
  format: AxisFormat | undefined,
  ticks: readonly Tick[],
): Formatter {
  if (format === undefined || typeof format === 'function' || isDateFormat(format)) {
    return ctx.format('number')
  }
  const spec = typeof format === 'string' ? { preset: format } : format
  const whole =
    spec.digits === undefined &&
    FIXED_DECIMALS.has(spec.preset) &&
    ticks.every((tick) => Number.isInteger(tick.value))
  return ctx.format(whole ? { ...spec, digits: 0 } : spec)
}

```

In `Axis`, replace:

```tsx
  const custom = typeof format === 'function' ? format : undefined
  const numeric = ctx.format(typeof format === 'string' ? format : 'number')

  const label = (v: string) => (custom ? custom(v) : v)
  const raw =
    resolved.kind === 'linear'
      ? linearTicks(resolved.scale, spec, (v) => (custom ? custom(v) : numeric(v)), extent)
      : categoryTicks(resolved.scale, spec, label, { anchorEnds: horizontal })
```

with:

```tsx
  const custom = typeof format === 'function' ? format : undefined

  let raw: Tick[]
  if (resolved.kind === 'linear') {
    const values = linearTicks(resolved.scale, spec, String, extent)
    const label = custom ?? valueFormatter(ctx, format, values)
    raw = values.map((tick) => ({ ...tick, label: label(tick.value as number) }))
  } else {
    raw = categoryTicks(resolved.scale, spec, custom ?? String, { anchorEnds: horizontal })
  }
```

- [ ] **Step 7: Stop wrapping formats in the charts; add `axisFormat` to BarChart and DotHistogram**

`FormatSpec` is now part of `AxisFormat`, so charts pass `format` straight through.

In `packages/tally-charts/src/react/charts/WaterfallChart.tsx` and `packages/tally-charts/src/react/charts/StripPlot.tsx`, replace:

```tsx
  const axisFmt: AxisFormat | undefined =
    axisFormat ??
    (typeof format === 'function' ? (v: string | number) => format(Number(v)) : format)
```

with:

```tsx
  const axisFmt: AxisFormat | undefined = axisFormat ?? format
```

In `packages/tally-charts/src/react/charts/LineChart.tsx`, replace:

```tsx
  const valueFormat =
    axisFormat ??
    (typeof format === 'function' ? (v: string | number) => format(Number(v)) : format)
```

with:

```tsx
  const valueFormat: AxisFormat | undefined = axisFormat ?? format
```

In `packages/tally-charts/src/react/charts/DotHistogram.tsx`:
- change `import { Axis } from '../marks/Axis'` to `import { Axis, type AxisFormat } from '../marks/Axis'`
- after `axis?: TickSpec | 'none'` in the props add:

```tsx
  /** Axis label format. Default: `format`. */
  axisFormat?: AxisFormat
```

- add `axisFormat,` after `axis = 6,` in the destructuring
- replace the axis element

```tsx
      {axis === 'none' ? null : (
        <Axis
          side="bottom"
          ticks={axis}
          format={typeof format === 'function' ? (v) => format(Number(v)) : format}
        />
      )}
```

with

```tsx
      {axis === 'none' ? null : <Axis side="bottom" ticks={axis} format={axisFormat ?? format} />}
```

In `packages/tally-charts/src/react/charts/BarChart.tsx`:
- change `import { Axis } from '../marks/Axis'` to `import { Axis, type AxisFormat } from '../marks/Axis'`
- after `axis?: TickSpec | 'none'` add:

```tsx
  /** Category axis labels: a function of the category. Default: the category itself. */
  axisFormat?: AxisFormat
```

- add `axisFormat,` after `axis = 'ends',`
- replace `{axis === 'none' ? null : <Axis side={vertical ? 'bottom' : 'left'} ticks={axis} />}` with:

```tsx
      {axis === 'none' ? null : (
        <Axis side={vertical ? 'bottom' : 'left'} ticks={axis} format={axisFormat} />
      )}
```

- [ ] **Step 8: Export the new types**

In `packages/tally-charts/src/core/index.ts`, add `export type { DateFormatOptions, DateFormatSpec, DateFormatter } from './date'` after the `computeBars` export, and `FormatPresetSpec,` to the `./format` type export after `FormatPreset,`.

In `packages/tally-charts/src/index.ts`, replace `export type { FormatPreset, FormatSpec, Formatter, Formatters } from './core/format'` with:

```ts
export type { DateFormatOptions, DateFormatSpec, DateFormatter } from './core/date'
export type {
  FormatPreset,
  FormatPresetSpec,
  FormatSpec,
  Formatter,
  Formatters,
} from './core/format'
```

and `export type { AxisFormat, AxisProps, AxisSide } from './react/marks/Axis'` with:

```ts
export type {
  AxisFormat,
  AxisFormatter,
  AxisProps,
  AxisSide,
  AxisValue,
} from './react/marks/Axis'
```

- [ ] **Step 9: Run the tests and checks**

Run: `pnpm --filter tally-charts exec vitest run src/core/date.test.ts src/core/format.test.ts src/react/ChartsProvider.test.tsx src/react/marks/Axis.test.tsx src/react/charts`
Expected: PASS.

Run: `pnpm test && pnpm typecheck && pnpm lint`
Expected: all PASS (731 tests). The storybook typecheck compiles `axisFormat={(v) => \`${v}%\`}` (MarginOutlook, WhyUnderTarget) and `axisFormat={(v) => \`${v} h\`}` (DallasInstalls) unannotated: the arrows now get `AxisValue`.

The JobsByMargin story's axis now reads "0%" … "60%". That change is within the screenshot tolerance (`maxDiffPixelRatio: 0.002`), so the e2e suite stays green on the old baselines; 0.6b regenerates them all (design decision 13).

- [ ] **Step 10: Commit**

```bash
pnpm format
git add packages/tally-charts
git commit -m "feat: date formats, preset objects, AxisValue axis formats and whole-number axes

Co-Authored-By: <your own model trailer>"
```

---

### Task 5: Time scales on `<Chart>` and the marks (spec §2 "Where it works")

**Files:**
- Modify: `packages/tally-charts/src/core/scale.ts`, `packages/tally-charts/src/core/scale.test.ts`
- Modify: `packages/tally-charts/src/react/marks/series.ts`, `Line.tsx`, `Band.tsx`, `Area.tsx`, `Region.tsx`, `Target.tsx`, `Axis.tsx` and the tests `Line.test.tsx`, `Band.test.tsx`, `Target.test.tsx`
- Create: `packages/tally-charts/src/react/marks/time.test.tsx`
- Modify: `packages/tally-charts/src/react/ChartsProvider.tsx`
- Modify: `packages/tally-charts/scripts/check-dev-strip.mjs`
- Modify: `packages/tally-charts/src/core/index.ts`, `packages/tally-charts/src/index.ts`, `packages/tally-charts/src/index.test.ts`

**Interfaces:**
- Consumes: Task 3's `TimeInput`, `TimeScale`, `TimeZone`, `toTime`, `inferTimeDomain`, `niceTimeDomain` and `timeScale`; Task 4's `autoTickLabels`, `createDateFormatter` and `isDateFormat`; Task 2's `seriesScales`.
- Produces:
  - `interface TimeScaleSpec<D> { type: 'time'; field?: Accessor<D, TimeInput>; domain?: readonly [TimeInput, TimeInput]; nice?: boolean; zone?: TimeZone }`, part of `ScaleSpec<D>`
  - `ResolvedScale` gains `{ kind: 'time'; scale: TimeScale }`
  - `createScale` resolves `'time'`. It warns `'<axis>-time-domain'` when there are no valid dates. `nice` defaults to `!explicit domain`, and y gets a flipped range.
  - `seriesScales` accepts a time x. `x(v)` is `scale(toTime(v))`; invalid values are NaN and warn `'x-time-value'` once. `key(v)` is `new Date(ms).toISOString()`, or `''` when invalid.
  - `RegionProps.from: TimeInput`, `RegionProps.to?: TimeInput`; `TargetProps.x?: TimeInput`
  - `LineProps.x`, `BandProps.x` and `AreaProps.x` accept `Accessor<D, string | number | Date>`
  - `useLocale(): { locale: string; currency: string }` in `react/ChartsProvider.tsx` (internal, not exported from the root)

- [ ] **Step 1: Write the failing tests**

Append to `packages/tally-charts/src/core/scale.test.ts`:

```ts
describe('time scales', () => {
  const rows = [
    { at: '2026-03-02T05:00:00Z' },
    { at: new Date('2026-03-02T17:00:00Z') },
    { at: 'not a date' },
    { at: null },
  ]

  it('infers the domain from valid dates and rounds it out to tick boundaries', () => {
    const s = createScale({ type: 'time', field: 'at' }, rows, 'x', 600, noop)
    if (s.kind !== 'time') throw new Error('expected a time scale')
    // 05:00–17:00 picks 3-hour ticks, so the domain becomes 03:00–18:00.
    expect(s.scale.domain().map((t) => new Date(t).toISOString())).toEqual([
      '2026-03-02T03:00:00.000Z',
      '2026-03-02T18:00:00.000Z',
    ])
    expect(s.scale.range()).toEqual([0, 600])
    expect(s.scale.zone).toBe('utc')
  })

  it('keeps an explicit domain unless nice is asked for', () => {
    const exact = createScale(
      { type: 'time', domain: ['2026-03-02T05:00:00Z', Date.parse('2026-03-02T17:00:00Z')] },
      [],
      'x',
      600,
      noop,
    )
    if (exact.kind !== 'time') throw new Error('expected a time scale')
    expect(exact.scale(Date.parse('2026-03-02T11:00:00Z'))).toBe(300)
    const niced = createScale(
      { type: 'time', domain: ['2026-03-02T05:00:00Z', '2026-03-02T17:00:00Z'], nice: true },
      [],
      'x',
      600,
      noop,
    )
    if (niced.kind !== 'time') throw new Error('expected a time scale')
    expect(niced.scale.domain()[0]).toBe(Date.parse('2026-03-02T03:00:00Z'))
  })

  it('pads a single date by a day on each side and flips the range on y', () => {
    const s = createScale(
      { type: 'time', field: 'at', nice: false, zone: 'local' },
      [{ at: '2026-03-02' }],
      'y',
      100,
      noop,
    )
    if (s.kind !== 'time') throw new Error('expected a time scale')
    expect(s.scale.domain()).toEqual([Date.UTC(2026, 2, 1), Date.UTC(2026, 2, 3)])
    expect(s.scale.range()).toEqual([100, 0])
    expect(s.scale.zone).toBe('local')
  })

  it('warns and falls back to the last day without valid dates', () => {
    const warn = vi.fn()
    const s = createScale({ type: 'time', field: 'at' }, [{ at: 'never' }], 'x', 100, warn)
    expect(s.kind).toBe('time')
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]?.[0]).toBe('x-time-domain')
    expect(warn.mock.calls[0]?.[1]).toContain('no valid dates')
  })

  it('has no category centre or step', () => {
    const s = createScale(
      { type: 'time', domain: ['2026-01-01', '2026-01-02'] },
      [],
      'x',
      100,
      noop,
    )
    expect(categoryCenter(s, '2026-01-01')).toBeUndefined()
    expect(categoryStep(s)).toBe(0)
  })
})
```

Create `packages/tally-charts/src/react/marks/time.test.tsx`:

```tsx
import { render } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { TimeScaleSpec } from '../../core/scale'
import { Chart } from '../Chart'
import { ChartsProvider } from '../ChartsProvider'
import { Area } from './Area'
import { Axis } from './Axis'
import { Band } from './Band'
import { Bars } from './Bars'
import { ColumnHighlight } from './ColumnHighlight'
import { Grid } from './Grid'
import { Line } from './Line'
import { Region } from './Region'
import { Target } from './Target'

type Day = { date: string | Date | number | null; v: number; lo: number; hi: number }
const days: Day[] = [
  { date: '2026-01-01', v: 2, lo: 1, hi: 3 },
  { date: new Date('2026-01-02T00:00:00Z'), v: 5, lo: 4, hi: 6 },
  { date: Date.UTC(2026, 0, 4), v: 8, lo: 7, hi: 9 },
]

// 400 × 100 with no margin over Jan 1 – Jan 5 (UTC): 100px per day; y = 100 − 10 × v.
const X: TimeScaleSpec<Day> = { type: 'time', field: 'date', domain: ['2026-01-01', '2026-01-05'] }

function renderTime(children: ReactNode, x: TimeScaleSpec<Day> = X, data: Day[] = days) {
  return render(
    <Chart<Day>
      title="Time"
      width={400}
      height={100}
      margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
      animate={false}
      data={data}
      x={x}
      y={{ field: 'v', domain: [0, 10] }}
    >
      {children}
    </Chart>,
  )
}

const parts = (root: HTMLElement, part: string) => [
  ...root.querySelectorAll(`[data-ch-part="${part}"]`),
]
const labels = (root: HTMLElement) => parts(root, 'axis-label').map((el) => el.textContent)
const attrs = (els: Element[], name: string) => els.map((el) => el.getAttribute(name))

describe('marks on a time x scale', () => {
  it('labels the axis with multi-scale dates at their positions', () => {
    const { container } = renderTime(<Axis side="bottom" />)
    expect(labels(container)).toEqual(['Jan 1, 2026', 'Jan 2', 'Jan 3', 'Jan 4', 'Jan 5'])
    expect(attrs(parts(container, 'axis-label'), 'x')).toEqual(['0', '100', '200', '300', '400'])
    // The ticks on the plot edges anchor inward, so they don't run past the plot.
    expect(attrs(parts(container, 'axis-label'), 'text-anchor')).toEqual([
      'start',
      'middle',
      'middle',
      'middle',
      'end',
    ])
  })

  it('formats the axis with a date spec, a function, or ends only', () => {
    const { container } = renderTime(
      <>
        <Axis side="bottom" ticks={2} format="day" />
        <Axis side="top" format={(v) => (v instanceof Date ? v.toISOString().slice(5, 10) : '')} />
        <Axis side="left" ticks="ends" />
      </>,
    )
    const [bottom, top] = parts(container, 'axis')
    expect([...(bottom?.children ?? [])].map((el) => el.textContent)).toEqual([
      'Jan 1, 2026',
      'Jan 3, 2026',
      'Jan 5, 2026',
    ])
    expect([...(top?.children ?? [])].map((el) => el.textContent)).toEqual([
      '01-01',
      '01-02',
      '01-03',
      '01-04',
      '01-05',
    ])
    expect(labels(container).slice(-2)).toEqual(['0', '10'])
  })

  it('labels the ends in full and anchors them inward on a time x axis', () => {
    const { container } = renderTime(<Axis side="bottom" ticks="ends" />)
    expect(labels(container)).toEqual(['Jan 1, 2026', 'Jan 5, 2026'])
    expect(attrs(parts(container, 'axis-label'), 'text-anchor')).toEqual(['start', 'end'])
  })

  it('uses the provider locale for dates', () => {
    const { container } = render(
      <ChartsProvider locale="de-DE">
        <Chart<Day>
          title="Zeit"
          width={400}
          height={100}
          margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
          data={days}
          x={X}
          y={{ domain: [0, 10] }}
        >
          <Axis side="bottom" ticks={2} />
        </Chart>
      </ChartsProvider>,
    )
    expect(labels(container)).toEqual(['1. Jan. 2026', '3. Jan.', '5. Jan.'])
  })

  it('draws lines, bands and areas through the dates', () => {
    const { container } = renderTime(
      <>
        <Band<Day> low="lo" high="hi" />
        <Area<Day> />
        <Line<Day> />
      </>,
    )
    expect(parts(container, 'line')[0]).toHaveAttribute('d', 'M0,80L100,50L300,20')
    expect(attrs(parts(container, 'line-dot'), 'cx')).toEqual(['0', '100', '300'])
    expect(parts(container, 'band')[0]).toHaveAttribute(
      'd',
      'M0,70L100,40L300,10L300,30L100,60L0,90Z',
    )
    expect(parts(container, 'area')[0]?.getAttribute('d')).toMatch(/^M0,80L100,50L300,20/)
  })

  it('skips points whose x is not a date, with one warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { container } = renderTime(<Line<Day> />, X, [
      ...days,
      { date: 'soon', v: 1, lo: 0, hi: 2 },
      { date: null, v: 1, lo: 0, hi: 2 },
    ])
    expect(attrs(parts(container, 'line-dot'), 'cx')).toEqual(['0', '100', '300'])
    expect(container.innerHTML).not.toContain('NaN')
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]?.[0]).toContain('Line skipped an x value that is not a date')
  })

  it('shades a region between dates, or from a date to the end', () => {
    const { container } = renderTime(
      <>
        <Region from={new Date('2026-01-03T00:00:00Z')} />
        <Region from="2026-01-02" to={Date.UTC(2026, 0, 3)} tone="neutral" />
      </>,
    )
    const [toEnd, between] = parts(container, 'region')
    expect([toEnd?.getAttribute('x'), toEnd?.getAttribute('width')]).toEqual(['200', '200'])
    expect([between?.getAttribute('x'), between?.getAttribute('width')]).toEqual(['100', '100'])
  })

  it('warns and draws no region for an invalid date', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { container } = renderTime(<Region from="later" />)
    expect(parts(container, 'region')).toHaveLength(0)
    expect(warn.mock.calls[0]?.[0]).toContain('Region from "later"')
  })

  it('draws a target rule at a date', () => {
    const { container } = renderTime(
      <>
        <Target x="2026-01-03" label="Launch" />
        <Target x={new Date('2026-02-01')} />
      </>,
    )
    const rules = parts(container, 'target')
    // The second date is outside the domain, so only the first rule is drawn.
    expect(rules).toHaveLength(1)
    expect(rules[0]).toHaveAttribute('x1', '200')
    expect(parts(container, 'target-label')[0]).toHaveTextContent('Launch')
  })

  it('rules the grid at the y ticks', () => {
    const { container } = renderTime(<Grid ticks={2} />)
    expect(attrs(parts(container, 'grid-line'), 'y1')).toEqual(['100', '50', '0'])
  })

  it('draws no bars and no column highlight, with one warning each', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { container } = renderTime(
      <>
        <Bars<Day> />
        <ColumnHighlight at="2026-01-02" />
      </>,
    )
    expect(parts(container, 'bar')).toHaveLength(0)
    expect(parts(container, 'column-highlight')).toHaveLength(0)
    const messages = warn.mock.calls.map((call) => String(call[0]))
    expect(messages.filter((m) => m.includes('Bars need one band scale'))).toHaveLength(1)
    expect(messages.filter((m) => m.includes('ColumnHighlight needs a band scale'))).toHaveLength(1)
  })
})
```

Update the three messages the marks now word differently:
- `packages/tally-charts/src/react/marks/Line.test.tsx`: `toContain('Line needs a point or band scale')` → `toContain('Line needs a point, band or time scale')`
- `packages/tally-charts/src/react/marks/Band.test.tsx`: `toContain('Band needs a point or band scale')` → `toContain('Band needs a point, band or time scale')`
- `packages/tally-charts/src/react/marks/Target.test.tsx`: `toContain('linear scale')` → `toContain('linear or time scale')`

In `packages/tally-charts/src/index.test.ts`, add `'toTime',` after `'clampToRange',` in the `'core exports %s'` list.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter tally-charts exec vitest run src/core/scale.test.ts src/react/marks src/index.test.ts`
Expected: FAIL. `type: 'time'` builds a linear scale, the marks draw nothing on it, and `toTime` isn't exported from core.

- [ ] **Step 3: Resolve `type: 'time'` in `createScale`**

In `packages/tally-charts/src/core/scale.ts`, add after `import { toNumber } from './number'`:

```ts
import {
  inferTimeDomain,
  niceTimeDomain,
  type TimeInput,
  type TimeScale,
  type TimeZone,
  timeScale,
  toTime,
} from './time'
```

Replace `export type ScaleSpec<D> = LinearScaleSpec<D> | BandScaleSpec<D> | PointScaleSpec<D>` with:

```ts
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
```

Add the arm to `ResolvedScale`, after `| { kind: 'point'; scale: PointScale }`:

```ts
  | { kind: 'time'; scale: TimeScale }
```

In `createScale`, insert before `const linear = spec as LinearScaleSpec<D> | undefined`:

```ts
  if (spec?.type === 'time') {
    const zone = spec.zone ?? 'utc'
    const explicit = spec.domain?.map(toTime)
    const valid = explicit?.every((t) => t !== undefined) ?? false
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

```

An explicit domain also goes through `inferTimeDomain`, so a span under 1 ms is padded too (spec §8). Replace `categoryCenter` and `categoryStep` (with their doc comments) with:

```ts
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
```

- [ ] **Step 4: Teach the shared guard about time**

Replace `packages/tally-charts/src/react/marks/series.ts` with:

```ts
import { clampToRange } from '../../core/linear'
import { toNumber } from '../../core/number'
import { categoryCenter } from '../../core/scale'
import { toTime } from '../../core/time'
import { DEV } from '../../core/warn'
import type { ChartContextValue } from '../context'

/** Pixel positions for marks that draw values along x, such as `Line` and `Band`. */
export interface SeriesScales {
  /** Plot x of a category or date; NaN when the scale can't place it. */
  x: (value: unknown) => number
  /** Plot y of a value, clamped into the plot; NaN when the value is missing. */
  y: (value: unknown) => number
  /**
   * The point id an x value gets: the category as a string, or the date as an ISO string, so a
   * chart that registers one point per x (as LineChart does) lights the matching dots.
   */
  key: (value: unknown) => string
}

/**
 * The shared scale guard of `Line` and `Band`: a point, band or time scale on x and a linear
 * scale on y. Otherwise it warns once per chart and returns undefined, and the mark draws
 * nothing. On a time scale, x values `toTime` rejects are skipped with one warning per chart.
 */
export function seriesScales(
  ctx: ChartContextValue,
  mark: 'Line' | 'Band',
): SeriesScales | undefined {
  const { x, y } = ctx
  if (x.kind === 'linear' || y.kind !== 'linear') {
    if (DEV) {
      ctx.warn(
        `${mark.toLowerCase()}-scales`,
        `${mark} needs a point, band or time scale on <Chart x> and a linear scale on <Chart y>.`,
      )
    }
    return undefined
  }
  const linear = y.scale
  const yOf = (value: unknown) => {
    const v = toNumber(value)
    return Number.isFinite(v) ? clampToRange(linear, linear(v)) : Number.NaN
  }
  if (x.kind === 'time') {
    const time = x.scale
    const ms = (value: unknown) => {
      const t = toTime(value)
      if (DEV && t === undefined) {
        ctx.warn('x-time-value', `${mark} skipped an x value that is not a date: ${String(value)}.`)
      }
      return t
    }
    return {
      x: (value) => {
        const t = ms(value)
        return t === undefined ? Number.NaN : time(t)
      },
      y: yOf,
      key: (value) => {
        const t = toTime(value)
        return t === undefined ? '' : new Date(t).toISOString()
      },
    }
  }
  return {
    x: (value) => categoryCenter(x, value) ?? Number.NaN,
    y: yOf,
    key: String,
  }
}
```

In `packages/tally-charts/src/react/marks/Line.tsx`:
- change the `x` prop to `x?: Accessor<D, string | number | Date>`, with the doc `/** Category or date field. Defaults to the field on <Chart x>. */` (the points already take `key: scales.key(category)` from Task 2, so dots on a time axis get ISO keys)
- replace the component's doc comment with:

```tsx
/**
 * Straight segments through the category centres of a point or band x scale, or through the
 * dates on a time scale, in data order. A missing value breaks the line. The dot whose x equals
 * the chart's active id gets a ring (a category as a string, a date as its ISO string), so a
 * chart that registers one point per x lights every line at that x.
 */
```

In `packages/tally-charts/src/react/marks/Band.tsx`, change the `x` prop to `x?: Accessor<D, string | number | Date>` with the doc `/** Category or date field. Defaults to the field on <Chart x>. */`, and the component doc to `/** A soft area between \`low\` and \`high\` at each category or date, e.g. a likely range. Gaps break it. */`.

- [ ] **Step 5: Area, Region and Target on time**

In `packages/tally-charts/src/react/marks/Area.tsx`:
- add `import { toTime } from '../../core/time'` after the `toNumber` import
- change the `x` prop to `x?: Accessor<D, string | number | Date>` with the doc `/** Band or date field. Defaults to the field on <Chart x>. */`
- replace the component doc with:

```tsx
/**
 * A soft gradient area through the band centres, or through the dates on a time scale, e.g.
 * joining the tops of bridge columns.
 */
```

- replace the scale guard

```tsx
  if (ctx.x.kind !== 'band' || ctx.y.kind !== 'linear') {
    if (DEV)
      ctx.warn(
        'area-scales',
        'Area needs a band scale on <Chart x> and a linear scale on <Chart y>.',
      )
    return null
  }
```

with

```tsx
  const xScale = ctx.x
  if ((xScale.kind !== 'band' && xScale.kind !== 'time') || ctx.y.kind !== 'linear') {
    if (DEV)
      ctx.warn(
        'area-scales',
        'Area needs a band or time scale on <Chart x> and a linear scale on <Chart y>.',
      )
    return null
  }
```

- delete `const band = ctx.x.scale`
- replace

```tsx
  const size = band.bandwidth()
  const rows = (data ?? ctx.data) as readonly D[]
  const columns = rows.flatMap((d, i) => {
    const start = band(String(getX(d, i)))
```

with

```tsx
  // A date is a band of width 0 at its position.
  const size = xScale.kind === 'band' ? xScale.scale.bandwidth() : 0
  const startOf = (value: unknown): number | undefined => {
    if (xScale.kind === 'band') return xScale.scale(String(value))
    const t = toTime(value)
    return t === undefined ? undefined : xScale.scale(t)
  }
  const rows = (data ?? ctx.data) as readonly D[]
  const columns = rows.flatMap((d, i) => {
    const start = startOf(getX(d, i))
```

In `packages/tally-charts/src/react/marks/Region.tsx`:
- add `import { type TimeInput, toTime } from '../../core/time'` after the scale import
- replace the props and the doc comment of the component:

```tsx
export interface RegionProps {
  /**
   * Where the region starts: a category on a point or band scale, e.g. the first forecast month,
   * or a date (`Date`, epoch ms or ISO string) on a time scale.
   */
  from: TimeInput
  /** Where it ends. Default: the last category, or the end of the time scale. */
  to?: TimeInput
  /** Default 'accent'. */
  tone?: Tone
}

/**
 * A soft backdrop over a run of categories on a point or band x scale, or a span of dates on a
 * time scale. On categories it covers whole steps, so it starts halfway between `from` and the
 * category before it; on time it starts and ends exactly at its dates.
 */
```

- replace

```tsx
  if (ctx.x.kind === 'linear') {
    if (DEV) ctx.warn('region-scale', 'Region needs a point or band scale on <Chart x>.')
    return null
  }
  const domain = ctx.x.scale.domain()
  const last = to ?? domain[domain.length - 1]
  const a = categoryCenter(ctx.x, from)
  const b = categoryCenter(ctx.x, last)
```

with

```tsx
  const x = ctx.x
  if (x.kind === 'linear') {
    if (DEV) ctx.warn('region-scale', 'Region needs a point, band or time scale on <Chart x>.')
    return null
  }
  let a: number | undefined
  let b: number | undefined
  let half = 0
  if (x.kind === 'time') {
    const start = toTime(from)
    const end = to === undefined ? x.scale.domain()[1] : toTime(to)
    a = start === undefined ? undefined : x.scale(start)
    b = end === undefined ? undefined : x.scale(end)
  } else {
    const domain = x.scale.domain()
    a = categoryCenter(x, from)
    b = categoryCenter(x, to ?? domain[domain.length - 1])
    half = categoryStep(x) / 2
  }
  const last = to ?? 'the end'
```

- delete `const half = categoryStep(ctx.x) / 2` further down (it is computed above now)

In `packages/tally-charts/src/react/marks/Target.tsx`:
- add `import { type TimeInput, toTime } from '../../core/time'` as the first import
- replace the `x` prop

```tsx
  /** Draws a vertical rule at this x value. */
  x?: number
```

with

```tsx
  /**
   * Draws a vertical rule at this x value: a number on a linear scale, or a date (`Date`, epoch
   * ms or ISO string) on a time scale.
   */
  x?: TimeInput
```

- replace

```tsx
  const value = horizontal ? y : x
  const resolved = horizontal ? ctx.y : ctx.x
  if (value === undefined) {
    if (DEV) ctx.warn('target-value', 'Target needs an `x` or `y` value.')
    return null
  }
  if (resolved.kind !== 'linear') {
    if (DEV) ctx.warn('target-scale', 'Target needs a linear scale on the axis it marks.')
    return null
  }
```

with

```tsx
  const raw = horizontal ? y : x
  const resolved = horizontal ? ctx.y : ctx.x
  if (raw === undefined) {
    if (DEV) ctx.warn('target-value', 'Target needs an `x` or `y` value.')
    return null
  }
  if (resolved.kind !== 'linear' && resolved.kind !== 'time') {
    if (DEV) ctx.warn('target-scale', 'Target needs a linear or time scale on the axis it marks.')
    return null
  }
  const value =
    resolved.kind === 'time'
      ? (toTime(raw) ?? Number.NaN)
      : typeof raw === 'number'
        ? raw
        : Number.NaN
```

- in the `target-domain` warning, change `` `Target value ${value} is outside …` `` to `` `Target value ${String(raw)} is outside the chart domain and was not drawn.` ``

`Grid` rules the y ticks and `NearestPointer` works on registered points, so both work on a time x unchanged. `Bars` (through `computeBars`'s `bars-scales` warning) and `ColumnHighlight` (`column-highlight-scale`) already warn and draw nothing on any non-band scale; `time.test.tsx` pins both.

- [ ] **Step 6: The time axis**

In `packages/tally-charts/src/react/ChartsProvider.tsx`, add before `export interface UseFormatResult`:

```tsx
/** Internal: the provider's locale and currency, for formatters that aren't number presets. */
export function useLocale(): LocaleContextValue {
  return useContext(LocaleContext)
}
```

In `packages/tally-charts/src/react/marks/Axis.tsx`, replace the first three import lines with:

```tsx
import {
  autoTickLabels,
  createDateFormatter,
  type DateFormatSpec,
  isDateFormat,
} from '../../core/date'
import type { FormatPreset, FormatPresetSpec, Formatter } from '../../core/format'
import {
  categoryTicks,
  linearTicks,
  type Tick,
  type TickAnchor,
  type TickSpec,
  thinTicks,
} from '../../core/ticks'
import type { TimeScale } from '../../core/time'
import { useLocale } from '../ChartsProvider'
```

(the `../context` import stays). Insert before `export function Axis({`:

```tsx
/**
 * Ticks for a time scale. 'auto' (the default) writes multi-scale labels; another date spec
 * formats every tick alike; a function gets each tick as a Date. 'ends' labels the domain ends
 * in full. With `anchorEnds` (axes above or below the plot), a label on a plot edge is anchored
 * inward, as on a point scale with padding 0, so it doesn't run past the plot.
 */
function timeTicks(
  scale: TimeScale,
  spec: TickSpec,
  format: AxisFormat | undefined,
  locale: string,
  anchorEnds: boolean,
): Tick[] {
  const zone = scale.zone
  const ends = spec === 'ends'
  const values = ends ? scale.domain() : scale.ticks(typeof spec === 'number' ? spec : undefined)
  let labels: string[]
  if (typeof format === 'function') {
    labels = values.map((v) => format(new Date(v)))
  } else if (isDateFormat(format) && format !== 'auto') {
    labels = values.map(createDateFormatter(format, { locale, zone }))
  } else if (ends) {
    const [a, b] = scale.ticks()
    const step = a !== undefined && b !== undefined ? b - a : undefined
    labels = values.map(createDateFormatter('auto', { locale, zone, step }))
  } else {
    labels = autoTickLabels(values, { locale, zone })
  }
  const [r0, r1] = scale.range()
  const atEdge = (px: number, edge: number) => anchorEnds && Math.abs(px - edge) < 0.5
  return values.map((value, i) => {
    const position = scale(value)
    const anchor: TickAnchor = atEdge(position, Math.min(r0, r1))
      ? 'start'
      : atEdge(position, Math.max(r0, r1))
        ? 'end'
        : 'middle'
    return { value, position, label: labels[i] ?? '', anchor }
  })
}

```

In `Axis`, after `const custom = typeof format === 'function' ? format : undefined` add `const { locale } = useLocale()`, and change `if (resolved.kind === 'linear') {` to:

```tsx
  if (resolved.kind === 'time') {
    raw = timeTicks(resolved.scale, spec, format, locale, horizontal)
  } else if (resolved.kind === 'linear') {
```

- [ ] **Step 7: Export the time types; teach the dev-strip check the new warnings**

`packages/tally-charts/src/core/index.ts`: add `TimeScaleSpec,` to the `./scale` type export after `ScaleSpec,`, and after the `./ticks` exports add:

```ts
export type { TimeInput, TimeScale, TimeZone } from './time'
export { toTime } from './time'
```

`packages/tally-charts/src/index.ts`: replace `export type { BandScaleSpec, LinearScaleSpec, PointScaleSpec, ScaleSpec } from './core/scale'` with:

```ts
export type {
  BandScaleSpec,
  LinearScaleSpec,
  PointScaleSpec,
  ScaleSpec,
  TimeScaleSpec,
} from './core/scale'
```

and add `export type { TimeInput, TimeZone } from './core/time'` after the `./core/ticks` export.

`packages/tally-charts/scripts/check-dev-strip.mjs`: in `phrases`, replace `'Target needs a linear scale',` with `'Target needs a linear or time scale',`, and add after `'Target value',`:

```js
  'skipped an x value that is not a date',
  'has no valid dates',
```

- [ ] **Step 8: Run the tests and checks**

Run: `pnpm --filter tally-charts exec vitest run src/core/scale.test.ts src/react/marks src/index.test.ts`
Expected: PASS.

Run: `pnpm test && pnpm typecheck && pnpm lint && pnpm build && pnpm size && pnpm --filter tally-charts check:dev-strip`
Expected: all PASS (748 tests). check:dev-strip reports `16/16 phrases`. Record the sizes: every chart now bundles d3-time (about 1.3 kB). LineChart is near 11.4 kB and still under its current 15 KB limit; Task 6 sets the 12 KB budget.

- [ ] **Step 9: Commit**

```bash
pnpm format
git add packages/tally-charts
git commit -m "feat: time scales on <Chart> for Axis, Line, Band, Area, Region and Target

Co-Authored-By: <your own model trailer>"
```

---

### Task 6: `LineChart` on a time axis; `yAxis` / `yAxisFormat` / `xAxisFormat` (spec §2; API-5)

**Files:**
- Modify: `packages/tally-charts/src/react/charts/LineChart.tsx`, `packages/tally-charts/src/react/charts/LineChart.test.tsx`
- Modify: `packages/tally-charts/.size-limit.json`
- Modify: `apps/storybook/stories/MarginOutlook.stories.tsx`

**Interfaces:**
- Consumes: Task 5's `TimeScaleSpec`, `toTime`, `Region` (TimeInput) and `useLocale`; Task 4's `createDateFormatter`, `isDateFormat` and `AxisFormat`; `DAY` (Task 3).
- Produces (`LineChartProps<D>`):
  - `x: Accessor<D, string | number> | (TimeScaleSpec<D> & { field: Accessor<D, TimeInput> })`
  - `yAxis?: TickSpec | 'none'` (was `axis`)
  - `yAxisFormat?: AxisFormat` (was `axisFormat`)
  - `xAxisFormat?: AxisFormat` (new). On time it formats tooltip headers, announcements and table x cells too; on categories a function does.
  - `forecastFrom?: TimeInput`
- On a time axis, point ids are ISO strings (`'2026-01-04T00:00:00.000Z'`) and rows are sorted by date.

- [ ] **Step 1: Write the failing tests**

In `packages/tally-charts/src/react/charts/LineChart.test.tsx`, in `it('turns off the grid, the axes and the tooltip', …)` change `axis: 'none',` to `yAxis: 'none',`. Then append:

```tsx
describe('<LineChart> axis props', () => {
  it('formats the value axis with yAxisFormat and the x axis and headers with xAxisFormat', () => {
    const { container } = renderLines({
      yAxis: 2,
      yAxisFormat: (v) => `${v} pct`,
      xAxisFormat: (v) => String(v).toUpperCase(),
      activeId: 'Aug',
    })
    const labels = parts(container, 'axis-label').map((el) => el.textContent)
    expect(labels).toEqual(['30 pct', '35 pct', '40 pct', 'JUN', 'JUL', 'AUG', 'SEP'])
    expect(tooltip(container)).toHaveTextContent(/^AUG35\.0%on the current path/)
  })
})

type Reading = { at: string | Date | null; actual: number | null; plan: number | null }
const readings: Reading[] = [
  { at: '2026-01-01', actual: 34, plan: null },
  { at: '2026-01-02', actual: 32, plan: 32 },
  { at: '2026-01-04', actual: null, plan: 35 },
]
const readingSeries: LineSeries<Reading>[] = [
  { id: 'actual', label: 'Actual', value: 'actual' },
  { id: 'plan', label: 'Plan', value: 'plan', style: 'forecast' },
]
const JAN_4 = '2026-01-04T00:00:00.000Z'

// 400 × 100 with no margin over Jan 1 – Jan 5: 100px per day; y = 100 − 10 × (v − 30).
function renderTimeLines(props: Partial<LineChartProps<Reading>> = {}) {
  return render(
    <LineChart<Reading>
      data={readings}
      x={{ type: 'time', field: 'at', domain: ['2026-01-01', '2026-01-05'] }}
      series={readingSeries}
      domain={[30, 40]}
      format="percent"
      width={400}
      height={100}
      margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
      title="Readings"
      animate={false}
      {...props}
    />,
  )
}

describe('<LineChart> on a time axis', () => {
  it('draws the series at their dates and labels the axis with dates', () => {
    const { container } = renderTimeLines()
    const [plan, actual] = groups(container)
    expect(pathOf(actual)).toHaveAttribute('d', 'M0,60L100,80')
    expect(pathOf(plan)).toHaveAttribute('d', 'M100,80L300,50')
    const labels = parts(container, 'axis-label').map((el) => el.textContent)
    expect(labels.slice(-5)).toEqual(['Jan 1, 2026', 'Jan 2', 'Jan 3', 'Jan 4', 'Jan 5'])
  })

  it('uses ISO ids and writes dates in the tooltip, the announcements and the table', () => {
    const { container, unmount } = renderTimeLines({ activeId: JAN_4 })
    expect(tooltip(container)).toHaveTextContent(/^Jan 4, 202635\.0%Plan$/)
    expect(parts(container, 'dot-ring').map((r) => r.getAttribute('cx'))).toEqual(['300'])
    unmount()
    const again = renderTimeLines()
    fireEvent.keyDown(screen.getByRole('figure', { name: 'Readings' }), { key: 'End' })
    expect(live(again.container)).toBe('Jan 4, 2026, 35.0% Plan')
    const table = screen.getByRole('table', { name: 'Readings' })
    expect(
      within(table)
        .getAllByRole('row')
        .map((row) => row.firstElementChild?.textContent),
    ).toEqual(['at', 'Jan 1, 2026', 'Jan 2, 2026', 'Jan 4, 2026'])
  })

  it('formats dates with xAxisFormat everywhere', () => {
    const { container } = renderTimeLines({ xAxisFormat: 'month', activeId: JAN_4, xAxis: 2 })
    expect(tooltip(container)).toHaveTextContent(/^Jan 202635\.0%Plan$/)
    const labels = parts(container, 'axis-label').map((el) => el.textContent)
    expect(labels.slice(-3)).toEqual(['Jan 2026', 'Jan 2026', 'Jan 2026'])
  })

  it('sorts rows by date, skips invalid dates and repeats with one warning each', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { container } = renderTimeLines({
      data: [
        readings[2] as Reading,
        { at: 'someday', actual: 39, plan: null },
        readings[0] as Reading,
        { at: null, actual: 39, plan: null },
        readings[1] as Reading,
        { at: new Date(Date.UTC(2026, 0, 2)), actual: 39, plan: null },
      ],
    })
    const [plan, actual] = groups(container)
    expect(pathOf(actual)).toHaveAttribute('d', 'M0,60L100,80')
    expect(pathOf(plan)).toHaveAttribute('d', 'M100,80L300,50')
    expect(warn).toHaveBeenCalledTimes(2)
    expect(warn.mock.calls[0]?.[0]).toContain('not a date at index 1')
    expect(warn.mock.calls[1]?.[0]).toContain('repeated x value "2026-01-02T00:00:00.000Z"')
  })

  it('shades the forecast from halfway after the last date before it', () => {
    const { container } = renderTimeLines({ forecastFrom: '2026-01-04' })
    // Halfway between Jan 2 and Jan 4 is Jan 3, at 200px.
    expect(parts(container, 'region')[0]).toHaveAttribute('x', '200')
    expect(parts(container, 'region')[0]).toHaveAttribute('width', '200')
  })

  it('snaps the pointer to the nearest date', () => {
    const onActiveChange = vi.fn()
    const { container } = renderTimeLines({ onActiveChange })
    const layer = container.querySelector('[data-ch-part="pointer-layer"]') as Element
    fireEvent.pointerMove(layer, { clientX: 260, clientY: 50 })
    expect(onActiveChange).toHaveBeenLastCalledWith(
      JAN_4,
      expect.objectContaining({ datum: readings[2] }),
    )
  })

  it('centres a single date without NaN and still snaps the pointer to it', () => {
    const onActiveChange = vi.fn()
    const { container } = renderTimeLines({
      data: [readings[0] as Reading],
      x: { type: 'time', field: 'at' },
      onActiveChange,
    })
    // One date is padded by a day on each side: Dec 31 – Jan 2, with Jan 1 in the middle.
    expect(parts(container, 'line-dot').map((d) => d.getAttribute('cx'))).toEqual(['200'])
    expect(container.innerHTML).not.toContain('NaN')
    const layer = container.querySelector('[data-ch-part="pointer-layer"]') as Element
    fireEvent.pointerMove(layer, { clientX: 205, clientY: 50 })
    expect(onActiveChange).toHaveBeenLastCalledWith('2026-01-01T00:00:00.000Z', expect.anything())
  })

  it('writes dates in the local zone when asked', () => {
    // 22:30 UTC on Mar 29 is already Mar 30 in Europe/Warsaw (vitest.config.ts).
    const { container } = renderTimeLines({
      data: [{ at: '2026-03-29T22:30:00Z', actual: 33, plan: null }],
      x: { type: 'time', field: 'at', zone: 'local' },
      xAxisFormat: 'day',
      activeId: '2026-03-29T22:30:00.000Z',
    })
    expect(tooltip(container)).toHaveTextContent(/^Mar 30, 202633\.0%Actual$/)
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter tally-charts exec vitest run src/react/charts/LineChart.test.tsx`
Expected: FAIL. The time tests draw no lines (an object `x` is read as an accessor), and `yAxisFormat` and `xAxisFormat` are ignored. (`pnpm typecheck` would also reject the unknown props.)

- [ ] **Step 3: Rewrite `LineChart`**

Replace `packages/tally-charts/src/react/charts/LineChart.tsx` with:

```tsx
import { useMemo } from 'react'
import { resolveAccessor } from '../../core/accessor'
import { createDateFormatter, isDateFormat } from '../../core/date'
import type { FormatSpec, Formatter } from '../../core/format'
import { clampToRange, niceDomain } from '../../core/linear'
import {
  categoryCenter,
  categoryStep,
  inferLinearDomain,
  type TimeScaleSpec,
} from '../../core/scale'
import type { TickSpec } from '../../core/ticks'
import { DAY, type TimeInput, toTime } from '../../core/time'
import type { Accessor, Tone } from '../../core/types'
import { createWarner, DEV } from '../../core/warn'
import { Chart } from '../Chart'
import { useFormat, useLocale } from '../ChartsProvider'
import { type Margin, useChart } from '../context'
import type { DataTableColumn, DataTableSpec } from '../DataTable'
import { Axis, type AxisFormat } from '../marks/Axis'
import { Band } from '../marks/Band'
import { Grid } from '../marks/Grid'
import { Line } from '../marks/Line'
import { NearestPointer } from '../marks/NearestPointer'
import { Region } from '../marks/Region'
import { Target } from '../marks/Target'
import { Tooltip } from '../overlays/Tooltip'
import type { ChartPoint, TooltipSegment } from '../types'
import { useRegisterPoints } from '../useRegisterPoints'
import { type ChartPassThroughProps, headerOf, toNumber, userCallbacks } from './shared'

export type LineSeriesStyle = 'actual' | 'forecast' | 'scenario'

export interface LineSeries<D> {
  /** Stable key of the series; unique within the chart. */
  id: string
  /** Legend and data-table name, e.g. "Current path". */
  label: string
  value: Accessor<D, number>
  /** Default 'gain' for a scenario, otherwise 'accent'. */
  tone?: Tone
  /**
   * 'actual': solid with filled dots. 'forecast': dashed with hollow dots. 'scenario': dashed with
   * filled dots. Default 'actual'. A forecast that continues the actuals repeats the last actual
   * value at that x, so the lines join.
   */
  style?: LineSeriesStyle
  /** Text after the value in the tooltip, e.g. "on the current path". Default: `label`. */
  tooltipLabel?: string
}

export interface LineRange<D> {
  low: Accessor<D, number>
  high: Accessor<D, number>
  /** Data-table header. Default "Range". */
  label?: string
  /** Default 'accent'. */
  tone?: Tone
}

export interface LineChartProps<D> extends Omit<ChartPassThroughProps<unknown>, 'aspectRatio'> {
  data: readonly D[]
  /**
   * The x of each row. An accessor puts categories on a point scale: each value appears once,
   * repeats are skipped, and point ids are the values as strings, so `1` and `'1'` are the same
   * x. A time scale spec with a `field` puts dates on a time axis instead: rows are sorted by
   * date, rows with the same epoch ms are repeats, and point ids are ISO strings.
   */
  x: Accessor<D, string | number> | (TimeScaleSpec<D> & { field: Accessor<D, TimeInput> })
  series: readonly LineSeries<D>[]
  /** A soft band between two values, e.g. the likely range of a forecast. */
  band?: LineRange<D>
  /**
   * Shade from here to the end, e.g. the first forecast month: a category, or a date on a time
   * axis. The shading starts halfway between it and the x before it.
   */
  forecastFrom?: TimeInput
  target?: number | { value: number; label?: string }
  /**
   * Value domain. Default: every series, the band and the target, rounded to nice ticks; zero
   * isn't forced.
   */
  domain?: readonly [number, number]
  /** Default 'number'. */
  format?: FormatSpec
  /** Value axis ticks, or 'none'. The grid follows them. Default 'all' (about 5). */
  yAxis?: TickSpec | 'none'
  /** Value axis labels. Default: `format`. */
  yAxisFormat?: AxisFormat
  /** x axis ticks, or 'none'. Default 'all'. */
  xAxis?: TickSpec | 'none'
  /**
   * x axis labels; tooltip headers, announcements and the data table's x cells use the same
   * format. Default: the category itself, or 'auto' dates on a time axis.
   */
  xAxisFormat?: AxisFormat
  /** Horizontal grid lines at the value ticks ('all' when `yAxis` is 'none'). Default true. */
  grid?: boolean
  /** Dot radius in px. Default 4. */
  radius?: number
  /** Hidden data table for screen readers. Default true. */
  dataTable?: boolean
  /** Default true. */
  tooltip?: boolean
}

interface LineRow<D> {
  /** Point id: the category as a string, or the date as an ISO string. */
  key: string
  /** Epoch ms on a time axis; NaN on a category axis. */
  time: number
  /** The x as people read it: the formatted category or date. */
  label: string
  datum: D
  index: number
  /** One value per series, NaN when missing. */
  values: number[]
  low: number
  high: number
}

const MARGIN: Margin = { top: 24, right: 16, bottom: 32, left: 44 }

function styleOf<D>(s: LineSeries<D>): LineSeriesStyle {
  return s.style ?? 'actual'
}

function toneOf<D>(s: LineSeries<D>): Tone {
  return s.tone ?? (styleOf(s) === 'scenario' ? 'gain' : 'accent')
}

/** One point per x, carrying every series with a value there; snaps the pointer along x. */
function LinePoints<D>(props: {
  rows: readonly LineRow<D>[]
  series: readonly LineSeries<D>[]
  fmt: Formatter
  radius: number
}) {
  const ctx = useChart('LineChart')
  const linear = ctx.y.kind === 'linear' ? ctx.y.scale : undefined
  const xScale = ctx.x
  const xOf = (row: LineRow<D>) =>
    xScale.kind === 'time' ? xScale.scale(row.time) : categoryCenter(xScale, row.key)
  const points: ChartPoint[] = linear
    ? props.rows.flatMap((row, index): ChartPoint[] => {
        const x = xOf(row)
        if (x === undefined) return []
        // Forecasts repeat the last actual at the join; there the actual is listed once.
        const actualHere = props.series.some(
          (s, i) => styleOf(s) === 'actual' && Number.isFinite(row.values[i] ?? Number.NaN),
        )
        const shown = props.series.flatMap((s, i) => {
          const value = row.values[i] ?? Number.NaN
          if (!Number.isFinite(value) || (actualHere && styleOf(s) !== 'actual')) return []
          return [{ text: props.fmt(value), label: s.tooltipLabel ?? s.label, tone: toneOf(s) }]
        })
        if (shown.length === 0) return []
        const top = Math.min(
          ...row.values.filter(Number.isFinite).map((v) => clampToRange(linear, linear(v))),
        )
        const segments: TooltipSegment[] = [
          { value: row.label },
          ...shown.map((s) => ({
            value: s.text,
            label: s.label,
            tone: s.tone === 'accent' ? undefined : s.tone,
          })),
        ]
        return [
          {
            id: row.key,
            index,
            datum: row,
            x,
            y: top - props.radius,
            hitX: x,
            hitY: top,
            label: [row.label, ...shown.map((s) => `${s.text} ${s.label}`)].join(', '),
            segments,
          },
        ]
      })
    : []
  useRegisterPoints(ctx, points)
  // Half the smallest gap between neighbouring x values: categories are a step apart, dates
  // can be anything.
  let gap = categoryStep(xScale)
  if (xScale.kind === 'time') {
    gap = Number.POSITIVE_INFINITY
    for (let i = 1; i < points.length; i++) {
      gap = Math.min(gap, (points[i]?.x ?? 0) - (points[i - 1]?.x ?? 0))
    }
  }
  return <NearestPointer axis="x" radius={Math.max(12, Number.isFinite(gap) ? gap / 2 : 0)} />
}

export function LineChart<D>({
  data,
  x,
  series,
  band,
  forecastFrom,
  target,
  domain,
  format,
  yAxis = 'all',
  yAxisFormat,
  xAxis = 'all',
  xAxisFormat,
  grid = true,
  radius = 4,
  dataTable = true,
  tooltip = true,
  margin,
  height,
  children,
  onSelect,
  onActiveChange,
  ...chart
}: LineChartProps<D>) {
  const { create } = useFormat()
  const { locale } = useLocale()
  const warn = useMemo(() => createWarner(), [])
  const fmt = useMemo(() => create(format), [create, format])
  const timeX = typeof x === 'object' ? x : undefined
  const zone = timeX?.zone ?? 'utc'

  const rows = useMemo(() => {
    const getX = resolveAccessor(timeX ? timeX.field : (x as Accessor<D, string | number>))
    const getters = series.map((s) => resolveAccessor(s.value))
    const getLow = band ? resolveAccessor(band.low) : undefined
    const getHigh = band ? resolveAccessor(band.high) : undefined
    const seen = new Set<string>()
    const all = data.flatMap((d, i): LineRow<D>[] => {
      const raw = getX(d, i)
      const time = timeX ? toTime(raw) : Number.NaN
      const key =
        time === undefined
          ? ''
          : timeX
            ? new Date(time).toISOString()
            : raw === null || raw === undefined
              ? ''
              : String(raw)
      if (key === '') {
        if (DEV) {
          warn(
            'line-x-missing',
            timeX
              ? `LineChart skipped an x value that is not a date at index ${i}.`
              : `LineChart skipped a missing x value at index ${i}.`,
          )
        }
        return []
      }
      if (seen.has(key)) {
        if (DEV) {
          warn('line-x-repeated', `LineChart skipped a repeated x value "${key}" at index ${i}.`)
        }
        return []
      }
      seen.add(key)
      return [
        {
          key,
          time: time ?? Number.NaN,
          label: key,
          datum: d,
          index: i,
          values: getters.map((get) => toNumber(get(d, i))),
          low: getLow ? toNumber(getLow(d, i)) : Number.NaN,
          high: getHigh ? toNumber(getHigh(d, i)) : Number.NaN,
        },
      ]
    })
    // Dates draw and step left to right, whatever order the data has. Sort is stable.
    return timeX ? all.sort((a, b) => a.time - b.time) : all
  }, [data, x, timeX, series, band, warn])

  // The x as people read it, shared by the axis, the tooltip, announcements and the table.
  const xLabel = useMemo((): ((row: LineRow<D>) => string) => {
    if (typeof xAxisFormat === 'function') {
      return (row) => xAxisFormat(timeX ? new Date(row.time) : row.key)
    }
    if (!timeX) return (row) => row.key
    let step = Number.POSITIVE_INFINITY
    for (let i = 1; i < rows.length; i++) {
      step = Math.min(step, (rows[i]?.time ?? 0) - (rows[i - 1]?.time ?? 0))
    }
    const spec = isDateFormat(xAxisFormat) ? xAxisFormat : 'auto'
    const date = createDateFormatter(spec, {
      locale,
      zone,
      step: Number.isFinite(step) ? step : DAY,
    })
    return (row) => date(row.time)
  }, [xAxisFormat, timeX, rows, locale, zone])
  const labelled = useMemo(() => rows.map((r) => ({ ...r, label: xLabel(r) })), [rows, xLabel])

  const targetSpec = typeof target === 'number' ? { value: target } : target
  // The target counts toward the inferred domain, so a goal above or below the data is drawn.
  const resolvedDomain =
    domain ??
    niceDomain(
      inferLinearDomain(
        [...rows.flatMap((r) => [...r.values, r.low, r.high]), targetSpec?.value ?? Number.NaN],
        false,
      ),
    )
  if (DEV) {
    const ids = new Set<string>()
    for (const s of series) {
      if (ids.has(s.id)) {
        warn(
          'line-series-id',
          `LineChart has a repeated series id "${s.id}"; give each series its own id.`,
        )
      }
      ids.add(s.id)
    }
  }
  // Actual lines last, so their filled dots sit on top where the forecasts join them.
  const ordered = series
    .map((s, i) => ({ s, i }))
    .sort((a, b) => Number(styleOf(a.s) === 'actual') - Number(styleOf(b.s) === 'actual'))
  const valueFormat: AxisFormat | undefined = yAxisFormat ?? format
  const m: Margin = { ...MARGIN, ...margin }

  // On a time axis the shading starts halfway between the forecast's first date and the date
  // before it, as it does between categories.
  let regionFrom = forecastFrom
  const fromTime = timeX && forecastFrom !== undefined ? toTime(forecastFrom) : undefined
  if (fromTime !== undefined) {
    const before = rows.filter((r) => r.time < fromTime).at(-1)
    regionFrom = before ? (before.time + fromTime) / 2 : fromTime
  }

  let table: DataTableSpec<LineRow<D>> | undefined
  if (dataTable) {
    const columns: DataTableColumn<LineRow<D>>[] = [
      {
        header: timeX ? headerOf(timeX.field, 'Date') : headerOf(x, 'Category'),
        value: (r) => r.label,
      },
      ...series.map(
        (s, i): DataTableColumn<LineRow<D>> => ({
          header: s.label,
          value: (r) => fmt(r.values[i] ?? Number.NaN),
        }),
      ),
    ]
    if (band) {
      columns.push({
        header: band.label ?? 'Range',
        value: (r) =>
          Number.isFinite(r.low) && Number.isFinite(r.high) ? `${fmt(r.low)}–${fmt(r.high)}` : '',
      })
    }
    table = { columns }
  }
  const xField = timeX ? 'time' : 'key'

  return (
    <Chart<LineRow<D>>
      {...chart}
      {...userCallbacks(onSelect, onActiveChange)}
      data={labelled}
      x={
        timeX
          ? { type: 'time', field: 'time', domain: timeX.domain, nice: timeX.nice, zone }
          : { type: 'point', field: 'key' }
      }
      y={{ domain: resolvedDomain }}
      margin={m}
      height={height ?? 280}
      dataTable={table}
    >
      {regionFrom !== undefined ? <Region from={regionFrom} /> : null}
      {grid ? <Grid ticks={yAxis === 'none' ? 'all' : yAxis} /> : null}
      {targetSpec ? (
        <Target y={targetSpec.value} label={targetSpec.label} labelPosition="start" />
      ) : null}
      {band ? <Band<LineRow<D>> x={xField} low="low" high="high" tone={band.tone} /> : null}
      {ordered.map(({ s, i }) => (
        <Line<LineRow<D>>
          // Index first: repeated series ids still get distinct keys.
          key={`${i}:${s.id}`}
          x={xField}
          y={(r) => r.values[i] ?? Number.NaN}
          tone={toneOf(s)}
          dashed={styleOf(s) !== 'actual'}
          dots={styleOf(s) === 'forecast' ? 'hollow' : 'filled'}
          radius={radius}
        />
      ))}
      <LinePoints rows={labelled} series={series} fmt={fmt} radius={radius} />
      {yAxis === 'none' ? null : <Axis side="left" ticks={yAxis} format={valueFormat} />}
      {xAxis === 'none' ? null : <Axis side="bottom" ticks={xAxis} format={xAxisFormat} />}
      {tooltip ? <Tooltip /> : null}
      {children}
    </Chart>
  )
}
```

What changed, so a reviewer can follow:
- Rows carry `time` (epoch ms, NaN on categories) and `label` (the x as people read it). On a time axis `key` is the ISO string. Invalid dates warn `line-x-missing` ("… not a date at index i"), and rows are sorted by `time`.
- `xLabel` is the one formatter for the tooltip header, the announcement and the table's x cells. It is `xAxisFormat` when that is a function; on a time axis it is otherwise the date spec, or `'auto'` at the smallest gap between rows (a single row uses a day).
- `LinePoints` places points with the time scale on a time axis. Its `NearestPointer` radius is half the smallest pixel gap between points, at least 12.
- `forecastFrom` on a time axis starts the region halfway between the last row before it and itself, as `Region` does between categories.
- `axis` → `yAxis`, `axisFormat` → `yAxisFormat`; the bottom axis gets `format={xAxisFormat}`.

- [ ] **Step 4: Update the story for the rename**

In `apps/storybook/stories/MarginOutlook.stories.tsx`, change `axisFormat={(v) => \`${v}%\`}` to `yAxisFormat={(v) => \`${v}%\`}`.

- [ ] **Step 5: Set the LineChart budget**

In `packages/tally-charts/.size-limit.json`, change the `"LineChart"` entry's `"limit": "15 KB"` to `"limit": "12 KB"` (spec §1: "LineChart (with time) ≤ 12 KB").

- [ ] **Step 6: Run the tests and checks**

Run: `pnpm --filter tally-charts exec vitest run src/react/charts/LineChart.test.tsx`
Expected: PASS (29 tests).

Run: `pnpm test && pnpm typecheck && pnpm lint && pnpm build && pnpm size`
Expected: all PASS (757 tests). LineChart is about 11.85 kB against 12 kB. If it is over, stop and report BLOCKED with the number; never raise the limit.

- [ ] **Step 7: Commit**

```bash
pnpm format
git add packages/tally-charts apps/storybook/stories/MarginOutlook.stories.tsx
git commit -m "feat(LineChart)!: time x axis; axis/axisFormat become yAxis/yAxisFormat, add xAxisFormat

Co-Authored-By: <your own model trailer>"
```

---

### Task 7: A public `ChartContextValue`, `useChart()` and `useRegisterPoints(points)` (API-3)

**Files:**
- Modify: `packages/tally-charts/src/react/context.ts`, `packages/tally-charts/src/react/useRegisterPoints.ts`, `packages/tally-charts/src/react/interaction.ts`, `packages/tally-charts/src/react/Chart.tsx`
- Modify: every mark, overlay and chart that calls `useChart('…')` (24 files, by the command in Step 4)
- Modify: `packages/tally-charts/src/react/Chart.test.tsx`, `packages/tally-charts/src/react/marks/Line.test.tsx`, `packages/tally-charts/src/react/marks/NearestPointer.test.tsx`
- Modify: `packages/tally-charts/src/index.ts`

**Interfaces:**
- Consumes: `ResolvedScale`, `FieldScale` (Tasks 1, 5); `LinearScale`, `BandScale`, `PointScale`, `TimeScale`.
- Produces:
  - `interface ChartContextValue`, public, with exactly these fields: `width`, `height`, `innerWidth`, `innerHeight`, `margin`, `data`, `x: ResolvedScale`, `y: ResolvedScale`, `format`, `dimInactive`, `activeId`, `activePoint`, `points: readonly ChartPoint[]`, `setActive`, `select`, `selectable` and `overlay`.
  - `interface InternalChartContext extends ChartContextValue { chartId; x: FieldScale; y: FieldScale; warn: Warn; radius: number; registerPoints(key, points: readonly ChartPoint[]); unregisterPoints(key) }`, internal
  - `useChartContext(component: string): InternalChartContext`, internal; throws `[tally-charts] <component> must be rendered inside <Chart>.`
  - `useChart(): ChartContextValue`, public; throws `[tally-charts] <useChart> must be rendered inside <Chart>.`
  - `useRegisterPoints(points: readonly ChartPoint[]): void`
  - The root also exports the types `ResolvedScale`, `LinearScale`, `BandScale`, `PointScale`, `TimeScale` and `FormatOptions`.

- [ ] **Step 1: Write the failing tests**

In `packages/tally-charts/src/react/Chart.test.tsx`:
- replace the first imports

```tsx
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Id } from '../core/types'
import { Chart } from './Chart'
import { type ChartContextValue, useChart } from './context'
```

with

```tsx
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, expectTypeOf, it, vi } from 'vitest'
import type { Id } from '../core/types'
import { Chart } from './Chart'
import {
  type ChartContextValue,
  type InternalChartContext,
  useChart,
  useChartContext,
} from './context'
```

- the probes read the internal context, and `PointsProbe` stops passing `ctx`:

```tsx
function Probe({ onContext }: { onContext: (ctx: InternalChartContext) => void }) {
  onContext(useChartContext('Probe'))
  return null
}

function PointsProbe({ ids }: { ids: Id[] }) {
  useRegisterPoints(
    ids.map((id, index) => ({
```

(keep the rest of `PointsProbe` as it is)
- change every `let ctx: ChartContextValue | undefined` in the file to `let ctx: InternalChartContext | undefined`
- insert before `it('throws when a building block is rendered outside <Chart>', …)`:

```tsx
  it('gives custom marks the public context through useChart()', () => {
    let ctx: ChartContextValue | undefined
    function Custom() {
      ctx = useChart()
      return null
    }
    render(
      <Chart data={weeks} width={400} x={{ type: 'band', field: 'week' }} y={{ domain: [0, 40] }}>
        <Custom />
      </Chart>,
    )
    expect(ctx?.innerWidth).toBe(400)
    expect(ctx?.x.kind).toBe('band')
    expect(ctx?.format('percent')(34)).toBe('34.0%')
    expectTypeOf<keyof ChartContextValue>().toEqualTypeOf<
      | 'width'
      | 'height'
      | 'innerWidth'
      | 'innerHeight'
      | 'margin'
      | 'data'
      | 'x'
      | 'y'
      | 'format'
      | 'dimInactive'
      | 'activeId'
      | 'activePoint'
      | 'points'
      | 'setActive'
      | 'select'
      | 'selectable'
      | 'overlay'
    >()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<Custom />)).toThrow(
      '[tally-charts] <useChart> must be rendered inside <Chart>.',
    )
  })

  it('registers points with useRegisterPoints(points) alone', () => {
    const onActiveChange = vi.fn()
    render(
      <Chart width={400} title="Probe" onActiveChange={onActiveChange}>
        <PointsProbe ids={['a', 'b']} />
      </Chart>,
    )
    fireEvent.keyDown(screen.getByRole('figure', { name: 'Probe' }), { key: 'End' })
    expect(onActiveChange).toHaveBeenLastCalledWith(
      'b',
      expect.objectContaining({ label: 'Week b' }),
    )
  })
```

The `expectTypeOf` line is checked by `pnpm typecheck`, which compiles the tests: an extra or a missing field fails it.

In `packages/tally-charts/src/react/marks/Line.test.tsx` and `packages/tally-charts/src/react/marks/NearestPointer.test.tsx`, delete `import { useChart } from '../context'`, delete the line `const ctx = useChart('Points')`, and delete the `ctx,` argument line of `useRegisterPoints(`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter tally-charts exec vitest run src/react/Chart.test.tsx src/react/marks/Line.test.tsx src/react/marks/NearestPointer.test.tsx`
Expected: FAIL. `useChartContext` isn't exported, and `useRegisterPoints` reads its points from the first argument.

- [ ] **Step 3: Split the context**

Replace `packages/tally-charts/src/react/context.ts` with:

```ts
import { createContext, useContext } from 'react'
import type { FormatOptions, FormatSpec, Formatter } from '../core/format'
import type { FieldScale, ResolvedScale } from '../core/scale'
import type { Id } from '../core/types'
import type { Warn } from '../core/warn'
import type { ActiveSource, ChartPoint } from './types'

export interface Margin {
  top: number
  right: number
  bottom: number
  left: number
}

/** What `useChart()` gives a custom mark: the chart's size, scales, formatter and active point. */
export interface ChartContextValue {
  width: number
  height: number
  /** Plot width: `width` minus the left and right margins. */
  innerWidth: number
  /** Plot height: `height` minus the top and bottom margins. */
  innerHeight: number
  margin: Margin
  data: readonly unknown[]
  x: ResolvedScale
  y: ResolvedScale
  /** A number formatter in the `ChartsProvider` locale. */
  format: (spec?: FormatSpec, options?: Pick<FormatOptions, 'signed'>) => Formatter
  dimInactive: boolean
  activeId: Id | null
  activePoint: ChartPoint | null
  /** Every point the chart's marks registered, in order. */
  points: readonly ChartPoint[]
  setActive: (id: Id | null, source: ActiveSource) => void
  /** Calls the chart's `onSelect` with this point; does nothing without `onSelect`. */
  select: (point: ChartPoint) => void
  /** True when the chart has an `onSelect` handler. */
  selectable: boolean
  /** HTML layer positioned at the plot origin; null until mounted. */
  overlay: HTMLDivElement | null
}

/** Internal: the context the library's own marks read. Not part of the public API. */
export interface InternalChartContext extends ChartContextValue {
  chartId: string
  x: FieldScale
  y: FieldScale
  warn: Warn
  /** Default bar corner radius in px, from `--ch-radius`. */
  radius: number
  registerPoints: (key: string, points: readonly ChartPoint[]) => void
  unregisterPoints: (key: string) => void
}

export const ChartContext = createContext<InternalChartContext | null>(null)

/** Internal: the full chart context; `component` names the caller in the error. */
export function useChartContext(component: string): InternalChartContext {
  const ctx = useContext(ChartContext)
  if (!ctx) throw new Error(`[tally-charts] <${component}> must be rendered inside <Chart>.`)
  return ctx
}

/** The surrounding chart's size, scales and interaction state, for custom marks. */
export function useChart(): ChartContextValue {
  return useChartContext('useChart')
}
```

Replace `packages/tally-charts/src/react/useRegisterPoints.ts` with:

```ts
import { useId } from 'react'
import { useChartContext } from './context'
import type { ChartPoint } from './types'
import { useIsoLayoutEffect } from './useIsoLayoutEffect'

/**
 * Registers a mark's points with the surrounding chart, for hover, keyboard navigation and
 * tooltips. Pass the same array while the points don't change (memoize it), so the chart
 * doesn't re-render on every pass.
 */
export function useRegisterPoints(points: readonly ChartPoint[]): void {
  const key = useId()
  const { registerPoints, unregisterPoints } = useChartContext('useRegisterPoints')
  useIsoLayoutEffect(() => {
    registerPoints(key, points)
  }, [key, points, registerPoints])
  useIsoLayoutEffect(() => () => unregisterPoints(key), [key, unregisterPoints])
}
```

In `packages/tally-charts/src/react/interaction.ts`, registered points become readonly:
- `registerPoints: (key: string, points: ChartPoint[]) => void` → `registerPoints: (key: string, points: readonly ChartPoint[]) => void`
- `useState<Record<string, ChartPoint[]>>({})` → `useState<Record<string, readonly ChartPoint[]>>({})`
- `useCallback((key: string, next: ChartPoint[]) => {` → `useCallback((key: string, next: readonly ChartPoint[]) => {`

In `packages/tally-charts/src/react/Chart.tsx`, change `import { ChartContext, type ChartContextValue, type Margin } from './context'` to `import { ChartContext, type InternalChartContext, type Margin } from './context'`, and `const ctx: ChartContextValue = {` to `const ctx: InternalChartContext = {`.

- [ ] **Step 4: Point the library's own marks at the internal context**

Run from the repo root:

```bash
cd packages/tally-charts && grep -rlE "useChart\('|useRegisterPoints\(ctx" src | grep -v '\.test\.' | xargs perl -0pi -e "s/useChart\('([A-Za-z]+)'\)/useChartContext('\$1')/g; s/useRegisterPoints\(ctx, /useRegisterPoints(/g; s/import \{ type Margin, useChart \} from '\.\.\/context'/import { type Margin, useChartContext } from '..\/context'/g; s/import \{ useChart \} from '\.\.\/context'/import { useChartContext } from '..\/context'/g; s/import \{ type ChartContextValue, useChart \} from '\.\.\/context'/import { type InternalChartContext, useChartContext } from '..\/context'/g; s/ctx: ChartContextValue,/ctx: InternalChartContext,/g" && perl -0pi -e "s/import type \{ ChartContextValue \} from '\.\.\/context'/import type { InternalChartContext } from '..\/context'/g; s/ctx: ChartContextValue,/ctx: InternalChartContext,/g" src/react/marks/series.ts && cd ../..
```

Expected: `git diff --stat` lists 24 files under `src/react/{marks,overlays,charts}`, each with `useChart('X')` → `useChartContext('X')`, the matching import, and `useRegisterPoints(ctx, …)` → `useRegisterPoints(…)` in `Bars.tsx`, `Dots.tsx`, `WaffleColumns.tsx` and `LineChart.tsx`. `Axis.tsx` and `series.ts` type their helper's `ctx` as `InternalChartContext`. Then run `grep -rn "useChart(" packages/tally-charts/src --include='*.tsx' --include='*.ts'`. Expected: only `context.ts` (its definition), `Chart.test.tsx` and a doc comment in `core/scale.ts`.

- [ ] **Step 5: Re-export the scale interfaces**

In `packages/tally-charts/src/index.ts`:
- add `FormatOptions,` as the first name in the `./core/format` type export
- replace the `./core/scale` type export with:

```ts
export type { LinearScale } from './core/linear'
export type {
  BandScale,
  BandScaleSpec,
  LinearScaleSpec,
  PointScale,
  PointScaleSpec,
  ResolvedScale,
  ScaleSpec,
  TimeScaleSpec,
} from './core/scale'
```

- change `export type { TimeInput, TimeZone } from './core/time'` to `export type { TimeInput, TimeScale, TimeZone } from './core/time'`

- [ ] **Step 6: Run the tests and checks**

Run: `pnpm --filter tally-charts exec vitest run src/react`
Expected: PASS.

Run: `pnpm test && pnpm typecheck && pnpm lint && pnpm build && pnpm size`
Expected: all PASS (759 tests).

- [ ] **Step 7: Commit**

```bash
pnpm format
git add packages/tally-charts
git commit -m "feat!: public ChartContextValue, useChart() and useRegisterPoints(points)

Co-Authored-By: <your own model trailer>"
```

---

### Task 8: `ChartPoint<D>` in callbacks and readonly inputs (API-10, API-11)

**Files:**
- Modify: `packages/tally-charts/src/react/types.ts`, `packages/tally-charts/src/react/Chart.tsx`, `packages/tally-charts/src/react/charts/shared.ts`
- Modify: `packages/tally-charts/src/react/charts/LineChart.tsx`, `DotHistogram.tsx`, `StripPlot.tsx`, `WaffleColumns.tsx`, `WaterfallChart.tsx`, `BridgeChart.tsx`
- Modify: `packages/tally-charts/src/react/ui/TooltipPill.tsx`, `packages/tally-charts/src/react/ui/Legend.tsx`, `packages/tally-charts/src/react/marks/Dots.tsx`, `packages/tally-charts/src/react/overlays/Callout.tsx`, `packages/tally-charts/src/core/thresholds.ts`
- Modify: `packages/tally-charts/src/index.ts`
- Create: `packages/tally-charts/src/types.test.ts`

**Interfaces:**
- Consumes: `ChartPassThroughProps<D>`, `userCallbacks` (`charts/shared.ts`).
- Produces:
  - `interface ChartPoint<D = unknown> { …; datum: D; segments: readonly TooltipSegment[] }`
  - `ChartProps<D>.onActiveChange?: (id: Id | null, point: ChartPoint<D> | null) => void` and `onSelect?: (id: Id, point: ChartPoint<D>) => void`. Every high-level chart passes its data type through; WaterfallChart passes `S | WaterfallStart | WaterfallTotal`, BridgeChart `S | BridgeStart`.
  - `interface WaterfallTotal { label: string; value: number }`, exported
  - readonly: `LegendProps.items`, `TooltipPillProps.segments`, `CalloutProps.segments`, `BridgeChartProps.callout`, `DotItem.segments`, `DotHistogramProps.segments` (return), `WaffleColumnsProps.callout` (return), `Thresholds.bins`, `Thresholds.legend()` (return)

- [ ] **Step 1: Write the failing type tests**

Create `packages/tally-charts/src/types.test.ts`:

```ts
import { describe, expect, expectTypeOf, it } from 'vitest'
import { thresholds } from './core/thresholds'
import type {
  BarChartProps,
  BridgeChartProps,
  BridgeStart,
  BridgeStep,
  CalloutProps,
  ChartPoint,
  ChartProps,
  ComparisonBarsProps,
  DotHistogramProps,
  DotItem,
  LegendItem,
  LegendProps,
  LineChartProps,
  RankedBarsProps,
  StripPlotProps,
  TooltipPillProps,
  TooltipSegment,
  WaffleColumnsProps,
  WaterfallChartProps,
  WaterfallStart,
  WaterfallStep,
  WaterfallTotal,
} from './index'

type Week = { week: string; margin: number }
type Callback = (id: never, point: never) => void
/** The point type the `onSelect` of props `P` receives. */
type Selected<P extends { onSelect?: Callback }> = Parameters<NonNullable<P['onSelect']>>[1]
/** The point type the `onActiveChange` of props `P` receives. */
type Activated<P extends { onActiveChange?: Callback }> = Parameters<
  NonNullable<P['onActiveChange']>
>[1]

describe('public types', () => {
  it('types callback points with the chart data type', () => {
    expectTypeOf<Selected<ChartProps<Week>>>().toEqualTypeOf<ChartPoint<Week>>()
    expectTypeOf<Activated<ChartProps<Week>>>().toEqualTypeOf<ChartPoint<Week> | null>()
    expectTypeOf<Selected<BarChartProps<Week>>>().toEqualTypeOf<ChartPoint<Week>>()
    expectTypeOf<Selected<ComparisonBarsProps<Week>>>().toEqualTypeOf<ChartPoint<Week>>()
    expectTypeOf<Selected<RankedBarsProps<Week>>>().toEqualTypeOf<ChartPoint<Week>>()
    expectTypeOf<Selected<DotHistogramProps<Week>>>().toEqualTypeOf<ChartPoint<Week>>()
    expectTypeOf<Selected<StripPlotProps<Week>>>().toEqualTypeOf<ChartPoint<Week>>()
    expectTypeOf<Selected<WaffleColumnsProps<Week>>>().toEqualTypeOf<ChartPoint<Week>>()
    expectTypeOf<Activated<LineChartProps<Week>>>().toEqualTypeOf<ChartPoint<Week> | null>()
    expectTypeOf<Selected<WaterfallChartProps>>().toEqualTypeOf<
      ChartPoint<WaterfallStep | WaterfallStart | WaterfallTotal>
    >()
    expectTypeOf<Selected<BridgeChartProps>>().toEqualTypeOf<ChartPoint<BridgeStep | BridgeStart>>()
    expectTypeOf<ChartPoint['datum']>().toEqualTypeOf<unknown>()
  })

  it('accepts readonly arrays', () => {
    expectTypeOf<LegendProps['items']>().toEqualTypeOf<readonly LegendItem[]>()
    expectTypeOf<TooltipPillProps['segments']>().toEqualTypeOf<readonly TooltipSegment[]>()
    expectTypeOf<CalloutProps['segments']>().toEqualTypeOf<readonly TooltipSegment[] | undefined>()
    expectTypeOf<BridgeChartProps['callout']>().toEqualTypeOf<
      readonly TooltipSegment[] | undefined
    >()
    expectTypeOf<DotItem['segments']>().toEqualTypeOf<readonly TooltipSegment[] | undefined>()
    expectTypeOf<ChartPoint['segments']>().toEqualTypeOf<readonly TooltipSegment[]>()
    const bands = thresholds([10], ['loss', 'gain'], ['Low', 'High'])
    expectTypeOf(bands.bins).toEqualTypeOf<readonly (typeof bands.bins)[number][]>()
    // `as const` data goes straight in.
    const items = [{ label: 'Plan', tone: 'neutral' }] as const satisfies readonly LegendItem[]
    expect(items).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run the typecheck to verify it fails**

Run: `pnpm --filter tally-charts typecheck`
Expected: FAIL. `ChartPoint` isn't generic, `WaterfallTotal` doesn't exist, and the props hold mutable arrays.

- [ ] **Step 3: Make `ChartPoint` generic and type the callbacks**

In `packages/tally-charts/src/react/types.ts`, replace

```ts
/** A focusable data point registered by a mark. Coordinates are in plot space. */
export interface ChartPoint {
  id: Id
  index: number
  datum: unknown
```

with

```ts
/**
 * A focusable data point registered by a mark. Coordinates are in plot space. `D` is the type of
 * `datum`: in a high-level chart's callbacks it is your data type.
 */
export interface ChartPoint<D = unknown> {
  id: Id
  index: number
  datum: D
```

and `segments: TooltipSegment[]` with `segments: readonly TooltipSegment[]`.

In `packages/tally-charts/src/react/Chart.tsx`:
- change `import { navigate, useInteraction } from './interaction'` to `import { type InteractionOptions, navigate, useInteraction } from './interaction'`
- replace the two callback props with:

```tsx
  /** Called with the new active id, and its point; `point.datum` is the row from `data`. */
  onActiveChange?: (id: Id | null, point: ChartPoint<D> | null) => void
  /** Called on click, Enter or Space; `point.datum` is the row from `data`. */
  onSelect?: (id: Id, point: ChartPoint<D>) => void
```

- replace `const interaction = useInteraction({ activeId, onActiveChange })` with:

```tsx
  // Marks register `datum` as a row of `data`, so the points the store hands back are ChartPoint<D>.
  const interaction = useInteraction({
    activeId,
    onActiveChange: onActiveChange as InteractionOptions['onActiveChange'],
  })
```

- change both `onSelect(point.id, point)` calls to `onSelect(point.id, point as ChartPoint<D>)`

In `packages/tally-charts/src/react/charts/shared.ts`, change `function unwrapPoint<D>(point: ChartPoint): ChartPoint {` to `function unwrapPoint<D>(point: ChartPoint): ChartPoint<D> {`.

Pass the data type through in the chart props:
- `LineChart.tsx`, `DotHistogram.tsx`, `StripPlot.tsx`, `WaffleColumns.tsx`: `extends Omit<ChartPassThroughProps<unknown>, 'aspectRatio'>` → `extends Omit<ChartPassThroughProps<D>, 'aspectRatio'>`
- `WaterfallChart.tsx`: add after `WaterfallEnd`:

```tsx
/** The calculated end row as callbacks see it: `point.datum` when `id === 'end'`. */
export interface WaterfallTotal {
  label: string
  value: number
}
```

  then replace the props header with:

```tsx
/** In `onSelect` and `onActiveChange`, `point.datum` is the start, one of your steps, or the total. */
export interface WaterfallChartProps<S extends WaterfallStep = WaterfallStep>
  extends Omit<ChartPassThroughProps<S | WaterfallStart | WaterfallTotal>, 'aspectRatio'> {
```

  and in `WaterfallRow`, `datum: WaterfallStart | S | { label: string; value: number }` → `datum: WaterfallStart | S | WaterfallTotal`
- `BridgeChart.tsx`: replace the props header with:

```tsx
/** In `onSelect` and `onActiveChange`, `point.datum` is the start or one of your steps. */
export interface BridgeChartProps<S extends BridgeStep = BridgeStep>
  extends Omit<ChartPassThroughProps<S | BridgeStart>, 'aspectRatio'> {
```

- [ ] **Step 4: Accept readonly arrays**

- `ui/TooltipPill.tsx`: `segments: TooltipSegment[]` → `segments: readonly TooltipSegment[]`
- `ui/Legend.tsx`: `items: LegendItem[]` → `items: readonly LegendItem[]`
- `marks/Dots.tsx`: `segments?: TooltipSegment[]` → `segments?: readonly TooltipSegment[]`
- `overlays/Callout.tsx`: `segments?: TooltipSegment[]` → `segments?: readonly TooltipSegment[]`
- `charts/BridgeChart.tsx`: `callout?: TooltipSegment[]` → `callout?: readonly TooltipSegment[]`, and in `LastCallout`'s props `segments: TooltipSegment[]` → `segments: readonly TooltipSegment[]`
- `charts/DotHistogram.tsx`: `segments?: (d: D, i: number) => TooltipSegment[]` → `segments?: (d: D, i: number) => readonly TooltipSegment[]`, and in `HistogramRow` `segments: TooltipSegment[]` → `segments: readonly TooltipSegment[]`
- `charts/WaffleColumns.tsx`: `callout?: boolean | ((d: D) => TooltipSegment[])` → `callout?: boolean | ((d: D) => readonly TooltipSegment[])`, and `const calloutSegments: TooltipSegment[] | undefined =` → `const calloutSegments: readonly TooltipSegment[] | undefined =`
- `core/thresholds.ts`: `bins: ThresholdBin[]` → `bins: readonly ThresholdBin[]`, and `legend(values: readonly unknown[]): ThresholdLegendItem[]` → `legend(values: readonly unknown[]): readonly ThresholdLegendItem[]`

In `packages/tally-charts/src/index.ts`, add `WaterfallTotal,` after `WaterfallStep,` in the WaterfallChart type export.

- [ ] **Step 5: Run the checks**

Run: `pnpm test && pnpm typecheck && pnpm lint`
Expected: all PASS (761 tests). The storybook's `point.datum as Week` cast in `LastTwelveWeeks.stories.tsx` still compiles (API-10 is not breaking).

- [ ] **Step 6: Commit**

```bash
pnpm format
git add packages/tally-charts
git commit -m "feat: ChartPoint<D> in callbacks, WaterfallTotal, readonly array inputs

Co-Authored-By: <your own model trailer>"
```

---

### Task 9: `Bars.segments` and a function `tooltip` on every high-level chart (API-4)

**Files:**
- Modify: `packages/tally-charts/src/react/marks/Bars.tsx`, `packages/tally-charts/src/react/marks/Bars.test.tsx`
- Modify: `packages/tally-charts/src/react/charts/shared.ts`
- Modify: `packages/tally-charts/src/react/charts/BarChart.tsx`, `ComparisonBars.tsx`, `RankedBars.tsx`, `WaterfallChart.tsx`, `BridgeChart.tsx`, `DotHistogram.tsx`, `StripPlot.tsx`, `WaffleColumns.tsx`, `LineChart.tsx`
- Create: `packages/tally-charts/src/react/charts/tooltip.test.tsx`
- Modify: `packages/tally-charts/src/index.ts`

**Interfaces:**
- Consumes: `ChartPoint<D>` (Task 8); `TooltipProps['content']`; `unwrapPoint` (`charts/shared.ts`).
- Produces:
  - `BarsProps<D>.segments?: (d: D, i: number) => readonly TooltipSegment[]`, replacing `tooltip`
  - `type ChartTooltip<D> = boolean | ((point: ChartPoint<D>) => ReactNode)`, exported from the root
  - `tooltipContent<D>(tooltip: ChartTooltip<D> | undefined, unwrap?: boolean): TooltipProps['content']`, internal
  - `tooltip?: ChartTooltip<D>` on BarChart, ComparisonBars, RankedBars, DotHistogram, StripPlot, WaffleColumns and LineChart; `ChartTooltip<S | WaterfallStart | WaterfallTotal>` on WaterfallChart; `ChartTooltip<S | BridgeStart>` on BridgeChart

- [ ] **Step 1: Write the failing tests**

Create `packages/tally-charts/src/react/charts/tooltip.test.tsx`:

```tsx
import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { describe, expect, it } from 'vitest'
import type { ChartPoint } from '../types'
import { BarChart } from './BarChart'
import { BridgeChart } from './BridgeChart'
import { ComparisonBars } from './ComparisonBars'
import { DotHistogram } from './DotHistogram'
import { LineChart } from './LineChart'
import { RankedBars } from './RankedBars'
import { StripPlot } from './StripPlot'
import { WaffleColumns } from './WaffleColumns'
import { WaterfallChart } from './WaterfallChart'

/** Custom tooltip content showing the datum it was given. */
const show = (point: ChartPoint<unknown>) => (
  <span data-testid="custom">{JSON.stringify(point.datum)}</span>
)
const common = { width: 400, title: 'Chart', animate: false, tooltip: show } as const

const row = { name: 'Labor', plan: 640, actual: 1060, v: 12 }
const step = { label: 'Labor', value: -1.6 }

const cases: [string, () => ReactElement, unknown][] = [
  ['BarChart', () => <BarChart {...common} data={[row]} x="name" y="v" activeId={0} />, row],
  [
    'ComparisonBars',
    () => (
      <ComparisonBars
        {...common}
        data={[row]}
        label="name"
        plan="plan"
        actual="actual"
        activeId={0}
      />
    ),
    row,
  ],
  [
    'RankedBars',
    () => <RankedBars {...common} data={[row]} label="name" value="v" activeId={0} />,
    row,
  ],
  [
    'WaterfallChart',
    () => (
      <WaterfallChart
        {...common}
        start={{ label: 'Target', value: 38 }}
        steps={[step]}
        activeId={0}
      />
    ),
    step,
  ],
  [
    'WaterfallChart end',
    () => (
      <WaterfallChart
        {...common}
        start={{ label: 'Target', value: 38 }}
        steps={[step]}
        activeId="end"
      />
    ),
    { label: 'Total', value: 36.4 },
  ],
  [
    'BridgeChart',
    () => (
      <BridgeChart
        {...common}
        start={{ label: 'Planned', value: 1260 }}
        steps={[step]}
        activeId={0}
      />
    ),
    step,
  ],
  ['DotHistogram', () => <DotHistogram {...common} data={[row]} value="v" activeId={0} />, row],
  [
    'StripPlot',
    () => (
      <StripPlot
        {...common}
        data={[row]}
        series={[{ id: 'est', label: 'Estimated', value: 'v' }]}
        activeId="est:0"
      />
    ),
    row,
  ],
  [
    'WaffleColumns',
    () => <WaffleColumns {...common} data={[row]} x="name" y="v" activeId={0} />,
    row,
  ],
  [
    'LineChart',
    () => (
      <LineChart
        {...common}
        data={[row]}
        x="name"
        series={[{ id: 'v', label: 'Value', value: 'v' }]}
        activeId="Labor"
      />
    ),
    row,
  ],
]

describe('a tooltip function on a high-level chart', () => {
  it.each(cases)('%s renders it with the original datum', (_, chart, datum) => {
    const { container, getByTestId } = render(chart())
    expect(getByTestId('custom')).toHaveTextContent(JSON.stringify(datum))
    expect(container.querySelector('[data-ch-part="tooltip"]')).toContainElement(
      getByTestId('custom'),
    )
    expect(container.querySelector('[data-ch-part="tooltip-pill"]')).toBeNull()
  })
})
```

In `packages/tally-charts/src/react/marks/Bars.test.tsx`, add `import { Tooltip } from '../overlays/Tooltip'` after the `../Chart` import and append inside `describe('<Bars>', …)`:

```tsx
  it('builds the tooltip pill from `segments`', () => {
    const { container } = render(
      <Chart<Week>
        title="Bars"
        data={weeks}
        width={200}
        height={120}
        x={{ type: 'band', field: 'week', padding: 0 }}
        y={{ field: 'margin', domain: [0, 20] }}
        activeId={1}
      >
        <Bars<Week> segments={(d) => [{ value: d.week }, { value: 'custom' }]} />
        <Tooltip />
      </Chart>,
    )
    expect(container.querySelector('[data-ch-part="tooltip"]')).toHaveTextContent('W2custom')
  })
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter tally-charts exec vitest run src/react/charts/tooltip.test.tsx src/react/marks/Bars.test.tsx`
Expected: FAIL. A function `tooltip` renders the default pill (it is just truthy), and `segments` is ignored.

- [ ] **Step 3: Rename `Bars.tooltip` to `segments`**

In `packages/tally-charts/src/react/marks/Bars.tsx`, replace `tooltip?: (d: D, i: number) => TooltipSegment[]` with:

```tsx
  /** Tooltip pill segments per bar. Default: the label and the formatted value. */
  segments?: (d: D, i: number) => readonly TooltipSegment[]
```

and in the body change `const { label, tooltip, ariaLabel } = props` to `const { label, segments, ariaLabel } = props`, the `segments: tooltip ? tooltip(datum, bar.index) : …` lines to

```tsx
        segments: segments
          ? segments(datum, bar.index)
          : [{ value: name }, { value: format(bar.value) }],
```

and the memo dependencies `[layout, label, tooltip, ariaLabel, format]` to `[layout, label, segments, ariaLabel, format]`.

The internal callers pass `segments` now: in `ComparisonBars.tsx`, `WaterfallChart.tsx` and `BridgeChart.tsx` change `tooltip={segmentsOf}` to `segments={segmentsOf}`; in `RankedBars.tsx` change `tooltip={(r) => [{ value: r.label }, { value: r.text, tone: valueTone(r) }]}` to `segments={(r) => [{ value: r.label }, { value: r.text, tone: valueTone(r) }]}`.

- [ ] **Step 4: The chart-level tooltip function**

In `packages/tally-charts/src/react/charts/shared.ts`, replace the header

```ts
export { toNumber } from '../../core/number'

import type { Id } from '../../core/types'
import type { ChartProps } from '../Chart'
import type { ChartPoint } from '../types'
```

with

```ts
export { toNumber } from '../../core/number'

import type { ReactNode } from 'react'
import type { Id } from '../../core/types'
import type { ChartProps } from '../Chart'
import type { TooltipProps } from '../overlays/Tooltip'
import type { ChartPoint } from '../types'

/**
 * A high-level chart's `tooltip`: `true` for the default pill, `false` for none, or a function
 * that renders the content for a point, whose `datum` is your row.
 */
export type ChartTooltip<D> = boolean | ((point: ChartPoint<D>) => ReactNode)
```

and insert before `/** Callbacks of a high-level chart report the user's datum, not the internal row. */`:

```ts
/**
 * `<Tooltip content>` for a chart's `tooltip` prop: undefined (the default pill) unless it is a
 * function. `unwrap` is false for charts whose rows already are the user's data.
 */
export function tooltipContent<D>(
  tooltip: ChartTooltip<D> | undefined,
  unwrap = true,
): TooltipProps['content'] {
  if (typeof tooltip !== 'function') return undefined
  return (point) => tooltip(unwrap ? unwrapPoint<D>(point) : (point as ChartPoint<D>))
}

```

Then in each of the nine charts:
1. Add `type ChartTooltip` and `tooltipContent` to its import from `./shared` (keep the names sorted, case-insensitive, ignoring `type`, as Biome's organizeImports wants; `pnpm format` fixes the order).
2. Replace the `tooltip?: boolean` prop and its doc comment with:

```tsx
  /**
   * Tooltip on hover and focus: `true` for the default pill, or a function that renders the
   * content for a point (`point.datum` is your row). Default true.
   */
  tooltip?: ChartTooltip<D>
```

   In `WaterfallChart.tsx` use `ChartTooltip<S | WaterfallStart | WaterfallTotal>`, and in `BridgeChart.tsx` `ChartTooltip<S | BridgeStart>`. `RankedBars.tsx` keeps its reason in the doc:

```tsx
  /**
   * Tooltip on hover and focus, so cut labels stay readable: `true` for the default pill (full
   * label and value), or a function that renders the content for a point. Default true.
   */
  tooltip?: ChartTooltip<D>
```

3. Replace `{tooltip ? <Tooltip /> : null}` with `{tooltip ? <Tooltip content={tooltipContent(tooltip)} /> : null}`. In `BarChart.tsx` only, whose rows are the user's data, use `tooltipContent(tooltip, false)`.

In `packages/tally-charts/src/index.ts`, change `export type { ChartPassThroughProps } from './react/charts/shared'` to `export type { ChartPassThroughProps, ChartTooltip } from './react/charts/shared'`.

- [ ] **Step 5: Run the tests and checks**

Run: `pnpm --filter tally-charts exec vitest run src/react/charts src/react/marks/Bars.test.tsx`
Expected: PASS. The ten `tooltip.test.tsx` cases include the Waterfall end row, whose datum is the synthetic `{ label: 'Total', value: 36.4 }`.

Run: `pnpm test && pnpm typecheck && pnpm lint && pnpm build && pnpm size`
Expected: all PASS (772 tests); LineChart still ≤ 12 kB.

- [ ] **Step 6: Commit**

```bash
pnpm format
git add packages/tally-charts
git commit -m "feat!: Bars segments; a function tooltip on every high-level chart

Co-Authored-By: <your own model trailer>"
```

---

### Task 10: Unexport row types, `LineBand`, ComparisonBars `good` and `onPlanLabel` (API-7, API-8)

**Files:**
- Modify: `packages/tally-charts/src/react/charts/ComparisonBars.tsx`, `packages/tally-charts/src/react/charts/ComparisonBars.test.tsx`
- Modify: `packages/tally-charts/src/react/charts/WaterfallChart.tsx`, `packages/tally-charts/src/react/ui/Delta.tsx`, `packages/tally-charts/src/react/charts/LineChart.tsx`
- Modify: `packages/tally-charts/src/index.ts`, `packages/tally-charts/README.md`

**Interfaces:**
- Consumes: nothing new.
- Produces:
  - `ComparisonBarsProps.good?: 'up' | 'down'` (default `'down'`), replacing `overIsBad`; `ComparisonBarsProps.onPlanLabel?: string`, replacing `onPlanText`
  - `interface LineBand<D>`, renamed from `LineRange<D>`
  - `ComparisonStatus`, `WaterfallKind` and `DeltaDirection` are module-private types now

- [ ] **Step 1: Write the failing tests**

In `packages/tally-charts/src/react/charts/ComparisonBars.test.tsx`, replace

```tsx
  it('flips tones when going over is good', () => {
    const { container } = renderRows({ overIsBad: false })
```

with

```tsx
  it('names the on-plan text with onPlanLabel', () => {
    const { container } = renderRows({ tolerance: 60, onPlanLabel: 'As planned' })
    expect(rightColumns(container)[1]?.[2]).toEqual({ text: 'As planned', tone: 'neutral' })
  })

  it('flips tones when going over is good', () => {
    const { container } = renderRows({ good: 'up' })
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter tally-charts exec vitest run src/react/charts/ComparisonBars.test.tsx`
Expected: FAIL. `good` and `onPlanLabel` are ignored.

- [ ] **Step 3: Rename the ComparisonBars props**

In `packages/tally-charts/src/react/charts/ComparisonBars.tsx`:
- `export type ComparisonStatus = …` → `type ComparisonStatus = 'over' | 'under' | 'on-plan' | 'unknown'`
- replace

```tsx
  /** Text for rows on plan. Default "On plan". */
  onPlanText?: string
  /** Going over plan is bad news (costs, hours). Default true; set false for revenue-like rows. */
  overIsBad?: boolean
```

  with

```tsx
  /** Text for rows on plan. Default "On plan". */
  onPlanLabel?: string
  /**
   * Which direction of actual against plan is good news: 'down' (under plan, for costs and
   * hours) or 'up' (over plan, for revenue-like rows). Default 'down'.
   */
  good?: 'up' | 'down'
```

- in the destructuring, `onPlanText = 'On plan',` → `onPlanLabel = 'On plan',` and `overIsBad = true,` → `good = 'down',`
- replace

```tsx
  const overTone: Tone = overIsBad ? 'loss' : 'gain'
  const underTone: Tone = overIsBad ? 'gain' : 'loss'
```

  with

```tsx
  const overTone: Tone = good === 'up' ? 'gain' : 'loss'
  const underTone: Tone = good === 'up' ? 'loss' : 'gain'
```

- `status === 'on-plan' ? onPlanText : signed(a - p)` → `status === 'on-plan' ? onPlanLabel : signed(a - p)`, and `onPlanText,` in the memo dependencies → `onPlanLabel,`

- [ ] **Step 4: Unexport the row types and rename `LineRange`**

- `charts/WaterfallChart.tsx`: `export type WaterfallKind = 'start' | 'step' | 'end'` → `type WaterfallKind = 'start' | 'step' | 'end'`
- `ui/Delta.tsx`: replace `export type DeltaDirection = 'up' | 'down' | 'flat'` with

```tsx
/** Also the values of `data-ch-direction`. */
type DeltaDirection = 'up' | 'down' | 'flat'
```

- `charts/LineChart.tsx`: `export interface LineRange<D> {` → `export interface LineBand<D> {`, and `band?: LineRange<D>` → `band?: LineBand<D>`
- `src/index.ts`:
  - `export type { ComparisonBarsProps, ComparisonStatus } from './react/charts/ComparisonBars'` → `export type { ComparisonBarsProps } from './react/charts/ComparisonBars'`
  - in the LineChart type export, replace `LineChartProps, LineRange,` with `LineBand, LineChartProps,`
  - delete `WaterfallKind,` from the WaterfallChart type export
  - `export type { DeltaDirection, DeltaProps } from './react/ui/Delta'` → `export type { DeltaProps } from './react/ui/Delta'`

In `packages/tally-charts/README.md`, in the `ComparisonBars` bullet, replace `` `overIsBad={false}` for revenue-like rows. `` with `` `good="up"` for revenue-like rows, where going over plan is good news. ``

- [ ] **Step 5: Run the checks**

Run: `grep -rn "overIsBad\|onPlanText\|LineRange\|ComparisonStatus\|WaterfallKind\|DeltaDirection" packages/tally-charts/src packages/tally-charts/README.md apps/storybook/stories`
Expected: only the module-private `type ComparisonStatus`, `type WaterfallKind` and `type DeltaDirection` declarations and their uses in their own files.

Run: `pnpm test && pnpm typecheck && pnpm lint`
Expected: all PASS (773 tests).

- [ ] **Step 6: Commit**

```bash
pnpm format
git add packages/tally-charts
git commit -m "feat!: ComparisonBars good/onPlanLabel, LineBand; unexport internal row types

Co-Authored-By: <your own model trailer>"
```

---

### Task 11: `heatmapLevel`, Heatmap `chartId` and the missing-title warning (backlog §4; API-16)

**Files:**
- Modify: `packages/tally-charts/src/core/thresholds.ts`, `packages/tally-charts/src/core/thresholds.test.ts`
- Modify: `packages/tally-charts/src/react/charts/Heatmap.tsx`, `packages/tally-charts/src/react/charts/Heatmap.test.tsx`
- Modify: `packages/tally-charts/src/react/Chart.tsx`, `packages/tally-charts/src/react/Chart.test.tsx`
- Modify (the tests that count warnings get a `title`): `packages/tally-charts/src/react/marks/Band.test.tsx`, `Bars.test.tsx`, `Grid.test.tsx`, `Line.test.tsx`, `Region.test.tsx`, `Target.test.tsx`
- Modify: `packages/tally-charts/src/core/index.ts`, `packages/tally-charts/src/index.ts`, `packages/tally-charts/src/index.test.ts`, `packages/tally-charts/scripts/check-dev-strip.mjs`

**Interfaces:**
- Consumes: `toNumber`, `SeqLevel`.
- Produces:
  - `heatmapLevel(value: unknown, breaks: readonly number[]): SeqLevel | 0` in `core/thresholds.ts`, exported from both entries
  - internal: `MAX_BREAKS = 4`, `sequentialBreaks(breaks): number[]`, `binLevels(bins: number): SeqLevel[]`, moved out of Heatmap
  - `HeatmapProps.chartId?: string`. The aria ids become `` `ch-${sanitized chartId ?? useId()}-title` `` / `-desc`, as on `<Chart>`.
  - dev warnings `chart-title` ("Chart has no \`title\`, so screen readers announce an unnamed figure.") and `heatmap-title` ("Heatmap has no \`title\`, so screen readers announce an unnamed grid.")

- [ ] **Step 1: Write the failing tests**

In `packages/tally-charts/src/core/thresholds.test.ts`, change the import to `import { heatmapLevel, thresholds } from './thresholds'` and append:

```ts
describe('heatmapLevel', () => {
  it('maps values onto the levels Heatmap paints', () => {
    // Three breaks: four bins on levels 1, 2, 4 and 5.
    const breaks = [4000, 7000, 13000]
    expect([1900, 4000, 7900, 12999, 13000, 14800].map((v) => heatmapLevel(v, breaks))).toEqual([
      1, 2, 4, 4, 5, 5,
    ])
  })

  it('cleans breaks the way Heatmap does', () => {
    expect(heatmapLevel(5, [10, 1, 10])).toBe(heatmapLevel(5, [1, 10]))
    // Only the first four breaks count: 60 is in the last of five bins.
    expect(heatmapLevel(60, [10, 20, 30, 40, 50])).toBe(5)
    expect(heatmapLevel(45, [10, 20, 30, 40, 50])).toBe(5)
  })

  it('uses level 3 without breaks and 0 for a missing value', () => {
    expect(heatmapLevel(12, [])).toBe(3)
    expect(heatmapLevel(Number.NaN, [10])).toBe(0)
    expect(heatmapLevel(null, [10])).toBe(0)
    expect(heatmapLevel('7', [5])).toBe(5)
  })
})
```

In `packages/tally-charts/src/react/charts/Heatmap.test.tsx`, add `import { heatmapLevel } from '../../core/thresholds'` above the `./Heatmap` import and append inside `describe('<Heatmap>', …)`:

```tsx
  it('paints the levels heatmapLevel reports, for a standalone legend', () => {
    const { container } = renderHeatmap({ breaks: [7000, 4000, 13000, 4000] })
    expect(levels(cells(container))).toEqual(
      leaks.map((l) => String(heatmapLevel(l.amount, [7000, 4000, 13000, 4000]))),
    )
  })

  it('prefixes its aria ids with chartId', () => {
    renderHeatmap({ chartId: 'left map', description: 'Dallas leaks most.' })
    const grid = screen.getByRole('grid', { name: 'Where it leaks' })
    expect(grid).toHaveAttribute('aria-labelledby', 'ch-leftmap-title')
    expect(grid).toHaveAttribute('aria-describedby', 'ch-leftmap-desc')
    expect(grid).toHaveAccessibleDescription('Dallas leaks most.')
  })

  it('warns once without a title', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { rerender } = renderHeatmap({ title: undefined })
    rerender(<Heatmap<Leak> data={leaks} row="branch" column="cause" value="amount" breaks={[1]} />)
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]?.[0]).toBe(
      '[tally-charts] Heatmap has no `title`, so screen readers announce an unnamed grid.',
    )
  })
```

In `packages/tally-charts/src/react/Chart.test.tsx`, add `import { BarChart } from './charts/BarChart'` after the `./Chart` import, and insert before `it('throws when a building block is rendered outside <Chart>', …)`:

```tsx
  it('warns once when the figure has no title, for <Chart> and every high-level chart', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const axes = { x: { domain: [0, 1] }, y: { domain: [0, 1] } } as const
    const { rerender } = render(<Chart width={100} {...axes} />)
    rerender(<Chart width={200} {...axes} />)
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]?.[0]).toBe(
      '[tally-charts] Chart has no `title`, so screen readers announce an unnamed figure.',
    )
    warn.mockClear()
    render(<BarChart data={weeks} x="week" y="margin" width={300} />)
    expect(warn).toHaveBeenCalledTimes(1)
    warn.mockClear()
    render(<Chart width={100} title="Named" {...axes} />)
    expect(warn).not.toHaveBeenCalled()
  })
```

The new warning would add a call to eight existing tests that count or index warnings, so their charts get a title:
- `Chart.test.tsx`, `it('renders the empty slot instead of the plot for empty data', …)`: `<Chart data={[]} width={300} empty="Nothing yet" x={{ type: 'band' }} />` → `<Chart data={[]} width={300} title="Empty" empty="Nothing yet" x={{ type: 'band' }} />`
- `marks/Band.test.tsx` (`renderBand`), `marks/Bars.test.tsx` (`renderBars`), `marks/Line.test.tsx` (`renderLine`), `marks/Region.test.tsx` (`renderRegion`) and `marks/Grid.test.tsx` (`renderGrid`): add `title="Band"`, `title="Bars"`, `title="Line"`, `title="Region"` and `title="Grid"` as the first prop of the helper's `<Chart>`
- `marks/Grid.test.tsx`, `it('warns without a linear y scale', …)`: give its inline chart a title:

```tsx
      <Chart
        title="Grid"
        width={300}
        height={100}
        x={{ domain: [0, 1] }}
        y={{ type: 'band', domain: ['a'] }}
      >
```

- `marks/Target.test.tsx`: add `title: 'Target',` as the first field of `frame`

In `packages/tally-charts/src/index.test.ts`, add `'heatmapLevel',` after `'thresholds',` in the `'main exports %s'` list.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter tally-charts exec vitest run src/core/thresholds.test.ts src/react/charts/Heatmap.test.tsx src/react/Chart.test.tsx src/index.test.ts`
Expected: FAIL. `heatmapLevel` doesn't exist, the ids come from `useId()`, and nothing warns.

- [ ] **Step 3: Move the level helpers to core and export `heatmapLevel`**

In `packages/tally-charts/src/core/thresholds.ts`, change `import type { Tone } from './types'` to `import type { SeqLevel, Tone } from './types'` and append:

```ts
/** The most bin edges a heatmap uses: five bins, one per sequential level. */
export const MAX_BREAKS = 4

/** Internal: finite, ascending, unique edges, at most `MAX_BREAKS`, as Heatmap uses them. */
export function sequentialBreaks(breaks: readonly number[]): number[] {
  return [...new Set(breaks.filter(Number.isFinite))].sort((a, b) => a - b).slice(0, MAX_BREAKS)
}

/** Internal: bins spread over the five levels with the ends pinned; four bins use 1, 2, 4 and 5. */
export function binLevels(bins: number): SeqLevel[] {
  if (bins <= 1) return [3]
  return Array.from({ length: bins }, (_, i) => Math.round(1 + (i * 4) / (bins - 1)) as SeqLevel)
}

/**
 * The sequential level (1–5) a `Heatmap` with these `breaks` paints `value` with, or 0 for a
 * missing or non-numeric value. Use it to keep a standalone `Legend` in step with custom breaks.
 * Breaks are cleaned the way Heatmap cleans them: sorted, deduplicated, at most four.
 */
export function heatmapLevel(value: unknown, breaks: readonly number[]): SeqLevel | 0 {
  const v = toNumber(value)
  if (!Number.isFinite(v)) return 0
  const edges = sequentialBreaks(breaks)
  const bin = edges.findIndex((b) => v < b)
  return binLevels(edges.length + 1)[bin === -1 ? edges.length : bin] ?? 0
}
```

`core/index.ts` and `src/index.ts`: change `export { thresholds } from './thresholds'` (and `'./core/thresholds'`) to `export { heatmapLevel, thresholds } from …`.

- [ ] **Step 4: Heatmap uses them, takes `chartId` and warns without a title**

In `packages/tally-charts/src/react/charts/Heatmap.tsx`:
- add `import { binLevels, MAX_BREAKS, sequentialBreaks } from '../../core/thresholds'` after the `toNumber` import
- delete `const MAX_BREAKS = 4` and the local `binLevels` function with its doc comment
- replace `cleanBreaks` with:

```tsx
/** The breaks Heatmap bins by (see `heatmapLevel`), warning about what it had to clean up. */
function cleanBreaks(breaks: readonly number[], warn: Warn): number[] {
  const edges = sequentialBreaks(breaks)
  if (DEV) {
    const sorted = [...new Set(breaks.filter(Number.isFinite))].sort((a, b) => a - b)
    if (sorted.length !== breaks.length || sorted.some((b, i) => b !== breaks[i])) {
      warn(
        'heatmap-breaks',
        'Heatmap `breaks` must be finite and ascending; they were sorted and deduplicated.',
      )
    }
    if (sorted.length > MAX_BREAKS) {
      warn('heatmap-bins', 'Heatmap shows at most 5 bins; breaks after the fourth were dropped.')
    }
  }
  return edges
}
```

- add to `HeatmapProps`, after `style?: CSSProperties`:

```tsx
  /**
   * Prefix for the title and description ids. React's `useId` is only unique within one root, so
   * set this when heatmaps render in several React roots on one page.
   */
  chartId?: string
```

- add `chartId,` after `style,` in the destructuring
- replace

```tsx
  const baseId = useId()
  const titleId = `${baseId}-title`
  const descId = `${baseId}-desc`
```

  with

```tsx
  const reactId = useId()
  const baseId = `ch-${(chartId ?? reactId).replace(/[^a-zA-Z0-9_-]/g, '')}`
  const titleId = `${baseId}-title`
  const descId = `${baseId}-desc`
  if (DEV && !title) {
    warn('heatmap-title', 'Heatmap has no `title`, so screen readers announce an unnamed grid.')
  }
```

- [ ] **Step 5: `<Chart>` warns without a title**

In `packages/tally-charts/src/react/Chart.tsx`, change `import { createWarner, type Warn } from '../core/warn'` to `import { createWarner, DEV, type Warn } from '../core/warn'`, and add after `const scaleWarn = isEmpty ? silent : warn`:

```tsx
  if (DEV && !title) {
    warn('chart-title', 'Chart has no `title`, so screen readers announce an unnamed figure.')
  }
```

Every high-level chart passes `title` through to `<Chart>`, so this one warning covers them all.

In `packages/tally-charts/scripts/check-dev-strip.mjs`, add `'has no \`title\`',` after `'has no valid dates',` in `phrases`.

- [ ] **Step 6: Run the tests and checks**

Run: `pnpm --filter tally-charts exec vitest run src/core/thresholds.test.ts src/react`
Expected: PASS.

Run: `pnpm test && pnpm typecheck && pnpm lint && pnpm build && pnpm --filter tally-charts check:dev-strip`
Expected: all PASS (781 tests), with `17/17 phrases`.

- [ ] **Step 7: Commit**

```bash
pnpm format
git add packages/tally-charts
git commit -m "feat: heatmapLevel, Heatmap chartId, dev warning for charts without a title

Co-Authored-By: <your own model trailer>"
```

---

### Task 12: The declared CSS surface (API-9)

**Files:**
- Modify: `packages/tally-charts/src/react/ui/TooltipPill.tsx`, `Legend.tsx`, `Meter.tsx`, `RangeMeter.tsx`, `Stat.tsx`, `Delta.tsx`, `InlineBar.tsx`, `DotCount.tsx`, `util.ts`
- Modify: `packages/tally-charts/src/react/charts/Heatmap.tsx`, `packages/tally-charts/src/react/marks/Bars.tsx`
- Modify: `packages/tally-charts/src/theme/theme.css` (by the script in Step 4), `packages/tally-charts/src/theme/theme.test.ts`
- Create: `packages/tally-charts/src/theme/surface.test.ts`
- Modify (renamed attribute and variables): `src/react/charts/{BarChart,BridgeChart,RankedBars,StripPlot,WaterfallChart}.test.tsx`, `src/react/marks/Bars.test.tsx`, `src/react/ui/{Legend.test.tsx,util.test.ts}`, `src/__snapshots__/last-twelve-weeks.ssr.html`
- Modify: `packages/tally-charts/README.md`

**Interfaces:**
- Consumes: the markup of the small UI pieces and Heatmap.
- Produces:
  - new `data-ch-part` values on HTML sub-parts. TooltipPill: `pill-segment`, `pill-value`, `pill-label`. Legend: `legend-item`, `legend-swatch`, `legend-label`, `legend-count`. Meter: `meter-track`, `meter-fill`, `meter-labels`, `meter-target-label`. RangeMeter: `range-labels`, `range-value-label`, `range-reference-label`, `range-track`, `range-gap`, `range-dot`, `range-ring`, `range-scale`. Stat: `stat-label`, `stat-value`, `stat-meta`, `stat-caption`. Delta: `delta-arrow`, `delta-value`. InlineBar: `inline-bar-fill`, `inline-bar-target`. DotCount: `dot-count-dots`, `dot-count-dot`, `dot-count-label`. Heatmap: `heatmap-grid`, `heatmap-row`, `heatmap-corner`, `heatmap-header`, `heatmap-header-total`, `heatmap-total-header`, `heatmap-rowheader`, `heatmap-total`.
  - private variables `--_ch-swatch-color`, `--_ch-range-ref`, `--_ch-heatmap-columns`, `--_ch-seq-ink-strong`
  - `data-ch-direction` on bars, replacing `data-ch-dir`
  - theme.css selects sub-parts by `data-ch-part` only. The only classes it still selects are `ch-fillable`, `ch-overlay`, `ch-sr-only`, `ch-svg`, `ch-tone-text` and `ch-tooltip`.

- [ ] **Step 1: Write the failing surface test**

Create `packages/tally-charts/src/theme/surface.test.ts`:

```ts
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
  'heatmap-header-total',
  'heatmap-row',
  'heatmap-rowheader',
  'heatmap-total',
  'heatmap-total-header',
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
  'meter-target',
  'meter-target-label',
  'meter-track',
  'overlay',
  'pill-label',
  'pill-segment',
  'pill-value',
  'pointer-layer',
  'range-dot',
  'range-gap',
  'range-labels',
  'range-meter',
  'range-reference-label',
  'range-ring',
  'range-scale',
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
]

/** Classes theme.css may still select: private plumbing, never documented. */
const PRIVATE_CLASSES = [
  'ch-fillable',
  'ch-overlay',
  'ch-sr-only',
  'ch-svg',
  'ch-tone-text',
  'ch-tooltip',
]

const src = new URL('..', import.meta.url).pathname
const css = readFileSync(new URL('./theme.css', import.meta.url), 'utf8')

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

  it('uses exactly the listed data-ch-part values', () => {
    const parts = [css, ...code].flatMap((text) =>
      [...text.matchAll(/data-ch-part(?:="|': ')([a-z-]+)/g)].map((m) => m[1] ?? ''),
    )
    expect(unique(parts)).toEqual(unique(PARTS))
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
    expect(css).not.toMatch(/data-ch-dir=/)
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm --filter tally-charts exec vitest run src/theme/surface.test.ts`
Expected: FAIL in three of four tests. theme.css still uses `--ch-swatch-color` and the other private variables, the new parts don't exist, and theme.css selects `.ch-pill-seg` and the other component classes.

- [ ] **Step 3: Put `data-ch-part` on every HTML sub-part and rename the private variables in the markup**

The classes stay on the elements (they are private); each sub-part gains the matching `data-ch-part`. Replace these files whole.

`packages/tally-charts/src/react/ui/TooltipPill.tsx`:

```tsx
import type { CSSProperties } from 'react'
import type { TooltipSegment } from '../types'

export interface TooltipPillProps {
  segments: readonly TooltipSegment[]
  className?: string
}

/** The segmented pill: `#5819 | 12.3% | ABC Property Group`. */
export function TooltipPill({ segments, className }: TooltipPillProps) {
  return (
    <div className={className ? `ch-pill ${className}` : 'ch-pill'} data-ch-part="tooltip-pill">
      {segments.map((segment, i) => (
        <span
          // biome-ignore lint/suspicious/noArrayIndexKey: segments are positional and never reorder
          key={i}
          className="ch-pill-seg"
          data-ch-part="pill-segment"
          data-ch-tone={segment.tone}
          style={
            segment.tone
              ? ({ '--_ch-swatch-color': `var(--ch-${segment.tone})` } as CSSProperties)
              : undefined
          }
        >
          <span className="ch-pill-value" data-ch-part="pill-value">
            {segment.value}
          </span>
          {segment.label !== undefined && segment.label !== null ? (
            <span className="ch-pill-label" data-ch-part="pill-label">
              {segment.label}
            </span>
          ) : null}
        </span>
      ))}
    </div>
  )
}
```

`packages/tally-charts/src/react/ui/Legend.tsx`:

```tsx
import type { CSSProperties, ReactNode } from 'react'
import type { Fill, SeqLevel, Tone } from '../../core/types'

export type LegendShape = 'bar' | 'dot' | 'line'

export interface LegendItem {
  label: ReactNode
  /** Swatch tone. Default 'neutral'; ignored when `level` is set. */
  tone?: Tone
  fill?: Fill
  count?: ReactNode
  shape?: LegendShape
  /** A dashed line swatch, e.g. for a forecast. Only with shape 'line'. */
  dashed?: boolean
  /** A sequential level (`--ch-seq-N`), e.g. a heatmap bin. Replaces `tone`. */
  level?: SeqLevel
}

export interface LegendProps {
  items: readonly LegendItem[]
  shape?: LegendShape
  className?: string
}

export function Legend({ items, shape = 'bar', className }: LegendProps) {
  return (
    <ul className={className ? `ch-legend ${className}` : 'ch-legend'} data-ch-part="legend">
      {items.map((item, i) => {
        const tone = item.tone ?? 'neutral'
        const color = item.level ? `var(--ch-seq-${item.level})` : `var(--ch-${tone})`
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: labels may be non-string nodes; order is stable
          <li key={i} className="ch-legend-item" data-ch-part="legend-item">
            <span
              aria-hidden="true"
              className="ch-swatch ch-fillable"
              data-ch-part="legend-swatch"
              data-ch-tone={item.level ? undefined : tone}
              data-ch-level={item.level}
              data-ch-fill={item.fill ?? 'solid'}
              data-ch-shape={item.shape ?? shape}
              data-ch-dashed={item.dashed ? 'true' : undefined}
              style={{ '--_ch-swatch-color': color } as CSSProperties}
            />
            <span className="ch-legend-label" data-ch-part="legend-label">
              {item.label}
            </span>
            {item.count !== undefined && item.count !== null ? (
              <span className="ch-legend-count" data-ch-part="legend-count">
                {item.count}
              </span>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}
```

`packages/tally-charts/src/react/ui/Meter.tsx`:

```tsx
import type { ReactNode } from 'react'
import type { FormatSpec } from '../../core/format'
import type { Fill, Tone } from '../../core/types'
import { useFormat } from '../ChartsProvider'
import { cx, toneVar, toPercent } from './util'

export interface MeterProps {
  value: number
  /** Default 0. */
  min?: number
  /** Default 100. */
  max?: number
  /** Draws a tick and, by default, a "Target …" label. */
  target?: number
  /** Default 'accent'. */
  tone?: Tone
  /** Default 'hatch'. */
  fill?: Fill
  /** Default 'number'. */
  format?: FormatSpec
  /** Accessible name. */
  label: string
  /** Text under the start. Default: the formatted `min`. `null` hides it. */
  minLabel?: ReactNode | null
  /** Text under the target tick. Default "Target <formatted target>". `null` hides it. */
  targetLabel?: ReactNode | null
  className?: string
}

/** Progress toward a target: a filled track with a target tick. */
export function Meter({
  value,
  min = 0,
  max = 100,
  target,
  tone = 'accent',
  fill = 'hatch',
  format,
  label,
  minLabel,
  targetLabel,
  className,
}: MeterProps) {
  const { create } = useFormat()
  const fmt = create(format)
  const finite = Number.isFinite(value)
  const p = finite ? toPercent(value, min, max) : 0
  const t = target === undefined ? undefined : toPercent(target, min, max)
  const valueText = !finite
    ? 'No data'
    : target === undefined
      ? fmt(value)
      : `${fmt(value)}, target ${fmt(target)}`
  const showMin = minLabel !== null
  const showTarget = t !== undefined && target !== undefined && targetLabel !== null
  return (
    <div className={cx('ch-meter', className)} data-ch-part="meter" style={toneVar(tone)}>
      {/* biome-ignore lint/a11y/useSemanticElements: a styled track with children, not a native <meter> */}
      <div
        className="ch-meter-track"
        data-ch-part="meter-track"
        role="meter"
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={finite ? Math.min(max, Math.max(min, value)) : min}
        aria-valuetext={valueText}
      >
        <div
          className="ch-meter-fill ch-fillable"
          data-ch-part="meter-fill"
          data-ch-tone={tone}
          data-ch-fill={fill}
          style={{ width: `${p}%` }}
        />
        {t !== undefined ? (
          <div className="ch-meter-target" data-ch-part="meter-target" style={{ left: `${t}%` }} />
        ) : null}
      </div>
      {showMin || showTarget ? (
        <div className="ch-meter-labels" data-ch-part="meter-labels" aria-hidden="true">
          {showMin ? <span>{minLabel ?? fmt(min)}</span> : null}
          {showTarget ? (
            <span
              className="ch-meter-target-label"
              data-ch-part="meter-target-label"
              style={{ left: `${t}%`, transform: `translateX(-${t}%)` }}
            >
              {targetLabel ?? `Target ${fmt(target)}`}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
```

`packages/tally-charts/src/react/ui/RangeMeter.tsx`:

```tsx
import type { CSSProperties, ReactNode } from 'react'
import type { FormatSpec } from '../../core/format'
import type { Tone } from '../../core/types'
import { useFormat } from '../ChartsProvider'
import { cx, toneVar, toPercent } from './util'

export interface RangeMeterProps {
  /** The actual value: a filled dot. */
  value: number
  /** The planned or estimated value: an empty ring. */
  reference: number
  /** Default 0. */
  min?: number
  /** Default 100. */
  max?: number
  /** Dot, gap and value label color. Default 'loss'. */
  tone?: Tone
  /** Ring color. Default 'accent'. */
  referenceTone?: Tone
  /** Default 'number'. */
  format?: FormatSpec
  /** Start of the accessible name, e.g. "Margin". */
  label: string
  /** Text above the dot. Default: the formatted value. */
  valueLabel?: ReactNode
  /** Text above the ring. Default: the formatted reference. */
  referenceLabel?: ReactNode
  /** Min and max labels under the track. Default true. */
  showScale?: boolean
  className?: string
}

const at = (p: number): CSSProperties => ({ left: `${p}%`, transform: `translateX(-${p}%)` })

/** Actual against plan on one track: dot → hatched gap → ring. */
export function RangeMeter({
  value,
  reference,
  min = 0,
  max = 100,
  tone = 'loss',
  referenceTone = 'accent',
  format,
  label,
  valueLabel,
  referenceLabel,
  showScale = true,
  className,
}: RangeMeterProps) {
  const { create } = useFormat()
  const fmt = create(format)
  const hasValue = Number.isFinite(value)
  const hasReference = Number.isFinite(reference)
  const pv = toPercent(value, min, max)
  const pr = toPercent(reference, min, max)
  const lo = Math.min(pv, pr)
  const hi = Math.max(pv, pr)
  const name = !hasValue
    ? `${label}: No data`
    : hasReference
      ? `${label}: ${fmt(value)} against ${fmt(reference)}`
      : `${label}: ${fmt(value)}`
  const style = {
    ...toneVar(tone),
    '--_ch-range-ref': `var(--ch-${referenceTone})`,
  } as CSSProperties
  return (
    <div
      className={cx('ch-range', className)}
      data-ch-part="range-meter"
      role="img"
      aria-label={name}
      style={style}
    >
      <div className="ch-range-labels" data-ch-part="range-labels" aria-hidden="true">
        {hasValue ? (
          <span
            className="ch-range-value-label ch-tone-text"
            data-ch-part="range-value-label"
            style={at(pv)}
          >
            {valueLabel ?? fmt(value)}
          </span>
        ) : null}
        {hasReference ? (
          <span className="ch-range-ref-label" data-ch-part="range-reference-label" style={at(pr)}>
            {referenceLabel ?? fmt(reference)}
          </span>
        ) : null}
      </div>
      <div className="ch-range-track" data-ch-part="range-track" aria-hidden="true">
        {hasValue && hasReference ? (
          <span
            className="ch-range-gap ch-fillable"
            data-ch-part="range-gap"
            data-ch-fill="hatch"
            style={{ left: `${lo}%`, width: `${hi - lo}%` }}
          />
        ) : null}
        {hasValue ? (
          <span className="ch-range-dot" data-ch-part="range-dot" style={{ left: `${pv}%` }} />
        ) : null}
        {hasReference ? (
          <span className="ch-range-ring" data-ch-part="range-ring" style={{ left: `${pr}%` }} />
        ) : null}
      </div>
      {showScale ? (
        <div className="ch-range-scale" data-ch-part="range-scale" aria-hidden="true">
          <span>{fmt(min)}</span>
          <span>{fmt(max)}</span>
        </div>
      ) : null}
    </div>
  )
}
```

`packages/tally-charts/src/react/ui/Stat.tsx`:

```tsx
import type { ReactNode } from 'react'
import type { FormatSpec } from '../../core/format'
import type { Tone } from '../../core/types'
import { useFormat } from '../ChartsProvider'
import { cx, toneVar } from './util'

export interface StatProps {
  /** A number formatted with `format`, or preformatted text. */
  value: number | string
  /** Default 'number'. */
  format?: FormatSpec
  /** Small muted line above the value. */
  label?: ReactNode
  /** Usually a <Delta>, shown under the value. */
  delta?: ReactNode
  /** Muted text after the delta, e.g. "vs last week". */
  caption?: ReactNode
  /** Default 'lg'. */
  size?: 'lg' | 'md' | 'sm'
  /** Color role of the value. Default: ink. */
  tone?: Tone
  className?: string
}

/** A headline number with an optional label, change and caption. */
export function Stat({
  value,
  format,
  label,
  delta,
  caption,
  size = 'lg',
  tone,
  className,
}: StatProps) {
  const { create } = useFormat()
  const text =
    typeof value === 'number' ? (Number.isFinite(value) ? create(format)(value) : '–') : value
  return (
    <div className={cx('ch-stat', className)} data-ch-part="stat" data-ch-size={size}>
      {label ? (
        <div className="ch-stat-label" data-ch-part="stat-label">
          {label}
        </div>
      ) : null}
      <div
        className={tone ? 'ch-stat-value ch-tone-text' : 'ch-stat-value'}
        data-ch-part="stat-value"
        data-ch-tone={tone}
        style={tone ? toneVar(tone) : undefined}
      >
        {text}
      </div>
      {delta || caption ? (
        <div className="ch-stat-meta" data-ch-part="stat-meta">
          {delta}
          {caption ? (
            <span className="ch-stat-caption" data-ch-part="stat-caption">
              {caption}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
```

`packages/tally-charts/src/react/ui/Delta.tsx`:

```tsx
import type { FormatSpec } from '../../core/format'
import type { Tone } from '../../core/types'
import { useFormat } from '../ChartsProvider'
import { cx, toneVar } from './util'

/** Also the values of `data-ch-direction`. */
type DeltaDirection = 'up' | 'down' | 'flat'

export interface DeltaProps {
  /** The change, e.g. -1.2 for "▼ 1.2 pts". */
  value: number
  /** Default 'number'. */
  format?: FormatSpec
  /** Which direction is good news; picks the tone when `tone` isn't set. Default 'up'. */
  good?: 'up' | 'down'
  tone?: Tone
  /** Show the sign on the number. Default false: the arrow carries the direction. */
  signed?: boolean
  className?: string
}

const ARROWS: Record<DeltaDirection, string> = { up: '▲', down: '▼', flat: '–' }
const WORDS: Record<DeltaDirection, string> = { up: 'Up', down: 'Down', flat: 'No change' }

/** A change pill: ▲/▼ plus the size of the change, toned by whether it's good news. */
export function Delta({ value, format, good = 'up', tone, signed = false, className }: DeltaProps) {
  const { create } = useFormat()
  if (!Number.isFinite(value)) return null
  const direction: DeltaDirection = value === 0 ? 'flat' : value > 0 ? 'up' : 'down'
  const resolved: Tone =
    tone ?? (direction === 'flat' ? 'neutral' : direction === good ? 'gain' : 'loss')
  const text = signed
    ? create(format, { signed: true })(value)
    : create(format, { signed: false })(Math.abs(value))
  return (
    <span
      className={cx('ch-delta', className)}
      data-ch-part="delta"
      data-ch-tone={resolved}
      data-ch-direction={direction}
      style={toneVar(resolved)}
    >
      <span aria-hidden="true" className="ch-delta-arrow ch-tone-text" data-ch-part="delta-arrow">
        {ARROWS[direction]}
      </span>
      <span className="ch-sr-only">{WORDS[direction]} </span>
      <span className="ch-delta-value" data-ch-part="delta-value">
        {text}
      </span>
    </span>
  )
}
```

`packages/tally-charts/src/react/ui/InlineBar.tsx`:

```tsx
import type { FormatSpec } from '../../core/format'
import type { Fill, Tone } from '../../core/types'
import { useFormat } from '../ChartsProvider'
import { cx, toneVar, toPercent } from './util'

export interface InlineBarProps {
  value: number
  max: number
  /** Default 0. */
  min?: number
  /** Draws a target tick. */
  target?: number
  /** Default 'loss'. */
  tone?: Tone
  /** Default 'hatch'. */
  fill?: Fill
  /** Width in px. Default 64. */
  width?: number
  /** Default 'number'. */
  format?: FormatSpec
  /** Start of the accessible name, e.g. "Margin". */
  label: string
  className?: string
}

/** A small bar for table cells, with an optional target tick. */
export function InlineBar({
  value,
  max,
  min = 0,
  target,
  tone = 'loss',
  fill = 'hatch',
  width = 64,
  format,
  label,
  className,
}: InlineBarProps) {
  const { create } = useFormat()
  const fmt = create(format)
  const hasValue = Number.isFinite(value)
  const hasTarget = target !== undefined && Number.isFinite(target)
  const p = toPercent(value, min, max)
  const t = hasTarget ? toPercent(target, min, max) : undefined
  const name = !hasValue
    ? `${label}: No data`
    : hasTarget
      ? `${label}: ${fmt(value)}, target ${fmt(target)}`
      : `${label}: ${fmt(value)}`
  return (
    <span
      className={cx('ch-inline-bar', className)}
      data-ch-part="inline-bar"
      role="img"
      aria-label={name}
      style={{ ...toneVar(tone), width }}
    >
      {hasValue ? (
        <span
          className="ch-inline-bar-fill ch-fillable"
          data-ch-part="inline-bar-fill"
          data-ch-tone={tone}
          data-ch-fill={fill}
          style={{ width: `${p}%` }}
        />
      ) : null}
      {t !== undefined ? (
        <span
          className="ch-inline-bar-target"
          data-ch-part="inline-bar-target"
          style={{ left: `${t}%` }}
        />
      ) : null}
    </span>
  )
}
```

`packages/tally-charts/src/react/ui/DotCount.tsx`:

```tsx
import type { ReactNode } from 'react'
import type { Tone } from '../../core/types'
import { useFormat } from '../ChartsProvider'
import { cx, toneVar } from './util'

export interface DotCountProps {
  count: number
  /** Most dots drawn; the label still shows the full count. Default 30. */
  max?: number
  /** Dots per row. Default 15. */
  perRow?: number
  /** Default 'loss'. */
  tone?: Tone
  /** Text after the dots. Default: the formatted count. `null` hides it (the count stays readable). */
  label?: ReactNode | null
  className?: string
}

/** A count drawn as a small field of dots, e.g. "•••••• 29 jobs". */
export function DotCount({
  count,
  max = 30,
  perRow = 15,
  tone = 'loss',
  label,
  className,
}: DotCountProps) {
  const { create } = useFormat()
  const n = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0
  const text = create('number')(n)
  const columns = Number.isFinite(perRow) ? Math.max(1, Math.floor(perRow)) : 15
  const drawn = Math.min(n, Math.max(0, Math.floor(max)))
  return (
    <span className={cx('ch-dot-count', className)} data-ch-part="dot-count" style={toneVar(tone)}>
      <span
        className="ch-dot-grid"
        data-ch-part="dot-count-dots"
        aria-hidden="true"
        style={{ gridTemplateColumns: `repeat(${columns}, 8px)` }}
      >
        {Array.from({ length: drawn }, (_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: dots are identical and positional
          <span key={i} className="ch-dot" data-ch-part="dot-count-dot" />
        ))}
      </span>
      {label === null ? (
        <span className="ch-sr-only">{text}</span>
      ) : (
        <span className="ch-dot-count-label" data-ch-part="dot-count-label">
          {label ?? text}
        </span>
      )}
    </span>
  )
}
```

`packages/tally-charts/src/react/ui/util.ts`: change the `toneVar` doc to `` /** Points the private `--_ch-swatch-color` at a tone, so CSS can paint fills and tinted text with it. */ `` and its body to ``return { '--_ch-swatch-color': `var(--ch-${tone})` } as CSSProperties``.

`packages/tally-charts/src/react/marks/Bars.tsx`: `data-ch-dir={bar.dir}` → `data-ch-direction={bar.dir}`.

`packages/tally-charts/src/react/charts/Heatmap.tsx`:
- on the grid `<div role="grid" className="ch-heatmap-grid"`, add `data-ch-part="heatmap-grid"` after the className, and change `style={{ '--ch-heatmap-columns': model.columns.length } as CSSProperties}` to `style={{ '--_ch-heatmap-columns': model.columns.length } as CSSProperties}`
- replace the header row up to the end of the rows, i.e. from `<div role="row" className="ch-heatmap-row">` through the row total cell, by giving every element its part. The changed lines, in order:

```tsx
        <div role="row" className="ch-heatmap-row" data-ch-part="heatmap-row">
          <div role="columnheader" className="ch-heatmap-corner" data-ch-part="heatmap-corner" />
          {model.columns.map((name, j) => (
            <div
              key={name}
              role="columnheader"
              className="ch-heatmap-header"
              data-ch-part="heatmap-header"
            >
              <span>{name}</span>
              {totals ? (
                <span className="ch-heatmap-header-total" data-ch-part="heatmap-header-total">
                  {valueText(model.columnTotals[j])}
                </span>
              ) : null}
            </div>
          ))}
          {totals ? (
            <div
              role="columnheader"
              className="ch-heatmap-header ch-heatmap-total-header"
              data-ch-part="heatmap-total-header"
            >
              {totalLabel}
            </div>
          ) : null}
        </div>
        {model.cells.map((rowCells, r) => (
          <div key={model.rows[r]} role="row" className="ch-heatmap-row" data-ch-part="heatmap-row">
            <div role="rowheader" className="ch-heatmap-rowheader" data-ch-part="heatmap-rowheader">
              {model.rows[r]}
            </div>
```

  and the row total: `<div role="gridcell" className="ch-heatmap-total">` → `<div role="gridcell" className="ch-heatmap-total" data-ch-part="heatmap-total">`. The cells keep their existing `data-ch-part="heatmap-cell"`.

- [ ] **Step 4: Move theme.css onto the parts**

Run from the repo root (a one-off transformation; nothing is saved):

```bash
node --input-type=module <<'EOF'
import { readFileSync, writeFileSync } from 'node:fs'

const file = 'packages/tally-charts/src/theme/theme.css'
// Component class → the data-ch-part on the same element.
const PARTS = {
  'ch-empty': 'empty',
  'ch-callout-stem': 'callout-stem',
  'ch-pill': 'tooltip-pill',
  'ch-pill-seg': 'pill-segment',
  'ch-pill-value': 'pill-value',
  'ch-pill-label': 'pill-label',
  'ch-legend': 'legend',
  'ch-legend-item': 'legend-item',
  'ch-legend-count': 'legend-count',
  'ch-swatch': 'legend-swatch',
  'ch-delta': 'delta',
  'ch-delta-arrow': 'delta-arrow',
  'ch-stat': 'stat',
  'ch-stat-label': 'stat-label',
  'ch-stat-value': 'stat-value',
  'ch-stat-meta': 'stat-meta',
  'ch-meter': 'meter',
  'ch-meter-track': 'meter-track',
  'ch-meter-fill': 'meter-fill',
  'ch-meter-target': 'meter-target',
  'ch-meter-labels': 'meter-labels',
  'ch-meter-target-label': 'meter-target-label',
  'ch-range': 'range-meter',
  'ch-range-labels': 'range-labels',
  'ch-range-ref-label': 'range-reference-label',
  'ch-range-track': 'range-track',
  'ch-range-gap': 'range-gap',
  'ch-range-dot': 'range-dot',
  'ch-range-ring': 'range-ring',
  'ch-range-scale': 'range-scale',
  'ch-inline-bar': 'inline-bar',
  'ch-inline-bar-fill': 'inline-bar-fill',
  'ch-inline-bar-target': 'inline-bar-target',
  'ch-dot-count': 'dot-count',
  'ch-dot-grid': 'dot-count-dots',
  'ch-dot': 'dot-count-dot',
  'ch-heatmap': 'heatmap',
  'ch-heatmap-grid': 'heatmap-grid',
  'ch-heatmap-row': 'heatmap-row',
  'ch-heatmap-header': 'heatmap-header',
  'ch-heatmap-header-total': 'heatmap-header-total',
  'ch-heatmap-total-header': 'heatmap-total-header',
  'ch-heatmap-rowheader': 'heatmap-rowheader',
  'ch-heatmap-cell': 'heatmap-cell',
  'ch-heatmap-total': 'heatmap-total',
}
let css = readFileSync(file, 'utf8')
css = css.replace(/\.(ch-[a-z-]+)(?![\w-])/g, (match, name) =>
  name in PARTS ? `[data-ch-part="${PARTS[name]}"]` : match,
)
// The total column header carried both header classes; its part gets the header rule too.
css = css.replace(
  '[data-ch-part="heatmap-header"] {\n  display: grid;',
  '[data-ch-part="heatmap-header"],\n[data-ch-part="heatmap-total-header"] {\n  display: grid;',
)
css = css
  .replaceAll('--ch-swatch-color', '--_ch-swatch-color')
  .replaceAll('--ch-range-ref-color', '--_ch-range-ref')
  .replaceAll('--ch-heatmap-columns', '--_ch-heatmap-columns')
  .replaceAll('--ch-seq-ink-strong', '--_ch-seq-ink-strong')
  .replaceAll('[data-ch-dir=', '[data-ch-direction=')
  .replace(
    "/* tally-charts theme — import once: import 'tally-charts/theme.css' */\n",
    "/* tally-charts theme — import once: import 'tally-charts/theme.css'\n   Public API: the --ch-* tokens, data-ch-part values and the other data-ch-* attributes.\n   Class names and --_ch-* variables are private and may change in any release. */\n",
  )
writeFileSync(file, css)
EOF
```

Then check: `grep -oE "\.ch-[a-z-]+" packages/tally-charts/src/theme/theme.css | sort -u`
Expected exactly: `.ch-fillable`, `.ch-overlay`, `.ch-sr-only`, `.ch-svg`, `.ch-tone-text`, `.ch-tooltip`. Class and attribute selectors have the same specificity (0,1,0), so the cascade, and every screenshot, stays the same.

- [ ] **Step 5: Update the tests for the renames**

Run:

```bash
cd packages/tally-charts && perl -pi -e "s/'data-ch-dir'/'data-ch-direction'/g" $(grep -rl "'data-ch-dir'" src) && perl -pi -e "s/--ch-swatch-color/--_ch-swatch-color/g" src/react/ui/util.test.ts src/react/ui/Legend.test.tsx src/react/charts/StripPlot.test.tsx && cd ../..
```

In `packages/tally-charts/src/theme/theme.test.ts`:
- in `declarations`, `/(--ch-[\w-]+):\s*([^;]+);/g` → `/(--_?ch-[\w-]+):\s*([^;]+);/g`
- `const SEQ = declarations(/\[data-ch-root\],\s*\.ch-legend,\s*\.ch-heatmap/)` →

```ts
const SEQ = declarations(
  /\[data-ch-root\],\s*\[data-ch-part="legend"\],\s*\[data-ch-part="heatmap"\]/,
)
```

- in the median test, `var(--ch-swatch-color)` → `var(--_ch-swatch-color)` in the `mix` string, and `var\(--ch-swatch-color\)` → `var\(--_ch-swatch-color\)` in the regex
- `SEQ.get('--ch-seq-ink-strong')` → `SEQ.get('--_ch-seq-ink-strong')` (twice: the sequential-levels test and the contrast matrix)
- `expect(css).not.toMatch(/(:root|\.ch-heatmap|\.ch-legend)[^{]*\{[^}]*--ch-seq-mix-\d:/)` →

```ts
    expect(css).not.toMatch(
      /(:root|\[data-ch-part="heatmap"\]|\[data-ch-part="legend"\])[^{]*\{[^}]*--ch-seq-mix-\d:/,
    )
```

- the three regexes of `it('puts white text only on the darkest heatmap level', …)` become:

```ts
    expect(css).toMatch(
      /\[data-ch-part="heatmap-cell"\]\[data-ch-level="5"\] \{[^}]*color: var\(--_ch-seq-ink-strong\)/,
    )
    expect(css).toMatch(/\[data-ch-part="heatmap-cell"\] \{[^}]*color: var\(--ch-ink\)/)
    expect(css).toMatch(
      /@media \(prefers-reduced-motion: reduce\) \{[^}]*\[data-ch-part="heatmap"\] \*/,
    )
```

Regenerate the SSR snapshot: `pnpm --filter tally-charts exec vitest run src/ssr.node.test.tsx -u`. Then check: `git diff packages/tally-charts/src/__snapshots__/` changes only `data-ch-dir=` → `data-ch-direction=` (12 bars).

- [ ] **Step 6: Document the styling surface**

In `packages/tally-charts/README.md`, insert after the paragraph that ends ``unless an ancestor sets `data-ch-theme="light"` or `"dark"`.``:

```md
## Styling

The public CSS surface is the `--ch-*` tokens below, `data-ch-part` on every element, and the
`data-ch-*` state and variant attributes (`data-ch-tone`, `data-ch-fill`, `data-ch-active`,
`data-ch-dimmed`, `data-ch-direction`, …). Class names (`ch-*`) and `--_ch-*` variables are
private and can change in any release: select `[data-ch-part="…"]` instead.

| Group | Tokens |
|---|---|
| Roles | `--ch-accent`, `--ch-accent-soft`, `--ch-loss`, `--ch-warn`, `--ch-gain`, `--ch-neutral` |
| Text and surfaces | `--ch-ink`, `--ch-ink-muted`, `--ch-grid`, `--ch-surface`, `--ch-tooltip-bg`, `--ch-tooltip-ink`, `--ch-tooltip-shadow` |
| Hatching | `--ch-hatch-angle` (degrees, unitless), `--ch-hatch-width`, `--ch-hatch-gap` (px, unitless), `--ch-hatch-tint` (stripe background opacity, 0–1) |
| Sequential | `--ch-seq-base` (default `--ch-loss`) and `--ch-seq-mix-1` … `--ch-seq-mix-5` (each level's share of the base). `--ch-seq-1` … `--ch-seq-5` are computed from them on every chart, legend and heatmap: read them, but steer them with the base and the mixes, since overriding them has no effect |
| Heatmap | `--ch-heatmap-cell-height` (default 44px) |
| Misc | `--ch-font-numeric`, `--ch-radius` (px), `--ch-duration`, `--ch-ease`, `--ch-dim-opacity`, `--ch-tone-text-mix` |
```

- [ ] **Step 7: Run the tests, the checks and the visual suite**

Run: `pnpm test && pnpm typecheck && pnpm lint && pnpm build && pnpm size`
Expected: all PASS (785 tests).

Run: `pnpm test:e2e`
Expected: PASS, 71 tests, with **no** baseline updated or written: the move of the selectors is visually a no-op. A failing screenshot means a selector lost its rule; find it with the surface test's lists and fix the CSS, never the baseline.

- [ ] **Step 8: Commit**

```bash
pnpm format
git add packages/tally-charts
git commit -m "feat!: declare the CSS surface: data-ch-part sub-parts, private --_ch-* variables

Co-Authored-By: <your own model trailer>"
```

---

### Task 13: Cut `tally-charts/core` to the frozen set (API-2)

**Files:**
- Modify: `packages/tally-charts/src/core/index.ts`, `packages/tally-charts/src/index.test.ts`
- Modify: `packages/tally-charts/src/core/warn.ts`, `packages/tally-charts/src/core/warn.test.ts`
- Modify: `packages/tally-charts/scripts/check-dev-strip.mjs`

**Interfaces:**
- Consumes: everything Tasks 1–12 export from `core/*`.
- Produces: `tally-charts/core` exports exactly:
  - formatting: `createFormatter`, `createFormatters`, `fmt`, `DEFAULT_LOCALE`, `DEFAULT_CURRENCY`, and the types `FormatOptions`, `FormatPreset`, `FormatPresetSpec`, `FormatSpec`, `Formatter`, `Formatters`, `LocaleOptions`
  - thresholds: `thresholds`, `heatmapLevel`, and the types `Thresholds`, `ThresholdBin`, `ThresholdLegendItem`
  - shared: `TONES`, `toNumber`, `toTime`, and the types `Tone`, `Fill`, `Id`, `Accessor`, `PerItem`, `SeqLevel`
  - scale types: `ScaleSpec`, `LinearScaleSpec`, `BandScaleSpec`, `PointScaleSpec`, `TimeScaleSpec`, `TimeInput`, `TimeZone`, `ResolvedScale`, `LinearScale`, `BandScale`, `PointScale`, `TimeScale`

  `isDev` is deleted. `DEV` stays internal.

- [ ] **Step 1: Write the failing test**

In `packages/tally-charts/src/index.test.ts`, replace the whole `it.each([ 'createScale', … ])('core exports %s', …)` block with:

```ts
  it('keeps tally-charts/core to formatting, thresholds, value parsing and types', () => {
    expect(Object.keys(core).sort()).toEqual([
      'DEFAULT_CURRENCY',
      'DEFAULT_LOCALE',
      'TONES',
      'createFormatter',
      'createFormatters',
      'fmt',
      'heatmapLevel',
      'thresholds',
      'toNumber',
      'toTime',
    ])
  })
```

In `packages/tally-charts/src/core/warn.test.ts`, change the import to `import { createWarner, DEV } from './warn'` and replace the two `isDev` tests with:

```ts
  it('is in development mode under vitest', () => {
    expect(DEV).toBe(true)
  })
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter tally-charts exec vitest run src/index.test.ts src/core/warn.test.ts`
Expected: FAIL. core exports about fifty names.

- [ ] **Step 3: Cut the exports**

Replace `packages/tally-charts/src/core/index.ts` with:

```ts
export type {
  FormatOptions,
  FormatPreset,
  FormatPresetSpec,
  FormatSpec,
  Formatter,
  Formatters,
  LocaleOptions,
} from './format'
export { createFormatter, createFormatters, DEFAULT_CURRENCY, DEFAULT_LOCALE, fmt } from './format'
export type { LinearScale } from './linear'
export { toNumber } from './number'
export type {
  BandScale,
  BandScaleSpec,
  LinearScaleSpec,
  PointScale,
  PointScaleSpec,
  ResolvedScale,
  ScaleSpec,
  TimeScaleSpec,
} from './scale'
export type { ThresholdBin, ThresholdLegendItem, Thresholds } from './thresholds'
export { heatmapLevel, thresholds } from './thresholds'
export type { TimeInput, TimeScale, TimeZone } from './time'
export { toTime } from './time'
export type { Accessor, Fill, Id, PerItem, SeqLevel, Tone } from './types'
export { TONES } from './types'
```

In `packages/tally-charts/src/core/warn.ts`, delete:

```ts
/** Alias of `DEV`, kept for the 0.1 public API. */
export const isDev = DEV
```

`check-dev-strip.mjs` read `isDev` from `dist/core/index.js`. Point it at the source module, which tsdown copies verbatim into its own chunk. Replace:

```js
// Evaluate DEV in a context without `process`, like a browser running a dev bundle.
const devFlag = await bundle('development', {
  stdin: {
    contents: "import { isDev } from './dist/core/index.js'\nglobalThis.__isDev = isDev",
    resolveDir: process.cwd(),
  },
  format: 'iife',
})
```

with:

```js
// Evaluate DEV in a context without `process`, like a browser running a dev bundle. DEV is
// internal; tsdown.config.ts keeps src/core/warn.ts verbatim in its own dist chunk.
const devFlag = await bundle('development', {
  stdin: {
    contents: "import { DEV } from './src/core/warn.ts'\nglobalThis.__isDev = DEV",
    resolveDir: process.cwd(),
    loader: 'ts',
  },
  format: 'iife',
})
```

- [ ] **Step 4: Check that nothing outside the package uses what was cut**

Run: `grep -rn "tally-charts/core" apps packages/tally-charts/README.md --include='*.ts' --include='*.tsx' --include='*.md' | grep -v node_modules`
Expected: only the README's Server Components paragraph, which names `fmt` and `createFormatter`, both still exported.

- [ ] **Step 5: Run the tests and checks**

Run: `pnpm test && pnpm typecheck && pnpm lint && pnpm build && pnpm size && pnpm --filter tally-charts check:dev-strip`
Expected: all PASS (763 tests; the per-name core cases became one exact list). `tally-charts/core` drops to about 1.2 kB. check:dev-strip prints `ok: … (17/17 phrases)`.

- [ ] **Step 6: Commit**

```bash
pnpm format
git add packages/tally-charts
git commit -m "feat(core)!: export only formatting, thresholds, value parsing and types

Co-Authored-By: <your own model trailer>"
```

---

### Task 14: The API freeze guard (spec §3 "Freeze guard")

**Files:**
- Create: `packages/tally-charts/api-extractor.json`, `packages/tally-charts/api-extractor.core.json`
- Create (generated): `packages/tally-charts/api/tally-charts.api.md`, `packages/tally-charts/api/core.api.md`
- Create: `packages/tally-charts/src/api-report.test.ts`
- Modify: `packages/tally-charts/package.json`, `packages/tally-charts/src/index.ts`, `.github/workflows/ci.yml`, `.gitignore`

**Interfaces:**
- Consumes: the built `dist/index.d.ts` and `dist/core/index.d.ts`.
- Produces:
  - `pnpm --filter tally-charts api:update`, which regenerates both reports (`--local`)
  - `pnpm --filter tally-charts api:check`, which exits 1 when a report differs from the build ("You have changed the API signature …")
  - a CI `check` step running `api:check` after `pnpm build`
  - root export `LocaleOptions` (referenced by `FormatOptions`)

- [ ] **Step 1: Install API Extractor**

Run: `pnpm --filter tally-charts add -D @microsoft/api-extractor@7.59.3`
Expected: `"@microsoft/api-extractor": "7.59.3"` in devDependencies. 7.59.3 is from 2026-09-28. It bundles TypeScript 5.9.3 and reads our TypeScript 6 `.d.ts` fine; every run prints a notice that the project uses a newer TypeScript, which is expected.

- [ ] **Step 2: Configure both entry points**

Create `packages/tally-charts/api-extractor.json`:

```json
{
  "$schema": "https://developer.microsoft.com/json-schemas/api-extractor/v7/api-extractor.schema.json",
  "mainEntryPointFilePath": "<projectFolder>/dist/index.d.ts",
  "compiler": {
    "overrideTsconfig": {
      "compilerOptions": {
        "target": "ES2022",
        "lib": ["ES2022", "DOM", "DOM.Iterable"],
        "module": "ESNext",
        "moduleResolution": "Bundler",
        "jsx": "react-jsx",
        "strict": true,
        "skipLibCheck": true,
        "types": []
      },
      "files": ["dist/index.d.ts"]
    }
  },
  "apiReport": {
    "enabled": true,
    "reportFileName": "tally-charts",
    "reportFolder": "<projectFolder>/api/",
    "reportTempFolder": "<projectFolder>/temp/api/"
  },
  "docModel": { "enabled": false },
  "dtsRollup": { "enabled": false },
  "tsdocMetadata": { "enabled": false },
  "messages": {
    "compilerMessageReporting": { "default": { "logLevel": "warning" } },
    "extractorMessageReporting": {
      "default": { "logLevel": "warning", "addToApiReportFile": true },
      "ae-missing-release-tag": { "logLevel": "none", "addToApiReportFile": false },
      "ae-undocumented": { "logLevel": "none", "addToApiReportFile": false },
      "ae-forgotten-export": { "logLevel": "error", "addToApiReportFile": false }
    },
    "tsdocMessageReporting": { "default": { "logLevel": "none", "addToApiReportFile": false } }
  }
}
```

Create `packages/tally-charts/api-extractor.core.json`, the same file with three values changed (`"mainEntryPointFilePath": "<projectFolder>/dist/core/index.d.ts"`, `"files": ["dist/core/index.d.ts"]` and `"reportFileName": "core"`):

```json
{
  "$schema": "https://developer.microsoft.com/json-schemas/api-extractor/v7/api-extractor.schema.json",
  "mainEntryPointFilePath": "<projectFolder>/dist/core/index.d.ts",
  "compiler": {
    "overrideTsconfig": {
      "compilerOptions": {
        "target": "ES2022",
        "lib": ["ES2022", "DOM", "DOM.Iterable"],
        "module": "ESNext",
        "moduleResolution": "Bundler",
        "jsx": "react-jsx",
        "strict": true,
        "skipLibCheck": true,
        "types": []
      },
      "files": ["dist/core/index.d.ts"]
    }
  },
  "apiReport": {
    "enabled": true,
    "reportFileName": "core",
    "reportFolder": "<projectFolder>/api/",
    "reportTempFolder": "<projectFolder>/temp/api/"
  },
  "docModel": { "enabled": false },
  "dtsRollup": { "enabled": false },
  "tsdocMetadata": { "enabled": false },
  "messages": {
    "compilerMessageReporting": { "default": { "logLevel": "warning" } },
    "extractorMessageReporting": {
      "default": { "logLevel": "warning", "addToApiReportFile": true },
      "ae-missing-release-tag": { "logLevel": "none", "addToApiReportFile": false },
      "ae-undocumented": { "logLevel": "none", "addToApiReportFile": false },
      "ae-forgotten-export": { "logLevel": "error", "addToApiReportFile": false }
    },
    "tsdocMessageReporting": { "default": { "logLevel": "none", "addToApiReportFile": false } }
  }
}
```

`ae-forgotten-export` is an error that is logged rather than written into the report (`addToApiReportFile: false`), so a public type that references an unexported one fails the run, in `--local` mode too. `ae-missing-release-tag` is off: everything exported is public. The reports still mark members without a doc comment as `// (undocumented)`; that is API Extractor's report format, not a warning.

In `packages/tally-charts/package.json`, add to `"scripts"` after `"check:dev-strip"`:

```json
    "api:check": "api-extractor run --config api-extractor.json && api-extractor run --config api-extractor.core.json",
    "api:update": "api-extractor run --local --config api-extractor.json && api-extractor run --local --config api-extractor.core.json"
```

Append `packages/tally-charts/temp/` to the root `.gitignore` (API Extractor's working copies of the reports).

- [ ] **Step 3: Write the failing report test**

Create `packages/tally-charts/src/api-report.test.ts`:

```ts
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
```

Run: `pnpm --filter tally-charts exec vitest run src/api-report.test.ts`
Expected: FAIL: `api/tally-charts.api.md` doesn't exist.

- [ ] **Step 4: Generate the reports**

Run: `mkdir -p packages/tally-charts/api && pnpm --filter tally-charts build && pnpm --filter tally-charts api:update`
Expected: FAIL on the root entry with `ae-forgotten-export`: `The symbol "LocaleOptions" needs to be exported by the entry point index.d.ts` (`FormatOptions extends LocaleOptions`).

Fix it: in `packages/tally-charts/src/index.ts`, add `LocaleOptions,` after `Formatters,` in the `./core/format` type export. Then run `pnpm --filter tally-charts build && pnpm --filter tally-charts api:update` again.
Expected: `API Extractor completed successfully` twice, and the two new files `packages/tally-charts/api/tally-charts.api.md` (about 1,230 lines) and `packages/tally-charts/api/core.api.md` (about 250 lines).

Read both reports top to bottom against spec §3. Check:
- no `import … from 'd3-…'`
- `ResolvedScale` has the four arms
- `ChartContextValue` has the 17 public fields
- `useChart(): ChartContextValue` and `useRegisterPoints(points: readonly ChartPoint[]): void`
- `ChartPoint<D = unknown>`
- `AxisFormat` and `AxisValue`
- `yAxis`, `yAxisFormat` and `xAxisFormat` on `LineChartProps`
- `segments` on `BarsProps`, and `good` / `onPlanLabel` on `ComparisonBarsProps`
- core holds only the Task 13 list

Anything else is a finding to fix before the freeze, not to record.

- [ ] **Step 5: Verify the guard trips**

Run: `pnpm --filter tally-charts exec vitest run src/api-report.test.ts && pnpm --filter tally-charts api:check`
Expected: PASS and `API Extractor completed successfully` twice, with exit 0.

Then edit one character of `packages/tally-charts/api/core.api.md` (e.g. `"USD"` → `"EUR"`), run `pnpm --filter tally-charts api:check; echo $?`, and expect `Warning: You have changed the API signature for this project…` and `1`. Restore the file: `git checkout packages/tally-charts/api/core.api.md`.

- [ ] **Step 6: Run it in CI**

In `.github/workflows/ci.yml`, in the `check` job, add after `- run: pnpm build`:

```yaml
      - run: pnpm --filter tally-charts api:check
```

- [ ] **Step 7: Run the checks**

Run: `pnpm test && pnpm typecheck && pnpm lint && pnpm build && pnpm --filter tally-charts api:check && pnpm size`
Expected: all PASS (767 tests).

- [ ] **Step 8: Commit**

```bash
pnpm format
git add packages/tally-charts .github/workflows/ci.yml .gitignore pnpm-lock.yaml
git commit -m "build: API Extractor reports for both entry points, checked in CI

Co-Authored-By: <your own model trailer>"
```

From here on, any change to the public API shows up in a `git diff` of `packages/tally-charts/api/*.api.md`: run `pnpm --filter tally-charts build && pnpm --filter tally-charts api:update` and commit the reports with the change.

---

### Task 15: Time-axis stories, e2e and baselines (spec §7 "New stories"; §1)

**Files:**
- Create: `apps/storybook/stories/TimeAxis.stories.tsx`
- Modify: `apps/storybook/e2e/stories.spec.ts`
- Create: 6 darwin and 6 linux PNGs under `apps/storybook/e2e/__screenshots__/`

**Interfaces:**
- Consumes: the public API (`LineChart` with `x={{ type: 'time', field }}`, `yAxis`).
- Produces: the story ids `charts-time-axis--hourly-light` / `--hourly-dark`, `--daily-light` / `--daily-dark` and `--monthly-light` / `--monthly-dark`.

- [ ] **Step 1: Write the stories**

Create `apps/storybook/stories/TimeAxis.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite'
import { LineChart } from 'tally-charts'

// LineChart on a time x axis, in UTC (the default), over three spans: a day of hourly readings,
// a quarter of daily ones and five years of monthly ones. The data is computed, not random, so
// the screenshots are stable.
const DAY = 864e5
const round1 = (v: number) => Math.round(v * 10) / 10

type Reading = { at: string | number | Date; value: number }

const SPANS = {
  hourly: {
    title: 'Line load today',
    meta: 'Share of capacity, hourly',
    description: 'Load peaks at 70% at 3 PM and bottoms out at 34% at 3 AM.',
    format: 'percent',
    // ISO strings, one per hour of March 2, 2026.
    data: Array.from(
      { length: 24 },
      (_, h): Reading => ({
        at: new Date(Date.UTC(2026, 2, 2, h)).toISOString(),
        value: round1(52 + 18 * Math.sin(((h - 9) / 24) * 2 * Math.PI)),
      }),
    ),
  },
  daily: {
    title: 'Margin this quarter',
    meta: 'Daily, January to March 2026',
    description: 'Margin rises from 32.0% on January 1 to 34.4% on March 31, dipping every week.',
    format: 'percent',
    // Epoch milliseconds, one per day of Q1 2026.
    data: Array.from(
      { length: 90 },
      (_, d): Reading => ({
        at: Date.UTC(2026, 0, 1) + d * DAY,
        value: round1(32 + d * 0.04 + 1.2 * Math.sin((d / 7) * 2 * Math.PI)),
      }),
    ),
  },
  monthly: {
    title: 'Revenue over five years',
    meta: 'Monthly, 2021 to 2025, $K',
    description:
      'Revenue grows from $365K in January 2021 to $725K in December 2025, peaking every summer.',
    format: 'number',
    // Dates, one per month from January 2021 to December 2025.
    data: Array.from(
      { length: 60 },
      (_, m): Reading => ({
        at: new Date(Date.UTC(2021, m, 1)),
        value: Math.round(410 + m * 6 + 45 * Math.sin(((m - 3) / 12) * 2 * Math.PI)),
      }),
    ),
  },
} as const

function TimeAxis({ span }: { span: keyof typeof SPANS }) {
  const s = SPANS[span]
  return (
    <article className="card">
      <header className="card-header card-header-stack">
        <h2 className="card-title">{s.title}</h2>
        <span className="card-meta">{s.meta}</span>
      </header>
      <LineChart<Reading>
        title={s.title}
        description={s.description}
        data={s.data}
        x={{ type: 'time', field: 'at' }}
        series={[{ id: 'value', label: s.title, value: 'value' }]}
        format={s.format}
        yAxis={4}
        height={240}
        radius={span === 'hourly' ? 3 : 0}
      />
    </article>
  )
}

const meta = { title: 'Charts/Time axis', component: TimeAxis } satisfies Meta<typeof TimeAxis>

export default meta
type Story = StoryObj<typeof meta>

export const HourlyLight: Story = { args: { span: 'hourly' }, parameters: { theme: 'light' } }
export const HourlyDark: Story = { args: { span: 'hourly' }, parameters: { theme: 'dark' } }
export const DailyLight: Story = { args: { span: 'daily' }, parameters: { theme: 'light' } }
export const DailyDark: Story = { args: { span: 'daily' }, parameters: { theme: 'dark' } }
export const MonthlyLight: Story = { args: { span: 'monthly' }, parameters: { theme: 'light' } }
export const MonthlyDark: Story = { args: { span: 'monthly' }, parameters: { theme: 'dark' } }
```

The three inputs use the three `TimeInput` forms (ISO strings, epoch ms, `Date`s), all in UTC, the default zone (spec §8: "the stories use 'utc'"). The descriptions state the data's real extremes:
- hourly: 70.0 at 15:00, 34.0 at 03:00, 43.0 at 23:00
- daily: 32.0 on Jan 1, 34.4 on Mar 31
- monthly: 365 in January 2021, 725 in December 2025

Run `pnpm --filter storybook-app typecheck`. Expected: PASS.

- [ ] **Step 2: Look at the stories**

Start your own dev server on a free port (`pnpm --filter storybook-app exec storybook dev -p 6010 --no-open`); leave any server on 6006 alone. Screenshot each of the six stories into your scratchpad at 800 px wide. Check:
- **hourly:** "Mar 2, 12:00 AM" at the left edge, anchored inside the plot; "12:00 PM" in the middle and "Mar 3" at the right (crowded labels are thinned); the y axis "30%" … "70%"; small dots on the line. Focus and End show "Mar 2, 11:00 PM | 43.0% Line load today".
- **daily:** "Jan 2026", "Feb", "Mar", "Apr"; a rising line with a weekly wobble; no dots.
- **monthly:** "2021" … "2026"; a rising line with a peak every summer.
- **dark** versions: the same with dark tokens.

Clipped or overlapping labels, or a line outside the plot, are defects. Fix them in the library with a unit test, list them in the report, then continue. Stop your dev server afterwards.

- [ ] **Step 3: Extend the e2e suite**

In `apps/storybook/e2e/stories.spec.ts`, add to `STORIES` after `'reference-where-it-leaks--dark',`:

```ts
  'charts-time-axis--hourly-light',
  'charts-time-axis--hourly-dark',
  'charts-time-axis--daily-light',
  'charts-time-axis--daily-dark',
  'charts-time-axis--monthly-light',
  'charts-time-axis--monthly-dark',
```

(The 520 px cards fit the default 800 × 600 viewport, so `WIDE_STORIES` is unchanged.) Append:

```ts
test('a time axis labels dates and the keyboard announces them', async ({ page }) => {
  await open(page, 'charts-time-axis--hourly-light')
  const chart = page.getByRole('figure', { name: 'Line load today' })
  await expect(chart.locator('[data-ch-part="axis-label"]').last()).toHaveText('Mar 3')
  await chart.focus()
  await page.keyboard.press('End')
  await expect(chart.locator('[aria-live]')).toHaveText('Mar 2, 11:00 PM, 43.0% Line load today')
  await expect(page.locator('[data-ch-part="tooltip"]')).toContainText('Mar 2, 11:00 PM')
})

test('a monthly time axis shows years and announces months', async ({ page }) => {
  await open(page, 'charts-time-axis--monthly-light')
  const chart = page.getByRole('figure', { name: 'Revenue over five years' })
  await expect(
    chart.locator('[data-ch-part="axis-label"]').filter({ hasText: /^20\d\d$/ }),
  ).toHaveCount(6)
  await chart.focus()
  await page.keyboard.press('Home')
  await expect(chart.locator('[aria-live]')).toHaveText('Jan 2021, 365 Revenue over five years')
})
```

- [ ] **Step 4: Generate darwin baselines and verify**

Run: `pnpm --filter storybook-app exec playwright test --update-snapshots=missing`, then `pnpm test:e2e`.
Expected: the second run PASSES with 85 tests (34 stories × 2, plus 17 interaction tests). `git status` shows 6 new darwin PNGs and no other PNG changed. Open each new one: it must show the whole card, with both axes labelled and the line drawn in full.

- [ ] **Step 5: Generate and verify linux baselines**

Run the docker route from the comment above the `e2e` job in `.github/workflows/ci.yml`, from the repo root, with Docker running. It regenerates every linux baseline in a copy of the repo, re-runs the suite without updating, and copies the PNGs out only if that run passes. Then run `git status apps/storybook/e2e/__screenshots__/linux`.
Expected: the 6 new `charts-time-axis--*.png` files. If an existing linux PNG shows as modified, keep the committed one (`git checkout -- <file>`) unless you can name the 0.6a change that moved it. Open each new PNG.

- [ ] **Step 6: Commit**

```bash
pnpm format
git add apps/storybook
git commit -m "test: time-axis stories (hourly, daily, monthly; both themes), e2e and baselines

Co-Authored-By: <your own model trailer>"
```

---

### Task 16: README, changeset and final verification

**Files:**
- Modify: `packages/tally-charts/README.md`
- Create: `.changeset/foundation-0-6.md`

**Interfaces:**
- Consumes: everything above.
- Produces: the user-facing record of 0.6a. 0.6b extends the same README section and the same changeset with its own changes.

- [ ] **Step 1: Document 0.6a in the README**

In `packages/tally-charts/README.md`:

1. Replace the status line `> Status: 0.5. The API may change before 1.0.` with `> Status: 0.6. The public API is frozen for 1.0: see "Changes in 0.6" below.`

2. In the `LineChart` bullet, replace

```md
  each series its own `id`. `grid` follows the `axis` ticks, or `'all'` with `axis="none"`. A
```

with

```md
  each series its own `id`. `yAxis` and `yAxisFormat` set the value axis, `xAxis` and
  `xAxisFormat` the x axis (tooltip headers, announcements and the data table use the x format
  too). `grid` follows the `yAxis` ticks, or `'all'` with `yAxis="none"`. A
```

and the last two lines of the same bullet,

```md
  tooltip lists that value once. Without `domain`, the inferred domain covers every series, the
  band and the target.
```

with

```md
  tooltip lists that value once. Without `domain`, the inferred domain covers every series, the
  band and the target. For dates, pass a time scale spec as `x`:
  `x={{ type: 'time', field: 'date' }}` (`Date`, epoch ms or ISO strings). Rows are sorted by
  date, point ids are ISO strings (`'2026-01-04T00:00:00.000Z'`), and `forecastFrom` takes a
  date.
```

3. Replace `` - `onSelect` and `onActiveChange` receive your original data object as `point.datum`. `` with:

```md
- `onSelect` and `onActiveChange` receive your original data object as `point.datum`, typed:
  `ChartPoint<D>`. `tooltip` takes `true`, `false`, or a function that renders the content for
  a point, with the same `point.datum`.
```

4. Replace the end of the 0.5 building-blocks paragraph,

```md
`<Chart x>`. Time scales aren't in yet: put dates on a point scale with formatted labels.
`Legend` draws `shape="line"` swatches (`dashed` for forecasts) and sequential `level` swatches.
```

with:

```md
`<Chart x>`. `Legend` draws `shape="line"` swatches (`dashed` for forecasts) and sequential
`level` swatches; `heatmapLevel(value, breaks)` gives the level a Heatmap uses for a value.

## Time scales

`<Chart x={{ type: 'time', field: 'date' }}>` puts dates on the x axis; `LineChart` takes the
same spec as `x`. Values may be `Date`s, epoch ms or ISO 8601 strings (a date-only string is UTC
midnight); anything else is skipped with one warning. The domain is inferred and rounded out to
tick boundaries, a single date is padded by a day on each side, and an explicit `domain` is
kept as given unless you also set `nice: true`. Ticks snap to calendar units from seconds to decades and are
labelled multi-scale ("Jan 2026", "Feb", …, "2027"), or with a date format: `'day'`, `'month'`,
`'quarter'`, `'year'` or any `Intl.DateTimeFormatOptions`, in the `ChartsProvider` locale.
`zone` is `'utc'` by default, which renders the same on the server and the client; `'local'`
uses the viewer's zone and can differ between them, so prefer `'utc'` for server rendering.
`Line`, `Band`, `Area`, `Region`, `Target` (`x` as a date), `Grid`, `Axis` and `NearestPointer`
work on time scales; `Bars` and `ColumnHighlight` need a band scale and warn instead.

## Formatting

`format` takes a preset (`'currency'`, `'currency-compact'`, `'percent'`, `'pts'`, `'number'`,
`'hours'`), a preset with options (`{ preset: 'percent', digits: 0, signed: true }`), or a
function of the number. Axes take the same, a date format on a time axis, or a function of the
tick (`AxisValue`: a number, the category, or a `Date`). On an axis whose ticks are all whole
numbers, percent and pts drop their decimals ("0%", not "0.0%"). `axis` and `axisFormat` mean the
chart's only axis; `LineChart` has two, so it uses `xAxis` / `yAxis`.

## Conventions

- `BarChart`'s `x` is the category and `y` the value in both orientations.
- `at` is scoped by its mark: a data index (number) on `ValueLabel`, a category on
  `ColumnHighlight`, a value on a `Connector` link.
- `radius` is the corner radius on `Bars` and `ColumnHighlight`, and the dot radius elsewhere.
- Toggles are bare booleans (`legend`, `totals`, `grid`, `tooltip`, …); only `showValues` and
  `showScale` carry `show`, where the bare word would be ambiguous.
- Defaults follow the reference cards, so they differ by chart: heights (Chart 240, LineChart
  280, DotHistogram 220, WaffleColumns 200, BridgeChart 360), band padding (0.2 on a band
  scale, 0.35 BarChart, 0.45 BridgeChart, 0.3 WaffleColumns), tick counts (5, DotHistogram 6)
  and tones (InlineBar, RangeMeter and DotCount 'loss', Meter 'accent').
- `meta` is a number on a `WaterfallStep` and an accessor on `RankedBars`. To carry more per
  step, extend the step type (`WaterfallChart<MyStep>`) rather than packing it into `meta`.

## Custom marks

Inside `<Chart>`, `useChart()` returns the size, the margins, the data, the scales (`x` and
`y`, narrowed on `kind`: `'linear'`, `'band'`, `'point'` or `'time'`), the number formatter and
the active point. `useRegisterPoints(points)` registers a mark's points for hover, keyboard and
tooltips; memoize the array.
```

5. Replace the Server Components sentence ``In server code, import `fmt` and `createFormatter` from `tally-charts/core`, which has no React and is server-safe.`` with:

```md
In server code, import from
`tally-charts/core`, which has no React and is server-safe: the formatters (`fmt`,
`createFormatter`, `createFormatters`), `thresholds`, `heatmapLevel`, `toNumber`, `toTime` and
the shared types.
```

6. Insert before the final `MIT licensed.` line:

```md
## Changes in 0.6

0.6 freezes the public API. Every breaking rename, before → after:

- `<LineChart axis={…} axisFormat={…}>` → `<LineChart yAxis={…} yAxisFormat={…}>`, plus a new
  `xAxisFormat`.
- `<LineChart band={…}>`'s type `LineRange` → `LineBand`.
- `<Bars tooltip={(d) => segments}>` → `<Bars segments={(d) => segments}>`.
- `<ComparisonBars overIsBad={false}>` → `<ComparisonBars good="up">` (default `good="down"`);
  `onPlanText` → `onPlanLabel`.
- `useChart('MyMark')` → `useChart()`, which returns only the public fields (`chartId`, `warn`,
  `radius`, `registerPoints` and `unregisterPoints` are gone).
- `useRegisterPoints(ctx, points)` → `useRegisterPoints(points)`.
- `ctx.x.scale` / `ctx.y.scale` are the library's own `LinearScale`, `BandScale`, `PointScale`
  and `TimeScale`; d3-only methods such as `.copy()` are gone. d3-scale is no longer a
  dependency.
- Axis format functions get an `AxisValue` (`string | number | Date`): `(v: string | number) =>
  string` → `(v: AxisValue) => string`, or drop the annotation.
- The types `ComparisonStatus`, `WaterfallKind` and `DeltaDirection` are no longer exported; use
  string literals.
- `tally-charts/core` keeps only formatting, `thresholds`, `heatmapLevel`, `toNumber`, `toTime`
  and the shared and scale types. `createScale`, `computeBars`, `categoryTicks` and the other
  layout helpers, `createWarner` and `isDev` are internal now.
- CSS: style `[data-ch-part="…"]`, not classes (`.ch-pill-seg` → `[data-ch-part="pill-segment"]`,
  `.ch-swatch` → `[data-ch-part="legend-swatch"]`, …). `--ch-swatch-color`,
  `--ch-range-ref-color`, `--ch-heatmap-columns` and `--ch-seq-ink-strong` became private
  `--_ch-*` variables. `[data-ch-dir]` on bars → `[data-ch-direction]`, as on `Delta`.
- Percent and pts axes drop their decimals when every tick is whole: "0%", not "0.0%".
- `<Chart>` (and so every high-level chart) and `Heatmap` warn in development when `title` is
  missing.

Additions: time scales, `ChartPoint<D>` in callbacks, a function `tooltip` on high-level charts,
`{ preset, digits, signed }` formats, `axisFormat` on `BarChart` and `DotHistogram`, `chartId`
on `Heatmap`, `heatmapLevel`, and readonly arrays everywhere.
```

- [ ] **Step 2: Add the changeset**

Create `.changeset/foundation-0-6.md`:

```md
---
'tally-charts': minor
---

Time scales and the API freeze. `<Chart x={{ type: 'time' }}>` and `LineChart` take dates
(`Date`, epoch ms or ISO strings) with calendar ticks from seconds to decades, multi-scale
labels, date formats (`'auto'`, `'day'`, `'month'`, `'quarter'`, `'year'`, Intl options) and a
`'utc'` (default) or `'local'` zone. `Line`, `Band`, `Area`, `Region`, `Target`, `Grid`, `Axis`
and `NearestPointer` work on them. The public API is now recorded in `api/*.api.md` and checked
in CI.

Breaking:
- LineChart `axis` / `axisFormat` → `yAxis` / `yAxisFormat`, plus `xAxisFormat`; `LineRange` →
  `LineBand`.
- `Bars` `tooltip` → `segments`.
- ComparisonBars `overIsBad` → `good: 'up' | 'down'` (default `'down'`), `onPlanText` →
  `onPlanLabel`.
- `useChart()` takes no argument and returns only the public context fields;
  `useRegisterPoints(points)` reads the chart itself.
- Resolved scales use the library's own `LinearScale`, `BandScale`, `PointScale` and `TimeScale`;
  no d3 types in the published `.d.ts`, and d3-scale is no longer a dependency.
- Axis format functions take `AxisValue` (`string | number | Date`).
- `ComparisonStatus`, `WaterfallKind` and `DeltaDirection` are no longer exported.
- `tally-charts/core` exports only formatting, thresholds, `heatmapLevel`, `toNumber`, `toTime`
  and types; the layout helpers, `createWarner` and `isDev` are internal.
- CSS: sub-parts are styled through `data-ch-part`, classes are private, private variables are
  `--_ch-*`, and `data-ch-dir` is `data-ch-direction`.
- Whole percent and pts axis ticks read "0%", not "0.0%".

Added: `ChartPoint<D>` in callbacks, a function `tooltip` on every high-level chart,
`{ preset, digits, signed }` format objects, `axisFormat` on BarChart and DotHistogram, `chartId`
on Heatmap, `heatmapLevel`, readonly array props, and a development warning for charts and
heatmaps without a `title`.
```

- [ ] **Step 3: Final verification**

Run: `pnpm test && pnpm typecheck && pnpm lint && pnpm build && pnpm size && pnpm --filter tally-charts check:dev-strip && pnpm --filter tally-charts api:check && pnpm test:e2e`
Expected: all PASS: 767 unit tests and 85 e2e tests. Record every size-limit number in the report. The budgets, measured on this plan's code:

| Check | Budget | Measured while planning |
|---|---|---|
| `tally-charts/core` | 8 kB | 1.22 kB |
| each chart | 15 kB | 9.8–12.5 kB (BridgeChart largest) |
| `LineChart` | 12 kB | 11.94 kB |
| Small UI pieces | 4 kB | 2.73 kB |

Never raise a budget; if one is over, report BLOCKED with the numbers.

Then check spec §1's 0.6a criteria by hand:
- `grep -rlE "from ['\"]d3-" packages/tally-charts/dist --include='*.d.ts'` prints nothing
- the reports in `packages/tally-charts/api/` are committed
- the six time stories render hours, a quarter and five years in UTC

- [ ] **Step 4: Commit**

```bash
pnpm format
git add packages/tally-charts/README.md .changeset/foundation-0-6.md
git commit -m "docs: 0.6a in the README (time scales, formatting, conventions, changes) and changeset

Co-Authored-By: <your own model trailer>"
```

---

## After the plan

Plan 0.6b starts from `main` once this branch is merged. It covers spec §5–§7:
- the keyboard model and announcements
- tone contrast and forced colors
- heatmap semantics and the palette
- reflow at 320 px
- the e2e gates (`wcag22aa`, rendered contrast, reflow, forced colors)
- `docs/a11y.md`

It adds `--ch-heatmap-min-cell` to `src/theme/surface.test.ts` and the README token table, extends "Changes in 0.6" and `foundation-0-6`, and regenerates every visual baseline once at its end. That regeneration includes JobsByMargin's "0%" axis from Task 4.
