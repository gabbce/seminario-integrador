import { useApiQuery } from "./use-api-query";
import type { Booking } from "./domain";
export type ConsultationRow = {
  id: string;
  bookingId: string;
  courseId: string;
  course: string;
  subject: string;
  teacher: string;
  students: number;
  date: string;
  start: string;
  end: string;
  room: string;
  type: string;
  cancelled: boolean;
};
export type ConsultationResult = {
  rows: ConsultationRow[];
  total: number;
  page: number;
  size: number;
  filters: Record<string, unknown>;
};
export function rowBooking(row: ConsultationRow): Booking {
  return {
    id: row.bookingId,
    courseId: row.courseId,
    course: row.course,
    subject: row.subject,
    teacher: row.teacher,
    students: row.students,
    type: row.type,
    occurrences: [
      {
        id: row.id,
        date: row.date,
        start: row.start,
        end: row.end,
        room: row.room,
        cancelled: row.cancelled,
      },
    ],
  };
}
export const useConsultation = (path: string | null) =>
  useApiQuery<ConsultationResult>(path);
