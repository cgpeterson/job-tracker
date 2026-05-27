import { STATUS_CFG } from "../theme.js";

export default function SettingsModal({ settings, onChange, onClose, onExport, onImport, onReset }) {
  const set = (key, val) => onChange({ ...settings, [key]: val });

  return (
    <div onClick={onClose} style={backdrop}>
      <div onClick={e=>e.stopPropagation()} style={panel}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"1rem" }}>
          <h2 style={{ margin:0, fontSize:16, fontWeight:600 }}>Settings</h2>
          <button onClick={onClose} style={{ padding:"4px 10px", fontSize:13 }}>✕</button>
        </div>

        <Section title="Refresh">
          <Field label="Lookback window (days)">
            <input type="number" min={1} max={365} value={settings.lookbackDays}
              onChange={e=>set("lookbackDays", Number(e.target.value) || 1)}
              style={{ width:80 }} />
          </Field>
          <Field label="Refresh automatically on open">
            <input type="checkbox" checked={settings.autoRefreshOnOpen}
              onChange={e=>set("autoRefreshOnOpen", e.target.checked)} />
          </Field>
          <Field label="Gmail search query">
            <input type="text" placeholder="e.g. label:applications -from:noreply"
              value={settings.gmailQuery}
              onChange={e=>set("gmailQuery", e.target.value)}
              style={{ flex:1 }} />
          </Field>
        </Section>

        <Section title="Silent thresholds">
          <Field label="Warn after (days)">
            <input type="number" min={1} value={settings.warnDays}
              onChange={e=>set("warnDays", Number(e.target.value) || 1)}
              style={{ width:80 }} />
            <input type="color" value={settings.warnColor}
              onChange={e=>set("warnColor", e.target.value)}
              style={{ width:36, padding:0 }} />
          </Field>
          <Field label="Alert after (days)">
            <input type="number" min={1} value={settings.alertDays}
              onChange={e=>set("alertDays", Number(e.target.value) || 1)}
              style={{ width:80 }} />
            <input type="color" value={settings.alertColor}
              onChange={e=>set("alertColor", e.target.value)}
              style={{ width:36, padding:0 }} />
          </Field>
        </Section>

        <Section title="Filters">
          <Field label="Sources (comma-separated)">
            <input type="text" value={settings.sources.join(", ")}
              onChange={e=>set("sources", e.target.value.split(",").map(s=>s.trim()).filter(Boolean))}
              style={{ flex:1 }} />
          </Field>
          <Field label="Default status on open">
            <select value={settings.defaultStatusFilter}
              onChange={e=>set("defaultStatusFilter", e.target.value)}>
              <option value="All">All</option>
              {Object.keys(STATUS_CFG).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
        </Section>

        <Section title="Data">
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            <button onClick={onExport}>Export JSON</button>
            <label>
              <input type="file" accept=".json" style={{ display:"none" }}
                onChange={e=>{ const f = e.target.files[0]; if (f) onImport(f); e.target.value = ""; }} />
              <span style={fileButton}>Import JSON</span>
            </label>
            <button onClick={onReset} style={{ marginLeft:"auto", color:"#c0392b" }}>
              Reset all
            </button>
          </div>
          <div style={{ fontSize:11, color:"var(--color-text-tertiary)", marginTop:6 }}>
            Export includes jobs, edits, and these settings. Reset clears everything and reloads.
          </div>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom:"1.25rem" }}>
      <h3 style={sectionTitle}>{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6, fontSize:13 }}>
      <label style={{ flex:"0 0 200px", color:"var(--color-text-secondary)" }}>{label}</label>
      {children}
    </div>
  );
}

const backdrop = {
  position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:100,
  display:"flex", alignItems:"center", justifyContent:"center", padding:"1rem",
};

const panel = {
  background:"var(--color-background-primary)", color:"var(--color-text-primary)",
  borderRadius:8, padding:"1.5rem", minWidth:480, maxWidth:560, width:"100%",
  maxHeight:"85vh", overflow:"auto",
  border:"0.5px solid var(--color-border-tertiary)",
  boxShadow:"0 10px 40px rgba(0,0,0,0.25)",
};

const sectionTitle = {
  margin:"0 0 0.5rem", fontSize:11, fontWeight:600, letterSpacing:"0.5px",
  textTransform:"uppercase", color:"var(--color-text-secondary)",
};

const fileButton = {
  padding:"6px 10px", fontSize:13, borderRadius:6,
  border:"0.5px solid var(--color-border-tertiary)",
  background:"var(--color-background-secondary)", cursor:"pointer",
  display:"inline-block",
};
