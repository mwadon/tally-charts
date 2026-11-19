import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { act, version } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { CrewHours, CrewQuarters, JobMargins, LastTwelveWeeks, MonthlyCost } from '../test/fixtures'
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

  // Server markup from this environment's React, so its useId values match on both CI legs;
  // ssr.node.test.tsx renders the same fixture without a DOM. The server render comes before the
  // console.error spy: in jsdom `window` exists, so React 18 warns that useLayoutEffect does
  // nothing on the server, which says nothing about hydration.
  it('hydrates GroupedBarChart server markup without mismatches', async () => {
    const html = renderToString(<CrewQuarters />)
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    const container = document.createElement('div')
    container.innerHTML = html
    expect(container.querySelectorAll('[data-ch-part="bar"]')).toHaveLength(12)
    document.body.appendChild(container)
    const onRecoverableError = vi.fn()
    let root: ReturnType<typeof hydrateRoot> | undefined
    await act(async () => {
      root = hydrateRoot(container, <CrewQuarters />, { onRecoverableError })
    })
    expect(onRecoverableError).not.toHaveBeenCalled()
    expect(errors).not.toHaveBeenCalled()
    expect(container.querySelectorAll('[data-ch-part="bar"]')).toHaveLength(12)
    await act(async () => {
      root?.unmount()
    })
    container.remove()
    errors.mockRestore()
  })

  // As above: the server render comes before the console.error spy.
  it('hydrates StackedBarChart server markup without mismatches', async () => {
    const html = renderToString(<MonthlyCost />)
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    const container = document.createElement('div')
    container.innerHTML = html
    expect(container.querySelectorAll('[data-ch-part="bar"]')).toHaveLength(20)
    expect(container.querySelectorAll('[data-ch-part="bar-hit"]')).toHaveLength(18)
    document.body.appendChild(container)
    const onRecoverableError = vi.fn()
    let root: ReturnType<typeof hydrateRoot> | undefined
    await act(async () => {
      root = hydrateRoot(container, <MonthlyCost />, { onRecoverableError })
    })
    expect(onRecoverableError).not.toHaveBeenCalled()
    expect(errors).not.toHaveBeenCalled()
    expect(container.querySelectorAll('[data-ch-part="bar"]')).toHaveLength(20)
    await act(async () => {
      root?.unmount()
    })
    container.remove()
    errors.mockRestore()
  })

  // As above: the server render comes before the console.error spy.
  it('hydrates StackedAreaChart server markup without mismatches', async () => {
    const html = renderToString(<CrewHours />)
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    const container = document.createElement('div')
    container.innerHTML = html
    expect(container.querySelectorAll('[data-ch-part="area-layer"]')).toHaveLength(6)
    document.body.appendChild(container)
    const onRecoverableError = vi.fn()
    let root: ReturnType<typeof hydrateRoot> | undefined
    await act(async () => {
      root = hydrateRoot(container, <CrewHours />, { onRecoverableError })
    })
    expect(onRecoverableError).not.toHaveBeenCalled()
    expect(errors).not.toHaveBeenCalled()
    expect(container.querySelectorAll('[data-ch-part="area-layer"]')).toHaveLength(6)
    await act(async () => {
      root?.unmount()
    })
    container.remove()
    errors.mockRestore()
  })

  it('hydrates ScatterChart server markup without mismatches', async () => {
    const html = renderToString(<JobMargins />)
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    const container = document.createElement('div')
    container.innerHTML = html
    expect(container.querySelectorAll('[data-ch-part="bubble"]')).toHaveLength(16)
    document.body.appendChild(container)
    const onRecoverableError = vi.fn()
    let root: ReturnType<typeof hydrateRoot> | undefined
    await act(async () => {
      root = hydrateRoot(container, <JobMargins />, { onRecoverableError })
    })
    expect(onRecoverableError).not.toHaveBeenCalled()
    expect(errors).not.toHaveBeenCalled()
    expect(container.querySelectorAll('[data-ch-part="bubble"]')).toHaveLength(16)
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
