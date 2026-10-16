$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$assetRoot = Join-Path (Split-Path -Parent $PSScriptRoot) 'assets'
New-Item -ItemType Directory -Force -Path $assetRoot | Out-Null
$bitmap = New-Object Drawing.Bitmap 512,512
$graphics = [Drawing.Graphics]::FromImage($bitmap)
$graphics.SmoothingMode = [Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.ScaleTransform(2,2)
$panel = New-Object Drawing.Drawing2D.GraphicsPath
foreach ($arc in @(@(8,8,112,112,180),@(136,8,112,112,270),@(136,136,112,112,0),@(8,136,112,112,90))) {
    $panel.AddArc([single]$arc[0],[single]$arc[1],[single]$arc[2],[single]$arc[3],[single]$arc[4],[single]90)
}
$panel.CloseFigure()
$panelBrush = New-Object Drawing.Drawing2D.LinearGradientBrush ([Drawing.Point]::new(8,8)),([Drawing.Point]::new(248,248)),([Drawing.ColorTranslator]::FromHtml('#342044')),([Drawing.ColorTranslator]::FromHtml('#171122'))
$borderPen = New-Object Drawing.Pen ([Drawing.ColorTranslator]::FromHtml('#8c63b9')),3
$graphics.FillPath($panelBrush,$panel)
$graphics.DrawPath($borderPen,$panel)
$orbitPen = New-Object Drawing.Pen ([Drawing.Color]::FromArgb(204,168,121,227)),9
$saved = $graphics.Save()
$graphics.TranslateTransform(128,132)
$graphics.RotateTransform(-32)
$graphics.DrawEllipse($orbitPen,-91,-42,182,84)
$graphics.Restore($saved)
$star = New-Object Drawing.Drawing2D.GraphicsPath
$star.AddBezier(128,40,139,98,148,110,205,128)
$star.AddBezier(205,128,148,143,139,157,128,216)
$star.AddBezier(128,216,115,157,106,143,49,128)
$star.AddBezier(49,128,106,110,115,98,128,40)
$star.CloseFigure()
$starBrush = New-Object Drawing.Drawing2D.LinearGradientBrush ([Drawing.Point]::new(96,40)),([Drawing.Point]::new(180,216)),([Drawing.ColorTranslator]::FromHtml('#fff3dc')),([Drawing.ColorTranslator]::FromHtml('#c6a0ff'))
$graphics.FillPath($starBrush,$star)
$sparkle = [Drawing.PointF[]]@([Drawing.PointF]::new(189,45),[Drawing.PointF]::new(195,62),[Drawing.PointF]::new(212,68),[Drawing.PointF]::new(195,74),[Drawing.PointF]::new(189,91),[Drawing.PointF]::new(183,74),[Drawing.PointF]::new(166,68),[Drawing.PointF]::new(183,62))
$sparkleBrush = New-Object Drawing.SolidBrush ([Drawing.ColorTranslator]::FromHtml('#fff3dc'))
$graphics.FillPolygon($sparkleBrush,$sparkle)
$bitmap.Save((Join-Path $assetRoot 'app.png'),[Drawing.Imaging.ImageFormat]::Png)
$frames = @()
$sizes = @(16,24,32,48,64,128,256)
foreach ($size in $sizes) {
    $frame = New-Object Drawing.Bitmap $size,$size
    $canvas = [Drawing.Graphics]::FromImage($frame)
    $canvas.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $canvas.DrawImage($bitmap,0,0,$size,$size)
    $stream = New-Object IO.MemoryStream
    $frame.Save($stream,[Drawing.Imaging.ImageFormat]::Png)
    $frames += ,($stream.ToArray())
    $stream.Dispose(); $canvas.Dispose(); $frame.Dispose()
}
$file = [IO.File]::Create((Join-Path $assetRoot 'app.ico'))
$writer = New-Object IO.BinaryWriter $file
$writer.Write([uint16]0);$writer.Write([uint16]1);$writer.Write([uint16]$sizes.Count)
$offset = 6 + 16*$sizes.Count
for ($index=0; $index -lt $sizes.Count; $index++) {
    $dimension = if($sizes[$index] -eq 256){0}else{$sizes[$index]}
    $writer.Write([byte]$dimension);$writer.Write([byte]$dimension);$writer.Write([byte]0);$writer.Write([byte]0)
    $writer.Write([uint16]1);$writer.Write([uint16]32);$writer.Write([uint32]$frames[$index].Length);$writer.Write([uint32]$offset)
    $offset += $frames[$index].Length
}
foreach ($frameBytes in $frames){$writer.Write([byte[]]$frameBytes)}
$writer.Dispose();$file.Dispose()
foreach ($item in @($sparkleBrush,$starBrush,$star,$orbitPen,$borderPen,$panelBrush,$panel,$graphics,$bitmap)){$item.Dispose()}
Write-Host 'Generated assets/app.png and assets/app.ico (16-256 px)'
