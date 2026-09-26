package ar.edu.aulas.reservations;

import ar.edu.aulas.api.DomainError;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ReservationQueries {
    private final JdbcTemplate db;
    public ReservationQueries(JdbcTemplate db) {this.db=db;}
    @Transactional(readOnly=true,isolation=org.springframework.transaction.annotation.Isolation.REPEATABLE_READ)
    public List<Map<String,Object>> list(boolean operational) {return read(null,operational);}
    @Transactional(readOnly=true,isolation=org.springframework.transaction.annotation.Isolation.REPEATABLE_READ)
    public Map<String,Object> get(long id,boolean operational) {
        var rows=read(id,operational);
        if(rows.isEmpty()) throw new DomainError(404,"NOT_FOUND","La reserva no existe.");
        return rows.getFirst();
    }
    private record Child<T>(long reservation,T value) {}
    private <T> Map<Long,List<T>> children(String sql,Object[] args,RowMapper<T> mapper) {
        var result=new HashMap<Long,List<T>>();
        for(var child:db.query(sql,(rs,n)->new Child<>(rs.getLong("id_reserva"),mapper.mapRow(rs,n)),args)) result.computeIfAbsent(child.reservation(),key->new ArrayList<>()).add(child.value());
        return result;
    }
    /** At most seven grouped reads regardless of reservation count; detail uses the same mapping with an ID predicate. */
    private List<Map<String,Object>> read(Long id,boolean operational) {
        Object[] args=id==null?new Object[0]:new Object[]{id};
        String where=id==null?"":" where r.id_reserva=?";
        String privateColumns=operational?",r.email_docente,r.registrado_por,u.nombre as registrador_nombre,u.apellido as registrador_apellido,u.email as registrador_email,u.activo":"";
        String privateJoin=operational?" join aulas.usuario u on u.id_usuario=r.registrado_por":"";
        var rows=db.queryForList("select r.id_reserva,r.version,r.estado,rp.continuidad_cancelada_en,r.id_curso,r.nombre_docente,r.apellido_docente,r.docente_externo_id,r.cantidad_alumnos,r.tipo_aula,r.pizarron,m.nombre as materia,m.id_materia,c.comision,a.anio_calendario"+privateColumns+" from aulas.reserva r join aulas.curso c using(id_curso) join aulas.materia m using(id_materia) join aulas.anio_lectivo a using(id_anio_lectivo) left join aulas.reserva_periodica rp on rp.id_reserva=r.id_reserva"+privateJoin+where+" order by r.id_reserva desc",args);
        if(rows.isEmpty()) return List.of();
        var resources=children("select r.id_reserva,x.resource from aulas.reserva r cross join lateral unnest(r.recursos) with ordinality x(resource,position)"+where+" order by r.id_reserva,x.position",args,(rs,n)->rs.getString("resource"));
        var occurrences=children("select r.id_reserva,r.id_detalle,r.fecha,r.hora_inicio,r.cantidad_modulos,r.estado,r.fecha_original,r.motivo_cancelacion,r.cancelado_en"+(operational?",cancelador.nombre as cancelador_nombre,cancelador.apellido as cancelador_apellido":"")+",a.identificador from aulas.detalle_reserva r join aulas.aula a using(id_aula)"+(operational?" left join aulas.usuario cancelador on cancelador.id_usuario=r.cancelado_por":"")+where+" order by r.id_reserva,r.fecha,r.hora_inicio,r.id_detalle",args,(rs,n)->{
            var detail=new LinkedHashMap<String,Object>();detail.put("id",rs.getString("id_detalle"));detail.put("date",rs.getDate("fecha").toString());
            var start=rs.getTime("hora_inicio").toLocalTime();detail.put("start",start.toString());detail.put("end",start.plusMinutes(rs.getInt("cantidad_modulos")*30L).toString());
            detail.put("room",rs.getString("identificador"));detail.put("cancelled",rs.getString("estado").equals("CANCELADA"));
            if(rs.getString("motivo_cancelacion")!=null) {
                var cancellation=new LinkedHashMap<String,Object>();cancellation.put("reason",rs.getString("motivo_cancelacion"));cancellation.put("at",rs.getObject("cancelado_en",java.time.OffsetDateTime.class).toInstant().toString());
                if(operational) cancellation.put("actor",rs.getString("cancelador_nombre")+" "+rs.getString("cancelador_apellido"));
                detail.put("cancellation",cancellation);
            }
            if(rs.getDate("fecha_original")!=null) detail.put("originalDate",rs.getDate("fecha_original").toString());
            return detail;
        });
        var periods=children("select r.id_reserva,case when r.modalidad='ANUAL' then 'annual' when min(c.numero)=1 then 'first' else 'second' end as period from aulas.reserva_periodica r join aulas.periodo_asignado p using(id_reserva) join aulas.cuatrimestre c using(id_cuatrimestre)"+where+" group by r.id_reserva,r.modalidad",args,(rs,n)->rs.getString("period"));
        var excluded=children("select r.id_reserva,r.fecha::text from aulas.fecha_excluida r"+where+" order by r.id_reserva,r.fecha",args,(rs,n)->rs.getString("fecha"));
        var patterns=children("select r.id_reserva,r.dia,r.hora_inicio,r.cantidad_modulos,a.identificador from aulas.patron_semanal r join aulas.aula a using(id_aula)"+where+" order by r.id_reserva,r.dia",args,(rs,n)->Map.of("day",rs.getInt("dia"),"start",rs.getTime("hora_inicio").toLocalTime().toString(),"end",rs.getTime("hora_inicio").toLocalTime().plusMinutes(rs.getInt("cantidad_modulos")*30L).toString(),"room",rs.getString("identificador")));
        var changes=operational?children("select r.entidad_id as id_reserva,r.instante,case when r.operacion='RESTABLECER_DEMO' then 'Restablecimiento demo: se restauró el escenario registrado. Consultá las clases actuales.' else r.detalle end as detalle,u.nombre,u.apellido from aulas.evento_auditoria r join aulas.usuario u on u.id_usuario=r.actor where r.entidad='RESERVA' and r.operacion in ('EDITAR_CABECERA','CAMBIAR_AULAS','REPROGRAMAR','EXTENDER_CALENDARIO','RESTABLECER_DEMO')"+(id==null?"":" and r.entidad_id=?")+" order by r.instante,r.id",args,(rs,n)->Map.of("at",rs.getObject("instante",java.time.OffsetDateTime.class).toInstant().toString(),"actor",rs.getString("nombre")+" "+rs.getString("apellido"),"description",rs.getString("detalle"))):Map.<Long,List<Map<String,String>>>of();
        var results=new ArrayList<Map<String,Object>>();
        for(var r:rows) {
            long key=((Number)r.get("id_reserva")).longValue();var result=new LinkedHashMap<String,Object>();
            result.put("id",Long.toString(key));result.put("state",r.get("estado"));
            if(r.get("continuidad_cancelada_en")!=null) result.put("continuityCancelledAt",((java.sql.Timestamp)r.get("continuidad_cancelada_en")).toInstant().toString());result.put("version",r.get("version"));result.put("subject",r.get("materia"));result.put("courseId",r.get("id_curso").toString());
            result.put("course",String.format("%03d-%s-%s",((Number)r.get("id_materia")).longValue(),r.get("comision"),r.get("anio_calendario")));
            result.put("teacher",r.get("nombre_docente")+" "+r.get("apellido_docente"));result.put("teacherId",r.get("docente_externo_id"));
            result.put("students",r.get("cantidad_alumnos"));result.put("type",r.get("tipo_aula"));result.put("board",Objects.toString(r.get("pizarron"),""));result.put("resources",resources.getOrDefault(key,List.of()));
            if(operational) {
                if(changes.containsKey(key)) result.put("changes",changes.get(key));
                result.put("teacherEmail",r.get("email_docente"));
                result.put("registrant",Map.of("userId",r.get("registrado_por").toString(),"name",r.get("registrador_nombre")+" "+r.get("registrador_apellido"),"email",r.get("registrador_email"),"inactive",!Boolean.TRUE.equals(r.get("activo"))));
            }
            result.put("occurrences",occurrences.getOrDefault(key,List.of()));
            if(periods.containsKey(key)) {
                result.put("schedule",Map.of("year",r.get("anio_calendario"),"period",periods.get(key).getFirst(),"excluded",excluded.getOrDefault(key,List.of())));
                result.put("patterns",patterns.getOrDefault(key,List.of()));
            }
            results.add(result);
        }
        return results;
    }
    @Transactional(readOnly=true,isolation=org.springframework.transaction.annotation.Isolation.REPEATABLE_READ)
    public Map<String,Object> operation(long actor,UUID key,boolean operational) {
        var ids=db.queryForList("select invalidada_en,id_reserva from aulas.operacion_reserva where actor=? and clave=?",actor,key);
        if(!ids.isEmpty()) OperationRecovery.requireCurrent(ids.getFirst());
        return ids.isEmpty()?Map.of("found",false):Map.of("found",true,"booking",get(((Number)ids.getFirst().get("id_reserva")).longValue(),operational));
    }
}
