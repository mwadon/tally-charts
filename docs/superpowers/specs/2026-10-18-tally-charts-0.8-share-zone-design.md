# tally-charts 0.8 — ShareBar, ZoneMeter, first npm release

Date: 2026-10-18. Status: approved in brainstorming.

Reference: `docs/reference/09-performance.png` (Performance screen of a CMS/SEO dashboard: score
distribution, pages below threshold, Core Web Vitals cards).
Parent specs: `2026-10-14-tally-charts-design.md`, `2026-10-14-tally-charts-0.6-design.md` and
`2026-10-15-tally-charts-0.7-runway-design.md`. Everything they require of a component (themes,
a11y, reflow, forced colors, dev warnings, size budgets, API report) applies here unless this
document says otherwise.

## 1. Purpose and release

The owner wants to use tally-charts in their own dashboard (Traffic, Performance, Accessibility,
SEO audit, Analytics, Link health screens). Most of those screens compose from existing parts
(`RankedBars`, `InlineBar`, `LineChart`, `Stat`, `Delta`, `Meter`, `Legend`). Two parts recur and
cannot be composed:

| Need | Seen on | How |
|---|---|---|
| One bar split into parts of a whole, with a list of parts | Content 62/738, traffic sources, devices, accessibility findings, link health | **New:** `ShareBar` (§2) |
| A track of good / needs work / poor zones with a value marker | LCP, CLS, INP cards | **New:** `ZoneMeter` (§3) |

Both are small HTML pieces next to `Meter`, `RangeMeter` and `InlineBar` in `src/react/ui/`: no
`<Chart>`, no SVG, no hooks beyond `useFormat`. Like every component they come from the
`'use client'` entry, so a Server Component file can render them as long as `format` is a preset,
not a function. `zones` (a `thresholds()` result, which holds functions) must also come from a
client component.

Rejected: SVG high-level charts on `<Chart>` (3–4 KB each, client-only, overkill for one bar);
extending `Meter` with `segments` / `zones` (mutually exclusive props, a second meaning for a
component just before the 1.0 freeze).

Release: **0.8.0**, the first npm publish (§6). All changes are additive. The 1.0 backlog stays
open.

### Success criteria

- `Reference/Performance` recreates the reference screen in both themes, built only from public
  API (§5).
- `ShareBar` and `ZoneMeter` pass the e2e gates every component passes: screenshots (darwin +
  linux, both themes), axe, contrast, reflow at 320 CSS px, forced colors.
- The "Small UI pieces" size entry, now including both, stays ≤ 5 KB gzip; `tally-charts/core`
  is unchanged.
- `api:check`, lint, typecheck, dev-strip pass; the API report gains only additions.
- `npm i tally-charts@0.8.0` in a fresh Vite project renders both with
  `import 'tally-charts/theme.css'`.

## 2. `ShareBar`

```tsx
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
  segments={[
    { label: 'Reviewed in the last 90 days', value: 62 },
    { label: 'Stale, untouched 90+ days', value: 738, tone: 'loss' },
  ]}
/>
```

```ts
interface ShareSegment {
  /** React key; default: the index. */
  id?: Id
  label: string
  value: number
  /** Default: the next tone of the default order (below). */
  tone?: Tone
  /** Default 'solid'. */
  fill?: Fill
}

interface ShareBarProps {
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
```

### Rendering

- Segment widths are `value / total`, in the given order (never sorted).
- Segments are separated by a gap of `--ch-share-gap` (default 2px), so the bar stays readable in
  forced colors, where every tone becomes the same system color. The bar has rounded ends; the
  empty remainder (when `total` exceeds the sum) is the faint track.
- A segment with a value above 0 is at least 3px wide, so a 1 % part stays visible; the extra
  width (and the gaps) come out of the other segments in proportion (CSS flex shrink). A segment of 0 is not drawn but is listed.
- Percentages use the largest remainder method, so the listed percentages add up to exactly 100
  (or to the rounded share of `total` the segments cover). Whole percents; a part above 0 that
  rounds to 0 shows "<1%".
- Default tones, for segments without `tone`, by the segment's position: `accent`, `accent-soft`, `warn`,
  `neutral`, `gain`, then repeating. Never `loss`: pink means loss in this library and is only
  ever chosen explicitly.
- List rows: a dot swatch in the segment's tone and fill (the `Legend` swatch styles), the label,
  and the right-aligned value text. Tabular numbers.

### Dev warnings

- More than 6 segments (adjacent tones start repeating).
- A value that is negative or not a finite number: drawn and counted as 0.
- `total` smaller than the sum of the segments: the sum is used.

### Accessibility

- With the list: the bar is `aria-hidden`; the list is a `<ul>` whose rows read
  "Internal links 2,711 46%" (the middle dot is `aria-hidden`). The wrapper is a `role="group"` named by `label`.
- Without the list: the bar is `role="img"` with `aria-label`
  "Where visitors come from: Internal links 46% (2,711), Search 34% (1,968), …".

Out of scope: hover, tooltips, selection, sorting, tile layouts (compose `legend={false}` with
`Stat`).

## 3. `ZoneMeter`

