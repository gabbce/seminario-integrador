package ar.edu.aulas.demo;

import ar.edu.aulas.calendar.CalendarManagement;
import ar.edu.aulas.rooms.RoomsService;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.*;
import java.util.*;
import org.springframework.core.env.Environment;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import tools.jackson.databind.ObjectMapper;

/** Explicit maintenance only. Preview never writes; reset revalidates an immutable review. */
@Service
public class DemoResetService {
    public record Item(String dataset,String key,long reservationId,List<String> changed,int originalDetails,int extraDetails,List<Long> extraDetailIds,List<Long> extraPatternIds) {}
    public record Review(String destination,List<String> datasets,List<Item> items,List<String> blockers,String stamp) {}
    private record Managed(String dataset,String key,long id,Map<String,Object> original,Map<String,Object> current) {}
    private static final List<String> TABLES=List.of("usuario","administrador","bedel","docente","materia","curso","anio_lectivo","cuatrimestre","feriado","aula","aula_multimedios","aula_laboratorio","historial_aula","reserva","reserva_periodica","reserva_esporadica","periodo_asignado","patron_semanal","fecha_excluida","detalle_reserva","demo_reserva","operacion_reserva","mutacion_reserva","operacion_calendario","evento_auditoria");
    private static final Map<String,String> PARTS=Map.of("periodos","periodo_asignado","patrones","patron_semanal","exclusiones","fecha_excluida","detalles","detalle_reserva");
    private final JdbcTemplate db; private final ObjectMapper json; private final Environment env;
    private final DemoReservationSeed seeds; private final DemoOperationSeed operations; private final DemoVolumeSeed volume;
    private final CalendarManagement calendars; private final RoomsService rooms;
    public DemoResetService(JdbcTemplate db,ObjectMapper json,Environment env,DemoReservationSeed seeds,DemoOperationSeed operations,DemoVolumeSeed volume,CalendarManagement calendars,RoomsService rooms){this.db=db;this.json=json;this.env=env;this.seeds=seeds;this.operations=operations;this.volume=volume;this.calendars=calendars;this.rooms=rooms;}
    private void guard(){if(!"demo".equals(env.getProperty("AULAS_ENVIRONMENT")))throw new IllegalStateException("El restablecimiento requiere AULAS_ENVIRONMENT=demo.");}
    private List<String> selection(List<String> selected){
        guard();if(selected==null || selected.isEmpty() || new HashSet<>(selected).size()!=selected.size() || !Set.of("reservas-i03","operacion-i04","volumen-i05").containsAll(selected))throw new IllegalArgumentException("Seleccioná explícitamente datasets válidos, sin duplicados.");
        return selected.stream().sorted().toList();
    }
    @SuppressWarnings("unchecked") private Map<String,Object> object(String value){return json.readValue(value,Map.class);}
    @SuppressWarnings("unchecked") private static Map<String,Object> object(Object value){return (Map<String,Object>)value;}
    @SuppressWarnings("unchecked") private static List<Map<String,Object>> rows(Map<String,Object> value,String key){return (List<Map<String,Object>>)value.get(key);}
    private static long number(Object value){return ((Number)value).longValue();}
    private static String text(Object value){return Objects.toString(value,"");}
    private String hash(String value){try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));}catch(Exception e){throw new IllegalStateException(e);}}
    private String destination(){
        // Never include credentials, connection parameters, or a JDBC URL verbatim.
        String url=env.getProperty("spring.datasource.url","");
        String address=url.replaceFirst("^jdbc:postgresql://","").split("[/?]",2)[0].replaceFirst("^.*@","");
        return address+" / "+db.queryForObject("select current_database()",String.class);
    }
    private Map<String,String> definitions(String dataset){
        int version;String clock;List<?> entries;
        if(dataset.equals("reservas-i03")){var d=seeds.dataset();version=d.version();clock=d.clock();entries=d.entries();}
        else {var d=dataset.equals("operacion-i04")?operations.dataset():volume.dataset();version=d.version();clock=d.clock();entries=d.entries();}
        var result=new TreeMap<String,String>();
        for(Object entry:entries)result.put(text(object(json.writeValueAsString(entry)).get("key")),json.writeValueAsString(Map.of("version",version,"clock",clock,"entry",entry)));
        return result;
    }
    private List<Managed> managed(List<String> selected,List<String> blockers){
        var result=new ArrayList<Managed>();
        for(String dataset:selected){
            var expected=definitions(dataset);
            var registered=db.queryForList("select clave,id_reserva,definicion::text,coalesce(snapshot_original,snapshot)::text as original from aulas.demo_reserva where dataset=? order by clave",dataset);
            if(!new TreeSet<>(registered.stream().map(r->text(r.get("clave"))).toList()).equals(expected.keySet()))blockers.add(dataset+": las claves registradas no coinciden con el dataset completo; usar primero su carga explícita.");
            for(var row:registered){String key=text(row.get("clave"));long id=number(row.get("id_reserva"));
                if(!expected.containsKey(key) || !json.readTree(text(row.get("definicion"))).equals(json.readTree(expected.get(key))))blockers.add(dataset+"/"+key+": definición versionada diferente.");
                result.add(new Managed(dataset,key,id,object(text(row.get("original"))),object(seeds.snapshot(id))));
            }
        }return result;
    }
    private String state(){
        StringBuilder state=new StringBuilder();
        for(String table:TABLES)state.append(table).append(db.queryForObject("select coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text),'[]'::jsonb)::text from aulas."+table+" t",String.class));
        return state.toString();
    }
    private Review review(List<String> selected,List<Managed> managed,List<String> blockers){
        var items=new ArrayList<Item>();
        for(var m:managed){var changes=new ArrayList<String>();
            for(String part:m.original().keySet())if(!Objects.equals(m.original().get(part),m.current().get(part)))changes.add(part);
            Set<Long> originalIds=new HashSet<>(rows(m.original(),"detalles").stream().map(r->number(r.get("id_detalle"))).toList());
            Set<Long> currentIds=new HashSet<>(rows(m.current(),"detalles").stream().map(r->number(r.get("id_detalle"))).toList());
            if(!currentIds.containsAll(originalIds))blockers.add(m.key()+": falta una identidad de clase original; no se recrea ni reutiliza.");
            Set<Long> patternIds=new HashSet<>(rows(m.current(),"patrones").stream().map(r->number(r.get("id_patron"))).toList());
            if(!patternIds.containsAll(rows(m.original(),"patrones").stream().map(r->number(r.get("id_patron"))).toList()))blockers.add(m.key()+": falta un patrón original.");
            patternIds.removeAll(rows(m.original(),"patrones").stream().map(r->number(r.get("id_patron"))).toList());
            currentIds.removeAll(originalIds);items.add(new Item(m.dataset(),m.key(),m.id(),changes,originalIds.size(),currentIds.size(),currentIds.stream().sorted().toList(),patternIds.stream().sorted().toList()));
        }
        validateDependencies(managed,blockers);
        if(db.queryForObject("select count(*) from aulas.usuario where activo and rol='ADMINISTRADOR'",Long.class)==0)blockers.add("Falta un Administrador activo para atribuir la auditoría.");
        String target=destination();return new Review(target,selected,items,List.copyOf(new LinkedHashSet<>(blockers)),hash(target+selected+state()));
    }
    @Transactional(readOnly=true,isolation=Isolation.REPEATABLE_READ)
    public Review preview(List<String> datasets){var selected=selection(datasets);var blockers=new ArrayList<String>();return review(selected,managed(selected,blockers),blockers);}

    private void validateDependencies(List<Managed> managed,List<String> blockers){
        var roomMap=new HashMap<Long,RoomsService.Room>();for(var r:rooms.references())roomMap.put(Long.parseLong(r.internalId()),r);
        var calendarMap=new HashMap<Long,CalendarManagement.Config>();for(var c:calendars.list())calendarMap.put(Long.parseLong(c.id()),c);
        var courseYears=new HashMap<Long,Long>();for(var r:db.queryForList("select id_curso,id_anio_lectivo from aulas.curso"))courseYears.put(number(r.get("id_curso")),number(r.get("id_anio_lectivo")));
        Set<Long> selected=new HashSet<>(managed.stream().map(Managed::id).toList());
        var desired=new ArrayList<Map<String,Object>>();for(var m:managed)for(var d:rows(m.original(),"detalles"))if("CONFIRMADA".equals(d.get("estado")))desired.add(d);
        var foreign=db.queryForList("select id_detalle,id_reserva,id_aula,fecha::text,hora_inicio::text,cantidad_modulos from aulas.detalle_reserva where estado='CONFIRMADA'").stream().filter(d->!selected.contains(number(d.get("id_reserva")))).toList();
        for(var m:managed){
            var header=object(m.original().get("reserva"));var calendar=calendarMap.get(courseYears.get(number(header.get("id_curso"))));
            if(calendar==null || calendar.state().equals("En preparación")){blockers.add(m.key()+": calendario inexistente o en preparación.");continue;}
            for(var d:rows(m.original(),"detalles")){
                if(!"CONFIRMADA".equals(d.get("estado")))continue;
                var room=roomMap.get(number(d.get("id_aula")));
                if(room==null || !room.state().equals("Habilitada") || !room.type().equals(header.get("tipo_aula")) || room.capacity()<number(header.get("cantidad_alumnos")) || (header.get("pizarron")!=null && !header.get("pizarron").equals(room.board())) || !room.resources().containsAll((List<?>)header.get("recursos")))blockers.add(m.key()+": aula original incompatible "+d.get("id_aula")+".");
                LocalDate date=LocalDate.parse(text(d.get("fecha")));
                if(date.getYear()!=calendar.year() || calendar.holidays().contains(date.toString()))blockers.add(m.key()+": fecha efectiva incompatible con calendario "+date+".");
                if(foreign.stream().anyMatch(other->overlaps(d,other)))blockers.add(m.key()+": una reserva ajena ocupa "+date+" "+d.get("hora_inicio")+" en aula "+d.get("id_aula")+".");
                if(desired.stream().anyMatch(other->number(other.get("id_detalle"))!=number(d.get("id_detalle")) && overlaps(d,other)))blockers.add(m.key()+": colisión entre originales seleccionados.");
            }
            for(var pattern:rows(m.original(),"patrones")){
                var terms=db.queryForList("select numero from aulas.cuatrimestre where id_cuatrimestre in (select (value->>'id_cuatrimestre')::bigint from jsonb_array_elements(?::jsonb)) order by numero",Integer.class,json.writeValueAsString(rows(m.original(),"periodos")));
                var expected=new TreeSet<String>();Set<String> excluded=new HashSet<>(rows(m.original(),"exclusiones").stream().map(r->text(r.get("fecha"))).toList());
                for(int term:terms){var range=calendar.terms().get(term==1?"first":"second");if(range==null || range.stream().anyMatch(String::isEmpty)){blockers.add(m.key()+": período incompleto.");continue;}
                    for(LocalDate date=LocalDate.parse(range.getFirst()),end=LocalDate.parse(range.getLast());!date.isAfter(end);date=date.plusDays(1))if(date.getDayOfWeek().getValue()==number(pattern.get("dia")) && !calendar.holidays().contains(date.toString()) && !excluded.contains(date.toString()))expected.add(date.toString());
                }
                var original=new TreeSet<>(rows(m.original(),"detalles").stream().filter(d->Objects.equals(d.get("id_patron"),pattern.get("id_patron"))).map(d->text(d.get("fecha_original"))).toList());
                if(!expected.equals(original))blockers.add(m.key()+": el calendario vigente no produce las fechas originales del patrón "+pattern.get("id_patron")+".");
            }
        }
    }
    private static boolean overlaps(Map<String,Object> a,Map<String,Object> b){
        if(number(a.get("id_aula"))!=number(b.get("id_aula")) || !text(a.get("fecha")).equals(text(b.get("fecha"))))return false;
        int startA=LocalTime.parse(text(a.get("hora_inicio"))).toSecondOfDay(),startB=LocalTime.parse(text(b.get("hora_inicio"))).toSecondOfDay();
        return startA<startB+number(b.get("cantidad_modulos"))*1800 && startB<startA+number(a.get("cantidad_modulos"))*1800;
    }
    private void update(String table,String key,Map<String,Object> row){
        // Table/column names originate only from the original typed database snapshot, constrained by actual schema columns.
        var columns=db.queryForList("select column_name from information_schema.columns where table_schema='aulas' and table_name=? and column_name<>? order by ordinal_position",String.class,table,key);
        String assignments=String.join(",",columns.stream().map(c->c+"=s."+c).toList());
        int count=db.update("update aulas."+table+" t set "+assignments+" from jsonb_populate_record(null::aulas."+table+",?::jsonb) s where t."+key+"=s."+key,json.writeValueAsString(row));
        if(count!=1)throw new IllegalStateException("Identidad original ausente: "+table+"/"+row.get(key));
    }
    @Transactional(isolation=Isolation.READ_COMMITTED)
    public Review reset(List<String> datasets,String confirmation,boolean applicationStopped){
        var selected=selection(datasets);
        if(!applicationStopped)throw new IllegalStateException("Detené la aplicación y confirmá application-stopped=true.");
        if(confirmation==null || !confirmation.matches("[a-f0-9]{64}"))throw new IllegalArgumentException("Revisá la previsualización y confirmá su huella SHA-256.");
        db.queryForObject("select id from aulas.control_cuentas where id=1 for update",Integer.class);
        db.execute("lock table "+String.join(",",TABLES.stream().map(t->"aulas."+t).toList())+" in share row exclusive mode");
        var blockers=new ArrayList<String>();var managed=managed(selected,blockers);var reviewed=review(selected,managed,blockers);
        if(!confirmation.equals(reviewed.stamp()))throw new IllegalStateException("El destino o estado cambió desde la previsualización. Volvé a revisar.");
        if(!reviewed.blockers().isEmpty())throw new IllegalStateException("Restablecimiento bloqueado: "+String.join("; ",reviewed.blockers()));
        long actor=db.queryForObject("select id_usuario from aulas.usuario where activo and rol='ADMINISTRADOR' order by id_usuario limit 1",Long.class);
        db.execute("set constraints detalle_reserva_sin_solapamiento deferred");
        for(var m:managed){
            Map<String,Object> header=new LinkedHashMap<>(object(m.original().get("reserva")));header.put("version",number(object(m.current().get("reserva")).get("version"))+1);update("reserva","id_reserva",header);
            if(m.original().get("periodica")!=null)update("reserva_periodica","id_reserva",object(m.original().get("periodica")));
            for(String part:List.of("periodos","exclusiones")){
                String table=PARTS.get(part);db.update("delete from aulas."+table+" where id_reserva=?",m.id());
                db.update("insert into aulas."+table+" select * from jsonb_populate_recordset(null::aulas."+table+",?::jsonb)",json.writeValueAsString(rows(m.original(),part)));
            }
            for(var pattern:rows(m.original(),"patrones"))update("patron_semanal","id_patron",pattern);
            db.update("delete from aulas.detalle_reserva where id_reserva=? and id_detalle not in (select (value->>'id_detalle')::bigint from jsonb_array_elements(?::jsonb))",m.id(),json.writeValueAsString(rows(m.original(),"detalles")));
            for(var original:rows(m.original(),"detalles")){
                var detail=new LinkedHashMap<>(original);var current=rows(m.current(),"detalles").stream().filter(r->Objects.equals(r.get("id_detalle"),detail.get("id_detalle"))).findFirst().orElseThrow();
                if(current.get("fecha_original")!=null)detail.put("fecha_original",current.get("fecha_original"));
                update("detalle_reserva","id_detalle",detail);
            }
            db.update("delete from aulas.patron_semanal where id_reserva=? and id_patron not in (select (value->>'id_patron')::bigint from jsonb_array_elements(?::jsonb))",m.id(),json.writeValueAsString(rows(m.original(),"patrones")));
            for(String table:List.of("operacion_reserva","mutacion_reserva"))db.update("update aulas."+table+" set invalidada_en=coalesce(invalidada_en,now()) where id_reserva=?",m.id());
            db.update("update aulas.operacion_calendario o set invalidada_en=coalesce(invalidada_en,now()) where exists(select 1 from jsonb_array_elements(o.resultado->'added') a where a->>'booking'=?)",Long.toString(m.id()));
            String restored=seeds.snapshot(m.id());
            db.update("update aulas.demo_reserva set snapshot_original=coalesce(snapshot_original,snapshot),snapshot=?::jsonb where dataset=? and clave=?",restored,m.dataset(),m.key());
            var item=reviewed.items().stream().filter(i->i.reservationId()==m.id()).findFirst().orElseThrow();
            db.update("insert into aulas.evento_auditoria(actor,operacion,entidad,entidad_id,resultado,detalle) values (?,'RESTABLECER_DEMO','RESERVA',?,'CONFIRMADO',?)",actor,m.id(),"Restablecimiento explícito: "+json.writeValueAsString(Map.of("destination",reviewed.destination(),"datasets",selected,"stamp",confirmation,"item",item)));
        }
        db.execute("set constraints all immediate");return reviewed;
    }
}
