package ar.edu.aulas.accounts;

import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name="usuario", schema="aulas")
public class Account {
    @Id @Column(name="id_usuario") private Long id;
    @Column(name="supabase_auth_id",nullable=false,unique=true) private UUID authId;
    private String email;
    private String nombre;
    private String apellido;
    private String rol;
    private boolean activo;
    @Version private long version;
    protected Account() {}
    public Long id() { return id; }
    public String email() { return email; }
    public String nombre() { return nombre; }
    public String apellido() { return apellido; }
    public String rol() { return rol; }
    public boolean activo() { return activo; }
}
