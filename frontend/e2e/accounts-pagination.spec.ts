import {test,expect} from '@playwright/test';
test('cuentas admite 20, 50 y 100 resultados y conserva filtros',async({page})=>{
 test.setTimeout(60000);
 await page.goto('/');await page.getByLabel('Correo electrónico').fill('admin@demo.local');await page.getByLabel('Contraseña',{exact:true}).fill('Aulas2026');await page.getByRole('button',{name:'Ingresar',exact:true}).click();await page.getByRole('link',{name:'Administración',exact:true}).click();
 for(let i=1;i<=22;i++){
  await page.getByRole('button',{name:'Nueva cuenta',exact:true}).click();await page.getByLabel('Nombre',{exact:true}).fill('Cuenta');await page.getByLabel('Apellido',{exact:true}).fill(`Prueba ${String(i).padStart(2,'0')}`);await page.getByLabel('Correo de acceso',{exact:true}).fill(`cuenta${i}@example.test`);await page.getByLabel('Nueva contraseña',{exact:true}).fill('Clave2026');await page.getByLabel('Confirmar contraseña',{exact:true}).fill('Clave2026');await page.getByRole('button',{name:'Guardar cuenta',exact:true}).click();await expect(page.getByRole('status')).toContainText('Cuenta guardada');
 }
 const cards=page.locator('.inventory-list article');await expect(cards).toHaveCount(20);await page.getByRole('button',{name:'Siguiente',exact:true}).click();await expect(cards).toHaveCount(5);
 await page.getByLabel('Cuentas por página').selectOption('50');await expect(cards).toHaveCount(25);await expect(page.getByText('Página 1 de 1',{exact:true})).toBeVisible();await page.getByLabel('Cuentas por página').selectOption('100');await expect(cards).toHaveCount(25);
 await page.getByLabel('Cuentas por página').selectOption('20');await page.getByRole('button',{name:'Siguiente',exact:true}).click();await page.screenshot({path:'evidence/cuentas-paginacion-desktop.png',fullPage:true});await page.setViewportSize({width:390,height:844});await page.screenshot({path:'evidence/cuentas-paginacion-mobile.png',fullPage:true});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.getByLabel('Buscar nombre o correo').fill('cuenta1@');await expect(cards).toHaveCount(1);await page.getByLabel('Cuentas por página').selectOption('50');await expect(cards).toHaveCount(1);await expect(page.getByLabel('Buscar nombre o correo')).toHaveValue('cuenta1@');
});
