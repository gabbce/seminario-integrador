-- Fixture F05. Only a fresh disposable database created by exact-env.mjs.
DO $$ BEGIN
 IF current_database()<>'aulas_qa_exact' OR EXISTS(select 1 from aulas.aula) OR EXISTS(select 1 from aulas.reserva) THEN
  RAISE EXCEPTION 'El fixture requiere una base QA exacta nueva y vacía';
 END IF;
END $$;
insert into aulas.anio_lectivo(anio_calendario,estado) values (2021,'CERRADO');
insert into aulas.cuatrimestre(id_anio_lectivo,numero,inicio,fin)
select id_anio_lectivo,1,'2021-03-01'::date,'2021-06-30'::date from aulas.anio_lectivo
union all select id_anio_lectivo,2,'2021-08-02'::date,'2021-11-30'::date from aulas.anio_lectivo;
insert into aulas.feriado(id_anio_lectivo,fecha,descripcion) select id_anio_lectivo,'2021-05-03','Quinto lunes excluido' from aulas.anio_lectivo;
insert into aulas.materia(nombre,nombre_normalizado) values ('Indicadores exactos','INDICADORES EXACTOS');
insert into aulas.curso(id_materia,id_anio_lectivo,comision) select id_materia,id_anio_lectivo,'QA' from aulas.materia cross join aulas.anio_lectivo;
insert into aulas.aula(identificador,tipo,capacidad,estado,ubicacion,piso,pizarron,ventiladores,aire)
select name,'General',80,'Inhabilitada','Fixture exacto',0,'Tiza',false,false from unnest(array['A','B','C','D','H','P','Z']) name;
-- Current H was later changed and disabled; the historical occurrence retains its types.
update aulas.aula set tipo='Multimedios' where identificador='H';
insert into aulas.aula_multimedios(id_aula,televisor,proyector,computadora) select id_aula,false,false,false from aulas.aula where identificador='H';
create function pg_temp.history(room text,lo text,hi text,kind text,state text) returns void language sql as $$
 insert into aulas.historial_aula(id_aula,desde,hasta,tipo,estado,baja)
 select id_aula,lo::timestamp at time zone 'America/Argentina/Buenos_Aires',hi::timestamp at time zone 'America/Argentina/Buenos_Aires',kind,state,false from aulas.aula where identificador=room;
$$;

