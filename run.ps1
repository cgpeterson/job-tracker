Set-Location -Path $PSScriptRoot
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Cyan
    npm install
}
Write-Host "Starting dev server at http://localhost:5173" -ForegroundColor Green
npm run dev
