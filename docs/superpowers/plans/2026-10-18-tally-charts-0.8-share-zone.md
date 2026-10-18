# tally-charts 0.8 — ShareBar, ZoneMeter, first npm release — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two HTML small pieces, `ShareBar` (one bar split into parts of a whole, with a list) and `ZoneMeter` (good / needs work / poor zones with a value marker), recreate the Performance reference screen in Storybook, and prepare the first npm release as 0.8.0.

**Architecture:** Both components live in `packages/tally-charts/src/react/ui/` next to `Meter`, `RangeMeter` and `InlineBar`: plain HTML styled by `theme.css` through `data-ch-part` attributes, tones through the private `--_ch-swatch-color` and the shared `.ch-fillable` class. `ShareBar`'s arithmetic (percentages, default tones, warnings) is a pure helper in `share.ts` with its own tests. `ZoneMeter` takes a `thresholds()` result for its zones. The reference story composes only public API.

**Tech Stack:** React 18/19, TypeScript 6, Vitest + Testing Library (jsdom), Biome, Storybook (react-vite), Playwright (screenshots, axe, reflow, forced colors), size-limit, api-extractor, changesets, pnpm workspaces.

**Spec:** `docs/superpowers/specs/2026-10-18-tally-charts-0.8-share-zone-design.md`

## Global Constraints

- Release version **0.8.0**; all API changes additive; the API report gains only additions.
- No changes to `tally-charts/core` (its export list test must stay as is); "Small UI pieces" size entry ≤ **5 KB** gzip.
- Accessible names: every component takes a required `label: string`.
- Never pick the `loss` tone automatically: pink means loss and is only chosen explicitly.
- Default tone order for `ShareBar` segments without `tone`, by position: `accent`, `accent-soft`, `warn`, `neutral`, `gain`, repeating.
- New CSS tokens only: `--ch-share-gap` (default `2px`) and `--ch-zone-marker` (default `var(--ch-ink)`).
- Dev warnings go through `createWarner()` from `src/core/warn.ts` inside `if (DEV)`; messages are prefixed `[tally-charts] ` by the warner.
- Code style: match the neighbouring files (`Meter.tsx`, `Meter.test.tsx`): TSDoc on every prop, `data-ch-part` on every element, `cx()` for `className`, no semicolons, single quotes, 2-space indent, 100-column lines (Biome enforces).
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`.
- Commands run from the repo root `/Users/mateusz/projects/charts` unless a step says otherwise.

## Review Focus

1. **All segments 0, or `total` 0** — nothing to divide by. Expect: an empty track, every row "0 · 0%", no `NaN` in markup or styles. Pinned in Task 1 (`shareLayout` zero test) and Task 2 (render test).
2. **A tiny part next to huge ones** (43 of 5 849) — expect "1%" when the largest remainder rounds it up, "<1%" only when it rounds to 0, and a visible 3px sliver. Pinned in Task 1 and Task 2.
3. **`ZoneMeter` value exactly on a break** (2.5 with breaks [2.5, 4]) — `thresholds()` bins are lower-inclusive, so expect the upper zone ("Needs improvement"). Pinned in Task 3.
4. **`ZoneMeter` value above max or below min** — marker pinned to the end, `aria-valuenow` clamped, text says "above 6 s" / "below 0 s" and still names the real zone. Pinned in Task 3.
5. **Repeated renders with bad input** — warnings fire once per key (module-wide dedupe), never throw. Pinned in Task 1/3 warning tests (each key asserted once, in one test).

---

## File map

| File | Task | Responsibility |
|---|---|---|
| `packages/tally-charts/src/react/ui/share.ts` (create) | 1 | Pure math: tones, percentages, warnings |
| `packages/tally-charts/src/react/ui/share.test.ts` (create) | 1 | Tests for it |
| `packages/tally-charts/src/react/ui/ShareBar.tsx` (create) | 2 | Component |
| `packages/tally-charts/src/react/ui/ShareBar.test.tsx` (create) | 2 | Component tests |
| `packages/tally-charts/src/react/ui/ZoneMeter.tsx` (create) | 3 | Component |
| `packages/tally-charts/src/react/ui/ZoneMeter.test.tsx` (create) | 3 | Component tests |
| `packages/tally-charts/src/theme/theme.css` (modify) | 2, 3 | Styles, tokens, forced colors |
| `packages/tally-charts/src/index.ts`, `src/index.test.ts` (modify) | 4 | Public exports |
| `packages/tally-charts/test/fixtures.tsx`, `src/ssr.node.test.tsx` (modify) | 4 | SSR coverage |
| `packages/tally-charts/.size-limit.json` (modify) | 4 | Budget |
| `packages/tally-charts/api/tally-charts.api.md` (regenerated) | 4 | API report |
| `apps/storybook/stories/SmallPieces.stories.tsx`, `apps/storybook/e2e/stories.ts` (modify) | 4 | Stories + e2e gates |
| `packages/tally-charts/README.md`, `docs/a11y.md`, `.changeset/share-zone-0-8.md` | 4 | Docs |
| `apps/storybook/stories/Performance.stories.tsx` (create), Storybook CSS | 5 | Reference story |
| `packages/tally-charts/package.json` (modify) | 6 | Publish metadata |

---

### Task 1: `share.ts` — ShareBar arithmetic

**Files:**
- Create: `packages/tally-charts/src/react/ui/share.ts`
- Test: `packages/tally-charts/src/react/ui/share.test.ts`

**Interfaces:**
- Consumes: `Id`, `Tone`, `Fill` from `../../core/types`; `createWarner`, `DEV` from `../../core/warn`.
- Produces:
  ```ts
  export interface ShareSegment { id?: Id; label: string; value: number; tone?: Tone; fill?: Fill }
  export interface SharePart {
    key: Id; label: string; value: number; tone: Tone; fill: Fill
    /** Share of the whole in percent, unrounded, for widths. */
    share: number
    /** Whole percent from the largest remainder method. */
    percent: number
    /** "46%", or "<1%" for a part above 0 that rounds to 0. */
    percentText: string
  }
  export const SHARE_TONES: readonly Tone[] // ['accent','accent-soft','warn','neutral','gain']
  export function shareLayout(segments: readonly ShareSegment[], total?: number): { parts: SharePart[]; total: number }
  ```

- [ ] **Step 1: Write the failing tests**

```ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SHARE_TONES, shareLayout } from './share'

afterEach(() => vi.restoreAllMocks())

