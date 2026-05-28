import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { spawn } from "node:child_process";
import { buildGmailQuery } from "./lib.js";
import { searchCandidates } from "./gmail.js";

function buildPrompt(today, candidates) {
  return `Classify these job-application email threads. They were already fetched from Gmail — do NOT search, just classify what's below.

Return ONLY a JSON array (no markdown fences, no preamble, no trailing text). One object per thread that is a genuine job application; skip threads that are clearly not (newsletters, job alerts, marketing). Keys:
- id: the thread's id, copied verbatim
- company: the hiring company (infer from sender/subject)
- role: the job title if discernible, else "Check portal for role title"
- status: Active | Rejected | Interview | Offer | Role Closed
- source: LinkedIn | Indeed | Direct | Other
- appliedDate: copy the firstDate I give you, verbatim
- lastContactDate: copy the lastDate I give you, verbatim
- contactEmail: the sender's email address
- nextStep: a short next action

Status rules: Rejected = rejection email; Role Closed = position closed or withdrawn; Interview = interview scheduled or in progress; Offer = offer extended; Active = everything else (confirmations, "we received your application", recruiter outreach). Today: ${today}.

Threads:
${JSON.stringify(candidates, null, 2)}`;
}

function readJsonBody(req) {
  return new Promise(resolve => {
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", () => {
      if (!body) return resolve({});
      try { resolve(JSON.parse(body)); }
      catch { resolve({}); }
    });
  });
}

function classify(prompt) {
  return new Promise((resolve, reject) => {
    const tag = `[claude ${new Date().toLocaleTimeString()}]`;
    const t0  = Date.now();

    const env = { ...process.env };
    delete env.ANTHROPIC_API_KEY;
    delete env.ANTHROPIC_AUTH_TOKEN;

    // Haiku is plenty for classifying pre-fetched structured data, and far faster.
    // shell:true so the Windows `claude.cmd` shim resolves; single string avoids
    // Node DEP0190 and is safe because the tokens are hard-coded literals.
    const proc = spawn("claude -p --verbose --model haiku", { shell: true, env });
    let out = "", err = "";
    proc.stdout.on("data", d => { const s = d.toString(); out += s; process.stdout.write(`${tag} OUT ${s}`); });
    proc.stderr.on("data", d => { const s = d.toString(); err += s; process.stderr.write(`${tag} ERR ${s}`); });
    proc.stdin.write(prompt);
    proc.stdin.end();

    proc.on("error", e => reject(new Error(`spawn failed: ${e.message}`)));
    proc.on("close", code => {
      const ms = Date.now() - t0;
      console.log(`${tag} exit=${code} ${ms}ms stdout=${out.length}B stderr=${err.length}B`);
      if (code !== 0) {
        const detail = (err.trim() || out.trim() || "(no output)").slice(0, 2000);
        return reject(new Error(`claude exited ${code} after ${ms}ms\n\n${detail}`));
      }
      resolve(out);
    });
  });
}

function claudeApi() {
  return {
    name: "claude-api",
    configureServer(server) {
      server.middlewares.use("/api/refresh", async (req, res) => {
        if (req.method !== "POST") { res.statusCode = 405; res.end(); return; }
        res.setHeader("Content-Type", "application/json");

        try {
          const opts         = await readJsonBody(req);
          const lookbackDays = Math.max(1, Math.min(365, Number(opts.lookbackDays) || 35));
          const searchQuery  = String(opts.searchQuery || "");
          const knownIds     = Array.isArray(opts.knownIds) ? opts.knownIds : [];
          const ignored      = new Set(Array.isArray(opts.ignoredIds) ? opts.ignoredIds : []);

          const query = buildGmailQuery({ searchQuery, lookbackDays });
          const tag   = `[refresh ${new Date().toLocaleTimeString()}]`;
          console.log(`${tag} gmail query: ${query} (known=${knownIds.length} ignored=${ignored.size})`);

          const { candidates, truncated } = await searchCandidates({ query, knownIds });
          const kept = candidates.filter(c => !ignored.has(c.id));
          if (truncated) console.log(`${tag} hit page limit — some threads were not fetched`);
          console.log(`${tag} ${candidates.length} threads found, ${kept.length} after ignore`);

          if (kept.length === 0) { res.end(JSON.stringify({ text: "[]" })); return; }

          const today = new Date().toISOString().slice(0, 10);
          const text  = await classify(buildPrompt(today, kept));
          res.end(JSON.stringify({ text }));
        } catch (err) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: err.message }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), claudeApi()],
  server: { port: 5173, open: true },
});
