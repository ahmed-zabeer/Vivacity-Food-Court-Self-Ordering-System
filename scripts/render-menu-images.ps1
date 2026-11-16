Add-Type -AssemblyName System.Drawing

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$manifestPath = Join-Path $root "tmp-menu-manifest.json"
$outDir = Join-Path $root "public\assets\menu"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$manifest = (Get-Content $manifestPath -Raw | ConvertFrom-Json).manifest

$size = 600
$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$encParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
$encParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]82)

$ok = 0
$failed = @()

foreach ($entry in $manifest) {
  $src = $entry.source
  $dest = Join-Path $outDir ($entry.key + ".jpg")
  try {
    if (-not (Test-Path $src)) { throw "missing source: $src" }
    $img = [System.Drawing.Image]::FromFile($src)
    $side = [Math]::Min($img.Width, $img.Height)
    $sx = [int](($img.Width - $side) / 2)
    $sy = [int](($img.Height - $side) / 2)

    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.Clear([System.Drawing.Color]::White)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $srcRect = New-Object System.Drawing.Rectangle($sx, $sy, $side, $side)
    $dstRect = New-Object System.Drawing.Rectangle(0, 0, $size, $size)
    $g.DrawImage($img, $dstRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
    $g.Dispose()
    $bmp.Save($dest, $codec, $encParams)
    $bmp.Dispose()
    $img.Dispose()
    $ok++
  } catch {
    $failed += "$($entry.key): $($_.Exception.Message)"
  }
}

$encParams.Dispose()
Write-Output "Rendered $ok / $($manifest.Count) images to $outDir"
if ($failed.Count -gt 0) {
  Write-Output "FAILURES:"
  $failed | ForEach-Object { Write-Output " - $_" }
  exit 1
}
