import { expect, test } from 'vitest'
import { contrast, formatContrast } from './contrast'

test('black on white is 21:1 and a color on itself is 1:1', () => {
  expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 5)
  expect(contrast('#24356b', '#24356b')).toBeCloseTo(1, 5)
})

test('the ratio does not depend on the argument order', () => {
  expect(contrast('#24356b', '#fafafa')).toBe(contrast('#fafafa', '#24356b'))
})

test('formatContrast writes two decimals and the :1 suffix', () => {
  expect(formatContrast('#000000', '#ffffff')).toBe('21.00:1')
  expect(formatContrast('#24356b', '#fafafa')).toMatch(/^\d+\.\d{2}:1$/)
})
