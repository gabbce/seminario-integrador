// Explicit remote QA: 50 logical clients on 3 existing identities, bounded writes,
// cancellation of created reservations. This is NOT the nominal 50-identity RNF run.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { randomUUID, createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';

const arg = name => process.argv.find(a => a.startsWith(name + '='))?.slice(name.length + 1);
const origin = arg('--origin');
if (!origin || (!process.argv.includes('--reads-only') && !process.argv.includes('--allow-qa-writes')))
  throw Error('Declare --origin and --allow-qa-writes for the explicitly authorized remote test.');
const duration = Number(arg('--measurement-ms') || 180000);
assert(Number.isInteger(duration) && duration >= 60000 && duration <= 600000);
const burstSize = Number(arg('--burst-size') || 10);
assert(Number.isInteger(burstSize) && burstSize >= 2 && burstSize <= 10);
const output = arg('--out') || 'artifacts/qa/requirements/remote-concurrency-extra.json';
const env = Object.fromEntries(readFileSync('frontend/.env.local', 'utf8').split(/\r?\n/)
  .filter(l => l && !l.startsWith('#') && l.includes('='))
  .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]));
const password = process.env.AULAS_DEMO_PASSWORD || readFileSync('docs/credenciales-demo.md', 'utf8')
  .match(/contrase[ñn]a[^\n]*?`([^`]+)`/i)?.[1];
assert(password, 'Existing demo password required.');
const runId = randomUUID(), tokens = {}, records = [], checks = [], owned = new Set(), operationKeys = [];
const report = {
  runId, at: new Date().toISOString(), origin, commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  image: arg('--image'), sourceSha256: createHash('sha256').update(readFileSync(new URL(import.meta.url))).digest('hex'),
  protocol: { logicalClients: 50, distinctAccounts: 3, roles: { Admin: 2, Bedel: 3, Docente: 45 },
    warmupMs: 30000, measurementMs: duration, pauseAfterResponseMs: 5000, rampMs: 4900,
    burstSize, limitation: 'Extra remote concurrency check; shared demo dataset, 3 existing Auth sessions. Not the nominal 50-distinct-identity mixed-write RNF protocol.' },
  records, checks, operationKeys, cleanup: [],
};
mkdirSync('artifacts/qa/requirements', { recursive: true });
const save = () => writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { mode: 0o600 });
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function call(role, name, path, body, phase = 'functional', worker) {
  const start = performance.now();
  let status = 0, data, error;
  try {
    const response = await fetch(origin + '/api' + path, {
      method: body ? 'POST' : 'GET', headers: { Authorization: 'Bearer ' + tokens[role], 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(180000),
    });
    status = response.status;
    const text = await response.text();
    try { data = JSON.parse(text); } catch { error = 'NON_JSON'; }
    if (!response.ok) error = data?.code || 'HTTP_' + status;
  } catch (e) { error = e.name; }
  const row = { name, phase, role, worker, startMs: start, durationMs: performance.now() - start, status, error };
  records.push(row);
  return { ...row, data };
}
async function required(role, name, path, body) {
  const r = await call(role, name, path, body, 'setup');
  assert.equal(r.status, 200, name + ' HTTP ' + r.status);
  return r.data;
}
async function cancel(id) {
  const b = await required('bedel', 'cleanup-get', '/reservas/' + id);
  if (b.state === 'CANCELADA') return b;
  const body = { operationId: randomUUID(), version: b.version,
    detailIds: b.occurrences.filter(o => !o.cancelled).map(o => o.id), reason: 'QA concurrencia remota extra ' + runId };
  const r = await call('bedel', 'cleanup-cancel', '/reservas/' + id + '/cancelaciones/confirmacion', body, 'cleanup');
  assert.equal(r.status, 200, 'QA cancellation HTTP ' + r.status);
  const verified = await required('bedel', 'cleanup-verify', '/reservas/' + id);
  assert.equal(verified.state, 'CANCELADA');
  assert(verified.occurrences.every(o => o.cancelled));
  report.cleanup.push({ reservationId: id, state: verified.state, activeDetails: 0 });
  save();
  return verified;
}
try {
  for (const role of ['admin', 'bedel', 'docente']) {
    const r = await fetch(env.VITE_SUPABASE_URL + '/auth/v1/token?grant_type=password', {
      method: 'POST', headers: { apikey: env.VITE_SUPABASE_PUBLISHABLE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: role + '@demo.local', password }), signal: AbortSignal.timeout(30000),
    });
    assert.equal(r.status, 200, 'Auth ' + role + ' HTTP ' + r.status);
    tokens[role] = (await r.json()).access_token;
    await required(role, 'identity', '/me');
  }
  const before = await required('bedel', 'inventory-before', '/reservas?page=0&size=20');
  report.reservationsBefore = before.total;
  if (!process.argv.includes('--reads-only')) {
  const courses = await required('bedel', 'courses', '/referencias/cursos?year=2027');
  const teachers = await required('bedel', 'teachers', '/referencias/docentes');
  assert(courses.length && teachers.length, 'Demo references required.');
  let proposal, prepared, room;
  for (const date of ['2027-07-13', '2027-07-14', '2027-07-15']) {
    const candidate = { year: 2027, courseId: String(courses[0].id), students: 1, type: 'General', board: '', resources: [], dates: [{ date, start: '22:30', modules: 1 }] };
    const r = await call('bedel', 'find-free-slot', '/reservas/esporadicas/preparacion', candidate, 'setup');
    if (r.status === 200 && r.data.dates[0].availableRooms.some(a => a.capacity >= 12)) {
      proposal = candidate; prepared = r.data; room = r.data.dates[0].availableRooms.find(a => a.capacity >= 12); break;
    }
  }
  assert(room, 'No isolated free test slot found; no reservation created.');
  const base = { proposal, teacherId: teachers[0].id, calendarVersion: prepared.calendarVersion,
    selections: [{ date: proposal.dates[0].date, roomId: room.internalId, roomVersion: room.version }] };
  report.slot = { date: proposal.dates[0].date, start: '22:30', end: '23:00', roomId: room.internalId };
  const burst = async (name, count, make) => {
    const bodies = Array.from({ length: count }, (_, n) => make(n));
    if (name.includes('create')) operationKeys.push(...bodies.map(body => body.operationId));
    save();
    const responses = await Promise.all(bodies.map(body => call('bedel', name, '/reservas/esporadicas/confirmacion', body)));
    for (const r of responses) if (r.status === 200 && r.data?.id) owned.add(r.data.id);
    save(); return responses;
  };
  const sharedKey = randomUUID(); operationKeys.push(sharedKey); save();
  const replay = await burst('create-idempotent', burstSize, () => ({ ...base, operationId: sharedKey }));
  assert(replay.every(r => r.status === 200));
  assert.equal(new Set(replay.map(r => r.data.id)).size, 1);
  const id = replay[0].data.id;
  checks.push({ name: burstSize + ' simultaneous identical creates', passed: true, persistedReservations: 1, reservationId: id });
  const publicBooking = await required('docente', 'public-projection', '/reservas/' + id);
  assert(!('teacherEmail' in publicBooking) && !('registrant' in publicBooking));
  const forbidden = await call('docente', 'forbidden-create', '/reservas/esporadicas/confirmacion', { ...base, operationId: randomUUID() });
  assert.equal(forbidden.status, 403);
  checks.push({ name: 'Docente privacy and mutation authorization', passed: true });
  const edits = await Promise.all(Array.from({ length: burstSize }, (_, i) => call('bedel', 'optimistic-edit', '/reservas/' + id + '/cabecera', {
    operationId: randomUUID(), version: 0, courseId: proposal.courseId, teacherId: teachers[0].id, students: i + 2,
    type: 'General', board: '', resources: [],
  })));
  assert.equal(edits.filter(r => r.status === 200).length, 1);
  assert.equal(edits.filter(r => r.status === 409).length, burstSize - 1);
  assert.equal((await required('bedel', 'edited-version', '/reservas/' + id)).version, 1);
  checks.push({ name: burstSize + ' edits with the same version', passed: true, successful: 1, expectedConflicts: burstSize - 1 });
  await cancel(id);
  const race = await burst('create-overlap', burstSize, () => ({ ...base, operationId: randomUUID() }));
  assert.equal(race.filter(r => r.status === 200).length, 1);
  assert.equal(race.filter(r => r.status === 409).length, burstSize - 1);
  checks.push({ name: burstSize + ' competing creates for one slot', passed: true, successful: 1, expectedConflicts: burstSize - 1 });
  await cancel(race.find(r => r.status === 200).data.id);
  save();
  console.log('Functional races passed; both QA reservations cancelled.');
  }
  if (!process.argv.includes('--functional-only')) {
  console.log('Starting 50-client read load (3 existing identities, 30s warmup and measured duration ' + duration + 'ms).');
  const cases = [
    ['availability', '/reservas/periodicas/preparacion', { year: 2027, courseId: null, period: 'first', students: 24, type: 'Laboratorio', board: '', resources: ['fans'], excluded: [], patterns: [{ day: 2, start: '14:00', modules: 4 }] }],
    ['listing-daily', '/consultas/listado?mode=day&date=2027-08-23&page=0&size=20'],
    ['availability', '/reservas/periodicas/preparacion', { year: 2027, courseId: null, period: 'first', students: 24, type: 'Laboratorio', board: '', resources: ['fans'], excluded: [], patterns: [{ day: 2, start: '14:00', modules: 4 }] }],
    ['listing-course', '/consultas/listado?mode=course&courseId=30&year=2027&page=0&size=20'],
  ];
  const rampStart = performance.now(), measureStart = rampStart + 4900 + 30000, end = measureStart + duration;
  report.measurement = { startMs: measureStart, endMs: end };
  await Promise.all(Array.from({ length: 50 }, async (_, worker) => {
    await pause(worker * 100);
    const role = worker < 2 ? 'admin' : worker < 5 ? 'bedel' : 'docente';
    let cycle = 0;
    while (performance.now() < end) {
      const phase = performance.now() >= measureStart ? 'measurement' : 'warmup';
      const [name, path, body] = cases[cycle++ % cases.length];
      await call(role, name, path, body, phase, worker + 1);
      await pause(5000);
    }
  }));
  const measured = records.filter(r => r.phase === 'measurement');
  report.operations = {};
  for (const name of new Set(measured.map(r => r.name))) {
    const rows = measured.filter(r => r.name === name), values = rows.map(r => r.durationMs).sort((a, b) => a - b);
    report.operations[name] = { count: rows.length, errors: rows.filter(r => r.status !== 200).length,
      p50Ms: values[Math.ceil(values.length * .5) - 1], p95Ms: values[Math.ceil(values.length * .95) - 1], maxMs: values.at(-1), targetMs: 1500 };
  }
  report.measuredRequests = measured.length;
  report.measuredErrors = measured.filter(r => r.status !== 200).length;
  report.functionalPassed = checks.length ? checks.every(c => c.passed) : null;
  report.mode = process.argv.includes('--reads-only') ? 'reads-only; no functional write checks in this execution' : 'functional-and-read-load';
  report.loadFunctionalPassed = measured.length > 0 && report.measuredErrors === 0;
  report.readLatencyTargetMet = Object.values(report.operations).every(o => o.p95Ms < 1500);
  assert(report.loadFunctionalPassed, 'Read load produced HTTP/transport errors.');
  }
  report.functionalPassed = checks.length ? checks.every(c => c.passed) : null;
  if (process.argv.includes('--functional-only')) report.mode = 'functional-only; no read load in this execution';
} catch (e) {
  report.failure = { name: e.name, message: e.message };
  process.exitCode = 1;
} finally {
  // Recover known operation keys before cleanup if any create response was uncertain.
  if (tokens.bedel) for (const key of new Set(operationKeys)) {
    try {
      const r = await call('bedel', 'recover-owned-create', '/reservas/operaciones/' + key, undefined, 'cleanup');
      if (r.status === 200 && r.data?.found && r.data.booking?.id) owned.add(r.data.booking.id);
    } catch { /* Any cleanup failure is recorded below. */ }
  }
  for (const id of owned) {
    try { await cancel(id); } catch (e) { report.cleanup.push({ reservationId: id, error: e.message }); process.exitCode = 1; }
  }
  for (const [role, token] of Object.entries(tokens)) {
    try {
      const r = await fetch(env.VITE_SUPABASE_URL + '/auth/v1/logout?scope=local', {
        method: 'POST', headers: { apikey: env.VITE_SUPABASE_PUBLISHABLE_KEY, Authorization: 'Bearer ' + token }, signal: AbortSignal.timeout(30000),
      });
      assert.equal(r.status, 204, 'Temporary logout HTTP ' + r.status);
    } catch (e) { report.cleanup.push({ role, error: e.message }); process.exitCode = 1; }
  }
  report.completedAt = new Date().toISOString();
  save();
  console.log(JSON.stringify({ checks, operations: report.operations, measuredRequests: report.measuredRequests,
    measuredErrors: report.measuredErrors, failure: report.failure, cleanup: report.cleanup, readLatencyTargetMet: report.readLatencyTargetMet }, null, 2));
}
