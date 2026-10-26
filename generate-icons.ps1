# generate-icons.ps1
Add-Type -AssemblyName System.Drawing

function Draw-FlamePath($g, $bounds, $fillBrush) {
    $x = $bounds.X
    $y = $bounds.Y
    $w = $bounds.Width
    $h = $bounds.Height

    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    
    # Outer flame
    $p1 = New-Object System.Drawing.PointF ($x + $w * 0.50), ($y + $h * 0.18)
    $p2 = New-Object System.Drawing.PointF ($x + $w * 0.64), ($y + $h * 0.35)
    $p3 = New-Object System.Drawing.PointF ($x + $w * 0.80), ($y + $h * 0.50)
    $p4 = New-Object System.Drawing.PointF ($x + $w * 0.80), ($y + $h * 0.68)
    $p5 = New-Object System.Drawing.PointF ($x + $w * 0.76), ($y + $h * 0.82)
    $p6 = New-Object System.Drawing.PointF ($x + $w * 0.64), ($y + $h * 0.90)
    $p7 = New-Object System.Drawing.PointF ($x + $w * 0.50), ($y + $h * 0.90)
    $p8 = New-Object System.Drawing.PointF ($x + $w * 0.36), ($y + $h * 0.90)
    $p9 = New-Object System.Drawing.PointF ($x + $w * 0.24), ($y + $h * 0.82)
    $p10 = New-Object System.Drawing.PointF ($x + $w * 0.20), ($y + $h * 0.68)
    $p11 = New-Object System.Drawing.PointF ($x + $w * 0.20), ($y + $h * 0.52)
    $p12 = New-Object System.Drawing.PointF ($x + $w * 0.32), ($y + $h * 0.44)
    $p13 = New-Object System.Drawing.PointF ($x + $w * 0.40), ($y + $h * 0.44)
    $p14 = New-Object System.Drawing.PointF ($x + $w * 0.46), ($y + $h * 0.48)
    $p15 = New-Object System.Drawing.PointF ($x + $w * 0.50), ($y + $h * 0.48)
    $p16 = New-Object System.Drawing.PointF ($x + $w * 0.46), ($y + $h * 0.38)
    $p17 = New-Object System.Drawing.PointF ($x + $w * 0.44), ($y + $h * 0.28)

    $path.AddBezier($p1, $p2, $p3, $p4)
    $path.AddBezier($p4, $p5, $p6, $p7)
    $path.AddBezier($p7, $p8, $p9, $p10)
    $path.AddBezier($p10, $p11, $p12, $p13)
    $path.AddBezier($p13, $p14, $p14, $p15)
    $path.AddBezier($p15, $p16, $p17, $p1)
    $path.CloseFigure()

    $g.FillPath($fillBrush, $path)

    # Inner golden core
    $innerPath = New-Object System.Drawing.Drawing2D.GraphicsPath
    $ip1 = New-Object System.Drawing.PointF ($x + $w * 0.50), ($y + $h * 0.52)
    $ip2 = New-Object System.Drawing.PointF ($x + $w * 0.62), ($y + $h * 0.62)
    $ip3 = New-Object System.Drawing.PointF ($x + $w * 0.62), ($y + $h * 0.74)
    $ip4 = New-Object System.Drawing.PointF ($x + $w * 0.50), ($y + $h * 0.82)
    $ip5 = New-Object System.Drawing.PointF ($x + $w * 0.38), ($y + $h * 0.74)
    $ip6 = New-Object System.Drawing.PointF ($x + $w * 0.38), ($y + $h * 0.62)

    $innerPath.AddBezier($ip1, $ip2, $ip3, $ip4)
    $innerPath.AddBezier($ip4, $ip5, $ip6, $ip1)
    $innerPath.CloseFigure()

    $goldBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 255, 213, 79))
    $g.FillPath($goldBrush, $innerPath)
    $goldBrush.Dispose()
    $innerPath.Dispose()
    $path.Dispose()
}

