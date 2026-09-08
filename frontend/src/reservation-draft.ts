import type { Occurrence, Pattern } from "./domain";
import type { Schedule } from "./calendar";
import type { Resource } from "./equipment";
export type ReservationDraft = {
  mode: "periodic" | "sporadic";
  students: number;
  type: string;
  resources: Resource[];
  board: string;
  patterns: Pattern[];
  dates: Occurrence[];
  schedule: Schedule;
};
