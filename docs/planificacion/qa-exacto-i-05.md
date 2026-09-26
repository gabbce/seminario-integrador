# QA exacto I-05 · entorno aislado

Para F05. No usa ni cambia PostgreSQL compartido. Requiere Linux/WSL, Docker disponible, Java21, Node24, dependencias frontend instaladas y archivos privados existentes `backend/.env` y `frontend/.env.local` para las cuentas demo Supabase. No crea cuentas Auth. Inicia y cierra únicamente sus sesiones temporales de preparación con `scope=local`; las sesiones existentes se conservan. Las contraseñas siguen fuera de esta guía.

Desde la raíz:
```sh
node tools/qa/exact-env.mjs
```
Esperar «QA exacto listo» y abrir [interfaz aislada](http://127.0.0.1:5176). Ingresar con Bedel/Admin demo. Backend8081 y PostgreSQL temporal local; issuer/JWKS y login Supabase reales, requiere internet. Puerto ocupado o contenedor existente se rechazan sin tocar servicios ajenos. Mantener la terminal abierta. `Ctrl+C` detiene sus procesos y elimina solo el contenedor temporal creado por esta ejecución; todas las ediciones de este entorno se descartan. Un nuevo inicio crea otra vez los fixtures. No es el reset de la demo compartida.

SQL fuente: `tools/qa/fixtures-exact.sql`, con guard de base nueva. No ejecutarlo contra otra base. Configuración/logs privados bajo `artifacts/qa/exact/` (ignorados); ninguna instrucción requiere `/tmp`. Si una interrupción abrupta dejó `aulas-qa-exact`, identificarlo mediante `docker inspect --format '{{json .Config.Labels}}' aulas-qa-exact` y detener sus procesos de QA antes de eliminar explícitamente ese contenedor desechable. No eliminar contenedores ajenos.

## Valores independientes para F05

Año2021 **cerrado**. Siete aulas de fixture A/B/C/D/H/P/Z; estados actuales inhabilitados y H dada de baja desde2022. Los indicadores usan los intervalos históricos, no ese estado actual. Fechas y horas institucionales, intervalos semiabiertos. Una materia «Indicadores exactos», comisiónQA. No hay otras reservas en esta base. IDs de aulas1–7, curso1;11reservas/clases. Las claves visibles aula/fecha distinguen cada caso, sin depender de IDs remotos.

| Abrir en la interfaz aislada | Resultado esperado |
|---|---|
| [01/03, A](http://127.0.0.1:5176/indicadores?date=2021-03-01&room=A) | 2h reservadas/8habilitadas=25%;1clase;60alumnos-hora |
| [01/03, todas](http://127.0.0.1:5176/indicadores?date=2021-03-01) | A2/8 + B0/2 =2/10=20%; no media de porcentajes |
| [02/03, todas](http://127.0.0.1:5176/indicadores?date=2021-03-02) | Dos clases07–09 en A/B:4horas-aula;2clases simultáneas;100alumnos-hora |
| [03/03, todas](http://127.0.0.1:5176/indicadores?date=2021-03-03) | C30alumnos14–15, D20alumnos14:30–15:30; franjas14–14:30/14:30–15/15–15:30:30/50/20alumnos y1/2/1clases;50alumnos-hora |
| [04/03, C](http://127.0.0.1:5176/indicadores?date=2021-03-04&room=C) |30alumnos durante2h:60alumnos-hora, sin afirmar personas únicas |
| [05/03, C](http://127.0.0.1:5176/indicadores?date=2021-03-05&room=C) |14–16 y16–16:30 contiguas: máximo1clase;70alumnos-hora |
| [Semana, C](http://127.0.0.1:5176/indicadores?mode=week&from=2021-04-05&to=2021-05-03&room=C) | Lunes05/12/19/26abril:40/0/20/0 en14–15; media15,4fechas;**03/05**, quinto lunes feriado, queda excluido. Pico medio15 y máximo de fecha40;60alumnos-hora acumulados |
| [08/03, H](http://127.0.0.1:5176/indicadores?date=2021-03-08&room=H) | H se habilita10:10, cambia General→Multimedios11:10, se inhabilita12:10. Módulos completos10:30–12:00:1,5h. General1h, Multimedios0,5h; tipo al inicio, sin redondear eventos. Clase10:30–12:00 tiene45alumnos-hora |
| [09/03, P](http://127.0.0.1:5176/indicadores?date=2021-03-09&room=P) | Falta cobertura07–10:10;12,5h habilitadas conocidas, porcentaje ausente y aviso de cobertura desconocida |
| [09/03, Z](http://127.0.0.1:5176/indicadores?date=2021-03-09&room=Z) | Fecha elegible,0h habilitadas, sin porcentaje; «Sin horas habilitadas» |
| [07/03, domingo](http://127.0.0.1:5176/indicadores?date=2021-03-07) | Ninguna fecha elegible; «Sin datos aplicables de apertura» |

Los huecos del calendario académico (receso) no eliminan apertura institucional; los denominadores de marzo se calculan aunque el año esté cerrado. H es Multimedios hoy, pero la consulta histórica General conserva1h. La baja posterior de H en2022 conserva esos valores de2021; `IndicatorTests` también verifica este comportamiento y límites adicionales, sin editar historia compartida.

Repetir la consulta del03/03 como Docente en [listado](http://127.0.0.1:5176/reservas?date=2021-03-03):2filas; no acceso a Indicadores y API403. Cuenta `inhabilitado@demo.local` autentica en Supabase, pero Java rechaza su perfil local. Navegar curvas/mapa con teclado y móvil390×844.

## Evidencia automatizada reproducible

Con el entorno anterior abierto, en otra terminal:
```sh
cd frontend
npx playwright test --config playwright.exact.config.ts
```
Prueba los valores anteriores por API y la interfaz real, sin interceptar respuestas ni omitir validación JWT. Capturas regeneradas en `artifacts/qa/exact/`. Pruebas de servicios cruzados, PostgreSQL aislado y reloj controlado:
```sh
./backend/mvnw -f backend/pom.xml -Dtest=ConsultationMutationTests,IndicatorTests test
```
Estado de QA y aceptación manual: pendiente del usuario. Las pruebas automatizadas no lo sustituyen.

Referencia remota de lecturas (entorno compartido ya cargado y backend8080), desde raíz:
```sh
node tools/qa/measure-reads.mjs artifacts/qa/i05/lecturas.json
```
Consulta inventario fuera de medición; una sesión, un calentamiento y cinco muestras por operación. No escribe datos de dominio. Login/logout temporales fuera de medición, cierre local. El reporte versionado `docs/evidencias/i05-lecturas.json` conserva el ensayo26/09/2026: listado p95=1612,87ms y disponibilidad2748,60ms superaron el objetivo1500ms; no acredita RNF remoto. Protocolo completo de50sesiones en I-06.3, con entorno y resultados separados.
