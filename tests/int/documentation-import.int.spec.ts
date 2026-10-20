// SPDX-FileCopyrightText: 2026 the Folio Project
// SPDX-License-Identifier: MIT
import { afterEach, expect, it } from 'vitest'
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  readdirSync,
  statSync,
  rmSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
const roots: string[] = []
afterEach(() => roots.splice(0).forEach((root) => rmSync(root, { recursive: true, force: true })))
const sha = (bytes: string | Buffer) => createHash('sha256').update(bytes).digest('hex')
function tree(root: string): string {
  const entries: string[] = []
  function walk(path: string) {
    for (const name of readdirSync(join(root, path))) {
      const relative = path ? `${path}/${name}` : name
      entries.push(relative)
      if (statSync(join(root, relative)).isDirectory()) walk(relative)
    }
  }
  walk('')
  return sha(
    entries
      .sort()
      .map((path) =>
        statSync(join(root, path)).isDirectory()
          ? `D\0${path}\0`
          : `F\0${path}\0${sha(readFileSync(join(root, path)))}\0`,
      )
      .join(''),
  )
}
function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'folio-import-'))
  roots.push(root)
  const bin = join(root, 'bin')
  mkdirSync(bin)
  writeFileSync(
    join(bin, 'xcrun'),
    `#!/bin/sh
if [ "$1" = "--sdk" ]; then exec /usr/bin/xcrun "$@"; fi
exec /usr/bin/ruby --disable-gems "${join(bin, 'docc.rb')}" "$@"
`,
    { mode: 0o755 },
  )
  writeFileSync(
    join(bin, 'docc.rb'),
    `#!/usr/bin/ruby --disable-gems
require 'fileutils'
if ARGV == ['--find', 'docc']; puts __FILE__; exit; end
if ARGV == ['docc', '--help']; puts 'fixture DocC'; exit; end
exit 1 if ENV['FAIL_TRANSFORM']
out = ARGV[ARGV.index('--output-path')+1]; base = ARGV[ARGV.index('--hosting-base-path')+1]
FileUtils.mkdir_p(out+'/documentation/undokit'); FileUtils.mkdir_p(out+'/js'); FileUtils.mkdir_p(out+'/index'); FileUtils.mkdir_p(out+'/data/documentation')
File.write(out+'/index.html', '<html><head></head><body>root</body></html>')
File.write(out+'/documentation/undokit/index.html', '<html><head><script src="'+base+'/js/app.js"></script></head><body>UndoKit</body></html>')
File.write(out+'/js/app.js', 'app'); File.write(out+'/index/index.json','{"interfaceLanguages":{"swift":[{"path":"/documentation/undokit"}]}}'); File.write(out+'/index/navigator.index','index'); File.write(out+'/data/documentation/undokit.json','{}')
`,
    { mode: 0o755 },
  )
  function candidate(version: string) {
    const artifact = join(root, version)
    mkdirSync(join(artifact, 'archive'), { recursive: true })
    mkdirSync(join(artifact, 'site'))
    writeFileSync(join(artifact, 'archive', 'metadata.json'), '{}')
    writeFileSync(join(artifact, 'site', 'index.html'), '<html>producer export</html>')
    const producer = {
      schemaVersion: 1,
      sourceCommit: 'a'.repeat(40),
      sourceDirty: false,
      toolchain: { xcode: 'Xcode fixture', swift: 'Swift fixture' },
      command: ['xcodebuild', 'docbuild'],
      archiveTreeSHA256: tree(join(artifact, 'archive')),
    }
    writeFileSync(join(artifact, 'producer.json'), JSON.stringify(producer))
    const manifest = {
      schemaVersion: 1,
      version,
      channel: 'release',
      sourceCommit: producer.sourceCommit,
      sourceDirty: false,
      basePath: `/UndoKit/versions/${version}/`,
      toolchain: producer.toolchain,
      archivePath: 'archive',
      sitePath: 'site',
      producerPath: 'producer.json',
      producerCommand: producer.command,
      archiveTreeSHA256: producer.archiveTreeSHA256,
      producerSHA256: sha(readFileSync(join(artifact, 'producer.json'))),
      siteTreeSHA256: tree(join(artifact, 'site')),
    }
    writeFileSync(join(artifact, 'manifest.json'), JSON.stringify(manifest))
    const release = join(root, `${version}-release.json`)
    writeFileSync(
      release,
      JSON.stringify({
        schemaVersion: 1,
        releaseVersion: version,
        sourceCommit: producer.sourceCommit,
        documentation: manifest,
      }),
    )
    return { artifact, release }
  }
  const output = join(root, 'published')
  function run(version: string, extraEnv = {}) {
    const input = candidate(version)
    return {
      input,
      result: spawnSync(
        '/usr/bin/ruby',
        [
          '--disable-gems',
          resolve('scripts/documentation/import.rb'),
          '--artifact',
          input.artifact,
          '--release-provenance',
          input.release,
          '--output',
          output,
        ],
        {
          encoding: 'utf8',
          timeout: 15000,
          env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, ...extraEnv },
        },
      ),
    }
  }
  return { root, output, run, candidate, bin }
}
it('imports a bound release and publishes latest with provenance and website navigation', () => {
  const f = fixture()
  const { result } = f.run('1.2.3')
  expect(result.stderr).toBe('')
  expect(result.status).toBe(0)
  const registry = JSON.parse(readFileSync(join(f.output, 'publication.json'), 'utf8'))
  expect(registry.latest).toBe('1.2.3')
  expect(registry.versions[0].routes).toContain('documentation/undokit/')
  expect(
    readFileSync(join(f.output, 'latest/site/documentation/undokit/index.html'), 'utf8'),
  ).toContain('/UndoKit/_folio/selector.js')
  expect(readFileSync(join(f.output, 'latest/site/index.html'), 'utf8')).toContain(
    '/UndoKit/documentation/undokit/',
  )
  expect(
    JSON.parse(readFileSync(join(f.output, 'versions/1.2.3/manifest.json'), 'utf8')).website
      .siteTreeSHA256,
  ).toHaveLength(64)
})