function Create-LauncherIcon($size, $isRound, $outPath) {
    $bmp = New-Object System.Drawing.Bitmap $size, $size
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.Clear([System.Drawing.Color]::Transparent)

    $rect = New-Object System.Drawing.Rectangle 0, 0, $size, $size
    $gradBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush ($rect, [System.Drawing.Color]::FromArgb(255, 255, 90, 0), [System.Drawing.Color]::FromArgb(255, 216, 59, 1), [System.Drawing.Drawing2D.LinearGradientMode]::ForwardDiagonal)

    if ($isRound) {
        $g.FillEllipse($gradBrush, 1, 1, ($size - 2), ($size - 2))
    } else {
        # Rounded rectangle with radius ~ 22%
        $radius = [int]($size * 0.22)
        $bgPath = New-Object System.Drawing.Drawing2D.GraphicsPath
        $d = $radius * 2
        $bgPath.AddArc(1, 1, $d, $d, 180, 90)
        $bgPath.AddArc(($size - $d - 1), 1, $d, $d, 270, 90)
        $bgPath.AddArc(($size - $d - 1), ($size - $d - 1), $d, $d, 0, 90)
        $bgPath.AddArc(1, ($size - $d - 1), $d, $d, 90, 90)
        $bgPath.CloseFigure()
        $g.FillPath($gradBrush, $bgPath)
        $bgPath.Dispose()
    }

    # Draw flame inside safe area
    $flameSize = [int]($size * 0.62)
    $flameX = [int](($size - $flameSize) / 2)
    $flameY = [int](($size - $flameSize) / 2)
    $flameRect = New-Object System.Drawing.Rectangle $flameX, $flameY, $flameSize, $flameSize

    $whiteBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
    Draw-FlamePath $g $flameRect $whiteBrush

    $whiteBrush.Dispose()
    $gradBrush.Dispose()
    $g.Dispose()

    [System.IO.Directory]::CreateDirectory([System.IO.Path]::GetDirectoryName($outPath)) | Out-Null
    $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host "Generated: $outPath ($size x $size)"
}

function Create-ForegroundIcon($size, $outPath) {
    $bmp = New-Object System.Drawing.Bitmap $size, $size
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.Clear([System.Drawing.Color]::Transparent)

    # Safe zone for adaptive icon foreground is ~54% of total canvas
    $flameSize = [int]($size * 0.52)
    $flameX = [int](($size - $flameSize) / 2)
    $flameY = [int](($size - $flameSize) / 2)
    $flameRect = New-Object System.Drawing.Rectangle $flameX, $flameY, $flameSize, $flameSize

    # Subtle drop shadow
    $shadowRect = New-Object System.Drawing.Rectangle $flameX, ($flameY + [int]($size * 0.02)), $flameSize, $flameSize
    $shadowBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(40, 0, 0, 0))
    Draw-FlamePath $g $shadowRect $shadowBrush
    $shadowBrush.Dispose()

    $whiteBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
    Draw-FlamePath $g $flameRect $whiteBrush
    $whiteBrush.Dispose()

    $g.Dispose()
    [System.IO.Directory]::CreateDirectory([System.IO.Path]::GetDirectoryName($outPath)) | Out-Null
    $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host "Generated Foreground: $outPath ($size x $size)"
}

