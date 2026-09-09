import { createContext, useContext } from "react";
import { initialCalendar, emptyCalendar } from "./calendar";
export const CalendarContext = createContext([initialCalendar]);
export const useCalendars = () => useContext(CalendarContext);
export const useCalendar = (year = 2026) =>
  useCalendars().find((c) => c.year === year) ?? emptyCalendar(year);
