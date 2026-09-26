package ar.edu.aulas.demo;

import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import tools.jackson.databind.ObjectMapper;

@Service
public class DemoVolumeSeed {
    private final DemoOperationSeed operations;
    private final ObjectMapper json;
    public DemoVolumeSeed(DemoOperationSeed operations,ObjectMapper json){this.operations=operations;this.json=json;}
    public DemoOperationSeed.Dataset dataset(){
        try(var input=new ClassPathResource("demo/volumen-i05-v1.json").getInputStream()){return json.readValue(input,DemoOperationSeed.Dataset.class);}
        catch(Exception e){throw new IllegalStateException("No se pudo leer el conjunto I-05.",e);}
    }
    @Transactional(isolation=Isolation.READ_COMMITTED)
    public DemoReservationSeed.Result seed(){return operations.seedDataset(dataset(),true);}
}
