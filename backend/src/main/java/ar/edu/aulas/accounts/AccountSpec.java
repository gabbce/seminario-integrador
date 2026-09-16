package ar.edu.aulas.accounts;

import java.util.Locale;
import java.util.Set;

public record AccountSpec(String email, String nombre, String apellido, String rol, boolean activo) {
    public AccountSpec {
        if (email == null || nombre == null || apellido == null || rol == null)
            throw new IllegalArgumentException("Faltan datos de cuenta");
        email = email.strip().toLowerCase(Locale.ROOT);
        nombre = nombre.strip(); apellido = apellido.strip();
        if (!email.matches("[^\\s@]+@[^\\s@]+\\.[^\\s@]+") || nombre.isEmpty() || apellido.isEmpty()
                || !Set.of("ADMINISTRADOR", "BEDEL", "DOCENTE").contains(rol))
            throw new IllegalArgumentException("Datos de cuenta inválidos");
    }
}
