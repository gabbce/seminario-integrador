package ar.edu.aulas.reservations;

import ar.edu.aulas.api.DomainError;
import java.time.*;
import java.time.temporal.TemporalAdjusters;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;

@Service
public class ConsultationQueries {
    private final JdbcTemplate db;
    public ConsultationQueries(JdbcTemplate db) { this.db=db; }
    public record Row(String id,String bookingId,String courseId,String course,String subject,String teacher,
                      int students,String date,String start,String end,String room,String type,boolean cancelled) {}
    public record Result(List<Row> rows,long total,int page,int size,Map<String,Object> filters) {}
    private static final String FROM="""
        from aulas.detalle_reserva d join aulas.reserva r using(id_reserva)
        join aulas.aula a using(id_aula) join aulas.curso c on c.id_curso=r.id_curso
        join aulas.materia m using(id_materia) join aulas.anio_lectivo y using(id_anio_lectivo)
        left join lateral (select h.tipo from aulas.historial_aula h where h.id_aula=d.id_aula
          and h.desde <= ((d.fecha+d.hora_inicio) at time zone 'America/Argentina/Buenos_Aires')
          and (h.hasta is null or h.hasta > ((d.fecha+d.hora_inicio) at time zone 'America/Argentina/Buenos_Aires'))
          order by h.desde desc,h.id desc limit 1) h on true
        """;
    private static final String TYPE="coalesce(h.tipo,'Sin historia')";
    private static final String SELECT="select d.id_detalle,r.id_reserva,r.id_curso,m.id_materia,m.nombre,c.comision,y.anio_calendario,r.nombre_docente,r.apellido_docente,r.cantidad_alumnos,d.fecha,d.hora_inicio,d.cantidad_modulos,a.identificador,"+TYPE+" as tipo,d.estado ";
    @Transactional(readOnly=true,isolation=Isolation.REPEATABLE_READ)
    public Result agenda(LocalDate date,String view,String room,String type) {
        if(date==null || !Set.of("day","week").contains(view)) throw invalid();
        LocalDate from=view.equals("week")?date.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)):date;
        LocalDate to=view.equals("week")?from.plusDays(4):date;
        var args=new ArrayList<Object>(List.of(from,to));
        String where=" where d.fecha between ? and ? and d.estado<>'CANCELADA'"+filters(room,type,args);
        var rows=read(where,"d.fecha,d.hora_inicio,a.identificador,d.id_detalle",args,null,null);
        return new Result(rows,rows.size(),0,0,Map.of("view",view,"from",from.toString(),"to",to.toString(),"room",room,"type",type,"status","active"));
    }
    @Transactional(readOnly=true,isolation=Isolation.REPEATABLE_READ)
    public Result listing(String mode,LocalDate date,Long courseId,Integer year,String room,String type,String status,int page,int size) {
        return listingRead(mode,date,courseId,year,room,type,status,page,size,false);
    }
    @Transactional(readOnly=true,isolation=Isolation.REPEATABLE_READ)
    public Result printDay(LocalDate date,String room,String type,String status) {
        return listingRead("day",date,null,null,room,type,status,0,20,true);
    }
    private Result listingRead(String mode,LocalDate date,Long courseId,Integer year,String room,String type,String status,int page,int size,boolean complete) {
        if(!Set.of("day","course").contains(mode)||!Set.of("active","cancelled","all").contains(status)||page<0||!Set.of(20,50,100).contains(size)) throw invalid();
        var args=new ArrayList<Object>();
        var applied=new LinkedHashMap<String,Object>();
        applied.put("mode",mode);applied.put("room",room);applied.put("type",type);applied.put("status",status);
        String where;
        if(mode.equals("day")) {
            if(date==null) throw invalid();
            where=" where d.fecha=?";args.add(date);applied.put("date",date.toString());
        } else {
            if(courseId==null||courseId<1||year==null||year<1||year>9999) throw invalid();
            if(!Boolean.TRUE.equals(db.queryForObject("select exists(select 1 from aulas.curso c join aulas.anio_lectivo y using(id_anio_lectivo) where c.id_curso=? and y.anio_calendario=?)",Boolean.class,courseId,year))) throw invalid();
            where=" where r.id_curso=? and y.anio_calendario=?";args.add(courseId);args.add(year);
            applied.put("courseId",courseId.toString());applied.put("year",year);
        }
        where+=filters(room,type,args);
        if(!status.equals("all")) where+=status.equals("cancelled")?" and d.estado='CANCELADA'":" and d.estado<>'CANCELADA'";
        long total=db.queryForObject("select count(*) "+FROM+where,Long.class,args.toArray());
        return new Result(read(where,mode.equals("day")?TYPE+",d.hora_inicio,a.identificador,d.id_detalle":"d.fecha,d.hora_inicio,d.id_detalle",args,complete?null:size,complete?null:(long)page*size),total,page,complete?0:size,applied);
    }
    private String filters(String room,String type,List<Object> args) {
        if(room==null||type==null||!Set.of("","General","Multimedios","Laboratorio","Sin historia").contains(type)) throw invalid();
        String sql="";
        if(!room.isEmpty()) {sql+=" and a.identificador=?";args.add(room);}
        if(!type.isEmpty()) {sql+=" and "+TYPE+"=?";args.add(type);}
        return sql;
    }
    private List<Row> read(String where,String order,List<Object> args,Integer limit,Long offset) {
        var parameters=new ArrayList<>(args);
        String sql=SELECT+FROM+where+" order by "+order;
        if(limit!=null) {sql+=" limit ? offset ?";parameters.add(limit);parameters.add(offset);}
        return db.query(sql,(rs,n)->new Row(rs.getString("id_detalle"),rs.getString("id_reserva"),rs.getString("id_curso"),
            String.format("%03d-%s-%d",rs.getLong("id_materia"),rs.getString("comision"),rs.getInt("anio_calendario")),rs.getString("nombre"),
            rs.getString("nombre_docente")+" "+rs.getString("apellido_docente"),rs.getInt("cantidad_alumnos"),rs.getDate("fecha").toString(),
            rs.getTime("hora_inicio").toLocalTime().toString(),rs.getTime("hora_inicio").toLocalTime().plusMinutes(rs.getInt("cantidad_modulos")*30L).toString(),
            rs.getString("identificador"),rs.getString("tipo"),rs.getString("estado").equals("CANCELADA")),parameters.toArray());
    }
    private DomainError invalid() {return new DomainError(400,"INVALID_QUERY","Revisá los filtros de la consulta.");}
}
