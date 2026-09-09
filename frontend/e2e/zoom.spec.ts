import {test,expect} from '@playwright/test';
import {resolve} from 'node:path';
import {mkdirSync,writeFileSync} from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
test('zoom nativo 200% conserva pantallas y formularios operables',async({playwright},info)=>{
 test.setTimeout(90000);
 mkdirSync('evidence',{recursive:true});
 const extension=resolve('e2e/fixtures/zoom-extension');
 const context=await playwright.chromium.launchPersistentContext('',{channel:'chromium',headless:true,viewport:null,locale:'es-AR',args:['--window-size=1440,1000',`--disable-extensions-except=${extension}`,`--load-extension=${extension}`]});
 try {
 const page=await context.newPage();await page.goto('http://127.0.0.1:5173');
 const worker=context.serviceWorkers()[0]??await context.waitForEvent('serviceworker');
 const cdp=await context.newCDPSession(page);
 const before=await page.evaluate(()=>({width:innerWidth,dpr:devicePixelRatio}));
 const zoom=await worker.evaluate(`(async()=>{const tabs=await chrome.tabs.query({});const tab=tabs.find(t=>t.url.startsWith('http://127.0.0.1:5173'));await chrome.tabs.setZoom(tab.id,2);return chrome.tabs.getZoom(tab.id)})()`);
 expect(zoom).toBe(2);await expect.poll(()=>page.evaluate(()=>devicePixelRatio)).toBe(before.dpr*2);
 expect(await page.evaluate(()=>innerWidth)).toBeLessThanOrEqual(before.width/2+1);
 async function audit(name:string){
  expect.soft(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),name+' ancho').toBe(true);
  const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();
  expect.soft(result.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,message:n.failureSummary}))})),name).toEqual([]);
  await info.attach(name,{body:JSON.stringify(result),contentType:'application/json'});
  await page.evaluate(()=>scrollTo(0,0));
  const capture=await cdp.send('Page.captureScreenshot',{format:'png'});
  writeFileSync(`evidence/zoom-200-${name}.png`,Buffer.from(capture.data,'base64'));
  await info.attach(`${name}-geometry`,{body:JSON.stringify(await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,dpr:devicePixelRatio}))),contentType:'application/json'});
 }
 await audit('ingreso');await page.getByLabel('Correo electrónico').fill('admin@demo.local');await page.getByLabel('Contraseña',{exact:true}).fill('Aulas2026');await page.getByRole('button',{name:'Ingresar',exact:true}).click();
 const routes=['/agenda','/reservas/nueva','/disponibilidad','/reservas','/reservas/R-002','/aulas','/administracion','/administracion/calendario','/indicadores'];
 for(const route of routes){await page.evaluate(route=>{history.pushState({},'',route);dispatchEvent(new PopStateEvent('popstate'))},route);await expect(page.locator('main h1:visible')).toBeVisible();if(route==='/indicadores')await expect(page.locator('canvas')).toHaveCount(2);await audit(route.replaceAll('/','-'));
  if(route==='/reservas/nueva'){
   await page.getByRole('button',{name:'Buscar aulas'}).click();await page.getByRole('group',{name:/Lunes/}).getByRole('radio').first().check();await page.getByRole('group',{name:/Miércoles/}).getByRole('radio').first().check();await audit('asignacion');
   await page.getByRole('button',{name:'Revisar reserva'}).click();await audit('revision');await page.getByRole('button',{name:'Confirmar reserva'}).click();await expect(page.getByRole('heading',{name:'Reserva confirmada'})).toBeVisible();await audit('confirmacion');
  }
  if(route==='/aulas'){await page.getByRole('button',{name:'Nueva aula',exact:true}).click();await audit('form-aula');await page.getByLabel('Identificador',{exact:true}).fill('Z01');await page.getByLabel('Ubicación / edificio',{exact:true}).fill('Edificio de prueba');await page.getByRole('button',{name:'Guardar aula',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'Aula guardada'})).toBeVisible();}
  if(route==='/administracion'){await page.getByRole('button',{name:'Nueva cuenta',exact:true}).click();await audit('form-usuario');}
 }
 }finally{await context.close();}
});
