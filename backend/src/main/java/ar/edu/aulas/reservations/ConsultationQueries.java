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
          and h.desde <= ((d.fecha+d.hora_inicio) at time zone 'America/Argentina/Cordoba')
          and (h.hasta is null or h.hasta > ((d.fecha+d.hora_inicio) at time zone 'America/Argentina/Cordoba'))
          order by h.desde desc,h.id desc limit 1) h on true
        """;
    private static final String TYPE="coalesce(h.tipo,'Sin historia')";
    private static final String SELECT="select d.id_detalle,r.id_reserva,r.id_curso,m.id_materia,m.nombre,c.comision,y.anio_calendario,r.nombre_docente,r.apellido_docente,r.cantidad_alumnos,d.fecha,d.hora_inicio,d.cantidad_modulos,a.identificador,"+TYPE+" as tipo,d.estado ";
    @Transactional(readOnly=true,isolation=Isolation.REPEATABLE_READ)
    public Result agenda(LocalDate date,String view,String room,String type) {return agenda(date,view,room,type,null,"");}
    /** Course (subject, commission and year) and teacher narrow the agenda to the classes of that course or teacher (DA-86). */
    @Transactional(readOnly=true,isolation=Isolation.REPEATABLE_READ)
    public Result agenda(LocalDate date,String view,String room,String type,Long courseId,String teacher) {
        if(date==null || !Set.of("day","week").contains(view) || (courseId!=null && courseId<1) || teacher==null) throw invalid();
        LocalDate from=view.equals("week")?date.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)):date;
        LocalDate to=view.equals("week")?from.plusDays(4):date;
        var args=new ArrayList<Object>(List.of(from,to));
        String where=" where d.fecha between ? and ? and d.estado<>'CANCELADA'"+filters(room,type,args);
        if(courseId!=null) {where+=" and r.id_curso=?";args.add(courseId);}
        String who=teacher.strip();
        if(!who.isEmpty()) {where+=" and r.docente_externo_id=?";args.add(who);}
        var rows=read(where,"d.fecha,d.hora_inicio,a.identificador,d.id_detalle",args,null,null);
        return new Result(rows,rows.size(),0,0,Map.of("view",view,"from",from.toString(),"to",to.toString(),"room",room,"type",type,"status","active",
            "courseId",courseId==null?"":courseId.toString(),"teacher",who));
    }
    // A single statement supplies both the count and rows from the same MVCC snapshot.
    // No multi-statement transaction/isolation setup is needed on the remote connection.
    public Result listing(String mode,LocalDate date,Long courseId,Integer year,String room,String type,String status,int page,int size) {
        return listingRead(mode,date,courseId,year,room,type,status,page,size,false);
    }
    public Result printDay(LocalDate date,String room,String type,String status) {
        return listingRead("day",date,null,null,room,type,status,0,20,true);
    }
    private Result listingRead(String mode,LocalDate date,Long courseId,Integer year,String room,String type,String status,int page,int size,boolean complete) {
        if(mode==null || status==null || !Set.of("day","course").contains(mode)||!Set.of("active","cancelled","all").contains(status)||page<0||!Set.of(20,50,100).contains(size)) throw invalid();
        var args=new ArrayList<Object>();
        var applied=new LinkedHashMap<String,Object>();
        applied.put("mode",mode);applied.put("room",room);applied.put("type",type);applied.put("status",status);
        String where;
        if(mode.equals("day")) {
            if(date==null) throw invalid();
            where=" where d.fecha=?";args.add(date);applied.put("date",date.toString());
        } else {
            if(courseId==null||courseId<1||year==null||year<1||year>9999) throw invalid();
            where=" where r.id_curso=? and y.anio_calendario=?";args.add(courseId);args.add(year);
            applied.put("courseId",courseId.toString());applied.put("year",year);
        }
        where+=filters(room,type,args);
        if(!status.equals("all")) where+=status.equals("cancelled")?" and d.estado='CANCELADA'":" and d.estado<>'CANCELADA'";
        String courseCheck="true";
        if(mode.equals("course")) {
            courseCheck="exists(select 1 from aulas.curso c join aulas.anio_lectivo y using(id_anio_lectivo) where c.id_curso=? and y.anio_calendario=?)";
            args.add(courseId);args.add(year);
        }
        String order=mode.equals("day")?"tipo,hora_inicio,identificador,id_detalle":"fecha,hora_inicio,id_detalle";
        String pageSql="select * from matching order by "+order;
        if(!complete) {pageSql+=" limit ? offset ?";args.add(size);args.add((long)page*size);}
        String sql="with matching as materialized ("+SELECT+FROM+where+"), totals as (select count(*) as total,"+courseCheck+
            " as valid_course from matching), selected as ("+pageSql+") select selected.*,totals.total,totals.valid_course from totals left join selected on true order by "+order;
        return db.query(sql,(org.springframework.jdbc.core.ResultSetExtractor<Result>)rs->{
            var rows=new ArrayList<Row>();long total=0;
            while(rs.next()) {
                if(!rs.getBoolean("valid_course"))throw invalid();
                total=rs.getLong("total");
                if(rs.getString("id_detalle")!=null) rows.add(row(rs,rows.size()));
            }
            return new Result(rows,total,page,complete?0:size,applied);
        },args.toArray());
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
        return db.query(sql,this::row,parameters.toArray());
    }
    private Row row(java.sql.ResultSet rs,int n) throws java.sql.SQLException {
        return new Row(rs.getString("id_detalle"),rs.getString("id_reserva"),rs.getString("id_curso"),
            String.format("%03d-%s-%d",rs.getLong("id_materia"),rs.getString("comision"),rs.getInt("anio_calendario")),rs.getString("nombre"),
            rs.getString("nombre_docente")+" "+rs.getString("apellido_docente"),rs.getInt("cantidad_alumnos"),rs.getDate("fecha").toString(),
            rs.getTime("hora_inicio").toLocalTime().toString(),rs.getTime("hora_inicio").toLocalTime().plusMinutes(rs.getInt("cantidad_modulos")*30L).toString(),
            rs.getString("identificador"),rs.getString("tipo"),rs.getString("estado").equals("CANCELADA"));
    }
    private DomainError invalid() {return new DomainError(400,"INVALID_QUERY","Revisá los filtros de la consulta.");}
}
