package ar.edu.aulas.accounts;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.repository.Repository;

public interface AccountRepository extends Repository<Account,Long> {
    Optional<Account> findByAuthId(UUID authId);
}
