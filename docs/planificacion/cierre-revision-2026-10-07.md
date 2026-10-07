# Preparación final para revisión — 07/10/2026

Base: `1f6f89f`, main. Trabajo solicitado: corregir defectos confirmados, comprobar hallazgos, retirar datos QA ajenos a la presentación, validar paquete y despliegue. La aceptación manual del usuario permanece pendiente; este registro no la sustituye.

## Datos compartidos

Proyecto Supabase `nrjykdzvzrcixapkdfsp`: limpieza selectiva ejecutada dentro de una transacción, con revisión independiente, comprobación de identidad y ausencia de reservas/patrones. Se retiraron las aulas QA con ids 1,2,3,4,5,26,27,28, sus subtipos y su historial. Se retiró la preparación ficticia `qa-politica-20261005@demo.local`, comprobando ausencia de usuario Auth/perfil y de envío activo. Copia lógica previa y SQL aplicado en `artifacts/qa/final-2026-10-07/` (privado, ignorado).

Antes/después: 344 reservas, 5195 detalles y 20 aulas no QA. La reserva 341 y su detalle 5173 permanecieron idénticos. Las reservas 340/343 ya estaban canceladas; los usuarios QA 5/6/9 ya estaban deshabilitados. Se preservaron cursos 92/93, reservas canceladas, el calendario 2029 y la reserva 23. No se ejecutó ningún reset remoto.

Auth remoto devuelve `disable_signup=true`; el registro público ya estaba desactivado. Se alineó también `supabase/config.toml` para réplicas locales. V16 figura aplicada correctamente. Render sirve `1f6f89f` en la instancia `seminario-integrador`; la versión nueva deberá verificarse después del despliegue.

## Criterios de cierre

- Recuperación de reserva esporádica sin duplicados tras recarga/401.
- Paginación fuera de rango, fechas imposibles, detalle de patrón/exclusiones/cese y retorno a rutas profundas.
- Recuperación administrativa de EMAIL y auditoría PASSWORD confirmada sin repetir contraseñas inciertas automáticamente.
- Cambios de aula de patrones sin futuras, dependencias completas y calendario sin alteraciones retroactivas.
- Indicadores con fechas elegibles, porcentajes pequeños y estados sin datos coherentes.
- Healthcheck según PORT, descarga Maven estable, previsualización de reset sin escrituras en las tablas de dominio/auditoría.
- Manifiesto D-03 alineado a capacidad24: +8,60,-36 alumnos-hora.

## Verificación

El snapshot de código definitivo aprobó las suites completas y la revisión independiente. El ensayo F11, la carga aislada y la inspección de imagen aprobaron; se detalla abajo qué imagen usó cada ensayo. La actualización de Render sigue pendiente de publicación.

## Límites de alcance

No se introducen nuevas reglas de negocio para esporádicas fuera de ambos cuatrimestres, reprogramación manual hacia una fecha excluida o cese por patrón. Se conserva el contrato vigente; el cese por patrón sería una ampliación posterior. Las cuentas e historial de reservas QA canceladas se conservan como trazabilidad, no se publican en la guía de acceso como usuarios de presentación.

## Denominadores después de la limpieza

La API real confirmó 17 aulas habilitadas: día 23/08 = 52/272 h (19,1%),104 clases, 780 alumnos-hora y picos 125/8; semana 23–27/08 = 56/1360 h (4,1%),108 clases y 855 alumnos-hora. Se actualizaron manifiesto, guía, guion y pruebas de lectura; los registros del 04/05 conservan sus cifras históricas.

## Evidencia disponible por revisión

- Backend: 193/193 en 27 suites, PostgreSQL 17.6 aislado y Auth simulado; snapshot intermedio sin fallos, errores ni saltos.
- Frontend: 68 unitarias, 120 E2E simuladas y 9 regresiones adicionales del snapshot intermedio; lint sin advertencias, TypeScript/build aprobados.
- Revisión independiente Sol→Luna: sin bloqueos en el snapshot revisado tras corregir ruta de clase y diagnóstico persistente de contraseña incierta.
- F11 aislado: 8 reservas seleccionadas, 20 reservas/439 detalles totales; previsualización sin escrituras, confirmación errónea rechazada, reset y repetición correctos, I03/perfiles/catálogos/2029 preservados. Imagen inicial del ensayo: artefacto previo a una corrección frontend de reapertura de cuentas; backend y herramienta de reset coinciden con el snapshot final.
- Imagen del primer cierre `sha256:008b24325d70236b8f02fe21f6201c5bdea8cfd2a0fad0f15b5c1317d1044ad2`: React compilado, usuario sin privilegios, sin archivos .env ni valores privados inspeccionados.
- Windows nativo: impresión simulada 2/3; Chromium y manejo de respuestas incompletas aprobaron. Firefox 155 no pudo iniciar: SideBySide informa ensamblado mozglue ausente; por tanto el PDF de Firefox Windows queda sin verificar. Linux: impresión Chromium/Firefox aprobada. No se atribuye este fallo de lanzamiento al código de la app.

