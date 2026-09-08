# Prompts — ingreso, móvil y estados B

Herramienta integrada de imágenes; referencia adjunta `../flujo-esporadico-b/01-datos.png`.

## 01-ingreso

```text
Usecase ui-mockup. Match attached PATIO image STYLE ONLY: ivorybackground forestgreenprimary serifheadings humanistsans readable16pxbody roundedpanels fine separators warm restrainedterracotta. Spanish Aulas/Gestión de espacios app. No newfeatures,marketing,photos,deviceframes,OSstatusbar,notifications,PCfilters,offlinecapabilities. Currentdate8Sep2026; examples14Sep2026future. Generate only requested screen no collage. SINGLEdesktop1536x1024 login screen. No appsectionnavigation beforelogin. Smalltop-left Aulas/Gestión de espacios brand. Centered narrow calm form around420pxwide directlyonivorysurface, no hugecard. HeadingIngresar, subtitleUsá tu cuenta para acceder a la gestión de aulas. Email field gabriela@example.com; Contraseña field masked with eyeicon; greenfullwidthIngresar. Quiet help Si necesitás una cuenta o cambiar tu contraseña, contactá al administrador. No actualcontactaddressinvented, no signup,forgotpasswordlink,sociallogin,rememberme,sessiontimer. Delicategreenrule and restrainedqualitytypography not promotionalillustrations. Neutral defaultstate not error.
```

## 02-agenda-movil

```text
Usecase ui-mockup. Match attached PATIO image STYLE ONLY: ivorybackground forestgreenprimary serifheadings humanistsans readable16pxbody roundedpanels fine separators warm restrainedterracotta. Spanish Aulas/Gestión de espacios app. No newfeatures,marketing,photos,deviceframes,OSstatusbar,notifications,PCfilters,offlinecapabilities. Currentdate8Sep2026; examples14Sep2026future. Generate only requested screen no collage. SINGLEmobileportrait screenshot768x1664 representing390x844CSSviewport. No frame,noOSstatusbar. HeaderAulas andhamburgerMenú andsmallGabriela·Bedel. TitleAgenda diaria. Date Lunes14sep2026 prevnext Hoy. DropdownTodaslasaulas andTodoslostipos stacked. Day/Week switch Díaactive. Primary+Nuevareserva compact. Show chronological DAILYLIST instead of multiroomcalendar grid:13:00–14:30Historia004-A-2026SofíaPazAula108General;14–15:30FísicaI003-A-2026AnaRuizAula105Multimedios;14–16MatemáticaI001-A-2026LauraGómezAula203Multimedios;15–17ProgramaciónI002-B-2026MartínDíazLab2Laboratorio. Each fullwidthcompactrow withchevron fordetail andtimeprominent. Show allconcurrentclasses as separate entries no collapse hidden. Bottomquiet4clases·Horario07–23. No bottomnavigation competingmenu. Readable realistic44pxhittargets. No labels of any classstate as live becausefuture.
```

## 03-formulario-movil

```text
Usecase ui-mockup. Match attached PATIO image STYLE ONLY: ivorybackground forestgreenprimary serifheadings humanistsans readable16pxbody roundedpanels fine separators warm restrainedterracotta. Spanish Aulas/Gestión de espacios app. No newfeatures,marketing,photos,deviceframes,OSstatusbar,notifications,PCfilters,offlinecapabilities. Currentdate8Sep2026; examples14Sep2026future. Generate only requested screen no collage. SINGLEmobileportrait768x1664 representing390x844CSSviewport. HeaderAulas hamburgerMenú, titleNuevareserva. Compactstepindicator1de3·Datosyfechas. Long SINGLEverticalscrollpage (not newsteps),show top viewport with scrollbar/clippedcontinuation atbottom. ModalidadEsporádica selected Periódica; DocenteLauraGómez dropdown, CursoMatemáticaI001-A-2026 dropdown,quietCrearcurso; Cantidaddealumnosprevista30 numeric; TipoMultimedios; checkboxProyector; Fechas section begins:1.Lunes14sep2026,Inicio14:00,Duración2h,Fin16:00readonly. Seconddate21sep16–17:30 continues belowfold, don't squeeze or falselyshowcompleted. Stickyfooter primaryConsultar aulas andquietSalir, with room so doesnotcoverinputs. Allfieldsfullwidth except pairedstartduration. No desktopsummarysidebar,no newfourthstep,nobottomOSbar. Sameform asdesktopstacked,not an entire shrunken desktopscreenshot.
```

## 04-error-consulta

```text
Usecase ui-mockup. Match attached PATIO image STYLE ONLY: ivorybackground forestgreenprimary serifheadings humanistsans readable16pxbody roundedpanels fine separators warm restrainedterracotta. Spanish Aulas/Gestión de espacios app. No newfeatures,marketing,photos,deviceframes,OSstatusbar,notifications,PCfilters,offlinecapabilities. Currentdate8Sep2026; examples14Sep2026future. Generate only requested screen no collage. SINGLEdesktop1536x1024 screenshot app headerAulas/Gestióndeespacios navAgendaDisponibilidadReservas(active)AulasIndicadores Gabriela·Bedel. Reservaperiódica headingAulas por día step1done2active3pending. SummaryMatemáticaI001-A-2026LauraGómez30alumnosprevistosMultimediosProyector,2.ºcuatrimestre2026. DaygroupsLunes14–16 andMiércoles14–16. Inline technical read-queryerror state in mainresultsarea clearicon andtitle No pudimos consultar la disponibilidad. Body Tus datos siguen en esta pantalla. Volvé a intentar la consulta. PrimaryReintentarconsulta. BottomsecondaryVolveradatosyfechas, Revisarreserva disabled. No availableroomcards,no emptyresult text,no 'no aulas disponibles' because queryfailed. No promise recoverdraftafterlogout,no offline,no errorstack, no success,no countdown. Calm helpful contained error, do notpaintentirepage red.
```


## Corrección del indicador de pasos

Editar solo las etiquetas: Datos y fechas completado, Aulas por día activo, Revisar pendiente. Conservar el resto.
