export interface NavItem {
  label: string
  slug: string
}

export interface NavGroup {
  label: string
  items: readonly NavItem[]
}

/** Sidebar groups as in SPEC F15. Slugs are flat: every page lives at `/docs/<slug>`. */
export const NAV_GROUPS: readonly NavGroup[] = [
  { label: 'Start', items: [{ label: 'Getting started', slug: 'getting-started' }] },
  {
    label: 'Guides',
    items: [
      { label: 'Theming', slug: 'theming' },
      { label: 'Palettes', slug: 'palettes' },
      { label: 'Time scales', slug: 'time-scales' },
      { label: 'Formatting', slug: 'formatting' },
      { label: 'Thresholds', slug: 'thresholds' },
      { label: 'Accessibility', slug: 'accessibility' },
      { label: 'Server Components', slug: 'server-components' },
      { label: 'Dark mode', slug: 'dark-mode' },
    ],
  },
  {
    label: 'Charts',
    items: [
      { label: 'BarChart', slug: 'bar-chart' },
      { label: 'ComparisonBars', slug: 'comparison-bars' },
      { label: 'RankedBars', slug: 'ranked-bars' },
      { label: 'WaterfallChart', slug: 'waterfall-chart' },
      { label: 'BridgeChart', slug: 'bridge-chart' },
      { label: 'DotHistogram', slug: 'dot-histogram' },
      { label: 'StripPlot', slug: 'strip-plot' },
      { label: 'WaffleColumns', slug: 'waffle-columns' },
      { label: 'LineChart', slug: 'line-chart' },
      { label: 'Heatmap', slug: 'heatmap' },
      { label: 'RunwayChart', slug: 'runway-chart' },
    ],
  },
  {
    label: 'Building blocks',
    items: [
      { label: 'Composition', slug: 'composition' },
      { label: 'Small pieces', slug: 'small-pieces' },
      { label: 'Hooks and providers', slug: 'hooks-and-providers' },
    ],
  },
  {
    label: 'Reference',
    items: [
      { label: 'Stability', slug: 'stability' },
      { label: 'Migration to 1.0', slug: 'migration-1-0' },
    ],
  },
]

/**
 * Pages that exist in the placeholder. The other entries are shown in the sidebar but disabled
 * (not links), so the nav looks final without producing 404s. Replaced by the CMS in F11.
 */
export const AVAILABLE_SLUGS: ReadonlySet<string> = new Set(['line-chart'])

export const SITE = {
  name: 'tally-charts',
  version: 'v0.9',
  github: 'https://github.com/mwadon/tally-charts',
  npm: 'https://www.npmjs.com/package/tally-charts',
  hero: 'Opinionated React charts for narrative business dashboards.',
} as const

export const docHref = (slug: string) => `/docs/${slug}`
