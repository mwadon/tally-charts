import { render } from '@testing-library/react'
import { expect, test } from 'vitest'
import { Prose, proseBlock, proseSchema } from './prose'

test('renders GFM: table, strikethrough and task list', () => {
  const markdown = [
    '| a | b |',
    '| - | - |',
    '| 1 | 2 |',
    '',
    '~~gone~~',
    '',
    '- [x] done',
    '- [ ] todo',
  ].join('\n')
  const { container } = render(<Prose markdown={markdown} />)

  expect(container.querySelector('table')).not.toBeNull()
  expect(container.querySelector('del')?.textContent).toBe('gone')
  const boxes = container.querySelectorAll('input[type="checkbox"]')
  expect(boxes).toHaveLength(2)
  expect((boxes[0] as HTMLInputElement).checked).toBe(true)
})

test('puts a table in a scrollable, focusable region so it cannot widen the page', () => {
  const { container } = render(<Prose markdown={'| a | b |\n| - | - |\n| 1 | 2 |'} />)
  const region = container.querySelector('[role="region"]')
  expect(region?.getAttribute('tabindex')).toBe('0')
  expect(region?.getAttribute('aria-label')).toBe('Table')
  expect(region?.querySelector('table')).not.toBeNull()
})

test('ignores raw HTML: no script, img or onerror in the output', () => {
  const markdown = [
    '<script>alert(1)</script>',
    '',
    '<img src=x onerror=alert(1)>',
    '',
    'text',
  ].join('\n')
  const { container } = render(<Prose markdown={markdown} />)

  expect(container.querySelector('script')).toBeNull()
  expect(container.querySelector('img')).toBeNull()
  expect(container.innerHTML).not.toContain('onerror')
  expect(container.textContent).toContain('text')
})

test('ignores inline raw HTML as well', () => {
  const { container } = render(
    <Prose markdown={'a <script>alert(1)</script> b <img src=x onerror=alert(1)> c'} />,
  )

  expect(container.querySelector('script')).toBeNull()
  expect(container.querySelector('img')).toBeNull()
  expect(container.innerHTML).not.toContain('onerror')
})

test('a javascript: link has no javascript: href', () => {
  const { container } = render(<Prose markdown="[x](javascript:alert(1))" />)

  for (const a of container.querySelectorAll('a'))
    expect(a.getAttribute('href') ?? '').not.toMatch(/^javascript:/i)
})

test('an https link keeps its href', () => {
  const { container } = render(<Prose markdown="[x](https://example.com)" />)

  expect(container.querySelector('a')?.getAttribute('href')).toBe('https://example.com')
})

test('the schema accepts valid props and rejects {} and a non-string markdown', () => {
  expect(proseSchema.safeParse({ markdown: '# hi' }).success).toBe(true)
  expect(proseSchema.safeParse({}).success).toBe(false)
  expect(proseSchema.safeParse({ markdown: 1 }).success).toBe(false)
})

test('the markdown field is a textarea in the CMS', () => {
  expect(proseBlock.fields[0]?.fieldType).toBe('textarea')
})
