import { type Room, type Booking, type Role } from "./domain";
import { demoNow } from "./calendar";
import { compatible, resourcesFor } from "./equipment";
export function saveRoom(
  inventory: Room[],
  proposed: Room,
  originalId: string | undefined,
  bookings: Booking[],
  role: Role,
  now = demoNow,
): { rooms: Room[]; error?: never } | { error: string; rooms?: never } {
  if (role === "Docente")
    return { error: "Tu cuenta solo permite consultar aulas." };
  const current = inventory.find((r) => r.id === originalId);
  if (
    originalId &&
    (!current || (current.version ?? 0) !== (proposed.version ?? 0))
  )
    return {
      error: "El aula cambió. Volvé a abrirla para revisar la versión actual.",
    };
  if (current?.state === "Baja")
    return {
      error: "Un aula dada de baja no se puede restaurar ni modificar.",
    };
  const id = proposed.id.trim();
  if (
    !id ||
    (!originalId &&
      inventory.some(
        (r) => r.id.toLocaleLowerCase() === id.toLocaleLowerCase(),
      ))
  )
    return {
      error:
        "El identificador debe ser único, incluso entre aulas dadas de baja.",
    };
  if (originalId !== undefined && id !== originalId)
    return { error: "El identificador del aula no se modifica." };
  if (
    !Number.isInteger(proposed.capacity) ||
    proposed.capacity < 1 ||
    !proposed.location?.trim() ||
    !Number.isInteger(proposed.floor)
  )
    return { error: "Completá ubicación, piso entero y capacidad positiva." };
  if (
    !["General", "Multimedios", "Laboratorio"].includes(proposed.type) ||
    !["Habilitada", "Inhabilitada", "Mantenimiento", "Baja"].includes(
      proposed.state ?? "",
    ) ||
    !["Tiza", "Fibrón"].includes(proposed.board ?? "")
  )
    return { error: "Revisá tipo, estado y pizarrón." };
  if (
    (proposed.resources ?? []).some(
      (r) => !resourcesFor(proposed.type).includes(r),
    )
  )
    return { error: "El equipamiento no corresponde al tipo de aula." };
  if (
    proposed.type === "Laboratorio" &&
    (!Number.isInteger(proposed.computers) || (proposed.computers ?? -1) < 0)
  )
    return {
      error: "La cantidad descriptiva de PC debe ser un entero no negativo.",
    };
  const affected = bookings.filter((b) =>
    b.occurrences.some(
      (o) =>
        o.room === id &&
        !o.cancelled &&
        `${o.date}T${o.end}` > now &&
        !compatible(proposed, {
          ...b,
          type: b.type ?? current?.type ?? proposed.type,
        }),
    ),
  );
  if (affected.length)
    return {
      error: `El cambio invalida reservas futuras o en curso: ${affected.map((b) => `${b.id} (${b.subject})`).join(", ")}. Reasigná o cancelá las clases afectadas primero.`,
    };
  const room: Room = {
    ...proposed,
    id,
    location: proposed.location.trim(),
    computers: proposed.type === "Laboratorio" ? proposed.computers : undefined,
    version: (current?.version ?? 0) + 1,
    history: current?.history ?? [],
  };
  if (!current || current.state !== room.state || current.type !== room.type)
    room.history = [
      ...(current?.history ?? []),
      { at: now, state: room.state ?? "Habilitada", type: room.type },
    ];
  return {
    rooms: current
      ? inventory.map((r) => (r.id === id ? room : r))
      : [...inventory, room],
  };
}
