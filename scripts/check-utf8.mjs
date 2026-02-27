import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const textExtensions = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.vue',
  '.json',
  '.md',
  '.css',
  '.less',
  '.html',
  '.yml',
  '.yaml',
  '.d.ts',
])

const ignoreDirs = new Set([
  '.git',
  'node_modules',
  'dist',
  'coverage',
  '.pnpm-store',
])

const decoder = new TextDecoder('utf-8', { fatal: true })
const problems = []

const walk = (dir) => {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    if (ignoreDirs.has(entry.name)) {
      continue
    }

    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      walk(fullPath)
      continue
    }

    const ext = path.extname(entry.name)
    if (!textExtensions.has(ext) && entry.name !== '.editorconfig' && entry.name !== '.gitattributes') {
      continue
    }

    const buffer = fs.readFileSync(fullPath)

    // UTF-8 BOM should be avoided to keep toolchains consistent.
    if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
      problems.push(`${path.relative(root, fullPath)}: contains UTF-8 BOM`)
      continue
    }

    try {
      decoder.decode(buffer)
    } catch {
      problems.push(`${path.relative(root, fullPath)}: invalid UTF-8 bytes`)
    }
  }
}

walk(root)

if (problems.length > 0) {
  console.error('UTF-8 check failed:')
  for (const problem of problems) {
    console.error(`- ${problem}`)
  }
  process.exit(1)
}

console.log('UTF-8 check passed.')