describe('shareLayout', () => {
  it('keeps order, shares and default tones by position, never loss', () => {
    const { parts, total } = shareLayout([
      { label: 'a', value: 2 },
      { label: 'b', value: 1, tone: 'loss' },
      { label: 'c', value: 1 },
    ])
    expect(total).toBe(4)
    expect(parts.map((p) => p.label)).toEqual(['a', 'b', 'c'])
    expect(parts.map((p) => p.share)).toEqual([50, 25, 25])
    expect(parts.map((p) => p.tone)).toEqual(['accent', 'loss', 'warn'])
    expect(parts.map((p) => p.fill)).toEqual(['solid', 'solid', 'solid'])
    expect(parts.map((p) => p.key)).toEqual([0, 1, 2])
    expect(SHARE_TONES).not.toContain('loss')
    const six = shareLayout(Array.from({ length: 6 }, (_, i) => ({ label: `${i}`, value: 1 })))
    expect(six.parts[5]?.tone).toBe('accent')
  })

  it('rounds percentages with the largest remainder so they add up to 100', () => {
    const { parts } = shareLayout([
      { label: 'Internal links', value: 2711 },
      { label: 'Search', value: 1968 },
      { label: 'Direct', value: 1101 },
      { label: 'Social', value: 43 },
      { label: 'External', value: 26 },
    ])
    expect(parts.map((p) => p.percent)).toEqual([46, 34, 19, 1, 0])
    expect(parts.reduce((s, p) => s + p.percent, 0)).toBe(100)
    expect(parts.map((p) => p.percentText)).toEqual(['46%', '34%', '19%', '1%', '<1%'])
  })

  it('leaves the rest of a larger total unassigned', () => {
    const { parts, total } = shareLayout([{ label: 'Reviewed', value: 62 }], 800)
    expect(total).toBe(800)
    expect(parts[0]?.share).toBeCloseTo(7.75)
    expect(parts[0]?.percent).toBe(8)
  })

  it('survives all zeros without NaN', () => {
    const { parts, total } = shareLayout([
      { label: 'a', value: 0 },
      { label: 'b', value: 0 },
    ])
    expect(total).toBe(0)
    expect(parts.map((p) => [p.share, p.percent, p.percentText])).toEqual([
      [0, 0, '0%'],
      [0, 0, '0%'],
    ])
  })

  it('counts bad values as 0, uses the sum over a smaller total, and warns once per case', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { parts, total } = shareLayout(
      [
        { label: 'a', value: -3 },
        { label: 'b', value: Number.NaN },
        { label: 'c', value: 5 },
      ],
      2,
    )
    expect(parts.map((p) => p.value)).toEqual([0, 0, 5])
    expect(total).toBe(5)
    shareLayout(Array.from({ length: 7 }, (_, i) => ({ label: `${i}`, value: 1 })))
    const messages = warn.mock.calls.map((c) => String(c[0]))
    expect(messages).toEqual([
      expect.stringContaining('ShareBar segment "a" has a value that is negative or not a number'),
      expect.stringContaining('ShareBar segment "b" has a value that is negative or not a number'),
      expect.stringContaining('ShareBar total 2 is smaller than the sum of its segments (5)'),
      expect.stringContaining('ShareBar has 7 segments'),
    ])
  })
})
```

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm --filter tally-charts exec vitest run src/react/ui/share.test.ts`
Expected: FAIL, "Failed to resolve import "./share"".

- [ ] **Step 3: Implement**

```ts
import { DEV, createWarner } from '../../core/warn'
import type { Fill, Id, Tone } from '../../core/types'

export interface ShareSegment {
  /** React key. Default: the index. */
  id?: Id
  label: string
  value: number
  /** Default: by position, `accent`, `accent-soft`, `warn`, `neutral`, `gain`, repeating. */
  tone?: Tone
  /** Default 'solid'. */
  fill?: Fill
}

export interface SharePart {
  key: Id
  label: string
  value: number
  tone: Tone
  fill: Fill
  /** Share of the whole in percent, unrounded, for widths. */
  share: number
  /** Whole percent from the largest remainder method. */
  percent: number
  /** "46%", or "<1%" for a part above 0 that rounds to 0. */
  percentText: string
}

/** Never 'loss': pink means loss and is only chosen explicitly. */
export const SHARE_TONES: readonly Tone[] = ['accent', 'accent-soft', 'warn', 'neutral', 'gain']

const warn = createWarner()

/** Whole percents that add up to round(sum of shares), by the largest remainder method. */
function largestRemainder(shares: readonly number[]): number[] {
  const floors = shares.map(Math.floor)
  let left = Math.round(shares.reduce((s, v) => s + v, 0)) - floors.reduce((s, v) => s + v, 0)
  const order = shares
    .map((s, i) => ({ i, rest: s - Math.floor(s) }))
    .sort((a, b) => b.rest - a.rest || a.i - b.i)
  for (const { i } of order) {
    if (left <= 0) break
    floors[i] = (floors[i] ?? 0) + 1
    left -= 1
  }
  return floors
}

export function shareLayout(
  segments: readonly ShareSegment[],
  total?: number,
): { parts: SharePart[]; total: number } {
  const values = segments.map((s) => {
    const ok = Number.isFinite(s.value) && s.value >= 0
    if (!ok && DEV) {
      warn(
        `share-value:${s.label}`,
        `ShareBar segment "${s.label}" has a value that is negative or not a number; it counts as 0.`,
      )
    }
    return ok ? s.value : 0
  })
  const sum = values.reduce((s, v) => s + v, 0)
  let whole = sum
  if (total !== undefined && Number.isFinite(total)) {
    if (total >= sum) whole = total
    else if (DEV) {
      warn(
        `share-total:${total}:${sum}`,
        `ShareBar total ${total} is smaller than the sum of its segments (${sum}); the sum is used.`,
      )
    }
  }
  if (DEV && segments.length > 6) {
    warn(
      `share-count:${segments.length}`,
      `ShareBar has ${segments.length} segments; tones repeat after 6, so neighbours may look alike.`,
    )
  }
  const shares = values.map((v) => (whole > 0 ? (v / whole) * 100 : 0))
  const percents = largestRemainder(shares)
  const parts = segments.map((s, i): SharePart => {
    const value = values[i] ?? 0
    const percent = percents[i] ?? 0
    return {
      key: s.id ?? i,
      label: s.label,
      value,
      tone: s.tone ?? (SHARE_TONES[i % SHARE_TONES.length] as Tone),
      fill: s.fill ?? 'solid',
      share: shares[i] ?? 0,
      percent,
      percentText: percent === 0 && value > 0 ? '<1%' : `${percent}%`,
    }
  })
  return { parts, total: whole }
}
```

Note: the warner dedupes by key for the whole module, so each warning case appears in exactly one test.

- [ ] **Step 4: Run the tests**

Run: `pnpm --filter tally-charts exec vitest run src/react/ui/share.test.ts`
Expected: PASS (5 tests). The 2711/1968/1101/43/26 case by hand: shares 46.35/33.65/18.82/0.735/0.445, floors 46+33+18+0+0 = 97, the three missing units go to the largest remainders .82 (Direct), .735 (Social), .65 (Search) → 46/34/19/1/0. Do not change expected values without redoing this check.

- [ ] **Step 5: Lint and commit**

