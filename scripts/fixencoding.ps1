# Reverse UTF-8 read-as-ANSI mojibake in src/**/*.tsx and strip BOMs.
$files = Get-ChildItem -Path "C:\Users\hacka\OneDrive\Documents\GitHub\Crypton\src" -Recurse -Include *.tsx,*.ts | Where-Object { $_.FullName -notmatch 'node_modules' }
$strictUtf8 = New-Object System.Text.UTF8Encoding($false, $true)
$ansi = [System.Text.Encoding]::GetEncoding(1252, [System.Text.EncoderFallback]::ExceptionFallback, [System.Text.DecoderFallback]::ReplacementFallback)
$count = 0
foreach ($f in $files) {
  $bytes = [System.IO.File]::ReadAllBytes($f.FullName)
  if ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) {
    $bytes = $bytes[3..($bytes.Length-1)]
    $hadBom = $true
  } else {
    $hadBom = $false
  }
  $s = [System.Text.Encoding]::UTF8.GetString($bytes)
  $bytes2 = $null
  try { $bytes2 = $ansi.GetBytes($s) } catch { }
  if ($bytes2 -eq $null) { continue }
  try { $recovered = $strictUtf8.GetString($bytes2) } catch { continue }
  if ($recovered -ne $s -or $hadBom) {
    $out = [System.Text.Encoding]::UTF8.GetBytes($recovered)
    [System.IO.File]::WriteAllBytes($f.FullName, $out)
    Write-Host "recovered: $($f.Name)"
    $count++
  }
}
Write-Host "--- $count files recovered ---"
