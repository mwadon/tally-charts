# tally-charts docs site: design

Date: 2026-10-25. Status: **proposal, waiting for the maintainer's approval (gate F10)**.
Scope: SPEC F10. The running placeholder is `apps/docs` (`/` and `/docs/line-chart`, static content,
no CMS). Screenshots and the measuring scripts are in `docs/superpowers/specs/assets/docs-site/`.

To look at it: `pnpm build && pnpm --filter docs build && pnpm --filter docs start`, then open
`http://127.0.0.1:3100/` and `/docs/line-chart`. Add `?theme=dark` or `?theme=light` to force a theme;
without it the page follows the system setting.

| Page | 1280 px light | 1280 px dark | 375 px light | 375 px dark |
|---|---|---|---|---|
| Home | [home-1280-light.png](assets/docs-site/home-1280-light.png) | [home-1280-dark.png](assets/docs-site/home-1280-dark.png) | [home-375-light.png](assets/docs-site/home-375-light.png) | [home-375-dark.png](assets/docs-site/home-375-dark.png) |
| LineChart | [line-chart-1280-light.png](assets/docs-site/line-chart-1280-light.png) | [line-chart-1280-dark.png](assets/docs-site/line-chart-1280-dark.png) | [line-chart-375-light.png](assets/docs-site/line-chart-375-light.png) | [line-chart-375-dark.png](assets/docs-site/line-chart-375-dark.png) |

## 1. Information architecture

Pages are flat: every page lives at `/docs/<slug>` (D-7); the hierarchy exists only in the sidebar.
`/` is the home page (slug `home`). The sidebar groups are the ones F15 puts in `content/navigation.json`:

| Group | Pages (label → slug) |
|---|---|
| **Start** | Getting started → `getting-started` |
| **Guides** | Theming → `theming`; Palettes → `palettes`; Time scales → `time-scales`; Formatting → `formatting`; Thresholds → `thresholds`; Accessibility → `accessibility`; Server Components → `server-components`; Dark mode → `dark-mode` |
| **Charts** | BarChart → `bar-chart`; ComparisonBars → `comparison-bars`; RankedBars → `ranked-bars`; WaterfallChart → `waterfall-chart`; BridgeChart → `bridge-chart`; DotHistogram → `dot-histogram`; StripPlot → `strip-plot`; WaffleColumns → `waffle-columns`; LineChart → `line-chart`; Heatmap → `heatmap`; RunwayChart → `runway-chart` |
| **Building blocks** | Composition → `composition`; Small pieces → `small-pieces`; Hooks and providers → `hooks-and-providers` |
| **Reference** | Stability → `stability`; Migration to 1.0 → `migration-1-0` |

That is 25 pages plus the home page, every slug from F15. The data lives in
`apps/docs/app/_content/navigation.ts` (a placeholder for the CMS navigation of F11).

Header (same on every page): wordmark, version badge, links (Docs on the home page, GitHub, npm), a
theme switch, and on docs pages the Menu button on small screens.

**Pages that do not exist yet.** Only `line-chart` exists in the placeholder. The other sidebar entries
are rendered, but as disabled text (`<span aria-disabled="true">`, `--ch-ink-muted`), not as links, so
the maintainer sees the final navigation and nobody gets a 404. "Getting started" on the home page is
disabled the same way and the hero button "Read the docs" points at `/docs/line-chart` until
`getting-started` exists.

## 2. Home page layout

Content column up to 72 rem, centred. Sections in the F16 order:

1. **Hero.** Two columns from 900 px (text left, live chart right); stacked below. Eyebrow, the h1
   "Opinionated React charts for narrative business dashboards.", a one-line lede, two buttons
   (primary "Read the docs", secondary "GitHub"). The chart sits on a raised card in front of a
   fading hatched field.
2. **Visual language.** Four cards with a mini chart each: *Hatched is plan*, *Solid is actual*,
   *Pink is loss*, *Targets come first*. Four columns from 900 px, two from 640 px, one below.
3. **Gallery.** Nine tiles for the nine reference dashboards, each a live dashboard with a caption
   (F16). The columns are `repeat(auto-fill, minmax(min(100%, 22rem), 1fr))`, so a tile is at least
   ~22 rem wide: 1 column below ~765 px, 2 up to ~1130 px, 3 above (T26.2, D2).
