package ar.edu.aulas.rooms;
import ar.edu.aulas.api.DomainError;
import java.time.*;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RoomsService {
 public record History(String at,String state,String type) {}
 public record Room(String internalId,String id,Long version,String type,Integer capacity,String state,String location,Integer floor,String board,List<String> resources,Integer computers,List<History> history) {}
 public record Page(List<Room> items,long total,int page,int size,long enabled) {}
 private final JdbcTemplate db;
 private final Clock clock;
 @org.springframework.beans.factory.annotation.Autowired
 public RoomsService(JdbcTemplate db,org.springframework.beans.factory.ObjectProvider<Clock> clocks){this(db,clocks.getIfAvailable(Clock::systemUTC));}
 public RoomsService(JdbcTemplate db,Clock clock){this.db=db;this.clock=clock;}
 private static final String SELECT="select a.*,m.televisor,m.proyector,m.computadora,l.cantidad_pc from aulas.aula a left join aulas.aula_multimedios m using(id_aula) left join aulas.aula_laboratorio l using(id_aula)";
 private Room map(java.sql.ResultSet r,int row)throws java.sql.SQLException {
  List<String> resources=new ArrayList<>();for(var pair:Map.of("ventiladores","fans","aire","air","proyector","projector","televisor","television","computadora","computer").entrySet()) if(r.getBoolean(pair.getKey()))resources.add(pair.getValue());
  long key=r.getLong("id_aula");
  return new Room(Long.toString(key),r.getString("identificador"),r.getLong("version"),r.getString("tipo"),r.getInt("capacidad"),r.getObject("baja_en")!=null?"Baja":r.getString("estado"),r.getString("ubicacion"),r.getInt("piso"),r.getString("pizarron"),resources,(Integer)r.getObject("cantidad_pc"),List.of());
 }
 private List<Room> queryRooms(String sql,Object... arguments) {
  var selected=db.query(sql,this::map,arguments);
  if(selected.isEmpty())return selected;
  Map<Long,List<History>> histories=new HashMap<>();
  String placeholders=String.join(",",Collections.nCopies(selected.size(),"?"));
  Object[] ids=selected.stream().map(room->Long.parseLong(room.internalId())).toArray();
  db.query("select id_aula,desde,id,estado,tipo,baja from aulas.historial_aula where id_aula in ("+placeholders+") order by id_aula,desde,id",h->{
   var history=new History(h.getTimestamp("desde").toInstant().atZone(ZoneId.of("America/Argentina/Cordoba")).toLocalDateTime().toString(),h.getBoolean("baja")?"Baja":h.getString("estado"),h.getString("tipo"));
   histories.computeIfAbsent(h.getLong("id_aula"),ignored->new ArrayList<>()).add(history);
  },ids);
  return selected.stream().map(room->new Room(room.internalId(),room.id(),room.version(),room.type(),room.capacity(),room.state(),room.location(),room.floor(),room.board(),room.resources(),room.computers(),histories.getOrDefault(Long.parseLong(room.internalId()),List.of()))).toList();
 }
 @Transactional(readOnly=true,isolation=org.springframework.transaction.annotation.Isolation.REPEATABLE_READ)
 public Room get(long id){return queryRooms(SELECT+" where a.id_aula=?",id).stream().findFirst().orElseThrow(()->new DomainError(404,"NOT_FOUND","El aula no existe."));}
 @Transactional(readOnly=true,isolation=org.springframework.transaction.annotation.Isolation.REPEATABLE_READ)
 public List<Room> references(){return queryRooms(SELECT+" order by a.identificador,a.id_aula");}
 @Transactional(readOnly=true,isolation=org.springframework.transaction.annotation.Isolation.REPEATABLE_READ)
 public Page list(String query,String type,String state,String board,String resource,int capacity,String sort,boolean descending,int page,int size) {
  if(page<1 || !List.of(20,50,100).contains(size) || capacity<0)throw DomainError.invalid("Paginación o capacidad inválidas.");
  String column=switch(sort){case "id"->"a.identificador";case "capacity"->"a.capacidad";case "type"->"a.tipo";case "state"->"a.estado";default->throw DomainError.invalid("Orden inválido.");};
  String where=" where a.capacidad>=? and strpos(lower(a.identificador),lower(?))>0";var args=new ArrayList<Object>(List.of(capacity,query.strip()));
  if(state.isEmpty())where+=" and a.baja_en is null";else if(state.equals("Baja"))where+=" and a.baja_en is not null";else{where+=" and a.baja_en is null and a.estado=?";args.add(state);}
  if(!type.isEmpty()){where+=" and a.tipo=?";args.add(type);}if(!board.isEmpty()){where+=" and a.pizarron=?";args.add(board);}
  if(!resource.isEmpty()){String field=switch(resource){case "fans"->"a.ventiladores";case "air"->"a.aire";case "projector"->"m.proyector";case "television"->"m.televisor";case "computer"->"m.computadora";default->throw DomainError.invalid("Recurso inválido.");};where+=" and "+field;}
  String from=" from aulas.aula a left join aulas.aula_multimedios m using(id_aula) left join aulas.aula_laboratorio l using(id_aula)";
  long total=db.queryForObject("select count(*)"+from+where,Long.class,args.toArray());int current=(int)Math.min(page,Math.max(1,(total+size-1)/size));args.add(size);args.add((current-1)*size);
  return new Page(queryRooms(SELECT+where+" order by "+column+(descending?" desc":" asc")+",a.id_aula limit ? offset ?",args.toArray()),total,current,size,db.queryForObject("select count(*) from aulas.aula where baja_en is null and estado='Habilitada'",Long.class));
 }
 private void validate(Room r,boolean creating) {
  if(r.id()==null||r.id().isBlank()||r.location()==null||r.location().isBlank()||r.floor()==null||r.capacity()==null||r.capacity()<1||r.type()==null||!List.of("General","Multimedios","Laboratorio").contains(r.type())||r.state()==null||!List.of("Habilitada","Inhabilitada","Mantenimiento","Baja").contains(r.state())||r.board()==null||!List.of("Tiza","Fibrón").contains(r.board()))throw DomainError.invalid("Revisá identificador, ubicación, piso, capacidad, tipo, estado y pizarrón.");
  if(creating&&r.state().equals("Baja"))throw DomainError.invalid("No se crea un aula dada de baja.");
  var resources=r.resources()==null?List.<String>of():r.resources();var allowed=r.type().equals("Multimedios")?List.of("fans","air","projector","television","computer"):List.of("fans","air");
  if(!allowed.containsAll(resources))throw DomainError.invalid("El equipamiento no corresponde al tipo de aula.");
  if(!r.type().equals("Laboratorio") && r.computers()!=null)throw DomainError.invalid("Cantidad de PC solo corresponde a Laboratorio.");
  if(r.type().equals("Laboratorio")&&(r.computers()==null||r.computers()<0))throw DomainError.invalid("Cantidad de PC debe ser un entero no negativo.");
 }
 @Transactional public Room save(long actor,Long key,Room r) {
  db.queryForObject("select id from aulas.control_cuentas where id=1 for update",Integer.class);
  Boolean permitted=db.queryForObject("select activo and rol in ('ADMINISTRADOR','BEDEL') from aulas.usuario where id_usuario=?",Boolean.class,actor);
  if(!Boolean.TRUE.equals(permitted))throw new DomainError(403,"FORBIDDEN","Tu cuenta no permite gestionar aulas.");
  validate(r,key==null);Room before=null;
  if(key!=null){if(db.queryForList("select id_aula from aulas.aula where id_aula=? for update",Long.class,key).isEmpty())throw new DomainError(404,"NOT_FOUND","El aula no existe.");before=get(key);if(r.version()==null||!before.version().equals(r.version()))throw DomainError.conflict("El aula cambió. Volvé a abrirla para revisar la versión actual.");if(before.state().equals("Baja"))throw DomainError.conflict("Un aula dada de baja no se puede restaurar ni modificar.");if(!before.id().equals(r.id().strip()))throw DomainError.invalid("El identificador del aula no se modifica.");}
  if(key!=null)new ar.edu.aulas.reservations.ReservationGuards(db,clock).room(key,r);
  var resources=r.resources()==null?List.<String>of():r.resources();String state=r.state().equals("Baja")?before.state():r.state();
  Instant now=clock.instant();var instant=java.sql.Timestamp.from(now);
  if(key==null)key=db.queryForObject("insert into aulas.aula(identificador,tipo,capacidad,estado,ubicacion,piso,pizarron,ventiladores,aire) values (?,?,?,?,?,?,?,?,?) returning id_aula",Long.class,r.id().strip(),r.type(),r.capacity(),state,r.location().strip(),r.floor(),r.board(),resources.contains("fans"),resources.contains("air"));
  else db.update("update aulas.aula set tipo=?,capacidad=?,estado=?,ubicacion=?,piso=?,pizarron=?,ventiladores=?,aire=?,baja_en=?,version=version+1 where id_aula=?",r.type(),r.capacity(),state,r.location().strip(),r.floor(),r.board(),resources.contains("fans"),resources.contains("air"),r.state().equals("Baja")?instant:null,key);
  db.update("delete from aulas.aula_multimedios where id_aula=?",key);db.update("delete from aulas.aula_laboratorio where id_aula=?",key);
  if(r.type().equals("Multimedios"))db.update("insert into aulas.aula_multimedios(id_aula,televisor,proyector,computadora) values (?,?,?,?)",key,resources.contains("television"),resources.contains("projector"),resources.contains("computer"));
  if(r.type().equals("Laboratorio"))db.update("insert into aulas.aula_laboratorio(id_aula,cantidad_pc) values (?,?)",key,r.computers());
  if(before==null || !before.type().equals(r.type()) || !before.state().equals(r.state())){
   db.update("update aulas.historial_aula set hasta=? where id_aula=? and hasta is null",instant,key);
   db.update("insert into aulas.historial_aula(id_aula,desde,tipo,estado,baja) values (?,?,?,?,?)",key,instant,r.type(),state,r.state().equals("Baja"));
  }
  Room saved=get(key);db.update("insert into aulas.evento_auditoria(actor,operacion,entidad,entidad_id,resultado,detalle) values (?,'GUARDAR_AULA','AULA',?,'CONFIRMADO',?)",actor,key,before+" -> "+saved);return saved;
 }
}
