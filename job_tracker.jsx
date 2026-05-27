import { useState, useEffect, useMemo, useCallback } from "react";
import seedData from "./seed.json";
import JobRow from "./components/JobRow.jsx";
import SettingsModal from "./components/SettingsModal.jsx";
import { STATUS_CFG } from "./theme.js";
import { DEFAULT_SETTINGS } from "./settings.js";
import { daysSince, parseJobsResponse } from "./lib.js";

const GMAIL_BASE = "https://mail.google.com/mail/u/0/#all/";

const STATUSES = Object.keys(STATUS_CFG);

const COLS = [
  { key:"company",         label:"Company",      w:"13%" },
  { key:"role",            label:"Role",         w:"18%" },
  { key:"status",          label:"Status",       w:"9%" },
  { key:"source",          label:"Source",       w:"7%" },
  { key:"appliedDate",     label:"Applied",      w:"6%" },
  { key:"lastContactDate", label:"Last contact", w:"7%" },
  { key:"_days",           label:"Silent",       w:"5%" },
  { key:"nextStep",        label:"Next step",    w:"14%" },
  { key:"priority",        label:"Priority",     w:"7%" },
  { key:"_notes",          label:"Notes",        w:"auto" },
];

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (err) {
    console.warn(`Failed to load ${key} from localStorage:`, err);
    return fallback;
  }
}

function saveJSON(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); }
  catch (err) { console.warn(`Failed to save ${key}:`, err); }
}

