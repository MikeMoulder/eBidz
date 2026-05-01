$base = "C:\Users\DELL\.cargo\registry\src\index.crates.io-1949cf8c6b5b557f"
$dir = Get-ChildItem $base -Filter "arcis-interface*" | Select-Object -First 1 -ExpandProperty FullName
Write-Host "arcis-interface dir: $dir"
Get-ChildItem $dir -Recurse | Where-Object { -not $_.PSIsContainer } | ForEach-Object { $_.FullName }
