import {test,expect} from '@playwright/test';
test('impresión real de 30 clases incluye todas las páginas y respeta filtros',async({page})=>{
 await page.goto('/');await page.locator('.demo-controls summary').click();await page.getByLabel('Escenario',{exact:true}).selectOption('many');await page.getByRole('button',{name:'Aplicar escenario y reiniciar'}).click();
 await page.getByLabel('Correo electrónico').fill('bedel@demo.local');await page.getByLabel('Contraseña',{exact:true}).fill('Aulas2026');await page.getByRole('button',{name:'Ingresar',exact:true}).click();await page.getByRole('link',{name:'Reservas',exact:true}).click();
 await expect(page.locator('.screen-list tbody tr')).toHaveCount(20);await expect(page.locator('.print-list tbody tr')).toHaveCount(30);
 await page.getByRole('button',{name:'Siguiente',exact:true}).click();await expect(page.locator('.screen-list tbody tr')).toHaveCount(10);
 await page.emulateMedia({media:'print'});await expect(page.locator('.topbar')).toBeHidden();await expect(page.locator('.demo-controls')).toBeHidden();await expect(page.locator('.screen-list')).toBeHidden();await expect(page.locator('.print-list')).toBeVisible();
 await page.pdf({path:'evidence/listado-app-30.pdf',preferCSSPageSize:true,printBackground:true});
 await page.emulateMedia({media:'screen'});await page.getByLabel('Aula del listado').selectOption('D30');await expect(page.locator('.print-list tbody tr')).toHaveCount(1);
 await page.emulateMedia({media:'print'});await page.pdf({path:'evidence/listado-app-filtrado.pdf',preferCSSPageSize:true,printBackground:true});
 await expect(page.locator('.print-list')).toContainText('Aula: D30');await expect(page.locator('.print-list tbody')).toContainText('D30');
});
