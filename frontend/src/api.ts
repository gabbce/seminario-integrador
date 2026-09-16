import { supabase } from "./auth-client";
export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const session = await supabase?.auth.getSession();
  if (!session?.data.session) {
    window.dispatchEvent(new Event("aulas-profile-refresh"));
    throw new ApiError(401, "Volvé a ingresar para continuar.");
  }
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.data.session.access_token}`,
        ...init.headers,
      },
      signal: init.signal ?? AbortSignal.timeout(30000),
    });
  } catch {
    throw new ApiError(
      503,
      "No se pudo consultar o guardar. Revisá el estado antes de reintentar.",
    );
  }
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401 || body?.code === "ACCOUNT_UNAVAILABLE")
      window.dispatchEvent(new Event("aulas-profile-refresh"));
    throw new ApiError(
      response.status,
      typeof body?.message === "string"
        ? body.message
        : "No se pudo completar la operación.",
      body?.code,
    );
  }
  return body as T;
}
