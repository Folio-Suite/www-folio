// SPDX-FileCopyrightText: 2026 the Folio Project
// SPDX-License-Identifier: MIT
import { spawn } from 'node:child_process'
function run(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      stdio: 'inherit',
      env: { ...process.env, ASTRO_TELEMETRY_DISABLED: '1' },
    })
    child.on('error', reject)
    child.on('exit', (code) =>
      code === 0 ? resolve() : reject(new Error(`Command failed: ${args.join(' ')}`)),
    )
  })
}
await run(['scripts/prepare-public.mjs'])
await run(['node_modules/astro/bin/astro.mjs', 'build', '--outDir', '.test-dist'])
// Keep the test server in the foreground even when Astro detects an agent.
await run([
  'node_modules/astro/bin/astro.mjs',
  'preview',
  '--ignore-lock',
  '--outDir',
  '.test-dist',
  '--port',
  '4322',
  '--host',
  '127.0.0.1',
])
