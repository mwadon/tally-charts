import pkg from '../../../../packages/tally-charts/package.json'

// Server-only module (SiteHeader and pages): package.json must not reach the client bundle.
export const SITE = {
  name: 'tally-charts',
  version: `v${pkg.version}`,
  github: 'https://github.com/mwadon/tally-charts',
  npm: 'https://www.npmjs.com/package/tally-charts',
} as const

export { docHref } from './doc-href'
