import type { Role } from "./domain";
export type User = {
  id: string;
  version: number;
  name: string;
  surname: string;
  email: string;
  role: Role;
  active: boolean;
  shift?: string;
  staffId?: string;
};
export const initialUsers: User[] = [
  {
    id: "admin",
    version: 0,
    name: "Lucía",
    surname: "Pérez",
    email: "admin@demo.local",
    role: "Administrador",
    active: true,
  },
  {
    id: "bedel",
    version: 0,
    name: "Gabriela",
    surname: "López",
    email: "bedel@demo.local",
    role: "Bedel",
    active: true,
  },
  {
    id: "docente",
    version: 0,
    name: "Laura",
    surname: "Gómez",
    email: "docente@demo.local",
    role: "Docente",
    active: true,
  },
];
export function saveUser(
  users: User[],
  proposed: User,
  actorId: string,
): { users: User[]; error?: never } | { error: string; users?: never } {
  const actor = users.find((u) => u.id === actorId);
  if (!actor?.active || actor.role !== "Administrador")
    return { error: "Solo un administrador activo puede gestionar cuentas." };
  const current = users.find((u) => u.id === proposed.id);
  if (current && current.version !== proposed.version)
    return {
      error:
        "La cuenta cambió. Volvé a abrirla para revisar la versión actual.",
    };
  const email = proposed.email.trim().toLowerCase();
  if (
    !proposed.name.trim() ||
    !proposed.surname.trim() ||
    !/^\S+@\S+\.\S+$/.test(email) ||
    !["Administrador", "Bedel", "Docente"].includes(proposed.role)
  )
    return { error: "Completá nombre, apellido, correo y rol válidos." };
  if (
    users.some((u) => u.id !== proposed.id && u.email.toLowerCase() === email)
  )
    return { error: "El correo ya pertenece a otra cuenta." };
  const user = {
    ...proposed,
    name: proposed.name.trim(),
    surname: proposed.surname.trim(),
    email,
    version: (current?.version ?? 0) + 1,
    shift: proposed.role === "Bedel" ? proposed.shift : undefined,
    staffId: proposed.role === "Docente" ? proposed.staffId : undefined,
  };
  const result = current
    ? users.map((u) => (u.id === user.id ? user : u))
    : [...users, user];
  if (!result.some((u) => u.active && u.role === "Administrador"))
    return { error: "Debe quedar al menos un administrador activo." };
  return { users: result };
}
