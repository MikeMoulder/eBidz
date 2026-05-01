$base = "C:\Users\DELL\.cargo\registry\src\index.crates.io-1949cf8c6b5b557f\arcium-macros-0.9.7"
Get-ChildItem $base -Recurse | Where-Object { -not $_.PSIsContainer } | ForEach-Object { $_.FullName }
