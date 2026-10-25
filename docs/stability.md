# Stability and semver

`tally-charts` follows strict [semantic versioning](https://semver.org) from 1.0.0. This page
says what that promise covers and what it doesn't, so you know which parts of the library you can
build on and which ones you shouldn't depend on.

## The promise

- A breaking change to the public API ships only in a major release, with a migration note: a
  snippet of the code before and after.
- Every change to the package has a changeset, so each release has notes that say what changed and
  at which level (patch, minor or major).
- The TypeScript surface is checked in CI: `api:check` compares the built declarations of
  `tally-charts` and `tally-charts/core` with a committed report, so a change to an export, a type
  or a signature can't land by accident.

New options, props, exports and tokens arrive in minor releases. Fixes arrive in patch releases.

## Public API

Everything below is covered by semver.

- **Exports of `tally-charts` and `tally-charts/core`.** Components, hooks, functions and types.
  The committed report is
  [`packages/tally-charts/api`](https://github.com/mwadon/tally-charts/tree/main/packages/tally-charts/api).
  If a name isn't exported from one of these two entry points, it isn't public.
- **`--ch-*` custom properties (tokens).** Colors, hatching, sequential ramp, radius, motion and
  so on. Their names and meaning are stable; the list is the token table in the
  [README](https://github.com/mwadon/tally-charts/blob/main/packages/tally-charts/README.md#styling).
  Default values can be tuned in a minor release, for example to keep a contrast ratio.
- **`data-ch-part`.** The attribute that names every part you might style (`tooltip`, `overlay`,
  `callout-stem`, …). The part names are stable.
- **State and variant attributes `data-ch-*`.** For example `data-ch-tone`, `data-ch-fill`,
  `data-ch-active`, `data-ch-dimmed`, `data-ch-direction`, `data-ch-theme`, `data-ch-palette`,
  `data-ch-seq-tone` and `data-ch-level`. Their names and their values are stable.
- **`theme.css`.** The stylesheet, imported as `tally-charts/theme.css`. The import path is
  stable; the rules inside are an implementation of the tokens and parts above.

## Not public

These can change in any release, minor or patch, without a migration note.

- **Classes `ch-*`.** They are hooks for the library's own styles. A class can be renamed, split
  or removed when the styles are reorganized.
- **Variables `--_ch-*`.** The leading underscore marks them as private. This includes
  `--_ch-swatch-color`, which some stories use to color a swatch: in 1.0 it has no public token,
  so don't copy it into an app. If you need a public one, open an issue.
- **DOM structure outside the parts.** The order of elements, how deep they are nested, and
  elements without `data-ch-part`. A selector like `figure > div:nth-child(2)` can break in a
  minor release. A part keeps its name, and it stays in the chart; what sits around it may move.
- **Wording of the built-in English strings.** Keyboard hints, announcements, "No data", data
  table headers and similar. The text can change in a minor release until an i18n hook arrives in
  1.x. You don't have to wait: `keyboardHint` and `dataTable` (`caption`, `columns`) already let
  you replace the main ones. Don't assert on the built-in text in your tests; assert on text you
  set.
- **Size budgets.** The limits in `.size-limit.json` are a CI guard for the maintainers. A chart
  can grow or shrink in a release, and a budget can be raised in a minor.
- **Development warnings.** Their text. Warnings exist only in development builds and are removed
  from production builds, so don't match on their wording.

## Styling that survives upgrades

Select parts by attribute, not by class, and drive the look with tokens:

```css
/* Stable: a part, a state attribute and tokens. */
[data-ch-part="tooltip"] {
  --ch-tooltip-bg: #111;
  border-radius: 4px;
}

[data-ch-part="bar"][data-ch-active="true"] {
  opacity: 0.9;
}

/* Fragile: a class and a private variable. */
.ch-tooltip {
  --_ch-swatch-color: red;
}
```

When there's no part for what you want to change, prefer a token. If neither exists, that is a
gap in the public surface and worth an issue, not a reason to reach for a class.

## Known limits in 1.0

Some behaviors are known and documented rather than fixed in 1.0:

- The hover tooltip can rest under the pointer (WCAG 1.4.13), so while it's visible it covers the
  hit areas below it, and its custom content isn't announced by screen readers.
- Heatmap `breaks` and RunwayChart levels are lower-inclusive only. The `inclusive` option is
  planned for 1.x.

The details and workarounds are in the accessibility notes, section "Known limits":
https://github.com/mwadon/tally-charts/blob/main/docs/a11y.md#known-limits
