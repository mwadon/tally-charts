export const SITE = {
  name: 'tally-charts',
  version: 'v0.9',
  github: 'https://github.com/mwadon/tally-charts',
  npm: 'https://www.npmjs.com/package/tally-charts',
  hero: 'Opinionated React charts for narrative business dashboards.',
} as const

export const docHref = (slug: string) => `/docs/${slug}`
