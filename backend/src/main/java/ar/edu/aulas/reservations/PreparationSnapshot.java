package ar.edu.aulas.reservations;

import ar.edu.aulas.api.DomainError;
import ar.edu.aulas.calendar.CalendarManagement;
import java.time.*;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/** One PostgreSQL statement gives calendar, candidates and conflicts the same MVCC snapshot.
 * It also joins an existing confirmation transaction, after that caller acquires its locks. */
final class PreparationSnapshot {
    record Snapshot(CalendarManagement.Config calendar, boolean courseMatches,
                    List<PeriodicPreparation.Room> rooms, List<AlternativeRanking.Occupied> occupied) {}
    private static final ObjectMapper JSON = new ObjectMapper();
    private PreparationSnapshot() {}

    static Snapshot read(JdbcTemplate db,int year,String courseId,String period,String type,int students,
                         String board,List<String> resources,List<ReservationOccupancy.Window> windows,boolean operational) {
        var args=new ArrayList<Object>();args.add(year);
        String course=courseId==null?"true":"exists(select 1 from aulas.curso c where c.id_curso=? and c.id_anio_lectivo=y.id_anio_lectivo)";
        if(courseId!=null)args.add(Long.parseLong(courseId));
        args.add(type);args.add(students);
        String roomScope="a.baja_en is null and a.estado='Habilitada' and a.tipo=? and a.capacidad>=?";
        if(board!=null && !board.isEmpty()){roomScope+=" and a.pizarron=?";args.add(board);}
        for(String resource:resources)roomScope+=" and coalesce("+switch(resource){
            case "fans"->"a.ventiladores";case "air"->"a.aire";case "projector"->"m.proyector";
            case "television"->"m.televisor";case "computer"->"m.computadora";default->throw DomainError.invalid("Recurso inválido.");}+",false)";
        var clauses=new ArrayList<String>();
        for(var w:windows){
            String clause="(d.hora_inicio < ?::time and d.hora_inicio+d.cantidad_modulos*interval '30 minutes' > ?::time";
            args.add(w.end().toString());args.add(w.start().toString());
            if(w.weekday()!=null){clause+=" and extract(isodow from d.fecha)=?";args.add(w.weekday());}
            if(w.date()!=null){clause+=" and d.fecha=?::date";args.add(w.date().toString());}
            clauses.add(clause+")");
        }
        String dates;
        if(period==null)dates="d.fecha between make_date(y.anio_calendario,1,1) and make_date(y.anio_calendario,12,31)";
        else {
            // Annual requests include the recess between terms, matching omission/ranking semantics.
            dates="d.fecha between (select min(inicio) from aulas.cuatrimestre where id_anio_lectivo=y.id_anio_lectivo"+
                (period.equals("annual")?"":" and numero="+(period.equals("first")?1:2))+") and (select max(fin) from aulas.cuatrimestre where id_anio_lectivo=y.id_anio_lectivo"+
                (period.equals("annual")?"":" and numero="+(period.equals("first")?1:2))+")";
        }
        String sql="""
            with selected_year as (select * from aulas.anio_lectivo where anio_calendario=?),
            calendar as (select y.*, %s as course_matches,
              coalesce((select jsonb_object_agg(case numero when 1 then 'first' else 'second' end,
                jsonb_build_array(coalesce(inicio::text,''),coalesce(fin::text,''))) from aulas.cuatrimestre where id_anio_lectivo=y.id_anio_lectivo),'{}'::jsonb)::text as terms,
              coalesce((select jsonb_object_agg(fecha::text,descripcion) from aulas.feriado where id_anio_lectivo=y.id_anio_lectivo),'{}'::jsonb)::text as descriptions
              from selected_year y),
            candidates as (select a.id_aula,a.identificador,a.version,a.tipo,a.capacidad from aulas.aula a
              left join aulas.aula_multimedios m using(id_aula) where %s),
            occupied as (select %s from aulas.detalle_reserva d join candidates candidate using(id_aula)
              join aulas.reserva r using(id_reserva) join aulas.curso c using(id_curso)
              join aulas.materia m using(id_materia) join aulas.anio_lectivo a using(id_anio_lectivo)
              left join aulas.reserva_periodica p on p.id_reserva=r.id_reserva
              join aulas.usuario u on u.id_usuario=r.registrado_por cross join selected_year y
              where d.estado='CONFIRMADA' and %s and (%s))
            select y.*,coalesce((select jsonb_agg(candidate order by capacidad,identificador) from candidates candidate),'[]'::jsonb)::text as rooms,
              coalesce((select jsonb_agg(o) from occupied o),'[]'::jsonb)::text as occupied from calendar y
            """.formatted(course,roomScope,ReservationOccupancy.projection(operational),dates,String.join(" or ",clauses));
        var rows=db.query(sql,(rs,n)->{
            Map<String,List<String>> terms=new LinkedHashMap<>();terms.put("first",List.of("",""));terms.put("second",List.of("",""));
            for(var entry:JSON.readTree(rs.getString("terms")).properties())terms.put(entry.getKey(),List.of(entry.getValue().get(0).asText(),entry.getValue().get(1).asText()));
            Map<String,String> descriptions=new LinkedHashMap<>();
            for(var entry:JSON.readTree(rs.getString("descriptions")).properties())descriptions.put(entry.getKey(),entry.getValue().asText());
            String state=switch(rs.getString("estado")){case "HABILITADO"->"Habilitado";case "EN_PREPARACION"->"En preparación";default->"Cerrado";};
            var calendar=new CalendarManagement.Config(rs.getString("id_anio_lectivo"),year,state,rs.getLong("version"),terms,descriptions.keySet().stream().sorted().toList(),descriptions);
            var rooms=new ArrayList<PeriodicPreparation.Room>();
            for(var room:JSON.readTree(rs.getString("rooms")))rooms.add(new PeriodicPreparation.Room(room.get("id_aula").asText(),room.get("identificador").asText(),room.get("version").asLong(),room.get("tipo").asText(),room.get("capacidad").asInt()));
            var occupied=new ArrayList<AlternativeRanking.Occupied>();
            for(var o:JSON.readTree(rs.getString("occupied")))occupied.add(occupied(o,operational));
            return new Snapshot(calendar,rs.getBoolean("course_matches"),rooms,occupied);
        },args.toArray());
        if(rows.isEmpty())throw new DomainError(404,"NOT_FOUND","El año no existe.");
        return rows.getFirst();
    }
    private static AlternativeRanking.Occupied occupied(JsonNode o,boolean operational) {
        var registrant=operational?new AlternativeRanking.Registrant(o.get("id_usuario").asText(),
            o.get("registrant_name").asText()+" "+o.get("registrant_surname").asText(),
            o.get("registrant_email").asText(),!o.get("activo").asBoolean()):null;
        return new AlternativeRanking.Occupied(o.get("id_aula").asLong(),LocalDate.parse(o.get("fecha").asText()),
            LocalTime.parse(o.get("hora_inicio").asText()),o.get("cantidad_modulos").asInt(),o.get("id_reserva").asText(),
            o.get("subject").asText(),String.format("%03d-%s-%s",o.get("id_materia").asLong(),o.get("comision").asText(),o.get("anio_calendario").asInt()),
            o.get("modality").asText(),o.get("nombre_docente").asText()+" "+o.get("apellido_docente").asText(),nullable(o,"email_docente"),registrant);
    }
    private static String nullable(JsonNode node,String key){return node.get(key).isNull()?null:node.get(key).asText();}
}
