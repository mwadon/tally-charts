# tally-charts 1.0: additions for the glokki editor, before the freeze

Status: approved by the maintainer on 2026-10-31, including every item under "Calls to check".

Source: the requirements list from migrating the glokki editor (`~/projects/editor`) off Recharts and its hand-written charts. The editor is the first real app on the library, and it runs on 0.9.0 today. Every claim below about current code was checked in both repos on 2026-10-31.

## Why

The maintainer decided to ship all of this before 1.0, including the second Y axis, instead of spreading it across 1.x. Nothing is on npm past 0.9.0, so `1.0.0-rc.0` can carry the whole set, and the editor verifies it in one pass (T39).

## Goals

- Everything in sections 1 to 10 lands on `main` before `1.0.0-rc.0` is published.
- The editor can replace its hand-written `Sparkline`, `BriefSparkline`, `SeoTrend`, `TrafficChart` and score histogram with library code, in any UI language.
- The name is spelled "glokki" everywhere in this repo.

## Non-goals

- **Donut.** One use in the editor (`A11yDonut`, 55 lines). Not worth a public component under semver.
- **Editor changes.** This work ends at the library, its docs and its tests. Migrating the editor is T39 and later.
- **Maintainer gates.** Q1-02, Q1-04, Q2-01 and T39 stay as they are.
- **A `highlight` tone and `series-1…5` tones.** Replaced by `color` (section 6). See "Calls to check".

## Anti-goals

Any of these makes the work a failure even if the tests pass:

- A size limit raised to make something fit, with one exception: the maintainer allows `LineChart` to go slightly over, so its limit may rise from 14 kB to at most 14.5 kB if the measurement needs it. If any other limit can't hold, or `LineChart` needs more, stop and ask the maintainer, with the measured number.
- A breaking change to anything already public, other than the defaults in section 1.
- A `Sparkline` that measures width or needs an effect to render.
- A chart without a second axis that gets slower or larger in a way `pnpm size` can see beyond the budgets below.

## Constraints

Current sizes (`pnpm size`, gzip, 2026-10-31), the ones with the least room:

| Entry | Size | Limit |
|---|---|---|
| LineChart | 13.19 kB | 14 kB |
| BridgeChart | 13.87 kB | 15 kB |
| WaterfallChart | 13.19 kB | 15 kB |
| Small UI pieces | 4.03 kB | 5 kB |
| Chart + Bars + Axis + Target + Tooltip | 11.48 kB | 15 kB |

Sections 2 and 9 touch code every chart loads, so measure after each of them.

Repo rules from `CLAUDE.md` apply: tests for every new function, `api:update` with the API files committed, a changeset per change, `/* @__PURE__ */` on new top-level `createContext()` calls, and new public symbols need a `PropsTable` (`check:content` fails otherwise). Commits are made by the orchestrator.

## 0. Spelling: glokki

Replace the umlaut spelling with "glokki" in all 26 tracked files that contain it (`git grep -l 'gl[ö]kki'`), including `CLAUDE.md`, `SPEC.md`, `docs/`, `PROGRESS.md`, `QA_REPORT.md`, source comments, the `.env.example`, the runtime error in `apps/docs/lib/content/glokki.ts` and the test expectations that match messages (`seed-env.test.ts`, `content-source.test.ts`). `git grep 'gl[ö]kki'` returns nothing afterwards, and `pnpm --filter docs test` passes. Git history is not rewritten. Do this first, as its own change, so that later work doesn't copy the old form.

The editor repo has the same spelling in `app/globals.css`. That file is out of scope here; report it to the maintainer.

## 1. Defaults of InlineBar and Meter (breaking)

- `InlineBar`: `tone` default `'accent'` (was `'loss'`), `fill` default `'solid'` (was `'hatch'`).
- `Meter`: `fill` default `'solid'` (was `'hatch'`).

