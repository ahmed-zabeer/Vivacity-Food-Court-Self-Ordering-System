Add-Type -AssemblyName System.Drawing

$outDir = Join-Path $PSScriptRoot "..\tmp-candidates"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$ids = @(
  "1504754524776-8f4f37790ca0",
  "1517686469429-8bdb88b9f907",
  "1551024506-0bccd828d307",
  "1551024601-bec78aea704b",
  "1608198093002-ad4e005484ec",
  "1614707267537-b85aaf00c4b7",
  "1598515213692-5f252f75d785",
  "1592394533824-9440e5d68530",
  "1513442542250-854d436a73f2",
  "1528712306091-ed0763094c98",
  "1541599468348-e96984315921",
  "1558961363-fa8fdf82db35",
  "1509440159596-0249088772ff",
  "1562376552-0d160a2f238d",
  "1568051243851-f9b136146e97",
  "1606313564200-e75d5e30476c"
)

$font = New-Object System.Drawing.Font("Arial", 11, [System.Drawing.FontStyle]::Bold)
$brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::Black)
$files = @()
$idx = 1
foreach ($id in $ids) {
  $dest = Join-Path $outDir ("waffle2-$idx.jpg")
  if (-not (Test-Path $dest)) {
    try {
      Invoke-WebRequest -Uri "https://images.unsplash.com/photo-${id}?w=500&q=75" -OutFile $dest -TimeoutSec 30
    } catch {
      Write-Output "Failed $idx ($id): $($_.Exception.Message)"
    }
  }
  if ((Test-Path $dest) -and ((Get-Item $dest).Length -gt 1000)) {
    $files += [PSCustomObject]@{ File = $dest; Id = $id; Num = $idx }
  }
  $idx++
}

$cellW = 300; $cellH = 280; $cols = 4
$rows = [Math]::Ceiling($files.Count / $cols)
$bmp = New-Object System.Drawing.Bitmap(($cols*$cellW), ($rows*$cellH))
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.Clear([System.Drawing.Color]::White)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic

for ($i=0; $i -lt $files.Count; $i++) {
  $f = $files[$i]
  $col = $i % $cols; $row = [Math]::Floor($i / $cols)
  $x = $col*$cellW; $y = $row*$cellH
  try {
    $img = [System.Drawing.Image]::FromFile($f.File)
    $maxW = $cellW - 12; $maxH = $cellH - 44
    $ratio = [Math]::Min($maxW / $img.Width, $maxH / $img.Height)
    $w = [int]($img.Width * $ratio); $h = [int]($img.Height * $ratio)
    $g.DrawImage($img, ($x + [int](($cellW-$w)/2)), ($y + 28 + [int](($maxH-$h)/2)), $w, $h)
    $img.Dispose()
  } catch {}
  $g.DrawString("$($f.Num). $($f.Id)", $font, $brush, ($x+6), ($y+6))
  $g.DrawRectangle([System.Drawing.Pens]::LightGray, $x, $y, $cellW-1, $cellH-1)
}
$g.Dispose()
$out = Join-Path $outDir "waffle2-sheet.jpg"
$bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Jpeg)
$bmp.Dispose()
Write-Output "Created $out"
