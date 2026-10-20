// SPDX-FileCopyrightText: 2026 the Folio Project
// SPDX-License-Identifier: MIT
// @vitest-environment node
import { afterAll, beforeAll, expect, it } from 'vitest'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { NextRequest } from 'next/server'
import { GET } from '../../src/app/UndoKit/[[...path]]/route'

let root: string
beforeAll(async () => {
  root = await mkdtemp(path.join(tmpdir(), 'folio-docs-http-'))
  process.env.FOLIO_DOCUMENTATION_ROOT = root
  for (const [folder, title] of [
    ['latest', 'Latest 0.2.2'],
    ['versions/0.2.0', 'Archive 0.2.0'],
  ]) {
    await mkdir(path.join(root, folder, 'site/documentation/undokit'), { recursive: true })
    await mkdir(path.join(root, folder, 'site/js'), { recursive: true })
    await writeFile(
      path.join(root, folder, 'site/documentation/undokit/index.html'),
      `<h1>${title}</h1>`,
    )
    await writeFile(path.join(root, folder, 'site/js/app.js'), '/* DocC renderer */')
  }
  await writeFile(path.join(root, 'publication.json'), JSON.stringify({ latest: '0.2.2' }))
})
afterAll(async () => {
  delete process.env.FOLIO_DOCUMENTATION_ROOT
  await rm(root, { recursive: true, force: true })
})
const request = (urlPath: string, host = 'foliosuite.dev') =>
  GET(new NextRequest(`https://${host}/UndoKit/${urlPath}`, { headers: { host } }), {
    params: Promise.resolve({ path: urlPath.split('/').filter(Boolean) }),
  })

it('serves latest and archived deep links with correct asset types', async () => {
  const latest = await request('documentation/undokit/')
  expect(latest.status).toBe(200)
  expect(await latest.text()).toContain('Latest 0.2.2')
  expect(await (await request('versions/0.2.0/documentation/undokit/')).text()).toContain(
    'Archive 0.2.0',
  )
  const asset = await request('js/app.js')
  expect(asset.headers.get('content-type')).toContain('javascript')
  expect((await request('documentation/undokit/missing')).status).toBe(404)
  expect((await request('')).headers.get('location')).toBe(
    'https://foliosuite.dev/UndoKit/documentation/undokit/',
  )
})

it('keeps documentation on Development and refuses private or traversal paths', async () => {
  expect((await request('publication.json', 'foliosuite.app')).status).toBe(404)
  expect((await request('publication.json', 'unknown.test')).status).toBe(421)
  expect((await request('versions/0.2.0/manifest.json')).status).toBe(404)
  expect((await request('..%2Fpublication.json')).status).toBe(404)
  expect((await request('publication.json')).status).toBe(200)
})
