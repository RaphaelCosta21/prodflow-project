# Derives a transparent, cropped PNG lockup from the flat-background JPG export.
# Run from the repo root:  powershell -ExecutionPolicy Bypass -File scripts/build-lockup-png.ps1
Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$srcPath = Join-Path $root 'brand-reference\prodflow-lockup-on-navy.jpg'
$outPath = Join-Path $root 'src\webparts\prodFlow\assets\brand\prodflow-lockup.png'

# Alpha ramps from 0 to 1 between these distances from the background colour.
$innerT = 22.0
$outerT = 60.0

$src = [System.Drawing.Bitmap]::FromFile($srcPath)
$w = $src.Width
$h = $src.Height

$key = $src.GetPixel(2, 2)
$kR = [double]$key.R; $kG = [double]$key.G; $kB = [double]$key.B
Write-Output "fundo: RGB($($key.R),$($key.G),$($key.B))  origem: ${w}x${h}"

$keyed = New-Object System.Drawing.Bitmap($w, $h, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$minX = $w; $minY = $h; $maxX = -1; $maxY = -1

for ($y = 0; $y -lt $h; $y++) {
    for ($x = 0; $x -lt $w; $x++) {
        $c = $src.GetPixel($x, $y)
        $d = [Math]::Sqrt([Math]::Pow($c.R - $kR, 2) + [Math]::Pow($c.G - $kG, 2) + [Math]::Pow($c.B - $kB, 2))
        if ($d -le $innerT) { continue }   # leaves the pixel fully transparent
        $a = if ($d -ge $outerT) { 255 } else { [int](255 * ($d - $innerT) / ($outerT - $innerT)) }
        $keyed.SetPixel($x, $y, [System.Drawing.Color]::FromArgb($a, $c.R, $c.G, $c.B))
        if ($a -gt 40) {
            if ($x -lt $minX) { $minX = $x }; if ($x -gt $maxX) { $maxX = $x }
            if ($y -lt $minY) { $minY = $y }; if ($y -gt $maxY) { $maxY = $y }
        }
    }
}
$src.Dispose()

$pad = 2
$minX = [Math]::Max(0, $minX - $pad); $minY = [Math]::Max(0, $minY - $pad)
$maxX = [Math]::Min($w - 1, $maxX + $pad); $maxY = [Math]::Min($h - 1, $maxY + $pad)
$cw = $maxX - $minX + 1
$ch = $maxY - $minY + 1

$out = New-Object System.Drawing.Bitmap($cw, $ch, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($out)
$g.DrawImage($keyed, (New-Object System.Drawing.Rectangle(0, 0, $cw, $ch)), $minX, $minY, $cw, $ch, [System.Drawing.GraphicsUnit]::Pixel)
$g.Dispose()
$keyed.Dispose()

$out.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
Write-Output "gerado: prodflow-lockup.png  ${cw}x${ch}  (recorte x $minX..$maxX  y $minY..$maxY)"
$out.Dispose()
