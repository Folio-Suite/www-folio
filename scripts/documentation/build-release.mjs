// SPDX-FileCopyrightText: 2026 the Folio Project
// SPDX-License-Identifier: MIT
import { mkdir, mkdtemp, rm, writeFile, readFile } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { parseArgs } from 'node:util'
import path from 'node:path'
import { sha, json, extractArchive, verifyBundle } from './artifacts.mjs'
const execute = promisify(execFile)
const { values } = parseArgs({
  options: {
    version: { type: 'string' },
    'source-sha256': { type: 'string' },
    'release-sha256': { type: 'string' },
    output: { type: 'string', default: '.cache/documentation/release' },
  },
})
async function build() {
  const version = values.version
  if (
    !/^\d+\.\d+\.\d+$/.test(version) ||
    !/^[a-f0-9]{64}$/.test(values['source-sha256']) ||
    !/^[a-f0-9]{64}$/.test(values['release-sha256'])
  )
    throw new Error('Version and independently reviewed source/release SHA-256 pins are required')
  const output = path.resolve(values.output)
  await mkdir(output, { recursive: true })
  const temporary = await mkdtemp(path.join(output, '.candidate-'))
  try {
    const base = `https://github.com/Folio-Suite/UndoKit/releases/download/${version}/UndoKit-${version}`
    for (const [name, url, expected] of [
      ['original.tar.gz', base + '-documentation.tar.gz', values['source-sha256']],
      ['release.json', base + '-manifest.json', values['release-sha256']],
    ]) {
      const response = await fetch(url, { signal: AbortSignal.timeout(120000) })
      if (!response.ok) throw new Error(`Release download failed: HTTP ${response.status}`)
      const bytes = Buffer.from(await response.arrayBuffer())
      if (sha(bytes) !== expected) throw new Error(`Release checksum mismatch: ${name}`)
      await writeFile(path.join(temporary, name), bytes)
    }
    const original = path.join(temporary, 'original')
    await mkdir(original)
    await extractArchive(path.join(temporary, 'original.tar.gz'), original)
    const archive = path.join(output, `UndoKit-${version}-website.tar.gz`)
    const { stdout } = await execute(
      'ruby',
      [
        'scripts/documentation/package.rb',
        '--artifact',
        original,
        '--release-provenance',
        path.join(temporary, 'release.json'),
        '--output',
        archive,
      ],
      { maxBuffer: 1024 * 1024 },
    )
    const release = await json(path.join(temporary, 'release.json'))
    const entry = {
      version,
      basePath: `/UndoKit/versions/${version}/`,
      sourceCommit: release.sourceCommit,
      releaseManifestSHA256: values['release-sha256'],
      sourceAsset: { url: base + '-documentation.tar.gz', sha256: values['source-sha256'] },
      asset: {
        url: `https://github.com/Folio-Suite/www-folio/releases/download/undokit-docs-${version}-site-v1/UndoKit-${version}-website.tar.gz`,
        sha256: sha(await readFile(archive)),
      },
    }
    const check = path.join(temporary, 'check')
    await mkdir(check)
    await extractArchive(archive, check)
    await verifyBundle(check, entry)
    await writeFile(path.join(output, 'lock-entry.json'), JSON.stringify(entry, null, 2) + '\n', {
      flag: 'wx',
    })
    console.log(stdout.trim())
    console.log(
      'Verified website package and lock-entry.json are ready for immutable release publication.',
    )
  } finally {
    await rm(temporary, { recursive: true, force: true })
  }
}
build().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
