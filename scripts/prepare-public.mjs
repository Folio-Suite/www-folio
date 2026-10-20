// SPDX-FileCopyrightText: 2026 the Folio Project
// SPDX-License-Identifier: MIT
import {
  cp,
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
import path from 'node:path'
import { parseArgs } from 'node:util'

const { values } = parseArgs({
  options: {
    output: { type: 'string', default: '.generated-public' },
    'documentation-root': { type: 'string', default: 'documentation/undokit' },
  },
})
const output = path.resolve(values.output),
  docs = path.resolve(values['documentation-root'])
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex')
async function treeHash(root) {
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
  )) {
    hash.update(
      entry.directory
        ? `D\0${entry.relative}\0`
        : `F\0${entry.relative}\0${sha(await readFile(entry.full))}\0`,
    )
  }
  return hash.digest('hex')
}
const json = async (file) => JSON.parse(await readFile(file, 'utf8'))
async function prepare() {
  if (output === docs || output.startsWith(docs + path.sep) || docs.startsWith(output + path.sep))
    throw new Error('Output and retained documentation must be separate')
  const registry = await json(path.join(docs, 'publication.json'))
  if (
    registry.schemaVersion !== 1 ||
    !Array.isArray(registry.versions) ||
    !registry.versions.some((v) => v.version === registry.latest)
  )
    throw new Error('Invalid documentation registry or latest version')
  const versions = new Set()
  const sites = [{ folder: 'latest', mount: '/UndoKit/', version: registry.latest }]
  for (const entry of registry.versions) {
    if (
      !/^\d+\.\d+\.\d+$/.test(entry.version) ||
      versions.has(entry.version) ||
      entry.basePath !== `/UndoKit/versions/${entry.version}/` ||
      !Array.isArray(entry.routes)
    )
      throw new Error('Invalid or duplicate version')
    versions.add(entry.version)
    sites.push({
      folder: `versions/${entry.version}`,
      mount: `/UndoKit/versions/${entry.version}/`,
      version: entry.version,
    })
  }
  // Verify every input before touching the previous public export.
  for (const site of sites) {
    const manifest = await json(path.join(docs, site.folder, 'manifest.json'))
    site.expectedHash = manifest.website.siteTreeSHA256
    if (
      manifest.producerManifest.version !== site.version ||
      manifest.website.basePath !== site.mount ||
      (await treeHash(path.join(docs, site.folder, 'site'))) !== manifest.website.siteTreeSHA256
    )
      throw new Error(`Documentation identity mismatch: ${site.folder}`)
  }
  await mkdir(path.dirname(output), { recursive: true })
  const lock = await open(output + '.lock', 'wx')
  let working
  const backup = output + '.previous'
  try {
    try {
      await lstat(backup)
      throw new Error('A previous export backup needs inspection')
    } catch (e) {
      if (e.code !== 'ENOENT') throw e
    }
    working = await mkdtemp(path.join(path.dirname(output), '.folio-public-'))
    await cp('static', working, { recursive: true })
    const destination = path.join(working, 'UndoKit')
    await cp(path.join(docs, 'latest/site'), destination, { recursive: true })
    if ((await treeHash(destination)) !== sites[0].expectedHash)
      throw new Error('Latest changed during export')
    for (const site of sites.slice(1)) {
      const target = path.join(destination, site.folder)
      await cp(path.join(docs, site.folder, 'site'), target, { recursive: true })
      if ((await treeHash(target)) !== site.expectedHash)
        throw new Error(`Snapshot changed during export: ${site.version}`)
    }
    await writeFile(
      path.join(destination, 'publication.json'),
      JSON.stringify(registry, null, 2) + '\n',
    )
    await cp('src/documentation/assets', path.join(destination, '_folio'), { recursive: true })
    await mkdir(path.join(destination, 'latest'))
    await writeFile(
      path.join(destination, 'latest/index.html'),
      '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=/UndoKit/"><title>Latest UndoKit documentation</title><link rel="canonical" href="https://foliosuite.dev/UndoKit/"></head><body><a href="/UndoKit/">Latest UndoKit documentation</a></body></html>\n',
    )
    let moved = false
    try {
      await rename(output, backup)
      moved = true
    } catch (e) {
      if (e.code !== 'ENOENT') throw e
    }
    try {
      await rename(working, output)
      working = undefined
    } catch (e) {
      if (moved) await rename(backup, output)
      throw e
    }
    if (moved) await rm(backup, { recursive: true })
    console.log(
      `Static API documentation prepared: latest ${registry.latest}, ${versions.size} retained versions`,
    )
  } finally {
    if (working) await rm(working, { recursive: true, force: true })
    await lock.close()
    await rm(output + '.lock', { force: true })
  }
}
prepare().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