4. **Install.** A code block with `npm i tally-charts` and a Copy button.
5. **Features.** Four cards: accessibility, Server Components, theming with tokens, light and dark.
6. **Links.** Getting started, GitHub, npm. Then a footer.

## 3. Docs page layout (≥ 900 px)

```
+----------------------------------------------------------------------+
| tally-charts  v0.9                         GitHub  npm  [theme]      |  header, sticky, 56 px
|//////////////////////// hatch rule 6 px ///////////////////////////////|
+------------+----------------------------------------+----------------+
| START      | CHARTS (eyebrow)                       | ON THIS PAGE   |
|  Getting.. | LineChart (h1)                         |  When to use   |
| GUIDES     | lede                                   |  Import        |
|  ...       | h2, text, code blocks, ChartExample    |  Examples      |
| CHARTS     |                                        |  Props         |
| ▨ LineChart|                                        |  Keyboard...   |
+------------+----------------------------------------+----------------+
   15 rem            content, max 46 rem                 13 rem (≥1100)
```

- **Header** is sticky, 56 px plus the 6 px hatch rule. Page and header share the surface colour.
- **Sidebar** is a sticky column (15 rem) that scrolls on its own. Group labels are small uppercase
  `--ch-ink-muted`; items are `--ch-ink`; the current page is bold with a hatched bar on its left edge
  and `aria-current="page"`; pages that do not exist yet are `--ch-ink-muted` text.
- **Content** is at most 46 rem wide (about 75 characters at 16 px). h1, a lede, then sections with h2
  anchors (`scroll-margin-top` clears the sticky header).
- **Table of contents.** From 1100 px a sticky right column titled "On this page" that links to the h2
  anchors. Between 900 and 1100 px the content simply gets wider and the ToC is the collapsed
  disclosure described below.

## 4. Mobile layout (375 px)

- Header: wordmark, GitHub, npm, the theme switch and a **Menu** button (the version badge appears from
  640 px). Docs pages only have the Menu button; the home page has no sidebar, so it has no Menu.
- Navigation is a **panel** that drops down under the header (fixed, full width, scrolls) and opens with
  the Menu button (`aria-expanded`, `aria-controls`). Escape closes it. Links are plain anchors, so
  following one loads the page with the panel closed.
- The ToC is a collapsed `<details>` ("On this page") above the content. At 1100 px CSS swaps it for the
  sidebar column, and the hidden variant is `display: none`, so assistive technology and Tab only see
  one.
- No horizontal scrolling: `document.body.scrollWidth <= clientWidth` is checked in e2e on both pages.
  Code blocks and the props table scroll inside their own box (focusable, `role="region"` with a name).
- Page padding is 16 px (24 px from 640 px); the Preview/Code toggle wraps under the card title if
  needed.

## 5. Typography

System fonts only: no web font, no network request (T02 D5).

- Text: `system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif`.
- Code: `ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace`.

| Role | Size | Weight | Line height |
|---|---|---|---|
| h1 (docs) | 2.25 rem (36 px) | 750 | 1.2 |
| h1 (home hero) | 2 rem (32 px), 2.75 rem (44 px) from 640 px, 3.25 rem (52 px) from 900 px | 750 | 1.2 |
| h2 | 1.5 rem (24 px) | 700 | 1.2 |
| h3 | 1.125 rem (18 px) | 650 | 1.2 |
| Lede | 1.1875 rem (19 px) | 400 | 1.55 |
| Body | 1 rem (16 px) | 400 | 1.65 |
| Nav items, table, ToC | 0.9375 rem (15 px) | 400 / 600 | 1.4 |
| Small and captions | 0.875 rem (14 px) | 400 | 1.65 |
| Eyebrow, group labels, table head | 0.8125 rem (13 px), uppercase, 0.06 em tracking | 600 to 650 | 1.65 |
| Code block | 0.875 rem (14 px) | 400 | 1.6 |
| Inline code | 0.875 em | 400 | inherit |

Headings have −0.015 em letter spacing and `text-wrap: balance`. Numbers in tables and the version
badge use `font-variant-numeric: tabular-nums`. Sizes are in `rem`, so the browser's font size setting
scales the whole site.

## 6. Colors

Page colors come from the package's tokens (`tally-charts/theme.css`); the site adds no new color. The
`--docs-*` variables in `apps/docs/app/globals.css` are only aliases or `color-mix` of `--ch-*`. The dark theme
follows `prefers-color-scheme` through the theme's own media query, or is forced with `data-ch-theme`
on `<html>` (`?theme=light|dark` in the placeholder).

