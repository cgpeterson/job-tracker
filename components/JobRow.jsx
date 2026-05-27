import { STATUS_CFG, PRI_CFG } from "../theme.js";

const monthDay = d => d?.slice(5) || "—";

const cell       = { padding: "9px 10px", verticalAlign: "top" };
const cellTight  = { padding: "5px 6px",  verticalAlign: "top" };
const muted      = { fontSize: 12, color: "var(--color-text-secondary)" };
const truncate   = { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };

export default function JobRow({ job, editKey, gmailUrl, setEdit, warnDays, alertDays, warnColor, alertColor }) {
  const statusStyle   = STATUS_CFG[job.status] || STATUS_CFG.Active;
  const days          = job._days;
  const dayFg         = days > alertDays ? alertColor : days > warnDays ? warnColor : "var(--color-text-secondary)";
  const note          = job.notes || "";
  const priority      = job.priority || "";
  const priorityStyle = priority ? PRI_CFG[priority] : null;

  return (
    <tr className="job-row"
      onClick={()=>{ if (gmailUrl) window.open(gmailUrl, "_blank"); }}
      style={{ cursor: gmailUrl ? "pointer" : "default", borderBottom:"0.5px solid var(--color-border-tertiary)" }}>

      <td style={{ ...cell, ...truncate, fontWeight:500 }} title={job.company}>
        {job.company}
      </td>

      <td style={{ ...cell, ...muted, ...truncate }} title={job.role}>
        {job.role || "—"}
      </td>

      <td style={cell}>
        <span style={{ display:"inline-block", fontSize:10, fontWeight:600, padding:"2px 8px",
          borderRadius:10, background:statusStyle.bg, color:statusStyle.fg,
          border:`0.5px solid ${statusStyle.bd}`, whiteSpace:"nowrap", letterSpacing:"0.1px" }}>
          {job.status}
        </span>
      </td>

      <td style={{ ...cell, ...muted }}>{job.source || "—"}</td>

      <td style={{ ...cell, ...muted, whiteSpace:"nowrap" }}>{monthDay(job.appliedDate)}</td>

      <td style={{ ...cell, ...muted, whiteSpace:"nowrap" }}>{monthDay(job.lastContactDate)}</td>

      <td style={{ ...cell, fontSize:12, fontWeight: days > warnDays ? 600 : 400, color: dayFg, whiteSpace:"nowrap" }}>
        {days != null ? `${days}d` : "—"}
      </td>

      <td style={{ ...cell, ...muted, ...truncate }} title={job.nextStep}>
        {job.nextStep || "—"}
      </td>

      <td style={cellTight} onClick={e=>e.stopPropagation()}>
        <select value={priority} onChange={e=>setEdit(editKey, "priority", e.target.value)}
          style={{ fontSize:11, padding:"3px 5px", width:"100%", borderRadius:4,
            background: priorityStyle ? priorityStyle.bg : "var(--color-background-secondary)",
            color:      priorityStyle ? priorityStyle.fg : "var(--color-text-secondary)",
            border:"0.5px solid var(--color-border-tertiary)", cursor:"pointer" }}>
          <option value="">—</option>
          <option value="High">🔴 High</option>
          <option value="Medium">🟡 Medium</option>
          <option value="Low">🟢 Low</option>
        </select>
      </td>

      <td style={cellTight} onClick={e=>e.stopPropagation()}>
        <input type="text" placeholder="Add note…" value={note} className="note-input"
          onChange={e=>setEdit(editKey, "notes", e.target.value)}
          style={{ fontSize:11, padding:"3px 8px", width:"100%",
            background:"transparent", border:"0.5px solid transparent",
            borderRadius:4, color:"var(--color-text-secondary)" }} />
      </td>
    </tr>
  );
}
