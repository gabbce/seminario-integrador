# Manifiesto operativo del QA final

Preparado el26/09/2026. Implementación técnica I05/I06 verificada; **aceptación manual I04/I05/I06 pendiente**. Guía de casos: [F01–F12](qa-final-i-04-i-05-i-06.md). Registrar resultados en [plantilla](registro-qa-final.md), sin confundir estos esperados con observaciones del usuario.

## Entorno y paquete

- Rama `feat/integracion`; implementación I05 hasta `90fdbdc`, paquete/reset `e162602`/`5f02309`, verificación final `ef1a804`. Registrar el `git rev-parse HEAD` del checkout usado para QA; los commits documentales posteriores no cambian la imagen verificada.
- Imagen verificada `sha256:7e6bd4c6374b2fdb5590a65f6e6dd5bf0596759ba2828c7f7f8119ceb5006092`. Al reconstruir, registrar el nuevo ID; no exigir igualdad de bytes si varían metadatos de construcción.
- Demo compartida: [aplicación en8082](http://127.0.0.1:8082), Supabase PostgreSQL/Auth existente, región us-west-2. Compose solo inicia app, requiere internet. Fecha institucional Córdoba; referencias futuras2027/2029 válidas al preparar esta guía.
- Chromium153.0.8010.12 y Firefox155.0; escritorio1366×768, Docente390×844, teclado. Reflow automatizado683×384; **zoom nativo200% pendiente del usuario**.
- Roles: `admin@demo.local`, `bedel@demo.local`, `docente@demo.local`, `inhabilitado@demo.local`. Las cuentas de la instancia compartida tienen credenciales ficticias públicas en [credenciales demo](../credenciales-demo.md); una réplica usa las de su preparación privada. Los secretos de servidor no se publican. La última cuenta debe ser rechazada por perfil inactivo. No crear/reemplazar identidades para empezar QA.

Desde raíz, con configuración existente:

```sh
export DEMO_PORT=8082
docker compose --env-file frontend/.env.local up -d
docker compose --env-file frontend/.env.local ps
curl --fail http://127.0.0.1:8082/api/health
git rev-parse HEAD
docker image inspect aulas-demo:local --format '{{.Id}}'
```

Esperar estado saludable y HTTP200/UP antes de navegar. Para checkout nuevo, seguir primero [configuración y construcción](ejecutar-demo-i-06.md). Cargas e inicialización son explícitas y se usan solo si faltan esos conjuntos, según [I02](datos-demo-i-02.md), [I03](datos-demo-i-03.md), [I04](datos-demo-i-04.md) e [I05](datos-demo-i-05.md). En el entorno compartido ya están cargados: no volver a cargarlos para iniciar QA.

## Lecturas F02–F05: estado conservado

Inventario26/09:337reservas,5150clases(5129vigentes/21canceladas),28aulas(20habilitadas actuales). Comparación antes/después de I06 semánticamente idéntica, incluidos calendarios/cursos/disponibilidad protegida. Son referencias de este momento; las operaciones nuevas del usuario agregan deltas. No usar estos totales como condición de reset global.

| Conjunto | Identidades y esperados |
|---|---|
| I03 `reservas-i03` |12reservas/370clases; definición y claves en [manifiesto I03](datos-demo-i-03.md); escenarios previos preservados |
| I04 `operacion-i04` |24receso,25cancelación parcial,26total,27cambio aulas,28origen,29patrón reprogramado,30cese,31anual;8reservas/69clases,18canceladas. [Fechas exactas](datos-demo-i-04.md) |
| I05 `volumen-i05` |306reservas/4613clases,1cancelada; [claves e IDs resueltos](../evidencias/i05-datos.json), SHA de definición `55dcc85e67d4aa93c09729e9e004ba8199a05d7e8ebf5de958edd13116eb5d4d` según manifiesto fuente |
| QA ajeno |Reserva14 y15–23; cursos83–90 y calendario2029id4 conservados; no pertenecen al reset de datasets |

La definición versionada permite recalcular esa huella con `sha256sum backend/src/main/resources/demo/volumen-i05-v1.json`.

| Filtro compartido | Esperado independiente antes de nuevas operaciones |
|---|---|
|23/08/2027, confirmadas, todas |104filas; General65/Multimedios39; aula104=13. Tamaño20→6páginas; imprimir desde página2 sigue dando104filas |
|24/08/2027 |1vigente y1cancelada; todas2 |
|25/08/2027 |0; clase de origen25/08 reprogramada al27/08 |
|Curso30, Programación I,006-A-2027 |664clases vigentes; ejemplo de volumen reserva232,clave`print-101-00` |
|Indicadores23/08 |52/272horas-aula=19,12%(19,1visible);780alumnos-hora; pico125alumnos y8clases |
|Semana23–27/08 |108clases,56/1360horas=4,12%;855alumnos-hora |
|Laboratorio martes2027,14–16 |Ranking Lab2(480min de conflicto),Lab1(1920min). Adyacente16–17: Lab1 libre, Lab2 ocupada por reserva14 |

Para historia y cifras pequeñas usar [entorno exacto del paquete](qa-exacto-i-05.md): `node tools/qa/exact-package-env.mjs`, esperar listo, abrir5176. Año2021cerrado,7aulas,11reservas; su tabla especifica ponderación20/25%, franjas30/50/20, lunes15, feriado, cambio de tipo/estado, baja posterior y cobertura desconocida. Mantener la terminal; Ctrl+C elimina solo ese entorno. No alterar historia remota para reproducirlo.

## Operaciones nuevas F06–F08

Crear materia «QA final» y comisión propia con fecha/operador para2027. Registrar el ID del curso y de cada nueva reserva en la plantilla; esos IDs son salidas del QA, no valores omitidos del manifiesto. No editar reservas24–31 ni volumen. Bedel opera; segunda sesión Bedel/Admin para concurrencia y Docente para privacidad.

1. Esporádica:27y29/07/2027,08–09,20alumnos,General,Laura Gómez. En la preparación conservada hay diez aulas posibles, incluidas103y105. Elegir103 si sigue libre; registrar la elección. Confirmar ambas fechas:2clases,2horas-aula y40alumnos-hora añadidos. Edición20→24: mismos IDs/fechas/aulas,48alumnos-hora(+8); el aula103 admite24 personas.
2. Dos sesiones revisan esa misma versión: guardar un cambio en una y luego en otra debe rechazar la versión antigua. Para conflicto de ocupación, preparar otra propuesta propia en ambas sesiones sobre una misma aula/franja libre; la segunda confirmación debe rechazar todo. Registrar esas reservas aparte de la muestra de métricas.
3. Cambiar solo la clase27/07 al aula105 si la revisión la ofrece; totales generales iguales,1hora/24alumnos-hora trasladados entre aulas. Reprogramar27→28/07 a09:00–10:30 y luego30/07 al mismo horario: origen27inmutable; la reserva queda con2,5horas-aula y60alumnos-hora. Registrar cada traslado por fecha; el segundo movimiento no suma otra clase.
4. Cancelar la clase movida con motivo «QA final: suspensión»: resta1,5horas y36alumnos-hora; queda29/07,1hora/24alumnos-hora. Comprobar liberación antes de volver a ocupar con otra reserva QA. Cancelar la restante deja0vigentes; historial/motivos conservados, sin reactivación.
5. Periódica propia: primer período2027,viernes21–22,20alumnos,General. Preparación de solo lectura verificada:103/105/204/107/108 ofrecidas para todo el patrón; elegir103 si sigue disponible; el calendario conservado produce17clases:12/19/26marzo,02/09/16/23/30abril,07/14/21/28mayo,04/11/18/25junio y02julio. Aporta17horas y340alumnos-hora. Anotar las fechas de revisión antes de confirmar. Mover la primera clase12/03 a15/03,21–22,si la revisión confirma disponibilidad; el patrón viernes y el origen12/03 se conservan, sin cambiar17horas/340alumnos-hora. Cambiar el aula del patrón debe incluir esa clase movida y todas las futuras vigentes. Cancelar continuidad futura deja cese explícito. Si el calendario cambió, cotejar cada viernes del período menos feriados/exclusiones y registrar la diferencia antes de guardar.

Disponibilidad se revalida al confirmar; si otro QA ocupó un destino, usar una alternativa ofrecida y registrar el cambio antes de juzgar deltas. No borrar la interferencia. Pasado, reloj durante espera, IDs ajenos y fallos de persistencia se acreditan también con174pruebas backend; no modificar el reloj real.

## Calendario F09: referencia QA2029

Estado conservado: calendarioid4,versión2,Habilitado,primer período05–19/03/2029,segundo01/08–30/11,sin feriados. Reserva23,curso90,20alumnos,lunes18–19,aula103. Clases466/467/468=05/12/19marzo. Leer este estado antes de actuar; no tocar2026/2027.

- Ampliar fin a26/03: revisión agrega exactamente1clase de reserva23; no escribe todavía. Preparar interferencia QA en26/03,18–19,103 desde Bedel antes de confirmar: debe rechazar todo. Cancelar o mover solo esa reserva QA y revisar otra vez; confirmación exitosa agrega1hora-aula/20alumnos-hora. El denominador institucional no cambia por ampliar el período.
- Con fin26/03, agregar09/04 como no lectivo fuera del período: sin nuevas clases. Ampliar fin hasta09/04 manteniendo feriado: agrega02/04 solamente. Quitar luego feriado09/04: agrega esa clase. Cada alta agrega1hora/20alumnos-hora. Al retirar el feriado, para filtro aula103/día09/04 la apertura pasa0→16h y elegibilidad cambia; numerador1h,ocupación6,25%. Para todas las aulas depende de sus estados vigentes, no asumir16h globales.
- Recortar dejando clases fuera o agregar feriado sobre una vigente debe rechazar sin cancelarlas. Si el QA ya avanzó, usar el siguiente lunes sin clase y registrar fecha/estado antes de revisar; no resetear2029.

## Evidencias F10–F12

| Evidencia técnica | Resultado / reproducción |
|---|---|
| [Regresión](../evidencias/i06-regresion.json) |174backend,66unitarias,110UI simulada,12paquete real,4exactos y8operaciones por navegador; [comandos](regresion-paquete-i-06.md) |
| [PDF Chromium](../evidencias/i06-visual/volume-chromium.pdf) / [Firefox](../evidencias/i06-visual/volume-firefox.pdf) |9páginas,104filas completas por identidad/contenido |
| [Carga local](carga-final-i-06.md) |50sesiones,120s+600s,5963solicitudes,0errores; trazas versionadas auditables. **No acredita latencia remota**; muestra Supabase I05 excedió objetivos |
| [Reset](restablecer-demo-i-06.md) |`python3 tools/qa/reset-rehearsal.py`; CLI aislada, preview/rechazo/repetición/conservación.8tests incluyen volumen/bloqueos/rollback/operaciones antiguas. Ningún reset remoto ejecutado |
| [Presentación](guion-demo-final.md) |Orden de pantallas, datos y cierre con límites/aceptación separados |

Los comandos de prueba requieren herramientas locales indicadas en sus guías; no son requisitos para abrir la demo Compose. No compartir inventarios privados completos, contraseñas, tokens ni logs sin revisar. Un reset remoto requiere autorización del usuario sobre destino y datasets concretos, incluso después de aprobar el QA.
