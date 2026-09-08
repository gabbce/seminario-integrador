export type Course = {
  id: string;
  code: number;
  subject: string;
  commission: string;
  year: number;
};
const clean = (value: string) => value.trim().replace(/\s+/g, " ");
const normalized = (value: string) => clean(value).toLocaleUpperCase("es");
export function createCourse(
  courses: Course[],
  subject: string,
  commission: string,
  year: number,
): Course {
  subject = clean(subject);
  commission = normalized(commission);
  if (!subject || !commission || !Number.isInteger(year))
    throw new Error("Completá materia, comisión y año.");
  const matter = courses.find(
    (c) => normalized(c.subject) === normalized(subject),
  );
  const code = matter?.code ?? Math.max(0, ...courses.map((c) => c.code)) + 1;
  const existing = courses.find(
    (c) => c.code === code && c.commission === commission && c.year === year,
  );
  if (existing) return existing;
  return {
    id: `${String(code).padStart(3, "0")}-${commission}-${year}`,
    code,
    subject: matter?.subject ?? subject,
    commission,
    year,
  };
}
export const initialCourses: Course[] = [
  { code: 1, subject: "Matemática I" },
  { code: 3, subject: "Física I" },
  { code: 4, subject: "Historia" },
  { code: 5, subject: "Álgebra" },
  { code: 6, subject: "Programación I" },
].map((c) => ({
  ...c,
  id: `${String(c.code).padStart(3, "0")}-A-2026`,
  commission: "A",
  year: 2026,
}));
