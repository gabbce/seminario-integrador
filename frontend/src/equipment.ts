export const resourceLabels = {
  fans: "Ventiladores",
  air: "Aire acondicionado",
  projector: "Proyector",
  television: "Televisor",
  computer: "Computadora",
};
export type Resource = keyof typeof resourceLabels;
export const resourcesFor = (type: string): Resource[] =>
  type === "Multimedios"
    ? ["fans", "air", "projector", "television", "computer"]
    : ["fans", "air"];
export type Requirements = {
  type: string;
  students: number;
  resources?: Resource[];
  board?: string;
};
export function compatible(
  room: {
    state?: string;
    type: string;
    capacity: number;
    resources?: Resource[];
    board?: string;
  },
  requirements: Requirements,
) {
  return (
    (!room.state || room.state === "Habilitada") &&
    room.type === requirements.type &&
    room.capacity >= requirements.students &&
    (!requirements.board || room.board === requirements.board) &&
    (requirements.resources ?? []).every((r) => room.resources?.includes(r))
  );
}
/** Human-readable equipment of a room: board, resources and descriptive PCs. */
export function roomAttributes(room: {
  type: string;
  board?: string;
  resources?: Resource[];
  computers?: number;
}): string[] {
  const attributes = [
    ...(room.board ? [`Pizarrón de ${room.board.toLowerCase()}`] : []),
    ...(room.resources ?? []).map((r) => resourceLabels[r]),
    ...(room.type === "Laboratorio" ? [`${room.computers ?? 0} PC`] : []),
  ];
  return room.resources?.length
    ? attributes
    : [...attributes, "Sin recursos adicionales"];
}
