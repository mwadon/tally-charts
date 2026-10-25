// Generates api.generated.json from the API Extractor doc models (packages/tally-charts/api/*.api.json)
// and the library sources (see CLAUDE.md, `pnpm --filter docs gen`). Plain Node, no dist, no network.
//
// The doc models say which functions are public, in which entry point, and what their parameters
// are called. Types, descriptions and defaults come from the TypeScript checker on src: a props
// type is an alias (`ChartName & Omit<ChartPassThroughProps<D>, 'aspectRatio'> & { … }`), and
// the model has no members for an alias and drops the JSDoc inside it.
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

/** Entry points in the order that decides `package`: model file and source entry file. */
const ENTRY_POINTS = [
  { name: 'tally-charts', model: 'tally-charts.api.json', entry: 'index.ts' },
  { name: 'tally-charts/core', model: 'core.api.json', entry: 'core/index.ts' },
]

const compare = (a, b) => (a < b ? -1 : a > b ? 1 : 0)

function partsText(value) {
  if (value === undefined) return ''
  return typeof value === 'string' ? value : ts.displayPartsToString(value)
}

/** Value after `Default`, `Default:` or `Defaults to` up to the end of its sentence, or null. */
function defaultFromProse(description) {
  const text = description.replace(/\s+/g, ' ')
  const match = /(?:^|[.!?] )Default(?:s to|:)? /.exec(text)
  if (!match) return null
  const start = match.index + match[0].length
  let inCode = false
  let end = text.length
  for (let i = start; i < text.length; i++) {
    const ch = text[i]
    if (ch === '`') inCode = !inCode
    else if (!inCode && '.:;'.includes(ch) && (i + 1 === text.length || text[i + 1] === ' ')) {
      end = i
      break
    }
  }
  return text.slice(start, end).trim() || null
}

/**
 * The default value of a prop: the `@defaultValue` tag if there is one (`tags` are
 * `{ name, text }`, `text` a string or TypeScript display parts), else the first sentence of the
 * description that starts with `Default`, `Default:` or `Defaults to`, else null.
 */
export function parseDefault(description, tags = []) {
  const tag = tags.find((t) => t.name === 'defaultValue')
  const fromTag = tag ? partsText(tag.text).trim() : ''
  return fromTag || defaultFromProse(description)
}

/** `{@link X}` and `{@link X | text}` as plain text. */
function flattenLinks(text) {
  return text.replace(
    /\{@link(?:code|plain)?\s+([^}|\s]+)(?:\s*\|?\s*([^}]*))?\}/g,
    (_, target, label) => label?.trim() || target,
  )
}

const oneLine = (text) => text.replace(/\s+/g, ' ').trim()

function createProgram(srcDir) {
  const configFile = ts.findConfigFile(srcDir, ts.sys.fileExists, 'tsconfig.base.json')
  const options = configFile
    ? ts.parseJsonConfigFileContent(
        ts.readConfigFile(configFile, ts.sys.readFile).config,
        ts.sys,
        path.dirname(configFile),
      ).options
    : {}
  const rootNames = ENTRY_POINTS.map((e) => path.join(srcDir, e.entry))
  return ts.createProgram(rootNames, { ...options, types: [], noEmit: true })
}

/** Function exports of a source entry file: name → the function symbol. */
function functionExports(program, entryFile) {
  const checker = program.getTypeChecker()
  const sourceFile = program.getSourceFile(entryFile)
  const moduleSymbol = sourceFile && checker.getSymbolAtLocation(sourceFile)
  if (!moduleSymbol) throw new Error(`${entryFile}: not a module`)
  const found = new Map()
  for (const exported of checker.getExportsOfModule(moduleSymbol)) {
    const symbol =
      exported.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(exported) : exported
    if (symbol.flags & ts.SymbolFlags.Function) found.set(exported.name, symbol)
  }
  return found
}

function readModelFunctions(modelDir, { model }) {
  const file = path.join(modelDir, model)
  if (!existsSync(file)) {
    throw new Error(`${file}: missing, run pnpm --filter tally-charts api:update`)
  }
  const entryPoint = JSON.parse(readFileSync(file, 'utf8')).members?.[0]
  const found = new Map()
  for (const member of entryPoint?.members ?? []) {
    if (member.kind === 'Function' && !found.has(member.name)) found.set(member.name, member)
  }
  return found
}

/** The `kind` of a public function from its name. */
function kindOf(name) {
  if (/^use[A-Z]/.test(name)) return 'hook'
  return /^[A-Z]/.test(name) ? 'component' : 'function'
}

function typeText(checker, typeNode, fallback) {
  return typeNode ? oneLine(typeNode.getText()) : checker.typeToString(fallback)
}

function tagsOf(symbol, checker) {
  return symbol.getJsDocTags(checker).map((t) => ({ name: t.name, text: partsText(t.text) }))
}

/** The props of a component: every property of the type of its first parameter. */
function readProps(checker, parameter) {
  const type = checker.getTypeAtLocation(parameter.type ?? parameter)
  return checker
    .getPropertiesOfType(type)
    .map((symbol) => {
      const declarations = symbol.declarations ?? []
      const documented = declarations.filter((d) => ts.getJSDocCommentsAndTags(d).length > 0)
      // A union (`ChartName`) lists a prop once per branch: take the branch that documents it.
      const source = documented.find((d) => d.type) ?? declarations.find((d) => d.type)
      const description = flattenLinks(
        ts.displayPartsToString(symbol.getDocumentationComment(checker)),
      )
      return {
        name: symbol.name,
        type: typeText(checker, source?.type, checker.getTypeOfSymbol(symbol)),
        required: !(symbol.flags & ts.SymbolFlags.Optional),
        default: parseDefault(description, tagsOf(symbol, checker)),
        description,
      }
    })
    .sort((a, b) => compare(a.name, b.name))
}