Reasoning: both show an actual value, and the library's language is solid = actual, hatch = plan or reference (F1 made the same change in `RankedBars`). A pink default also breaks the rule in `ui/share.ts`: pink means loss and is only chosen explicitly.

`docs/reference/01-gross-margin-waterfall.png` shows a hatched `Meter`, so the default was not an accident. Following F1, the examples that reproduce the reference keep their look with an explicit `fill="hatch"`: `examples/reference/01-gross-margin-waterfall.tsx` and `stories/GrossMargin.stories.tsx`.

Two more components break the same rule, though the requirements list doesn't name them. Both are unconditionally pink today, even when nothing is lost, and they can't change after 1.0:

- `RangeMeter`: `tone` default `'accent'` (was `'loss'`) and `referenceTone` default `'neutral'` (was `'accent'`). Changing both keeps the value and the reference apart, and the actual value stays the prominent one. Its hatched gap stays; that's what the component draws. `examples/reference/03-estimate-vs-actual.tsx` and `stories/Result.stories.tsx` keep their look with explicit `tone="loss"` and `referenceTone="accent"`.
- `DotCount`: `tone` default `'accent'` (was `'loss'`). Stories that rely on pink get an explicit `tone="loss"`.

After this, no small piece is pink by default. `RankedBars`' `selectedTone = 'loss'` stays, because it colours a bar the user selected, not the chart's resting state.

Delivery: a `major` changeset with a before and after snippet for each component, an entry on `/docs/migration-1-0`, TSDoc, unit tests in the style of F1's, and refreshed visual baselines on both platforms, including the docs home baselines if the gallery changes. The editor uses none of these four components yet, so nothing breaks there.

## 2. i18n: `ChartsProvider messages`

```tsx
<ChartsProvider
  locale="pl-PL"
  messages={{ noData: 'Brak danych', position: '{index} z {total}', target: 'cel {value}' }}
>
```

- **Plain strings with `{placeholders}`, not functions.** `ChartsProvider` lives in the client entry, and a server component can't pass a function to it. The editor's root layout is a server component using `next-intl`. Strings cross that boundary, and they also cover every message found so far, since none needs plurals.
- **Partial.** Any key left out keeps its English default. Unknown placeholders stay as text.
- **Precedence:** the per-chart prop (`keyboardHint`, `empty`, `targetLabel`, `totalLabel`, `dataTable.columns`) wins over provider messages, which win over English. A column header taken from an accessor stays as it is today (`headerOf`).
- **Own context**, apart from the locale one, memoised by the caller's object identity. Document that an inline object re-renders consumers.
- **Exports:** a `ChartMessages` type and a default set, so that the docs can list them.

The requirements list is not complete. The set found by grep on 2026-10-31, which the builder must finish:

| Keys | Strings today | Where |
|---|---|---|
| `noData`, `noValue` | "No data", "no value" | Chart, Meter, InlineBar, RangeMeter, ZoneMeter, ShareBar, Heatmap, RunwayChart, DataTable |
| `keyboardHint`, `keyboardHintSelect` | "Use arrow keys…", " Press Enter to select." | Chart |
| `position` | "{index} of {total}" | `interaction.ts:94` |
| `target`, `targetLabel` | ", target …", "Target …" | Meter, InlineBar |
| table headers | Item, Value, Category, Date, Period, Group, Details, Column, Change, Total, Plan, Actual, Range, Row, Name, Detail, Runs out, Resets, Projected at reset, Status | high-level charts, RunwayChart |
| other labels | "Total" (Waterfall end row, Heatmap), "Now" (RunwayChart) | |

English that lives in `core/` and reaches the screen through a chart, such as `statusLines` in `core/runway.ts`, gets its messages passed in as arguments. The format preset suffixes (`' pts'`, `' h'` in `core/format.ts`) are out of scope, because public `createFormatter` can't read a provider. The docs say to use a custom `format` for these units in other languages.

