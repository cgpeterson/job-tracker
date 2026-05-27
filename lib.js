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
