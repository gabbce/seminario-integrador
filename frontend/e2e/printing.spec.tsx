import { test,expect } from '@playwright/test'
import { renderToString } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { readFileSync } from 'node:fs'
import { createServer } from 'vite'
import { initialBookings } from '../src/domain'
import React from 'react'
test('la impresión contiene 25 filas aunque la página muestre 20',async({page})=>{
 const time=(n:number)=>`${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`
 const bookings=Array.from({length:25},(_,i)=>({...initialBookings[0],id:`PRINT-${i}`,subject:`Materia ${i+1}`,occurrences:[{date:'2026-09-14',room:'108',start:time(420+i*30),end:time(450+i*30)}]}))
 const server=await createServer({server:{middlewareMode:true}})
 let html=''
 try {const {Listing}=await server.ssrLoadModule('/src/pages/Listing.tsx');html=renderToString(React.createElement(MemoryRouter,{},React.createElement(Listing,{bookings})))} finally {await server.close()}
 await page.setContent(`<style>${readFileSync('src/App.css','utf8')}</style>${html}`)
 await expect(page.locator('.screen-list tbody tr')).toHaveCount(20)
 await expect(page.locator('.print-list tbody tr')).toHaveCount(25)
 await page.emulateMedia({media:'print'})
 await expect(page.locator('.screen-list')).toBeHidden()
 await expect(page.locator('.print-list')).toBeVisible()
 await expect(page.locator('.print-list')).toContainText('Materia 25')
 await page.pdf({path:'evidence/listado-25.pdf',format:'A4',landscape:true})
 await page.screenshot({path:'evidence/listado-impresion.png',fullPage:true})
})