Add a test that fails when a new user-visible English literal appears in `react/` outside the defaults file, with an explicit allowlist for warnings and key names. This is how the set stays complete.

Docs: a section on the theming or setup guide with the whole table. Update `docs/stability.md` and `SPEC.md`, which both say the hook arrives in 1.x. The wording of the English defaults stays non-public.

## 3. Target on a category axis

```tsx
<Chart x={{ type: 'band', field: 'range' }} y={{ field: 'count' }}>
  <Bars />
  <Target x="70–79" position={0.3} label="Target 73" />
</Chart>
```

- New prop `position?: number`, a fraction of the category's step, from 0 (start edge) to 1 (end edge). Default 0.5, the centre. Only valid on band and point scales; on linear and time scales it warns once and is ignored.
- Edges are measured on the step, so the end of one category and the start of the next are the same pixel, in the middle of the gap between bars.
- `x` on these scales is the category key, as a string. `y` widens to `number | string` for the horizontal case.
- Unknown category: warning `target-category`, nothing drawn. `position` outside 0 to 1 is clamped with a warning.

This is broader than the requirements list asked for (`align="start"`), on purpose. The editor's threshold is any integer from 1 to 100 (`threshold-popover.tsx`) over 10-wide buckets, so 73 sits inside "70–79" and an edge-only API couldn't draw it.

## 4. Reversed Y scale

`y={{ domain: [10, 1] }}` becomes documented behaviour, for the position chart in Search Console. Explicit domains aren't niced, and `Target` already handles either order, but no test covers a descending domain. Tests come first and may find bugs; fixing them is in scope.

Cover `createScale`, `Axis`, `Grid`, `Line`, `Area`, `Band`, `Target`, the nearest-point pointer and keyboard order. For `Bars`, decide from what the test shows: either bars grow from the correct edge, or the docs say reversed scales aren't for bars and a dev warning (`bars-reversed`) fires. Deliver TSDoc on `domain` and one example with a story.

## 5. Sparkline (new component)

```tsx
<Sparkline values={[3, 5, 4, 8]} label="Clicks, last 28 days" tone="gain" area endpoint target={6} />
```

| Prop | Type | Default |
|---|---|---|
| `values` | `readonly (number \| null)[]` | required |
| `label` | `string`, accessible name | required |
| `tone` | `Tone` | `'accent'` |
| `area` | `boolean` | `false` |
| `endpoint` | `boolean`, a dot on the last valid value | `false` |
| `target` | `number`, a thin rule | none |
| `height` | px | 28 |
| `domain` | `[number, number]` | extent of the values and target |
| `className` | `string` | |

- `role="img"`, no tab stop, no tooltip, no `Chart` context. A plain component, not a wrapper on `Chart`.
- No `useWidth`, no effects, no layout reads. Identical output on server and client. It fills its container's width, and the height is fixed.
- SVG with `viewBox`, `preserveAspectRatio="none"` and `vector-effect: non-scaling-stroke`.
- **The endpoint can't be an SVG circle:** that aspect ratio setting would stretch it into an ellipse. Render it as an absolutely positioned HTML element with `left` and `top` in percent, inside a `position: relative` root. This is a hard requirement; test that no `circle` is rendered.
- Null or non-finite values break the line. With no valid value, the name is `<label>: <noData>` and only the empty box renders. A flat series draws at mid height.
- Parts: `sparkline`, `sparkline-line`, `sparkline-area`, `sparkline-target`, `sparkline-endpoint`. Colours from `--ch-*` tokens and the tone; a soft flat fill for `area`, so that it needs no gradient id. Works in forced-colors mode.

Delivery: main entry export, a new size-limit entry with a 3 kB limit plus a treeshake fixture, on the `small-pieces` docs page with a `PropsTable` and an example, a story with baselines, and an SSR test next to `ssr.node.test.tsx`.

## 6. Colours outside the tones: `color`

