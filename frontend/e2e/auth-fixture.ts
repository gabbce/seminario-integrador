import type { Page } from "@playwright/test";
const ids = {
  admin: "11111111-1111-4111-8111-111111111111",
  bedel: "22222222-2222-4222-8222-222222222222",
  docente: "33333333-3333-4333-8333-333333333333",
  inhabilitado: "44444444-4444-4444-8444-444444444444",
};
export async function fakeAuth(page: Page) {
  // Tests that exercise preparation replace this route with their own fixture.
  // Other offline tests must never send their synthetic token to a real backend.
  await page.route("**/api/reservas/periodicas/preparacion", (route) =>
    route.fulfill({
      status: 503,
      json: {
        code: "SERVICE_UNAVAILABLE",
        message: "Disponibilidad no preparada en este escenario de prueba.",
      },
    }),
  );
  await page.route("**/api/referencias/aulas", (route) =>
    route.fulfill({ json: [] }),
  );
  const control = {
    api: "normal",
    refreshes: 0,
    signOutFailure: false,
    signOutDelay: 0,
    sessionRole: "bedel",
  };
  function session(role: string) {
    const id = ids[role as keyof typeof ids];
    const payload = Buffer.from(
      JSON.stringify({
        sub: id,
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        role: "authenticated",
        aud: "authenticated",
      }),
    ).toString("base64url");
    return {
      access_token: `eyJhbGciOiJIUzI1NiJ9.${payload}.c2lnbmF0dXJl`,
      refresh_token: `test-refresh-${role}`,
      token_type: "bearer",
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      user: {
        id,
        email: `${role}@demo.local`,
        aud: "authenticated",
        role: "authenticated",
        app_metadata: {},
        user_metadata: {},
        created_at: "2026-01-01T00:00:00Z",
      },
    };
  }
  await page.route("**/auth/v1/**", async (route) => {
    const request = route.request(),
      url = new URL(request.url());
    if (request.method() === "OPTIONS") {
      await route.fulfill({
        status: 200,
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-headers": "*",
        },
      });
      return;
    }
    const fulfill = (body: unknown, status = 200) =>
      route.fulfill({
        status,
        json: body,
        headers: {
          "access-control-allow-origin": "*",
          "x-supabase-api-version": "2024-01-01",
          "access-control-expose-headers": "x-supabase-api-version",
        },
      });
    if (url.pathname.endsWith("/logout")) {
      await new Promise((resolve) => setTimeout(resolve, control.signOutDelay));
      await fulfill(
        control.signOutFailure ? { message: "offline" } : {},
        control.signOutFailure ? 503 : 200,
      );
      return;
    }
    const body = request.postDataJSON();
    if (url.searchParams.get("grant_type") === "refresh_token") {
      control.refreshes++;
      await fulfill(session(control.sessionRole));
      return;
    }
    if (body?.password !== "Prueba123") {
      await fulfill(
        { code: "invalid_credentials", message: "Invalid login credentials" },
        400,
      );
      return;
    }
    control.sessionRole = String(body.email).split("@")[0];
    await fulfill(session(control.sessionRole));
  });
  await page.route("**/api/me", async (route) => {
    if (control.api === "malformed") {
      await route.fulfill({
        status: 200,
        body: "null",
        contentType: "application/json",
      });
      return;
    }
    if (control.api === "service") {
      await route.fulfill({
        status: 503,
        json: {
          code: "PROFILE_UNAVAILABLE",
          message: "No se pudo consultar el perfil. Intentá nuevamente.",
        },
      });
      return;
    }
    if (control.api === "unauthorized") {
      await route.fulfill({
        status: 401,
        json: { code: "INVALID_SESSION", message: "Sesión vencida." },
      });
      return;
    }
    const role = control.sessionRole;
    if (role === "inhabilitado") {
      await route.fulfill({
        status: 403,
        json: {
          code: "ACCOUNT_UNAVAILABLE",
          message:
            "La cuenta no tiene acceso habilitado. Contactá al administrador.",
        },
      });
      return;
    }
    const permissions = [
      "agenda:read",
      "disponibilidad:read",
      "reservas:read",
      "aulas:read",
    ];
    if (role !== "docente")
      permissions.push("indicadores:read", "reservas:write", "aulas:write");
    if (role === "admin") permissions.push("cuentas:write", "calendario:write");
    await route.fulfill({
      json: {
        id: ids[role as keyof typeof ids],
        nombre: role,
        apellido: "Demo",
        email: `${role}@demo.local`,
        rol:
          role === "admin"
            ? "ADMINISTRADOR"
            : role === "bedel"
              ? "BEDEL"
              : "DOCENTE",
        permisos: permissions,
      },
    });
  });
  await page.route("**/api/referencias/calendarios", (route) =>
    route.fulfill({ json: [] }),
  );
  await page.route("**/api/referencias/cursos?*", (route) =>
    route.fulfill({ json: [] }),
  );
  await page.route("**/api/referencias/docentes", (route) =>
    route.fulfill({ json: [] }),
  );
  return control;
}
export async function login(
  page: Page,
  role = "bedel",
  password = "Prueba123",
) {
  await page.getByLabel("Correo electrónico").fill(`${role}@demo.local`);
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
}
