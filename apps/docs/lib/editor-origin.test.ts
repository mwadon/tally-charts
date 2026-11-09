import { afterEach, expect, test, vi } from 'vitest'
import { editorOrigins, parseEditorOrigins } from './editor-origin'

afterEach(() => vi.unstubAllEnvs())

test('unset or empty is no origin', () => {
  expect(parseEditorOrigins(undefined)).toEqual([])
  expect(parseEditorOrigins('')).toEqual([])
  expect(parseEditorOrigins(' , ')).toEqual([])
})

test('one origin or a comma-separated list, normalized to scheme://host[:port]', () => {
  expect(parseEditorOrigins('https://cms.example.com')).toEqual(['https://cms.example.com'])
  expect(parseEditorOrigins(' https://cms.example.com/ , http://localhost:4000/admin ')).toEqual([
    'https://cms.example.com',
    'http://localhost:4000',
  ])
  expect(parseEditorOrigins('https://CMS.example.com:443,https://cms.example.com')).toEqual([
    'https://cms.example.com',
  ])
})

test('anything that is not an http(s) origin is dropped, so it can never reach the CSP', () => {
  expect(
    parseEditorOrigins("*, https://*.example.com, 'none', javascript:alert(1), data:x, cms; x"),
  ).toEqual([])
})

test('editorOrigins reads NEXT_PUBLIC_CMS_EDITOR_ORIGIN', () => {
  vi.stubEnv('NEXT_PUBLIC_CMS_EDITOR_ORIGIN', 'https://cms.example.com')
  expect(editorOrigins()).toEqual(['https://cms.example.com'])
  vi.stubEnv('NEXT_PUBLIC_CMS_EDITOR_ORIGIN', '')
  expect(editorOrigins()).toEqual([])
})
