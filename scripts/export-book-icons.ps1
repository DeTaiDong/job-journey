# Export the selected book mark for browsers that require PNG app icons.
Add-Type -AssemblyName System.Drawing

$outputDirectory = Join-Path $PSScriptRoot '..\public'
$background = [System.Drawing.ColorTranslator]::FromHtml('#F9F8F6')
$foreground = [System.Drawing.ColorTranslator]::FromHtml('#1C1C1C')

foreach ($icon in @(
    @{ Size = 192; Name = 'icon-192.png' },
    @{ Size = 512; Name = 'icon-512.png' },
    @{ Size = 180; Name = 'apple-touch-icon.png' }
)) {
    $size = [int]$icon.Size
    $bitmap = [System.Drawing.Bitmap]::new($size, $size)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $pen = [System.Drawing.Pen]::new($foreground, 4)
    $book = [System.Drawing.Drawing2D.GraphicsPath]::new()

    try {
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
        $graphics.Clear($background)
        $graphics.ScaleTransform($size / 64.0, $size / 64.0)
        $pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Miter
        $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Square
        $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Square

        $book.AddBezier(32, 17, 25, 12, 17, 11, 9, 13)
        $book.AddLine(9, 13, 9, 47)
        $book.AddBezier(9, 47, 17, 45, 25, 46, 32, 51)
        $book.AddBezier(32, 51, 39, 46, 47, 45, 55, 47)
        $book.AddLine(55, 47, 55, 13)
        $book.AddBezier(55, 13, 47, 11, 39, 12, 32, 17)
        $book.CloseFigure()
        $graphics.DrawPath($pen, $book)
        $graphics.DrawLine($pen, 32, 17, 32, 51)
        $graphics.DrawBezier($pen, 16, 24, 20, 24, 23, 25, 26, 26)
        $graphics.DrawBezier($pen, 38, 26, 41, 25, 44, 24, 48, 24)

        $destination = Join-Path $outputDirectory $icon.Name
        $bitmap.Save($destination, [System.Drawing.Imaging.ImageFormat]::Png)
        Write-Output "$($icon.Name): ${size}x${size}"
    }
    finally {
        $book.Dispose()
        $pen.Dispose()
        $graphics.Dispose()
        $bitmap.Dispose()
    }
}