export default function JobTracker() {
  const [settings, setSettings]         = useState(() => ({ ...DEFAULT_SETTINGS, ...loadJSON("jt3_settings", {}) }));
  const [jobs, setJobs]                 = useState(() => loadJSON("jt3_jobs", seedData));
  const [edits, setEdits]               = useState(() => loadJSON("jt3_edits", {}));
  const [loading, setLoading]           = useState(false);
  const [synced, setSynced]             = useState(null);
  const [error, setError]               = useState(null);
  const [search, setSearch]             = useState("");
  const [statusFilter, setStatusFilter] = useState(settings.defaultStatusFilter);
  const [sourceFilter, setSourceFilter] = useState("All");
  const [sort, setSort]                 = useState({ key:"lastContactDate", dir:"desc" });
  const [settingsOpen, setSettingsOpen] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lookbackDays: settings.lookbackDays,
          gmailQuery:   settings.gmailQuery,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const parsed = parseJobsResponse(data.text);
      setJobs(parsed);
      setSynced(new Date());
      saveJSON("jt3_jobs", parsed);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [settings.lookbackDays, settings.gmailQuery]);

  useEffect(() => {
    if (settings.autoRefreshOnOpen) refresh();
  }, []);

  const setEdit = useCallback((id, field, val) => {
    setEdits(prev => {
      const next = { ...prev, [id]: { ...(prev[id]||{}), [field]: val } };
      saveJSON("jt3_edits", next);
      return next;
    });
  }, []);

  const updateSettings = useCallback(next => {
    setSettings(next);
    saveJSON("jt3_settings", next);
  }, []);

  const handleExport = useCallback(() => {
    const blob = new Blob(
      [JSON.stringify({ jobs, edits, settings }, null, 2)],
      { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `job-tracker-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [jobs, edits, settings]);

  const handleImport = useCallback(async file => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (Array.isArray(data.jobs))   { setJobs(data.jobs);    saveJSON("jt3_jobs", data.jobs); }
      if (data.edits)                 { setEdits(data.edits);  saveJSON("jt3_edits", data.edits); }
      if (data.settings) {
        const merged = { ...DEFAULT_SETTINGS, ...data.settings };
        setSettings(merged);
        saveJSON("jt3_settings", merged);
      }
    } catch (err) {
      alert(`Import failed: ${err.message}`);
    }
  }, []);

  const handleReset = useCallback(() => {
    if (!confirm("Reset all jobs, edits, and settings? This cannot be undone.")) return;
    localStorage.removeItem("jt3_jobs");
    localStorage.removeItem("jt3_edits");
    localStorage.removeItem("jt3_settings");
    location.reload();
  }, []);

  const merged = useMemo(() => jobs.map(job => ({
    ...job, ...(edits[job.id] || {}), _days: daysSince(job.lastContactDate),
  })), [jobs, edits]);

  const counts = useMemo(() => {
    const c = {};
    merged.forEach(job => { c[job.status] = (c[job.status] || 0) + 1; });
    return c;
  }, [merged]);

  const rows = useMemo(() => {
    let result = merged;
    if (search) {
      const query = search.toLowerCase();
      result = result.filter(job =>
        [job.company, job.role, job.nextStep, job.notes].some(v =>
          (v || "").toLowerCase().includes(query)));
    }
    if (statusFilter !== "All") result = result.filter(j => j.status === statusFilter);
    if (sourceFilter !== "All") result = result.filter(j => j.source === sourceFilter);
    return [...result].sort((a, b) => {
      const valA = sort.key === "_days" ? (a._days ?? -1) : (a[sort.key] ?? "");
      const valB = sort.key === "_days" ? (b._days ?? -1) : (b[sort.key] ?? "");
      if (typeof valA === "number") return sort.dir === "asc" ? valA - valB : valB - valA;
      return sort.dir === "asc"
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });
  }, [merged, search, statusFilter, sourceFilter, sort]);

  const toggleSort = key => setSort(s => ({
    key, dir: s.key === key && s.dir === "asc" ? "desc" : "asc"
  }));

  return (
    <div style={{ fontFamily:"var(--font-sans)", padding:"1rem 0 3rem", minWidth:0 }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .refresh-icon { display:inline-block; }
        .refresh-icon.spinning { animation: spin 0.8s linear infinite; }
        .job-row:hover td { background: var(--color-background-secondary) !important; }
        .sort-th:hover { color: var(--color-text-primary) !important; }
        .note-input:focus { border-color: var(--color-border-secondary) !important; outline:none; }
        .stat-chip { transition: all 0.15s ease; }
        .stat-chip:hover { opacity:0.85; }
        .icon-btn { padding:6px 10px; font-size:16px; line-height:1; }
      `}</style>

      {/* ── Header ── */}
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:"1rem", gap:8, flexWrap:"wrap" }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:600, margin:0, letterSpacing:"-0.3px", color:"var(--color-text-primary)" }}>
            Job Applications
          </h1>
          <div style={{ fontSize:12, color:"var(--color-text-secondary)", marginTop:3 }}>
            {synced
              ? `Synced from Gmail at ${synced.toLocaleTimeString()}`
              : "Pre-loaded · click Refresh to pull live Gmail data"}
          </div>
        </div>
        <div style={{ display:"flex", gap:6, alignItems:"center" }}>
          <button onClick={()=>setSettingsOpen(true)} className="icon-btn"
            title="Settings" aria-label="Settings">⚙</button>
          <button onClick={refresh} disabled={loading}
            style={{ display:"flex", alignItems:"center", gap:7, padding:"7px 16px", fontSize:13, fontWeight:500, minWidth:168 }}>
            <span className={`refresh-icon${loading?" spinning":""}`}>↻</span>
            {loading ? "Syncing Gmail…" : "Refresh from Gmail"}
          </button>
        </div>
      </div>

      {/* ── Stat chips (clickable filters) ── */}
      <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:"1rem" }}>
        <div onClick={()=>setStatusFilter("All")} className="stat-chip"
          style={{ cursor:"pointer", padding:"6px 14px", borderRadius:20, fontSize:12, fontWeight:500,
            background: statusFilter==="All" ? "var(--color-text-primary)" : "var(--color-background-secondary)",
            color:      statusFilter==="All" ? "var(--color-background-primary)" : "var(--color-text-secondary)",
            border:"0.5px solid var(--color-border-tertiary)" }}>
          All · {merged.length}
        </div>
        {STATUSES.map(s => {
          const active = statusFilter === s;
          const cfg    = STATUS_CFG[s];
          return (
            <div key={s} onClick={()=>setStatusFilter(v=>v===s?"All":s)} className="stat-chip"
              style={{ cursor:"pointer", padding:"6px 14px", borderRadius:20, fontSize:12, fontWeight:500,
                background: active ? cfg.bg : "var(--color-background-secondary)",
                color:      active ? cfg.fg : "var(--color-text-secondary)",
                border:     active ? `0.5px solid ${cfg.fg}40` : "0.5px solid var(--color-border-tertiary)" }}>
              {s} · {counts[s]||0}
            </div>
          );
        })}
      </div>

      {/* ── Filter bar ── */}
      <div style={{ display:"flex", gap:8, marginBottom:"0.75rem", flexWrap:"wrap", alignItems:"center" }}>
        <input type="text" placeholder="Search company, role, notes…" value={search}
          onChange={e=>setSearch(e.target.value)}
          style={{ flex:1, minWidth:180 }} />
        <select value={sourceFilter} onChange={e=>setSourceFilter(e.target.value)} style={{ width:120 }}>
          <option value="All">All sources</option>
          {settings.sources.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        {(search || statusFilter!=="All" || sourceFilter!=="All") &&
          <button onClick={()=>{ setSearch(""); setStatusFilter("All"); setSourceFilter("All"); }}
            style={{ fontSize:12, padding:"5px 12px" }}>✕ Clear</button>
        }
        <span style={{ fontSize:12, color:"var(--color-text-secondary)", marginLeft:"auto" }}>
          {rows.length} / {merged.length}
        </span>
      </div>

      {error && (
        <div style={{ padding:"8px 12px", background:"var(--color-background-danger)", color:"var(--color-text-danger)",
          borderRadius:6, fontSize:13, marginBottom:8, border:"0.5px solid var(--color-border-danger)" }}>
          ⚠ {error}
        </div>
      )}

      {/* ── Table ── */}
      <div style={{ overflowX:"auto", border:"0.5px solid var(--color-border-tertiary)", borderRadius:8 }}>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12.5, tableLayout:"fixed", minWidth:960 }}>
          <colgroup>
            {COLS.map(c=><col key={c.key} style={{width:c.w}} />)}
          </colgroup>
          <thead>
            <tr>
              {COLS.map(col => {
                const isSorted = sort.key === col.key;
                const sortable = col.key !== "_notes";
                return (
                  <th key={col.key}
                    onClick={sortable ? ()=>toggleSort(col.key) : undefined}
                    className={sortable ? "sort-th" : ""}
                    style={{ textAlign:"left", fontWeight:500, fontSize:11, padding:"8px 10px",
                      background:"var(--color-background-secondary)",
                      borderBottom:"0.5px solid var(--color-border-tertiary)",
                      color: isSorted ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                      cursor: sortable ? "pointer" : "default",
                      whiteSpace:"nowrap", userSelect:"none",
                      letterSpacing:"0.2px" }}>
                    {col.label}
                    {sortable && <span style={{ marginLeft:4, opacity:isSorted?1:0.3, fontSize:10 }}>
                      {isSorted ? (sort.dir==="asc"?"↑":"↓") : "⇅"}
                    </span>}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={COLS.length}
                  style={{ padding:"3rem", textAlign:"center", color:"var(--color-text-secondary)" }}>
                  No applications match your filters
                </td>
              </tr>
            )}
            {rows.map((job, i) => (
              <JobRow key={job.id || i}
                job={job}
                editKey={job.id || String(i)}
                gmailUrl={job.id ? GMAIL_BASE + job.id : null}
                setEdit={setEdit}
                warnDays={settings.warnDays}
                alertDays={settings.alertDays}
                warnColor={settings.warnColor}
                alertColor={settings.alertColor} />
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop:8, fontSize:11, color:"var(--color-text-tertiary)", display:"flex", gap:16, flexWrap:"wrap" }}>
        <span>↑ Click any row to open latest email in Gmail</span>
        <span>· Priority and notes persist across sessions</span>
        <span>
          · Silent = days since last contact · <span style={{color:settings.warnColor}}>warn &gt;{settings.warnDays}</span> · <span style={{color:settings.alertColor}}>alert &gt;{settings.alertDays}</span>
        </span>
      </div>

      {settingsOpen && (
        <SettingsModal
          settings={settings}
          onChange={updateSettings}
          onClose={()=>setSettingsOpen(false)}
          onExport={handleExport}
          onImport={handleImport}
          onReset={handleReset} />
      )}
    </div>
  );
}
