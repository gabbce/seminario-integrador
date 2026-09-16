import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
test('conflicto tardío identifica ambas fechas y conserva preparación sin guardar parcialmente',async({page})=>{
 await page.goto('/');await page.getByLabel('Correo electrónico').fill('bedel@demo.local');await page.getByLabel('Contraseña',{exact:true}).fill('Aulas2026');await page.getByRole('button',{name:'Ingresar',exact:true}).click();
 await page.getByRole('button',{name:'Nueva reserva',exact:true}).click();await page.getByRole('button',{name:'Buscar aulas'}).click();
 await page.getByRole('group',{name:/Lunes/}).getByRole('radio',{name:/Aula 203/}).check();await page.getByRole('group',{name:/Miércoles/}).getByRole('radio',{name:/Aula 105/}).check();await page.getByRole('button',{name:'Revisar reserva'}).click();
 await page.locator('.demo-controls summary').click();await page.getByRole('button',{name:'Ocupar Aula 203 · 14 y 21/09 · 14–16'}).click();
 await page.getByRole('button',{name:'Confirmar reserva'}).click();
 const alert=page.getByRole('alert');await expect(alert).toContainText('14 de septiembre de 2026');await expect(alert).toContainText('21 de septiembre de 2026');await expect(alert).toContainText('no se guardó ninguna clase');
 await expect(page.getByRole('button',{name:'Revisar reserva'})).toBeVisible();await alert.scrollIntoViewIfNeeded();await page.screenshot({path:'evidence/conflicto-confirmacion-desktop.png'});
 await page.setViewportSize({width:390,height:844});await alert.scrollIntoViewIfNeeded();await page.screenshot({path:'evidence/conflicto-confirmacion-mobile.png'});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze()).violations).toEqual([]);
 await page.getByRole('button',{name:'Volver',exact:true}).click();await expect(page.getByLabel('Cantidad de alumnos prevista',{exact:true})).toHaveValue('30');await page.getByRole('button',{name:'Buscar aulas'}).click();
 await page.getByRole('group',{name:/Lunes/}).getByRole('radio').first().check();await page.getByRole('button',{name:'Revisar reserva'}).click();await page.getByRole('button',{name:'Confirmar reserva'}).click();await page.getByRole('button',{name:'Ver detalle'}).click();await expect(page.getByRole('heading',{name:'26 clases registradas'})).toBeVisible();
 await page.getByRole('button',{name:'Menú',exact:true}).click();await page.getByRole('link',{name:'Agenda',exact:true}).click();await page.getByLabel('Fecha de agenda').fill('2026-09-14');await expect(page.locator('.mobile-booking').filter({hasText:'Matemática I'})).toHaveCount(1);
});
