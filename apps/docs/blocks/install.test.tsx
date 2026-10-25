import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import { Install, installBlock, installSchema } from './install'
import { parseBlockProps } from './registry'

test('renders the heading and the command with a copy button and a live region', async () => {
  render(await Install({ heading: 'Install', command: 'pnpm add tally-charts' }))

  expect(screen.getByRole('heading', { level: 2, name: 'Install' })).toBeTruthy()
  expect(screen.getByRole('button', { name: /^Copy code/ })).toBeTruthy()
  expect(screen.getByRole('status')).toBeTruthy()
  expect(screen.getByRole('region', { name: 'bash' }).textContent).toBe('pnpm add tally-charts')
  expect(screen.getByText('Terminal')).toBeTruthy()
})

test('the command defaults to npm i tally-charts', async () => {
  expect(installSchema.parse({ heading: 'Install' }).command).toBe('npm i tally-charts')
  expect(installBlock.defaultProps.command).toBe('npm i tally-charts')

  render(await Install({ heading: 'Install' }))
  expect(screen.getByRole('region', { name: 'bash' }).textContent).toBe('npm i tally-charts')
})

test.each([
  ['no heading', { command: 'npm i x' }],
  ['an empty command', { heading: 'Install', command: '' }],
  ['a non-string command', { heading: 'Install', command: 1 }],
])('parseBlockProps rejects %s', (_, bad) => {
  expect(parseBlockProps('install', bad).success).toBe(false)
})
