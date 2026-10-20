// SPDX-FileCopyrightText: 2026 the Folio Project
// SPDX-License-Identifier: MIT
import { cp, mkdir, mkdtemp, open, readdir, rename, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { parseArgs } from 'node:util'
import { json, materialize, validateLock } from './documentation/artifacts.mjs'
const { values } = parseArgs({
  options: {
    output: { type: 'string', default: 'public' },
    lockfile: { type: 'string', default: 'src/data/documentation.json' },
    cache: { type: 'string', default: '.cache/documentation/assets' },
    offline: { type: 'boolean', default: false },
  },
})
const output = path.resolve(values.output),
  cache = path.resolve(values.cache)
// DocC's root-hosted renderer owns these paths. Astro owns index.html, favicon.svg,
// /documentation/index.html and all ordinary authored assets outside these names.
const resources = [
  'css',
  'data',
  'downloads',
  'images',
  'img',
  'index',
  'js',
  'videos',
  'metadata.json',
  'theme-settings.json',
  'developer-og-twitter.jpg',
  'developer-og.jpg',
  'favicon.ico',
]
const generated = new Set([...resources, 'documentation', 'UndoKit', '_documentation'])
const escape = (value) =>
  value.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  )
async function redirect(root, relative, target) {
  const filename = path.join(root, relative, 'index.html')
  await mkdir(path.dirname(filename), { recursive: true })
  const canonical = 'https://foliosuite.dev' + target
  await writeFile(
    filename,
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=${escape(target)}"><link rel="canonical" href="${escape(canonical)}"><title>UndoKit documentation</title><script>location.replace(${JSON.stringify(target)}+location.search+location.hash)</script></head><body><a href="${escape(target)}">Continue to UndoKit documentation</a></body></html>\n`,
  )
}
async function prepare() {
  if (
    cache === output ||
    cache.startsWith(output + path.sep) ||
    output.startsWith(cache + path.sep)
  )
    throw new Error('Cache and public output must be separate')
  const lock = await json(values.lockfile)
  validateLock(lock)
  await mkdir(path.dirname(output), { recursive: true })
  const guard = await open(output + '.lock', 'wx')
  const bundles = []
  let working
  const backup = output + '.previous'
  try {
    try {
      await readdir(backup)
      throw new Error('A previous public backup requires inspection')
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
    }
    for (const entry of lock.versions)
      bundles.push({ ...(await materialize(entry, cache, values.offline)), entry })
    const latest = bundles.find((bundle) => bundle.entry.version === lock.latest)
    working = await mkdtemp(path.join(path.dirname(output), '.folio-public-'))
    // Preserve authored public assets, and discard only the explicitly owned generated paths.
    try {
      for (const name of await readdir(output))
        if (!generated.has(name))
          await cp(path.join(output, name), path.join(working, name), {
            recursive: true,
            dereference: false,
          })
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
    }
    const site = path.join(latest.root, 'latest/site')
    const allowed = new Set([...resources, 'documentation', 'index.html', 'favicon.svg'])
    for (const name of await readdir(site))
      if (!allowed.has(name)) throw new Error(`Unrecognized DocC root resource: ${name}`)
    for (const name of [...resources, 'documentation'])
      await cp(path.join(site, name), path.join(working, name), { recursive: true })
    const registry = {
      schemaVersion: 1,
      latest: lock.latest,
      latestBasePath: '/',
      versions: bundles.map((bundle) => bundle.registry),
    }
    const navigation = path.join(working, '_documentation/undokit')
    await cp('src/documentation/assets', navigation, { recursive: true })
    await writeFile(
      path.join(navigation, 'publication.json'),
      JSON.stringify(registry, null, 2) + '\n',
    )
    for (const bundle of bundles)
      await cp(
        path.join(bundle.root, 'versions', bundle.entry.version, 'site'),
        path.join(working, 'UndoKit/versions', bundle.entry.version),
        { recursive: true },
      )
    for (const route of latest.registry.routes) {
      const target = '/' + route
      await redirect(working, path.join('UndoKit', route), target)
      await redirect(working, path.join('UndoKit/latest', route), target)
    }
    await redirect(working, 'UndoKit', '/documentation/undokit/')
    await redirect(working, 'UndoKit/latest', '/documentation/undokit/')
    // 0.2.0 was an exploratory publication; only 0.2.2 is retained in this first rollout.
    await redirect(working, 'UndoKit/versions/0.2.0', '/documentation/undokit/')
    let moved = false
    try {
      await rename(output, backup)
      moved = true
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
    }
    try {
      await rename(working, output)
      working = undefined
    } catch (error) {
      if (moved) await rename(backup, output)
      throw error
    }
    if (moved) await rm(backup, { recursive: true })
    console.log(
      `Prepared pinned API artifacts: Latest ${lock.latest}; canonical /documentation/undokit/`,
    )
  } finally {
    if (working) await rm(working, { recursive: true, force: true })
    for (const bundle of bundles) await rm(bundle.root, { recursive: true, force: true })
    await guard.close()
    await rm(output + '.lock', { force: true })
  }
}
prepare().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
