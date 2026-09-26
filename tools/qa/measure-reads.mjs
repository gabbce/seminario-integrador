// A small read-only reference, explicitly NOT the 50-session RNF protocol.
import {readFileSync,writeFileSync} from 'node:fs';
import {cpus,totalmem,platform,release} from 'node:os';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const env=file=>Object.fromEntries(readFileSync(file,'utf8').split(/\r?\n/).filter(s=>s&&!s.startsWith('#')&&s.includes('=')).map(s=>{const n=s.indexOf('=');return[s.slice(0,n),s.slice(n+1).replaceAll('\\\\','\\')]}));
const front=env('frontend/.env.local'),back=env('backend/.env');
const auth=await fetch(front.VITE_SUPABASE_URL+'/auth/v1/token?grant_type=password',{method:'POST',headers:{apikey:front.VITE_SUPABASE_PUBLISHABLE_KEY,'Content-Type':'application/json'},body:JSON.stringify({email:'bedel@demo.local',password:back.AULAS_DEMO_PASSWORD})});
if(!auth.ok)throw Error('Login HTTP '+auth.status);
const {access_token}=await auth.json();
try {
 const inventoryResponse=await fetch('http://127.0.0.1:8080/api/reservas',{headers:{Authorization:'Bearer '+access_token},signal:AbortSignal.timeout(60000)});
 if(!inventoryResponse.ok)throw Error('Inventario HTTP '+inventoryResponse.status);
 const inventory=await inventoryResponse.json();
 const dataset={reservations:inventory.length,details:inventory.reduce((n,b)=>n+b.occurrences.length,0)};
 const cases=[
  ['listado20','GET','/consultas/listado?mode=day&date=2027-08-23&page=0&size=20'],
  ['impresion104','GET','/consultas/impresion-diaria?date=2027-08-23'],
  ['agendaSemana','GET','/consultas/agenda?date=2027-08-23&view=week'],
  ['indicadoresDia','GET','/indicadores/serie?from=2027-08-23&to=2027-08-23&view=day'],
  ['indicadoresSemana','GET','/indicadores/serie?from=2027-08-23&to=2027-08-27&view=week'],
  ['disponibilidadPeriodica','POST','/reservas/periodicas/preparacion',{year:2027,courseId:null,period:'first',students:24,type:'Laboratorio',board:'',resources:['fans'],excluded:[],patterns:[{day:2,start:'14:00',modules:4}]}],
 ];
 const results=[];
 for(const [name,method,path,body] of cases){
  const samples=[],statuses=[];
  for(let i=0;i<6;i++){
   const start=performance.now();
   const r=await fetch('http://127.0.0.1:8080/api'+path,{method,headers:{Authorization:'Bearer '+access_token,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(60000)});
   await r.arrayBuffer();const elapsed=performance.now()-start;
   if(i>0){samples.push(Math.round(elapsed*100)/100);statuses.push(r.status)}
  }
  const sorted=[...samples].sort((a,b)=>a-b);
  results.push({name,method,path,samplesMs:samples,statuses,p50Ms:sorted[2],p95Ms:sorted[4],errors:statuses.filter(s=>s!==200).length});
  console.log(name,'p95',sorted[4],'ms; errors',results.at(-1).errors);
 }
 const report={date:new Date().toISOString(),commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),workingTreeDirty:Boolean(execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim()),collectorSha256:createHash('sha256').update(readFileSync(new URL(import.meta.url))).digest('hex'),kind:'referencia secuencial de lecturas; NO protocolo RNF',environment:{backend:'Java local, puerto8080',database:'Supabase PostgreSQL17.6 remoto, us-west-2',auth:'Supabase real; login fuera de medición',os:platform()+' '+release(),cpu:cpus()[0].model,logicalCpus:cpus().length,memoryGiB:Math.round(totalmem()/1024**3),node:process.version},dataset,protocol:{sessions:1,warmupRequestsPerOperation:1,measuredRequestsPerOperation:5,pauseAfterResponseMs:0,includes:'HTTP, transferencia y consumo del cuerpo; sin render',limitations:'Muestra descriptiva pequeña; no acredita p95 RNF ni extrapola disponibilidad bajo50 sesiones. No asigna umbrales RNF a indicadores o impresión.'},results};
 writeFileSync(process.argv[2]||'docs/evidencias/i05-lecturas.json',JSON.stringify(report,null,2)+'\n');
 if(results.some(r=>r.errors))process.exitCode=1;
} finally {
 const r=await fetch(front.VITE_SUPABASE_URL+'/auth/v1/logout?scope=local',{method:'POST',headers:{apikey:front.VITE_SUPABASE_PUBLISHABLE_KEY,Authorization:'Bearer '+access_token}});
 if(!r.ok)throw Error('Logout temporal HTTP '+r.status);
}
