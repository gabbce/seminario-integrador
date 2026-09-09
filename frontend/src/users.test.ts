import { expect, it } from "vitest";
import { initialUsers, saveUser } from "./users";
import { authenticate, setCredential } from "./mock-auth";
it("protege último admin, rol, versión y email único", () => {
  const admin = initialUsers[0];
  expect(
    saveUser(initialUsers, { ...admin, active: false }, admin.id).error,
  ).toContain("administrador activo");
  expect(
    saveUser(initialUsers, { ...admin, role: "Bedel" }, admin.id).error,
  ).toBeTruthy();
  expect(
    saveUser(initialUsers, { ...initialUsers[1], email: admin.email }, admin.id)
      .error,
  ).toBeTruthy();
  expect(
    saveUser(initialUsers, { ...admin, version: 1 }, admin.id).error,
  ).toBeTruthy();
  expect(saveUser(initialUsers, admin, "bedel").error).toBeTruthy();
});
it("cambia contraseña sin cambiar identidad ni permitir la anterior", () => {
  const user = {
    ...initialUsers[2],
    id: "new-test",
    email: "test@example.test",
  };
  const users = [...initialUsers, user];
  expect(
    setCredential(users, "admin", user.id, "Clave123", "Otra123"),
  ).toBeTruthy();
  expect(
    setCredential(users, "admin", user.id, "Clave123", "Clave123"),
  ).toBeUndefined();
  expect(authenticate(users, user.email, "Clave123").id).toBe(user.id);
  setCredential(users, "admin", user.id, "Nueva123", "Nueva123");
  expect(authenticate(users, user.email, "Clave123").error).toBeTruthy();
  expect(authenticate(users, user.email, "Nueva123").id).toBe(user.id);
  expect(
    authenticate(
      users.map((u) => (u.id === user.id ? { ...u, active: false } : u)),
      user.email,
      "Nueva123",
    ).error,
  ).toContain("deshabilitada");
});
