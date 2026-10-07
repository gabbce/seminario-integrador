"""Explicit isolated rehearsal of the built package's reset CLI; never accepts a DB URL."""
import argparse,json,os,secrets,subprocess,tempfile,time,uuid
from pathlib import Path
parser=argparse.ArgumentParser();parser.add_argument('--image',default='aulas-demo:local');args=parser.parse_args()
root=Path(__file__).resolve().parents[2]
output=root/'artifacts/qa/reset';output.mkdir(parents=True,exist_ok=True);output.chmod(0o700)
identity='aulas-reset-'+secrets.token_hex(5);network=None;database=None;commands=[]
def run(argv,**kw):
    result=subprocess.run(argv,text=True,encoding='utf-8',stdout=subprocess.PIPE,stderr=subprocess.PIPE,**kw)
    if result.returncode:raise RuntimeError('Command failed: '+argv[0]+' (private output omitted)')
    return result.stdout.strip()
def sql(statement):return run(['docker','exec','-i',database,'psql','-X','-v','ON_ERROR_STOP=1','-U','qa','-d','aulas_reset','-A','-t'],input=statement)
def rows(table):return json.loads(sql("select coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text),'[]'::jsonb) from aulas."+table+" t;"))
def aggregate(dataset,ignore_version=False):
    ids={int(r['id_reserva']) for r in rows('demo_reserva') if r['dataset']==dataset}
    result={table:[r for r in rows(table) if int(r['id_reserva']) in ids] for table in ['reserva','reserva_periodica','reserva_esporadica','periodo_asignado','patron_semanal','fecha_excluida','detalle_reserva']}
    if ignore_version:
        for row in result['reserva']:row.pop('version')
    return result
def command(label,options,success=True):
    name=identity+'-'+str(len(commands));cidfile=output/(name+'.cid');commands.append(cidfile)
    argv=['docker','run','--rm','--cidfile',str(cidfile),'--name',name,'--label','aulas.qa=reset','--network',network]
    for key in ['SPRING_DATASOURCE_URL','SPRING_DATASOURCE_USERNAME','SPRING_DATASOURCE_PASSWORD','AULAS_ENVIRONMENT']:
        argv+=['-e',key]
    argv += [args.image,'--spring.main.web-application-type=none',*options]
    result=subprocess.run(argv,text=True,encoding='utf-8',stdout=subprocess.PIPE,stderr=subprocess.STDOUT,env=environment)
    file=output/(label+'.log');file.touch(mode=0o600);file.chmod(0o600);file.write_text(result.stdout,encoding='utf-8')
    if (result.returncode==0)!=success:raise RuntimeError(label+' unexpected outcome; see private log '+str(file))
    return result.stdout
def preview(label):
    stdout=command(label,['--aulas.command=reset-demo','--aulas.reset.datasets=operacion-i04'])
    review=json.JSONDecoder().raw_decode(stdout.split('PREVISUALIZACIÓN — SIN CAMBIOS\n',1)[1].lstrip())[0]
    assert not review['blockers'],review['blockers'];return review