| Role | Variable | Token | Light | Dark |
|---|---|---|---|---|
| Page background | `--docs-bg` | `--ch-surface` | #fafafa | #121215 |
| Raised surfaces (code blocks, ChartExample, cards, mobile nav panel) | `--docs-raised` | `--ch-tooltip-bg` | #ffffff | #1d1d22 |
| Dividers, card borders (decorative) | `--docs-line` | `--ch-grid` | #e4e4e9 | #2a2a31 |
| Text, headings | `--docs-text` | `--ch-ink` | #111114 | #f4f4f6 |
| Secondary text, labels | `--docs-muted` | `--ch-ink-muted` | #6b6b73 | #a0a0aa |
| Control borders (buttons, toggle, `kbd`) | `--docs-control-border` | `--ch-ink-muted` | #6b6b73 | #a0a0aa |
| Link text | `--docs-link` | 70 % `--ch-accent` + 30 % `--ch-ink` | #2650ae | #7fa7fc |
| Focus ring | `--docs-focus` | `--ch-accent` | #2f6bf0 | #4d86ff |
| Hatch signature | `--docs-hatch` | `--ch-accent` and `--ch-hatch-*` | stripes of #2f6bf0 | stripes of #4d86ff |
| Selected toggle, primary button | | fill `--ch-ink`, text `--ch-surface` | #111114 / #fafafa | #f4f4f6 / #121215 |

Rules that follow from the contrast measurements (§10):

- Pure `--ch-accent` is never used as text: #2f6bf0 on #fafafa is 4.49:1 (below 4.5). Links mix 70 %
  accent with ink, the same recipe the charts use for toned text (`--ch-tone-text-mix`), and keep an
  underline, so a link is not told apart by colour alone.
- Raw `--ch-accent` is used for non-text only (focus ring, hatch stripes), where 3:1 applies.
- Borders of controls use `--ch-ink-muted` (≥ 5:1), not `--ch-grid` (1.2:1). `--ch-grid` is for
  decorative dividers and card outlines, which carry no information.

## 7. The hatched motif

The site's signature is the hatch of the charts (hatched = plan or reference), drawn in CSS from the
same tokens as the chart marks, so it changes with `--ch-hatch-angle`, `--ch-hatch-width`,
`--ch-hatch-gap` and `--ch-hatch-tint`:

```css
repeating-linear-gradient(
  calc((var(--ch-hatch-angle) + 90) * 1deg),
  var(--ch-accent) 0 var(--ch-hatch-width),
  color-mix(in srgb, var(--ch-accent) calc(var(--ch-hatch-tint) * 100%), transparent)
    var(--ch-hatch-width) calc(var(--ch-hatch-gap) * 1px)
);
```

Where it is used, and nowhere else (restraint is the point):

1. A 6 px **rule under the header**, full width, on every page.
2. The **active sidebar item**: a 6 px wide bar on the left edge.
3. The **home hero**: a field behind the chart card, fading out toward the bottom left.
4. **Gallery tiles** (placeholder for the dashboards).

Text is never placed on hatching. The motif is decorative (`aria-hidden`); the active item is also
bold and has `aria-current`. No images are involved.

## 8. Code block

- **Container:** `--ch-tooltip-bg` background, 1 px `--ch-grid` border, radius `3 × --ch-radius` (9 px).
- **Bar** (40 px): file name or "Terminal" in the mono font and `--ch-ink-muted` on the left, **Copy**
  button on the right (1 px `--ch-ink-muted` border, `aria-label="Copy code: <label>"`). In the
  placeholder the button is visual; the working "Copied" state with a live region is F12.
- **Code:** mono 14 px, line height 1.6, padding 16 px, horizontal scroll inside the block. The `<pre>`
  is focusable (`tabindex="0"`, `role="region"`, named) so keyboard users can scroll it.
- **Syntax colors** are tones mixed with ink, as for toned chart text: keyword 70 % accent, string
  60 % gain, number 65 % warn, tag 65 % loss, comment `--ch-ink-muted` italic, function ink bold. Each
  is measured in §10. The placeholder colours tokens by hand; Shiki with matching themes is F12.
- **Inline code:** mono 0.875 em, 1 px `--ch-grid` border, `--ch-tooltip-bg` background.

