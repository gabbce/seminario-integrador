import { describe, expect, it } from "vitest";
import { isDate, listingPage } from "./date-input";

describe("calendar inputs", () => {
  it("rejects rollover, incomplete and impossible dates", () => {
    for (const date of [
      "2027-02-30",
      "2027-13-45",
      "2027-02-29",
      "",
      "2027-2-01",
    ])
      expect(isDate(date)).toBe(false);
    expect(isDate("2028-02-29")).toBe(true);
    expect(isDate("2027-12-31")).toBe(true);
  });
  it("accepts only nonnegative safe integer page indices", () => {
    for (const value of ["-1", "Infinity", "1.5", "1e40", "bad", null])
      expect(listingPage(value)).toBe(0);
    expect(listingPage("9")).toBe(9);
  });
});
