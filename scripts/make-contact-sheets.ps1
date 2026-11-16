Add-Type -AssemblyName System.Drawing

$root = Join-Path $PSScriptRoot "..\public\assets"
$outDir = Join-Path $PSScriptRoot "..\tmp-contact"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$groups = @{
  "fusion-steaks"        = @("fusion Cafe\Steaks")
  "fusion-seafood"       = @("fusion Cafe\Seafood Platter and Premium")
  "fusion-starters"      = @("fusion Cafe\Fusion Starters")
  "fusion-combos"        = @("fusion Cafe\Combo")
  "fusion-premiummix"    = @("fusion Cafe\Premium Mix Platter")
  "fusion-chef"          = @("fusion Cafe\Chef Special")
  "fusion-pasta"         = @("fusion Cafe\Fusion Pasta Noodles")
  "fusion-improved"      = @("fusion Cafe\Fusion Platter Improved")
  "fusion-salad"         = @("fusion Cafe\Fusion Salad")
  "toptown-appetizer"    = @("Top Town\Apatizer")
  "toptown-soup"         = @("Top Town\Soup")
  "toptown-setmenu"      = @("Top Town\Set Menu")
  "toptown-ricebowl"     = @("Top Town\Rice Bowl")
  "toptown-friedsizzling"= @("Top Town\Fried Rice Sizling")
  "burgerbar"            = @("Barger Bar")
}

$font = New-Object System.Drawing.Font("Arial", 13, [System.Drawing.FontStyle]::Bold)
$smallFont = New-Object System.Drawing.Font("Arial", 10, [System.Drawing.FontStyle]::Regular)
$labelBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::Black)

foreach ($groupName in $groups.Keys) {
  $files = @()
  foreach ($rel in $groups[$groupName]) {
    $dir = Join-Path $root $rel
    if (Test-Path $dir) {
      $files += Get-ChildItem -Path $dir -File | Sort-Object Name
    }
  }
  if ($files.Count -eq 0) { continue }

  $cellW = 360
  $cellH = 300
  $cols = 4
  $rows = [Math]::Ceiling($files.Count / $cols)
  $sheetW = $cols * $cellW
  $sheetH = $rows * $cellH

  $bmp = New-Object System.Drawing.Bitmap($sheetW, $sheetH)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.Clear([System.Drawing.Color]::White)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic

  for ($i = 0; $i -lt $files.Count; $i++) {
    $file = $files[$i]
    $col = $i % $cols
    $row = [Math]::Floor($i / $cols)
    $x = $col * $cellW
    $y = $row * $cellH

    try {
      $img = [System.Drawing.Image]::FromFile($file.FullName)
      $maxW = $cellW - 16
      $maxH = $cellH - 54
      $ratio = [Math]::Min($maxW / $img.Width, $maxH / $img.Height)
      $w = [int]($img.Width * $ratio)
      $h = [int]($img.Height * $ratio)
      $dx = $x + [int](($cellW - $w) / 2)
      $dy = $y + 34 + [int](($maxH - $h) / 2)
      $g.DrawImage($img, $dx, $dy, $w, $h)
      $img.Dispose()
    } catch {
      $g.DrawString("ERR", $font, $labelBrush, $x + 10, $y + 50)
    }

    $g.DrawString($file.Name, $font, $labelBrush, $x + 8, $y + 6)
    $g.DrawString(($i + 1).ToString() + " / " + $files.Count, $smallFont, $labelBrush, $x + 8, $y + $cellH - 18)
    $g.DrawRectangle([System.Drawing.Pens]::LightGray, $x, $y, $cellW - 1, $cellH - 1)
  }

  $g.Dispose()
  $out = Join-Path $outDir ($groupName + ".jpg")
  $bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Jpeg)
  $bmp.Dispose()
  Write-Output ("Created " + $out + " (" + $files.Count + " images)")
}
