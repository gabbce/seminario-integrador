// Read-only domain measurements against a declared app origin. NOT the 50-user RNF protocol.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { cpus, platform, release } from 'node:os';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const args = process.argv.slice(2);
const option = (name, fallback) => args.find(arg => arg.startsWith(name + '='))?.slice(name.length + 1) ?? fallback;
const origin = new URL(option('--origin', 'http://127.0.0.1:8082'));
if (!['http:', 'https:'].includes(origin.protocol) || origin.username || origin.password)
  throw Error('Declare an HTTP app origin without credentials.');
const samples = Number(option('--samples', '20'));
if (!Number.isInteger(samples) || samples < 5 || samples > 100) throw Error('Samples must be 5..100.');
const env = file => Object.fromEntries(readFileSync(file, 'utf8').split(/\r?\n/)
  .filter(line => line && !line.startsWith('#') && line.includes('='))
  .map(line => { const n = line.indexOf('='); return [line.slice(0, n), line.slice(n + 1).replaceAll('\\\\', '\\')]; }));
const front = env('frontend/.env.local');
const password = process.env.AULAS_DEMO_PASSWORD || (args.includes('--demo-guide')
  ? readFileSync('docs/credenciales-demo.md', 'utf8').match(/contrase[ñn]a[^\n]*?`([^`]+)`/i)?.[1]
  : env('backend/.env').AULAS_DEMO_PASSWORD);
if (!password) throw Error('Provide the existing demo password privately or use --demo-guide.');
const apiKey = front.VITE_SUPABASE_PUBLISHABLE_KEY;
const authOrigin = front.VITE_SUPABASE_URL;
const login = await fetch(authOrigin + '/auth/v1/token?grant_type=password', {
  method: 'POST', headers: { apikey: apiKey, 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'bedel@demo.local', password }), signal: AbortSignal.timeout(30000),
});
if (!login.ok) throw Error('Demo login HTTP ' + login.status + '; no credentials changed.');
const token = (await login.json()).access_token;
const cases = [
  ['listing-daily', '/consultas/listado?mode=day&date=2027-08-23&page=0&size=20'],
  ['listing-course', '/consultas/listado?mode=course&courseId=30&year=2027&page=0&size=20'],
  ['availability', '/reservas/periodicas/preparacion', {
    year: 2027, courseId: null, period: 'first', students: 24, type: 'Laboratorio', board: '',
    resources: ['fans'], excluded: [], patterns: [{ day: 2, start: '14:00', modules: 4 }],
  }],
  ['calendar-references', '/referencias/calendarios'],
];
const pct = (values, p) => [...values].sort((a, b) => a - b)[Math.ceil(values.length * p) - 1];
try {
  const results = [];
  for (const [name, path, body] of cases) {
    const values = [], statuses = [], bytes = [];
    for (let n = -2; n < samples; n++) {
      const start = performance.now();
      const response = await fetch(new URL('/api' + path, origin), {
        method: body ? 'POST' : 'GET', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(60000),
      });
      const content = await response.arrayBuffer();
      const duration = performance.now() - start;
      if (n >= 0) { values.push(duration); statuses.push(response.status); bytes.push(content.byteLength); }
    }
    const result = { name, path, samplesMs: values, statuses, bytes, p50Ms: pct(values, .5), p95Ms: pct(values, .95),
      errors: statuses.filter(status => status !== 200).length };
    results.push(result);
    console.log(name + ': p50=' + result.p50Ms.toFixed(1) + 'ms p95=' + result.p95Ms.toFixed(1) + 'ms errors=' + result.errors);
  }
  const output = resolve(option('--out', 'artifacts/qa/requirements/remote-reads.json'));
  mkdirSync(dirname(output), { recursive: true, mode: 0o700 });
  writeFileSync(output, JSON.stringify({ at: new Date().toISOString(), origin: origin.origin,
    snapshot: option('--snapshot', 'unspecified'), commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
    sourceSha256: createHash('sha256').update(readFileSync(new URL(import.meta.url))).digest('hex'),
    environment: { node: process.version, os: platform() + ' ' + release(), cpu: cpus()[0].model,
      database: 'Supabase remote us-west-2; declared demo dataset, no domain writes', auth: 'real Supabase, login outside measurement' },
    protocol: { sessions: 1, measuredRequestsPerOperation: samples, warmupRequestsPerOperation: 2,
      includes: 'HTTP, transfer and full body consumption; no render',
      limitation: 'Sequential descriptive sample. Does not establish RNF03/05 under the complete 50-user workload.' }, results,
  }, null, 2) + '\n', { mode: 0o600 });
  if (results.some(result => result.errors)) process.exitCode = 1;
} finally {
  const response = await fetch(authOrigin + '/auth/v1/logout?scope=local', {
    method: 'POST', headers: { apikey: apiKey, Authorization: 'Bearer ' + token }, signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw Error('Temporary session logout HTTP ' + response.status);
}
