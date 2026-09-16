# QA manual de I-01 · ingreso real

Arrancar Java y React según sus README. Este entorno tiene .env y .env.local preparados, fuera de Git. Usar las cuentas ficticias y la contraseña de AULAS_DEMO_PASSWORD en backend/.env; nunca copiarla a evidencias.

## Recorridos

1. **Administrador:** ingresar con admin@demo.local. Deben aparecer Agenda, Disponibilidad, Reservas, Aulas, Indicadores y Administración.
2. **Bedel:** cerrar sesión e ingresar con bedel@demo.local. Indicadores visible, Administración ausente.
3. **Docente:** cerrar sesión e ingresar con docente@demo.local. Sin Indicadores, Administración ni Nueva reserva.
4. **Recarga:** en cada rol, ir a Aulas y recargar. Debe conservar el acceso después de comprobar el perfil.
5. **Salida:** cerrar sesión; durante el cierre la app queda bloqueada. Una vez presentado Ingresar, usar Atrás y recargar. No debe reaparecer acceso operativo.
6. **Clave incorrecta:** debe informar correo/contraseña incorrectos y enfocar el error. Corregir y volver a ingresar.
7. **Cuenta inactiva:** inhabilitado@demo.local autentica en el proveedor, pero Java rechaza el perfil. Debe mostrar acceso no habilitado, sin navegación operativa, y permitir salir.
8. **Backend indisponible:** con sesión válida, detener Java y recargar. Mostrar error recuperable sin borrar la sesión. Reiniciar Java y Reintentar.
9. **Presentación:** probar 390, 768 y 1440 px. Menú plegable en móvil/tablet, sin desbordamiento horizontal de la página. Completar ingreso por teclado y comprobar etiquetas, foco y mostrar/ocultar contraseña.

## Evidencia automatizada

- Backend: 12 pruebas de persistencia, preparación e identidad con PostgreSQL desechable.
- Frontend: 62 unitarias del dominio y 9 recorridos de sesión con proveedor simulado.
- Suite explícita real: cuatro cuentas, permisos, recarga, cierre y bloqueo de perfil inactivo.
- Capturas locales en frontend/evidence/auth-login-*.png, auth-agenda-*.png y auth-real-*.png. No contienen contraseñas ni tokens.
- Capturas revisadas visualmente y axe sin violaciones en los recorridos de login/navegación evaluados.

## Límite de esta entrega

El acceso es real. Reservas, inventario, calendario, cursos, administración en pantalla e indicadores todavía trabajan con datos en memoria. La administración simulada no cambia la identidad real ni sus permisos. La adaptación de esos módulos se realiza en I-02 a I-05; I-06 contempla validación conjunta. No interpretar esta checklist como certificación de persistencia de negocio.

El QA completo histórico, escenarios y sus 44 pruebas de navegador corresponden a prototype/v1 y a docs/diseno/qa-manual-prototipo.md.

## Resultado manual informado por el usuario

El usuario confirmó haber realizado el QA propuesto en localhost y que todo funciona correctamente según lo planeado, sin incidencias reportadas. I-01 queda aceptada funcionalmente dentro del alcance de esta guía.
