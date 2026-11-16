Add-Type -AssemblyName System.Drawing

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$groups = Get-Content (Join-Path $root "tmp-audit-remaining.json") -Raw | ConvertFrom-Json
$outDir = Join-Path $root "tmp-audit"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$font = New-Object System.Drawing.Font("Arial", 9, [System.Drawing.FontStyle]::Bold)
$brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::Black)
$cellW = 320; $cellH = 300; $cols = 4

function New-Sheet($items, $name) {
  $rows = [Math]::Ceiling($items.Count / $cols)
  if ($rows -lt 1) { $rows = 1 }
  $bmp = New-Object System.Drawing.Bitmap(($cols * $cellW), ($rows * $cellH))
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.Clear([System.Drawing.Color]::White)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  for ($i = 0; $i -lt $items.Count; $i++) {
    $it = $items[$i]
    $col = $i % $cols; $row = [Math]::Floor($i / $cols)
    $x = $col * $cellW; $y = $row * $cellH
    try {
      $img = [System.Drawing.Image]::FromFile((Join-Path $root $it.source))
      $maxW = $cellW - 10; $maxH = $cellH - 58
      $ratio = [Math]::Min($maxW / $img.Width, $maxH / $img.Height)
      $w = [int]($img.Width * $ratio); $h = [int]($img.Height * $ratio)
      $g.DrawImage($img, ($x + [int](($cellW - $w) / 2)), ($y + 30 + [int](($maxH - $h) / 2)), $w, $h)
      $img.Dispose()
    } catch {}
    $label = ($it.source -split '[\\/]')[-1]
    $g.DrawString($label, $font, $brush, ($x + 5), ($y + 4))
    $names = ($it.items | ForEach-Object { $_.name }) -join ', '
    if ($names.Length -gt 46) { $names = $names.Substring(0, 46) + '...' }
    $g.DrawString($names, $font, $brush, ($x + 5), ($y + 16))
    $g.DrawRectangle([System.Drawing.Pens]::LightGray, $x, $y, $cellW - 1, $cellH - 1)
  }
  $g.Dispose()
  $out = Join-Path $outDir ($name + ".jpg")
  $bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Jpeg)
  $bmp.Dispose()
  Write-Output "Created $out"
}

$drinks = @($groups | Where-Object { $_.source -match 'drinks-|fusion-pizza' })
$food = @($groups | Where-Object { $_.source -notmatch 'drinks-|fusion-pizza' })

New-Sheet $drinks "sheet-drinks-pizza"
New-Sheet $food "sheet-food"
