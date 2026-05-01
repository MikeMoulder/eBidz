$vcvarsall = "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvarsall.bat"
cmd /c "`"$vcvarsall`" x64 && set" | ForEach-Object {
    if ($_ -match "^([^=]+)=(.*)$") {
        [System.Environment]::SetEnvironmentVariable($matches[1], $matches[2])
    }
}
$env:PATH = "C:\Users\DELL\.local\share\solana\install\active_release\bin;C:\Users\DELL\.local\bin;" + $env:PATH
Set-Location "C:\Users\DELL\Documents\Dev\RTGs\ebidz\programs\ebidz"
Write-Host "Toolchain: $(rustup show active-toolchain)"
Write-Host "Cargo: $((Get-Command cargo).Source)"
Write-Host "Link: $((Get-Command link.exe -ErrorAction SilentlyContinue).Source)"
cargo build --features idl-build 2>&1 | Select-Object -Last 30
