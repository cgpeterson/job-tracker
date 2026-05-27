# Gmail MCP setup

This is the one step the setup wizard cannot fully automate: creating a Google OAuth client so Claude is allowed to read your Gmail. Google requires you to do this in their console with your own account — there is no way around it without us shipping shared credentials, which would be a security and TOS problem.

The wizard handles everything before and after this step. You only need to do the clicks below, download one JSON file, and select it when the wizard prompts you.

## What you'll do

1. Create (or pick) a Google Cloud project
2. Enable the Gmail API on that project
3. Configure an OAuth consent screen
4. Create an OAuth client of type "Desktop app" and download its JSON
5. Hand that JSON to the wizard

Allow about 10 minutes the first time.

## Step-by-step

### 1. Open the Cloud Console

Go to <https://console.cloud.google.com/>. Sign in with the Google account whose Gmail you want this app to read.

### 2. Create or select a project

Top-left, next to "Google Cloud," click the project picker. Either:

- **New project:** click *New project*, give it any name (e.g. `job-tracker`), click *Create*. Wait a few seconds, then select it from the picker.
- **Existing project:** pick one you already own.

### 3. Enable the Gmail API

In the search bar at the top, type "Gmail API" and pick the result under *Marketplace*. Click **Enable**. Wait for the green check.

### 4. Configure the OAuth consent screen

Left sidebar → *APIs & Services* → *OAuth consent screen*.

- **User type:** External (unless you're on a Google Workspace and want Internal — fine either way for personal use).
- **App information:** App name `Job Tracker`, support email = your email, developer email = your email. Skip everything else.
- **Scopes:** click *Add or remove scopes*, search `gmail`, tick `.../auth/gmail.readonly` (and `.../auth/gmail.modify` if you want the MCP server to label or archive — read-only is enough for this app).
- **Test users:** click *Add users*, enter your own Gmail address. Save.

(You don't need to publish the app or submit for verification. Test mode is fine for personal use; tokens just expire every 7 days, which the MCP server refreshes automatically.)

### 5. Create the OAuth client

Left sidebar → *APIs & Services* → *Credentials* → *Create Credentials* → *OAuth client ID*.

- **Application type:** **Desktop app** (important — not Web application)
- **Name:** anything, e.g. `Job Tracker Desktop`
- Click *Create*

A modal appears with your new client. Click **Download JSON**. The file lands in your Downloads folder, usually named something like `client_secret_XXXXXXXX.json`.

### 6. Hand it to the wizard

Switch back to the terminal where `setup.ps1` / `setup.sh` is waiting. Press Enter — a file picker opens. Select the JSON file you just downloaded.

The wizard:

1. Validates the file actually has `client_id` and `client_secret`
2. Copies it to `~/.gmail-mcp/gcp-oauth.keys.json` (the location the MCP server expects)
3. Runs `npx @gongrzhe/server-gmail-autoauth-mcp auth`, which opens a browser tab on Google's consent screen — click through to grant access; tokens are saved to `~/.gmail-mcp/`
4. Registers the server with Claude via `claude mcp add gmail -- npx @gongrzhe/server-gmail-autoauth-mcp`
5. Verifies with `claude mcp list`

After that, the wizard finishes the rest (npm install, optionally launch the dev server) on its own.

## Manual fallback

If anything in the automated section fails, you can run the same commands by hand:

```sh
mkdir -p ~/.gmail-mcp
mv ~/Downloads/client_secret_*.json ~/.gmail-mcp/gcp-oauth.keys.json
npx -y @gongrzhe/server-gmail-autoauth-mcp auth
claude mcp add gmail -- npx -y @gongrzhe/server-gmail-autoauth-mcp
claude mcp list   # should show "gmail"
```

On Windows PowerShell, the first two lines become:

```powershell
New-Item -ItemType Directory -Force "$env:USERPROFILE\.gmail-mcp" | Out-Null
Move-Item "$env:USERPROFILE\Downloads\client_secret_*.json" "$env:USERPROFILE\.gmail-mcp\gcp-oauth.keys.json"
```

## Notes

- **The MCP server used here (`@gongrzhe/server-gmail-autoauth-mcp`) was archived by its author in March 2026.** It still works, but if you'd rather use a maintained alternative, swap it out — the wizard only cares that *some* MCP server named `gmail` appears in `claude mcp list`. The `--allowedTools mcp__gmail` flag in `vite.config.js` will route requests to whichever one is registered.
- The `client_secret` in this file is **not actually a secret** for desktop apps — Google's docs explicitly say so. Don't paste it into a public gist, but don't lose sleep if it ends up in a local config you back up.
- Tokens live in `~/.gmail-mcp/` and are refreshed automatically by the MCP server when they expire.
