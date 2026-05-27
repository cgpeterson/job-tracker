import { describe, test, expect, vi, beforeAll, afterAll } from "vitest";
import { daysSince, parseJobsResponse, compareRows } from "./lib.js";

describe("daysSince", () => {
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-15T12:00:00Z"));
  });
  afterAll(() => vi.useRealTimers());

  test("returns null for falsy input", () => {
    expect(daysSince(null)).toBeNull();
    expect(daysSince(undefined)).toBeNull();
    expect(daysSince("")).toBeNull();
  });

  test("returns 0 for today", () => {
    expect(daysSince("2026-01-15")).toBe(0);
  });

  test("counts whole days for past dates", () => {
    expect(daysSince("2026-01-08")).toBe(7);
    expect(daysSince("2025-12-31")).toBe(15);
  });

  test("returns negative for future dates", () => {
    expect(daysSince("2026-01-20")).toBe(-5);
  });
});

describe("parseJobsResponse", () => {
  const sample = '[{"id":"a","company":"Acme"}]';
  const expected = [{ id: "a", company: "Acme" }];

  test("parses a bare JSON array", () => {
    expect(parseJobsResponse(sample)).toEqual(expected);
  });

  test("strips ```json fences", () => {
    expect(parseJobsResponse("```json\n" + sample + "\n```")).toEqual(expected);
  });

  test("strips bare ``` fences", () => {
    expect(parseJobsResponse("```\n" + sample + "\n```")).toEqual(expected);
  });

  test("tolerates a preamble before the array", () => {
    expect(parseJobsResponse("Sure! Here you go:\n" + sample)).toEqual(expected);
  });

  test("tolerates trailing text after the array", () => {
    expect(parseJobsResponse(sample + "\n\nHope that helps!")).toEqual(expected);
  });

  test("parses an empty array", () => {
    expect(parseJobsResponse("[]")).toEqual([]);
  });

  test("throws when no array is present", () => {
    expect(() => parseJobsResponse("I don't have any data")).toThrow(/did not contain/);
  });

  test("throws a helpful error on malformed JSON", () => {
    expect(() => parseJobsResponse("[{broken}]")).toThrow(/Could not parse/);
  });
});

describe("compareRows", () => {
  const asc  = k => ({ key: k, dir: "asc"  });
  const desc = k => ({ key: k, dir: "desc" });

  test("sorts strings asc/desc", () => {
    expect(compareRows({ company: "Acme" }, { company: "Beta" }, asc("company"))).toBeLessThan(0);
    expect(compareRows({ company: "Acme" }, { company: "Beta" }, desc("company"))).toBeGreaterThan(0);
  });

  test("sorts _days as numbers", () => {
    expect(compareRows({ _days: 5 },  { _days: 10 }, asc("_days"))).toBeLessThan(0);
    expect(compareRows({ _days: 5 },  { _days: 10 }, desc("_days"))).toBeGreaterThan(0);
  });

  test("treats null _days as -1 (sorts first ascending)", () => {
    expect(compareRows({ _days: null }, { _days: 0 }, asc("_days"))).toBeLessThan(0);
  });

  test("falls back to empty string for missing key", () => {
    expect(compareRows({}, { role: "x" }, asc("role"))).toBeLessThan(0);
  });

  test("is case-insensitive for strings (localeCompare default)", () => {
    expect(compareRows({ company: "acme" }, { company: "Beta" }, asc("company"))).toBeLessThan(0);
  });
});
