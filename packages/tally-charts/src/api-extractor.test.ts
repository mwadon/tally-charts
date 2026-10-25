// @vitest-environment node
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { Extractor, ExtractorConfig, type ExtractorMessage } from '@microsoft/api-extractor'
import { afterEach, describe, expect, it } from 'vitest'

const root = path.resolve(import.meta.dirname, '..')
const productionConfig = path.join(root, 'api-extractor.json')

const dirs: string[] = []
afterEach(() => {
  for (const dir of dirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true })
})

/** Runs the production config (`api-extractor.json`) on a fixture entry point in a check run. */
function extract(fixture: string) {
  const entry = path.join(root, 'test', 'api-extractor', fixture, 'index.d.ts')
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'api-extractor-'))
  dirs.push(tmp)
  const report = path.join(tmp, 'api')
  fs.mkdirSync(report)

  const configObject = ExtractorConfig.loadFile(productionConfig)
  const prepared = ExtractorConfig.prepare({
    configObject: {
      ...configObject,
      mainEntryPointFilePath: entry,
      compiler: {
        ...configObject.compiler,
        overrideTsconfig: { ...configObject.compiler?.overrideTsconfig, files: [entry] },
      },
      apiReport: {
        ...configObject.apiReport,
        enabled: true,
        reportFolder: report,
        reportTempFolder: path.join(tmp, 'temp'),
      },
    },
    configObjectFullPath: productionConfig,
    packageJsonFullPath: path.join(root, 'package.json'),
  })
  const messages: ExtractorMessage[] = []
  const result = Extractor.invoke(prepared, {
    // A check run, as api:check does: no report is written back.
    localBuild: false,
    showVerboseMessages: false,
    typescriptCompilerFolder: path.join(root, 'node_modules', 'typescript'),
    messageCallback: (message) => {
      messages.push(message)
      message.handled = true
    },
  })
  return { result, ids: messages.map((message) => message.messageId) }
}

describe('api-extractor config', () => {
  it('reports ae-forgotten-export for an unexported type in a public signature, as an error', () => {
    const { result, ids } = extract('forgotten')
    expect(ids).toContain('ae-forgotten-export')
    expect(result.errorCount).toBeGreaterThan(0)
    expect(result.succeeded).toBe(false)
  })

  it('has no forgotten export or error when every type in the signatures is exported', () => {
    const { result, ids } = extract('ok')
    expect(ids).not.toContain('ae-forgotten-export')
    expect(result.errorCount).toBe(0)
  })
})