```tsx
const lcpZones = thresholds([2.5, 4], ['gain', 'warn', 'loss'], ['Good', 'Needs improvement', 'Poor'])

<ZoneMeter
  label="Largest Contentful Paint"
  value={4.1}
  zones={lcpZones}
  max={6}
  maxLabel="6 s+"
  format={(v) => `${v.toFixed(1)} s`}
/>

// The card's status comes from the same thresholds:
lcpZones.bins[lcpZones.indexOf(4.1)]?.label // 'Poor'
```

```ts
interface ZoneMeterProps {
  value: number
  /** A `thresholds()` result: breaks, tones and labels of the zones. */
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
```

### Rendering

- The track is the zones in their tones, linear over `min`–`max`; the first and last zones
  (unbounded in `thresholds()`) are clipped to the range. Zones are separated by `--ch-share-gap`.
- The marker is a vertical tick taller than the track, `--ch-zone-marker` (default `--ch-ink`)
  with a halo of the surface color.
- A value outside `min`–`max` is pinned to the nearer end. A missing value (`NaN`, `null`,
  non-number) draws no marker.
- Tick labels sit under min, each break inside the range, and max; each is shifted by its own position
  (`translateX(-p%)`, as `Meter` does), so the first is left-aligned, the last right-aligned and
  none leaves the track at 320px.

### Dev warnings

- A break outside `min`–`max` (its zone shrinks to nothing).
- `max <= min`.

### Accessibility

- `role="meter"` with `aria-label`, `aria-valuemin`, `aria-valuemax`, `aria-valuenow` (clamped).
- `aria-valuetext` is the formatted value and the zone's label: "4.1 s, Poor"; above max,
  "6.4 s, above 6.0 s, Poor"; missing, "No data".
- Tick labels are `aria-hidden`.
- Forced colors: the gaps separate the zones; the marker uses `Highlight`.

Out of scope: a value label at the marker, fixed-width zones, animation.

## 4. Theme, tests, size, docs

- `theme.css`: rules for `[data-ch-part="share-*"]` and `[data-ch-part="zone-meter*"]`, using the
  existing tone and fill machinery (`--_ch-swatch-color`, `ch-fillable`). New tokens:
  `--ch-share-gap`, `--ch-zone-marker`. Dark theme, `data-ch-theme` and `data-ch-palette="vivid"`
  need nothing extra. Forced-colors rules as above.
- Unit tests `ShareBar.test.tsx` and `ZoneMeter.test.tsx`, after `Meter.test.tsx`: widths, default
  tones, largest remainder, min width, zero segments, `total`, `legendValue`, a11y attributes and
  texts, clamping, labels, dev warnings. Both join `ssr.node.test.tsx` and `hydration.test.tsx`.
- Storybook: stories in `SmallPieces.stories.tsx` (`ShareBar` with and without list, with
  `total`; `ZoneMeter` LCP, CLS, INP, above max, no data), listed in `e2e/stories.ts`.
- `.size-limit.json`: "Small UI pieces" imports both; limit 4 KB → 5 KB.
- `api:update`; README "Small pieces" and "Changes in 0.8"; `docs/a11y.md` patterns; a `minor`
  changeset.

## 5. `Reference/Performance` story

`apps/storybook/stories/Performance.stories.tsx`, recreating `09-performance.png` from public API
only, under `data-ch-palette="vivid"`:

- Page header, "Succeeded" pill, Mobile/Desktop toggle and buttons: plain HTML in the story.
- Score distribution: `Stat` (73/100) and a "Needs improvement" pill; a `<Chart>` with a band
  scale of buckets 0–90 and `Bars`, `hatch` below 70 and `solid` `warn` from 70; `ValueLabel` for
  the peak count; the dashed vertical threshold rule and its "threshold 70" label as a small
  custom mark in the story via `useChart()` (README "Custom marks"). Good / Needs work / Poor tiles:
  `Legend` with `count`.
- Below threshold: `RankedBars` with `track`, per-row tone, `limit` and an "other" row.
- LCP, CLS, INP cards: `ZoneMeter` + `Stat`, status text from the same `thresholds()`.
- Listed in `e2e/stories.ts`, so it gets the screenshot, axe, reflow and forced-colors gates.

## 6. npm release

- Version: `package.json` is `0.0.0` with nine pending changesets; `changeset version` would fold
  them into one minor bump to 0.1.0. Set the version to `0.7.0` by hand first, so the bump lands
  on **0.8.0** with one CHANGELOG entry holding the whole history.
- `package.json`: `repository` (`github:mwadon/tally-charts`, directory `packages/tally-charts`),
  `homepage`, `bugs`, `keywords`, `author`, `publishConfig.access: public`, and `prepublishOnly`
  running build, tests, `api:check`, `size` and `check:dev-strip`.
- `npm pack --dry-run` to confirm the tarball holds `dist`, `LICENSE`, `README.md`, `package.json`
  only.
- The owner logs in (`npm login`, 2FA). Publishing asks for explicit confirmation first.
- Order: branch `feat/0.8-share-zone` → merge to main → version 0.8.0 → confirm → `npm publish`
  → push main and tag `v0.8.0`.