## 9. ChartExample (Preview / Code)

A card (same chrome as the code block) with a bar and a panel.

- **Bar:** the example title on the left, the toggle on the right: two buttons **Preview** and
  **Code** in a `<fieldset>` named "View of <title>". They are plain buttons with `aria-pressed` and
  `aria-controls`, not a tablist, because both switch one block between two views.
- **States:** unselected = transparent, `--ch-ink` text, 1 px `--ch-ink-muted` border; selected = filled
  with `--ch-ink`, text `--ch-surface` (differs by fill, not only by colour); focus = the 2 px ring
  (§10); disabled is not used. The bar wraps under the title when it does not fit.
- **Panels:** the Preview panel holds the live chart (16 px padding); the Code panel holds a code block
  without its own border. The inactive panel is hidden with `hidden`, so the chart keeps its state. Both
  panels have the same minimum height (18 rem) so the card does not jump when toggled.

## 10. Focus and contrast

**Focus.** `:focus-visible { outline: 2px solid var(--ch-accent); outline-offset: 2px }` on every focusable
element, in both themes; in forced-colors mode the outline is `Highlight`. The skip link
("Skip to content") appears on the first Tab. e2e checks that Tab reaches the wordmark and the toggle
with a non-zero solid outline.

**Contrast.** `assets/docs-site/contrast.mjs` opens both pages in both themes at 1280 and 375 px,
reads the computed colours of the real elements, resolves their real backgrounds (including `color-mix`),
and prints the table below. Each text is measured on the two token backgrounds (`--ch-surface`,
`--ch-tooltip-bg`) and on its actual background. Text needs 4.5:1; control borders, the selected-state
fill and the focus ring need 3:1. The script exits with 1 if any pair fails; it passed on the run below.
A unit test (`app/contrast.test.ts`) also keeps `--ch-ink` and `--ch-ink-muted` ≥ 4.5:1 and the accent
≥ 3:1 on both backgrounds in both themes in CI.

Notes for reading the table: "–" means the pair is not meaningful (inverse text on its own filled
control is measured against its actual background only). The disabled
sidebar items are not required to pass by WCAG; the sidebar items use `--ch-ink-muted` anyway and pass.

### Contrast table (generated by `contrast.mjs`)

Light: fg, ratio on `--ch-surface`, on `--ch-tooltip-bg`, on the actual background. Then the same for dark.

