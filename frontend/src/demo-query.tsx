import { createContext, useContext, useEffect, useState } from "react";
export type DemoQueryFault = {
  mode: "normal" | "error" | "slow";
  revision: number;
};
export const DemoQueryContext = createContext<{
  fault: DemoQueryFault;
  retry: () => void;
}>({ fault: { mode: "normal", revision: 0 }, retry: () => {} });
// Simula la entrega de una respuesta; no sustituye una consulta HTTP.
export function useDemoQuery(criteria: string) {
  const { fault, retry } = useContext(DemoQueryContext);
  const key = `${fault.revision}:${criteria}`;
  const [delivered, setDelivered] = useState("");
  useEffect(() => {
    if (fault.mode !== "slow") return;
    const timer = setTimeout(() => setDelivered(key), 1500);
    return () => clearTimeout(timer);
  }, [key, fault.mode]);
  return {
    status:
      fault.mode === "error"
        ? "error"
        : fault.mode === "slow" && delivered !== key
          ? "loading"
          : "ready",
    retry,
  } as const;
}
