$env:PATH = "C:\Users\DELL\.local\share\solana\install\active_release\bin;C:\Users\DELL\.local\bin;" + $env:PATH
Set-Location "C:\Users\DELL\Documents\Dev\RTGs\ebidz"
cargo tree -p ebidz -i qstring 2>&1