La carga aislada, el despliegue de la nueva revisión y los recorridos reales finales siguen en curso.

## Recuperación de identidad y revisión visual

Una contraseña en estado ENVIADA tras caída del proceso requiere conciliación técnica: no se cancela ni repite automáticamente. Los resultados inciertos se muestran de forma persistente y la auditoría conserva el evento. La agenda e indicadores fueron inspeccionados visualmente en Chrome contra el paquete local. Evidencia de agenda limpia en `artifacts/qa/final-2026-10-07/agenda-clean.png`. Los catálogos asociados a reservas históricas QA se conservan para no alterar esa trazabilidad.

## Segunda comprobación del alcance

Se detectaron pendientes adicionales QA-08 (versión al recargar calendario), QA-16 (clasificación de rechazo), QA-18/21 (etiquetas legibles), QA-20 (selección explícita), QA-26 (zona institucional) y QA-34 (aula inexistente en API). Se corrigen antes de publicar; la imagen y las pruebas anteriores son evidencia de un snapshot intermedio. La primera corrida de paquete aprobó 11/12: login Bedel en Firefox falló por conexión con Auth; no se considera aprobada esa corrida. Las cuatro pruebas adicionales de indicadores/volumen/PDF/proyección pública aprobaron.

## Cierre del código congelado

- Backend: `cd backend && ./mvnw -q test`: **198/198**, 27 suites, cero fallos, errores y saltos; PostgreSQL 17.6 y Auth simulado. Log `/tmp/backend-final-frozen-full.log`. Pruebas dirigidas QA-17/26/34: 30/30.
- Frontend: `cd frontend && npm test -- --run`: **72/72**. `npm run lint`, `npx tsc --noEmit` y `npm run build`: correctos, sin advertencias de lint.
- Frontend E2E simulado: `npx playwright test --config playwright.final-validation.config.ts`: **122/122**. Configuración temporal aislada en 5187, eliminada tras la prueba. Cubrió las últimas correcciones y Firefox/Linux.
- `git diff --check`, JSON OpenAPI y sintaxis Python: correctos.
- Revisión independiente Sol→Luna: sin bloqueos en el código congelado, incluida agregación de todas las fechas inválidas/conflictivas y atomicidad.
- Imagen congelada `sha256:a4c8d328a094367d768a8ffdcb5103962294948532d5d84bf7522ef22c2ed1f1`: compilación Docker correcta, usuario sin privilegios, sin archivos .env ni valores privados locales inspeccionados. Instancia de revisión en `http://127.0.0.1:8086`, health UP.

La carga completa usó la imagen `008b243…`, anterior a QA-08/16/17/18/20/21/26/34. Protocolo: 50 identidades, dos minutos de calentamiento y diez de medición, 5967 operaciones, cero errores, auditoría independiente de tiempos/ciclos/versiones aprobada. p95: disponibilidad 16,6 ms; listado diario 14,0 ms; listado por curso 63,8 ms; alta periódica 93,5 ms; cambio de aula periódico 184,0 ms. Los valores son locales; no acreditan esos tiempos contra Supabase remoto ni equivalen a medir la imagen definitiva.

F11 y los recorridos reales iniciales también conservan su imagen identificada. Sobre la imagen definitiva: `AULAS_TEST_ORIGIN=http://127.0.0.1:8086 npx playwright test --config playwright.package.config.ts --grep "paquete sirve|Auth real bedel|paquete: indicadores"`: **6/6**. Rutas profundas, errores JSON, login Bedel e impresión/indicadores/reflow en Chromium y Firefox aprobaron. El login Bedel Firefox que falló por conexión con Auth en la corrida inicial aprobó en esta repetición aislada; no se oculta la falla inicial. Log `/tmp/aulas-final-package-frozen-tests.log`. El reflow por viewport está automatizado; el zoom nativo al 200 % sigue pendiente de aceptación manual.

## Publicación

Main remoto sigue en `1f6f89f`. La selección de Gabriel J's workspace fue autorizada expresamente. Tras revisar la evidencia, el usuario autorizó expresamente crear un commit, publicar en main y comprobar el despliegue automático de Render. Se publica el código congelado; el resultado remoto se verifica después del push. No se publican comentarios en GitHub.

La configuración temporal E2E no se publica. La evidencia de datos y capturas permanece ignorada por Git. Los contenedores de carga fueron retirados automáticamente al concluir. No hay cambios de otras personas en el diff preparado.
