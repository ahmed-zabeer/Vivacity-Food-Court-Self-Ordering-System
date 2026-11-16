Add-Type -AssemblyName System.Drawing

$outDir = Join-Path $PSScriptRoot "..\tmp-candidates\fix"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$terms = [ordered]@{
  "mangosmoothie"   = "mango smoothie glass"
  "strawberryshake" = "strawberry milkshake"
  "bluelagoon"      = "blue lagoon cocktail"
  "espresso"        = "espresso cup"
  "bubbletea"       = "bubble tea"
  "watermelon"      = "watermelon juice glass"
  "papaya"          = "papaya juice"
  "chocoshake"      = "chocolate milkshake glass"
}

$font = New-Object System.Drawing.Font("Arial", 10, [System.Drawing.FontStyle]::Bold)
$brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::Black)
$headers = @{ "User-Agent" = "VivacityMenuBot/1.0 (local dev)" }
$rows = @()

foreach ($key in $terms.Keys) {
  $q = [uri]::EscapeDataString($terms[$key])
  $u = "https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=$q&gsrnamespace=6&gsrlimit=3&prop=imageinfo&iiprop=url&iiurlwidth=600&format=json"
  try {
    $r = Invoke-WebRequest -Uri $u -TimeoutSec 40 -Headers $headers
    $pages = ($r.Content | ConvertFrom-Json).query.pages.PSObject.Properties
    $i = 0
    foreach ($p in $pages) {
      $i++
      $url = $p.Value.imageinfo[0].thumburl
      if (-not $url) { continue }
      $url = ($url -split '\?')[0]
      $dest = Join-Path $outDir ("$key-$i.jpg")
      if (-not (Test-Path $dest) -or (Get-Item $dest).Length -lt 1000) {
        try { Invoke-WebRequest -Uri $url -OutFile $dest -TimeoutSec 60 -Headers $headers; Start-Sleep -Milliseconds 500 } catch { Write-Output "DLFAIL $key-$i"; continue }
      }
      if ((Test-Path $dest) -and (Get-Item $dest).Length -gt 1000) { $rows += [PSCustomObject]@{ Key=$key; Num=$i; File=$dest } }
    }
  } catch { Write-Output "SEARCHFAIL $key" }
}

$cellW = 300; $cellH = 290; $cols = 4
$rowsArr = @($rows); $rc = [Math]::Max(1, [Math]::Ceiling($rowsArr.Count / $cols))
$bmp = New-Object System.Drawing.Bitmap(($cols * $cellW), ($rc * $cellH))
$g = [System.Drawing.Graphics]::FromImage($bmp); $g.Clear([System.Drawing.Color]::White)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
for ($i = 0; $i -lt $rowsArr.Count; $i++) {
  $f = $rowsArr[$i]; $col = $i % $cols; $row = [Math]::Floor($i / $cols); $x = $col * $cellW; $y = $row * $cellH
  try {
    $img = [System.Drawing.Image]::FromFile($f.File); $maxW = $cellW - 12; $maxH = $cellH - 46
    $ratio = [Math]::Min($maxW / $img.Width, $maxH / $img.Height)
    $w = [int]($img.Width * $ratio); $h = [int]($img.Height * $ratio)
    $g.DrawImage($img, ($x + [int](($cellW - $w) / 2)), ($y + 26 + [int](($maxH - $h) / 2)), $w, $h)
    $img.Dispose()
  } catch {}
  $g.DrawString("$($f.Key) #$($f.Num)", $font, $brush, ($x + 6), ($y + 6))
  $g.DrawRectangle([System.Drawing.Pens]::LightGray, $x, $y, $cellW - 1, $cellH - 1)
}
$g.Dispose()
$out = Join-Path $outDir "fix-sheet.jpg"
$bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Jpeg); $bmp.Dispose()
Write-Output "Created $out with $($rowsArr.Count) images"