```bash
pnpm lint
git add packages/tally-charts/src/react/ui/share.ts packages/tally-charts/src/react/ui/share.test.ts
git commit -m "feat: ShareBar arithmetic (largest remainder, default tones)

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: `ShareBar` component and styles

**Files:**
- Create: `packages/tally-charts/src/react/ui/ShareBar.tsx`, `packages/tally-charts/src/react/ui/ShareBar.test.tsx`
- Modify: `packages/tally-charts/src/theme/theme.css` (tokens in the three `:root`/theme blocks next to `--ch-hatch-*`; rules after the `[data-ch-part="meter-target-label"]` rule; forced-colors block near line 1430)

**Interfaces:**
- Consumes: `shareLayout`, `ShareSegment` from `./share` (Task 1); `useFormat` from `../ChartsProvider`; `cx`, `toneVar` from `./util`; `FormatSpec` from `../../core/format`.
- Produces: `export interface ShareBarProps`, `export function ShareBar(props: ShareBarProps)`; re-exports `ShareSegment` type. `data-ch-part` names: `share`, `share-bar`, `share-segment`, `share-list`, `share-row`, `share-swatch`, `share-label`, `share-value`.

- [ ] **Step 1: Write the failing tests**

```tsx
import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ShareBar } from './ShareBar'

const sources = [
  { label: 'Internal links', value: 2711, tone: 'gain' as const },
  { label: 'Search', value: 1968, tone: 'accent' as const },
  { label: 'Direct', value: 1101, tone: 'warn' as const },
  { label: 'Social', value: 43, tone: 'neutral' as const, fill: 'hatch' as const },
]

describe('<ShareBar>', () => {
  it('lists every part with value and percent, and hides the bar from screen readers', () => {
    const { container } = render(<ShareBar label="Where visitors come from" segments={sources} />)
    const group = screen.getByRole('group', { name: 'Where visitors come from' })
    const rows = within(group).getAllByRole('listitem')
    expect(rows.map((r) => r.textContent)).toEqual([
      'Internal links2,711 · 46%',
      'Search1,968 · 34%',
      'Direct1,101 · 19%',
      'Social43 · 1%',
    ])
    expect(container.querySelector('[data-ch-part="share-bar"]')).toHaveAttribute('aria-hidden', 'true')
  })

  it('sizes segments by share, paints tone and fill, and keeps a 3px minimum', () => {
    const { container } = render(<ShareBar label="s" segments={sources} />)
    const segs = container.querySelectorAll('[data-ch-part="share-segment"]')
    expect(segs).toHaveLength(4)
    expect(segs[0]).toHaveStyle({ flexBasis: `${(2711 / 5823) * 100}%` })
    expect(segs[3]).toHaveAttribute('data-ch-fill', 'hatch')
    expect(segs[3]).toHaveAttribute('data-ch-tone', 'neutral')
    expect(segs[3]).toHaveClass('ch-fillable')
  })

  it('switches the value text with legendValue', () => {
    const { container, rerender } = render(
      <ShareBar label="s" segments={sources} legendValue="percent" />,
    )
    const first = () => container.querySelector('[data-ch-part="share-value"]')?.textContent
    expect(first()).toBe('46%')
    rerender(<ShareBar label="s" segments={sources} legendValue="value" />)
    expect(first()).toBe('2,711')
  })

  it('leaves the rest of a larger total as empty track', () => {
    const { container } = render(
      <ShareBar label="Pages" total={800} segments={[{ label: 'Reviewed', value: 62 }]} />,
    )
    expect(container.querySelector('[data-ch-part="share-segment"]')).toHaveStyle({
      flexBasis: '7.75%',
    })
    expect(screen.getByRole('listitem')).toHaveTextContent('62 · 8%')
  })

  it('without the list, names the bar as an image', () => {
    render(<ShareBar label="Devices" legend={false} segments={[
      { label: 'Mobile', value: 79 },
      { label: 'Desktop', value: 20 },
      { label: 'Tablet', value: 1 },
    ]} />)
    expect(screen.queryByRole('list')).toBeNull()
    expect(screen.getByRole('img')).toHaveAccessibleName(
      'Devices: Mobile 79% (79), Desktop 20% (20), Tablet 1% (1)',
    )
  })

  it('does not draw zero segments but lists them, and never renders NaN', () => {
    const { container } = render(
      <ShareBar label="z" segments={[{ label: 'a', value: 0 }, { label: 'b', value: 0 }]} />,
    )
    expect(container.querySelectorAll('[data-ch-part="share-segment"]')).toHaveLength(0)
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
    expect(container.innerHTML).not.toContain('NaN')
  })
})
```

Expected rounding by hand: shares 46.56/33.80/18.91/0.74, floors 46+33+18+0 = 97, the three missing units go to the remainders .91 (Direct), .80 (Search), .74 (Social) → 46/34/19/1.

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm --filter tally-charts exec vitest run src/react/ui/ShareBar.test.tsx`
Expected: FAIL, cannot resolve `./ShareBar`.

- [ ] **Step 3: Implement the component**

```tsx
import type { CSSProperties } from 'react'
import type { FormatSpec } from '../../core/format'
import { useFormat } from '../ChartsProvider'
import { type ShareSegment, shareLayout } from './share'
import { cx, toneVar } from './util'

export type { ShareSegment } from './share'

export interface ShareBarProps {
  segments: readonly ShareSegment[]
  /** The whole. Default: the sum of the segments. A larger total leaves an empty track. */
  total?: number
  /** The list of parts under the bar. Default true. */
  legend?: boolean
  /** What each list row shows on the right. Default 'both' ("2,711 · 46%"). */
  legendValue?: 'both' | 'value' | 'percent'
  /** Default 'number'. */
  format?: FormatSpec
  /** Accessible name. */
  label: string
  className?: string
}

/** Parts of a whole: one bar split into segments, with an optional list of the parts. */
export function ShareBar({
  segments,
  total,
  legend = true,
  legendValue = 'both',
  format,
  label,
  className,
}: ShareBarProps) {
  const { create } = useFormat()
  const fmt = create(format)
  const { parts } = shareLayout(segments, total)
  const bar = (
    <div
      className="ch-share-bar"
      data-ch-part="share-bar"
      {...(legend
        ? { 'aria-hidden': true }
        : {
            role: 'img',
            'aria-label': `${label}: ${parts
              .map((p) => `${p.label} ${p.percentText} (${fmt(p.value)})`)
              .join(', ')}`,
          })}
    >
      {parts.map((p) =>
        p.value > 0 ? (
          <div
            key={p.key}
            className="ch-share-segment ch-fillable"
            data-ch-part="share-segment"
            data-ch-tone={p.tone}
            data-ch-fill={p.fill}
            style={{ ...toneVar(p.tone), flexBasis: `${p.share}%` } as CSSProperties}
          />
        ) : null,
      )}
    </div>
  )
  if (!legend) return <div className={cx('ch-share', className)} data-ch-part="share">{bar}</div>
  return (
    // biome-ignore lint/a11y/useSemanticElements: a named group of a bar and its list, not a fieldset
    <div className={cx('ch-share', className)} data-ch-part="share" role="group" aria-label={label}>
      {bar}
      <ul className="ch-share-list" data-ch-part="share-list">
        {parts.map((p) => (
          <li key={p.key} className="ch-share-row" data-ch-part="share-row">
            <span
              className="ch-share-swatch ch-fillable"
              data-ch-part="share-swatch"
              data-ch-tone={p.tone}
              data-ch-fill={p.fill}
              style={toneVar(p.tone)}
            />
            <span className="ch-share-label" data-ch-part="share-label">{p.label}</span>
            <span className="ch-share-value" data-ch-part="share-value">
              {legendValue === 'percent' ? (
                p.percentText
              ) : legendValue === 'value' ? (
                fmt(p.value)
              ) : (
                <>
                  {fmt(p.value)}
                  <span aria-hidden="true"> · </span>
                  {p.percentText}
                </>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

If Biome flags the `aria-hidden`/`role` spread or the `biome-ignore` comment placement, follow the pattern in `Meter.tsx` (comment directly above the element) and keep the behaviour.

- [ ] **Step 4: Run the tests**

Run: `pnpm --filter tally-charts exec vitest run src/react/ui/ShareBar.test.tsx`
Expected: PASS (6 tests).

- [ ] **Step 5: Add the styles**

In each of the three blocks that define `--ch-hatch-gap` (light `:root`, dark media query, `[data-ch-theme="dark"]`) only the light `:root` block needs the new tokens, since they do not change by theme:

```css
  --ch-share-gap: 2px;
  --ch-zone-marker: var(--ch-ink);