it('retains older versions and preserves the published tree when a transform fails', () => {
  const f = fixture()
  expect(f.run('1.2.3').result.status).toBe(0)
  const previous = readFileSync(join(f.output, 'versions/1.2.3/site/index.html'), 'utf8')
  expect(f.run('1.2.4').result.status).toBe(0)
  expect(readFileSync(join(f.output, 'versions/1.2.3/site/index.html'), 'utf8')).toBe(previous)
  const before = tree(f.output)
  const failed = f.run('1.2.5', { FAIL_TRANSFORM: '1' })
  expect(failed.result.status).toBe(1)
  expect(tree(f.output)).toBe(before)
})

it('rejects tampered source bytes, unbound release identity, and version replacement', () => {
  const f = fixture()
  expect(f.run('1.2.3').result.status).toBe(0)
  const before = tree(f.output)
  const input = f.candidate('1.2.4')
  const run = () =>
    spawnSync(
      '/usr/bin/ruby',
      [
        '--disable-gems',
        resolve('scripts/documentation/import.rb'),
        '--artifact',
        input.artifact,
        '--release-provenance',
        input.release,
        '--output',
        f.output,
      ],
      {
        encoding: 'utf8',
        timeout: 15000,
        env: { ...process.env, PATH: `${f.bin}:${process.env.PATH}` },
      },
    )
  writeFileSync(join(input.artifact, 'archive/metadata.json'), 'tampered')
  expect(run().stderr).toContain('archive checksum mismatch')
  writeFileSync(join(input.artifact, 'archive/metadata.json'), '{}')
  const release = JSON.parse(readFileSync(input.release, 'utf8'))
  release.documentation.sourceCommit = 'b'.repeat(40)
  writeFileSync(input.release, JSON.stringify(release))
  expect(run().stderr).toContain('release manifest does not bind')
  const duplicate = spawnSync(
    '/usr/bin/ruby',
    [
      '--disable-gems',
      resolve('scripts/documentation/import.rb'),
      '--artifact',
      join(f.root, '1.2.3'),
      '--release-provenance',
      join(f.root, '1.2.3-release.json'),
      '--output',
      f.output,
    ],
    { encoding: 'utf8' },
  )
  expect(duplicate.stderr).toContain('immutable')
  expect(tree(f.output)).toBe(before)
})
