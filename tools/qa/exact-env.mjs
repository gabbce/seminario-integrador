// Disposable local PostgreSQL + real Supabase login/JWT validation. No remote domain data writes.
import {spawn,spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync,openSync,chmodSync,fchmodSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {randomBytes} from 'node:crypto';
import {createServer} from 'node:net';
const root=fileURLToPath(new URL('../..',import.meta.url));
const directory=resolve(root,'artifacts/qa/exact');
const container='aulas-qa-exact';
const children=[];let owned=false,cleaning=false,containerId;
function run(command,args,input,environment=process.env){
 const r=spawnSync(command,args,{input,encoding:'utf8',env:environment,maxBuffer:5*1024*1024});
 if(r.status!==0)throw Error(`${command} failed: ${r.stderr||r.error||'exit '+r.status}`);
 return r.stdout.trim();
}
async function cleanup(){
 if(cleaning)return;cleaning=true;
 for(const child of children)try{process.kill(-child.pid,'SIGTERM')}catch{}
 if(owned)run('docker',['rm','-f',containerId]);
}
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{cleanup().finally(()=>process.exit(0))});
const envFile=file=>Object.fromEntries(readFileSync(file,'utf8').split(/\r?\n/).filter(s=>s&&!s.startsWith('#')&&s.includes('=')).map(s=>{const n=s.indexOf('=');return [s.slice(0,n),s.slice(n+1).replaceAll('\\\\','\\')]}));
function launch(command,args,cwd,log,environment=process.env){
 const fd=openSync(resolve(directory,log),'w',0o600);fchmodSync(fd,0o600);
 const child=spawn(command,args,{cwd,env:environment,stdio:['ignore',fd,fd],detached:true});children.push(child);
 child.on('error',error=>console.error(error.message));return child;
}
async function ready(url,child){
 for(let n=0;n<120;n++){
  if(child.exitCode!==null)throw Error('Proceso terminado; revisar log privado.');
  try{if((await fetch(url,{signal:AbortSignal.timeout(1500)})).ok)return}catch{}
  await new Promise(r=>setTimeout(r,1000));
 }
 throw Error('El proceso no quedó listo en120s; revisar log privado.');
}
try {
 for(const port of [8081,5176])await new Promise((resolve,reject)=>{
  const probe=createServer();probe.once('error',()=>reject(Error(`Puerto ${port} ocupado; no se detiene ningún servicio ajeno.`)));
  probe.listen(port,'127.0.0.1',()=>probe.close(resolve));
 });
 // Refuse to adopt/delete existing containers; no external database URL is accepted.
 const existing=spawnSync('docker',['inspect',container],{stdio:'ignore'});
 if(existing.status===0)throw Error(`Ya existe ${container}. No se modifica. Revisá ese entorno antes de volver a iniciar.`);
 const front=envFile(resolve(root,'frontend/.env.local')),back=envFile(resolve(root,'backend/.env'));
 const profiles=[];
 for(const [email,role,active] of [['admin@demo.local','ADMINISTRADOR',true],['bedel@demo.local','BEDEL',true],['docente@demo.local','DOCENTE',true],['inhabilitado@demo.local','DOCENTE',false]]){
  const response=await fetch(front.VITE_SUPABASE_URL+'/auth/v1/token?grant_type=password',{method:'POST',headers:{apikey:front.VITE_SUPABASE_PUBLISHABLE_KEY,'Content-Type':'application/json'},body:JSON.stringify({email,password:back.AULAS_DEMO_PASSWORD})});
  if(!response.ok)throw Error('No se pudo autenticar cuenta demo: '+email+' (HTTP '+response.status+')');
  const {user,access_token}=await response.json();
  // End only the temporary login created above, preserving every other session.
  const logout=await fetch(front.VITE_SUPABASE_URL+'/auth/v1/logout?scope=local',{method:'POST',headers:{apikey:front.VITE_SUPABASE_PUBLISHABLE_KEY,Authorization:'Bearer '+access_token}});
  if(!logout.ok)throw Error('No se pudo cerrar la sesión temporal de preparación (HTTP '+logout.status+')');
  if(!/^[0-9a-f-]{36}$/i.test(user.id))throw Error('UUID de Auth inválido');
  profiles.push({email,role,active,id:user.id});
 }
 mkdirSync(directory,{recursive:true,mode:0o700});chmodSync(directory,0o700);
 const password=randomBytes(24).toString('base64url');
 containerId=run('docker',['run','-d','--name',container,'--label','aulas.qa=exact','-e','POSTGRES_USER=qa','-e','POSTGRES_DB=aulas_qa_exact','-e','POSTGRES_PASSWORD','-p','127.0.0.1::5432','postgres:17.6-alpine'],undefined,{...process.env,POSTGRES_PASSWORD:password});owned=true;
 const port=run('docker',['port',containerId,'5432/tcp']).split(':').at(-1);
 const config=resolve(directory,'backend.properties');
 if(existsSync(config))chmodSync(config,0o600);
 writeFileSync(config,`spring.datasource.url=jdbc:postgresql://127.0.0.1:${port}/aulas_qa_exact\nspring.datasource.username=qa\nspring.datasource.password=${password}\naulas.auth.issuer=${front.VITE_SUPABASE_URL}/auth/v1\naulas.auth.jwks=${front.VITE_SUPABASE_URL}/auth/v1/.well-known/jwks.json\nserver.port=8081\n`,{mode:0o600});
 chmodSync(config,0o600);
 const backend=launch('./mvnw',['-q','spring-boot:run',`-Dspring-boot.run.arguments=--spring.config.import=file:${config}`],resolve(root,'backend'),'backend.log');
 await ready('http://127.0.0.1:8081/api/health',backend);
 let sql='begin;\n';
 for(const p of profiles){
  sql+=`insert into aulas.usuario(supabase_auth_id,email,nombre,apellido,rol,activo) values ('${p.id}','${p.email}','QA','${p.role}','${p.role}',${p.active});\n`;
  const subtype=p.role==='ADMINISTRADOR'?'administrador':p.role==='BEDEL'?'bedel':'docente';
  sql+=`insert into aulas.${subtype}(id_usuario) select id_usuario from aulas.usuario where supabase_auth_id='${p.id}';\n`;
 }
 sql+=readFileSync(resolve(root,'tools/qa/fixtures-exact.sql'),'utf8')+'\ncommit;';
 run('docker',['exec','-i',containerId,'psql','-v','ON_ERROR_STOP=1','-U','qa','-d','aulas_qa_exact'],sql);
 const frontend=launch('npm',['run','dev','--','--port','5176','--strictPort'],resolve(root,'frontend'),'frontend.log',{...process.env,AULAS_API_TARGET:'http://127.0.0.1:8081'});
 await ready('http://127.0.0.1:5176',frontend);
 console.log('QA exacto listo: http://127.0.0.1:5176 · PostgreSQL temporal local, Supabase Auth real.');
 console.log('Ctrl+C detiene este entorno y elimina únicamente su contenedor temporal.');
 await Promise.race(children.map(child=>new Promise(resolve=>child.once('exit',resolve))));
 throw Error('Un proceso del entorno terminó; revisar logs privados.');
} catch(error){console.error(error.message);process.exitCode=1;} finally {await cleanup();}
