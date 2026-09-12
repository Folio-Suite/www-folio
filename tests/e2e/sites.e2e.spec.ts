import { test, expect } from '@playwright/test'

test('public domains choose their own home and reject unknown hosts', async ({ request }) => {
  const product = await request.get('http://localhost:3000/', {
    headers: { host: 'foliosuite.app' },
  })
  expect(product.status()).toBe(200)
  expect(await product.text()).toContain('<title>Folio Suite</title>')
  const development = await request.get('http://localhost:3000/', {
    headers: { host: 'foliosuite.dev' },
  })
  expect(development.status()).toBe(200)
  expect(await development.text()).toContain('<title>Folio Suite Development</title>')
  const unknown = await request.get('http://localhost:3000/', {
    headers: { host: 'unrelated.example' },
  })
  expect(unknown.status()).toBe(421)
})

test('same-slug pages stay separate across domains and draft content stays private', async ({
  request,
}) => {
  const { getPayload } = await import('payload')
  const { default: config } = await import('../../src/payload.config')
  const payload = await getPayload({ config, key: 'sites-pages' })
  const context = { disableRevalidate: true }
  const ids: number[] = []
  try {
    for (const [site, title] of [
      ['product', 'Product overview'],
      ['development', 'Development overview'],
    ] as const) {
      const data = {
        site,
        title,
        slug: 'site-overview',
        hero: { type: 'none' as const },
        layout: [{ blockType: 'content' as const, columns: [] }],
        _status: 'published' as const,
      }
      ids.push((await payload.create({ collection: 'pages', context, data })).id)
    }
    const hidden = await payload.create({
      collection: 'pages',
      context,
      data: {
        ...{ site: 'development' },
        title: 'Private specification',
        slug: 'private-spec',
        hero: { type: 'none' },
        layout: [{ blockType: 'content' as const, columns: [] }],
        _status: 'draft',
      },
    })
    ids.push(hidden.id)
    for (const [host, title, other] of [
      ['foliosuite.app', 'Product overview', 'Development overview'],
      ['foliosuite.dev', 'Development overview', 'Product overview'],
      ['foliosuite.app', 'Product overview', 'Development overview'],
    ]) {
      const response = await request.get('http://localhost:3000/site-overview', {
        headers: { host },
      })
      expect(response.status()).toBe(200)
      const html = await response.text()
      expect(html).toContain(`<title>${title} | Folio Suite`)
      expect(html).not.toContain(other)
      expect(html).toContain(`href="https://${host}/site-overview"`)
    }
    expect(
      (
        await request.get('http://localhost:3000/private-spec', {
          headers: { host: 'foliosuite.dev' },
        })
      ).status(),
    ).toBe(404)
    const publicAPI = await request.get(
      'http://localhost:3000/api/pages?depth=0&where[slug][equals]=site-overview',
      { headers: { host: 'foliosuite.dev' } },
    )
    expect((await publicAPI.json()).docs.map((doc: { title: string }) => doc.title)).toEqual([
      'Development overview',
    ])
  } finally {
    for (const id of ids) await payload.delete({ collection: 'pages', id, context })
    await payload.destroy()
  }
})

