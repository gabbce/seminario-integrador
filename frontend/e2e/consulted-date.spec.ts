import {test,expect} from '@playwright/test';
test('agenda diaria, semanal y móvil identifican la clase consultada',async({page})=>{
 await page.goto('/');await page.getByLabel('Correo electrónico').fill('bedel@demo.local');await page.getByLabel('Contraseña',{exact:true}).fill('Aulas2026');await page.getByRole('button',{name:'Ingresar',exact:true}).click();
 await page.getByLabel('Fecha de agenda').fill('2026-09-14');
 await page.locator('.booking').filter({hasText:'Física I'}).click();
 const consulted=page.getByRole('region',{name:'Clase consultada'});
 await expect(consulted).toContainText('14 de septiembre de 2026');await expect(consulted).toContainText('14:00–15:30');
 await expect(page.locator('#clase-consultada')).toContainText('Aula 105');
 await page.screenshot({path:'evidence/detalle-fecha-desktop.png',fullPage:true});
 await page.goBack();await page.getByRole('button',{name:'Semana',exact:true}).click();
 await page.locator('.week-booking').filter({hasText:'Álgebra'}).click();await expect(consulted).toContainText('16:00–17:30');
 await page.goBack();await page.getByRole('button',{name:'Día',exact:true}).click();await page.setViewportSize({width:390,height:844});
 await page.locator('.mobile-booking').filter({hasText:'Historia'}).click();await expect(consulted).toContainText('13:00–14:30');await expect(consulted).toContainText('Aula 108');
 await page.screenshot({path:'evidence/detalle-fecha-mobile.png',fullPage:true});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await consulted.getByRole('link').click();await expect(page.locator('#clase-consultada')).toBeInViewport();
 await page.locator('.demo-controls summary').click();await page.getByLabel('Escenario',{exact:true}).selectOption('series');await page.getByRole('button',{name:'Aplicar escenario y reiniciar'}).click();
 await page.getByLabel('Correo electrónico').fill('bedel@demo.local');await page.getByLabel('Contraseña',{exact:true}).fill('Aulas2026');await page.getByRole('button',{name:'Ingresar',exact:true}).click();
 await page.getByLabel('Fecha de agenda').fill('2026-09-21');await page.locator('.mobile-booking').filter({hasText:'Matemática I'}).click();
 await expect(consulted).toContainText('21 de septiembre de 2026');await expect(page.locator('#clase-consultada')).toHaveCount(1);await expect(page.locator('.booking-occurrences article')).toHaveCount(26);
 await consulted.getByRole('link').click();await expect(page.locator('#clase-consultada')).toBeInViewport();

});
