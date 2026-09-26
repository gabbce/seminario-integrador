import { useEffect, useState } from "react";
import { api } from "./api";
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
export function useConsultation(path: string | null) {
  const [attempt, retry] = useState(0);
  const [result, setResult] = useState<{
    key: string;
    data?: ConsultationResult;
    error?: string;
  }>();
  const key = `${path}:${attempt}`;
  useEffect(() => {
    if (!path) return;
    let active = true;
    void api<ConsultationResult>(path).then(
      (data) => {
        if (active) setResult({ key, data });
      },
      (error: Error) => {
        if (active) setResult({ key, error: error.message });
      },
    );
    return () => {
      active = false;
    };
  }, [path, key]);
  return {
    data: result?.key === key ? result.data : undefined,
    error: result?.key === key ? result.error : undefined,
    retry: () => retry((n) => n + 1),
  };
}
