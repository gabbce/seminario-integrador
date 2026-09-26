// Read-only domain inventory; credentials stay in memory. Run from repository root.
import {readFileSync,writeFileSync} from 'node:fs';
const readEnv=(file)=>Object.fromEntries(readFileSync(file,'utf8').split(/\r?\n/).filter(s=>s&&!s.startsWith('#')&&s.includes('=')).map(s=>{const i=s.indexOf('=');return [s.slice(0,i),s.slice(i+1).replaceAll('\\\\','\\')]}));
const front=readEnv('frontend/.env.local'),back=readEnv('backend/.env');
const auth=await fetch(front.VITE_SUPABASE_URL+'/auth/v1/token?grant_type=password',{method:'POST',headers:{apikey:front.VITE_SUPABASE_PUBLISHABLE_KEY,'Content-Type':'application/json'},body:JSON.stringify({email:'bedel@demo.local',password:back.AULAS_DEMO_PASSWORD})});
if(!auth.ok)throw Error('Auth status '+auth.status);
const token=(await auth.json()).access_token;
const apiOrigin=process.env.AULAS_API_ORIGIN||'http://127.0.0.1:8080';
const get=async(path)=>{const r=await fetch(apiOrigin+'/api'+path,{headers:{Authorization:'Bearer '+token}});if(!r.ok)throw Error(path+' status '+r.status);return r.json()};
const post=async(path,body)=>{const r=await fetch(apiOrigin+'/api'+path,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(body)});if(!r.ok)throw Error(path+' status '+r.status);return r.json()};
const lab=(start,modules)=>post('/reservas/periodicas/preparacion',{year:2027,courseId:null,period:'first',students:24,type:'Laboratorio',board:'',resources:['fans'],excluded:[],patterns:[{day:2,start,modules}]});
const manual=()=>post('/reservas/esporadicas/preparacion',{year:2027,courseId:null,students:20,type:'General',board:'',resources:[],dates:[{date:'2027-07-27',start:'08:00',modules:2},{date:'2027-07-29',start:'08:00',modules:2}]});
try {
const calendars=await get('/referencias/calendarios');
const courses={};for(const c of calendars)courses[c.year]=await get('/referencias/cursos?year='+c.year);
const data={calendars,courses,reservations:await get('/reservas'),rooms:await get('/referencias/aulas'),protected:{ranking:await lab('14:00',4),adjacent:await lab('16:00',2),manual:await manual()}};
writeFileSync(process.argv[2]||'/tmp/i05-inventory.json',JSON.stringify(data,null,2),{mode:0o600});
console.log('Read-only inventory:',data.reservations.length,'reservations,',data.rooms.length,'rooms');

} finally {
const logout=await fetch(front.VITE_SUPABASE_URL+'/auth/v1/logout?scope=local',{method:'POST',headers:{apikey:front.VITE_SUPABASE_PUBLISHABLE_KEY,Authorization:'Bearer '+token}});
if(!logout.ok)throw Error('Local session logout status '+logout.status);
}
