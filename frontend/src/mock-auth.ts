// Adaptador de identidad solo para la demo en memoria. No sustituye Supabase Auth.
import type { User } from "./users";
const credentials = new Map([
  ["admin", "Aulas2026"],
  ["bedel", "Aulas2026"],
  ["docente", "Aulas2026"],
]);
export function authenticate(
  users: User[],
  email: string,
  password: string,
): { id: string; error?: never } | { error: string; id?: never } {
  const user = users.find(
    (u) => u.email.toLowerCase() === email.trim().toLowerCase(),
  );
  if (!user || credentials.get(user.id) !== password)
    return { error: "El correo o la contraseña no son correctos." };
  if (!user.active)
    return {
      error: "La cuenta está deshabilitada. Contactá al administrador.",
    };
  return { id: user.id };
}
export function passwordError(password: string, confirmation: string) {
  if (password !== confirmation) return "Las contraseñas no coinciden.";
  if (password.length < 6)
    return "La contraseña debe tener al menos 6 caracteres en esta demo.";
}
export function setCredential(
  users: User[],
  actorId: string,
  targetId: string,
  password: string,
  confirmation: string,
): string | undefined {
  const actor = users.find((u) => u.id === actorId);
  if (!actor?.active || actor.role !== "Administrador")
    return "Solo un administrador activo puede establecer contraseñas.";
  if (!users.some((u) => u.id === targetId)) return "Cuenta no encontrada.";
  const error = passwordError(password, confirmation);
  if (error) return error;
  credentials.set(targetId, password);
}

export function resetDemoCredentials() {
  credentials.clear();
  for (const id of ["admin", "bedel", "docente"])
    credentials.set(id, "Aulas2026");
}
