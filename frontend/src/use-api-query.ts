import { useEffect, useState } from "react";
import { api } from "./api";
export function useApiQuery<T>(path: string | null) {
  const [attempt, retry] = useState(0);
  const [result, setResult] = useState<{
    key: string;
    data?: T;
    error?: string;
  }>();
  const key = `${path}:${attempt}`;
  useEffect(() => {
    if (!path) return;
    let active = true;
    void api<T>(path).then(
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
