// Existing demo identities, temporary local sessions, no domain writes.
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const args = process.argv.slice(2);
const origin = args.find(arg => arg.startsWith('--origin='))?.slice('--origin='.length);
if (!origin || !['http:', 'https:'].includes(new URL(origin).protocol))
  throw Error('Declare --origin=http(s)://host:port for the review instance.');
const password = process.env.AULAS_DEMO_PASSWORD || (args.includes('--demo-guide')
  ? readFileSync('docs/credenciales-demo.md', 'utf8').match(/contrase[ñn]a[^\n]*?`([^`]+)`/i)?.[1]
  : undefined);
if (!password) throw Error('Provide the existing demo password privately or use --demo-guide.');
const config = args.includes('--both-browsers') ? 'playwright.package.config.ts' : 'playwright.readonly.config.ts';
const result = spawnSync('npx', ['playwright', 'test', '--config', config], {
  cwd: 'frontend', stdio: 'inherit',
  env: { ...process.env, AULAS_TEST_ORIGIN: origin, AULAS_DEMO_PASSWORD: password },
});
process.exitCode = result.status ?? 1;
