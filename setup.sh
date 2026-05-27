#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

step() { echo; echo "=== Step $1: $2 ==="; }
have() { command -v "$1" >/dev/null 2>&1; }

open_url() {
    case "$(uname)" in
        Darwin) open "$1" ;;
        Linux)  xdg-open "$1" >/dev/null 2>&1 || echo "Open in your browser: $1" ;;
        *)      echo "Open in your browser: $1" ;;
    esac
}

pick_json() {
    local prompt="$1"
    case "$(uname)" in
        Darwin)
            osascript -e "POSIX path of (choose file with prompt \"$prompt\" of type {\"json\"})" 2>/dev/null
            ;;
        Linux)
            if have zenity; then
                zenity --file-selection --title="$prompt" --file-filter='*.json' 2>/dev/null
            else
                read -rp "Path to credentials.json: " p < /dev/tty
                echo "$p"
            fi
            ;;
    esac
}

validate_oauth() {
    node -e "
        const o = JSON.parse(require('fs').readFileSync(process.argv[1], 'utf8'));
        const c = o.installed || o.web;
        if (!c || !c.client_id || !c.client_secret) process.exit(1);
    " "$1" 2>/dev/null
}

# --- 1. Node ---
step 1 "Check Node.js"
if have node; then
    major=$(node --version | sed 's/^v//' | cut -d. -f1)
    if [ "$major" -lt 18 ]; then
        echo "Found Node $major; need 18 or newer."
        open_url https://nodejs.org
        read -rp "Install a newer Node, then press Enter " < /dev/tty
    else
        echo "Node $(node --version) OK"
    fi
else
    echo "Node not found."
    open_url https://nodejs.org
    read -rp "Install Node (LTS), then press Enter " < /dev/tty
    have node || { echo "Node still missing; open a new shell and re-run."; exit 1; }
fi

# --- 2. Claude Code CLI ---
step 2 "Claude Code CLI"
if have claude; then
    echo "claude already installed"
else
    echo "Installing @anthropic-ai/claude-code globally..."
    npm install -g @anthropic-ai/claude-code
    have claude || { echo "claude install completed but command not on PATH."; exit 1; }
fi

# --- 3. Auth ---
step 3 "Claude authentication"
echo "If this is your first time using Claude Code, log in by running 'claude' in a"
echo "separate terminal once, then come back here and continue."
read -rp "Press Enter when 'claude' works for you " < /dev/tty

# --- 4. Gmail MCP ---
step 4 "Gmail MCP"
if claude mcp list 2>&1 | grep -qi '^[[:space:]]*gmail\b'; then
    echo "Gmail MCP already registered with Claude"
else
    echo "This step needs a Google OAuth credentials file. Opening the walkthrough"
    echo "and the Google Cloud Console..."
    open_url "$(pwd)/docs/gmail-mcp-setup.md"
    open_url https://console.cloud.google.com/apis/credentials
    read -rp "When credentials.json is downloaded, press Enter to select the file " < /dev/tty

    cred=$(pick_json "Select your downloaded Google OAuth credentials JSON")
    [ -z "$cred" ] && { echo "No file selected. Re-run setup.sh when ready."; exit 1; }
    validate_oauth "$cred" || { echo "Not a valid OAuth credentials JSON: $cred"; exit 1; }

    dest="$HOME/.gmail-mcp"
    mkdir -p "$dest"
    cp "$cred" "$dest/gcp-oauth.keys.json"
    chmod 600 "$dest/gcp-oauth.keys.json"
    echo "Saved credentials to $dest/gcp-oauth.keys.json"

    echo ""
    echo "Running Gmail MCP auth -- a browser tab will open for Google's consent screen."
    npx -y @gongrzhe/server-gmail-autoauth-mcp auth

    echo "Registering Gmail MCP with Claude..."
    claude mcp add gmail -- npx -y @gongrzhe/server-gmail-autoauth-mcp

    if ! claude mcp list 2>&1 | grep -qi '^[[:space:]]*gmail\b'; then
        echo "Gmail MCP did not register; check the output above."
        exit 1
    fi
    echo "Gmail MCP ready"
fi

# --- 5. App deps ---
step 5 "App dependencies"
if [ -d node_modules ]; then
    echo "node_modules already present"
else
    npm install
fi

# --- 6. Launch ---
step 6 "Launch"
echo "Setup complete. The dev server runs at http://localhost:5173"
read -rp "Launch it now? [Y/n] " go < /dev/tty
if [ "$go" != "n" ] && [ "$go" != "N" ]; then
    npm run dev
else
    echo "Run './run.sh' or 'npm run dev' when ready."
fi
