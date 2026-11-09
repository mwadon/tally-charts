import { createMessage, EDITOR_ORIGIN_QUERY_PARAM, EDITOR_QUERY_PARAM } from '@glokki-cms/sdk'
import { act, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import line from '../../content/line-chart.json'
import { EDITOR_ORIGIN_PARAM, EDITOR_PARAM, EditorSwitch } from './editor-switch'

afterEach(() => {
  history.replaceState(null, '', '/')
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

const tree = line.componentTree as never

describe('?_editor=1 with _editorOrigin (the SDK then listens to postMessage from that origin)', () => {
  const self = window.location.origin
  const withOrigin = (origin: string) =>
    history.replaceState(
      null,
      '',
      `/docs/line-chart?_editor=1&_editorOrigin=${encodeURIComponent(origin)}`,
    )
  const treeUpdate = (origin: string) =>
    new MessageEvent('message', {
      origin,
      data: createMessage('tree:update', {
        componentTree: tree,
        selectedBlockId: null,
        viewport: 'desktop',
      }),
    })

  test('the parameter names are the ones the SDK reads', () => {
    expect(EDITOR_PARAM).toBe(EDITOR_QUERY_PARAM)
    expect(EDITOR_ORIGIN_PARAM).toBe(EDITOR_ORIGIN_QUERY_PARAM)
  })

  test.each([
    ['no allowlist', '', 'https://evil.example'],
    ['no allowlist, the own origin', '', self],
    ['another origin allowed', 'https://cms.example.com', 'https://evil.example'],
    ['a prefix of an allowed origin', 'https://cms.example.com', 'https://cms.example'],
    ['an allowed origin with a path', 'https://cms.example.com', 'https://cms.example.com/x'],
  ])(
    '%s: the editor does not mount and a tree:update changes nothing',
    async (_n, allowed, origin) => {
      vi.stubEnv('NEXT_PUBLIC_CMS_EDITOR_ORIGIN', allowed)
      withOrigin(origin)
      const { container } = renderSwitch()

      act(() => {
        window.dispatchEvent(treeUpdate(origin))
      })
      // The canvas is a lazy chunk: give it the time it would need to show up.
      await new Promise((resolve) => setTimeout(resolve, 300))

      expect(screen.getByText('Server content')).toBeTruthy()
      expect(container.querySelector('[data-block-id]')).toBeNull()
    },
  )

  test.each([
    ['the only allowed origin', self],
    ['one of a list', `https://cms.example.com, ${self}`],
  ])(
    '%s: the editor mounts and renders the tree the origin sends',
    async (_n, allowed) => {
      vi.spyOn(console, 'error').mockImplementation(() => {})
      // The SDK measures the rendered tree in editor mode; jsdom has no ResizeObserver.
      vi.stubGlobal(
        'ResizeObserver',
        class {
          observe() {}
          unobserve() {}
          disconnect() {}
        },
      )
      vi.stubEnv('NEXT_PUBLIC_CMS_EDITOR_ORIGIN', allowed)
      withOrigin(self)
      // The window is its own parent here, so the handshake the canvas sends once it has mounted
      // (a lazy chunk) arrives on the same window.
      const handshake = new Promise<void>((resolve) => {
        const onMessage = (event: MessageEvent) => {
          if ((event.data as { type?: string } | null)?.type !== 'handshake:request') return
          window.removeEventListener('message', onMessage)
          resolve()
        }
        window.addEventListener('message', onMessage)
      })
      const { container } = renderSwitch()
      await handshake
      expect(screen.queryByText('Server content')).toBeNull()

      // A message from any other origin is still ignored (the SDK compares event.origin).
      act(() => {
        window.dispatchEvent(treeUpdate('https://evil.example'))
      })
      expect(container.querySelector('[data-block-id]')).toBeNull()

      act(() => {
        window.dispatchEvent(treeUpdate(self))
      })
      await waitFor(
        () =>
          expect(container.querySelectorAll('[data-block-id]')).toHaveLength(
            (tree as unknown[]).length,
          ),
        { timeout: 12_000 },
      )
    },
    30_000,
  )
})

const renderSwitch = () =>
  render(
    <EditorSwitch componentTree={tree} pageSlug="/docs/line-chart">
      <p>Server content</p>
    </EditorSwitch>,
  )

test('without ?_editor=1 it renders the server content', () => {
  const { container } = renderSwitch()

  expect(screen.getByText('Server content')).toBeTruthy()
  expect(container.querySelector('[data-block-id]')).toBeNull()
})

test.each(['?_editor=0', '?_editor=', '?editor=1', '?theme=dark'])(
  '%s is not the editor',
  (query) => {
    history.replaceState(null, '', `/docs/line-chart${query}`)
    renderSwitch()

    expect(screen.getByText('Server content')).toBeTruthy()
  },
)

test('with ?_editor=1 it renders the editor canvas instead of the server content', async () => {
  const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
  history.replaceState(null, '', '/docs/line-chart?_editor=1')
  const { container } = renderSwitch()

  expect(
    await screen.findByRole('heading', { level: 2, name: /^Props/ }, { timeout: 12_000 }),
  ).toBeTruthy()
  expect(container.querySelector('h2#props')).not.toBeNull()
  expect(container.querySelector('.block-error')).toBeNull()
  expect(screen.queryByText('Server content')).toBeNull()
  expect(errors).not.toHaveBeenCalled()
}, 15_000)
