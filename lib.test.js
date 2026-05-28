import { describe, test, expect, vi, beforeAll, afterAll } from "vitest";
import { daysSince, parseJobsResponse, compareRows, buildGmailQuery, mergeJobs, dedupeApplications } from "./lib.js";

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

describe("buildGmailQuery", () => {
  test("wraps keywords and appends lookback", () => {
    expect(buildGmailQuery({ searchQuery: "interview OR offer", lookbackDays: 35 }))
      .toBe("(interview OR offer) newer_than:35d");
  });

  test("omits keywords when blank", () => {
    expect(buildGmailQuery({ searchQuery: "  ", lookbackDays: 14 })).toBe("newer_than:14d");
  });

  test("omits lookback when falsy", () => {
    expect(buildGmailQuery({ searchQuery: "x", lookbackDays: 0 })).toBe("(x)");
  });
});

describe("mergeJobs", () => {
  test("incoming updates an existing row", () => {
    const existing = [{ id: "a", status: "Active" }];
    const incoming = [{ id: "a", status: "Interview" }];
    expect(mergeJobs(existing, incoming)).toEqual([{ id: "a", status: "Interview" }]);
  });

  test("keeps an existing row the refresh did not return", () => {
    const merged = mergeJobs([{ id: "a" }, { id: "b" }], [{ id: "a" }]);
    expect(merged.map(j => j.id).sort()).toEqual(["a", "b"]);
  });

  test("adds new rows from incoming", () => {
    const merged = mergeJobs([{ id: "a" }], [{ id: "b" }]);
    expect(merged.map(j => j.id).sort()).toEqual(["a", "b"]);
  });

  test("drops ignored ids from both sides", () => {
    const merged = mergeJobs([{ id: "a" }, { id: "b" }], [{ id: "c" }], ["b", "c"]);
    expect(merged.map(j => j.id)).toEqual(["a"]);
  });

  test("skips rows without an id", () => {
    const merged = mergeJobs([{ id: "a" }, {}], [{}], []);
    expect(merged).toEqual([{ id: "a" }]);
  });
});

describe("dedupeApplications", () => {
  test("collapses same company+role+sender, keeping the latest status", () => {
    const rows = [
      { id: "t1", company: "Temporal", role: "SWE", contactEmail: "no-reply@x.io", status: "Active",   appliedDate: "2026-05-08", lastContactDate: "2026-05-08" },
      { id: "t2", company: "Temporal", role: "SWE", contactEmail: "no-reply@x.io", status: "Rejected", appliedDate: "2026-05-26", lastContactDate: "2026-05-26" },
    ];
    const [app] = dedupeApplications(rows);
    expect(dedupeApplications(rows)).toHaveLength(1);
    expect(app.status).toBe("Rejected");
    expect(app.appliedDate).toBe("2026-05-08");
    expect(app.lastContactDate).toBe("2026-05-26");
    expect(app.id).toBe("t2");
    expect(app.threadIds.sort()).toEqual(["t1", "t2"]);
  });

  test("keeps rows distinct when the sender differs", () => {
    const rows = [
      { id: "a", company: "Balsam", role: "Eng", contactEmail: "shansen@balsambrands.com",  status: "Interview", lastContactDate: "2026-05-05" },
      { id: "b", company: "Balsam", role: "Eng", contactEmail: "no-reply@balsambrands.com", status: "Active",    lastContactDate: "2026-05-01" },
    ];
    expect(dedupeApplications(rows)).toHaveLength(2);
  });

  test("keeps rows distinct when the role differs", () => {
    const rows = [
      { id: "a", company: "Affirm", role: "Apprentice",      contactEmail: "x@gh.io", lastContactDate: "2026-05-15" },
      { id: "b", company: "Affirm", role: "Senior Backend",  contactEmail: "x@gh.io", lastContactDate: "2026-05-14" },
    ];
    expect(dedupeApplications(rows)).toHaveLength(2);
  });

  test("a single row passes through with its own id as the only thread", () => {
    const [app] = dedupeApplications([{ id: "a", company: "X", role: "Y", contactEmail: "z@z.com" }]);
    expect(app.threadIds).toEqual(["a"]);
  });
});