/** `@param` descriptions of a function declaration by parameter name. */
function paramDescriptions(declaration) {
  const found = new Map()
  for (const tag of ts.getJSDocTags(declaration)) {
    if (ts.isJSDocParameterTag(tag)) {
      // `@param spec - text`: TypeScript keeps the hyphen in the comment.
      const text = oneLine(ts.getTextOfJSDocComment(tag.comment) ?? '').replace(/^- /, '')
      found.set(tag.name.getText(), flattenLinks(text))
    }
  }
  return found
}

/** Text of a `@defaultValue` tag written on the parameter itself. */
function defaultValueTag(parameter) {
  const tag = ts.getJSDocTags(parameter).find((t) => t.tagName.text === 'defaultValue')
  return tag ? (ts.getTextOfJSDocComment(tag.comment) ?? '') : ''
}

function readParams(checker, declaration, modelParams) {
  const descriptions = paramDescriptions(declaration)
  return modelParams.map((param, index) => {
    const source = declaration.parameters[index]
    return {
      name: param.parameterName,
      type: typeText(checker, source.type, checker.getTypeAtLocation(source)),
      required: !param.isOptional,
      default: source.initializer
        ? oneLine(source.initializer.getText())
        : parseDefault('', [{ name: 'defaultValue', text: defaultValueTag(source) }]),
      description: descriptions.get(param.parameterName) ?? '',
    }
  })
}

/** Parameters of the model that carry a type: API Extractor also lists a destructured pattern. */
const realParams = (member) =>
  member.parameters.filter(
    (p) => p.parameterTypeTokenRange.endIndex > p.parameterTypeTokenRange.startIndex,
  )

function readSymbol(checker, name, symbol, modelMember, packages) {
  const declaration = symbol.declarations?.find(ts.isFunctionDeclaration)
  if (!declaration) throw new Error(`${name}: no function declaration in src`)
  const kind = kindOf(name)
  const modelParams = realParams(modelMember)
  if (modelParams.length !== declaration.parameters.length) {
    throw new Error(
      `${name}: ${modelParams.length} parameters in the api model, ${declaration.parameters.length} in src, run pnpm --filter tally-charts api:update`,
    )
  }
  const entry = {
    name,
    kind,
    package: packages[0],
    packages,
    description: flattenLinks(ts.displayPartsToString(symbol.getDocumentationComment(checker))),
  }
  if (kind === 'component') {
    const [first] = declaration.parameters
    return { ...entry, props: first ? readProps(checker, first) : [] }
  }
  const signature = checker.getSignatureFromDeclaration(declaration)
  return {
    ...entry,
    params: readParams(checker, declaration, modelParams),
    returns: typeText(checker, declaration.type, checker.getReturnTypeOfSignature(signature)),
  }
}

/**
 * Reads the public API: `{ symbols }` keyed by name, sorted. Throws one Error listing every
 * `symbol: problem` where a model function has no export in src or the other way round.
 */
export function collectApi({ modelDir, srcDir }) {
  const program = createProgram(srcDir)
  const checker = program.getTypeChecker()
  const problems = []
  const bySymbol = new Map()

  for (const entryPoint of ENTRY_POINTS) {
    const modelFunctions = readModelFunctions(modelDir, entryPoint)
    const sourceFunctions = functionExports(program, path.join(srcDir, entryPoint.entry))
    for (const name of [...modelFunctions.keys()].filter((n) => !sourceFunctions.has(n))) {
      problems.push(`${name}: in ${entryPoint.model} but not exported from src/${entryPoint.entry}`)
    }
    for (const name of [...sourceFunctions.keys()].filter((n) => !modelFunctions.has(n))) {
      problems.push(
        `${name}: exported from src/${entryPoint.entry} but not in ${entryPoint.model}, run pnpm --filter tally-charts api:update`,
      )
    }
    for (const [name, symbol] of sourceFunctions) {
      const modelMember = modelFunctions.get(name)
      if (!modelMember) continue
      const known = bySymbol.get(name)
      if (known) known.packages.push(entryPoint.name)
      else bySymbol.set(name, { symbol, modelMember, packages: [entryPoint.name] })
    }
  }
  if (problems.length > 0) throw new Error(problems.sort().join('\n'))

  const symbols = {}
  for (const name of [...bySymbol.keys()].sort(compare)) {
    const { symbol, modelMember, packages } = bySymbol.get(name)
    try {
      symbols[name] = readSymbol(checker, name, symbol, modelMember, packages)
    } catch (error) {
      problems.push(error instanceof Error ? error.message : String(error))
    }
  }
  if (problems.length > 0) throw new Error(problems.join('\n'))
  return { symbols }
}

/** Writes api.generated.json next to the app. Returns whether the file changed. */
export function generate(root = appDir) {
  const output = path.join(root, 'api.generated.json')
  const next = `${JSON.stringify(
    collectApi({
      modelDir: path.join(root, '../../packages/tally-charts/api'),
      srcDir: path.join(root, '../../packages/tally-charts/src'),
    }),
    null,
    2,
  )}\n`
  if (existsSync(output) && readFileSync(output, 'utf8') === next) return false
  writeFileSync(output, next)
  return true
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const changed = generate()
    console.log(changed ? 'gen: wrote api.generated.json' : 'gen: api.generated.json is up to date')
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  }
}
