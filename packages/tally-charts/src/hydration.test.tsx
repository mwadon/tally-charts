import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { act, version } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { LastTwelveWeeks } from '../test/fixtures'
import { thresholds } from './core/thresholds'
import { ShareBar } from './react/ui/ShareBar'
import { ZoneMeter } from './react/ui/ZoneMeter'

// Markup produced by ssr.node.test.tsx in a real node environment (no window). That file is
// React 19 output, whose useId values differ from React 18's, so the React 18 CI leg hydrates
// its own server render instead.
const serverHtml = version.startsWith('19')
  ? readFileSync(resolve(__dirname, '__snapshots__/last-twelve-weeks.ssr.html'), 'utf8')
  : renderToString(<LastTwelveWeeks />)

// Tell React this environment supports act(); otherwise it logs a warning on every act call.
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

describe('hydration', () => {
  it('hydrates node-rendered server markup without mismatches', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    const container = document.createElement('div')
    container.innerHTML = serverHtml
    document.body.appendChild(container)
    const onRecoverableError = vi.fn()
    let root: ReturnType<typeof hydrateRoot> | undefined
    await act(async () => {
      root = hydrateRoot(container, <LastTwelveWeeks />, { onRecoverableError })
    })
    expect(onRecoverableError).not.toHaveBeenCalled()
    expect(errors).not.toHaveBeenCalled()
    await act(async () => {
      root?.unmount()
    })
    container.remove()
    errors.mockRestore()
  })

  // These use no useId, so React 18 and 19 agree and no committed fixture is needed.
  it('hydrates ShareBar and ZoneMeter server markup without mismatches', async () => {
    const lcp = thresholds(
      [2.5, 4],
      ['gain', 'warn', 'loss'],
      ['Good', 'Needs improvement', 'Poor'],
    )
    const Pieces = () => (
      <>
        <ShareBar
          label="Sources"
          segments={[
            { label: 'Search', value: 1968 },
            { label: 'Direct', value: 1101, fill: 'hatch' },
          ]}
        />
        <ZoneMeter label="LCP" value={4.1} zones={lcp} max={6} />
      </>
    )
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    const container = document.createElement('div')
    container.innerHTML = renderToString(<Pieces />)
    document.body.appendChild(container)
    const onRecoverableError = vi.fn()
    let root: ReturnType<typeof hydrateRoot> | undefined
    await act(async () => {
      root = hydrateRoot(container, <Pieces />, { onRecoverableError })
    })
    expect(onRecoverableError).not.toHaveBeenCalled()
    expect(errors).not.toHaveBeenCalled()
    await act(async () => {
      root?.unmount()
    })
    container.remove()
    errors.mockRestore()
  })
})
