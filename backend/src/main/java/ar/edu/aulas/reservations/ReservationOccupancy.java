package ar.edu.aulas.reservations;

import java.time.LocalDate;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;

/** Shared persisted occupancy projection; private contacts never enter a teacher response. */
final class ReservationOccupancy {
    private ReservationOccupancy() {}
    static List<AlternativeRanking.Occupied> read(JdbcTemplate db, LocalDate start, LocalDate end, boolean operational) {
        // Contacts are omitted at the SQL projection and JSON boundary for non-operational callers.
        String contacts=operational?"r.email_docente,u.id_usuario,u.nombre as registrant_name,u.apellido as registrant_surname,u.email as registrant_email,u.activo":"null::text as email_docente,null::bigint as id_usuario,null::text as registrant_name,null::text as registrant_surname,null::text as registrant_email,null::boolean as activo";
        return db.query("select d.id_aula,d.fecha,d.hora_inicio,d.cantidad_modulos,r.id_reserva,m.nombre as subject,m.id_materia,c.comision,a.anio_calendario,case when p.id_reserva is null then 'sporadic' else 'periodic' end as modality,r.nombre_docente,r.apellido_docente,"+contacts+" from aulas.detalle_reserva d join aulas.reserva r using(id_reserva) join aulas.curso c using(id_curso) join aulas.materia m using(id_materia) join aulas.anio_lectivo a using(id_anio_lectivo) left join aulas.reserva_periodica p on p.id_reserva=r.id_reserva join aulas.usuario u on u.id_usuario=r.registrado_por where d.estado='CONFIRMADA' and d.fecha between ? and ?",
            (rs,n)->new AlternativeRanking.Occupied(rs.getLong("id_aula"),rs.getDate("fecha").toLocalDate(),rs.getTime("hora_inicio").toLocalTime(),rs.getInt("cantidad_modulos"),rs.getString("id_reserva"),rs.getString("subject"),String.format("%03d-%s-%s",rs.getLong("id_materia"),rs.getString("comision"),rs.getInt("anio_calendario")),rs.getString("modality"),rs.getString("nombre_docente")+" "+rs.getString("apellido_docente"),rs.getString("email_docente"),operational?new AlternativeRanking.Registrant(rs.getString("id_usuario"),rs.getString("registrant_name")+" "+rs.getString("registrant_surname"),rs.getString("registrant_email"),!rs.getBoolean("activo")):null),java.sql.Date.valueOf(start),java.sql.Date.valueOf(end));
    }
}
