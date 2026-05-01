$vcvarsall = "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvarsall.bat"
cmd /c "`"$vcvarsall`" x64 && set" | ForEach-Object {
    if ($_ -match "^([^=]+)=(.*)$") {
        [System.Environment]::SetEnvironmentVariable($matches[1], $matches[2])
    }
}
$env:CFLAGS_sbpf_solana_solana = "-DRING_CORE_NOSTDLIBINC -DNDEBUG"
$env:PATH = "C:\Users\DELL\.local\share\solana\install\active_release\bin;C:\Users\DELL\.local\bin;" + $env:PATH
Set-Location "C:\Users\DELL\Documents\Dev\RTGs\ebidz"
Write-Host "=== Running anchor idl build ==="
Write-Host "link.exe: $((Get-Command link.exe -ErrorAction SilentlyContinue).Source)"
& "C:\Users\DELL\.local\bin\anchor.exe" idl build -p ebidz -o target/idl/ebidz.json --out-ts target/types/ebidz.ts 2>&1 | Select-Object -Last 30
