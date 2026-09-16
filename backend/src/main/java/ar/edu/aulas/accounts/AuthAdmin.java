package ar.edu.aulas.accounts;

import java.util.Optional;
import java.util.UUID;

public interface AuthAdmin {
    record Identity(UUID id, String email, String operationId) {}
    Optional<Identity> findByEmail(String email);
    Optional<Identity> findById(UUID id);
    default Identity changeEmail(UUID id,String email) { throw new UnsupportedOperationException(); }
    default void changePassword(UUID id,String password) { throw new UnsupportedOperationException(); }
    Identity create(AccountSpec account, String password, UUID operationId);
}