| Element | Min | Light fg | on surface | on tooltip-bg | actual bg | Dark fg | on surface | on tooltip-bg | actual bg |
|---|---|---|---|---|---|---|---|---|---|
| Body text (ink) | 4.5:1 | #111114 | 18.06 | 18.85 | 18.06 (#fafafa) | #f4f4f6 | 17.02 | 15.28 | 17.02 (#121215) |
| Heading h1 (ink) | 4.5:1 | #111114 | 18.06 | 18.85 | 18.06 (#fafafa) | #f4f4f6 | 17.02 | 15.28 | 17.02 (#121215) |
| Lede / muted text (ink-muted) | 4.5:1 | #6b6b73 | 5.06 | 5.28 | 5.06 (#fafafa) | #a0a0aa | 7.22 | 6.48 | 7.22 (#121215) |
| Small note (ink-muted) | 3:1 | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a |
| Eyebrow (ink-muted) | 4.5:1 | #6b6b73 | 5.06 | 5.28 | 5.06 (#fafafa) | #a0a0aa | 7.22 | 6.48 | 7.22 (#121215) |
| Inline link (accent 70% + ink) | 4.5:1 | #2650ae | 7.08 | 7.39 | 7.08 (#fafafa) | #7fa7fc | 7.87 | 7.06 | 7.87 (#121215) |
| Link in "Keep going" (home) | 4.5:1 | #2650ae | 7.08 | 7.39 | 7.08 (#fafafa) | #7fa7fc | 7.87 | 7.06 | 7.87 (#121215) |
| Header link | 4.5:1 | #111114 | 18.06 | 18.85 | 18.06 (#fafafa) | #f4f4f6 | 17.02 | 15.28 | 17.02 (#121215) |
| Wordmark | 4.5:1 | #111114 | 18.06 | 18.85 | 18.06 (#fafafa) | #f4f4f6 | 17.02 | 15.28 | 17.02 (#121215) |
| Version badge (ink-muted) | 4.5:1 | #6b6b73 | 5.06 | 5.28 | 5.06 (#fafafa) | #a0a0aa | 7.22 | 6.48 | 7.22 (#121215) |
| Side nav active item | 4.5:1 | #111114 | 18.06 | 18.85 | 18.06 (#fafafa) | #f4f4f6 | 17.02 | 15.28 | 17.02 (#121215) |
| Side nav disabled item (ink-muted) | 4.5:1 | #6b6b73 | 5.06 | 5.28 | 5.06 (#fafafa) | #a0a0aa | 7.22 | 6.48 | 7.22 (#121215) |
| Side nav group label (ink-muted) | 4.5:1 | #6b6b73 | 5.06 | 5.28 | 5.06 (#fafafa) | #a0a0aa | 7.22 | 6.48 | 7.22 (#121215) |
| ToC link (ink-muted) | 4.5:1 | #6b6b73 | 5.06 | 5.28 | 5.06 (#fafafa) | #a0a0aa | 7.22 | 6.48 | 7.22 (#121215) |
| ToC disclosure summary (mobile) | 4.5:1 | #111114 | 18.06 | 18.85 | 18.85 (#ffffff) | #f4f4f6 | 17.02 | 15.28 | 15.28 (#1d1d22) |
| Menu button (mobile) | 4.5:1 | #111114 | 18.06 | 18.85 | 18.06 (#fafafa) | #f4f4f6 | 17.02 | 15.28 | 17.02 (#121215) |
| Theme switch text | 4.5:1 | #111114 | 18.06 | 18.85 | 18.06 (#fafafa) | #f4f4f6 | 17.02 | 15.28 | 17.02 (#121215) |
| Inline code | 4.5:1 | #111114 | 18.06 | 18.85 | 18.85 (#ffffff) | #f4f4f6 | 17.02 | 15.28 | 15.28 (#1d1d22) |
| Code text | 4.5:1 | #111114 | 18.06 | 18.85 | 18.85 (#ffffff) | #f4f4f6 | 17.02 | 15.28 | 15.28 (#1d1d22) |
| Code filename (ink-muted) | 4.5:1 | #6b6b73 | 5.06 | 5.28 | 5.28 (#ffffff) | #a0a0aa | 7.22 | 6.48 | 6.48 (#1d1d22) |
| Syntax: keyword | 4.5:1 | #2650ae | 7.08 | 7.39 | 7.39 (#ffffff) | #7fa7fc | 7.87 | 7.06 | 7.06 (#1d1d22) |
| Syntax: string | 4.5:1 | #1b6943 | 6.39 | 6.67 | 6.67 (#ffffff) | #86deb3 | 11.68 | 10.48 | 10.48 (#1d1d22) |
| Syntax: constant | 4.5:1 | #815926 | 5.93 | 6.19 | 6.19 (#ffffff) | #fbc988 | 12.30 | 11.04 | 11.04 (#1d1d22) |
| Syntax: punctuation | 4.5:1 | #111114 | 18.06 | 18.85 | 18.85 (#ffffff) | #f4f4f6 | 17.02 | 15.28 | 15.28 (#1d1d22) |
| Syntax: function | 4.5:1 | #111114 | 18.06 | 18.85 | 18.85 (#ffffff) | #f4f4f6 | 17.02 | 15.28 | 15.28 (#1d1d22) |
| Copy button text | 4.5:1 | #111114 | 18.06 | 18.85 | 18.85 (#ffffff) | #f4f4f6 | 17.02 | 15.28 | 15.28 (#1d1d22) |
| Preview/Code toggle, unselected | 4.5:1 | #111114 | 18.06 | 18.85 | 18.85 (#ffffff) | #f4f4f6 | 17.02 | 15.28 | 15.28 (#1d1d22) |
| Preview/Code toggle, selected | 4.5:1 | #fafafa | – | – | 18.06 (#111114) | #121215 | – | – | 17.02 (#f4f4f6) |
| Button, primary | 4.5:1 | #fafafa | – | – | 18.06 (#111114) | #121215 | – | – | 17.02 (#f4f4f6) |
| Button, secondary | 4.5:1 | #111114 | 18.06 | 18.85 | 18.06 (#fafafa) | #f4f4f6 | 17.02 | 15.28 | 17.02 (#121215) |
| Table header (ink-muted) | 4.5:1 | #6b6b73 | 5.06 | 5.28 | 5.28 (#ffffff) | #a0a0aa | 7.22 | 6.48 | 6.48 (#1d1d22) |
| Table cell | 4.5:1 | #111114 | 18.06 | 18.85 | 18.85 (#ffffff) | #f4f4f6 | 17.02 | 15.28 | 15.28 (#1d1d22) |
| Card text (ink-muted) | 4.5:1 | #6b6b73 | 5.06 | 5.28 | 5.28 (#ffffff) | #a0a0aa | 7.22 | 6.48 | 6.48 (#1d1d22) |
| Card heading | 4.5:1 | #111114 | 18.06 | 18.85 | 18.85 (#ffffff) | #f4f4f6 | 17.02 | 15.28 | 15.28 (#1d1d22) |
| Footer (ink-muted) | 4.5:1 | #6b6b73 | 5.06 | 5.28 | 5.06 (#fafafa) | #a0a0aa | 7.22 | 6.48 | 7.22 (#121215) |
| Disabled link placeholder (home) | 4.5:1 | #6b6b73 | 5.06 | 5.28 | 5.06 (#fafafa) | #a0a0aa | 7.22 | 6.48 | 7.22 (#121215) |
| Border: Copy button | 3:1 | #6b6b73 | 5.06 | 5.28 | 5.28 (#ffffff) | #a0a0aa | 7.22 | 6.48 | 6.48 (#1d1d22) |
| Border: toggle, unselected | 3:1 | #6b6b73 | 5.06 | 5.28 | 5.28 (#ffffff) | #a0a0aa | 7.22 | 6.48 | 6.48 (#1d1d22) |
| Border: secondary button | 3:1 | #6b6b73 | 5.06 | 5.28 | 5.06 (#fafafa) | #a0a0aa | 7.22 | 6.48 | 7.22 (#121215) |
| Border: Menu button (mobile) | 3:1 | #6b6b73 | 5.06 | 5.28 | 5.06 (#fafafa) | #a0a0aa | 7.22 | 6.48 | 7.22 (#121215) |
| Border: theme switch | 3:1 | #6b6b73 | 5.06 | 5.28 | 5.06 (#fafafa) | #a0a0aa | 7.22 | 6.48 | 7.22 (#121215) |
| Fill: selected toggle vs card | 3:1 | #111114 | 18.06 | 18.85 | 18.85 (#ffffff) | #f4f4f6 | 17.02 | 15.28 | 15.28 (#1d1d22) |
| Fill: primary button vs page | 3:1 | #111114 | 18.06 | 18.85 | 18.06 (#fafafa) | #f4f4f6 | 17.02 | 15.28 | 17.02 (#121215) |

