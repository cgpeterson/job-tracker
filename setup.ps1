#Requires -Version 5.1
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

function Write-Step($n, $text) {
    Write-Host ""
    Write-Host "=== Step $n: $text ===" -ForegroundColor Cyan
}

function Has-Command($name) {
    $null = Get-Command $name -ErrorAction SilentlyContinue
    return $?
}

function Pick-JsonFile($title) {
    Add-Type -AssemblyName System.Windows.Forms | Out-Null
    $dlg = New-Object System.Windows.Forms.OpenFileDialog
    $dlg.Title = $title
    $dlg.Filter = 'JSON files (*.json)|*.json'
    $dlg.InitialDirectory = Join-Path $env:USERPROFILE 'Downloads'
    if ($dlg.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
        return $dlg.FileName
    }
    return $null
}

function Test-OAuthJson($path) {
    try {
        $j = Get-Content $path -Raw | ConvertFrom-Json
        $core = if ($j.installed) { $j.installed } else { $j.web }
        return [bool]($core -and $core.client_id -and $core.client_secret)
    } catch {
        return $false
    }
}

# --- 1. Node ---
Write-Step 1 "Check Node.js"
if (Has-Command 'node') {
    $major = [int]((node --version).TrimStart('v').Split('.')[0])
    if ($major -lt 18) {
        Write-Host "Found Node $major; need 18 or newer." -ForegroundColor Yellow
        Start-Process 'https://nodejs.org'
        Read-Host "Install a newer Node (LTS is fine), then press Enter"
        if (-not (Has-Command 'node')) { throw "Node still missing; open a new PowerShell and re-run." }
    } else {
        Write-Host "Node $(node --version) OK"
    }
} else {
    Write-Host "Node not found." -ForegroundColor Yellow
    Start-Process 'https://nodejs.org'
    Read-Host "Install Node (LTS), then press Enter"
    if (-not (Has-Command 'node')) { throw "Node still missing; open a new PowerShell window and re-run." }
}

# --- 2. Claude Code CLI ---
Write-Step 2 "Claude Code CLI"
if (Has-Command 'claude') {
    Write-Host "claude already installed"
} else {
    Write-Host "Installing @anthropic-ai/claude-code globally..."
    npm install -g @anthropic-ai/claude-code
    if (-not (Has-Command 'claude')) { throw "claude install completed but command still not on PATH." }
}

# --- 3. Auth ---
Write-Step 3 "Claude authentication"
Write-Host "If this is your first time using Claude Code, log in by running 'claude' in a"
Write-Host "separate PowerShell window once, then come back here and continue."
Read-Host "Press Enter when 'claude' works for you"

# --- 4. Gmail MCP ---
Write-Step 4 "Gmail MCP"
$mcps = (& claude mcp list 2>&1) -join "`n"
if ($mcps -match '(?im)^\s*gmail\b') {
    Write-Host "Gmail MCP already registered with Claude"
} else {
    Write-Host "This step needs a Google OAuth credentials file. Opening the walkthrough"
    Write-Host "and the Google Cloud Console..."
    Start-Process (Join-Path $PSScriptRoot 'docs\gmail-mcp-setup.md')
    Start-Process 'https://console.cloud.google.com/apis/credentials'
    Read-Host "When credentials.json is downloaded, press Enter to select the file"

    $cred = Pick-JsonFile 'Select your downloaded Google OAuth credentials JSON'
    if (-not $cred) { throw "No file selected. Re-run setup.ps1 when ready." }
    if (-not (Test-OAuthJson $cred)) {
        throw "That file isn't a Google OAuth credentials JSON (missing client_id/client_secret): $cred"
    }

    $dest = Join-Path $env:USERPROFILE '.gmail-mcp'
    New-Item -ItemType Directory -Force -Path $dest | Out-Null
    Copy-Item $cred (Join-Path $dest 'gcp-oauth.keys.json') -Force
    Write-Host "Saved credentials to $dest\gcp-oauth.keys.json"

    Write-Host ""
    Write-Host "Running Gmail MCP auth -- a browser tab will open for Google's consent screen."
    npx -y '@gongrzhe/server-gmail-autoauth-mcp' auth

    Write-Host "Registering Gmail MCP with Claude..."
    & claude mcp add gmail -- npx -y '@gongrzhe/server-gmail-autoauth-mcp'

    $mcps = (& claude mcp list 2>&1) -join "`n"
    if ($mcps -notmatch '(?im)^\s*gmail\b') {
        throw "Gmail MCP did not register. Last 'claude mcp list' output:`n$mcps"
    }
    Write-Host "Gmail MCP ready"
}

# --- 5. App deps ---
Write-Step 5 "App dependencies"
if (Test-Path 'node_modules') {
    Write-Host "node_modules already present"
} else {
    npm install
}

# --- 6. Launch ---
Write-Step 6 "Launch"
Write-Host "Setup complete. The dev server runs at http://localhost:5173"
$go = Read-Host "Launch it now? [Y/n]"
if ($go -ne 'n' -and $go -ne 'N') {
    npm run dev
} else {
    Write-Host "Run './run.ps1' or 'npm run dev' when ready."
}
