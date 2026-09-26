import {
  test as base,
  expect,
  type Browser,
  type BrowserContext,
} from "@playwright/test";
import { readFileSync, mkdirSync } from "node:fs";
// Track only sessions created by this test worker, including secondary browser pages.
export const test = base.extend<object, { browser: Browser }>({
  browser: [
    async ({ browser }, provide) => {
      mkdirSync("../artifacts/qa/operations", { recursive: true });
      const tokens = new Set<string>(),
        pending: Promise<void>[] = [],
        observed = new WeakSet<BrowserContext>();
      const observe = (context: BrowserContext) => {
        if (observed.has(context)) return;
        observed.add(context);
        context.on("response", (response) => {
          if (!response.url().includes("/auth/v1/token") || !response.ok())
            return;
          pending.push(
            response
              .json()
              .then((value) => {
                if (typeof value.access_token === "string")
                  tokens.add(value.access_token);
              })
              .catch(() => {}),
          );
        });
      };
      const wrapped = new Proxy(browser, {
        get(target, key) {
          if (key === "newContext")
            return async (...args: Parameters<Browser["newContext"]>) => {
              const context = await target.newContext(...args);
              observe(context);
              return context;
            };
          if (key === "newPage")
            return async (...args: Parameters<Browser["newPage"]>) => {
              const page = await target.newPage(...args);
              observe(page.context());
              return page;
            };
          const value = Reflect.get(target, key);
          return typeof value === "function" ? value.bind(target) : value;
        },
      });
      try {
        await provide(wrapped);
      } finally {
        await Promise.all(pending);
        if (tokens.size) {
          const config = Object.fromEntries(
            readFileSync(".env.local", "utf8")
              .split(/\r?\n/)
              .filter((l) => l.includes("=") && !l.startsWith("#"))
              .map((l) => {
                const n = l.indexOf("=");
                return [l.slice(0, n), l.slice(n + 1)];
              }),
          );
          for (const token of tokens) {
            const r = await fetch(
              config.VITE_SUPABASE_URL + "/auth/v1/logout?scope=local",
              {
                method: "POST",
                headers: {
                  apikey: config.VITE_SUPABASE_PUBLISHABLE_KEY,
                  Authorization: "Bearer " + token,
                },
              },
            );
            expect([200, 204, 401, 403]).toContain(r.status);
          }
        }
      }
    },
    { scope: "worker" },
  ],
});
export { expect };
