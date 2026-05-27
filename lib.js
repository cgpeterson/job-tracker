const MS_PER_DAY = 86400000;

export function daysSince(date) {
  if (!date) return null;
  return Math.floor((Date.now() - new Date(date)) / MS_PER_DAY);
}

export function parseJobsResponse(text) {
  const stripped = String(text).replace(/```[\w]*\n?|```\n?/g, "").trim();
  const start    = stripped.indexOf("[");
  const end      = stripped.lastIndexOf("]");
  if (start === -1 || end === -1) {
    throw new Error("Claude response did not contain a JSON array");
  }
  try {
    return JSON.parse(stripped.slice(start, end + 1));
  } catch (err) {
    throw new Error(`Could not parse Claude response as JSON: ${err.message}`);
  }
}

export function compareRows(a, b, sort) {
  const valA = sort.key === "_days" ? (a._days ?? -1) : (a[sort.key] ?? "");
  const valB = sort.key === "_days" ? (b._days ?? -1) : (b[sort.key] ?? "");
  if (typeof valA === "number") return sort.dir === "asc" ? valA - valB : valB - valA;
  return sort.dir === "asc"
    ? String(valA).localeCompare(String(valB))
    : String(valB).localeCompare(String(valA));
}
