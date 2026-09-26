"""Independent audit of completed load evidence; no database/network access."""
import json,math,sys
from pathlib import Path
root=Path(sys.argv[1] if len(sys.argv)>1 else 'artifacts/qa/load')
read=lambda name:json.loads((root/name).read_text())
r=read('result.json');samples=read('samples.json');pauses=read('pauses.json');active=read('activations.json');assignments=read('assignments.json');manifest=read('manifest.json');aux=read('auxiliary.json')
assert r['initial']=={'rooms':30,'reservations':1300,'details':26100}
assert manifest['periodicSeries']==800 and manifest['periodicDetails']==25600 and manifest['sporadicDetails']==500
assert r['sessions']==50 and r['roles']=={'Docente':45,'Admin':2,'Bedel':3}
assert len(active)==50 and {x['session'] for x in active}==set(range(1,51))
active=sorted(active,key=lambda x:x['session'])
for i,a in enumerate(active):
 assert abs(a['plannedMs']-active[0]['plannedMs']-i*100)<.01
 assert a['actualMs']>=a['plannedMs']
assert r['timing']['warmupMs']==120000 and r['timing']['measurementMs']==600000
start=r['timing']['measurementStartMs'];end=r['timing']['measurementEndMs']
assert abs(end-start-600000)<.01
assert 120000<=start-max(a['actualMs'] for a in active)<120100
assert all(p['requestedMs']==5000 and p['actualMs']>=5000 for p in pauses)
assert len(pauses)==len(samples)
assert r['auxiliariesDuringMeasurement']==0 and not any(start<=a['startMs']<end for a in aux)
by_session={i:sorted([s for s in samples if s['session']==i],key=lambda s:s['startMs']) for i in range(1,51)}
config={s['id']:s for s in assignments['sessions']}
assert len(config)==5 and sum(len(s['assignments']) for s in config.values())==280
for i,rows in by_session.items():
 expected=['availability','periodic-create','availability','periodic-modify'] if i<=5 else ['availability','listing-daily','availability','listing-course']
 assert len(rows)>0 and any(s['phase']=='measurement' for s in rows)
 for n,s in enumerate(rows):
  assert s['cycle']==n and s['operation']==expected[n%4]
  if n:assert s['startMs']-rows[n-1]['endMs']>=5000
  if s['phase']=='measurement':assert start-5<=s['startMs']<end
  if s['operation']=='periodic-create':
   request=config[i]['assignments'][s['assignmentIndex']]
   assert s['operationId']==request['operationId'] and s['period']==request['proposal']['period']
   if s['status']==200:assert s.get('createdReservationId')
 if i<=5:
  for operation in ['periodic-create','periodic-modify']:
   ops=[s for s in rows if s['operation']==operation]
   assert all(s['period']==('first' if n%2==0 else 'annual') for n,s in enumerate(ops))
  for series in config[i]['series']:
   changes=[s for s in rows if s['operation']=='periodic-modify' and s['reservationId']==series['id']]
   assert changes
   for n,s in enumerate(changes):
    assert s['targetRoom']==series['pair'][1 if n%2==0 else 0]
    assert s['versionBefore']==n
    if s['status']==200:assert s['resultVersion']==n+1
measured=[s for s in samples if s['phase']=='measurement'];assert len(measured)==r['totalMeasured']
assert set(r['operations'])=={'availability','listing-daily','listing-course','periodic-create','periodic-modify'}
limits={'availability':1500,'listing-daily':1500,'listing-course':1500,'periodic-create':2000,'periodic-modify':2000}
for operation,summary in r['operations'].items():
 values=sorted(s['durationMs'] for s in measured if s['operation']==operation)
 assert values
 assert summary['thresholdMs']==limits[operation]
 assert summary['passed']==(summary['p95Ms']<limits[operation] and summary['errors']==0)
 assert len(values)==summary['count'] and values[math.ceil(len(values)*.95)-1]==summary['p95Ms']
 assert abs(summary['requestsPerSecond']-len(values)/600)<1e-12
 assert summary['errors']==sum(bool(s.get('error')) for s in measured if s['operation']==operation)
assert r['allPhaseErrors']==sum(bool(s.get('error')) for s in samples)
assert r['passed']==(r['allPhaseErrors']==0 and all(s['passed'] for s in r['operations'].values()))
print('Protocol audited: 50 identities, 100ms stagger, 120s warmup, 600s measurement, >=5000ms response pauses; cycles, assignments, reservation IDs, versions, errors and p95 reproduced.')
