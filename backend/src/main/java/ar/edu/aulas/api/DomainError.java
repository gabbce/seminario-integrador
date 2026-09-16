package ar.edu.aulas.api;

public class DomainError extends RuntimeException {
    public final int status;
    public final String code;
    public DomainError(int status, String code, String message) {
        super(message); this.status=status; this.code=code;
    }
    public static DomainError invalid(String message) { return new DomainError(400,"INVALID_DATA",message); }
    public static DomainError conflict(String message) { return new DomainError(409,"CONFLICT",message); }
}
