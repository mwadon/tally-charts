# tally-charts 0.9: fixes from the first integration

Source: the glökki editor Performance screen (glokki-cms/editor#653), the first real app on
tally-charts 0.8.0. All changes are additive; the API freeze holds.

## 1. `thresholds()` upper-inclusive bins

Core Web Vitals tiers include their upper edge (LCP 2.5 s is Good). Today bins are
lower-inclusive, so the editor nudges breaks by 1e-6 and rounds the nudge away in `format`.

- `thresholds(breaks, tones, labels, options?: ThresholdOptions)`, where
  `ThresholdOptions = { inclusive?: ThresholdInclusive }` and
  `ThresholdInclusive = 'lower' | 'upper'` (default `'lower'`, today's behaviour).
- `'upper'`: a value equal to a break falls in the bin below it (`v <= break`).
- The result carries `inclusive` (plain data, next to `bins`). `ThresholdBin` docs say which edge is
  inclusive depends on it.
- `indexOf`, `toneOf`, `legend`, and so DotHistogram's `toneBy`, follow it.

## 2. ZoneMeter `zones` crosses the RSC boundary

`zones: Thresholds` holds functions, so a Server Component can't pass it to a client ZoneMeter.

- `zones: ZoneMeterZones`, where `ZoneMeterZones = Pick<Thresholds, 'bins'> & { inclusive?: ThresholdInclusive }`.
  A full `thresholds()` result still type-checks; `{ bins, inclusive }` is serializable.
- ZoneMeter finds the value's zone from `bins` and `inclusive` (shared internal helper), not
  `indexOf`.

## 3. RankedBars rows that can't be selected

An "other" row shouldn't be a filter, but with `onSelect` every row is an option.

- `selectable?: PerItem<D, boolean>` on RankedBars, default true. A row with `false` doesn't call
  `onSelect` on click, Enter or Space, and its hit area has no `data-ch-selectable` (no pointer
  cursor). Hover, focus and the tooltip still work.
- `Bars` gets the same `selectable` prop (additive) for the hit-area attribute and the click.

## 4. README: class-based dark mode recipe

A Next.js app whose dark mode is a `.dark` class (next-themes) has to mirror it into
`data-ch-theme`; the attribute drives the tokens, so CSS alone can't do it. Add a short recipe
under the theme paragraph: next-themes `attribute={['class', 'data-ch-theme']}`, and for a custom
provider one line that sets `document.documentElement.dataset.chTheme` (plus the server-rendered
attribute on `<html>` to avoid a flash).

## Out of scope

Everything else in the 1.0 backlog.
