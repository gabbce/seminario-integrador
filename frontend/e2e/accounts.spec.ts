import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {fakeAuth,login} from './auth-fixture';
for(const width of [390,1440]) test(`cuentas persistidas: edición y filtros a ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:1000});await fakeAuth(page);
 let user={id:'2',version:0,name:'Bedel',surname:'Demo',email:'bedel@demo.local',role:'Bedel',active:true,shift:'TARDE',staffId:null};
 await page.route('**/api/administracion/cuentas**',async route=>{
  if(route.request().method()==='PUT'){const incoming=route.request().postDataJSON();expect(incoming.version).toBe(user.version);user={...user,...incoming,version:user.version+1};await route.fulfill({json:user});return;}
  const params=new URL(route.request().url()).searchParams;
  const items=params.get('query')==='ausente'?[]:[user];
  await route.fulfill({json:{items,total:items.length,page:1,size:20,activeAdmins:1}});
 });
 await page.goto('/');await login(page,'admin');await expect(page.getByRole('heading',{name:'8 de septiembre de 2026'})).toBeVisible();
 await page.goto('/administracion');await page.getByRole('button',{name:'Editar bedel@demo.local'}).click();
 await page.getByLabel('Nombre',{exact:true}).fill('Bedel editado');
 await page.getByRole('button',{name:'Guardar cuenta',exact:true}).click();await expect(page.getByRole('status')).toContainText('Cuenta guardada');
 await page.reload();await expect(page.getByText('Bedel editado Demo',{exact:true})).toBeVisible();
 await page.screenshot({path:`evidence/i021-cuentas-${width}.png`,fullPage:true});
 expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze()).violations).toEqual([]);
 await page.getByLabel('Buscar nombre o correo').fill('ausente');await expect(page.getByText('No hay cuentas coincidentes.')).toBeVisible();
});
