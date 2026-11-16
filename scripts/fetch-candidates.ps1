Add-Type -AssemblyName System.Drawing

$outDir = Join-Path $PSScriptRoot "..\tmp-candidates"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$groups = @{
  "momo" = @(
    "1534422298391-e4f8c172dddb",
    "1496116218417-1a781b1c416c",
    "1563245372-f21724e3856d",
    "1541696432-82c6da8ce7bf",
    "1625944525533-473f1a3d54e7",
    "1601050690597-df0568f70950",
    "1626777552726-4a6b54c97e46",
    "1606491956689-2ea866880c84",
    "1589301760014-d929f3979dbc"
  )
  "waffle" = @(
    "1562376552-0d160a2f238d",
    "1509440159596-0249088772ff",
    "1598214886806-c87b84b7078b",
    "1586985289688-ca3cf47d3e6e",
    "1519915028121-7d3463d20b13",
    "1576618148400-f54bed99fcfd",
    "1568051243851-f9b136146e97",
    "1541288097308-7fc464da0ed3",
    "1606313564200-e75d5e30476c",
    "1528207776546-365bb710ee93",
    "1497034825429-c343d7c6a68f",
    "1563805042-7684c019e1cb",
    "1488900128323-21503983a07e",
    "1570197788417-0e82375c9371"
  )
  "live" = @(
    "1555939594-58d7cb561ad1",
    "1529193591184-b1d58069ecdd",
    "1603360946369-dc9bb6258143",
    "1544025162-d76694265947",
    "1546833999-b9f581a1996d",
    "1600891964092-4316c288032e",
    "1626082927389-6cd097cdc6ec",
    "1567620832903-9fc6debc209f",
    "1598515214211-89d3c73ae83b",
    "1532550907401-a500c9a57435",
    "1519708227418-c8fd9a32b7a2",
    "1534939561126-855b8675edd7",
    "1580476262798-bddd9f4b7369"
  )
}

$font = New-Object System.Drawing.Font("Arial", 11, [System.Drawing.FontStyle]::Bold)
$brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::Black)

foreach ($group in $groups.Keys) {
  $files = @()
  $idx = 1
  foreach ($id in $groups[$group]) {
    $dest = Join-Path $outDir ("$group-$idx.jpg")
    if (-not (Test-Path $dest)) {
      try {
        Invoke-WebRequest -Uri "https://images.unsplash.com/photo-${id}?w=500&q=75" -OutFile $dest -TimeoutSec 30
      } catch {
        Write-Output "Failed $group $idx ($id): $($_.Exception.Message)"
      }
    }
    if (Test-Path $dest) { $files += [PSCustomObject]@{ File = $dest; Id = $id; Num = $idx } }
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
  $out = Join-Path $outDir "$group-sheet.jpg"
  $bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Jpeg)
  $bmp.Dispose()
  Write-Output "Created $out"
}
