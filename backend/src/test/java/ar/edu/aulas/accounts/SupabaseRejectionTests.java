package ar.edu.aulas.accounts;
import static org.assertj.core.api.Assertions.assertThat;
import org.junit.jupiter.api.Test;

class SupabaseRejectionTests {
 @Test void weakPasswordNamesTheMissingRule(){
  var error=SupabaseAuthAdmin.rejected("{\"code\":422,\"error_code\":\"weak_password\",\"msg\":\"Password should be at least 6 characters.\",\"weak_password\":{\"reasons\":[\"length\"]}}");
  assertThat(error.status).isEqualTo(400);
  assertThat(error.getMessage()).isEqualTo("La contraseña no cumple la política de Supabase: debe tener al menos 6 caracteres.");
 }
 @Test void characterAndLeakedPasswordReasonsAreExplained(){
  var error=SupabaseAuthAdmin.rejected("{\"error_code\":\"weak_password\",\"msg\":\"Password is known to be weak\",\"weak_password\":{\"reasons\":[\"characters\",\"pwned\"]}}");
  assertThat(error.getMessage()).contains("tipos de caracteres").contains("filtraciones conocidas");
 }
 @Test void existingAndInvalidEmailsHaveTheirOwnMessage(){
  assertThat(SupabaseAuthAdmin.rejected("{\"error_code\":\"email_exists\",\"msg\":\"A user with this email address has already been registered\"}").status).isEqualTo(409);
  assertThat(SupabaseAuthAdmin.rejected("{\"error_code\":\"email_address_invalid\",\"msg\":\"Email address is invalid\"}").getMessage()).isEqualTo("Supabase no acepta ese correo; revisá el formato y el dominio.");
 }
 @Test void unknownRejectionsKeepSupabaseReason(){
  assertThat(SupabaseAuthAdmin.rejected("{\"error_code\":\"validation_failed\",\"msg\":\"Unable to validate email address: invalid format\"}").getMessage()).isEqualTo("Supabase rechazó los datos: Unable to validate email address: invalid format");
  assertThat(SupabaseAuthAdmin.rejected("").getMessage()).isEqualTo("Supabase rechazó los datos sin indicar el motivo.");
 }
}
