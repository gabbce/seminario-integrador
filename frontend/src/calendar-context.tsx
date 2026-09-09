import { createContext, useContext } from "react";
import { initialCalendar } from "./calendar";
export const CalendarContext = createContext(initialCalendar);
export const useCalendar = () => useContext(CalendarContext);
