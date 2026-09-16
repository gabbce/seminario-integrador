import { useCallback, useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  AUTH_CONFIGURATION_ERROR,
  fetchProfile,
  SESSION_STORAGE_KEY,
  SessionFailure,
  supabase,
  type Profile,
} from "./auth-client";

type State = {
  phase: "loading" | "anonymous" | "ready" | "error";
  profile?: Profile;
  message?: string;
};
export function useSession() {
  const [state, setState] = useState<State>(
    supabase
      ? { phase: "loading" }
      : { phase: "error", message: AUTH_CONFIGURATION_ERROR },
  );
  const current = useRef<Session | null>(null);
  const revision = useRef(0);
  const mounted = useRef(true);
  const refreshedOnce = useRef(false);
  const loggedOut = useRef(false);
  const resolve = useCallback(async (session: Session | null) => {
    if (!supabase) {
      setState({ phase: "error", message: AUTH_CONFIGURATION_ERROR });
      return;
    }
    if (loggedOut.current) return;
    const attempt = ++revision.current;
    current.current = session;
    if (!session) {
      setState({ phase: "anonymous" });
      return;
    }
    // Refresh keeps the current page mounted while its profile is revalidated.
    setState((old) => (old.profile ? old : { phase: "loading" }));
    try {
      let profile: Profile;
      try {
        profile = await fetchProfile(session);
      } catch (error) {
        if (!(error instanceof SessionFailure) || error.status !== 401)
          throw error;
        if (refreshedOnce.current) throw error;
        refreshedOnce.current = true;
        const refreshed = await supabase.auth.refreshSession();
        if (refreshed.error || !refreshed.data.session)
          throw new SessionFailure(401, "Tu sesión venció. Volvé a ingresar.");
        profile = await fetchProfile(refreshed.data.session);
      }
      if (mounted.current && revision.current === attempt) {
        refreshedOnce.current = false;
        setState({ phase: "ready", profile });
      }
    } catch (error) {
      if (!mounted.current || revision.current !== attempt) return;
      if (error instanceof SessionFailure && error.status === 401) {
        await supabase?.auth.signOut({ scope: "local" });
        if (mounted.current && revision.current === attempt)
          setState({ phase: "anonymous", message: error.message });
      } else
        setState({
          phase: "error",
          message:
            error instanceof SessionFailure
              ? error.message
              : "No se pudo verificar la sesión. Intentá nuevamente.",
        });
    }
  }, []);
  const invalidate = useCallback(() => {
    revision.current++;
  }, []);
  useEffect(() => {
    mounted.current = true;
    if (!supabase) return;
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      // Keep SDK callbacks synchronous; session/profile requests run after its lock is released.
      const timer = setTimeout(() => {
        timers.delete(timer);
        void resolve(session);
      }, 0);
      timers.add(timer);
    });
    return () => {
      mounted.current = false;
      invalidate();
      timers.forEach(clearTimeout);
      data.subscription.unsubscribe();
    };
  }, [resolve, invalidate]);
  async function signIn(
    email: string,
    password: string,
  ): Promise<string | undefined> {
    if (!supabase) return AUTH_CONFIGURATION_ERROR;
    try {
      loggedOut.current = false;
      refreshedOnce.current = false;
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error)
        return error.code === "invalid_credentials"
          ? "El correo o la contraseña no son correctos."
          : error.status && error.status < 500
            ? "No se pudo ingresar con esta cuenta. Contactá al administrador."
            : "No se pudo conectar con el servicio. Intentá nuevamente.";
    } catch {
      return "No se pudo conectar con el servicio. Intentá nuevamente.";
    }
  }
  async function signOut() {
    loggedOut.current = true;
    revision.current++;
    current.current = null;
    setState({ phase: "loading", message: "Cerrando sesión…" });
    try {
      await supabase?.auth.signOut({ scope: "local" });
    } finally {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      localStorage.removeItem(`${SESSION_STORAGE_KEY}-code-verifier`);
      if (mounted.current) setState({ phase: "anonymous" });
    }
  }
  return {
    ...state,
    signIn,
    signOut,
    retry: () => void resolve(current.current),
  };
}
