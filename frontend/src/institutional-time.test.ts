import { describe, expect, it } from "vitest";
import { institutionalNow } from "./institutional-time";

describe("hora institucional", () => {
  it("conserva el día y año de Córdoba cuando UTC ya cambió de fecha", () => {
    expect(institutionalNow(new Date("2027-01-01T02:30:00Z"))).toBe(
      "2026-12-31T23:30",
    );
  });
  it("representa medianoche institucional como 00:00", () => {
    expect(institutionalNow(new Date("2027-03-15T03:00:00Z"))).toBe(
      "2027-03-15T00:00",
    );
  });
});

import { institutionalTimestamp } from "./institutional-time";
it("presents persisted UTC audit instants in institutional time without microseconds", () => {
  expect(institutionalTimestamp("2026-09-25T07:33:05.002203Z")).toBe(
    "25/9/26, 04:33",
  );
  expect(institutionalTimestamp("2026-09-25T04:33")).toBe("2026-09-25 04:33");
});
