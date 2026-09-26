import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
const password=process.env.AULAS_DEMO_PASSWORD || readFileSync("../backend/.env","utf8").split(/\r?\n/).find(l=>l.startsWith("AULAS_DEMO_PASSWORD="))?.slice("AULAS_DEMO_PASSWORD=".length).replaceAll("\\\\","\\");
// Solo lectura: no carga, reset ni operaciones sobre escenarios compartidos.
for(const role of ["bedel","docente"]) test(`I05 consultas persistentes ${role}`,async({page})=>{
  const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));
  await page.goto("/");await page.getByLabel("Correo electrónico").fill(`${role}@demo.local`);await page.getByLabel("Contraseña",{exact:true}).fill(password!);await page.getByRole("button",{name:"Ingresar",exact:true}).click();
  await expect(page.getByLabel("Fecha de agenda")).toBeVisible();
  await page.getByLabel("Fecha de agenda").fill("2027-07-14");await page.getByLabel("Filtrar aula",{exact:true}).selectOption("103");
  await expect(page.getByText("Historia",{exact:true}).first()).toBeVisible();
  await page.getByRole("button",{name:"Semana",exact:true}).click();
  await expect(page.getByRole("region",{name:"Agenda semanal"})).toContainText("Historia");
  await page.setViewportSize({width:1366,height:768});await page.screenshot({path:`/tmp/i05-agenda-real-${role}.png`,fullPage:true});
  await page.goto("/reservas?date=2027-07-14&room=103");
  await expect(page.getByRole("button",{name:"Historia",exact:true})).toBeVisible();
  await page.getByRole("button",{name:"Historia",exact:true}).click();await expect(page.getByRole("heading",{name:"Historia",exact:true})).toBeVisible();
  await page.getByRole("button",{name:"Reservas",exact:true}).click();await expect(page.getByLabel("Aula del listado")).toHaveValue("103");
  await page.reload();await expect(page.getByLabel("Fecha del listado")).toHaveValue("2027-07-14");
  const result=await page.evaluate(async()=>{
    const session=JSON.parse(localStorage.getItem("aulas-auth")!);
    const response=await fetch("/api/consultas/listado?date=2027-07-14&room=103",{headers:{Authorization:`Bearer ${session.access_token}`}});
    return {status:response.status,body:await response.json()};
  });
  expect(result.status).toBe(200);expect(result.body.rows.some((r:{subject:string})=>r.subject==="Historia")).toBe(true);
  expect(JSON.stringify(result.body)).not.toMatch(/teacherEmail|registrant|changes|@/);
  if(role==="docente") {await expect(page.getByRole("button",{name:"Historia",exact:true})).toBeVisible();await page.setViewportSize({width:390,height:844});await page.screenshot({path:"/tmp/i05-listado-real-mobile.png",fullPage:true});}
  expect(errors).toEqual([]);
});
