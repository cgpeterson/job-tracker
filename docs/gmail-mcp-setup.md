# Gmail MCP setup

Google requires you to create an OAuth client under your own account before any Gmail-reading app (including this one) can hit your inbox. The setup wizard pauses while you do this — about 10 minutes the first time.

## 1. Open the Cloud Console

<https://console.cloud.google.com/>. Sign in with the Google account whose Gmail you want to read.

## 2. Pick or create a project

Top-left project picker → pick one you own or click *New project* and name it anything.

## 3. Enable the Gmail API

Top search bar → "Gmail API" → *Enable*.

## 4. OAuth consent screen

*APIs & Services → OAuth consent screen.*

- **User type:** External
- **App info:** any name, your email for support and developer contact
- **Scopes:** add `.../auth/gmail.readonly`
- **Test users:** add your own Gmail address

Test mode is fine — you don't need to publish or verify the app for personal use.

## 5. Create the OAuth client

*Credentials → Create credentials → OAuth client ID.*

- **Application type:** **Desktop app** (not Web)
- **Name:** anything
- Click *Create*, then *Download JSON* on the popup.

## 6. Hand the file to the wizard

Back in the terminal, press Enter — a file picker opens. Select the JSON you downloaded. The wizard validates it, copies it to `~/.gmail-mcp/gcp-oauth.keys.json` (locked to your user), runs the MCP server's auth flow (one more browser tab), and registers the server with Claude.

## Manual fallback

If any wizard command fails, the same steps by hand:

```sh
mkdir -p ~/.gmail-mcp
mv ~/Downloads/client_secret_*.json ~/.gmail-mcp/gcp-oauth.keys.json
chmod 600 ~/.gmail-mcp/gcp-oauth.keys.json
npx -y @gongrzhe/server-gmail-autoauth-mcp auth
claude mcp add gmail -- npx -y @gongrzhe/server-gmail-autoauth-mcp
claude mcp list   # should show "gmail"
```

## Notes

- `@gongrzhe/server-gmail-autoauth-mcp` was archived March 2026. It still works; swap in any maintained alternative — the app only cares that *some* server named `gmail` is in `claude mcp list`.
- `client_secret` in OAuth JSONs for desktop apps is not actually secret per Google's docs.