Tones stay semantic, and there are still six.

- New optional `color?: string` on `ShareSegment`, `LegendItem` and `BarsProps` (there as `PerItem<D, string>`), and in `SharePart`. It accepts any CSS colour, including `var(--x)`.
- It overrides the tone's paint, through the existing private variable. Keep `data-ch-tone` as it is.
- **On `Bars`, `color` applies only to `fill="solid"`.** Hatched SVG bars paint from one pattern per tone (`paintFor`, `PatternDefs`), and patterns per arbitrary colour would add SSR id handling and size to code every bar chart loads. A hatched bar with `color` keeps its tone, with dev warning `bars-color-fill`, and TSDoc states the limit. `ShareBar` and `Legend` have no such limit, because they paint hatching in CSS from the variable.
- TSDoc states that contrast in both themes is the caller's job, so `var(--x)` is the right way to follow a theme.

This covers `devices-card` and `sources-card`, and the gold peak bar in section 8. Forced-colors mode keeps overriding it, and a test confirms that.

## 7. Size of small bars

- **Width:** `InlineBar.width` becomes `number | string`, so `width="100%"` works. It's an inline style, so CSS can't do this.
- **Height: no new prop.** Height is plain CSS on public parts: `[data-ch-part="inline-bar"]` (8 px) and `[data-ch-part="meter-track"]` (12 px). The stylesheet uses no `@layer`, so an override of equal specificity must load later or use a stronger selector such as a class plus the attribute. Show this recipe on the `small-pieces` docs page, and add an e2e computed-style check at 4 px for both, including the fill and target tick.

## 8. Peak label in BarChart

- `at="max"` on `ValueLabel` and `valueLabel="max"` on `BarChart`. On a tie, the first highest bar. Only finite values count.
- `variant?: 'text' | 'pill'` on `ValueLabel`, default `'text'`. `BarChart` gets `valueLabelVariant`, passed through.
- The pill is an SVG `rect` plus `text`, sized with the shared `estimateWidth`, so that it renders in SSR with no measuring. It uses the part `value-label-pill` and existing tokens, and consumers restyle it with CSS. No new public token.
- **Position:** above the bar's end, like the text label, and clamped horizontally so that it stays within the chart's width. It isn't clamped vertically, so on the tallest bar it sits in the top margin. Callers need a `margin.top` that fits it; check whether the default of 20 px does, and say what's needed in TSDoc.

## 9. Second Y axis

```tsx
<Chart
  x={{ type: 'band', field: 'day' }}
  y={{ field: 'views' }}
  y2={{ field: 'uniques' }}
  margin={{ left: 40, right: 40 }}
  dataTable={{ columns }}
>
  <Grid />
  <Bars fill={(d) => (d.isPeak ? 'solid' : 'hatch')} segments={(d) => bothSeries(d)} />
  <Line scale="y2" dots="none" />
  <Axis side="left" />
  <Axis side="right" scale="y2" tone="accent" />
  <Tooltip />
</Chart>
```

- `y2?: ScaleSpec<D>` on `Chart`, linear only, otherwise warning `y2-scale` and no scale. With a band `y` (horizontal charts), warning `y2-orientation`. `y2` is resolved only when set, so charts without it do the same work as today.
- `scale?: 'y' | 'y2'`, default `'y'`, on `Line`, `Area`, `Band`, `Bars`, `ValueLabel`, `Target` and `Axis`. `Grid` stays on `y`.
- `scale="y2"` with no `y2` on the chart: warning `y2-missing`, the mark draws nothing.
- Implement this with one internal helper that gives a mark its context with `y` swapped for `y2`, so that the marks' geometry code doesn't fork. Field fallback comes from the chosen scale.
- `Axis` gets `tone?: Tone`, to tie a value axis to its series, as the editor's chart does. `side` and `scale` are independent. A horizontal side with `y2` warns.
- `useChart()` gains an optional `y2`.
- **Ticks aren't aligned automatically.** The grid belongs to `y`. Docs show how to pick matching tick counts.
- **Tooltip and keyboard:** these stay mark-driven. `Bars` registers the points, and its `segments` and `ariaLabel` carry both series, as in the example above. `Line` behaviour doesn't change: with `dots="none"` it draws no active ring, so the example has no ring on the line, and the tooltip carries the values. A ring on `y2` works as it does on `y`, when `Line` has dots and `Bars` gets `id` equal to the category. Test that case.
- **Data table:** `dataTable.columns` as today, with both series. The docs example includes this, because a dual-axis chart without it fails screen-reader users.
- **High-level charts don't get `y2`.** No `LineChart` or `BarChart` API for it in this work. The editor's use is a composition. This can be added later without breaking anything.

