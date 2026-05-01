# Load MSVC environment via vcvarsall.bat
$vcvarsall = "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvarsall.bat"
cmd /c "`"$vcvarsall`" x64 && set" | ForEach-Object {
    if ($_ -match "^([^=]+)=(.*)$") {
        [System.Environment]::SetEnvironmentVariable($matches[1], $matches[2])
    }
}

# eBidz build script — Windows PowerShell
# Compiles the Solana program BPF binary directly with the sbpf toolchain,
# bypassing `anchor build` (which fails due to anchor-syn 0.32 needing nightly).
#
# Output: target/deploy/ebidz.so
#
# Usage:  powershell -NoProfile -ExecutionPolicy Bypass -File build.ps1

# Tell ring's C code not to include assert.h (safe — BPF builds always use NDEBUG)
$env:CFLAGS_sbpf_solana_solana = "-DRING_CORE_NOSTDLIBINC -DNDEBUG"

# Prepend Solana and Anchor to PATH
$env:PATH = "C:\Users\DELL\.local\share\solana\install\active_release\bin;C:\Users\DELL\.local\bin;" + $env:PATH

# Force any native host builds (e.g. proc-macro) to use the MSVC stable toolchain.
$env:RUSTUP_TOOLCHAIN = "stable-x86_64-pc-windows-msvc"

Set-Location "C:\Users\DELL\Documents\Dev\RTGs\ebidz\programs\ebidz"

Write-Host "Building BPF .so with sbpf-solana toolchain..."
cargo '+1.89.0-sbpf-solana-v1.52' build --target sbpf-solana-solana --release

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Build failed." -ForegroundColor Red
    exit 1
}

# Copy to the canonical anchor deploy path
$src  = "C:\Users\DELL\Documents\Dev\RTGs\ebidz\target\sbpf-solana-solana\release\ebidz.so"
$dest = "C:\Users\DELL\Documents\Dev\RTGs\ebidz\target\deploy\ebidz.so"
New-Item -ItemType Directory -Force -Path (Split-Path $dest) | Out-Null
Copy-Item $src $dest -Force

$size = (Get-Item $dest).Length
Write-Host "Built: $dest  ($size bytes)" -ForegroundColor Green
