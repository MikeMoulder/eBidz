# eBidz deploy script — Windows PowerShell
#
# Steps:
#   1. Build BPF .so (calls build.ps1)
#   2. Deploy/upgrade to devnet
#
# Prerequisites:
#   - Wallet funded with ~4 SOL:  go to https://faucet.solana.com
#     Wallet pubkey: 4JW4NsS6SQEhfw5S8qwQ6gwR8aeBFhh95wbq8nQem5s6
#   - Solana CLI installed (C:\Users\DELL\.local\share\solana\install\active_release\bin)
#
# Usage:  powershell -NoProfile -ExecutionPolicy Bypass -File scripts\deploy.ps1

$ErrorActionPreference = "Stop"

$SolanaPath = "C:\Users\DELL\.local\share\solana\install\active_release\bin"
$env:PATH = "$SolanaPath;" + $env:PATH

$ProjectRoot = "C:\Users\DELL\Documents\Dev\RTGs\ebidz"
$SoPath      = "$ProjectRoot\target\deploy\ebidz.so"
$KeypairPath = "$ProjectRoot\target\deploy\ebidz-keypair.json"
$ProgramId   = "4U9HFuutY2KJdrw3AFsQhf3Kvp6BvVjaGBmDB1bQAGBU"

# ── 1. Build ──────────────────────────────────────────────────────────────────
Write-Host "=== Step 1: Build ===" -ForegroundColor Cyan
& powershell -NoProfile -ExecutionPolicy Bypass -File "$ProjectRoot\build.ps1"
if ($LASTEXITCODE -ne 0) { exit 1 }

# ── 2. Check balance ─────────────────────────────────────────────────────────
Write-Host "`n=== Step 2: Check Balance ===" -ForegroundColor Cyan
$bal = (solana balance --url devnet 2>&1) -replace "[^0-9\.]", ""
Write-Host "Current balance: $bal SOL"
if ([float]$bal -lt 3.0) {
    Write-Host ""
    Write-Host "ERROR: Need at least 3 SOL for deployment." -ForegroundColor Red
    Write-Host "Fund via web faucet: https://faucet.solana.com" -ForegroundColor Yellow
    Write-Host "Wallet pubkey: 4JW4NsS6SQEhfw5S8qwQ6gwR8aeBFhh95wbq8nQem5s6" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Or try Helius devnet faucet (requires free account):" -ForegroundColor Yellow
    Write-Host "  https://faucet.helius.dev" -ForegroundColor Yellow
    exit 1
}

# ── 3. Deploy ─────────────────────────────────────────────────────────────────
Write-Host "`n=== Step 3: Deploy ===" -ForegroundColor Cyan
Write-Host "Program ID: $ProgramId"

# Check if already deployed (upgrade) or fresh deploy
$existing = solana program show $ProgramId --url devnet 2>&1
if ($existing -match "Program Id") {
    Write-Host "Upgrading existing program..."
    solana program deploy $SoPath `
        --program-id $KeypairPath `
        --url devnet
} else {
    Write-Host "Fresh deploy..."
    solana program deploy $SoPath `
        --program-id $KeypairPath `
        --url devnet
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Deploy failed." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=== Deploy Complete ===" -ForegroundColor Green
Write-Host "Program: $ProgramId" -ForegroundColor Green
Write-Host ""
Write-Host "Next — init computation definitions:" -ForegroundColor Cyan
Write-Host "  1. Set CIRCUIT_STORAGE_BASE_URL in app/.env.local"
Write-Host "  2. cd $ProjectRoot"
Write-Host "  3. node scripts/init-comp-def.mjs"
