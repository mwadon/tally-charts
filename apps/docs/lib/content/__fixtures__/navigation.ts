import type { Navigation } from '../types'

/**
 * A navigation for tests of the "page does not exist" state, independent of `content/`: only
 * `coming-soon` is unavailable, so adding fixtures to `content/` never changes these tests.
 */
export const controlledNavigation: Navigation = {
  groups: [
    {
      label: 'Start',
      items: [{ label: 'Getting started', slug: 'getting-started', available: true }],
    },
    {
      label: 'Guides',
      items: [{ label: 'Coming soon', slug: 'coming-soon', available: false }],
    },
    { label: 'Charts', items: [{ label: 'LineChart', slug: 'line-chart', available: true }] },
    {
      label: 'Building blocks',
      items: [{ label: 'Composition', slug: 'composition', available: true }],
    },
    { label: 'Reference', items: [{ label: 'Stability', slug: 'stability', available: true }] },
  ],
}
