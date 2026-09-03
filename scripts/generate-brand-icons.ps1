# Regenerates the raster app icons from assets/brand/prodflow-symbol.png.
# Run from the repo root:  powershell -ExecutionPolicy Bypass -File scripts/generate-brand-icons.ps1
Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$symbolPath = Join-Path $root 'src\webparts\prodFlow\assets\brand\prodflow-symbol.png'
$webPartId = '6539beb9-d74b-4ab9-8462-d3fd0651efdb'
$navy = [System.Drawing.Color]::FromArgb(255, 0, 59, 92)   # Ocean Navy #003B5C

$symbol = [System.Drawing.Bitmap]::FromFile($symbolPath)

function New-Canvas([int]$size) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = 'AntiAlias'
    $g.InterpolationMode = 'HighQualityBicubic'
    $g.PixelOffsetMode = 'HighQuality'
    return @{ Bitmap = $bmp; Graphics = $g }
}

# Centers the symbol inside a square canvas, scaled to fill $contentRatio of the shorter edge.
function Get-SymbolRect([int]$size, [double]$contentRatio) {
    $box = $size * $contentRatio
    $scale = [Math]::Min($box / $symbol.Width, $box / $symbol.Height)
    $w = $symbol.Width * $scale
    $h = $symbol.Height * $scale
    return New-Object System.Drawing.RectangleF((($size - $w) / 2), (($size - $h) / 2), $w, $h)
}

function Save-ColorIcon([string]$path, [int]$size, [bool]$withBackground) {
    $c = New-Canvas $size
    if ($withBackground) {
        $brush = New-Object System.Drawing.SolidBrush($navy)
        $c.Graphics.FillRectangle($brush, 0, 0, $size, $size)
        $brush.Dispose()
    }
    $c.Graphics.DrawImage($symbol, (Get-SymbolRect $size 0.72))
    $c.Graphics.Dispose()
    $c.Bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $c.Bitmap.Dispose()
    Write-Output "  $([IO.Path]::GetFileName($path))  ${size}x${size}"
}

# Teams outline icons must be a flat white glyph on transparent; reuse the symbol's alpha as the mask.
function Save-OutlineIcon([string]$path, [int]$size) {
    $c = New-Canvas $size
    $rect = Get-SymbolRect $size 0.86
    $c.Graphics.DrawImage($symbol, $rect)
    $c.Graphics.Dispose()
    for ($y = 0; $y -lt $size; $y++) {
        for ($x = 0; $x -lt $size; $x++) {
            $a = $c.Bitmap.GetPixel($x, $y).A
            if ($a -gt 0) {
                $c.Bitmap.SetPixel($x, $y, [System.Drawing.Color]::FromArgb($a, 255, 255, 255))
            }
        }
    }
    $c.Bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $c.Bitmap.Dispose()
    Write-Output "  $([IO.Path]::GetFileName($path))  ${size}x${size}"
}

Write-Output 'Teams:'
Save-ColorIcon (Join-Path $root "teams\${webPartId}_color.png") 192 $true
Save-OutlineIcon (Join-Path $root "teams\${webPartId}_outline.png") 32

Write-Output 'Web part / favicon:'
$iconPath = Join-Path $root 'src\webparts\prodFlow\assets\brand\prodflow-icon-64.png'
Save-ColorIcon $iconPath 64 $false

$symbol.Dispose()

$b64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes($iconPath))
Write-Output "`nmanifest iconImageUrl (data URI, $([math]::Round($b64.Length / 1KB, 1)) KB):"
Write-Output "data:image/png;base64,$b64"
