# Pruebas históricas del prototipo

Estas pruebas dependen del login y de los controles de escenarios simulados. Se conservan como referencia para adaptar cada módulo durante I-02 a I-05, pero no se ejecutan contra la sesión real de I-01.4. Para reproducir sus 44 casos originales usar la rama `prototype/v1` (allí conservan rutas y fixtures originales).

La suite activa de esta rama comprueba Auth y permisos con respuestas controladas del proveedor/API; la suite explícita real usa Supabase y Java. Las 62 pruebas unitarias de dominio siguen activas. No interpretar este archivo histórico como cobertura de integración ya realizada.
