// SPDX-FileCopyrightText: 2026 the Folio Project
// SPDX-License-Identifier: MIT
import { afterEach, expect, it } from 'vitest'
import { mkdtempSync, readFileSync, existsSync, rmSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
const roots: string[] = []
afterEach(() => roots.splice(0).forEach((root) => rmSync(root, { recursive: true, force: true })))
it('exports latest and numbered docs as ordinary static files while preserving prior output on invalid input', () => {
  const temp = mkdtempSync(join(tmpdir(), 'folio-static-'))
  roots.push(temp)
  const output = join(temp, 'public')
  const run = (...extra: string[]) =>
    spawnSync(
      process.execPath,
      [resolve('scripts/prepare-public.mjs'), '--output', output, ...extra],
      { encoding: 'utf8', timeout: 60000 },
    )
  const result = run()
  expect(result.stderr).toBe('')
  expect(result.status).toBe(0)
  expect(readFileSync(join(output, 'CNAME'), 'utf8').trim()).toBe('foliosuite.dev')
  expect(existsSync(join(output, 'UndoKit/documentation/undokit/index.html'))).toBe(true)
  expect(existsSync(join(output, 'UndoKit/versions/0.2.0/documentation/undokit/index.html'))).toBe(
    true,
  )
  expect(existsSync(join(output, 'UndoKit/versions/0.2.0/original'))).toBe(false)
  expect(readFileSync(join(output, 'UndoKit/_folio/selector.js'), 'utf8')).toContain(
    'Documentation versions',
  )
  expect(readFileSync(join(output, 'UndoKit/latest/index.html'), 'utf8')).toContain('/UndoKit/')
  const previous = readFileSync(join(output, 'UndoKit/publication.json'), 'utf8')
  const broken = join(temp, 'broken')
  mkdirSync(broken)
  writeFileSync(
    join(broken, 'publication.json'),
    JSON.stringify({ schemaVersion: 1, latest: '9.9.9', versions: [] }),
  )
  expect(run('--documentation-root', broken).status).toBe(1)
  expect(readFileSync(join(output, 'UndoKit/publication.json'), 'utf8')).toBe(previous)
  writeFileSync(join(broken, 'publication.json'), previous)
  mkdirSync(join(broken, 'latest/site'), { recursive: true })
  writeFileSync(
    join(broken, 'latest/manifest.json'),
    readFileSync('documentation/undokit/latest/manifest.json'),
  )
  writeFileSync(join(broken, 'latest/site/index.html'), 'Altered snapshot')
  const tampered = run('--documentation-root', broken)
  expect(tampered.stderr).toContain('Documentation identity mismatch')
  expect(readFileSync(join(output, 'UndoKit/publication.json'), 'utf8')).toBe(previous)
}, 30000)
