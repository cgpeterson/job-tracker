import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { spawn } from "node:child_process";

function buildPrompt(today, lookbackDays, gmailQuery) {
  const filter = gmailQuery ? ` matching the Gmail search "${gmailQuery}"` : "";
  return `Search Gmail for job application emails from the last ${lookbackDays} days${filter}. Return ONLY a JSON array — no markdown fences, no preamble, no trailing text. Each object must have exactly these keys: id (Gmail thread ID of the most recent email for this application), company, role, status (Active|Rejected|Interview|Offer|Role Closed), source (LinkedIn|Indeed|Direct|Other), appliedDate (YYYY-MM-DD), lastContactDate (YYYY-MM-DD), contactEmail, nextStep. Status rules: Rejected = rejection email received; Role Closed = position closed; Interview = interview scheduled or in-progress; Offer = offer extended; Active = everything else. Today: ${today}.`;
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

function claudeApi() {
  return {
    name: "claude-api",
    configureServer(server) {
      server.middlewares.use("/api/refresh", async (req, res) => {
        if (req.method !== "POST") { res.statusCode = 405; res.end(); return; }

        const opts         = await readJsonBody(req);
        const lookbackDays = Math.max(1, Math.min(365, Number(opts.lookbackDays) || 35));
        const gmailQuery   = String(opts.gmailQuery || "").trim();
        const today        = new Date().toISOString().slice(0, 10);
        const prompt       = buildPrompt(today, lookbackDays, gmailQuery);

        const tag = `[claude ${new Date().toLocaleTimeString()}]`;
        const t0  = Date.now();
        console.log(`${tag} spawning. lookback=${lookbackDays}d query="${gmailQuery}" prompt=${prompt.length}B`);

        const env = { ...process.env };
        delete env.ANTHROPIC_API_KEY;
        delete env.ANTHROPIC_AUTH_TOKEN;

        const proc = spawn(
          "claude",
          ["-p", "--verbose", "--allowedTools", "mcp__gmail"],
          { shell: true, env }
        );

        let out = "", err = "";
        proc.stdout.on("data", d => { const s = d.toString(); out += s; process.stdout.write(`${tag} OUT ${s}`); });
        proc.stderr.on("data", d => { const s = d.toString(); err += s; process.stderr.write(`${tag} ERR ${s}`); });
        proc.stdin.write(prompt);
        proc.stdin.end();

        proc.on("error", e => {
          console.error(`${tag} spawn error:`, e);
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: `spawn failed: ${e.message}` }));
        });

        proc.on("close", code => {
          const ms = Date.now() - t0;
          console.log(`${tag} exit=${code} ${ms}ms stdout=${out.length}B stderr=${err.length}B`);
          res.setHeader("Content-Type", "application/json");
          if (code !== 0) {
            res.statusCode = 500;
            const detail = (err.trim() || out.trim() || "(no output)").slice(0, 2000);
            res.end(JSON.stringify({ error: `claude exited ${code} after ${ms}ms\n\n${detail}` }));
            return;
          }
          res.end(JSON.stringify({ text: out }));
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), claudeApi()],
  server: { port: 5173, open: true },
});
