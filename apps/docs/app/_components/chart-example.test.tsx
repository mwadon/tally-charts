import { fireEvent, render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import RevenueForecast, { meta } from '../../examples/line-chart/revenue-forecast'
import { ChartExample } from './chart-example'
import { CodeBlock } from './code-block'

const SOURCE = 'Source of the revenue chart'

function renderExample() {
  return render(
    <ChartExample
      title="Revenue"
      preview={<RevenueForecast />}
      code={<CodeBlock label={SOURCE}>{'<LineChart />'}</CodeBlock>}
    />,
  )
}

test('shows the live chart by default and hides the code', () => {
  renderExample()

  expect(screen.getByRole('application', { name: meta.title })).toBeTruthy()
  expect(screen.queryByRole('region', { name: SOURCE })).toBeNull()
  expect(screen.getByRole('button', { name: 'Preview' }).getAttribute('aria-pressed')).toBe('true')
  expect(screen.getByRole('button', { name: 'Code' }).getAttribute('aria-pressed')).toBe('false')
})

test('clicking Code shows the source and hides the chart, clicking Preview brings it back', () => {
  renderExample()

  fireEvent.click(screen.getByRole('button', { name: 'Code' }))
  expect(screen.getByRole('region', { name: SOURCE }).textContent).toBe('<LineChart />')
  expect(screen.queryByRole('application', { name: meta.title })).toBeNull()
  expect(screen.getByRole('button', { name: 'Code' }).getAttribute('aria-pressed')).toBe('true')
  expect(screen.getByRole('button', { name: 'Preview' }).getAttribute('aria-pressed')).toBe('false')

  fireEvent.click(screen.getByRole('button', { name: 'Preview' }))
  expect(screen.getByRole('application', { name: meta.title })).toBeTruthy()
  expect(screen.queryByRole('region', { name: SOURCE })).toBeNull()
})

test('the toggle is a named group and each button controls an existing panel', () => {
  const { container } = renderExample()

  expect(screen.getByRole('group', { name: 'View of Revenue' })).toBeTruthy()
  for (const name of ['Preview', 'Code']) {
    const id = screen.getByRole('button', { name }).getAttribute('aria-controls')
    expect(container.querySelector(`[id="${id}"]`)).not.toBeNull()
  }
})
