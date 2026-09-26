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
