# Prompts — operación diaria B

Herramienta integrada de imágenes. Referencia adjunta: `../flujo-esporadico-b/03-revision.png`.

## 01-agenda

```text
Use case ui-mockup. SINGLE1536x1024 Spanish desktop operational classroom app screenshot. Attached image STYLEreference only. PATIO style ivory forestgreen primary serifheadings readablehumanistsans, subtleroundedpanels, thinlines; topnav Aulas/Gestión de espacios Agenda Disponibilidad Reservas Aulas Indicadores Gabriela·Bedel. NOsidebar,marketing,bells,chat,AI,PCfilters. Date anchor8Sep2026, selected date Monday14Sep2026 is future. Same fictitious periodic MatemáticaI001-A-2026 LauraGómez30alumnosMultimediosProyector, term14Sep–18Dec2026,26classes:12Mondays14–16Aula203 and14Wednesdays14–16Aula105, holidays12Oct23Nov omitted. No classes started yet. Each screen standalone, no collage. SCREEN Agenda de aulas navAgendaactive. Heading Lunes14deseptiembre2026, Hoy and prevnext, tabs Día active Semana, filters Todas las aulas Todos los tipos, primaryNuevareserva. Large daily resource calendar: vertical time13:00to18:00 in30minrows, FOUR room columns Aula10540personasMultimedios,Aula20332personasMultimedios,Aula10860personasGeneral,Lab224personasLaboratorio. Time labels13,13:30,...18 onleft. Precisely aligned blocks: Aula203MatemáticaI14–16 001-A-2026LauraGómez30alumnos; Aula105FísicaI14–15:30 003-A-2026AnaRuiz36alumnos; Aula108Historia13–14:30SofíaPaz; Lab2ProgramaciónI15–17MartínDíaz24alumnos; Aula105Álgebra16–17:30DiegoLuna. Different classrooms concurrent clearly separate. Footer4aulasmostradas,Horarios07–23·Tramovisible13–18 scrollbar. NoKPIcards,no currenttime line onfuturedate. No roomcount pagination invented.
```

## 02-detalle

```text
Use case ui-mockup. SINGLE1536x1024 Spanish desktop operational classroom app screenshot. Attached image STYLEreference only. PATIO style ivory forestgreen primary serifheadings readablehumanistsans, subtleroundedpanels, thinlines; topnav Aulas/Gestión de espacios Agenda Disponibilidad Reservas Aulas Indicadores Gabriela·Bedel. NOsidebar,marketing,bells,chat,AI,PCfilters. Date anchor8Sep2026, selected date Monday14Sep2026 is future. Same fictitious periodic MatemáticaI001-A-2026 LauraGómez30alumnosMultimediosProyector, term14Sep–18Dec2026,26classes:12Mondays14–16Aula203 and14Wednesdays14–16Aula105, holidays12Oct23Nov omitted. No classes started yet. Each screen standalone, no collage. SCREEN Detalle de reserva navReservasactive breadcrumbReservas/Detalle. HeaderMatemáticaI·001-A-2026 badgeConfirmada subtitleReserva periódica. PrimaryModificar secondaryquietCancelarclases. Course/teacher/students/type sharedsummary. Period14sep–18dic2026. Table weekdays Lunes14–16Aula20312fechas;Miércoles14–16Aula10514fechas. HeadingFechasdel a reserva filterTodas/Próximas/Canceladas, readonly rows firstfour14sepAula203,16sepAula105,21sepAula203,23sepAula105 all14–16 Confirmada. FooterMostrando4de26·Ver todaslasfechas. Compact contacts section DocentesolicitanteLauraGómez laura.gomez@example.com; RegistróGabriela gabriela@example.com. Separate small calendar note12oct23novomitidos. No automaticemails or editing date from readonly table.
```

## 03-modificar

```text
Use case ui-mockup. SINGLE1536x1024 Spanish desktop operational classroom app screenshot. Attached image STYLEreference only. PATIO style ivory forestgreen primary serifheadings readablehumanistsans, subtleroundedpanels, thinlines; topnav Aulas/Gestión de espacios Agenda Disponibilidad Reservas Aulas Indicadores Gabriela·Bedel. NOsidebar,marketing,bells,chat,AI,PCfilters. Date anchor8Sep2026, selected date Monday14Sep2026 is future. Same fictitious periodic MatemáticaI001-A-2026 LauraGómez30alumnosMultimediosProyector, term14Sep–18Dec2026,26classes:12Mondays14–16Aula203 and14Wednesdays14–16Aula105, holidays12Oct23Nov omitted. No classes started yet. Each screen standalone, no collage. SCREEN Cambiar aula de la reserva navReservasactive. BackVolveraldetalle. SummaryMatemáticaI001-A-2026. Groupselector Lunes14–16selected /Miércoles14–16. Clear impact banner El cambio afectará las12clases futuras de los lunes. Losmiércoles conservan Aula105. Comparison Aulaactual20332personas -> Nuevaaula30148personasEdificioBpiso3MultimediosProyector. Radio alternatives Aula30148selected Aula20460, bothDisponibleenlas12fechas. Compact readonly firstdates14sep21sep28sep5oct thenVerlas12fechas. LabelSecomprueban todaslasfechasdelgrupo; nop erdateclasscheckboxes. Footer secondaryDescartarcambios primaryGuardarcambiodeaula. Clear nochangeperformedbeforeguard. No modification ofperiodic single-date room, preserve original30students. Editing scenario independent from cancellation next.
```

## 04-cancelar

```text
Use case ui-mockup. SINGLE1536x1024 Spanish desktop operational classroom app screenshot. Attached image STYLEreference only. PATIO style ivory forestgreen primary serifheadings readablehumanistsans, subtleroundedpanels, thinlines; topnav Aulas/Gestión de espacios Agenda Disponibilidad Reservas Aulas Indicadores Gabriela·Bedel. NOsidebar,marketing,bells,chat,AI,PCfilters. Date anchor8Sep2026, selected date Monday14Sep2026 is future. Same fictitious periodic MatemáticaI001-A-2026 LauraGómez30alumnosMultimediosProyector, term14Sep–18Dec2026,26classes:12Mondays14–16Aula203 and14Wednesdays14–16Aula105, holidays12Oct23Nov omitted. No classes started yet. Each screen standalone, no collage. SCREEN Cancelar clases navReservasactive. SummaryMatemáticaI001-A-2026·26clasesfuturas. Scope radios Seleccionarfechas active /Todaslasfuturas. Date checkbox table firstfour with ONLY Lunes14sep2026Aula20314–16 checked;16sepAula105 unchecked21sepAula203unchecked23sepAula105unchecked. Verlas26fechas. Required textarea Motivo de cancelación * filled Jornada de capacitación docente. Strong explicit summary Se cancelará1clase: lunes14deseptiembre14–16Aula203. Lasotras25clasessemantienen. NoteElhorariodelaulaquedarádisponible. No sepuedereactivarunaclasecancelada. Footer neutralVolver primarydestructivemutedredConfirmarcancelación. NO green save, no delete reservation, no disabledhistoryexamples sinceallfuture. Spacious focused page.
```


## Correcciones finales mediante edición de imágenes

- Modificación: reemplazar únicamente la etiqueta Esporádica por Periódica, conservando composición y datos.
- Cancelación: reemplazar Esporádica por Periódica, quitar el indicador de dos pasos y reemplazar el pie por «Se verificará que la clase siga siendo futura antes de cancelar». Conservar el resto.
