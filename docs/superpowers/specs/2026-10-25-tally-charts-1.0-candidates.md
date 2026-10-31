# tally-charts 1.0: candidate list (input for brainstorming)

State on 2026-10-25: 0.9.0 is on npm (`latest`, tag v0.9.0, e66a522). The repo is public. The first
app, the glokki editor Performance screen, is merged (glokki-cms/editor#653).

The original 1.0 definition (main spec §roadmap, 0.6 spec §1) is "Docs site, npm publish
(changesets release workflow), public repo; no breaking changes". npm publish and the public repo
are done. From 1.0 on, semver is strict. So the main question for brainstorming is what has to be
decided **before** the freeze, because changing it afterwards would be breaking.

Sources: the deferred lists from the 0.6a, 0.6b, 0.7 and 0.8 final reviews, the editor integration,
and the 0.9 review. Each item has a proposed bucket; brainstorming decides.

## A. Decide before the freeze (breaking to change after 1.0)

1. **RankedBars default `fill='hatch'`.** Every chart that replaces plain bars has to know to pass
   `fill="solid"` (the editor did). Keep the default or flip it?
2. **LineChart children render above the series.** Children such as an area go over the line. A way
   to put children under the series: a slot/prop, or a change to the default order?
3. **Built-in English strings** ("n of N", "No data", "Total", Delta words, the keyboard hint): an
   i18n hook can be additive in 1.x. Decide whether the string *shapes* are part of the API.
4. **Keyboard hint "Press Enter to select"** is chart-wide, including on points with
   `selectable: false` (0.9). Per-point wording, or document it?
5. **Untitled `<Chart>`** renders an unnamed application widget, and only a dev warning catches it.
   Keep the warning or require `title` in the types? Requiring it is breaking after 1.0.
6. **Hover tooltip `pointer-events:auto`** covers neighbouring hit areas and exposes custom content
   inside an aria-hidden overlay (accepted under WCAG 1.4.13). Keep and document, or change?
7. **`thresholds()` inclusivity elsewhere.** Heatmap `breaks` and RunwayChart levels are
   lower-inclusive only. Add `inclusive` there too (additive), or note it as a known limit.
8. **ZoneMeter / ShareBar edge behaviour.** `Infinity` reads "No data". A zone or segment narrower
   than the 2px gap disappears. Tick labels can collide near the ends.
9. **Public way to tint text by tone.** Stories use the private `--_ch-swatch-color`. Expose a
   token or attribute, or keep it private?

## B. Freeze and packaging checks (must, small)

- `sideEffects` and `/* @__PURE__ */` on RunwayChart's `memo()`: verify that the size-limit entries
  reflect real tree-shaking.
- LineChart is at **12.96 / 13 kB**. Slim it, or raise the budget deliberately before 1.0.
- `dist/thresholds-*.d.ts` has a stray `import "d3-time"`.
- API Extractor bundles TS 5.9 against TS 6 source. Check it still parses everything.
- `api:check` reads a stale local `dist` (it should build first, or fail on stale).
- The vacuous `ae-forgotten-export` test assertion.
- Expose `createDateFormatter` in core (additive), if it belongs in the frozen surface.

## C. Release automation (must per the original 1.0 definition)

- A changesets release workflow in CI (version PR → publish). Today publishing is manual from a
  laptop, with OTP and npm staged publishing (approve on npmjs.com, which left a
  `0.0.0-stage` placeholder).
- npm **trusted publishing** (GitHub OIDC) plus provenance, so CI publishes without OTP or tokens.
- Deprecate `tally-charts@0.0.0-stage` (still pending; needs OTP).

## D. Docs site (must per the original 1.0 definition)

Open questions for brainstorming:

- Form: Storybook as the docs (already has stories, Reference pages, e2e) or a separate site
  (e.g. Next.js/MDX on Vercel) that embeds live examples?
- Content: a page per chart (props table from `api/*.api.md`?), theming and tokens, palettes,
  time scales, formatting, a11y (from `docs/a11y.md`), Server Components, and the dark-mode
  recipe.
- Hosting and domain. Should the README become shorter and link to the site?

## E. Correctness edge cases (should)

- An invalid date mid-series: break the line or join it. Line and LineChart currently differ.
- An unbounded tick count. A reversed time domain gives `[]`. An inline time `x` re-sorts on every
  render.
- A Region outside the domain, and the wording of its warning. The Target message for `TimeInput`
  on a linear scale.
- `unwrapPoint` hands back the wrapper row when the user datum is null.
- `thinTicks` should keep the highlighted tick (at 320 px the bridge result shows only "Planned
  profit").
- `fitTimeTicks` has a 4-pass cap. Time dedupe with `thin={false}` is undocumented.
- RunwayChart:
  - a stale `pressed` ref after a cancelled touch scroll
  - a controlled `activeId` change doesn't move the cursor
  - duplicate ids all show as active
  - touch `pointerEnter` without `pointerLeave`
- ComparisonBars: `resolveLayout` is computed twice; sublabel truthiness is inconsistent; stacked
  labels vanish below about 115 px.
- Waterfall: the right value text has no `maxWidth`.

## F. Visual polish (should; needs baseline regeneration)

- Wrapped pill divider and indent, and the 999px-radius stadium.
- A dead heatmap-header `display:grid`.
- RunwayChart:
  - the dark level-1 cell is darker than the card (neutral ramp)
  - labels are truncated at 320 px stacked
  - legend level swatches are wrapped in a span
- `--ch-ink-muted` misses 4.5:1 on the Storybook canvas background (Performance story).
- Heatmap scroller `margin:-8px` on cards with less than 8px padding. Heatmap group and grid have a
  double name.
- README: the ShareBar/ZoneMeter paragraph should sit next to Stat/Meter.

## G. Tests (should)

- band: a reversed range with padding, and the "like d3" case. `niceTimeDomain` local and null
  cases. `types.test` assertions. Tooltip `true`/`false`. A throw test for `useRegisterPoints`
  outside a chart. The "selected part is rendered" check.
- Runway core:
  - `runsOutAt` before the domain, or without `resetAt`
  - `statusLines` with a forecast but no reset
  - Escape, `pointerLeave` and unhandled keys
  - the Region hatch stroke
  - `normalizeRow`'s `warn` param shadows the module-level `warn`
- Forced-colors theme tests check selectors, not values.
- ComparisonBars: resize re-layout, user margin, label left of values.
- e2e: `maxDiffPixelRatio` 0.002 let an invisible 3px marker pass. Add a computed-style check for
  small marks (nested `data-ch-theme="dark"` inside a light page).
- Hygiene:
  - Escape listener vs keyboard source
  - rest-on-tooltip settle
  - RowLabels' exact style string
  - standalone Legend under seq-tone
  - waffle `margin.top` override
  - pill `boundingBox` flake
  - DotHistogram ring handover
  - dataTable unlisted columns
  - contrast-gate run counts
  - about 20 baselines that only the implementer checked

## H. Manual accessibility pass (must before 1.0; the maintainer runs it)

- The VoiceOver script in `docs/a11y.md` (§Manual checklist), plus NVDA (and JAWS if available).
- Real 400% browser zoom (CI covers only 320 CSS px reflow).
- Windows high contrast (CI covers only Chromium forced-colors emulation).

## I. 1.x (additive; can wait)

- An i18n hook for the built-in strings.
- A smaller `Stat` size variant.
- A `status` callback story for RunwayChart, and a named projection point type.
- A per-chart `inclusive` on Heatmap (if not done in A.7).
- `vivid` palette follow-ups, if any.
