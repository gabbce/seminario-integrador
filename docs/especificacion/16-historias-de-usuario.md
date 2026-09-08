# Historias de usuario

**Versión:** 1.0 final, aprobada. Alcance vigente definido en la [especificación general](00-especificacion.md).

Estado: síntesis funcional 1.0 de los acuerdos, sin funcionalidades adicionales. La etiqueta HU identifica historias, no cambia la numeración RF/CU original. Los casos vigentes del documento 18 y criterios de los capítulos temáticos concretan los resultados.

1. **HU-01** — Como Usuario, quiero iniciar sesión con mi email y contraseña, para acceder a las funciones de mi rol. (CU-01)

2. **HU-02** — Como Usuario, quiero cerrar mi sesión, para terminar mi acceso desde ese dispositivo. (CU-01)

3. **HU-03** — Como Usuario, quiero recibir un error comprensible si no puedo autenticarme, para corregir mis credenciales o reintentar cuando el proveedor lo permita. (CU-01)

4. **HU-04** — Como Usuario, quiero ingresar directamente a mis funciones después de que Admin cree mi cuenta, para utilizar la app sin un paso obligatorio de cambio de contraseña. (CU-01/02)

5. **HU-05** — Como Usuario, quiero recibir una solicitud de ingreso cuando no haya una sesión válida, para saber por qué no puedo continuar una operación. (CU-01)

6. **HU-06** — Como Administrador, quiero crear cuentas con un único rol, para habilitar a quienes operan o consultan el sistema. (CU-02)

7. **HU-07** — Como Administrador, quiero buscar cuentas por nombre, email, rol y estado, para encontrar la cuenta que necesito administrar. (CU-03)

8. **HU-08** — Como Administrador, quiero editar datos y rol de una cuenta, para mantener sus datos y permisos correctos. (CU-04)

9. **HU-09** — Como Administrador, quiero que se impida deshabilitar o quitar el rol al último administrador activo, para mantener el acceso administrativo. (CU-04/05)

10. **HU-10** — Como Administrador, quiero deshabilitar una cuenta sin cancelar sus reservas, para retirar acceso conservando la operación y el historial. (CU-05)

11. **HU-11** — Como Administrador, quiero rehabilitar una cuenta, para permitir que su titular vuelva a ingresar. (EX-04)

12. **HU-12** — Como Administrador, quiero establecer una nueva contraseña para una cuenta, para devolverle acceso sin enviar correos desde la app. (EX-03)

13. **HU-13** — Como Administrador o Bedel, quiero registrar aulas de los tipos previstos y su capacidad en personas, para disponer de espacios para las reservas. (CU-06)

14. **HU-14** — Como Administrador o Bedel, quiero buscar aulas por identificador, tipo, capacidad, estado y características, para encontrar espacios adecuados sin filtrar por cantidad de PC. (CU-07)

15. **HU-15** — Como Administrador o Bedel, quiero modificar aulas sin invalidar clases futuras o en curso, para mantener datos y equipamiento correctos. (CU-08)

16. **HU-16** — Como Administrador o Bedel, quiero inhabilitar o poner en mantenimiento un aula sin clases afectadas, para impedir nuevas asignaciones durante su indisponibilidad. (CU-08)

17. **HU-17** — Como Administrador o Bedel, quiero dar de baja un aula preservando su historial, para retirarla de la operación habitual. (CU-09)

18. **HU-18** — Como Administrador, quiero listar años por año y estado, para encontrar el calendario académico que debo revisar. (CU-10)

19. **HU-19** — Como Administrador, quiero cargar un año y sus cuatrimestres por etapas, para preparar el calendario sin habilitar reservas prematuramente. (CU-11/15)

20. **HU-20** — Como Administrador, quiero habilitar y cerrar años bajo sus reglas de dependencia, para controlar cuándo se pueden registrar reservas. (CU-12)

21. **HU-21** — Como Administrador, quiero eliminar un año sin dependencias, para corregir una carga que no llegó a utilizarse. (CU-13)

