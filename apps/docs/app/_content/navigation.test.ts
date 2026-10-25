import { expect, test } from 'vitest'
import pkg from '../../../../packages/tally-charts/package.json'
import { SITE } from './navigation'

test('the site version is the version of packages/tally-charts', () => {
  expect(SITE.version).toBe(`v${pkg.version}`)
})
