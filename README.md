# Job Tracker

[![CI](https://github.com/cgpeterson/job-tracker/actions/workflows/ci.yml/badge.svg)](https://github.com/cgpeterson/job-tracker/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A local web app that pulls job-application emails from Gmail, has Claude classify each one as *Active / Interview / Offer / Rejected / Role Closed*, and renders them in a sortable, filterable table. Notes and priority overrides you add persist across refreshes.

<!-- TODO: add screenshot at docs/screenshot.png -->

The interesting bit isn't the React UI, it's letting Claude do the classification instead of writing per-sender regex. Adding a new ATS, a new email vendor, or a new status takes a prompt edit in `vite.config.js`, not new code.

```
Browser → /api/refresh → spawn `claude -p` → Gmail MCP → Gmail API
```

A gear icon opens settings for the lookback window, an optional Gmail search filter, silent-day thresholds and colors, the source list, auto-refresh on open, and JSON export/import.

## Setup

First time on a machine:

```sh
git clone https://github.com/cgpeterson/job-tracker
cd job-tracker
./setup.ps1     # Windows
./setup.sh      # macOS / Linux
```

The wizard installs Node and the Claude CLI if missing, then walks through creating a Google OAuth client (the one step Google requires you to do by hand). See [`docs/gmail-mcp-setup.md`](docs/gmail-mcp-setup.md) for what to click.

After that, `./run.ps1` or `./run.sh` starts the dev server at <http://localhost:5173>.

## Notes

- Jobs, edits, and settings live in `localStorage`. The settings panel exports/imports the whole state as JSON for backup.
- Classification is non-deterministic — the same email can flip status between refreshes if the model is on the edge. Manual notes and priority persist; the classified fields don't.
- Depends on the Claude CLI being installed and authenticated. Without it, the Refresh button surfaces an error banner.

## License

MIT — see [LICENSE](LICENSE).
