// Full document-11 protocol. Fresh isolated containers; no external database configuration accepted.
import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync,chmodSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {randomBytes,randomUUID,generateKeyPairSync,sign,createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import os from 'node:os';
const root=fileURLToPath(new URL('../../..',import.meta.url));
const out=resolve(root,'artifacts/qa/load');mkdirSync(out,{recursive:true,mode:0o700});chmodSync(out,0o700);
const sourceHash=createHash('sha256').update(readFileSync(fileURLToPath(import.meta.url))).digest('hex');
const identity='aulas-load-'+randomBytes(5).toString('hex'),image=process.env.AULAS_LOAD_IMAGE||'aulas-demo:local';
let network,ingress;const owned=[];let stopping=false;
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function pause(ms){const until=performance.now()+ms;do{await sleep(Math.max(1,Math.ceil(until-performance.now())))}while(performance.now()<until)}
function run(cmd,args,options={}){const r=spawnSync(cmd,args,{encoding:'utf8',maxBuffer:50*1024*1024,...options});if(r.status!==0)throw Error(cmd+' failed; '+(r.stderr||r.error||r.status));return r.stdout.trim();}
function docker(args,options){return run('docker',args,options);}
function save(name,value){const path=resolve(out,name);writeFileSync(path,typeof value==='string'?value:JSON.stringify(value,null,2)+'\n',{mode:0o600});chmodSync(path,0o600);}
function cleanup(){if(stopping)return;stopping=true;for(const id of [...owned].reverse())spawnSync('docker',['rm','-f',id],{stdio:'ignore'});if(network)spawnSync('docker',['network','rm',network],{stdio:'ignore'});if(ingress)spawnSync('docker',['network','rm',ingress],{stdio:'ignore'});}
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{cleanup();process.exit(130)});
async function ready(url){for(let n=0;n<120;n++){try{if((await fetch(url,{signal:AbortSignal.timeout(1000)})).ok)return}catch{}await sleep(1000)}throw Error('Application did not become healthy');}
const samples=[],auxiliary=[],pauses=[];let base;
async function call(session,operation,path,body,phase='preparation',extra={}){
 const start=performance.now();let status=0,data,error;
 try{const r=await fetch(base+'/api'+path,{method:body===undefined?'GET':'POST',headers:{Authorization:'Bearer '+session.token,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(30000)});status=r.status;const raw=await r.text();try{data=JSON.parse(raw)}catch{data={message:'Non-JSON response'}}if(!r.ok)error=data.code||'HTTP_'+status;}catch(e){error=e.name;}
 const end=performance.now(),record={session:session.id,role:session.role,operation,phase,startMs:start,endMs:end,durationMs:end-start,status,error,errorCategory:error?(status===0||status>=500?'technical':'validation-or-auth'):undefined,cycle:session.cycle,operationId:body?.operationId,createdReservationId:operation==='periodic-create'?data?.id:undefined,resultVersion:operation.startsWith('periodic-')?data?.version:undefined,...extra};
 (phase==='preparation'||phase==='auxiliary'?auxiliary:samples).push(record);
 if(error && phase==='preparation')throw Error(operation+' preparation failed: '+status+' '+JSON.stringify(data));
 return {data,record};
}
const pct=(values,p)=>{const a=[...values].sort((a,b)=>a-b);return a[Math.max(0,Math.ceil(a.length*p)-1)]??null};
try{
 const imageId=docker(['image','inspect',image,'--format','{{.Id}}']);
 network=docker(['network','create','--internal','--label','aulas.qa=load',identity]);
 const password=randomBytes(24).toString('base64url'),dbName=identity+'-db';
 const db=docker(['run','-d','--name',dbName,'--label','aulas.qa=load','--network',network,'-e','POSTGRES_USER=qa','-e','POSTGRES_DB=aulas_load','-e','POSTGRES_PASSWORD','postgres:17.6-alpine'],{env:{...process.env,POSTGRES_PASSWORD:password}});owned.push(db);
 for(let n=0;n<60;n++){if(spawnSync('docker',['exec',db,'pg_isready','-U','qa','-d','aulas_load'],{stdio:'ignore'}).status===0)break;if(n===59)throw Error('DB not ready');await sleep(1000);}
 const {publicKey,privateKey}=generateKeyPairSync('rsa',{modulusLength:2048});const jwk={...publicKey.export({format:'jwk'}),kid:identity,alg:'RS256',use:'sig'};
 const issuer='http://'+identity+'-jwks:8080/auth/v1';
 const jwks=docker(['run','-d','--name',identity+'-jwks','--label','aulas.qa=load','--network',network,'-e','JWKS_JSON','node:24.14.0-bookworm-slim','node','-e',"require('node:http').createServer((q,s)=>{s.setHeader('Content-Type','application/json');s.end(process.env.JWKS_JSON)}).listen(8080,'0.0.0.0')"],{env:{...process.env,JWKS_JSON:JSON.stringify({keys:[jwk]})}});owned.push(jwks);
 const appEnv={...process.env,SPRING_DATASOURCE_URL:`jdbc:postgresql://${dbName}:5432/aulas_load`,SPRING_DATASOURCE_USERNAME:'qa',SPRING_DATASOURCE_PASSWORD:password,AULAS_AUTH_ISSUER:issuer,AULAS_AUTH_JWKS:issuer+'/.well-known/jwks.json'};
 ingress=docker(['network','create','--label','aulas.qa=load',identity+'-ingress']);
 const appArgs=['create','--name',identity+'-app','--label','aulas.qa=load','--network',ingress,'-p','127.0.0.1::8080'];for(const key of ['SPRING_DATASOURCE_URL','SPRING_DATASOURCE_USERNAME','SPRING_DATASOURCE_PASSWORD','AULAS_AUTH_ISSUER','AULAS_AUTH_JWKS'])appArgs.push('-e',key);
 const app=docker([...appArgs,image],{env:appEnv});owned.push(app);docker(['network','connect',network,app]);docker(['start',app]);base='http://'+docker(['port',app,'8080/tcp']);await ready(base+'/api/health');
 const networkProbe=[];for(let i=0;i<10;i++){const start=performance.now();await (await fetch(base+'/api/health')).text();networkProbe.push(performance.now()-start)}
 const year=new Date().getUTCFullYear(),generator=resolve(root,'tools/qa/load/dataset.py');
 const manifest=JSON.parse(run('python3',[generator,String(year),'--manifest']));save('manifest.json',manifest);
 const sql=run('python3',[generator,String(year)]);save('dataset.sql',sql);
 const sqlResult=docker(['exec','-i',db,'psql','-X','-v','ON_ERROR_STOP=1','-U','qa','-d','aulas_load'],{input:sql});save('dataset.log',sqlResult);
 const scalar=q=>docker(['exec','-i',db,'psql','-X','-v','ON_ERROR_STOP=1','-U','qa','-d','aulas_load','-A','-t'],{input:q});
 const initial={rooms:Number(scalar('select count(*) from aulas.aula')),reservations:Number(scalar('select count(*) from aulas.reserva')),details:Number(scalar('select count(*) from aulas.detalle_reserva'))};
 if(initial.rooms!==30||initial.reservations!==1300||initial.details!==26100)throw Error('Dataset size differs from fixed protocol: '+JSON.stringify(initial));
 const issuedAt=Math.floor(Date.now()/1000),jwt=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
 const sessions=manifest.profiles.map(p=>{const head=jwt({alg:'RS256',kid:identity,typ:'JWT'}),claims=jwt({sub:p.sub,iss:issuer,aud:'authenticated',iat:issuedAt,exp:issuedAt+7200,role:'authenticated',session_id:randomUUID()});const message=head+'.'+claims;return {...p,token:message+'.'+sign('RSA-SHA256',Buffer.from(message),privateKey).toString('base64url'),cycle:0,create:0,modify:0,assignments:[],series:[]};});
 const proposal=(period,patterns)=>({year:manifest.operationalYear,courseId:'11',period,students:20,type:'General',board:'',resources:[],excluded:[],patterns});
 const availability=proposal('first',[{day:2,start:'10:00',modules:2},{day:4,start:'10:00',modules:2}]);
 for(const s of sessions){await call(s,'authenticate','/me');if(s.id>5)continue;const pair=[(s.id-1)*2+1,(s.id-1)*2+2];
  // At most 37 creates per session in 12m; 56 exclusive two-day patterns prepared, alternating 32/64 occurrences.
  for(let n=0;n<56;n++){const start=String(16+Math.floor((n%14)/2)).padStart(2,'0')+((n%2)?':30':':00'),days=Math.floor(n/14)%2===0?[1,2]:[3,4],room=pair[Math.floor(n/28)];const p=proposal(n%2?'annual':'first',days.map(day=>({day,start,modules:1})));
   const prepared=(await call(s,'prepare-create','/reservas/periodicas/preparacion',p)).data;const selections=prepared.patterns.map(pattern=>{const found=pattern.availableRooms.find(r=>r.internalId===String(room));if(!found)throw Error('Assigned create room unavailable');return {day:pattern.day,roomId:found.internalId,roomVersion:found.version,dates:pattern.dates};});
   s.assignments.push({operationId:randomUUID(),proposal:p,teacherId:'D-01',calendarVersion:prepared.calendarVersion,selections});
  }
  for(let n=0;n<2;n++){const p=proposal(n?'annual':'first',[{day:1,start:n?'07:30':'07:00',modules:1},{day:5,start:n?'07:30':'07:00',modules:1}]);const prepared=(await call(s,'prepare-series','/reservas/periodicas/preparacion',p)).data;
   const request={operationId:randomUUID(),proposal:p,teacherId:'D-01',calendarVersion:prepared.calendarVersion,selections:prepared.patterns.map(pattern=>({day:pattern.day,roomId:String(pair[0]),roomVersion:0,dates:pattern.dates}))};
   const booking=(await call(s,'create-owned-series','/reservas/periodicas/confirmacion',request)).data;
   const options=(await call(s,'prepare-modification','/reservas/'+booking.id+'/aulas/opciones',{version:booking.version})).data;
   if(booking.occurrences.length!==(n?64:32))throw Error('Owned series size differs');
   s.series.push({id:booking.id,version:booking.version,period:p.period,pair,current:0,groups:options.groups});
  }
 }
 await call(sessions[5],'preflight-list-day','/consultas/listado?date='+manifest.listingDate+'&page=0&size=20');
 await call(sessions[5],'preflight-list-course','/consultas/listado?mode=course&courseId=11&year='+manifest.operationalYear+'&page=0&size=20');
 const preparedInitial={reservations:Number(scalar('select count(*) from aulas.reserva')),details:Number(scalar('select count(*) from aulas.detalle_reserva'))};
 save('setup.json',{imageId,base,initial,preparedInitial,preparedCreates:280,ownedSeries:10,auxiliaryCount:auxiliary.length});
 save('assignments.json',{seed:manifest.seed,availability,listings:{date:manifest.listingDate,courseId:'11',year:manifest.operationalYear,page:0,size:20},sessions:sessions.filter(s=>s.id<=5).map(s=>({id:s.id,role:s.role,assignments:s.assignments,series:s.series}))});
 console.log('Prepared 26,100 base occurrences, 50 authenticated identities, 280 creation proposals and 10 own series. Starting complete 12-minute protocol.');
 const origin=performance.now(),activations=[];let allActive=null,warmEnd=null,end=null;
 async function worker(s,index){await pause(Math.max(0,origin+index*100-performance.now()));activations.push({session:s.id,plannedMs:origin+index*100,actualMs:performance.now()});if(activations.length===50){allActive=performance.now();warmEnd=allActive+120000;end=warmEnd+600000;}while(end===null||performance.now()<end){const now=performance.now(),phase=allActive===null?'ramp':now<warmEnd?'warmup':'measurement';let result;
   const step=s.cycle%4;
   if(step===0||step===2)result=await call(s,'availability','/reservas/periodicas/preparacion',availability,phase);
   else if(s.id>5){result=step===1?await call(s,'listing-daily','/consultas/listado?date='+manifest.listingDate+'&page=0&size=20',undefined,phase):await call(s,'listing-course','/consultas/listado?mode=course&courseId=11&year='+manifest.operationalYear+'&page=0&size=20',undefined,phase);}
   else if(step===1){const request=s.assignments[s.create++];if(!request)throw Error('Exhausted nominal assignments');result=await call(s,'periodic-create','/reservas/periodicas/confirmacion',request,phase,{period:request.proposal.period,assignmentIndex:s.create-1});}
   else {const series=s.series[s.modify++%2],target=1-series.current;const request={operationId:randomUUID(),version:series.version,selections:series.groups.map(g=>({groupId:g.groupId,detailIds:g.detailIds,roomId:String(series.pair[target]),roomVersion:0}))};result=await call(s,'periodic-modify','/reservas/'+series.id+'/aulas/confirmacion',request,phase,{period:series.period,reservationId:series.id,versionBefore:series.version,targetRoom:series.pair[target]});if(!result.record.error){series.version=result.data.version;series.current=target;}}
   s.cycle++;const waitStart=performance.now();await pause(5000);pauses.push({session:s.id,phase,requestedMs:5000,actualMs:performance.now()-waitStart,responseToNextReadyMs:performance.now()-result.record.endMs});
  }}
 await Promise.all(sessions.map(worker));
 const measured=samples.filter(s=>s.phase==='measurement');const operations={};for(const operation of [...new Set(measured.map(s=>s.operation))]){const rows=measured.filter(s=>s.operation===operation);const threshold=operation.startsWith('periodic-')?2000:1500;operations[operation]={count:rows.length,errors:rows.filter(s=>s.error).length,technicalErrors:rows.filter(s=>s.errorCategory==='technical').length,validationOrAuthErrors:rows.filter(s=>s.errorCategory==='validation-or-auth').length,p50Ms:pct(rows.map(s=>s.durationMs),.5),p95Ms:pct(rows.map(s=>s.durationMs),.95),maxMs:Math.max(...rows.map(s=>s.durationMs)),requestsPerSecond:rows.length/600,thresholdMs:threshold,passed:rows.every(s=>!s.error)&&pct(rows.map(s=>s.durationMs),.95)<threshold,periods:Object.fromEntries(['first','annual'].map(p=>[p,rows.filter(s=>s.period===p).length]))};}
 const report={protocol:'i06-load-v1',imageId,commit:run('git',['rev-parse','HEAD'],{cwd:root}),workingTreeDirty:Boolean(run('git',['status','--porcelain'],{cwd:root})),scriptSha256:sourceHash,datasetSha256:createHash('sha256').update(sql).digest('hex'),generatorSha256:createHash('sha256').update(readFileSync(generator)).digest('hex'),at:new Date().toISOString(),environment:{provider:'local Docker; no Supabase',network:'loopback client→published app; private Docker bridge app→PostgreSQL/JWKS',issuer:'controlled RSA-2048 JWKS; real JWT validation and 50 persisted profiles',cpus:os.cpus().length,cpu:os.cpus()[0].model,memoryBytes:os.totalmem(),node:process.version,postgres:scalar('show server_version'),docker:docker(['version','--format','{{.Server.Version}}']),jvm:docker(['exec',app,'java','--version']),dockerResources:JSON.parse(docker(['info','--format','{"cpus":{{.NCPU}},"memoryBytes":{{.MemTotal}}}'])),loopbackHealthP50Ms:pct(networkProbe,.5),loopbackHealthP95Ms:pct(networkProbe,.95)},timing:{rampPlannedMs:4900,actualRampMs:allActive-origin,warmupMs:120000,measurementMs:600000,measurementStartMs:warmEnd,measurementEndMs:end,pauseRequestedMs:5000,pauseMinMs:Math.min(...pauses.map(p=>p.actualMs)),pauseMaxMs:Math.max(...pauses.map(p=>p.actualMs))},initial,preparedInitial,sessions:50,roles:{Docente:45,Admin:2,Bedel:3},operations,totalMeasured:measured.length,measuredErrors:measured.filter(s=>s.error).length,allPhaseErrors:samples.filter(s=>s.error).length,auxiliaryCount:auxiliary.length,auxiliariesDuringMeasurement:auxiliary.filter(s=>s.startMs>=warmEnd&&s.startMs<end).length,passed:Object.values(operations).every(o=>o.passed)&&samples.every(s=>!s.error),limitation:'Local result does not establish the same latency against remote Supabase; remote I05 sample exceeded target.',manualAcceptance:'pending'};
 save('activations.json',activations);save('samples.json',samples);save('auxiliary.json',auxiliary);save('pauses.json',pauses);save('result.json',report);save('app.log',docker(['logs',app]));console.log(JSON.stringify(report,null,2));
 if(!report.passed)process.exitCode=1;
}finally{cleanup();}
