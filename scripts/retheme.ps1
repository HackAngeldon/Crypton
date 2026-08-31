# One-time retheme remap: Trust-like neutral tokens across src/**/*.tsx
$root = "C:\Users\hacka\OneDrive\Documents\GitHub\Crypton\src"
$files = Get-ChildItem -Path $root -Recurse -Filter *.tsx

$map = [ordered]@{
  'bg-ink-card' = 'bg-surface'
  'bg-ink-soft' = 'bg-elevate'
  'bg-ink-raise' = 'bg-elevate'
  'bg-ink/90' = 'bg-canvas/90'
  'bg-ink/85' = 'bg-canvas/85'
  'bg-ink/60' = 'bg-canvas/60'
  'from-ink-card' = 'from-surface'
  'to-ink-soft' = 'to-elevate'
  'from-ink' = 'from-canvas'
  'to-ink' = 'to-canvas'
  'bg-ink' = 'bg-canvas'
  'border-ink-line' = 'border-hairline'
  'text-ink' = 'text-white'
  'text-slate-50' = 'text-content'
  'text-slate-100' = 'text-content'
  'text-slate-200' = 'text-content'
  'text-slate-300' = 'text-content-mute'
  'text-slate-400' = 'text-content-mute'
  'text-slate-500' = 'text-content-faint'
  'text-slate-600' = 'text-content-faint'
  'placeholder:text-slate-600' = 'placeholder:text-content-faint'
  'bg-white/[0.04]' = 'bg-fill/5'
  'bg-white/[0.05]' = 'bg-fill/5'
  'bg-white/[0.06]' = 'bg-fill/8'
  'bg-white/[0.08]' = 'bg-fill/10'
  'bg-white/[0.10]' = 'bg-fill/10'
  'bg-white/[0.12]' = 'bg-fill/12'
  'bg-white/[0.15]' = 'bg-fill/15'
  'bg-white/[0.2]' = 'bg-fill/20'
  'bg-white/10' = 'bg-fill/10'
  'bg-white/15' = 'bg-fill/15'
  'border-white/10' = 'border-hairlinestrong'
  'border-white/15' = 'border-hairlinestrong'
  'border-white/8' = 'border-hairlinestrong'
  'border-white/[0.05]' = 'border-hairline'
  'border-white/[0.04]' = 'border-hairline'
  'border-white/[0.06]' = 'border-hairline'
  'border-white/[0.07]' = 'border-hairline'
  'divide-white/[0.04]' = 'divide-hairline'
  'divide-white/[0.05]' = 'divide-hairline'
  'divide-white/[0.06]' = 'divide-hairline'
  'divide-white/[0.07]' = 'divide-hairline'
  'bg-black/70' = 'bg-overlay/60'
  'bg-black/60' = 'bg-overlay/50'
  'plasma-violet' = 'brand'
  'plasma-cyan' = 'brand'
  'fid-gold' = 'warn'
  'shadow-glow' = 'shadow-card'
  'animate-pulse-dot' = 'animate-pulse-soft'
  'animate-aurora' = 'animate-pulse-soft'
  'from-violet-500 to-fuchsia-500' = 'bg-brand'
  'from-cyan-400 to-violet-500' = 'bg-brand'
  'bg-gradient-to-br from-cyan-400 to-violet-500' = 'bg-brand'
}

$count = 0
foreach ($f in $files) {
  $content = Get-Content -Raw -LiteralPath $f.FullName
  $orig = $content
  foreach ($k in $map.Keys) {
    $content = $content.Replace($k, $map[$k])
  }
  if ($content -ne $orig) {
    Set-Content -LiteralPath $f.FullName -Value $content -Encoding utf8 -NoNewline
    $count++
    Write-Host "updated: $($f.Name)"
  }
}
Write-Host "--- $count files updated ---"
