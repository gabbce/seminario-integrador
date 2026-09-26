"""Deterministic I05 v1 dataset. No database access or randomness."""
import json
from datetime import date, timedelta
from pathlib import Path
root=Path(__file__).resolve().parents[2]
catalog=json.loads((root/'backend/src/main/resources/demo/catalogos-i02-v1.json').read_text())
rooms=[r for r in catalog['rooms'] if r['id'] in ['101','102','104','106','201','202','205','206','Lab1','Lab 2']]
entries=[]
def entry(key,year,r,start,dates,period=None,day=None,excluded=None):
    n=len(entries)
    return dict(key=key,year=year,subject=['Álgebra','Química','Programación I'][n%3],commission=['A','B'][n%2],teacherId=f'D-{n%5+1:02}',students=[10,15,20][n%3],type=r['type'],board='',resources=[],room=r['id'],start=start,modules=2,dates=dates,period=period,day=day,excluded=excluded or [])
for year,period,start in [(2026,'second','21:00'),(2027,'first','21:00'),(2027,'annual','12:00'),(2027,'annual','22:00')]:
    cal=next(c for c in catalog['calendars'] if c['year']==year)
    ranges=cal['terms'].values() if period=='annual' else [cal['terms'][period]]
    for r in rooms:
        for day in range(1,6):
            dates=[]
            for lo,hi in ranges:
                d=date.fromisoformat(lo)
                while d<=date.fromisoformat(hi):
                    if d.isoweekday()==day and str(d) not in cal['holidays']: dates.append(str(d))
                    d+=timedelta(days=1)
            excluded=[dates[1]] if r['id']=='104' and day==1 else []
            dates=[d for d in dates if d not in excluded]
            entries.append(entry(f'{year}-{period}-{r["id"]}-{day}-{start[:2]}',year,r,start,dates,period,day,excluded))
# Dedicated recess printing day: 8 rooms ×13 half-hour classes=104.
for r in rooms:
    if r['type']=='Laboratorio':continue
    for slot in range(13):
        e=entry(f'print-{r["id"]}-{slot:02}',2027,r,f'{9+slot//2:02}:{30*(slot%2):02}',['2027-08-23'])
        e['modules']=1
        entries.append(e)
r=next(r for r in rooms if r['id']=='104')
e=entry('receso-cancelacion',2027,r,'19:00',['2027-08-24','2027-08-26'])
e['cancelDates']=['2027-08-24'];entries.append(e)
e=entry('receso-reprogramada',2027,r,'19:00',['2027-08-25'])
e.update(moveDate='2027-08-25',targetDate='2027-08-27');entries.append(e)
data=dict(dataset='volumen-i05',version=1,description='Carga aditiva determinista I05; franjas QA protegidas; no restaura modificaciones.',clock='2026-01-01T00:00:00-03:00',entries=entries)
(root/'backend/src/main/resources/demo/volumen-i05-v1.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
counts={}
for e in entries:
    key=f'{e["year"]}-{e["period"] or "sporadic"}'
    counts[key]=counts.get(key,0)+len(e['dates'])
print(len(entries),'reservations',sum(counts.values()),'classes',counts)
