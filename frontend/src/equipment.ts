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
    type: string;
    capacity: number;
    resources?: Resource[];
    board?: string;
  },
  requirements: Requirements,
) {
  return (
    room.type === requirements.type &&
    room.capacity >= requirements.students &&
    (!requirements.board || room.board === requirements.board) &&
    (requirements.resources ?? []).every((r) => room.resources?.includes(r))
  );
}