22. **HU-22** — Como Administrador, quiero buscar los cuatrimestres de un año por sus fechas, para revisar los períodos asignables. (CU-14)

23. **HU-23** — Como Administrador, quiero editar fechas de un cuatrimestre sin dejar clases fuera, para ajustar el calendario conservando las reservas válidas. (CU-16)

24. **HU-24** — Como Administrador, quiero eliminar un cuatrimestre no utilizado y volver el año a preparación, para corregir su configuración sin afectar reservas. (CU-17)

25. **HU-25** — Como Administrador, quiero cargar feriados manualmente con fecha y descripción, para excluir días sin actividad académica. (EX-01)

26. **HU-26** — Como Administrador, quiero ver reservas que impiden guardar un feriado, para resolverlas antes de modificar el calendario. (EX-01)

27. **HU-27** — Como Administrador, quiero extender clases al ampliar un cuatrimestre o quitar un feriado, para mantener las series coherentes con el calendario. (EX-02)

28. **HU-28** — Como Administrador, quiero resolver aulas y conflictos de todas las clases nuevas antes de guardar el calendario, para evitar actualizaciones parciales o superposiciones. (EX-02)

29. **HU-29** — Como Usuario, quiero consultar aulas disponibles para fechas, horario, tipo y alumnos previstos, para conocer qué espacios pueden utilizarse. (CU-18)

30. **HU-30** — Como Administrador o Bedel, quiero ver hasta tres aulas sugeridas y poder consultar otras válidas, para elegir una asignación apropiada. (CU-19)

31. **HU-31** — Como Usuario, quiero ver las reservas conflictivas y minutos superpuestos cuando no hay aulas libres, para comprender la falta de disponibilidad. (CU-18/20)

32. **HU-32** — Como Administrador o Bedel, quiero registrar una reserva para fechas específicas, para asignar aulas para actividades esporádicas, incluso en receso. (CU-21)

33. **HU-33** — Como Administrador o Bedel, quiero seleccionar un docente de la lista simulada aunque no tenga cuenta, para identificar al solicitante sin gestionar docentes académicamente. (CU-21/22)

34. **HU-34** — Como Administrador o Bedel, quiero seleccionar o registrar materia y comisión del año con código legible, para agrupar las reservas del mismo curso. (CU-21/22/27)

35. **HU-35** — Como Administrador o Bedel, quiero indicar alumnos previstos y recursos requeridos, para buscar aulas suficientes y alimentar las métricas previstas. (CU-18/21/22)

36. **HU-36** — Como Administrador o Bedel, quiero registrar una serie cuatrimestral o anual con horario por día de semana, para programar clases recurrentes. (CU-22)

37. **HU-37** — Como Administrador o Bedel, quiero registrar una serie con el período iniciado y revisar fechas omitidas, para reservar solo clases que todavía pueden ocurrir. (CU-22)

38. **HU-38** — Como Administrador o Bedel, quiero aplicar un aula a fechas compatibles del mismo día de semana, para reducir selección repetitiva sin asignar fechas ocupadas. (CU-19/22)

39. **HU-39** — Como Administrador o Bedel, quiero excluir expresamente fechas antes de confirmar, para registrar solo el conjunto elegido y conservar esas excepciones. (CU-21/22/23)

40. **HU-40** — Como Administrador o Bedel, quiero revisar el resumen y confirmar todas las asignaciones elegidas juntas, para evitar registros incompletos. (CU-23)

41. **HU-41** — Como Administrador o Bedel, quiero recibir los conflictos nuevos conservando la preparación activa, para corregir la selección sin que se guarde parcialmente. (CU-20/23)

42. **HU-42** — Como Administrador o Bedel, quiero abandonar una preparación sin guardar, para descartar un pedido que todavía no confirmé. (CU-21/22/23)

43. **HU-43** — Como Administrador o Bedel, quiero modificar una o varias clases futuras cumpliendo los requisitos originales, para reprogramar asignaciones sin alterar el pasado. (CU-24)

