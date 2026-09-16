package ar.edu.aulas.api;

import org.springframework.dao.DataAccessException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

@RestControllerAdvice
public class DomainErrors {
    public record ErrorBody(String code,String message) {}
    @ExceptionHandler(DomainError.class)
    ResponseEntity<ErrorBody> domain(DomainError e) { return ResponseEntity.status(e.status).body(new ErrorBody(e.code,e.getMessage())); }
    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<ErrorBody> integrity() { return ResponseEntity.status(409).body(new ErrorBody("CONFLICT","Los datos ya existen o tienen dependencias. Revisá y volvé a intentar.")); }
    @ExceptionHandler({HttpMessageNotReadableException.class,MethodArgumentTypeMismatchException.class})
    ResponseEntity<ErrorBody> invalid() { return ResponseEntity.badRequest().body(new ErrorBody("INVALID_DATA","Revisá los campos de la solicitud.")); }
    @ExceptionHandler(DataAccessException.class)
    ResponseEntity<ErrorBody> unavailable() { return ResponseEntity.status(503).body(new ErrorBody("SERVICE_UNAVAILABLE","No se pudo guardar o consultar. Revisá el estado antes de reintentar.")); }
}
