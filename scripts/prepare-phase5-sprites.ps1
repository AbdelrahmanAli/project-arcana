Add-Type -AssemblyName System.Drawing

$workspace = Split-Path -Parent $PSScriptRoot
$sourceDir = Join-Path $workspace 'docs\art-source\phase5'
$outputDir = Join-Path $workspace 'public\art'
$sprites = @(
  @{ Name = 'phase5-volcanic-rock.png'; X = 185; Y = 260; W = 885; H = 775; OutW = 320; OutH = 280 },
  @{ Name = 'phase5-tornado.png'; X = 90; Y = 75; W = 1080; H = 1140; OutW = 320; OutH = 338 },
  @{ Name = 'phase5-volcano-vent.png'; X = 25; Y = 165; W = 1200; H = 900; OutW = 320; OutH = 240 },
  @{ Name = 'phase5-mud.png'; X = 45; Y = 105; W = 1680; H = 650; OutW = 512; OutH = 198 }
)

foreach ($sprite in $sprites) {
  $sourcePath = Join-Path $sourceDir $sprite.Name
  $outputPath = Join-Path $outputDir $sprite.Name
  $source = [System.Drawing.Bitmap]::FromFile($sourcePath)
  try {
    $output = New-Object System.Drawing.Bitmap($sprite.OutW, $sprite.OutH, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    try {
      $graphics = [System.Drawing.Graphics]::FromImage($output)
      try {
        $graphics.Clear([System.Drawing.Color]::Transparent)
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
        $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
        $destination = New-Object System.Drawing.Rectangle(0, 0, $sprite.OutW, $sprite.OutH)
        $crop = New-Object System.Drawing.Rectangle($sprite.X, $sprite.Y, $sprite.W, $sprite.H)
        $graphics.DrawImage($source, $destination, $crop, [System.Drawing.GraphicsUnit]::Pixel)
      } finally { $graphics.Dispose() }
      $output.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    } finally { $output.Dispose() }
  } finally { $source.Dispose() }
  Write-Output $outputPath
}