44. **HU-44** — Como Administrador o Bedel, quiero recibir aviso si otro usuario modificó la reserva, para revisar la versión actual antes de sobrescribir datos. (CU-24/25)

45. **HU-45** — Como Administrador o Bedel, quiero cancelar una, varias o todas las clases futuras indicando motivo, para liberar aulas conservando el historial. (CU-25)

46. **HU-46** — Como Administrador o Bedel, quiero que se impida editar clases iniciadas o reactivar canceladas, para mantener un historial coherente. (CU-24/25)

47. **HU-47** — Como Administrador o Bedel, quiero conservar el patrón semanal frente a cambios puntuales, para generar nuevas clases sin copiar excepciones de una fecha. (CU-24/EX-02)

48. **HU-48** — Como Administrador o Bedel, quiero que los cambios de calendario respeten exclusiones y cese de continuidad, para evitar recuperar clases que decidí cancelar o excluir. (EX-02)

49. **HU-49** — Como Usuario, quiero listar las reservas de una fecha con sus filtros, para conocer la ocupación de ese día. (CU-26)

50. **HU-50** — Como Usuario, quiero listar cronológicamente reservas de una materia y comisión del año, para consultar la programación del curso correcto. (CU-27)

51. **HU-51** — Como Usuario, quiero consultar fechas canceladas mediante filtro de listado, para distinguir historial de ocupación vigente. (CU-26/27)

52. **HU-52** — Como Usuario, quiero consultar una agenda diaria o semanal, para ver simultaneidad y espacios disponibles. (CU-28)

53. **HU-53** — Como Docente, quiero consultar agenda y listados cómodamente desde celular, para acceder a la ocupación sin funciones de edición. (CU-28)

54. **HU-54** — Como Administrador o Bedel, quiero abrir edición o cancelación desde agenda, para resolver cambios sobre la clase seleccionada. (CU-24/25/28)

55. **HU-55** — Como Administrador o Bedel, quiero ver el email docente en el detalle autorizado, para tener su dato de contacto. (CU-24/26/27)

56. **HU-56** — Como Usuario, quiero imprimir el listado diario filtrado completo o guardarlo como PDF, para consultar o presentar su información fuera de la pantalla. (CU-26)

57. **HU-57** — Como Administrador o Bedel, quiero consultar horas reservadas y porcentaje de ocupación por rango, para analizar uso programado de aulas con denominador correcto. (CU-29)

58. **HU-58** — Como Administrador o Bedel, quiero consultar demanda atendida por tipo de aula, para comparar asignaciones realizadas. (CU-29)

59. **HU-59** — Como Administrador o Bedel, quiero consultar alumnos previstos y clases simultáneas por media hora, para identificar horas pico de una fecha. (CU-29)

60. **HU-60** — Como Administrador o Bedel, quiero comparar una semana típica del cuatrimestre o rango, para identificar diferencias entre días sin sesgo por cantidad de fechas. (CU-29)

61. **HU-61** — Como Administrador o Bedel, quiero consultar picos y alumnos-hora sin presentarlos como alumnos únicos, para analizar concurrencia estimada sin afirmar asistencia real. (CU-29)

62. **HU-62** — Como Administrador o Bedel, quiero distinguir cero, falta de cobertura y ausencia de horas habilitadas, para interpretar correctamente indicadores sin datos aplicables. (CU-29)

63. **HU-63** — Como Responsable de la demo, quiero inicializar la identidad y el perfil administrador mediante configuración privada, para preparar el acceso sin registro público ni duplicados. (OP-01)

64. **HU-64** — Como Responsable de la demo, quiero consultar auditoría con herramientas técnicas, para explicar operaciones sin agregar un panel a la app. (OP-02)

65. **HU-65** — Como Responsable de la demo, quiero cargar datos ficticios de forma reproducible, para preparar un escenario conocido para presentar la app. (OP-03)

66. **HU-66** — Como Usuario, quiero recibir un error claro ante un fallo técnico sin cambios parciales, para conocer el resultado real de mi operación. (TRANSVERSAL)
