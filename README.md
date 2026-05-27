# Job Tracker

[![CI](https://github.com/cgpeterson/job-tracker/actions/workflows/ci.yml/badge.svg)](https://github.com/cgpeterson/job-tracker/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A small local web app that classifies job application emails from your Gmail using the [Claude Code CLI](https://docs.anthropic.com/claude-code) and renders them in a sortable, filterable table.

Click **Refresh from Gmail** → Claude reads your recent email (35 days by default — configurable), decides whether each thread is *Active / Interview / Offer / Rejected / Role Closed*, and returns a JSON array the UI persists to `localStorage`. A gear icon opens a settings panel for the lookback window, an optional Gmail search filter, silent-day thresholds and colors, the source list, auto-refresh on open, and export/import/reset.

> Add a screenshot at `docs/screenshot.png` after first launch and uncomment the line below.
> <!-- ![Job Tracker UI](docs/screenshot.png) -->

## How it works

```
┌──────────┐  click Refresh  ┌─────────────────┐    spawn    ┌────────────┐
│ Browser  │  ────────────▶ │ Vite dev server │ ──────────▶ │ claude -p  │
│ (React)  │                 │  /api/refresh   │  (stdin)    │ + MCP      │
│          │ ◀────────────  │                 │ ◀────────── │   gmail    │
└──────────┘  JSON of jobs   └─────────────────┘   stdout    └────────────┘
                                                                    │
                                                                    ▼
                                                          ┌────────────────┐
                                                          │ Your Gmail API │
                                                          └────────────────┘
```

The interesting part isn't the React UI — it's using an **LLM as the classifier**. There is no regex, no per-sender heuristic, no ATS-specific parsing. The prompt in `vite.config.js` describes the schema and the rules; Claude does the rest. Adding a new ATS, a new email vendor, or a new status takes a prompt edit, not new code.

## Setup

Prerequisites (all developer-tier; this is not a normie tool):

1. [Node.js 18+](https://nodejs.org)
2. [Claude Code CLI](https://docs.anthropic.com/claude-code) — signed in (`claude` runs in your terminal)
3. Gmail MCP server configured for Claude (so `--allowedTools mcp__gmail` resolves)

Then:

```sh
git clone https://github.com/cgpeterson/job-tracker
cd job-tracker
./run.sh        # macOS / Linux
# or
./run.ps1       # Windows
```

The dev server opens at <http://localhost:5173>.

## Files

```
job_tracker.jsx              main component (state, filters, sort, persistence)
components/JobRow.jsx        one table row
components/SettingsModal.jsx settings panel behind the gear icon
lib.js                       pure helpers (parseJobsResponse, daysSince)
lib.test.js                  unit tests for the above
theme.js                     status + priority color maps
settings.js                  default settings shape
seed.json                    placeholder rows shown before first refresh
main.jsx                     React entry
styles.css                   theme variables + global element styles
vite.config.js               Vite + the /api/refresh dev endpoint
.github/workflows/           CI: build + test on push/PR
```

## Design tradeoffs

These are the choices a reviewer should know about, and what would have to change to undo them:

**`localStorage` instead of a backend.** The app is single-user and runs on your machine. A backend would force me to handle auth, multi-tenancy, and Gmail OAuth for users that aren't me — none of which the use case justifies. Going multi-user means: real DB, an auth provider, server-side Gmail OAuth, and rate limiting on `/api/refresh`.

**Spawn the Claude CLI instead of calling the Anthropic API directly.** The CLI already has Gmail MCP wired up and an authenticated session. Calling the API directly would mean re-implementing the MCP client, managing my own API key, and handling Gmail OAuth myself. The cost is process-spawn latency (~1–3s overhead per refresh) and a hard dependency on the CLI being on PATH. Worth it for a personal tool; not worth it for anything multi-user.

**LLM as classifier, no rules engine.** Trading determinism for flexibility. The same Claude call could miscategorize an email today and get it right tomorrow if I tweak the prompt. The mitigation is that the UI lets me override status manually (via the priority/notes edits, plus an obvious next step would be a status dropdown per row). For high-stakes categorization you'd want a rules layer in front; for personal job tracking, "mostly right" is fine.

**Inline styles instead of a CSS framework.** ~350 lines doesn't earn Tailwind's build complexity. The `--color-*` variables in `styles.css` give me dark mode for free via `prefers-color-scheme`. Cost: row styling lives in markup, which is harder to skim — mitigated by extracting `JobRow` to its own file.

**No TypeScript.** The app is small enough that JSDoc on the two exported `lib.js` functions would catch as much as types would. TypeScript would add a build step, a tsconfig, and friction for any future contributor — not earned at this size.

## Limitations

- **Single user, localhost only.** No auth on `/api/refresh`. Fine because Vite binds to localhost; broken the moment you expose the port.
- **Hard dependency on the Claude CLI.** If `claude` isn't on PATH or isn't authenticated, Refresh fails with a server-error banner.
- **No retry / no rate limiting.** A held-down Refresh button will spawn N concurrent CLI processes.
- **Classification is non-deterministic.** Same email can flip status across refreshes if the model is on the edge. Manual notes/priority persist across refreshes; classified fields do not.

## Development

```sh
npm install
npm run dev      # dev server on :5173
npm test         # vitest
npm run build    # production bundle
```

## License

MIT — see [LICENSE](LICENSE).
