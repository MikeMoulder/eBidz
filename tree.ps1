$env:PATH = "C:\Users\DELL\.local\share\solana\install\active_release\bin;C:\Users\DELL\.local\bin;" + $env:PATH
Set-Location "C:\Users\DELL\Documents\Dev\RTGs\ebidz"
cargo tree -p ebidz --target sbpf-solana-solana 2>&1 | Select-String -Pattern "ring|getrandom" | Select-Object -First 30
