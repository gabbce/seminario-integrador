import { createContext, useContext } from "react";
import { rooms, type Room } from "./domain";
export const RoomContext = createContext<Room[]>(rooms);
export const useRooms = () => useContext(RoomContext);
