"""Versioned deterministic nominal dataset. Output goes only into a fresh isolated database."""
import datetime as dt,json,sys,uuid
SEED='i06-load-v1'
current=int(sys.argv[1]) if len(sys.argv)>1 else dt.date.today().year
years=[current-1,current+1]
def monday(year,month):
 d=dt.date(year,month,1)
 return d+dt.timedelta(days=(-d.weekday())%7)
def friday(year,month,day):
 d=dt.date(year,month,day)
 return d+dt.timedelta(days=(4-d.weekday())%7)
terms={y:[(monday(y,3),monday(y,3)+dt.timedelta(days=111)),(monday(y,8),monday(y,8)+dt.timedelta(days=111))] for y in years}
profiles=[{'id':i+1,'sub':str(uuid.uuid5(uuid.NAMESPACE_URL,SEED+'/session/'+str(i))),'role':('ADMINISTRADOR' if i<2 else 'BEDEL') if i<5 else 'DOCENTE'} for i in range(50)]
manifest={'seed':SEED,'currentYear':current,'historicalYear':years[0],'operationalYear':years[1],'terms':{str(y):[[a.isoformat(),b.isoformat()] for a,b in terms[y]] for y in years},'profiles':profiles,'listingDate':(terms[years[1]][0][0]+dt.timedelta(days=1)).isoformat(),'courseId':'11','periodicSeries':800,'periodicDetails':25600,'sporadicDetails':500,'rooms':30}
if '--manifest' in sys.argv:print(json.dumps(manifest,indent=2));sys.exit()
print('BEGIN;')
for p in profiles:
 print(f"INSERT INTO aulas.usuario(id_usuario,supabase_auth_id,email,nombre,apellido,rol) OVERRIDING SYSTEM VALUE VALUES ({p['id']},'{p['sub']}','load-{p['id']}@isolated.test','Carga','{p['id']}','{p['role']}');")
 table={'ADMINISTRADOR':'administrador','BEDEL':'bedel','DOCENTE':'docente'}[p['role']]
 print(f"INSERT INTO aulas.{table}(id_usuario) VALUES ({p['id']});")
for i in range(30):
 kind=['General','Multimedios','Laboratorio'][i//10];state='Mantenimiento' if i==28 else 'Inhabilitada' if i==29 else 'Habilitada'
 print(f"INSERT INTO aulas.aula(id_aula,identificador,tipo,capacidad,estado,ubicacion,piso,pizarron,ventiladores,aire) OVERRIDING SYSTEM VALUE VALUES ({i+1},'L{i+1:02}','{kind}',{20+10*(i%4)},'{state}','Carga',0,'Tiza',true,false);")
 if kind=='Multimedios':print(f"INSERT INTO aulas.aula_multimedios(id_aula,televisor,proyector,computadora) VALUES ({i+1},true,true,true);")
 if kind=='Laboratorio':print(f"INSERT INTO aulas.aula_laboratorio(id_aula,cantidad_pc) VALUES ({i+1},30);")
 print(f"INSERT INTO aulas.historial_aula(id_aula,desde,tipo,estado,baja) VALUES ({i+1},'{years[0]-1}-01-01T00:00:00Z','{kind}','{state}',false);")
for i in range(10):print(f"INSERT INTO aulas.materia(id_materia,nombre,nombre_normalizado) OVERRIDING SYSTEM VALUE VALUES ({i+1},'Carga {i+1}','CARGA {i+1}');")
for yi,y in enumerate(years):
 yearid=yi+1
 print(f"INSERT INTO aulas.anio_lectivo(id_anio_lectivo,anio_calendario,estado) OVERRIDING SYSTEM VALUE VALUES ({yearid},{y},'{ 'CERRADO' if yi==0 else 'HABILITADO'}');")
 for n,(a,b) in enumerate(terms[y]):print(f"INSERT INTO aulas.cuatrimestre(id_cuatrimestre,id_anio_lectivo,numero,inicio,fin) OVERRIDING SYSTEM VALUE VALUES ({yi*2+n+1},{yearid},{n+1},'{a}','{b}');")
 for i in range(10):print(f"INSERT INTO aulas.curso(id_curso,id_materia,id_anio_lectivo,comision) OVERRIDING SYSTEM VALUE VALUES ({yi*10+i+1},{i+1},{yearid},'A');")
booking=0
for yi,y in enumerate(years):
 for ti,(a,b) in enumerate(terms[y]):
  for i in range(200):
   booking+=1;room=i%28+1;kind=['General','Multimedios','Laboratorio'][(room-1)//10];start=8+i//28;modules=1+i%2;course=yi*10+i%10+1
   print(f"INSERT INTO aulas.reserva(id_reserva,registrado_por,id_curso,docente_externo_id,nombre_docente,apellido_docente,email_docente,cantidad_alumnos,tipo_aula) OVERRIDING SYSTEM VALUE VALUES ({booking},1,{course},'D-01','Laura','Gómez','load@example.test',20,'{kind}');")
   print(f"INSERT INTO aulas.reserva_periodica VALUES ({booking},'CUATRIMESTRAL',null); INSERT INTO aulas.periodo_asignado VALUES ({booking},{yi*2+ti+1});")
   for day in [2,4]:
    print(f"WITH p AS (INSERT INTO aulas.patron_semanal(id_reserva,dia,hora_inicio,cantidad_modulos,id_aula) VALUES ({booking},{day},'{start}:00',{modules},{room}) RETURNING id_patron) INSERT INTO aulas.detalle_reserva(id_reserva,id_patron,id_aula,fecha,fecha_original,hora_inicio,cantidad_modulos) SELECT {booking},p.id_patron,{room},d::date,d::date,'{start}:00',{modules} FROM p,generate_series('{a+dt.timedelta(days=day-1)}'::date,'{b}'::date,'7 days') d;")
for yi,y in enumerate(years):
 for i in range(250):
  booking+=1;room=i%28+1;kind=['General','Multimedios','Laboratorio'][(room-1)//10];date=friday(y,4,9) if i<125 else friday(y,7,19);slot=(i%125)//28
  print(f"INSERT INTO aulas.reserva(id_reserva,registrado_por,id_curso,docente_externo_id,nombre_docente,apellido_docente,email_docente,cantidad_alumnos,tipo_aula) OVERRIDING SYSTEM VALUE VALUES ({booking},1,{yi*10+1},'D-01','Laura','Gómez','load@example.test',20,'{kind}'); INSERT INTO aulas.reserva_esporadica VALUES ({booking}); INSERT INTO aulas.detalle_reserva(id_reserva,id_aula,fecha,hora_inicio,cantidad_modulos) VALUES ({booking},{room},'{date}','{9+slot}:00',{1+i%2});")
for table,column in [('usuario','id_usuario'),('aula','id_aula'),('materia','id_materia'),('curso','id_curso'),('anio_lectivo','id_anio_lectivo'),('cuatrimestre','id_cuatrimestre'),('reserva','id_reserva')]:print(f"SELECT setval(pg_get_serial_sequence('aulas.{table}','{column}'),(SELECT max({column}) FROM aulas.{table}));")
print('COMMIT;')
