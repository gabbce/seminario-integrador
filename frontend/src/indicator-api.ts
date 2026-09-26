export type Breakdown = {
  label: string;
  hours: number;
  availableHours: number;
  classes: number;
};
export type IndicatorSummary = {
  from: string;
  to: string;
  room: string;
  type: string;
  hours: number;
  availableHours: number;
  occupancy: number | null;
  classes: number;
  unknownCoverage: boolean;
  eligible: boolean;
  forecast: boolean;
  demand: Breakdown[];
  rooms: Breakdown[];
};
export type IndicatorSlot = {
  start: string;
  end: string;
  students: number;
  classes: number;
};
export type IndicatorDay = {
  date: string;
  slots: IndicatorSlot[];
  peakStudents: number;
  peakClasses: number;
  peakStudentSlots: string[];
  peakClassSlots: string[];
  studentHours: number;
  classes: number;
};
export type IndicatorWeek = {
  eligible: boolean;
  peakStudents: number | null;
  peakClasses: number | null;
  week: {
    day: number;
    dates: string[];
    slots: {
      start: string;
      end: string;
      students: number | null;
      classes: number | null;
    }[];
    studentHours: number | null;
    classes: number | null;
    peakStudents: number | null;
    peakClasses: number | null;
    peakDateStudents: number | null;
  }[];
};
export type IndicatorSeries = {
  summary: IndicatorSummary;
  daily: IndicatorDay | null;
  weekly: IndicatorWeek | null;
  studentHours: number;
};
