package ar.edu.aulas.rooms;
import ar.edu.aulas.accounts.Account;
import org.springframework.web.bind.annotation.*;
@RestController
public class RoomsController {
 private final RoomsService rooms;public RoomsController(RoomsService rooms){this.rooms=rooms;}
 @GetMapping("/api/aulas") public RoomsService.Page list(@RequestParam(defaultValue="")String query,@RequestParam(defaultValue="")String type,@RequestParam(defaultValue="")String state,@RequestParam(defaultValue="")String board,@RequestParam(defaultValue="")String resource,@RequestParam(defaultValue="0")int capacity,@RequestParam(defaultValue="id")String sort,@RequestParam(defaultValue="false")boolean descending,@RequestParam(defaultValue="1")int page,@RequestParam(defaultValue="20")int size){return rooms.list(query,type,state,board,resource,capacity,sort,descending,page,size);}
 @GetMapping("/api/referencias/aulas")public java.util.List<RoomsService.Room> references(){return rooms.references();}
 @PostMapping("/api/aulas") public RoomsService.Room create(@RequestAttribute("aulas.account")Account actor,@RequestBody RoomsService.Room body){return rooms.save(actor.id(),null,body);}
 @PutMapping("/api/aulas/{id}") public RoomsService.Room edit(@RequestAttribute("aulas.account")Account actor,@PathVariable long id,@RequestBody RoomsService.Room body){return rooms.save(actor.id(),id,body);}
}
