import { render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import line from '../../content/line-chart.json'
import { EditorSwitch } from './editor-switch'

afterEach(() => {
  history.replaceState(null, '', '/')
  vi.restoreAllMocks()
})

const tree = line.componentTree as never

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

  expect(await screen.findByRole('heading', { level: 2, name: /^Props/ })).toBeTruthy()
  expect(container.querySelector('h2#props')).not.toBeNull()
  expect(container.querySelector('.block-error')).toBeNull()
  expect(screen.queryByText('Server content')).toBeNull()
  expect(errors).not.toHaveBeenCalled()
})