try:
    image=run(['docker','image','inspect',args.image,'--format','{{.Id}}'])
    network=run(['docker','network','create','--internal','--label','aulas.qa=reset',identity])
    password=secrets.token_urlsafe(24)
    environment={**os.environ,'POSTGRES_PASSWORD':password,'SPRING_DATASOURCE_URL':f'jdbc:postgresql://{identity}-db:5432/aulas_reset','SPRING_DATASOURCE_USERNAME':'qa','SPRING_DATASOURCE_PASSWORD':password,'AULAS_ENVIRONMENT':'demo'}
    database=run(['docker','run','-d','--name',identity+'-db','--label','aulas.qa=reset','--network',network,'-e','POSTGRES_USER=qa','-e','POSTGRES_DB=aulas_reset','-e','POSTGRES_PASSWORD','postgres:17.6-alpine'],env=environment)
    for attempt in range(60):
        ready=subprocess.run(['docker','exec',database,'pg_isready','-U','qa','-d','aulas_reset'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
        if ready.returncode==0:break
        time.sleep(1)
    else:raise RuntimeError('Local disposable PostgreSQL not ready')
    command('01-migrate',[])
    sql("begin; insert into aulas.usuario(supabase_auth_id,email,nombre,apellido,rol) values ('"+str(uuid.uuid4())+"','admin@isolated.test','Admin','Aislado','ADMINISTRADOR'); insert into aulas.administrador select id_usuario,'ADMINISTRADOR' from aulas.usuario; commit;")
    for label,seed in [('02-catalogs','seed-catalogos'),('03-i03','seed-reservas'),('04-i04','seed-operacion-i04')]:command(label,['--aulas.command='+seed])
    sql("insert into aulas.anio_lectivo(anio_calendario,estado) values (2029,'EN_PREPARACION');")
    selected=int(sql("select id_reserva from aulas.demo_reserva where dataset='operacion-i04' and clave='receso-2027';"))
    protected={t:rows(t) for t in ['usuario','administrador','aula','historial_aula','materia','curso','anio_lectivo','cuatrimestre','feriado']}
    foreign=aggregate('reservas-i03')
    sql(f'update aulas.reserva set cantidad_alumnos=19,version=version+1 where id_reserva={selected};')
    before=rows('reserva');
    snapshot_tables=['usuario','administrador','bedel','docente','aula','aula_multimedios','aula_laboratorio','historial_aula','materia','curso','anio_lectivo','cuatrimestre','feriado','reserva','reserva_periodica','reserva_esporadica','periodo_asignado','patron_semanal','fecha_excluida','detalle_reserva','evento_auditoria','demo_reserva','preparacion_cuenta','operacion_identidad']
    snapshot={t:rows(t) for t in snapshot_tables}
    review=preview('05-preview');assert snapshot=={t:rows(t) for t in snapshot_tables},'Preview changed domain or audit tables'
    command('06-invalid-confirmation',['--aulas.command=reset-demo','--aulas.reset.datasets=operacion-i04','--aulas.reset.application-stopped=true','--aulas.reset.confirm='+'0'*64],False);assert rows('reserva')==before
    command('07-reset',['--aulas.command=reset-demo','--aulas.reset.datasets=operacion-i04','--aulas.reset.application-stopped=true','--aulas.reset.confirm='+review['stamp']])
    assert sql(f'select cantidad_alumnos from aulas.reserva where id_reserva={selected};')=='20'
    functional=aggregate('operacion-i04',True)
    again=preview('08-preview-repeat')
    command('09-repeat',['--aulas.command=reset-demo','--aulas.reset.datasets=operacion-i04','--aulas.reset.application-stopped=true','--aulas.reset.confirm='+again['stamp']])
    assert protected=={t:rows(t) for t in protected}
    assert foreign==aggregate('reservas-i03')
    assert functional==aggregate('operacion-i04',True)
    report={'image':image,'environment':'isolated Docker PostgreSQL 17.6; no remote Auth or database','selectedDatasets':['operacion-i04'],'selectedReservations':len(review['items']),'totalReservations':int(sql('select count(*) from aulas.reserva;')),'totalDetails':int(sql('select count(*) from aulas.detalle_reserva;')),'previewReadOnly':True,'wrongConfirmationRejected':True,'resetRestores':True,'repeatPreservesFunctionalState':True,'foreignI03AndProfilesCatalogs2029Preserved':True,'manualAcceptance':'pending'}
    (output/'result.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8');print(json.dumps(report,indent=2))
finally:
    for cidfile in commands:
        if cidfile.exists():
            container_id=cidfile.read_text(encoding='utf-8').strip()
            if len(container_id)==64 and all(c in '0123456789abcdef' for c in container_id):subprocess.run(['docker','rm','-f',container_id],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
            cidfile.unlink()
    if database:subprocess.run(['docker','rm','-f',database],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    if network:subprocess.run(['docker','network','rm',network],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