select pg_temp.history('A','2021-01-01 00:00','2021-03-01 07:00','General','Inhabilitada');
select pg_temp.history('A','2021-03-01 07:00','2021-03-01 15:00','General','Habilitada');
select pg_temp.history('A','2021-03-01 15:00','2021-03-02 07:00','General','Inhabilitada');
select pg_temp.history('A','2021-03-02 07:00','2021-03-02 09:00','General','Habilitada');
select pg_temp.history('A','2021-03-02 09:00',null,'General','Inhabilitada');
select pg_temp.history('B','2021-01-01 00:00','2021-03-01 07:00','General','Inhabilitada');
select pg_temp.history('B','2021-03-01 07:00','2021-03-01 09:00','General','Habilitada');
select pg_temp.history('B','2021-03-01 09:00','2021-03-02 07:00','General','Inhabilitada');
select pg_temp.history('B','2021-03-02 07:00','2021-03-02 09:00','General','Habilitada');
select pg_temp.history('B','2021-03-02 09:00',null,'General','Inhabilitada');
select pg_temp.history('C','2021-01-01 00:00','2021-03-03 07:00','General','Inhabilitada');
select pg_temp.history('C','2021-03-03 07:00','2021-03-03 23:00','General','Habilitada');
select pg_temp.history('C','2021-03-03 23:00','2021-03-04 07:00','General','Inhabilitada');
select pg_temp.history('C','2021-03-04 07:00','2021-03-04 23:00','General','Habilitada');
select pg_temp.history('C','2021-03-04 23:00','2021-03-05 07:00','General','Inhabilitada');
select pg_temp.history('C','2021-03-05 07:00','2021-03-05 23:00','General','Habilitada');
select pg_temp.history('C','2021-03-05 23:00','2021-04-05 07:00','General','Inhabilitada');
select pg_temp.history('C','2021-04-05 07:00','2021-04-05 23:00','General','Habilitada');
select pg_temp.history('C','2021-04-05 23:00','2021-04-12 07:00','General','Inhabilitada');
select pg_temp.history('C','2021-04-12 07:00','2021-04-12 23:00','General','Habilitada');
select pg_temp.history('C','2021-04-12 23:00','2021-04-19 07:00','General','Inhabilitada');
select pg_temp.history('C','2021-04-19 07:00','2021-04-19 23:00','General','Habilitada');
select pg_temp.history('C','2021-04-19 23:00','2021-04-26 07:00','General','Inhabilitada');
select pg_temp.history('C','2021-04-26 07:00','2021-04-26 23:00','General','Habilitada');
select pg_temp.history('C','2021-04-26 23:00','2021-05-03 07:00','General','Inhabilitada');
select pg_temp.history('C','2021-05-03 07:00','2021-05-03 23:00','General','Habilitada');
select pg_temp.history('C','2021-05-03 23:00',null,'General','Inhabilitada');
select pg_temp.history('D','2021-01-01 00:00','2021-03-03 07:00','General','Inhabilitada');
select pg_temp.history('D','2021-03-03 07:00','2021-03-03 23:00','General','Habilitada');
select pg_temp.history('D','2021-03-03 23:00',null,'General','Inhabilitada');
select pg_temp.history('H','2021-01-01 00:00','2021-03-08 10:10','General','Inhabilitada');
select pg_temp.history('H','2021-03-08 10:10','2021-03-08 11:10','General','Habilitada');
select pg_temp.history('H','2021-03-08 11:10','2021-03-08 12:10','Multimedios','Habilitada');
select pg_temp.history('H','2021-03-08 12:10',null,'Multimedios','Inhabilitada');
select pg_temp.history('P','2021-01-01 00:00','2021-03-09 07:00','General','Inhabilitada');
select pg_temp.history('P','2021-03-09 10:10','2021-03-09 23:00','General','Habilitada');
select pg_temp.history('P','2021-03-09 23:00',null,'General','Inhabilitada');
select pg_temp.history('Z','2021-01-01 00:00',null,'General','Inhabilitada');

-- A later logical deletion must not rewrite the 2021 calculation.
update aulas.aula set baja_en='2022-01-01 00:00'::timestamp at time zone 'America/Argentina/Buenos_Aires' where identificador='H';
update aulas.historial_aula set hasta='2022-01-01 00:00'::timestamp at time zone 'America/Argentina/Buenos_Aires' where id_aula=(select id_aula from aulas.aula where identificador='H') and hasta is null;
insert into aulas.historial_aula(id_aula,desde,tipo,estado,baja) select id_aula,'2022-01-01 00:00'::timestamp at time zone 'America/Argentina/Buenos_Aires','Multimedios','Inhabilitada',true from aulas.aula where identificador='H';
create function pg_temp.class(room text,day date,start time,modules integer,students integer) returns void language plpgsql as $$
declare booking bigint;
begin
 insert into aulas.reserva(registrado_por,id_curso,docente_externo_id,nombre_docente,apellido_docente,email_docente,cantidad_alumnos,tipo_aula)
 select (select min(id_usuario) from aulas.usuario where rol='ADMINISTRADOR'),id_curso,'D-01','Laura','Gómez','fixture@example.invalid',students,'General' from aulas.curso returning id_reserva into booking;
 insert into aulas.reserva_esporadica values (booking);
 insert into aulas.detalle_reserva(id_reserva,id_aula,fecha,hora_inicio,cantidad_modulos)
 select booking,id_aula,day,start,modules from aulas.aula where identificador=room;
end $$;
-- Independent cases: each date is a separate example.
select pg_temp.class('A','2021-03-01','07:00',4,30);
select pg_temp.class('A','2021-03-02','07:00',4,30);
select pg_temp.class('B','2021-03-02','07:00',4,20);
select pg_temp.class('C','2021-03-03','14:00',2,30);
select pg_temp.class('D','2021-03-03','14:30',2,20);
select pg_temp.class('C','2021-03-04','14:00',4,30);
select pg_temp.class('C','2021-03-05','14:00',4,30);
select pg_temp.class('C','2021-03-05','16:00',1,20);
select pg_temp.class('H','2021-03-08','10:30',3,30);
select pg_temp.class('C','2021-04-05','14:00',2,40);
select pg_temp.class('C','2021-04-19','14:00',2,20);
