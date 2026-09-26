package ar.edu.aulas.reservations;

import ar.edu.aulas.api.DomainError;
import java.util.Map;

/** Ledger rows remain auditable, but their pre-reset results cannot be recovered. */
public final class OperationRecovery {
    private OperationRecovery() {}
    public static void requireCurrent(Map<String,?> row) {
        if(row.get("invalidada_en")!=null)
            throw DomainError.conflict("La operación es anterior a un restablecimiento demo. Consultá el estado actual y revisá una nueva operación.");
    }
}
