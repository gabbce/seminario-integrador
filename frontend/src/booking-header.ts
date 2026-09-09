import { type Booking, type Role, type Room, rooms } from "./domain";
import { type Course } from "./catalog";
import { teachers } from "./teachers";
import { compatible, resourcesFor, type Resource } from "./equipment";
import { demoNow } from "./calendar";
import { isFuture } from "./cancellation";
export type HeaderChange = {
  version: number;
  course: string;
  teacher: string;
  students: number;
  type: string;
  resources: Resource[];
  board: string;
};
export const headerEditable = (b: Booking, now = demoNow) =>
  b.occurrences.length > 0 &&
  b.occurrences.every((o) => isFuture(o, now)) &&
  b.occurrences.some((o) => !o.cancelled);
export function changeHeader(
  b: Booking,
  request: HeaderChange,
  courses: Course[],
  role: Role,
  now = demoNow,
  inventory: Room[] = rooms,
): { booking: Booking; error?: never } | { error: string; booking?: never } {
  if (role === "Docente")
    return { error: "Tu cuenta solo permite consultar reservas." };
  if ((b.version ?? 0) !== request.version)
    return {
      error: "La reserva cambió. Volvé al detalle y revisá la versión actual.",
    };
  if (!headerEditable(b, now))
    return {
      error:
        "Los datos compartidos quedan fijos al iniciarse la reserva. Para otras necesidades, cancelá las futuras afectadas y registrá una nueva reserva.",
    };
  const course = courses.find(
    (c) => c.id === request.course && c.year === 2026,
  );
  const teacher = teachers.find((t) => t.name === request.teacher);
  if (!course || !teacher)
    return { error: "Elegí un curso del año y un docente del catálogo." };
  if (!Number.isInteger(request.students) || request.students < 1)
    return {
      error: "Indicá una cantidad entera positiva de alumnos previstos.",
    };
  if (
    !["General", "Multimedios", "Laboratorio"].includes(request.type) ||
    !["", "Tiza", "Fibrón"].includes(request.board) ||
    request.resources.some((r) => !resourcesFor(request.type).includes(r))
  )
    return { error: "Revisá el tipo de aula, pizarrón y equipamiento." };
  const invalid = b.occurrences
    .filter((o) => !o.cancelled)
    .find((o) => {
      const room = inventory.find((r) => r.id === o.room);
      return !room || !compatible(room, request);
    });
  if (invalid)
    return {
      error: `Aula ${invalid.room} no cumple los nuevos requisitos. Ajustá los datos o reasigná las aulas antes de guardar.`,
    };
  return {
    booking: {
      ...b,
      subject: course.subject,
      course: course.id,
      teacher: teacher.name,
      teacherEmail: teacher.email,
      students: request.students,
      type: request.type,
      resources: [...request.resources],
      board: request.board,
      version: (b.version ?? 0) + 1,
      changes: [
        ...(b.changes ?? []),
        {
          at: now,
          actor: role,
          description: `Datos compartidos: curso ${b.course} → ${course.id}; docente ${b.teacher} → ${teacher.name}; alumnos ${b.students} → ${request.students}; tipo ${b.type ?? "Sin registro"} → ${request.type}; pizarrón ${b.board || "Sin preferencia"} → ${request.board || "Sin preferencia"}; recursos ${(b.resources ?? []).join(", ") || "Sin requisitos"} → ${request.resources.join(", ") || "Sin requisitos"}.`,
        },
      ],
    },
  };
}