test('navigation, cross-site links and sitemaps follow the selected audience', async ({
  page,
  request,
}) => {
  const { getPayload } = await import('payload')
  const { default: config } = await import('../../src/payload.config')
  const payload = await getPayload({ config, key: 'sites-navigation' })
  const context = { disableRevalidate: true }
  const original = await payload.findGlobal({ slug: 'header', depth: 0 })
  const editor = await payload.create({
    collection: 'users',
    data: { email: 'navigation-editor@example.test', password: 'navigation-test-only' },
  })
  await page.request.post('http://localhost:3000/api/users/login', {
    data: { email: editor.email, password: 'navigation-test-only' },
  })
  const ids: number[] = []
  try {
    for (const site of ['product', 'development'] as const) {
      ids.push(
        (
          await payload.create({
            collection: 'pages',
            context,
            data: {
              site,
              title: `${site} navigation`,
              slug: `navigation-${site}`,
              hero: { type: 'none' },
              layout: [{ blockType: 'content', columns: [] }],
              _status: 'published',
            },
          })
        ).id,
      )
    }
    const data = {
      navItems: [
        {
          link: {
            type: 'reference' as const,
            label: 'Product guide',
            reference: { relationTo: 'pages' as const, value: ids[0] },
          },
        },
      ],
      developmentNavItems: [
        {
          link: {
            type: 'reference' as const,
            label: 'Developer guide',
            reference: { relationTo: 'pages' as const, value: ids[1] },
          },
        },
        {
          link: {
            type: 'reference' as const,
            label: 'Product home',
            reference: { relationTo: 'pages' as const, value: ids[0] },
          },
        },
      ],
    }
    expect(
      (await page.request.post('http://localhost:3000/api/globals/header', { data })).status(),
    ).toBe(200)
    await page.goto('http://localhost:3000/?site=development')
    await expect(page.getByRole('link', { name: 'Developer guide', exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Product guide', exact: true })).toHaveCount(0)
    await page.getByRole('link', { name: 'Developer guide', exact: true }).click()
    await expect(page).toHaveTitle('development navigation | Folio Suite Development')
    for (const [host, own, other] of [
      ['foliosuite.app', 'navigation-product', 'navigation-development'],
      ['foliosuite.dev', 'navigation-development', 'navigation-product'],
      ['foliosuite.app', 'navigation-product', 'navigation-development'],
    ]) {
      const response = await request.get('http://localhost:3000/pages-sitemap.xml', {
        headers: { host },
      })
      const xml = await response.text()
      expect(xml).toContain(`https://${host}/${own}`)
      expect(xml).not.toContain(other)
    }
    const live = await request.get('http://localhost:3000/navigation-development', {
      headers: { host: 'foliosuite.dev' },
    })
    expect(await live.text()).toContain('href="https://foliosuite.app/navigation-product"')
    expect(
      (
        await request.get('http://localhost:3000/sites/development/navigation-development')
      ).status(),
    ).toBe(404)
  } finally {
    await page.request.post('http://localhost:3000/api/globals/header', { data: original })
    await payload.delete({ collection: 'users', id: editor.id })
    for (const id of ids) await payload.delete({ collection: 'pages', id, context })
    await payload.destroy()
  }
})

test('an authenticated editor can preview Development without publishing drafts or borrowing domain cookies', async ({
  page,
  request,
}) => {
  const { getPayload } = await import('payload')
  const { default: config } = await import('../../src/payload.config')
  const payload = await getPayload({ config, key: 'sites-preview' })
  const context = { disableRevalidate: true }
  const password = 'local-site-preview-test'
  const user = await payload.create({
    collection: 'users',
    data: { email: 'site-preview@example.test', password },
  })
  const ids: number[] = []
  try {
    for (const slug of ['preview-development', 'another-private-page']) {
      ids.push(
        (
          await payload.create({
            collection: 'pages',
            context,
            data: {
              site: 'development',
              title: slug,
              slug,
              hero: { type: 'none' },
              layout: [{ blockType: 'content', columns: [] }],
              _status: 'draft',
            },
          })
        ).id,
      )
    }
    const entry = `http://localhost:3000/next/preview?collection=pages&id=${ids[0]}`
    expect((await request.get(entry)).status()).toBe(403)
    const login = await page.request.post('http://localhost:3000/api/users/login', {
      data: { email: user.email, password },
    })
    expect(login.status()).toBe(200)
    await page.goto(`http://localhost:3000/admin/collections/pages/${ids[0]}`)
    await expect(page.getByRole('link', { name: 'Preview', exact: true })).toHaveAttribute(
      'href',
      `/next/preview?collection=pages&id=${ids[0]}`,
    )
    await page.goto(entry)
    await expect(page).toHaveTitle('preview-development | Folio Suite Development')
    await expect(page.getByText('Preview: Development', { exact: true })).toBeVisible()
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
    expect((await page.request.get('http://localhost:3000/another-private-page')).status()).toBe(
      404,
    )
    expect(
      (await request.get('http://localhost:3000/preview-development?site=development')).status(),
    ).toBe(404)
    expect(
      (await request.get('http://localhost:3000/next/preview?token=bad.signature')).status(),
    ).toBe(403)
    const handoff = await page.request.get(entry, {
      headers: { host: 'foliosuite.app' },
      maxRedirects: 0,
    })
    const location = new URL(handoff.headers().location)
    expect(location.origin).toBe('https://foliosuite.dev')
    const separate = await page.context().browser()!.newContext()
    try {
      const redemption = await separate.request.get(
        `http://localhost:3000${location.pathname}${location.search}`,
        { headers: { host: 'foliosuite.dev' }, maxRedirects: 0 },
      )
      expect(redemption.status()).toBe(307)
      expect(redemption.headers().location).toBe('https://foliosuite.dev/preview-development')
      const visible = await separate.request.get('http://localhost:3000/preview-development', {
        headers: { host: 'foliosuite.dev' },
      })
      expect(await visible.text()).toContain('Preview:')
      expect(await visible.text()).toContain('preview-development | Folio Suite Development')
    } finally {
      await separate.close()
    }
    await page.request.get('http://localhost:3000/next/exit-preview')
    expect((await page.request.get('http://localhost:3000/preview-development')).status()).toBe(404)
  } finally {
    for (const id of ids) await payload.delete({ collection: 'pages', id, context })
    await payload.delete({ collection: 'users', id: user.id })
    await payload.destroy()
  }
})
