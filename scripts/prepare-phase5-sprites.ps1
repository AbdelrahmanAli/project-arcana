Add-Type -AssemblyName System.Drawing

$workspace = Split-Path -Parent $PSScriptRoot
$sourceDir = Join-Path $workspace 'docs\art-source\phase5'
$outputDir = Join-Path $workspace 'public\art'
$sprites = @(
  @{ Name = 'phase5-volcanic-rock.png'; X = 185; Y = 260; W = 885; H = 775; OutW = 320; OutH = 280 },
  @{ Name = 'phase5-tornado.png'; X = 90; Y = 75; W = 1080; H = 1140; OutW = 320; OutH = 338 },
  @{ Name = 'phase5-volcano-vent.png'; X = 25; Y = 165; W = 1200; H = 900; OutW = 320; OutH = 240 },
  @{ Name = 'phase5-mud.png'; X = 45; Y = 105; W = 1680; H = 650; OutW = 512; OutH = 198 },
  @{ Name = 'phase5-lightning.png'; X = 70; Y = 0; W = 884; H = 1536; OutW = 224; OutH = 390 },
  @{ Name = 'phase5-ash-cloud.png'; X = 0; Y = 20; W = 1774; H = 847; OutW = 512; OutH = 244 },
  @{ Name = 'phase5-lava-projectile.png'; X = 65; Y = 170; W = 1080; H = 990; OutW = 192; OutH = 176 },
  @{ Name = 'phase5-lava-pool.png'; X = 35; Y = 60; W = 2000; H = 650; OutW = 512; OutH = 166 }
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

# Animate the existing tornado art as two separately layered sprites: its
# upper spiral can spin while the grounded funnel continues to sway in place.
$tornado = [System.Drawing.Bitmap]::FromFile((Join-Path $outputDir 'phase5-tornado.png'))
try {
  foreach ($part in @(
    @{ Name = 'phase5-tornado-head.png'; X = 0; Y = 0; W = 320; H = 205; OutW = 320; OutH = 205 },
    @{ Name = 'phase5-tornado-funnel.png'; X = 73; Y = 128; W = 174; H = 210; OutW = 174; OutH = 210 }
  )) {
    $output = New-Object System.Drawing.Bitmap($part.OutW, $part.OutH, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    try {
      $graphics = [System.Drawing.Graphics]::FromImage($output)
      try {
        $graphics.Clear([System.Drawing.Color]::Transparent)
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
        $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
        $graphics.DrawImage($tornado,
          (New-Object System.Drawing.Rectangle(0, 0, $part.OutW, $part.OutH)),
          (New-Object System.Drawing.Rectangle($part.X, $part.Y, $part.W, $part.H)),
          [System.Drawing.GraphicsUnit]::Pixel)
      } finally { $graphics.Dispose() }
      $path = Join-Path $outputDir $part.Name
      $output.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
      Write-Output $path
    } finally { $output.Dispose() }
  }
} finally { $tornado.Dispose() }
