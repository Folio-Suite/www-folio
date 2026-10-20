// SPDX-FileCopyrightText: 2026 the Folio Project
// SPDX-License-Identifier: MIT
import {
  lstat,
  mkdir,
  mkdtemp,
  open,
  readFile,
  readdir,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import path from 'node:path'
const execute = promisify(execFile)
export const sha = (bytes) => createHash('sha256').update(bytes).digest('hex')
export const json = async (file) => JSON.parse(await readFile(file, 'utf8'))
export async function treeHash(root) {
  const entries = []
  async function walk(folder) {
    for (const name of await readdir(folder)) {
      const full = path.join(folder, name),
        info = await lstat(full)
      if (info.isSymbolicLink()) throw new Error(`Symlink refused: ${full}`)
      entries.push({
        full,
        relative: path.relative(root, full).split(path.sep).join('/'),
        directory: info.isDirectory(),
      })
      if (info.isDirectory()) await walk(full)
      else if (!info.isFile()) throw new Error(`Non-file refused: ${full}`)
    }
  }
  await walk(root)
  const hash = createHash('sha256')
  for (const entry of entries.sort((a, b) =>
    a.relative < b.relative ? -1 : a.relative > b.relative ? 1 : 0,
  ))
    hash.update(
      entry.directory
        ? `D\0${entry.relative}\0`
        : `F\0${entry.relative}\0${sha(await readFile(entry.full))}\0`,
    )
  return hash.digest('hex')
}
export function validateLock(lock) {
  if (
    lock.schemaVersion !== 2 ||
    !Array.isArray(lock.versions) ||
    !lock.versions.length ||
    !lock.versions.some((entry) => entry.version === lock.latest)
  )
    throw new Error('Invalid documentation lock or Latest')
  const seen = new Set()
  for (const entry of lock.versions) {
    if (
      !/^\d+\.\d+\.\d+$/.test(entry.version) ||
      seen.has(entry.version) ||
      entry.basePath !== `/UndoKit/versions/${entry.version}/` ||
      !/^[a-f0-9]{40}$/.test(entry.sourceCommit) ||
      !/^[a-f0-9]{64}$/.test(entry.releaseManifestSHA256) ||
      !/^[a-f0-9]{64}$/.test(entry.asset?.sha256) ||
      !entry.asset.url.startsWith('https://github.com/Folio-Suite/www-folio/releases/download/')
    )
      throw new Error('Invalid documentation release pin')
    seen.add(entry.version)
  }
}
export async function verifyBundle(root, entry) {
  const bundle = await json(path.join(root, 'bundle.json'))
  const base = path.join(root, 'versions', entry.version)
  const releaseFile = path.join(base, 'release-manifest.json')
  const release = await json(releaseFile)
  const original = path.join(base, 'original')
  const producer = await json(path.join(original, 'manifest.json'))
  if (
    bundle.schemaVersion !== 1 ||
    bundle.version !== entry.version ||
    bundle.sourceCommit !== entry.sourceCommit ||
    bundle.releaseManifestSHA256 !== entry.releaseManifestSHA256 ||
    sha(await readFile(releaseFile)) !== entry.releaseManifestSHA256 ||
    release.releaseVersion !== entry.version ||
    release.sourceCommit !== entry.sourceCommit ||
    JSON.stringify(release.documentation) !== JSON.stringify(producer) ||
    producer.sourceDirty !== false ||
    producer.version !== entry.version ||
    producer.sourceCommit !== entry.sourceCommit
  )
    throw new Error('Release provenance mismatch')
  for (const kind of ['archive', 'site'])
    if ((await treeHash(path.join(original, kind))) !== producer[`${kind}TreeSHA256`])
      throw new Error(`Original ${kind} identity mismatch`)
  const producerFile = path.join(original, 'producer.json')
  const identity = await json(producerFile)
  if (
    sha(await readFile(producerFile)) !== producer.producerSHA256 ||
    identity.sourceCommit !== entry.sourceCommit ||
    identity.sourceDirty !== false ||
    identity.archiveTreeSHA256 !== producer.archiveTreeSHA256 ||
    JSON.stringify(identity.toolchain) !== JSON.stringify(producer.toolchain) ||
    JSON.stringify(identity.command) !== JSON.stringify(producer.producerCommand)
  )
    throw new Error('Producer identity mismatch')
  for (const [folder, mount] of [
    ['latest', '/'],
    [`versions/${entry.version}`, entry.basePath],
  ]) {
    const manifest = await json(path.join(root, folder, 'manifest.json'))
    if (
      manifest.releaseManifestSHA256 !== entry.releaseManifestSHA256 ||
      JSON.stringify(manifest.producerManifest) !== JSON.stringify(producer) ||
      manifest.website.basePath !== mount ||
      (await treeHash(path.join(root, folder, 'site'))) !== manifest.website.siteTreeSHA256
    )
      throw new Error(`Website identity mismatch: ${folder}`)
  }
  const registry = await json(path.join(root, 'publication.json'))
  const version = registry.versions.find((value) => value.version === entry.version)
  if (
    !version ||
    version.sourceCommit !== entry.sourceCommit ||
    version.basePath !== entry.basePath ||
    !Array.isArray(version.routes) ||
    version.routes.some(
      (route) =>
        typeof route !== 'string' ||
        route.startsWith('/') ||
        route.includes('..') ||
        route.includes('\\'),
    )
  )
    throw new Error('Invalid topic inventory')
  return version
}
export async function materialize(entry, cache, offline) {
  await mkdir(cache, { recursive: true })
  const root = path.join(cache, entry.asset.sha256)
  const archive = root + '.tar.gz'
  try {
    if (sha(await readFile(archive)) !== entry.asset.sha256)
      throw new Error('Cached artifact checksum mismatch')
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
    if (offline) throw new Error(`Offline cache miss: ${entry.version}`)
    const lock = await open(root + '.lock', 'wx')
    const download = root + '.download'
    try {
      const url = new URL(entry.asset.url)
      const parts = url.pathname.split('/')
      if (
        url.search ||
        url.hash ||
        parts.length !== 7 ||
        !/^undokit-docs-[0-9]+\.[0-9]+\.[0-9]+-site-v[0-9]+$/.test(parts[5]) ||
        parts[6] !== `UndoKit-${entry.version}-website.tar.gz`
      )
        throw new Error('Invalid immutable artifact URL')
      const response = await fetch(entry.asset.url, { signal: AbortSignal.timeout(120000) })
      if (!response.ok) throw new Error(`Artifact download failed: HTTP ${response.status}`)
      const chunks = []
      let size = 0
      for await (const chunk of response.body) {
        size += chunk.length
        if (size > 256 * 1024 * 1024) throw new Error('Artifact exceeds size limit')
        chunks.push(chunk)
      }
      const bytes = Buffer.concat(chunks)
      if (sha(bytes) !== entry.asset.sha256)
        throw new Error('Downloaded artifact checksum mismatch')
      await writeFile(download, bytes, { flag: 'wx' })
      await rename(download, archive)
    } finally {
      await rm(download, { force: true })
      await lock.close()
      await rm(root + '.lock', { force: true })
    }
  }
  // Verify on every use, including warm/offline builds. Never trust extracted cache contents.
  const temporary = await mkdtemp(path.join(cache, '.extract-'))
  try {
    await extractArchive(archive, temporary)
    const registry = await verifyBundle(temporary, entry)
    // The returned tree is private to this invocation; caller removes it after publication.
    return { root: temporary, registry }
  } catch (error) {
    await rm(temporary, { recursive: true, force: true })
    throw error
  }
}

export async function extractArchive(archive, temporary) {
  const { stdout: paths } = await execute('tar', ['-tzf', archive], { maxBuffer: 16 * 1024 * 1024 })
  if (
    paths
      .split('\n')
      .filter(Boolean)
      .some((name) => name.startsWith('/') || name.includes('\\') || name.split('/').includes('..'))
  )
    throw new Error('Unsafe archive path')
  const { stdout: types } = await execute('tar', ['-tvzf', archive], {
    maxBuffer: 16 * 1024 * 1024,
  })
  if (
    types
      .split('\n')
      .filter(Boolean)
      .some((line) => !/^[-d]/.test(line))
  )
    throw new Error('Links and special entries are refused')
  await execute('tar', ['-xzf', archive, '-C', temporary, '--no-same-owner'])
}