| Theme | Focused element | Outline | Color | vs surface | vs tooltip-bg | Result |
|---|---|---|---|---|---|---|
| light | `.wordmark` | solid 2px, offset 2px | #2f6bf0 | 4.49 | 4.69 | ok |
| light | `.segmented button` | solid 2px, offset 2px | #2f6bf0 | 4.49 | 4.69 | ok |
| light | `.code-copy` | solid 2px, offset 2px | #2f6bf0 | 4.49 | 4.69 | ok |
| light | `.side-nav a` | solid 2px, offset 2px | #2f6bf0 | 4.49 | 4.69 | ok |
| light | `.wordmark` | solid 2px, offset 2px | #2f6bf0 | 4.49 | 4.69 | ok |
| dark | `.wordmark` | solid 2px, offset 2px | #4d86ff | 5.49 | 4.93 | ok |
| dark | `.segmented button` | solid 2px, offset 2px | #4d86ff | 5.49 | 4.93 | ok |
| dark | `.code-copy` | solid 2px, offset 2px | #4d86ff | 5.49 | 4.93 | ok |
| dark | `.side-nav a` | solid 2px, offset 2px | #4d86ff | 5.49 | 4.93 | ok |
| dark | `.wordmark` | solid 2px, offset 2px | #4d86ff | 5.49 | 4.93 | ok |

## 11. Decisions

1. **File name and routes.** This file; the placeholder routes are `/` and `/docs/line-chart`. Content is
   static, in TSX and objects in the repo. No CMS, no `ContentSource`, no glokki dependency, no `CMS_*`
   variables (that is F11 and F12).
