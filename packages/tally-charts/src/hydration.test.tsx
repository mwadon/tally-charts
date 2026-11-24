import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { act, version } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import {
  CrewHours,
  CrewQuarters,
  JobMargins,
  LastTwelveWeeks,
  LeadFunnel,
  LeadFunnelBySource,
  MonthlyCost,
  RemodelSchedule,
  RevenueByLine,
  RevenueTreemap,
} from '../test/fixtures'
import { thresholds } from './core/thresholds'
import { treemapLayout } from './core/treemap'
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

  it.each([
    ['one stream', LeadFunnel, 1],
    ['series', LeadFunnelBySource, 4],
  ] as const)(
    'hydrates FunnelChart (%s) server markup without mismatches',
    async (_, Example, areas) => {
      const html = renderToString(<Example />)
      const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
      const container = document.createElement('div')
      container.innerHTML = html
      expect(container.querySelectorAll('[data-ch-part="funnel-area"]')).toHaveLength(areas)
      document.body.appendChild(container)
      const onRecoverableError = vi.fn()
      let root: ReturnType<typeof hydrateRoot> | undefined
      await act(async () => {
        root = hydrateRoot(container, <Example />, { onRecoverableError })
      })
      expect(onRecoverableError).not.toHaveBeenCalled()
      expect(errors).not.toHaveBeenCalled()
      expect(container.querySelectorAll('[data-ch-part="funnel-area"]')).toHaveLength(areas)
      await act(async () => {
        root?.unmount()
      })
      container.remove()
      errors.mockRestore()
    },
  )

  // Rendered horizontal at 640 px on the server; the 320 px container switches it to vertical
  // after hydration, not during it.
  it('hydrates a FunnelChart rendered wide into a narrow container, then turns vertical', async () => {
    const html = renderToString(<LeadFunnel initialWidth={640} />)
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    const rect = vi
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockReturnValue({ width: 320 } as DOMRect)
    const container = document.createElement('div')
    container.innerHTML = html
    const orientation = () =>
      container.querySelector('[data-ch-orientation]')?.getAttribute('data-ch-orientation')
    expect(orientation()).toBe('horizontal')
    document.body.appendChild(container)
    const onRecoverableError = vi.fn()
    let root: ReturnType<typeof hydrateRoot> | undefined
    await act(async () => {
      root = hydrateRoot(container, <LeadFunnel initialWidth={640} />, { onRecoverableError })
    })
    expect(onRecoverableError).not.toHaveBeenCalled()
    expect(errors).not.toHaveBeenCalled()
    expect(orientation()).toBe('vertical')
    expect(container.querySelector('svg')?.getAttribute('width')).toBe('320')
    await act(async () => {
      root?.unmount()
    })
    container.remove()
    rect.mockRestore()
    errors.mockRestore()
  })

  it('hydrates DonutChart server markup without mismatches', async () => {
    const html = renderToString(<RevenueByLine />)
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    const container = document.createElement('div')
    container.innerHTML = html
    expect(container.querySelectorAll('[data-ch-part="donut-slice"]')).toHaveLength(5)
    document.body.appendChild(container)
    const onRecoverableError = vi.fn()
    let root: ReturnType<typeof hydrateRoot> | undefined
    await act(async () => {
      root = hydrateRoot(container, <RevenueByLine />, { onRecoverableError })
    })
    expect(onRecoverableError).not.toHaveBeenCalled()
    expect(errors).not.toHaveBeenCalled()
    expect(container.querySelectorAll('[data-ch-part="donut-slice"]')).toHaveLength(5)
    await act(async () => {
      root?.unmount()
    })
    container.remove()
    errors.mockRestore()
  })

  // Rendered with the list on the right at 640 px on the server; the 320 px container moves it
  // under the ring after hydration, not during it.
  it('hydrates a DonutChart rendered wide into a narrow container, then moves the list under the ring', async () => {
    const html = renderToString(<RevenueByLine initialWidth={640} />)
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    const rect = vi
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockReturnValue({ width: 320 } as DOMRect)
    const container = document.createElement('div')
    container.innerHTML = html
    const layout = () => container.querySelector('[data-ch-layout]')?.getAttribute('data-ch-layout')
    expect(layout()).toBe('right')
    document.body.appendChild(container)
    const onRecoverableError = vi.fn()
    let root: ReturnType<typeof hydrateRoot> | undefined
    await act(async () => {
      root = hydrateRoot(container, <RevenueByLine initialWidth={640} />, { onRecoverableError })
    })
    expect(onRecoverableError).not.toHaveBeenCalled()
    expect(errors).not.toHaveBeenCalled()
    expect(layout()).toBe('bottom')
    expect(container.querySelector('svg')?.getAttribute('width')).toBe('320')
    await act(async () => {
      root?.unmount()
    })
    container.remove()
    rect.mockRestore()
    errors.mockRestore()
  })

  // Measured at the 640 px of the server render, so the labels, key and now line stay drawn after
  // hydration too (jsdom measures 0 otherwise).
  it('hydrates GanttChart server markup with its value labels, key and now line without mismatches', async () => {
    const html = renderToString(<RemodelSchedule />)
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    const rect = vi
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockReturnValue({ width: 640 } as DOMRect)
    const container = document.createElement('div')
    container.innerHTML = html
    const count = (part: string) => container.querySelectorAll(`[data-ch-part="${part}"]`).length
    const drawn = () => ({
      rows: count('gantt-row'),
      values: count('gantt-value'),
      key: count('gantt-key-item'),
      now: count('gantt-now'),
      nowLabel: count('gantt-now-label'),
    })
    const expected = { rows: 13, values: 13, key: 5, now: 1, nowLabel: 1 }
    expect(drawn()).toEqual(expected)
    document.body.appendChild(container)
    const onRecoverableError = vi.fn()
    let root: ReturnType<typeof hydrateRoot> | undefined
    await act(async () => {
      root = hydrateRoot(container, <RemodelSchedule />, { onRecoverableError })
    })
    expect(onRecoverableError).not.toHaveBeenCalled()
    expect(errors).not.toHaveBeenCalled()
    expect(drawn()).toEqual(expected)
    await act(async () => {
      root?.unmount()
    })
    container.remove()
    rect.mockRestore()
    errors.mockRestore()
  })

  // Names left of the bars at 640 px on the server; the 320 px container moves them above the
  // bars after hydration, not during it.
  it('hydrates a GanttChart rendered wide into a narrow container, then moves the names on top', async () => {
    const html = renderToString(<RemodelSchedule initialWidth={640} />)
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    const rect = vi
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockReturnValue({ width: 320 } as DOMRect)
    const container = document.createElement('div')
    container.innerHTML = html
    const labels = () => container.querySelector('[data-ch-labels]')?.getAttribute('data-ch-labels')
    expect(labels()).toBe('left')
    document.body.appendChild(container)
    const onRecoverableError = vi.fn()
    let root: ReturnType<typeof hydrateRoot> | undefined
    await act(async () => {
      root = hydrateRoot(container, <RemodelSchedule initialWidth={640} />, { onRecoverableError })
    })
    expect(onRecoverableError).not.toHaveBeenCalled()
    expect(errors).not.toHaveBeenCalled()
    expect(labels()).toBe('top')
    expect(container.querySelector('svg')?.getAttribute('width')).toBe('320')
    await act(async () => {
      root?.unmount()
    })
    container.remove()
    rect.mockRestore()
    errors.mockRestore()
  })

  const TREEMAP_VALUES = [
    [412, 286, 148, 96],
    [188, 142, 96, 54],
    [164, 82, 48],
    [86, 38],
  ]
  const tileStyles = (container: HTMLElement) =>
    [...container.querySelectorAll<HTMLElement>('[data-ch-part="treemap-tile"]')].map((t) =>
      [t.style.left, t.style.top, t.style.width, t.style.height].join(' '),
    )
  const layoutStyles = (width: number) => {
    const px = (n: number) => `${Math.round(n * 100) / 100}px`
    return treemapLayout(TREEMAP_VALUES, width, 480, true)
      .flatMap((g) => g.tiles)
      .map((r) => [px(r.x), px(r.y), px(r.width), px(r.height)].join(' '))
  }

  // Measured at the 640 px of the server render, so nothing moves.
  it('hydrates Treemap server markup without mismatches', async () => {
    const html = renderToString(<RevenueTreemap />)
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    const rect = vi
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockReturnValue({ width: 640 } as DOMRect)
    const container = document.createElement('div')
    container.innerHTML = html
    expect(container.querySelectorAll('[role="option"]')).toHaveLength(13)
    document.body.appendChild(container)
    const onRecoverableError = vi.fn()
    let root: ReturnType<typeof hydrateRoot> | undefined
    await act(async () => {
      root = hydrateRoot(container, <RevenueTreemap />, { onRecoverableError })
    })
    expect(onRecoverableError).not.toHaveBeenCalled()
    expect(errors).not.toHaveBeenCalled()
    expect(tileStyles(container)).toEqual(layoutStyles(640))
    await act(async () => {
      root?.unmount()
    })
    container.remove()
    rect.mockRestore()
    errors.mockRestore()
  })

  // Laid out at 1024 px on the server; the 375 px container lays the tiles out again after
  // hydration, not during it.
  it('hydrates a Treemap rendered wide into a narrow container, then lays it out again', async () => {
    const html = renderToString(<RevenueTreemap initialWidth={1024} />)
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    const rect = vi
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockReturnValue({ width: 375 } as DOMRect)
    const container = document.createElement('div')
    container.innerHTML = html
    expect(tileStyles(container)).toEqual(layoutStyles(1024))
    document.body.appendChild(container)
    const onRecoverableError = vi.fn()
    let root: ReturnType<typeof hydrateRoot> | undefined
    await act(async () => {
      root = hydrateRoot(container, <RevenueTreemap initialWidth={1024} />, {
        onRecoverableError,
      })
    })
    expect(onRecoverableError).not.toHaveBeenCalled()
    expect(errors).not.toHaveBeenCalled()
    expect(tileStyles(container)).toEqual(layoutStyles(375))
    expect(container.querySelectorAll('[role="option"]')).toHaveLength(13)
    await act(async () => {
      root?.unmount()
    })
    container.remove()
    rect.mockRestore()
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
