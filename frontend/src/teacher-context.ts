import { createContext, useContext } from "react";
import type { TeacherReference } from "./teachers";
export const TeacherContext = createContext<TeacherReference[]>([]);
export const useTeachers = () => useContext(TeacherContext);
