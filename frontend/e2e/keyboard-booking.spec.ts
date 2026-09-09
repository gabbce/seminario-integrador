import {test,expect,type Locator,type Page} from '@playwright/test';
async function tabTo(page:Page,target:Locator){
 for(let i=0;i<180;i++){
  if(await target.evaluate(e=>e===document.activeElement))return;
  await page.keyboard.press('Tab');
 }
 throw new Error('No se alcanzó el control mediante Tab');
}
test('reserva periódica completa usando solo teclado',async({page})=>{
 await page.goto('/');
 await tabTo(page,page.getByLabel('Correo electrónico'));await page.keyboard.type('bedel@demo.local');await page.keyboard.press('Tab');await page.keyboard.type('Aulas2026');
 async function press(name:string){const button=page.getByRole('button',{name,exact:true});await tabTo(page,button);await expect(button).toBeFocused();expect(await button.evaluate(e=>getComputedStyle(e).outlineStyle)).not.toBe('none');await page.keyboard.press('Enter');}
 await press('Ingresar');await press('Nueva reserva');await press('Buscar aulas');
 const monday=page.getByRole('group',{name:/Lunes/}).getByRole('radio').first();await tabTo(page,monday);await page.keyboard.press('Space');await expect(monday).toBeChecked();
 const wednesday=page.getByRole('group',{name:/Miércoles/}).getByRole('radio').first();await tabTo(page,wednesday);await page.keyboard.press('Space');await expect(wednesday).toBeChecked();
 await press('Revisar reserva');await press('Confirmar reserva');await expect(page.getByRole('heading',{name:'Reserva confirmada'})).toBeVisible();await press('Ver detalle');await expect(page.getByRole('heading',{name:'26 clases registradas'})).toBeVisible();
});
