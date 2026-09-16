import { createClient, type Session } from "@supabase/supabase-js";
import type { User } from "./users";

export const SESSION_STORAGE_KEY = "aulas-auth";
export const AUTH_CONFIGURATION_ERROR =
  "Falta configurar el acceso a Supabase. Revisá frontend/.env.local y reiniciá el frontend.";
function configuredClient() {
  try {
    return createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      { auth: { storageKey: SESSION_STORAGE_KEY } },
    );
  } catch {
    return null;
  }
}
export const supabase = configuredClient();
export type Profile = User & { permissions: string[] };
export class SessionFailure extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
export async function fetchProfile(session: Session): Promise<Profile> {
  let response: Response;
  try {
    response = await fetch("/api/me", {
      headers: { Authorization: `Bearer ${session.access_token}` },
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    throw new SessionFailure(
      503,
      "No se pudo consultar el servicio. Intentá nuevamente.",
    );
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new SessionFailure(
      response.status,
      typeof body?.message === "string"
        ? body.message
        : "No se pudo consultar el perfil. Intentá nuevamente.",
    );
  }
  const body = await response.json().catch(() => null);
  const roles = {
    ADMINISTRADOR: "Administrador",
    BEDEL: "Bedel",
    DOCENTE: "Docente",
  } as const;
  if (
    !body ||
    typeof body !== "object" ||
    !Object.hasOwn(roles, body.rol) ||
    !["nombre", "apellido", "email"].every(
      (key) => typeof body[key] === "string",
    ) ||
    !["string", "number"].includes(typeof body.id) ||
    !Array.isArray(body.permisos) ||
    !body.permisos.every((p: unknown) => typeof p === "string")
  )
    throw new SessionFailure(
      503,
      "La respuesta de perfil no es válida. Intentá nuevamente.",
    );
  return {
    id: String(body.id),
    name: body.nombre,
    surname: body.apellido,
    email: body.email,
    role: roles[body.rol as keyof typeof roles],
    active: true,
    version: 0,
    permissions: body.permisos,
  };
}