Delivery: a dual-axis section on the composition guide, including when not to use one (two scales invite false correlations), a docs example, and a story with baselines that recreates the editor's `TrafficChart`: hatched bars, a solid gold peak with a value pill (sections 6 and 8), a line on the right scale, and the permanent dot on the line's peak, drawn with a second one-row `Line`. No growth over 1 kB gzip on `Chart + Bars + Axis + Target + Tooltip`; the limits in Constraints still hold.

## 10. `LineChart interactive={false}`

`Bars` has `interactive={false}`, while `LineChart` has no way to be static. Add `interactive?: boolean`, default `true`: with `false` it registers no points, has no tab stop and has no tooltip. It's small, it came up in the same analysis, and it would be awkward to find missing later.

## Order

1. Section 0, on its own.
2. Section 1, the only breaking change.
3. Sections 2, 3 and 4, which unblock Performance and Search Console.
4. Section 5.
5. Sections 6, 7, 8 and 10.
6. Section 9, last, because it uses 6 and 8 and is the riskiest for size.

## Done means

- All gates from `CLAUDE.md` exit 0: `pnpm lint`, `pnpm typecheck`, `pnpm --filter docs typecheck`, `REQUIRE_DIST=1 pnpm test`, `pnpm build`, `api:check`, `pnpm size`, `check:dev-strip`, `check:dts`, `check:treeshake`, `pnpm test:e2e`, `pnpm --filter docs test`, `pnpm --filter docs test:e2e`, `pnpm --filter docs check:content` (coverage now includes `Sparkline`).
- Visual baselines refreshed for both platforms, by the documented commands, wherever appearance changed.
- `SPEC.md` lists this work and no longer defers i18n to 1.x. `PROGRESS.md` records it. T39's checklist names these features for the check in the editor.
- `git grep 'gl[ö]kki'` is empty.
- Changesets: `major` for section 1, `minor` for the additions, all resolved through the existing `rc` pre mode.

## Calls to check

These were made by the design's author, not by the maintainer:

- Message strings with placeholders instead of the functions in the requirements list (section 2).
- `position` instead of `align` on `Target` (section 3).
- `color` instead of `series-1…5` and a `highlight` tone (sections 6 and 8).
- No height prop on `InlineBar` and `Meter` (section 7).
- `Meter` goes solid even though reference 01 shows it hatched (section 1).
- `RangeMeter` and `DotCount` also lose their pink defaults, so the breaking change is wider than the list asked for (section 1).
- `color` on `Bars` works only with `fill="solid"` (section 6).
- The format preset suffixes `' pts'` and `' h'` stay in English unless a custom `format` is used (section 2).
- Second axis only for composition, not in high-level charts (section 9).
- `Sparkline` lives on the `small-pieces` page, not on a page of its own (section 5).
- `LineChart interactive` added, though the list only mentioned it as a remark (section 10).
- Donut stays out: "everything" was read as the list's build items, and the list says not to build it.

## Left to the builder

Internal file layout, test structure, exact warning wording, the names of keys in the message table beyond those shown, and how the literal-string guard in section 2 is implemented.
