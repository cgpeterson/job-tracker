# Job Tracker

A small local web app that tracks job applications by reading your Gmail through the [Claude Code CLI](https://docs.anthropic.com/claude-code).

Click **Refresh from Gmail** and Claude scans the last 35 days of mail, classifies each thread (Active / Interview / Offer / Rejected / Role Closed), and renders the results in a sortable, filterable table. Priority and notes you add are saved in your browser's `localStorage`.

## Setup

1. Install [Node.js 18+](https://nodejs.org).
2. Install the [Claude Code CLI](https://docs.anthropic.com/claude-code) and sign in so that running `claude` in a terminal works.
3. Make sure Claude has access to the Gmail MCP server (the app calls `claude -p --allowedTools mcp__gmail`).
4. Clone this repo and launch it:
   - **Windows:** double-click `run.ps1` (or run it from PowerShell)
   - **macOS / Linux:** `./run.sh`

The dev server starts on http://localhost:5173 and opens automatically.

## Files

```
job_tracker.jsx       main React component
components/JobRow.jsx one table row
theme.js              shared status/priority color maps
seed.json             example data shown before the first refresh
main.jsx              React entry point
styles.css            global styles + dark-mode variables
vite.config.js        Vite config + /api/refresh dev endpoint
run.ps1 / run.sh      install + launch helpers
```

## Privacy

Everything runs locally:

- Job data and your edits live in `localStorage` on your machine.
- The `/api/refresh` endpoint only exists on the dev server (localhost) and is reached only when you click Refresh.
- That endpoint spawns the Claude CLI, which talks to the Gmail MCP server using your own Google credentials.

No data leaves your machine except the requests Claude itself makes to Anthropic and Google on your behalf.
