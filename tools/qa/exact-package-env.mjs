// Same exact fixtures as I05, served by the final Docker image. No remote domain writes.
import {spawn,spawnSync} from 'node:child_process';
import {readFileSync,mkdirSync,chmodSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {randomBytes} from 'node:crypto';
import {createServer} from 'node:net';
const root=fileURLToPath(new URL('../..',import.meta.url)),out=resolve(root,'artifacts/qa/exact-package');
const scenario=process.argv.includes('--operations')?'operations':'exact';
const name='aulas-qa-exact-package',owned=[];let network,cleaning=false,monitor;
const image=process.env.AULAS_QA_IMAGE||'aulas-demo:local';
function run(command,args,input,env=process.env){const r=spawnSync(command,args,{input,env,encoding:'utf8',maxBuffer:5*1024*1024});if(r.status!==0)throw Error(command+' failed (private output omitted)');return r.stdout.trim();}
function cleanup(){if(cleaning)return;cleaning=true;monitor?.kill();for(const id of [...owned].reverse())spawnSync('docker',['rm','-f',id],{stdio:'ignore'});if(network)spawnSync('docker',['network','rm',network],{stdio:'ignore'});}
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{cleanup();process.exit(0)});
const envFile=file=>Object.fromEntries(readFileSync(file,'utf8').split(/\r?\n/).filter(s=>s&&!s.startsWith('#')&&s.includes('=')).map(s=>{const n=s.indexOf('=');return [s.slice(0,n),s.slice(n+1).replaceAll('\\\\','\\')]}));
try {
 await new Promise((resolve,reject)=>{const probe=createServer();probe.once('error',()=>reject(Error('Puerto 5176 ocupado; no se detiene ningún servicio ajeno.')));probe.listen(5176,'127.0.0.1',()=>probe.close(resolve));});
 for(const target of [name+'-db',name+'-app'])if(spawnSync('docker',['inspect',target],{stdio:'ignore'}).status===0)throw Error('Ya existe '+target+'; no se adopta ni elimina.');
 const front=envFile(resolve(root,'frontend/.env.local')),back=envFile(resolve(root,'backend/.env'));const profiles=[];
 for(const [email,role,active] of [['admin@demo.local','ADMINISTRADOR',true],['bedel@demo.local','BEDEL',true],['docente@demo.local','DOCENTE',true],['inhabilitado@demo.local','DOCENTE',false]]){
  const response=await fetch(front.VITE_SUPABASE_URL+'/auth/v1/token?grant_type=password',{method:'POST',headers:{apikey:front.VITE_SUPABASE_PUBLISHABLE_KEY,'Content-Type':'application/json'},body:JSON.stringify({email,password:back.AULAS_DEMO_PASSWORD})});
  if(!response.ok)throw Error('No se pudo autenticar cuenta demo '+email+' (HTTP '+response.status+')');
  const {user,access_token}=await response.json();
  try {if(!/^[0-9a-f-]{36}$/i.test(user.id))throw Error('UUID Auth inválido');profiles.push({email,role,active,id:user.id});}
  finally {const logout=await fetch(front.VITE_SUPABASE_URL+'/auth/v1/logout?scope=local',{method:'POST',headers:{apikey:front.VITE_SUPABASE_PUBLISHABLE_KEY,Authorization:'Bearer '+access_token}});if(!logout.ok)throw Error('No se pudo cerrar sesión temporal.');}
 }
 mkdirSync(out,{recursive:true,mode:0o700});chmodSync(out,0o700);
 network=run('docker',['network','create','--label','aulas.qa=exact-package',name+'-'+randomBytes(5).toString('hex')]);
 const password=randomBytes(24).toString('base64url');
 const db=run('docker',['run','-d','--name',name+'-db','--label','aulas.qa=exact-package','--network',network,'-e','POSTGRES_USER=qa','-e','POSTGRES_DB=aulas_qa_exact','-e','POSTGRES_PASSWORD','postgres:17.6-alpine'],undefined,{...process.env,POSTGRES_PASSWORD:password});owned.push(db);
 for(let n=0;n<60;n++){if(spawnSync('docker',['exec',db,'pg_isready','-U','qa','-d','aulas_qa_exact'],{stdio:'ignore'}).status===0)break;if(n===59)throw Error('PostgreSQL no inició.');await new Promise(r=>setTimeout(r,1000));}
 const runtime={...process.env,SPRING_DATASOURCE_URL:`jdbc:postgresql://${name}-db:5432/aulas_qa_exact`,SPRING_DATASOURCE_USERNAME:'qa',SPRING_DATASOURCE_PASSWORD:password,AULAS_SUPABASE_URL:front.VITE_SUPABASE_URL};
 const args=['run','-d','--name',name+'-app','--label','aulas.qa=exact-package','--network',network,'-p','127.0.0.1:5176:8080'];for(const key of ['SPRING_DATASOURCE_URL','SPRING_DATASOURCE_USERNAME','SPRING_DATASOURCE_PASSWORD','AULAS_SUPABASE_URL'])args.push('-e',key);
 const app=run('docker',[...args,image],undefined,runtime);owned.push(app);
 let ready=false;for(let n=0;n<120;n++){try{if((await fetch('http://127.0.0.1:5176/api/health',{signal:AbortSignal.timeout(1000)})).ok){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,1000));}if(!ready)throw Error('El paquete no quedó saludable; revisar su contenedor.');
 let sql='begin;\n';for(const p of profiles){sql+=`insert into aulas.usuario(supabase_auth_id,email,nombre,apellido,rol,activo) values ('${p.id}','${p.email}','QA','${p.role}','${p.role}',${p.active});\n`;const subtype=p.role==='ADMINISTRADOR'?'administrador':p.role==='BEDEL'?'bedel':'docente';sql+=`insert into aulas.${subtype}(id_usuario) select id_usuario from aulas.usuario where supabase_auth_id='${p.id}';\n`;}
 sql+=(scenario==='exact'?readFileSync(resolve(root,'tools/qa/fixtures-exact.sql'),'utf8'):'')+'\ncommit;';run('docker',['exec','-i',db,'psql','-X','-v','ON_ERROR_STOP=1','-U','qa','-d','aulas_qa_exact'],sql);
 if(scenario==='operations')for(const command of ['seed-catalogos','seed-reservas','seed-operacion-i04'])run('docker',['exec',app,'java','-jar','/app/aulas.jar','--spring.main.web-application-type=none','--AULAS_ENVIRONMENT=demo','--aulas.command='+command]);
 const imageId=run('docker',['image','inspect',image,'--format','{{.Id}}']);writeFileSync(resolve(out,'environment.json'),JSON.stringify({imageId,scenario,appContainerId:app,databaseContainerId:db,origin:'http://127.0.0.1:5176',database:'disposable local PostgreSQL 17.6',authentication:'real Supabase; existing identities; no account creation',manualAcceptance:'pending'},null,2)+'\n',{mode:0o600});
 console.log('QA '+scenario+' del paquete listo: http://127.0.0.1:5176 · PostgreSQL temporal local, Supabase Auth real.');console.log('Ctrl+C elimina exclusivamente estos dos contenedores y su red.');
 monitor=spawn('docker',['wait',app],{stdio:'ignore'});await new Promise((resolve,reject)=>{monitor.once('exit',resolve);monitor.once('error',reject)});throw Error('El contenedor de la aplicación terminó.');
} catch(error){console.error(error.message);process.exitCode=1;} finally {cleanup();}
