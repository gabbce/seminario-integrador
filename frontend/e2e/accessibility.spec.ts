import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
for(const width of [390,768,1440]) test(`pantallas principales accesibles a ${width}px`,async({page},info)=>{
 test.setTimeout(90000);
 await page.setViewportSize({width,height:1000});await page.goto('/');
 async function audit(name:string) {
  const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();
  await info.attach(`${name}-${width}`,{body:JSON.stringify(result),contentType:'application/json'});
  expect.soft(result.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,message:n.failureSummary}))})),name).toEqual([]);
  expect.soft(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${name} ancho`).toBe(true);
 }
 await audit('ingreso');
 await page.getByLabel('Correo electrónico').fill('admin@demo.local');await page.getByLabel('Contraseña',{exact:true}).fill('Aulas2026');await page.getByRole('button',{name:'Ingresar',exact:true}).click();
 await expect(page.getByLabel('Fecha de agenda')).toHaveValue('2026-09-08');
 await page.getByLabel('Fecha de agenda').fill('2026-09-14');
 const routes=['/agenda','/reservas/nueva','/disponibilidad','/reservas','/reservas/R-002','/aulas','/administracion','/administracion/calendario','/indicadores'];
 for(const route of routes) {
  await page.evaluate(route=>{history.pushState({},'',route);dispatchEvent(new PopStateEvent('popstate'))},route);
  await expect(page.locator('main h1:visible')).toBeVisible();
  if(route==='/indicadores')await expect(page.locator('canvas')).toHaveCount(2);
  await audit(route);
  if(width===768)await page.screenshot({path:`evidence/audit-${route.replaceAll('/','-')}-768.png`,fullPage:true,animations:'disabled'});
 }
});

test('ingreso con teclado y navegación conserva fecha sin reabrir una ruta privada',async({page})=>{
 await page.goto('/');
 await page.keyboard.press('Tab');await expect(page.getByLabel('Correo electrónico')).toBeFocused();
 await page.keyboard.type('admin@demo.local');await page.keyboard.press('Tab');await page.keyboard.type('Aulas2026');
 await page.keyboard.press('Tab');await page.keyboard.press('Tab');await page.keyboard.press('Enter');
 await expect(page.getByLabel('Fecha de agenda')).toHaveValue('2026-09-08');
 await page.getByLabel('Fecha de agenda').fill('2026-09-21');
 await page.getByRole('link',{name:'Reservas',exact:true}).click();
 await page.goBack();await expect(page.getByLabel('Fecha de agenda')).toHaveValue('2026-09-21');
 const today=page.getByRole('button',{name:'Hoy',exact:true});await today.focus();await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');
 await expect(today).toBeFocused();
 expect(await today.evaluate(e=>getComputedStyle(e).outlineStyle)).not.toBe('none');
 await page.keyboard.press('Enter');await expect(page.getByLabel('Fecha de agenda')).toHaveValue('2026-09-08');
 await page.getByRole('link',{name:'Administración',exact:true}).click();
 await page.getByRole('button',{name:'Cerrar sesión'}).click();
 await page.getByLabel('Correo electrónico').fill('admin@demo.local');await page.getByLabel('Contraseña',{exact:true}).fill('Aulas2026');await page.getByRole('button',{name:'Ingresar',exact:true}).click();
 await expect(page).toHaveURL(/agenda/);
 await page.evaluate(()=>{history.pushState({},'','/reservas/no-existe');dispatchEvent(new PopStateEvent('popstate'))});
 await expect(page.getByRole('heading',{name:'Reserva no encontrada'})).toBeVisible();await page.getByRole('button',{name:'Volver a reservas'}).click();await expect(page).toHaveURL(/reservas$/);
});
