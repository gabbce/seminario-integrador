import type { Page } from "@playwright/test";

// Explicit QA inventory only; operational screens use filtered consultation APIs.
export async function reservationInventory<T>(page: Page): Promise<T[]> {
  return page.evaluate(async () => {
    const session = JSON.parse(localStorage.getItem("aulas-auth")!);
    const items: unknown[] = [];
    for (let page = 0; ; page++) {
      const response = await fetch(`/api/reservas?page=${page}&size=100`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!response.ok) throw Error(`QA inventory ${response.status}`);
      const batch = await response.json();
      items.push(...batch.items);
      if (batch.items.length === 0 || items.length >= batch.total) return items;
    }
  }) as Promise<T[]>;
}