2. **Dark mode** follows `prefers-color-scheme` because `theme.css` already does that. `?theme=light|dark`
   sets `data-ch-theme` on `<html>` through a small inline script in `<head>`, before first paint, so
   screenshots and review can force a theme. No storage; `<html>` has `suppressHydrationWarning` because
   the script sets the attribute before hydration. The full light/dark/system switch with
   `localStorage` and the anti-flash script is F11. The header button is visual only (disabled, with an
   explanatory `aria-label`).
3. **Colors only from tokens.** Page background `--ch-surface`, raised surfaces `--ch-tooltip-bg`, lines
   `--ch-grid`, text `--ch-ink` and `--ch-ink-muted`. No new colors, so every contrast can be computed and
   the site follows any theme override.
4. **Wordmark** is the text "tally-charts" in the header, a link to `/`; it is not a heading and there is no
   image (the repo has no logo file). On the home page the h1 is the hero sentence; on the LineChart page
   it is "LineChart".
5. **Hatching** is CSS only (§7).
6. **Fonts** are the system stack (§5).
7. **Code blocks** in the placeholder are static `<pre><code>` with hand-coloured tokens; Shiki and the
   working Copy button are F12.
8. **ChartExample** is a `'use client'` component taking `preview` and `code` as nodes, so F12 can fill
   it from the example registry.
9. **Links to missing pages** are disabled text, not links (§1).
10. **Links** use the accent mixed with ink and an underline; the focus ring uses the raw accent (§6).
11. **No visual baselines** now (T02 D3). The 8 PNGs are review material, not test baselines; F17 adds baselines.
12. **Props of high-level charts stay serializable** in server components (no functions): the docs pages
    are server components, so examples use presets such as `format="currency-compact"`.

## 12. Reproducing the screenshots and the contrast table

After `pnpm build`, `pnpm --filter docs build` and `pnpm --filter docs start` (port 3100 must be free):

```sh
node docs/superpowers/specs/assets/docs-site/shots.mjs      # writes the 8 PNGs next to the script
node docs/superpowers/specs/assets/docs-site/contrast.mjs   # prints the markdown tables
```

The scripts take Playwright from `apps/docs` (no `package.json` of their own) and use `BASE_URL`
(default `http://127.0.0.1:3100`).

## 13. Review and approval (gate F10)

Status of this document stays "proposal" until the maintainer fills in the result below. M5 (look and
routing of the docs site) does not start before that, except F12 and F13 (SPEC D-12).

To look at the placeholder locally: `pnpm build && pnpm --filter docs build && pnpm --filter docs start`
(port 3100 must be free: `lsof -i :3100`), then open `http://127.0.0.1:3100/` and
`http://127.0.0.1:3100/docs/line-chart?theme=dark` (also `?theme=light`).

Checklist for the maintainer:

- [ ] §1 Information architecture: groups Start, Guides, Charts, Building blocks, Reference and all slugs; disabled entries for pages that do not exist yet.
- [ ] §2 Home page: order of sections.
- [ ] §3 Docs page layout at ≥ 900 px: header, sidebar, content, table of contents.
- [ ] §4 Mobile layout at 375 px: Menu button and panel, no horizontal scroll.
- [ ] §5 Typography: system stack and scale.
- [ ] §6 Colors: role → `--ch-*` token table, link and focus colors.
- [ ] §7 The hatched motif.
- [ ] §8 Code block.
- [ ] §9 ChartExample (Preview / Code).
- [ ] §10 Focus and contrast table (all pairs ≥ 4.5:1 for text, ≥ 3:1 for borders and focus).
- [ ] §11 Decisions 1–12.
- [ ] Screenshots (all 8):
  - [ ] [home-1280-light.png](assets/docs-site/home-1280-light.png)
  - [ ] [home-1280-dark.png](assets/docs-site/home-1280-dark.png)
  - [ ] [home-375-light.png](assets/docs-site/home-375-light.png)
  - [ ] [home-375-dark.png](assets/docs-site/home-375-dark.png)
  - [ ] [line-chart-1280-light.png](assets/docs-site/line-chart-1280-light.png)
  - [ ] [line-chart-1280-dark.png](assets/docs-site/line-chart-1280-dark.png)
  - [ ] [line-chart-375-light.png](assets/docs-site/line-chart-375-light.png)
  - [ ] [line-chart-375-dark.png](assets/docs-site/line-chart-375-dark.png)

Result (filled in by the maintainer only):

- Decision: —
- Date: —
- Notes: —
