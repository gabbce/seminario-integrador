package ar.edu.aulas.reservations;

import ar.edu.aulas.api.DomainError;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ReservationQueries {
    private final JdbcTemplate db;
    public ReservationQueries(JdbcTemplate db) {this.db=db;}
    @Transactional(readOnly=true,isolation=org.springframework.transaction.annotation.Isolation.REPEATABLE_READ)
    public List<Map<String,Object>> list(boolean operational) {
        return db.queryForList("select id_reserva from aulas.reserva order by id_reserva desc",Long.class).stream().map(id->get(id,operational)).toList();
    }
    @Transactional(readOnly=true,isolation=org.springframework.transaction.annotation.Isolation.REPEATABLE_READ)
    public Map<String,Object> get(long id,boolean operational) {
        var rows=db.queryForList("select r.*,m.nombre as materia,m.id_materia,c.comision,a.anio_calendario,u.nombre as registrador_nombre,u.apellido as registrador_apellido,u.email as registrador_email,u.activo from aulas.reserva r join aulas.curso c using(id_curso) join aulas.materia m using(id_materia) join aulas.anio_lectivo a using(id_anio_lectivo) join aulas.usuario u on u.id_usuario=r.registrado_por where r.id_reserva=?",id);
        if(rows.isEmpty()) throw new DomainError(404,"NOT_FOUND","La reserva no existe.");
        var r=rows.getFirst();var result=new LinkedHashMap<String,Object>();
        result.put("id",Long.toString(id));result.put("version",r.get("version"));result.put("subject",r.get("materia"));
        result.put("courseId",r.get("id_curso").toString());
        result.put("course",String.format("%03d-%s-%s",((Number)r.get("id_materia")).longValue(),r.get("comision"),r.get("anio_calendario")));
        result.put("teacher",r.get("nombre_docente")+" "+r.get("apellido_docente"));result.put("teacherId",r.get("docente_externo_id"));
        result.put("students",r.get("cantidad_alumnos"));result.put("type",r.get("tipo_aula"));result.put("board",Objects.toString(r.get("pizarron"),""));
        result.put("resources",db.queryForList("select unnest(recursos) from aulas.reserva where id_reserva=?",String.class,id));
        if(operational) {
            result.put("teacherEmail",r.get("email_docente"));
            result.put("registrant",Map.of("userId",r.get("registrado_por").toString(),"name",r.get("registrador_nombre")+" "+r.get("registrador_apellido"),"email",r.get("registrador_email"),"inactive",!Boolean.TRUE.equals(r.get("activo"))));
        }
        result.put("occurrences",db.query("select d.*,a.identificador from aulas.detalle_reserva d join aulas.aula a using(id_aula) where id_reserva=? order by fecha,hora_inicio,id_detalle",(rs,n)->{
            var detail=new LinkedHashMap<String,Object>();detail.put("id",rs.getString("id_detalle"));detail.put("date",rs.getDate("fecha").toString());
            var start=rs.getTime("hora_inicio").toLocalTime();detail.put("start",start.toString());detail.put("end",start.plusMinutes(rs.getInt("cantidad_modulos")*30L).toString());
            detail.put("room",rs.getString("identificador"));detail.put("cancelled",rs.getString("estado").equals("CANCELADA"));
            if(rs.getDate("fecha_original")!=null) detail.put("originalDate",rs.getDate("fecha_original").toString());
            return detail;
        },id));
        var periodic=db.queryForList("select modalidad from aulas.reserva_periodica where id_reserva=?",String.class,id);
        if(!periodic.isEmpty()) {
            String period=periodic.getFirst().equals("ANUAL")?"annual":db.queryForObject("select case c.numero when 1 then 'first' else 'second' end from aulas.periodo_asignado p join aulas.cuatrimestre c using(id_cuatrimestre) where p.id_reserva=?",String.class,id);
            result.put("schedule",Map.of("year",r.get("anio_calendario"),"period",period,"excluded",db.queryForList("select fecha::text from aulas.fecha_excluida where id_reserva=? order by fecha",String.class,id)));
            result.put("patterns",db.query("select p.*,a.identificador from aulas.patron_semanal p join aulas.aula a using(id_aula) where id_reserva=? order by dia",(rs,n)->Map.of("day",rs.getInt("dia"),"start",rs.getTime("hora_inicio").toLocalTime().toString(),"end",rs.getTime("hora_inicio").toLocalTime().plusMinutes(rs.getInt("cantidad_modulos")*30L).toString(),"room",rs.getString("identificador")),id));
        }
        return result;
    }
    @Transactional(readOnly=true,isolation=org.springframework.transaction.annotation.Isolation.REPEATABLE_READ)
    public Map<String,Object> operation(long actor,UUID key,boolean operational) {
        var ids=db.queryForList("select id_reserva from aulas.operacion_reserva where actor=? and clave=?",Long.class,actor,key);
        return ids.isEmpty()?Map.of("found",false):Map.of("found",true,"booking",get(ids.getFirst(),operational));
    }
}
