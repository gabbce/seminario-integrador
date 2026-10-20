import { test, expect } from "@playwright/test";
import { reservationInventory } from "./reservation-inventory";

test("inventario QA recorre todas las páginas sin pedir una colección ilimitada", async ({
  page,
}) => {
  const requested: number[] = [];
  await page.route("**/qa-inventory", (route) =>
    route.fulfill({ contentType: "text/html", body: "<html></html>" }),
  );
  await page.route("**/api/reservas?*", (route) => {
    const url = new URL(route.request().url());
    const current = Number(url.searchParams.get("page"));
    expect(url.searchParams.get("size")).toBe("100");
    expect(route.request().headers().authorization).toBe("Bearer qa-token");
    requested.push(current);
    const items = Array.from(
      { length: Math.min(100, 205 - current * 100) },
      (_, i) => ({ id: String(current * 100 + i) }),
    );
    return route.fulfill({
      json: { items, total: 205, page: current, size: 100 },
    });
  });
  await page.goto("/qa-inventory");
  await page.evaluate(() =>
    localStorage.setItem(
      "aulas-auth",
      JSON.stringify({ access_token: "qa-token" }),
    ),
  );
  const items = await reservationInventory<{ id: string }>(page);
  expect(requested).toEqual([0, 1, 2]);
  expect(items.map((item) => item.id)).toEqual(
    Array.from({ length: 205 }, (_, i) => String(i)),
  );
});
