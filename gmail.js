import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const MCP_DIR    = path.join(os.homedir(), ".gmail-mcp");
const KEYS_PATH  = path.join(MCP_DIR, "gcp-oauth.keys.json");
const TOKEN_PATH = path.join(MCP_DIR, "credentials.json");
const API        = "https://gmail.googleapis.com/gmail/v1/users/me";

function readJson(p) {
  if (!fs.existsSync(p)) {
    throw new Error(`Gmail not connected — ${p} is missing. Run setup.ps1 / setup.sh first.`);
  }
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

async function accessToken() {
  const keys  = readJson(KEYS_PATH).installed;
  const token = readJson(TOKEN_PATH);
  if (token.expiry_date && token.expiry_date > Date.now() + 60_000) {
    return token.access_token;
  }
  const res = await fetch(keys.token_uri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id:     keys.client_id,
      client_secret: keys.client_secret,
      refresh_token: token.refresh_token,
      grant_type:    "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`Gmail token refresh failed (${res.status}): ${await res.text()}`);
  const fresh = await res.json();
  const updated = { ...token, access_token: fresh.access_token, expiry_date: Date.now() + fresh.expires_in * 1000 };
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(updated, null, 2), { mode: 0o600 });
  return updated.access_token;
}

async function gapi(url, token) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Gmail API ${res.status}: ${await res.text()}`);
  return res.json();
}

async function mapLimit(items, limit, fn) {
  const out = [];
  let i = 0;
  const run = async () => {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return out;
}

const header = (msg, name) =>
  msg?.payload?.headers?.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || "";

const isoDay = ms => new Date(Number(ms)).toISOString().slice(0, 10);

// Page through every thread matching `query`, up to maxPages * 100 threads.
// `truncated` is true only if the cap is hit while more results remain.
async function listThreadIds(query, token, maxPages = 10) {
  const ids = [];
  let pageToken = "";
  for (let page = 0; page < maxPages; page++) {
    const url = `${API}/threads?q=${encodeURIComponent(query)}&maxResults=100`
      + (pageToken ? `&pageToken=${pageToken}` : "");
    const res = await gapi(url, token);
    for (const t of res.threads || []) ids.push(t.id);
    pageToken = res.nextPageToken || "";
    if (!pageToken) break;
  }
  return { ids, truncated: Boolean(pageToken) };
}

// Deterministic discovery: search Gmail with `query`, force-include `knownIds`,
// return one candidate per thread (latest message's headers + thread snippet,
// plus first/last contact dates) for Claude to classify.
export async function searchCandidates({ query, knownIds = [], maxPages = 10 }) {
  const token = await accessToken();

  const { ids: found, truncated } = await listThreadIds(query, token, maxPages);
  const ids = new Set(found);
  for (const id of knownIds) ids.add(id);

  const threads = await mapLimit([...ids], 10, id =>
    gapi(`${API}/threads/${id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`, token)
      .catch(() => null)
  );

  const candidates = threads.filter(Boolean).map(t => {
    const msgs  = t.messages || [];
    const first = msgs[0];
    const last  = msgs[msgs.length - 1];
    return {
      id:        t.id,
      subject:   header(last, "Subject"),
      from:      header(last, "From"),
      firstDate: first ? isoDay(first.internalDate) : "",
      lastDate:  last  ? isoDay(last.internalDate)  : "",
      snippet:   t.snippet || last?.snippet || "",
    };
  });

  return { candidates, truncated };
}
