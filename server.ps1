# ===================================================
# AYLOX IOS — Servidor Local Ligero en PowerShell
# ===================================================
# Ejecuta este archivo con:
# powershell -ExecutionPolicy Bypass -File server.ps1

$port = 8080
$folder = $PSScriptRoot

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")

try {
    $listener.Start()
    Write-Host ""
    Write-Host "==========================================================" -ForegroundColor Green
    Write-Host " 🛡️ AYLOX IOS — SERVIDOR LOCAL EN LÍNEA" -ForegroundColor Green
    Write-Host "==========================================================" -ForegroundColor Green
    Write-Host " URL del Sitio: http://localhost:$port" -ForegroundColor Cyan
    Write-Host " Carpeta Raíz : $folder" -ForegroundColor Gray
    Write-Host ""
    Write-Host " Acceso Staff (Dueño & Socios):" -ForegroundColor Yellow
    Write-Host " • Dueño PIN  : 1111 (Acceso total, edición de teléfonos y pagos)" -ForegroundColor Yellow
    Write-Host " • Socio PIN  : 2222 (Gestión de tickets y respuestas rápidas)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host " Presiona Ctrl + C en esta ventana para detener el servidor." -ForegroundColor Gray
    Write-Host "==========================================================" -ForegroundColor Green
    Write-Host ""

    # Abrir automáticamente en el navegador Microsoft Edge
    Start-Process "http://localhost:$port"

    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $path = $request.Url.LocalPath
        if ($path -eq "/" -or $path -eq "") {
            $path = "/index.html"
        }

        $localPath = Join-Path $folder $path.TrimStart('/')

        if (Test-Path $localPath -PathType Leaf) {
            $extension = [System.IO.Path]::GetExtension($localPath).ToLower()
            $contentType = switch ($extension) {
                ".html" { "text/html; charset=utf-8" }
                ".css"  { "text/css; charset=utf-8" }
                ".js"   { "application/javascript; charset=utf-8" }
                ".json" { "application/json; charset=utf-8" }
                ".jpeg" { "image/jpeg" }
                ".jpg"  { "image/jpeg" }
                ".png"  { "image/png" }
                ".svg"  { "image/svg+xml" }
                ".ico"  { "image/x-icon" }
                default { "application/octet-stream" }
            }

            $bytes = [System.IO.File]::ReadAllBytes($localPath)
            $response.ContentType = $contentType
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $response.StatusCode = 404
            $errBytes = [System.Text.Encoding]::UTF8.GetBytes("404 - Archivo no encontrado en AYLOX IOS")
            $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
        }
        $response.Close()
    }
} catch {
    Write-Host "Error en el servidor: $_" -ForegroundColor Red
} finally {
    if ($listener.IsListening) {
        $listener.Stop()
    }
}
