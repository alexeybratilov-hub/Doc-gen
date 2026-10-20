[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$Host.UI.RawUI.WindowTitle = "DocGen Portable - Генератор документов"

$port = 3000
# Q4=A: приоритет статики — dist/ первый, app/ fallback для старых бандлов
$rootPath = Join-Path $PSScriptRoot "dist"
if (-not (Test-Path $rootPath)) {
    $rootPath = Join-Path $PSScriptRoot "app"
}
if (-not (Test-Path $rootPath)) {
    $rootPath = $PSScriptRoot
}

# 1. Проверяем наличие портативного или системного Node.js
$nodeExe = $null
$runtimeNode = Join-Path $PSScriptRoot "runtime\node.exe"
if (Test-Path $runtimeNode) {
    $nodeExe = $runtimeNode
} else {
    $sysNode = Get-Command "node" -ErrorAction SilentlyContinue
    if ($sysNode) {
        $nodeExe = "node"
    }
}

$serverCjs = Join-Path $PSScriptRoot "server.cjs"

if ($nodeExe -and (Test-Path $serverCjs)) {
    Write-Host "========================================================" -ForegroundColor Cyan
    Write-Host "       DocGen Portable - Генератор документов           " -ForegroundColor Yellow
    Write-Host "========================================================" -ForegroundColor Cyan
    Write-Host "[OK] Запуск через автономный сервер Node.js..." -ForegroundColor Green
    Write-Host "Адрес приложения: http://localhost:$port" -ForegroundColor White
    Write-Host "Для завершения работы закройте это окно." -ForegroundColor Gray
    Write-Host "========================================================" -ForegroundColor Cyan
    Write-Host ""
    
    Start-Process "http://localhost:$port"
    & $nodeExe $serverCjs
    exit
}

# 2. Если Node.js нет - запускаем встроенным .NET HttpListener
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "       DocGen Portable - Генератор документов           " -ForegroundColor Yellow
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "[OK] Запуск через встроенный компонент Windows (без Node.js)..." -ForegroundColor Green
Write-Host "Адрес приложения: http://localhost:$port" -ForegroundColor White
Write-Host "Для завершения работы закройте это окно." -ForegroundColor Gray
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

$mimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".htm"  = "text/html; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".mjs"  = "application/javascript; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".svg"  = "image/svg+xml"
    ".ico"  = "image/x-icon"
    ".docx" = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ".xlsx" = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")

try {
    $listener.Start()
} catch {
    $port = 3001
    $listener = New-Object System.Net.HttpListener
    $listener.Prefixes.Add("http://localhost:$port/")
    $listener.Start()
}

Start-Process "http://localhost:$port"

while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $rawUrl = $request.Url.LocalPath
        if ($rawUrl -eq "/" -or $rawUrl -eq "") {
            $rawUrl = "/index.html"
        }

        $decodedUrl = [System.Uri]::UnescapeDataString($rawUrl)
        $relPath = $decodedUrl.TrimStart("/").Replace("/", [System.IO.Path]::DirectorySeparatorChar)
        $filePath = Join-Path $rootPath $relPath

        if (-not (Test-Path $filePath -PathType Leaf)) {
            $filePath = Join-Path $rootPath "index.html"
        }

        if (Test-Path $filePath -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            $mime = "application/octet-stream"
            if ($mimeTypes.ContainsKey($ext)) {
                $mime = $mimeTypes[$ext]
            }

            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            $response.ContentType = $mime
            $response.ContentLength64 = $bytes.Length
            $response.AddHeader("Access-Control-Allow-Origin", "*")
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $response.StatusCode = 404
        }
        $response.Close()
    } catch {
        # Завершение при закрытии окна
    }
}
