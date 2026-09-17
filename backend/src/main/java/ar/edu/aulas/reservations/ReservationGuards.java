package ar.edu.aulas.reservations;

import ar.edu.aulas.api.DomainError;
import ar.edu.aulas.calendar.CalendarManagement;
import ar.edu.aulas.rooms.RoomsService;
import java.time.*;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;

/** Called only after the shared permission lock and the aggregate lock. */
public class ReservationGuards {
    private final JdbcTemplate db;
    private final Clock clock;
    public ReservationGuards(JdbcTemplate db,Clock clock) {this.db=db;this.clock=clock.withZone(ZoneId.of("America/Argentina/Cordoba"));}
    public void room(long id,RoomsService.Room proposed) {
        var requirements=db.queryForList("select distinct r.id_reserva,r.tipo_aula,r.cantidad_alumnos,r.pizarron,r.recursos from aulas.reserva r join aulas.detalle_reserva d using(id_reserva) where d.id_aula=? and d.estado='CONFIRMADA' and d.fecha+d.hora_inicio+d.cantidad_modulos*interval '30 minutes'>?",id,LocalDateTime.now(clock));
        for(var r:requirements) {
            List<String> resources;
            try {resources=Arrays.asList((String[])((java.sql.Array)r.get("recursos")).getArray());}
            catch(java.sql.SQLException e) {throw new org.springframework.jdbc.UncategorizedSQLException("Leer requisitos",null,e);}
            if(!proposed.state().equals("Habilitada") || !proposed.type().equals(r.get("tipo_aula")) || proposed.capacity()<((Number)r.get("cantidad_alumnos")).intValue()
                || (r.get("pizarron")!=null && !proposed.board().equals(r.get("pizarron"))) || !(proposed.resources()==null?List.<String>of():proposed.resources()).containsAll(resources))
                throw DomainError.conflict("El cambio de aula afecta clases futuras o en curso de la reserva "+r.get("id_reserva")+". Reasigná o cancelá esas clases antes de modificarla.");
        }
    }
    public void calendar(long year,CalendarManagement.Config current,CalendarManagement.Edit edit) {
        var now=LocalDateTime.now(clock);
        var active=db.queryForList("select d.id_reserva,d.fecha,d.hora_inicio,d.cantidad_modulos from aulas.detalle_reserva d join aulas.reserva r using(id_reserva) join aulas.curso c using(id_curso) where c.id_anio_lectivo=? and d.estado='CONFIRMADA' and d.fecha+d.hora_inicio+d.cantidad_modulos*interval '30 minutes'>?",year,now);
        if(!edit.state().equals("Habilitado") && !active.isEmpty()) throw DomainError.conflict("El año tiene clases futuras o en curso; no se puede cerrar ni volver a preparación.");
        for(var detail:active) if(edit.holidays().contains(detail.get("fecha").toString()) && !current.holidays().contains(detail.get("fecha").toString()))
            throw DomainError.conflict("La fecha no lectiva afecta la reserva "+detail.get("id_reserva")+" del "+detail.get("fecha")+". Resolvé sus clases antes de cambiar el calendario.");
        var assigned=db.queryForList("select p.id_reserva,c.numero from aulas.periodo_asignado p join aulas.cuatrimestre c using(id_cuatrimestre) where c.id_anio_lectivo=?",year);
        Map<Long,List<List<String>>> ranges=new HashMap<>();
        for(var period:assigned) {
            String key=((Number)period.get("numero")).intValue()==1?"first":"second";
            var range=edit.terms().get(key);
            if(range.getFirst().isEmpty() || range.getLast().isEmpty()) throw DomainError.conflict("No se puede eliminar ni vaciar un cuatrimestre con reservas asociadas, incluidas las históricas.");
            ranges.computeIfAbsent(((Number)period.get("id_reserva")).longValue(),ignored->new ArrayList<>()).add(range);
        }
        for(var entry:ranges.entrySet()) {
            var details=db.queryForList("select fecha,fecha_original from aulas.detalle_reserva where id_reserva=?",entry.getKey());
            for(var detail:details) for(String field:List.of("fecha","fecha_original")) {
                String date=detail.get(field).toString();
                if(entry.getValue().stream().noneMatch(range->date.compareTo(range.getFirst())>=0 && date.compareTo(range.getLast())<=0))
                    throw DomainError.conflict("El recorte dejaría clases registradas de la reserva "+entry.getKey()+" fuera de sus períodos.");
            }
            // Transitional I-03 rule: never save a calendar that silently omits newly required classes.
            var eligible=db.queryForList("select r.id_reserva from aulas.reserva_periodica p join aulas.reserva r using(id_reserva) where r.id_reserva=? and r.estado='CONFIRMADA' and p.continuidad_cancelada_en is null",Long.class,entry.getKey());
            if(eligible.isEmpty()) continue;
            Set<String> represented=new HashSet<>(db.queryForList("select fecha_original::text from aulas.detalle_reserva where id_reserva=?",String.class,entry.getKey()));
            Set<String> excluded=new HashSet<>(db.queryForList("select fecha::text from aulas.fecha_excluida where id_reserva=?",String.class,entry.getKey()));
            var patterns=db.queryForList("select dia,hora_inicio from aulas.patron_semanal where id_reserva=?",entry.getKey());
            for(var range:entry.getValue()) for(var date=LocalDate.parse(range.getFirst());!date.isAfter(LocalDate.parse(range.getLast()));date=date.plusDays(1)) {
                String day=date.toString();
                if(edit.holidays().contains(day) || excluded.contains(day) || represented.contains(day)) continue;
                for(var pattern:patterns) if(date.getDayOfWeek().getValue()==((Number)pattern.get("dia")).intValue() && date.atTime(((java.sql.Time)pattern.get("hora_inicio")).toLocalTime()).isAfter(now))
                    throw DomainError.conflict("El cambio requiere generar nuevas clases de la reserva "+entry.getKey()+". No se guardó el calendario; revisá los períodos y las fechas no lectivas.");
            }
        }
    }
}