```

After the `[data-ch-part="meter-target-label"]` rule:

```css
[data-ch-part="share"] {
  display: grid;
  gap: 14px;
  font-variant-numeric: var(--ch-font-numeric);
}

[data-ch-part="share-bar"] {
  display: flex;
  gap: var(--ch-share-gap);
  height: 10px;
  overflow: hidden;
  border-radius: 999px;
  background: color-mix(in srgb, var(--ch-grid) 55%, transparent);
}

[data-ch-part="share-segment"] {
  flex-grow: 0;
  flex-shrink: 1;
  min-width: 3px;
}

[data-ch-part="share-list"] {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

[data-ch-part="share-row"] {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--ch-ink);
  font-size: 15px;
}

[data-ch-part="share-swatch"] {
  flex: none;
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

[data-ch-part="share-label"] {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

[data-ch-part="share-value"] {
  color: var(--ch-ink-muted);
  white-space: nowrap;
}
```

Add `[data-ch-part="share-segment"]` and `[data-ch-part="share-swatch"]` to the hatched-outline selector list (`[data-ch-fill="hatch"]:is(...)` that contains `meter-fill`). In the forced-colors block add both to the `forced-color-adjust: none` list and `[data-ch-part="share-bar"]` to the "Tracks and pills lose their only edge" list.

- [ ] **Step 6: Full unit run, lint, typecheck, commit**

```bash
pnpm test && pnpm lint && pnpm typecheck
git add packages/tally-charts/src/react/ui/ShareBar.tsx packages/tally-charts/src/react/ui/ShareBar.test.tsx packages/tally-charts/src/theme/theme.css
git commit -m "feat: ShareBar

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: `ZoneMeter` component and styles

**Files:**
- Create: `packages/tally-charts/src/react/ui/ZoneMeter.tsx`, `packages/tally-charts/src/react/ui/ZoneMeter.test.tsx`
- Modify: `packages/tally-charts/src/theme/theme.css`

**Interfaces:**
- Consumes: `Thresholds` from `../../core/thresholds`; `toNumber` from `../../core/number`; `useFormat`; `cx`, `toneVar`, `toPercent` from `./util`; `createWarner`, `DEV`.
- Produces: `export interface ZoneMeterProps`, `export function ZoneMeter(props: ZoneMeterProps)`. `data-ch-part` names: `zone-meter`, `zone-meter-track`, `zone-meter-zone`, `zone-meter-marker`, `zone-meter-labels`, `zone-meter-label`.

- [ ] **Step 1: Write the failing tests**

```tsx
import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { thresholds } from '../../core/thresholds'
import { ZoneMeter } from './ZoneMeter'

afterEach(() => vi.restoreAllMocks())

const lcp = thresholds([2.5, 4], ['gain', 'warn', 'loss'], ['Good', 'Needs improvement', 'Poor'])
const seconds = (v: number) => `${v.toFixed(1)} s`

describe('<ZoneMeter>', () => {
  it('exposes a meter whose text names the value and its zone', () => {
    render(<ZoneMeter label="LCP" value={4.1} zones={lcp} max={6} format={seconds} />)
    const meter = screen.getByRole('meter', { name: 'LCP' })
    expect(meter).toHaveAttribute('aria-valuemin', '0')
    expect(meter).toHaveAttribute('aria-valuemax', '6')
    expect(meter).toHaveAttribute('aria-valuenow', '4.1')
    expect(meter).toHaveAttribute('aria-valuetext', '4.1 s, Poor')
  })

  it('puts a value on a break in the upper zone', () => {
    render(<ZoneMeter label="LCP" value={2.5} zones={lcp} max={6} format={seconds} />)
    expect(screen.getByRole('meter')).toHaveAttribute('aria-valuetext', '2.5 s, Needs improvement')
  })

  it('draws linear zones clipped to the range, in their tones', () => {
    const { container } = render(<ZoneMeter label="LCP" value={1} zones={lcp} max={6} />)
    const zones = [...container.querySelectorAll('[data-ch-part="zone-meter-zone"]')]
    expect(zones.map((z) => z.getAttribute('data-ch-tone'))).toEqual(['gain', 'warn', 'loss'])
    expect(zones[0]).toHaveStyle({ left: '0%', width: `${(2.5 / 6) * 100}%` })
    expect(zones[1]).toHaveStyle({ left: `${(2.5 / 6) * 100}%`, width: `${(1.5 / 6) * 100}%` })
    expect(zones[2]).toHaveStyle({ left: `${(4 / 6) * 100}%`, width: `${(2 / 6) * 100}%` })
    expect(container.querySelector('[data-ch-part="zone-meter-marker"]')).toHaveStyle({
      left: `${(1 / 6) * 100}%`,
    })
  })

  it('pins out-of-range values to the end and says so', () => {
    const { container, rerender } = render(
      <ZoneMeter label="LCP" value={6.4} zones={lcp} max={6} format={seconds} />,
    )
    const meter = screen.getByRole('meter')
    expect(meter).toHaveAttribute('aria-valuenow', '6')
    expect(meter).toHaveAttribute('aria-valuetext', '6.4 s, above 6.0 s, Poor')
    expect(container.querySelector('[data-ch-part="zone-meter-marker"]')).toHaveStyle({ left: '100%' })
    rerender(<ZoneMeter label="LCP" value={-1} zones={lcp} max={6} format={seconds} />)
    expect(meter).toHaveAttribute('aria-valuetext', '-1.0 s, below 0.0 s, Good')
  })

  it('draws no marker for a missing value', () => {
    const { container } = render(<ZoneMeter label="LCP" value={Number.NaN} zones={lcp} max={6} />)
    const meter = screen.getByRole('meter')
    expect(meter).toHaveAttribute('aria-valuenow', '0')
    expect(meter).toHaveAttribute('aria-valuetext', 'No data')
    expect(container.querySelector('[data-ch-part="zone-meter-marker"]')).toBeNull()
  })

  it('labels min, every break inside the range and max, with overrides', () => {
    const { container, rerender } = render(
      <ZoneMeter label="LCP" value={1} zones={lcp} max={6} format={seconds} maxLabel="6 s+" />,
    )
    const labels = () =>
      [...container.querySelectorAll('[data-ch-part="zone-meter-label"]')].map((l) => l.textContent)
    expect(labels()).toEqual(['0.0 s', '2.5 s', '4.0 s', '6 s+'])
    expect(container.querySelector('[data-ch-part="zone-meter-labels"]')).toHaveAttribute('aria-hidden', 'true')
    rerender(<ZoneMeter label="LCP" value={1} zones={lcp} max={6} minLabel={null} maxLabel={null} format={seconds} />)
    expect(labels()).toEqual(['2.5 s', '4.0 s'])
    rerender(<ZoneMeter label="LCP" value={1} zones={lcp} max={6} ticks={false} />)
    expect(container.querySelector('[data-ch-part="zone-meter-labels"]')).toBeNull()
  })

  it('warns once about a break outside the range and about max <= min', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(<ZoneMeter label="x" value={1} zones={lcp} max={3} />)
    render(<ZoneMeter label="y" value={1} zones={lcp} min={5} max={5} />)
    expect(warn.mock.calls.map((c) => String(c[0]))).toEqual([
      expect.stringContaining('ZoneMeter "x": break 4 is outside 0–3'),
      expect.stringContaining('ZoneMeter "y": max (5) must be greater than min (5)'),
    ])
  })
})
```

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm --filter tally-charts exec vitest run src/react/ui/ZoneMeter.test.tsx`
Expected: FAIL, cannot resolve `./ZoneMeter`.

- [ ] **Step 3: Implement**

```tsx
import type { ReactNode } from 'react'
import type { FormatSpec } from '../../core/format'
import { toNumber } from '../../core/number'
import type { Thresholds } from '../../core/thresholds'
import { DEV, createWarner } from '../../core/warn'
import { useFormat } from '../ChartsProvider'
import { cx, toneVar, toPercent } from './util'

export interface ZoneMeterProps {
  value: number
  /** A `thresholds()` result: the breaks, tones and labels of the zones. */
  zones: Thresholds
  /** Default 0. */
  min?: number
  max: number
  /** Labels under the track at min, every break and max. Default true. */
  ticks?: boolean
  /** Text under the start. Default: the formatted `min`. `null` hides it. */
  minLabel?: ReactNode | null
  /** Text under the end, e.g. "6 s+". Default: the formatted `max`. `null` hides it. */
  maxLabel?: ReactNode | null
  /** Default 'number'. */
  format?: FormatSpec
  /** Accessible name. */
  label: string
  className?: string
}

const warn = createWarner()

/** A value against good / needs work / poor zones: zones from `thresholds()`, a marker at the value. */
export function ZoneMeter({
  value,
  zones,
  min = 0,
  max,
  ticks = true,
  minLabel,
  maxLabel,
  format,
  label,
  className,
}: ZoneMeterProps) {
  const { create } = useFormat()
  const fmt = create(format)
  if (DEV) {
    if (!(max > min)) {
      warn(`zone-range:${label}:${min}:${max}`, `ZoneMeter "${label}": max (${max}) must be greater than min (${min}).`)
    } else {
      for (const bin of zones.bins.slice(1)) {
        if (bin.min <= min || bin.min >= max) {
          warn(
            `zone-break:${label}:${bin.min}`,
            `ZoneMeter "${label}": break ${bin.min} is outside ${min}–${max}; its zone is not drawn.`,
          )
        }
      }
    }
  }
  const v = toNumber(value)
  const finite = Number.isFinite(v)
  const clamped = finite ? Math.min(max, Math.max(min, v)) : min
  const zone = finite ? zones.bins[zones.indexOf(v)]?.label : undefined
  const valueText = !finite
    ? 'No data'
    : [
        fmt(v),
        v > max ? `above ${fmt(max)}` : v < min ? `below ${fmt(min)}` : undefined,
        zone,
      ]
        .filter(Boolean)
        .join(', ')
  const drawn = zones.bins
    .map((bin) => ({ bin, from: Math.max(min, bin.min), to: Math.min(max, bin.max) }))
    .filter((z) => z.to > z.from)
  const breaks = zones.bins.slice(1).map((b) => b.min).filter((b) => b > min && b < max)
  const labels: { key: string; at: number; text: ReactNode }[] = [
    ...(minLabel === null ? [] : [{ key: 'min', at: 0, text: minLabel ?? fmt(min) }]),
    ...breaks.map((b) => ({ key: `b${b}`, at: toPercent(b, min, max), text: fmt(b) })),
    ...(maxLabel === null ? [] : [{ key: 'max', at: 100, text: maxLabel ?? fmt(max) }]),
  ]
  return (
    <div className={cx('ch-zone-meter', className)} data-ch-part="zone-meter">
      {/* biome-ignore lint/a11y/useSemanticElements: a styled track with children, not a native <meter> */}
      <div
        className="ch-zone-meter-track"
        data-ch-part="zone-meter-track"
        role="meter"
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={clamped}
        aria-valuetext={valueText}
      >
        {drawn.map(({ bin, from, to }) => (
          <div
            key={bin.label}
            className="ch-zone-meter-zone"
            data-ch-part="zone-meter-zone"
            data-ch-tone={bin.tone}
            style={{
              ...toneVar(bin.tone),
              left: `${toPercent(from, min, max)}%`,
              width: `${toPercent(to, min, max) - toPercent(from, min, max)}%`,
            }}
          />
        ))}
        {finite ? (
          <div
            className="ch-zone-meter-marker"
            data-ch-part="zone-meter-marker"
            style={{ left: `${toPercent(clamped, min, max)}%` }}
          />
        ) : null}
      </div>
      {ticks && labels.length > 0 ? (
        <div className="ch-zone-meter-labels" data-ch-part="zone-meter-labels" aria-hidden="true">
          {labels.map((l) => (
            <span
              key={l.key}
              className="ch-zone-meter-label"
              data-ch-part="zone-meter-label"
              style={{ left: `${l.at}%`, transform: `translateX(-${l.at}%)` }}
            >
              {l.text}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  )
}
```

`translateX(-at%)` aligns the first label left, the last right and the others proportionally, the same trick `Meter` uses for its target label.

If `toNumber` is not exported from `../../core/number` under that name, check `core/index.ts` (the README lists `toNumber` as public) and import from there.

- [ ] **Step 4: Run the tests**

Run: `pnpm --filter tally-charts exec vitest run src/react/ui/ZoneMeter.test.tsx`
Expected: PASS (7 tests).

- [ ] **Step 5: Add the styles** (after the share rules from Task 2)

```css
[data-ch-part="zone-meter"] {
  display: grid;
  gap: 10px;
  font-variant-numeric: var(--ch-font-numeric);
}

[data-ch-part="zone-meter-track"] {
  position: relative;
  height: 8px;
}

[data-ch-part="zone-meter-zone"] {
  position: absolute;
  top: 0;
  bottom: 0;
  box-sizing: border-box;
  background: var(--_ch-swatch-color);
}

/* The gap is a surface-colored edge, so zone edges stay exactly on their breaks. */
[data-ch-part="zone-meter-zone"] + [data-ch-part="zone-meter-zone"] {
  border-left: var(--ch-share-gap) solid var(--ch-surface);
}

[data-ch-part="zone-meter-zone"]:first-child {
  border-radius: 999px 0 0 999px;
}

[data-ch-part="zone-meter-zone"]:nth-last-child(1 of [data-ch-part="zone-meter-zone"]) {
  border-radius: 0 999px 999px 0;
}

[data-ch-part="zone-meter-marker"] {
  position: absolute;
  top: -5px;
  bottom: -5px;
  width: 3px;
  margin-left: -1.5px;
  border-radius: 2px;
  background: var(--ch-zone-marker);
  box-shadow: 0 0 0 2px var(--ch-surface);
}

[data-ch-part="zone-meter-labels"] {
  position: relative;
  height: 16px;
  color: var(--ch-ink-muted);
  font-size: 13px;
}

[data-ch-part="zone-meter-label"] {
  position: absolute;
  top: 0;
  white-space: nowrap;
}
```

Forced-colors block: add `[data-ch-part="zone-meter-zone"]` to the `forced-color-adjust: none` list, and

```css
  [data-ch-part="zone-meter-marker"] {
    forced-color-adjust: none;
    background: Highlight;
    box-shadow: 0 0 0 2px Canvas;
  }
```

If `:nth-last-child(… of …)` is rejected by Biome's CSS parser, give the last zone `data-ch-last=""` in the component and select `[data-ch-part="zone-meter-zone"][data-ch-last]`.

- [ ] **Step 6: Full unit run, lint, typecheck, commit**

```bash
pnpm test && pnpm lint && pnpm typecheck
git add packages/tally-charts/src/react/ui/ZoneMeter.tsx packages/tally-charts/src/react/ui/ZoneMeter.test.tsx packages/tally-charts/src/theme/theme.css
git commit -m "feat: ZoneMeter

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Public API, SSR, size, stories, e2e gates, docs

**Files:**
- Modify: `packages/tally-charts/src/index.ts`, `src/index.test.ts`, `test/fixtures.tsx`, `src/ssr.node.test.tsx`, `.size-limit.json`, `README.md`, `api/tally-charts.api.md` (regenerated), `docs/a11y.md`, `apps/storybook/stories/SmallPieces.stories.tsx`, `apps/storybook/e2e/stories.ts`
- Create: `.changeset/share-zone-0-8.md`, screenshot baselines under `apps/storybook/e2e/__screenshots__/{darwin,linux}/`

**Interfaces:**
- Consumes: `ShareBar`, `ShareBarProps`, `ShareSegment` (Task 2), `ZoneMeter`, `ZoneMeterProps` (Task 3).
- Produces: root exports `ShareBar`, `ZoneMeter` and their types; story id `primitives-small-pieces--default` unchanged (pieces are added to it).

- [ ] **Step 1: Failing export test** — in `src/index.test.ts` add `'ShareBar'` and `'ZoneMeter'` after `'DotCount'`. Run `pnpm --filter tally-charts exec vitest run src/index.test.ts`; expect 2 failures.

- [ ] **Step 2: Export** — in `src/index.ts`, keeping the file's alphabetical-by-path order (after `RangeMeter`, before `Stat`, and `ZoneMeter` after `TooltipPill`):

```ts
export type { ShareBarProps, ShareSegment } from './react/ui/ShareBar'
export { ShareBar } from './react/ui/ShareBar'
```
```ts
export type { ZoneMeterProps } from './react/ui/ZoneMeter'
export { ZoneMeter } from './react/ui/ZoneMeter'
```

Rerun the export test: PASS.

- [ ] **Step 3: SSR** — in `test/fixtures.tsx`, import `ShareBar`, `ZoneMeter`, `thresholds` from the same place the fixture imports `Meter` from, and add inside `SmallPieces`:

```tsx
      <ShareBar label="Visitors" segments={[{ label: 'Search', value: 3 }, { label: 'Direct', value: 1 }]} />
      <ZoneMeter
        label="LCP"
        value={4.1}
        max={6}
        zones={thresholds([2.5, 4], ['gain', 'warn', 'loss'], ['Good', 'Needs improvement', 'Poor'])}
      />
```

In `src/ssr.node.test.tsx`, in "renders the 0.2 charts and pieces without a DOM", add:

```ts
    expect(renderToString(<SmallPieces />)).toContain('data-ch-part="share-segment"')
    expect(renderToString(<SmallPieces />)).toContain('aria-valuetext="4.1, Poor"')
```

Run `pnpm test`: PASS. If `hydration.test.tsx` compares committed node-rendered markup that includes `SmallPieces`, regenerate it the way that test's comment describes; otherwise leave it.

- [ ] **Step 4: Size** — in `.size-limit.json`, entry "Small UI pieces": import `"{ Stat, Delta, Meter, RangeMeter, InlineBar, DotCount, ShareBar, ZoneMeter }"`, limit `"5 KB"`. Run `pnpm build && pnpm size`; every entry must pass. Record the new "Small UI pieces" size for the report.

- [ ] **Step 5: API report** — `pnpm --filter tally-charts api:update`, then `git diff packages/tally-charts/api/`: only additions (`ShareBar`, `ShareBarProps`, `ShareSegment`, `ZoneMeter`, `ZoneMeterProps`). Then `pnpm --filter tally-charts api:check` and `pnpm --filter tally-charts check:dev-strip`: both pass. If api-extractor reports missing TSDoc release tags or `ae-forgotten-export`, fix the source (export the type), not the config.

- [ ] **Step 6: Stories** — in `apps/storybook/stories/SmallPieces.stories.tsx` import `ShareBar`, `ZoneMeter`, `thresholds` from `tally-charts` and add two sections before "Changes":

```tsx
      <section aria-label="Parts of a whole" className="piece-grid">
        <ShareBar
          label="Where visitors come from"
          segments={[
            { label: 'Internal links', value: 2711, tone: 'gain' },
            { label: 'Search', value: 1968, tone: 'accent' },
            { label: 'Direct', value: 1101, tone: 'warn' },
            { label: 'Social', value: 43, tone: 'neutral', fill: 'hatch' },
          ]}
        />
        <ShareBar
          label="Pages by review state"
          total={800}
          legendValue="percent"
          segments={[{ label: 'Reviewed in the last 90 days', value: 62 }]}
        />
        <ShareBar
          label="Devices"
          legend={false}
          segments={[
            { label: 'Mobile', value: 79, tone: 'warn' },
            { label: 'Desktop', value: 20, tone: 'accent' },
            { label: 'Tablet', value: 1, tone: 'gain' },
          ]}
        />
      </section>
      <section aria-label="Zones" className="piece-grid">
        <ZoneMeter label="Largest Contentful Paint" value={4.1} zones={lcpZones} max={6} maxLabel="6 s+" format={seconds} />
        <ZoneMeter label="Cumulative Layout Shift" value={0} zones={clsZones} max={0.4} maxLabel="0.4+" format={{ preset: 'number', digits: 2 }} />
        <ZoneMeter label="Interaction to Next Paint" value={950} zones={inpZones} max={800} maxLabel="800+" />
        <ZoneMeter label="No data yet" value={Number.NaN} zones={inpZones} max={800} />
      </section>
```

with, at module level:

```tsx
const zoneTones = ['gain', 'warn', 'loss'] as const
const zoneLabels = ['Good', 'Needs improvement', 'Poor']
const lcpZones = thresholds([2.5, 4], [...zoneTones], zoneLabels)
const clsZones = thresholds([0.1, 0.25], [...zoneTones], zoneLabels)
const inpZones = thresholds([200, 500], [...zoneTones], zoneLabels)
const seconds = (v: number) => `${v.toFixed(1)} s`
```

Update the file's top comment to mention the 09 reference.

- [ ] **Step 7: e2e on darwin** — run Storybook e2e and refresh only the changed baseline:

```bash
pnpm --filter storybook-app exec playwright test --update-snapshots=changed
pnpm test:e2e
```

Expected: everything passes the second run. Look at the new `primitives-small-pieces--default` darwin PNG with the Read tool in both themes' output (and the forced-colors / reflow failures if any) and check: zones touch their tick labels, the marker sits on 4.1 / at the end for 950, Social's sliver is visible, the hatch on Social reads. Fix CSS, not baselines, if something is off.

- [ ] **Step 8: Linux baselines** — run the docker command from `.github/workflows/ci.yml` (the comment above the `e2e` job) from the repo root. It copies refreshed linux PNGs only if its verify run passes.

- [ ] **Step 9: Docs**
  - `README.md` "Small pieces": add `ShareBar` (parts of a whole: bar + list, `total`, `legendValue`, default tones never pink) and `ZoneMeter` (zones from `thresholds()`, linear, `maxLabel`, value text "4.1 s, Poor") with the two snippets from spec §2/§3; and a "Changes in 0.8" section above "Changes in 0.6": "Added `ShareBar` and `ZoneMeter`. Nothing changed or removed."
  - `docs/a11y.md`: per component, what screen readers hear (the rows; the img label; the meter value text incl. above/below/No data), what is decorative (bar with list, tick labels), forced colors (gaps, Highlight marker).
  - `.changeset/share-zone-0-8.md`:

```md
---
'tally-charts': minor
---

`ShareBar`: one bar split into the parts of a whole, with a list of parts ("2,711 · 46%"); `total` leaves the rest as empty track. `ZoneMeter`: a value against zones from `thresholds()` (good / needs work / poor), with a marker and break labels.
```

- [ ] **Step 10: Verify and commit**

```bash
pnpm test && pnpm typecheck && pnpm lint && pnpm build && pnpm size && pnpm --filter tally-charts api:check && pnpm --filter tally-charts check:dev-strip
git add -A packages/tally-charts apps/storybook docs/a11y.md .changeset/share-zone-0-8.md
git commit -m "feat: export ShareBar and ZoneMeter; stories, docs, size budget

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

If baselines were refreshed in Step 8, commit them separately as `test: ShareBar and ZoneMeter baselines (linux)`, matching the history's style.

---

### Task 5: `Reference/Performance` story

**Files:**
- Create: `apps/storybook/stories/Performance.stories.tsx`
- Modify: `apps/storybook/e2e/stories.ts`; the Storybook stylesheet that holds `.card`, `.card-title` (find it with `grep -rn "\.card-title" apps/storybook`)
- Reference: `docs/reference/09-performance.png` (open it with the Read tool before starting)

**Interfaces:**
- Consumes: `Axis`, `Bars`, `Chart`, `Legend`, `RankedBars`, `Stat`, `ValueLabel`, `ZoneMeter`, `thresholds`, `useChart` from `tally-charts`.
- Produces: story ids `reference-performance--light` (vivid palette) and `reference-performance--dark`.

- [ ] **Step 1: Data** (numbers match the reference: 772 pages, Good 39, Needs work 683, Poor 50, 223 below 70, peak 271)

```tsx
const buckets = [
  { bucket: '0', pages: 0 },
  { bucket: '10', pages: 1 },
  { bucket: '20', pages: 2 },
  { bucket: '30', pages: 3 },
  { bucket: '40', pages: 44 },
  { bucket: '50', pages: 88 },
  { bucket: '60', pages: 85 },
  { bucket: '70', pages: 271 },
  { bucket: '80', pages: 239 },
  { bucket: '90', pages: 39 },
]
const THRESHOLD = 70
const bands = thresholds([50, 90], ['loss', 'warn', 'gain'], ['Poor', 'Needs work', 'Good'])
const below = [
  { path: '/galeria', pages: 79 },
  { path: '/artykul', pages: 53 },
  { path: '/intencje-mszalne', pages: 43 },
  { path: 'other', pages: 48 },
]
const zoneTones = ['gain', 'warn', 'loss'] as const
// The card status is the bin label, so the reference's "Poor" / "Good" come from bins[indexOf(v)].label.
const zoneLabels = ['Good', 'Needs improvement', 'Poor']
```

Vitals:

```tsx
const vitals = [
  { key: 'LCP', name: 'Largest Contentful Paint', value: 4.1, unit: 's', max: 6, maxLabel: '6 s+',
    zones: thresholds([2.5, 4], [...zoneTones], zoneLabels), format: (v: number) => `${v.toFixed(1)} s`,
    note: 'site average · lab profile' },
  { key: 'CLS', name: 'Cumulative Layout Shift', value: 0, max: 0.4, maxLabel: '0.4+',
    zones: thresholds([0.1, 0.25], [...zoneTones], zoneLabels), format: (v: number) => v.toFixed(2),
    note: 'no shift recorded' },
  { key: 'INP', name: 'Interaction to Next Paint', value: 0, max: 800, maxLabel: '800+',
    zones: thresholds([200, 500], [...zoneTones], zoneLabels), format: (v: number) => `${Math.round(v)} ms`,
    note: 'lab run, no interactions' },
]
```

Pages per band for the tiles: Poor = buckets below 50, Needs work = 50–89, Good = 90+ (`bands.legend(...)` needs one value per page, so compute counts directly: sum `pages` per `bands.indexOf(Number(bucket))`).

- [ ] **Step 2: Threshold rule, a custom mark through public `useChart()`**

```tsx
function ThresholdRule({ at, label }: { at: string; label: string }) {
  const { x, innerHeight } = useChart()
  if (x.kind !== 'band') return null
  const start = x.scale(at)
  if (start === undefined) return null
  const left = start - (x.scale.step() - x.scale.bandwidth()) / 2
  return (
    <g className="perf-threshold" aria-hidden="true">
      <line x1={left} x2={left} y1={0} y2={innerHeight} />
      <text x={left + 6} y={12}>{label}</text>
    </g>
  )
}
```

Story CSS: `.perf-threshold line { stroke: var(--ch-warn); stroke-dasharray: 3 3; }` and `.perf-threshold text { fill: var(--ch-ink); font-size: 13px; paint-order: stroke; stroke: var(--ch-surface); stroke-width: 4px; }`. Give the chart a top margin large enough for the label and the peak value label (check `ChartProps` for `margin`).

- [ ] **Step 3: The screen** — one `Performance` component laid out like the reference (CSS grid: score card 2/3, below-threshold card 1/3; three vitals cards below; stacks under 900px):

  - Header: `<h2>Performance</h2>`, muted line "772 pages scanned on the Mobile profile · alert threshold 70 ·", a "Succeeded" pill, "1mo ago"; on the right a segmented Mobile/Desktop control and "Export" / "Run scan" buttons (plain `<button type="button">`, story CSS only).
  - Score distribution card: title, "772 pages · buckets of 10" meta; left column `Stat` label "Average score", value "73", caption "/100" (check `Stat` props: use `value="73"` and render "/100" next to it if `caption` sits under the value) and a "Needs improvement" pill toned warn; right: 

```tsx
<Chart
  data={buckets}
  title="Score distribution"
  description="Pages per Performance score bucket; 223 pages score under the alert threshold of 70."
  height={200}
  x={{ type: 'band', field: 'bucket', padding: 0.12 }}
  y={{ field: 'pages', domain: [0, 300] }}
>
  <Bars
    tone={(d) => (Number(d.bucket) < THRESHOLD ? 'neutral' : 'warn')}
    fill={(d) => (Number(d.bucket) < THRESHOLD ? 'hatch' : 'solid')}
    label={(d) => `${d.bucket}–${Number(d.bucket) + 9}`}
    format={{ preset: 'number', digits: 0 }}
  />
  <ThresholdRule at="70" label="threshold 70" />
  <ValueLabel at={7} />
  <Axis side="bottom" />
</Chart>
```

    then three tiles from `<Legend shape="bar" items={[{ label: 'Good', tone: 'gain', count: 39 }, { label: 'Needs work', tone: 'warn', count: 683 }, { label: 'Poor', tone: 'loss', count: 50 }]} />`, styled as tiles in story CSS.
  - Below threshold card: warning icon (inline SVG, `aria-hidden`), title, big "223" in loss tone (`Stat` with `tone="loss"`, `size="sm"`), "Pages scoring under 70.", then

```tsx
<RankedBars
  data={below}
  label="path"
  value="pages"
  sort="none"
  tone={(d) => (d.path === 'other' ? 'accent-soft' : d === below[0] ? 'loss' : 'warn')}
  fill="solid"
  track
  domain={[0, 223]}
/>
```

    and "Review 223 pages" / "Adjust threshold" buttons.
  - Vitals: for each `v` of `vitals`, a card with a left tick in the status tone, "LCP · Largest Contentful Paint", status text `v.zones.bins[v.zones.indexOf(v.value)]?.label` toned by the bin's tone (use `data-ch-tone-text` + `toneVar`-like inline `--_ch-swatch-color: var(--ch-<tone>)`), a `Stat size="md"` with the formatted value and `v.note` caption, then `<ZoneMeter label={v.name} value={v.value} zones={v.zones} max={v.max} maxLabel={v.maxLabel} format={v.format} />`.

  Story meta and exports, following `UsageRunway.stories.tsx`:

```tsx
const meta = { title: 'Reference/Performance', component: Performance } satisfies Meta<typeof Performance>
export default meta
type Story = StoryObj<typeof meta>
export const Light: Story = { parameters: { theme: 'light', palette: 'vivid' } }
export const Dark: Story = { parameters: { theme: 'dark' } }
```

  Top comment: `// docs/reference/09-performance.png, the Performance screen: score distribution, pages below the alert threshold and Core Web Vitals, built from the public API only.`

- [ ] **Step 4: Compare with the reference** — `pnpm --filter storybook-app dev`, open the story (or screenshot it with Playwright at 1280×760), read the PNG and `docs/reference/09-performance.png` with the Read tool side by side. Fix layout until the structure matches: card split, histogram with hatched buckets before the dashed rule, solid bars from 70, "271" over the 70 bar, ranked bars with tracks, three vitals cards with zone meters and markers. Pixel equality is not the goal.

- [ ] **Step 5: e2e** — in `apps/storybook/e2e/stories.ts` add `'reference-performance--light'` and `'reference-performance--dark'` to `STORIES` and `WIDE_STORIES` (`{ width: 1280, height: 760 }`, adjust the height to fit). Then:

```bash
pnpm --filter storybook-app exec playwright test --update-snapshots=changed
pnpm test:e2e
```

All pass, including axe (heading order, button names, contrast of muted text), reflow at 320px and forced colors. Then refresh linux baselines with the docker command (Task 4 Step 8).

- [ ] **Step 6: Commit**

```bash
pnpm typecheck && pnpm lint
git add apps/storybook
git commit -m "feat(storybook): Performance reference story

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

Linux baselines in a separate `test: Performance baselines (linux)` commit.

---

### Task 6: Publish metadata and tarball check

**Files:**
- Modify: `packages/tally-charts/package.json`

- [ ] **Step 1: Metadata** — add after `"license"`:

```json
  "author": "Mateusz Wadoń",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/mwadon/tally-charts.git",
    "directory": "packages/tally-charts"
  },
  "homepage": "https://github.com/mwadon/tally-charts#readme",
  "bugs": "https://github.com/mwadon/tally-charts/issues",
  "keywords": ["react", "charts", "dashboard", "data-visualization", "svg", "accessibility"],
  "publishConfig": { "access": "public" },
```

and to `scripts`:

```json
    "prepublishOnly": "pnpm build && pnpm test && pnpm api:check && pnpm size && pnpm check:dev-strip"
```

- [ ] **Step 2: Tarball** — `cd packages/tally-charts && pnpm build && npm pack --dry-run`. Expected file list: `LICENSE`, `README.md`, `package.json`, `dist/**` only (no `src`, `api`, `temp`, tests, `.size-limit.json`). If anything else appears, fix `files`, not `.npmignore`.

- [ ] **Step 3: Fresh-install smoke test** — in the scratchpad: `pnpm pack` the package (`pnpm --filter tally-charts pack --pack-destination <scratchpad>`), create a Vite React TS app, `pnpm add <tarball>`, render `<ShareBar>` and `<ZoneMeter>` with `import 'tally-charts/theme.css'`, run `pnpm build` in that app. Expected: builds without type or resolution errors. Delete nothing outside the scratchpad.

- [ ] **Step 4: Commit**

```bash
pnpm lint
git add packages/tally-charts/package.json
git commit -m "chore: npm metadata and prepublish checks

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 7 (controller, not a subagent): merge, version, publish

Outward-facing and irreversible steps, done by the session controller with the owner.

- [ ] Whole-branch review, then fast-forward `main` to `feat/0.8-share-zone` (history is linear).
- [ ] Set `"version": "0.7.0"` in `packages/tally-charts/package.json`, run `pnpm changeset version`; expect `0.8.0` and one CHANGELOG entry with all ten changesets; commit `chore: release 0.8.0`.
- [ ] Owner logs in: `! npm login`; check with `npm whoami`.
- [ ] **Ask the owner for explicit confirmation**, then `cd packages/tally-charts && npm publish` (prepublishOnly runs the checks; 2FA may ask for an OTP).
- [ ] `npm view tally-charts version` → `0.8.0`; `git tag v0.8.0`; push `main` and the tag after confirmation.
