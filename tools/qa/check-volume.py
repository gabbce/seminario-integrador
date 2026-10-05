"""Read-only independent data checks. Run with optional before/after inventory files."""
import json,sys,collections
from pathlib import Path
root=Path(__file__).resolve().parents[2]
data=json.loads((root/'backend/src/main/resources/demo/volumen-i05-v1.json').read_text(encoding='utf-8'))
rows=[]
for e in data['entries']:
    for original in e['dates']:
        effective=e.get('targetDate') if original==e.get('moveDate') else original
        h,m=map(int,e['start'].split(':'))
        rows.append(dict(key=e['key'],date=effective,room=e['room'],start=h*60+m,end=h*60+m+30*e['modules'],cancelled=original in e.get('cancelDates',[]),students=e['students'],type=e['type'],year=e['year'],period=e['period']))
active=[r for r in rows if not r['cancelled']]
slots=collections.defaultdict(list)
for r in active:
    for t in range(r['start'],r['end'],30):slots[r['date'],r['room'],t].append(r['key'])
assert all(len(v)==1 for v in slots.values()),'Internal overlap'
assert all(r['year'] in (2026,2027) for r in rows)
assert all(not(r['room'] in ('Lab1','Lab 2') and r['date']>='2027-03-09' and r['date']<='2027-07-03' and __import__('datetime').date.fromisoformat(r['date']).isoweekday()==2 and r['start']<17*60 and r['end']>14*60) for r in rows)
assert (len(data['entries']),len(rows),len(active))==(306,4613,4612),'Dataset counts drifted'
assert collections.Counter((r['year'],r['period']) for r in rows)=={(2026,'second'):679,(2027,'first'):829,(2027,'annual'):2998,(2027,None):107},'Period distribution drifted'
print('Dataset',len(data['entries']),'reservations;',len(rows),'registered;',len(active),'active;',len(rows)-len(active),'cancelled')
print('Distribution',dict(collections.Counter((r['year'],r['period']) for r in rows)))
printing=[r for r in active if r['date']=='2027-08-23']
curves=collections.Counter();concurrent=collections.Counter()
for r in printing:
    for t in range(r['start'],r['end'],30):curves[t]+=r['students'];concurrent[t]+=1
assert dict(concurrent)==dict.fromkeys(range(540,930,30),8),'Concurrent classes/franjas drifted'
assert {t for t,n in curves.items() if n==125}=={600,690,780,870},'Student peak franjas drifted'
assert len(printing)==104 and sum((r['end']-r['start'])/60 for r in printing)==52,'Print count/hours drifted'
assert sum(r['students']*(r['end']-r['start'])/60 for r in printing)==780 and max(curves.values())==125,'Print student metrics drifted'
print('2027-08-23:',len(printing),'rows;',sum((r['end']-r['start'])/60 for r in printing),'room-hours;',sum(r['students']*(r['end']-r['start'])/60 for r in printing),'student-hours;',max(curves.values()),'peak students')
if len(sys.argv)>1:
    before=json.loads(Path(sys.argv[1]).read_text(encoding='utf-8'))
    occupied={(o['date'],o['room'],t) for b in before['reservations'] for o in b['occurrences'] if not o['cancelled'] for t in range(int(o['start'][:2])*60+int(o['start'][3:5]),int(o['end'][:2])*60+int(o['end'][3:5]),30)}
    assert not(occupied & slots.keys()),'Proposed intervals conflict with existing reservations'
    print('Existing intervals compatible:',len(before['reservations']),'reservations')
if len(sys.argv)>2:
    after=json.loads(Path(sys.argv[2]).read_text(encoding='utf-8'))
    byid={b['id']:b for b in after['reservations']}
    assert all(byid.get(b['id'])==b for b in before['reservations']),'Previous content changed'
    assert before['rooms']==after['rooms'],'Room/history references changed'
    assert before['calendars']==after['calendars'],'Calendars changed'
    assert before['courses']==after['courses'],'Courses changed'
    assert before['protected']==after['protected'],'Protected availability/ranking changed'
    oldids={b['id'] for b in before['reservations']}
    extra=[b for b in after['reservations'] if b['id'] not in oldids]
    assert len(extra)==306 and sum(len(b['occurrences']) for b in extra)==4613,'Unexpected volume'
    print('Previous content and protected queries preserved; new count verified.')
    manifest=[]
    for e in data['entries']:
        expected=sorted((e.get('targetDate') if day==e.get('moveDate') else day,e['start'],e['room'],day in e.get('cancelDates',[])) for day in e['dates'])
        matches=[b for b in extra if sorted((o['date'],o['start'],o['room'],o['cancelled']) for o in b['occurrences'])==expected]
        assert len(matches)==1, 'Ambiguous semantic identity '+e['key']
        b=matches[0]
        assert all(b[field]==e[field] for field in ('students','type','subject','teacherId','board','resources')), 'Reservation attributes differ: '+e['key']
        start_minutes=int(e['start'][:2])*60+int(e['start'][3:])
        end_minutes=start_minutes+30*e['modules']
        expected_end=f'{end_minutes//60:02d}:{end_minutes%60:02d}'
        assert all(o['end']==expected_end for o in b['occurrences']), 'Duration differs: '+e['key']
        if e.get('moveDate'):
            moved=next(o for o in b['occurrences'] if o['date']==e['targetDate'])
            assert moved['originalDate']==e['moveDate'], 'Rescheduled origin differs: '+e['key']
        manifest.append(dict(key=e['key'],bookingId=b['id'],courseId=b['courseId'],registered=len(b['occurrences']),active=sum(not o['cancelled'] for o in b['occurrences']),details=[o['id'] for o in b['occurrences']]))
    if len(sys.argv)>3:
        Path(sys.argv[3]).write_text(json.dumps(dict(dataset=data['dataset'],version=data['version'],entries=manifest),ensure_ascii=False,indent=2)+'\n')