function Create-SplashScreen($width, $height, $outPath) {
    $bmp = New-Object System.Drawing.Bitmap $width, $height
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    
    $rect = New-Object System.Drawing.Rectangle 0, 0, $width, $height
    $gradBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush ($rect, [System.Drawing.Color]::FromArgb(255, 255, 90, 0), [System.Drawing.Color]::FromArgb(255, 216, 59, 1), [System.Drawing.Drawing2D.LinearGradientMode]::ForwardDiagonal)
    $g.FillRectangle($gradBrush, $rect)

    # Draw centered badge
    $minDim = [Math]::Min($width, $height)
    $cardSize = [int]($minDim * 0.28)
    $cardX = [int](($width - $cardSize) / 2)
    $cardY = [int](($height - $cardSize) / 2 - [int]($minDim * 0.06))

    # Badge background
    $badgeRect = New-Object System.Drawing.Rectangle $cardX, $cardY, $cardSize, $cardSize
    $badgeRadius = [int]($cardSize * 0.28)
    $d = $badgeRadius * 2
    $bPath = New-Object System.Drawing.Drawing2D.GraphicsPath
    $bPath.AddArc($cardX, $cardY, $d, $d, 180, 90)
    $bPath.AddArc(($cardX + $cardSize - $d), $cardY, $d, $d, 270, 90)
    $bPath.AddArc(($cardX + $cardSize - $d), ($cardY + $cardSize - $d), $d, $d, 0, 90)
    $bPath.AddArc($cardX, ($cardY + $cardSize - $d), $d, $d, 90, 90)
    $bPath.CloseFigure()
    
    $glassBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(60, 255, 255, 255))
    $g.FillPath($glassBrush, $bPath)
    $glassPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(100, 255, 255, 255)), 2
    $g.DrawPath($glassPen, $bPath)
    $glassPen.Dispose()
    $glassBrush.Dispose()
    $bPath.Dispose()

    # Flame inside badge
    $flameSize = [int]($cardSize * 0.65)
    $flameX = [int]($cardX + ($cardSize - $flameSize) / 2)
    $flameY = [int]($cardY + ($cardSize - $flameSize) / 2)
    $flameRect = New-Object System.Drawing.Rectangle $flameX, $flameY, $flameSize, $flameSize
    $whiteBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
    Draw-FlamePath $g $flameRect $whiteBrush
    $whiteBrush.Dispose()

    # Text "REGASCO"
    $fontSize = [Math]::Max(14, [int]($minDim * 0.055))
    $font = New-Object System.Drawing.Font ("Segoe UI", $fontSize, [System.Drawing.FontStyle]::Bold)
    $format = New-Object System.Drawing.StringFormat
    $format.Alignment = [System.Drawing.StringAlignment]::Center
    $textBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
    
    $textY = $cardY + $cardSize + [int]($minDim * 0.03)
    $textRect = New-Object System.Drawing.RectangleF 0, $textY, $width, ($fontSize * 1.5)
    $g.DrawString("REGASCO", $font, $textBrush, $textRect, $format)

    $subFontSize = [Math]::Max(9, [int]($fontSize * 0.45))
    $subFont = New-Object System.Drawing.Font ("Segoe UI", $subFontSize, [System.Drawing.FontStyle]::Regular)
    $subBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(230, 255, 255, 255))
    $subRect = New-Object System.Drawing.RectangleF 0, ($textY + $fontSize * 1.3), $width, ($subFontSize * 1.5)
    $g.DrawString("Mindanao Ave. Official Delivery App", $subFont, $subBrush, $subRect, $format)

    $subBrush.Dispose()
    $subFont.Dispose()
    $textBrush.Dispose()
    $format.Dispose()
    $font.Dispose()
    $gradBrush.Dispose()
    $g.Dispose()

    [System.IO.Directory]::CreateDirectory([System.IO.Path]::GetDirectoryName($outPath)) | Out-Null
    $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host "Generated Splash: $outPath ($width x $height)"
}

# 1. Launcher Icons (Standard & Round)
$densities = @(
    @{ name = "mdpi"; size = 48; fgSize = 108 },
    @{ name = "hdpi"; size = 72; fgSize = 162 },
    @{ name = "xhdpi"; size = 96; fgSize = 216 },
    @{ name = "xxhdpi"; size = 144; fgSize = 324 },
    @{ name = "xxxhdpi"; size = 192; fgSize = 432 }
)

foreach ($d in $densities) {
    $dir = "android\app\src\main\res\mipmap-$($d.name)"
    Create-LauncherIcon $d.size $false "$dir\ic_launcher.png"
    Create-LauncherIcon $d.size $true "$dir\ic_launcher_round.png"
    Create-ForegroundIcon $d.fgSize "$dir\ic_launcher_foreground.png"
}

# 2. Splash Screens
$splashSizes = @(
    @{ path = "android\app\src\main\res\drawable\splash.png"; w = 480; h = 320 },
    @{ path = "android\app\src\main\res\drawable-land-mdpi\splash.png"; w = 480; h = 320 },
    @{ path = "android\app\src\main\res\drawable-land-hdpi\splash.png"; w = 800; h = 480 },
    @{ path = "android\app\src\main\res\drawable-land-xhdpi\splash.png"; w = 1280; h = 720 },
    @{ path = "android\app\src\main\res\drawable-land-xxhdpi\splash.png"; w = 1600; h = 960 },
    @{ path = "android\app\src\main\res\drawable-land-xxxhdpi\splash.png"; w = 1920; h = 1080 },
    @{ path = "android\app\src\main\res\drawable-port-mdpi\splash.png"; w = 320; h = 480 },
    @{ path = "android\app\src\main\res\drawable-port-hdpi\splash.png"; w = 480; h = 800 },
    @{ path = "android\app\src\main\res\drawable-port-xhdpi\splash.png"; w = 720; h = 1280 },
    @{ path = "android\app\src\main\res\drawable-port-xxhdpi\splash.png"; w = 960; h = 1600 },
    @{ path = "android\app\src\main\res\drawable-port-xxxhdpi\splash.png"; w = 1080; h = 1920 }
)

foreach ($s in $splashSizes) {
    Create-SplashScreen $s.w $s.h $s.path
}

Write-Host "All Android Icons and Splash Screens generated successfully!" -ForegroundColor Green
