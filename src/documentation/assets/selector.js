// SPDX-FileCopyrightText: 2026 the Folio Project
// SPDX-License-Identifier: MIT
;(async function () {
  if (document.getElementById('folio-documentation-nav')) return
  const nav = document.createElement('nav')
  nav.id = 'folio-documentation-nav'
  nav.setAttribute('aria-label', 'Documentation versions')
  const home = document.createElement('a')
  home.href = '/'
  home.textContent = 'Folio Development'
  const label = document.createElement('label')
  label.htmlFor = 'folio-documentation-version'
  label.textContent = 'UndoKit version'
  const select = document.createElement('select')
  select.id = label.htmlFor
  select.disabled = true
  const status = document.createElement('span')
  status.setAttribute('role', 'status')
  nav.append(home, label, select, status)
  document.body.prepend(nav)
  const parameters = new URLSearchParams(location.search)
  if (parameters.get('docc-topic-unavailable') === '1') {
    status.textContent =
      'That topic is unavailable in this version. Showing the documentation home.'
  }
  try {
    const response = await fetch('/_documentation/undokit/publication.json', { cache: 'no-store' })
    if (!response.ok) throw new Error('Version list unavailable')
    const publication = await response.json()
    const versionPattern = /^\d+\.\d+\.\d+$/
    if (!versionPattern.test(publication.latest) || !Array.isArray(publication.versions))
      throw new Error('Invalid version list')
    const versions = publication.versions.filter(
      (entry) => versionPattern.test(entry.version) && Array.isArray(entry.routes),
    )
    const currentVersion = location.pathname.match(
      /^\/UndoKit\/versions\/(\d+\.\d+\.\d+)(?:\/|$)/,
    )?.[1]
    const latest = document.createElement('option')
    latest.value = 'latest'
    latest.textContent = `Latest (${publication.latest})`
    select.append(latest)
    for (const entry of versions) {
      const option = document.createElement('option')
      option.value = entry.version
      option.textContent = entry.version
      select.append(option)
    }
    select.value = currentVersion || 'latest'
    select.disabled = false
    select.addEventListener('change', () => {
      const targetVersion = select.value === 'latest' ? publication.latest : select.value
      const target = versions.find((entry) => entry.version === targetVersion)
      if (!target) return
      // Read location at activation time: DocC may have navigated without a page load.
      const currentMount =
        location.pathname.match(/^\/UndoKit\/versions\/\d+\.\d+\.\d+\//)?.[0] || '/'
      const topic = location.pathname.slice(currentMount.length).replace(/\/$/, '')
      const exists = target.routes.some((route) => route.replace(/\/$/, '') === topic)
      const mount = select.value === 'latest' ? '/' : `/UndoKit/versions/${targetVersion}/`
      const url = new URL(
        mount + (exists ? `${topic}/` : 'documentation/undokit/'),
        location.origin,
      )
      if (!exists) url.searchParams.set('docc-topic-unavailable', '1')
      // Anchors may have changed across releases; don't carry an unverified fragment.
      location.assign(url.href)
    })
  } catch {
    status.textContent = 'Version navigation is temporarily unavailable.'
  }
})()
