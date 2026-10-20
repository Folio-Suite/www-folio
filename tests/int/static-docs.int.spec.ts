// SPDX-FileCopyrightText: 2026 the Folio Project
// SPDX-License-Identifier: MIT
import { afterEach, expect, it } from 'vitest'
import { mkdtempSync, readFileSync, existsSync, rmSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
const roots: string[] = []
afterEach(() => roots.splice(0).forEach((root) => rmSync(root, { recursive: true, force: true })))
it('fetches pinned release documentation, preserves ordinary public assets and previous output on invalid input', () => {
  const temp = mkdtempSync(join(tmpdir(), 'folio-artifact-'))
  roots.push(temp)
  const output = join(temp, 'public')
  mkdirSync(output)
  writeFileSync(join(output, 'keep.txt'), 'ordinary public asset')
  const run = (...extra: string[]) =>
    spawnSync(
      process.execPath,
      [resolve('scripts/prepare-public.mjs'), '--output', output, ...extra],
      { encoding: 'utf8', timeout: 120000 },
    )
  const result = run('--lockfile', resolve('src/data/documentation.json'))
  expect(result.stderr).toBe('')
  expect(result.status).toBe(0)
  expect(readFileSync(join(output, 'keep.txt'), 'utf8')).toBe('ordinary public asset')
  expect(existsSync(join(output, 'documentation/undokit/index.html'))).toBe(true)
  expect(existsSync(join(output, 'UndoKit/versions/0.2.2/documentation/undokit/index.html'))).toBe(
    true,
  )
  expect(existsSync(join(output, 'UndoKit/versions/0.2.0/documentation/undokit/index.html'))).toBe(
    false,
  )
  expect(existsSync(join(output, 'UndoKit/versions/0.2.2/original'))).toBe(false)
  const registry = join(output, '_documentation/undokit/publication.json')
  const previous = readFileSync(registry, 'utf8')
  const broken = join(temp, 'broken.json')
  writeFileSync(broken, JSON.stringify({ schemaVersion: 2, latest: '9.9.9', versions: [] }))
  expect(run('--lockfile', broken).status).toBe(1)
  expect(readFileSync(registry, 'utf8')).toBe(previous)
  expect(run('--offline').status).toBe(0)
  const corruptCache = join(temp, 'corrupt-cache')
  mkdirSync(corruptCache)
  const pins = JSON.parse(readFileSync('src/data/documentation.json', 'utf8'))
  writeFileSync(join(corruptCache, pins.versions[0].asset.sha256 + '.tar.gz'), 'corrupted download')
  const corrupt = run('--cache', corruptCache, '--offline')
  expect(corrupt.status).toBe(1)
  expect(corrupt.stderr).toContain('Cached artifact checksum mismatch')
  expect(readFileSync(registry, 'utf8')).toBe(previous)
  const missing = run('--cache', join(temp, 'empty-cache'), '--offline')
  expect(missing.status).toBe(1)
  expect(missing.stderr).toContain('Offline cache miss')
  expect(readFileSync(registry, 'utf8')).toBe(previous)
}, 120000)
