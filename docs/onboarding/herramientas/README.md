# Mantener y exportar la guía

El contenido editorial vive en `../README.md`. Las nueve imágenes están en `../imagenes/`: cuatro diagramas generados y cinco capturas conservadas. El PDF contiene las imágenes y el texto; no requiere archivos externos para leerlo.

## Regenerar

Requiere Python 3 y fuentes DejaVu Sans en `/usr/share/fonts/truetype/dejavu` (Linux/WSL). Desde la raíz del repo:

```bash
python3 -m venv /tmp/aulas-docs
/tmp/aulas-docs/bin/pip install -r docs/onboarding/herramientas/requirements.txt
/tmp/aulas-docs/bin/python docs/onboarding/herramientas/exportar.py
```

Si falta `venv`, instalar el paquete Python venv correspondiente en el entorno. No instala dependencias en la aplicación. El script vuelve a generar los cuatro diagramas PNG y `../aulas-guia-equipo.pdf`. No consulta Supabase ni cambia datos. Usa un subconjunto de Markdown (párrafos, encabezados, listas, enlaces, imágenes y bloques de código); cada sección de nivel 2 comienza en página nueva.

Después de editar, verificar páginas sin textos cortados, imágenes legibles y enlaces. Las imágenes conservan resolución para ampliar en un lector PDF. Los enlaces relativos a documentos se transforman en enlaces HTTPS de GitHub sobre `feat/integracion`; requieren acceso al repo y que el contenido esté publicado. El PDF en sí funciona sin conexión. No enviar configuración privada ni credenciales junto con el PDF.

## Procedencia visual

Estado de referencia: commit `283059c`, cierre de I-03, 17/09/2026. Capturas existentes de verificaciones de integración, copiadas sin editar; no se inició el backend ni se modificaron datos para crear la guía.

| Archivo | Evidencia original | Contexto |
|---|---|---|
| cuentas-real.png | frontend/evidence/i021-real-cuentas.png | I-02, cuentas con Supabase y Java; nombres ficticios de QA |
| revision-real.png | /tmp/i031-real-revision.png | Preparación real I-03.1; no confirma la propuesta mostrada |
| confirmacion-real.png | /tmp/i032-real-exito.png | Confirmación real I-03.2 de reserva 1, Álgebra 07–09 |
| agenda-real.png | /tmp/i034-real-agenda-2026.png | Lectura real I-03.4, Matemática I en 105 |
| detalle-movil-real.png | /tmp/i034-real-anual-390.png | Lectura real I-03.4, Estadística anual, rol Bedel |

Las imágenes originales de `/tmp` y `frontend/evidence` no son necesarias después de esta copia. No confundir la propuesta de I-03.1 con el resultado de I-03.2: sus horarios son distintos. Las leyendas lo explican. Los correos visibles son ficticios; no se incluyen tokens ni contraseñas.

Los diagramas `entregas`, `flujo-reserva`, `arquitectura` e `indicadores` se dibujan con código en `exportar.py`. Son síntesis para incorporación, no reemplazos de los modelos formales. Para actualizar el estado de las entregas hay que editar tanto el texto como el diagrama correspondiente.
