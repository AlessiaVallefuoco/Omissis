# Omissis demo - local web server for Windows (PowerShell 5.1 or newer, nothing to install).
# Started by start-windows.bat. Uses Python if it is installed, otherwise a built-in .NET server.
# It only listens on this computer (localhost), never on the network.

$ErrorActionPreference = 'Stop'
$root = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
Set-Location -LiteralPath $root
try { $host.UI.RawUI.WindowTitle = 'Omissis demo' } catch { }

function Get-FreePort {
    param([int]$From = 8000)
    for ($p = $From; $p -lt ($From + 100); $p++) {
        try {
            $probe = New-Object -TypeName System.Net.Sockets.TcpListener -ArgumentList ([System.Net.IPAddress]::Loopback), $p
            $probe.Start()
            $probe.Stop()
            return $p
        } catch { }
    }
    throw 'No free local port between 8000 and 8099.'
}

function Find-Python {
    foreach ($candidate in @('py -3', 'python', 'python3')) {
        $parts = $candidate.Split(' ')
        $exe = $parts[0]
        if (-not (Get-Command $exe -ErrorAction SilentlyContinue)) { continue }
        $extra = @()
        if ($parts.Length -gt 1) { $extra = @($parts[1..($parts.Length - 1)]) }
        try {
            $out = & $exe @extra -c "import sys; print(sys.version_info[0])" 2>$null
            if ("$out".Trim() -eq '3') { return [pscustomobject]@{ Exe = $exe; Extra = $extra } }
        } catch { }
    }
    return $null
}

$port = Get-FreePort 8000
$py = Find-Python

Write-Host ''
Write-Host '  Omissis demo' -ForegroundColor Cyan
Write-Host '  Keep this window open during the demo. Close it to stop the server.'
Write-Host ''

if ($py) {
    # 1) Python is installed: use its web server (same as on the Mac)
    $url = "http://127.0.0.1:$port/"
    Write-Host "  Serving with Python on $url"
    Start-Process -WindowStyle Hidden -FilePath 'powershell.exe' -ArgumentList @('-NoProfile', '-Command', "Start-Sleep -Seconds 2; Start-Process '$url'")
    $ErrorActionPreference = 'Continue'
    $pyArgs = @($py.Extra) + @('-m', 'http.server', "$port", '--bind', '127.0.0.1')
    & $py.Exe @pyArgs
    exit $LASTEXITCODE
}

# 2) No Python: small static file server built on .NET HttpListener
$url = "http://localhost:$port/"
$listener = New-Object -TypeName System.Net.HttpListener
$listener.Prefixes.Add($url)
try {
    $listener.Start()
} catch {
    Write-Host "  Could not start the built-in server: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host '  Alternative: double-click index.html to open the demo directly in Edge or Chrome.' -ForegroundColor Yellow
    exit 1
}
Write-Host "  Serving on $url"
Start-Process $url

$types = @{
    '.html'  = 'text/html; charset=utf-8'
    '.js'    = 'text/javascript; charset=utf-8'
    '.css'   = 'text/css; charset=utf-8'
    '.json'  = 'application/json'
    '.woff2' = 'font/woff2'
    '.png'   = 'image/png'
    '.svg'   = 'image/svg+xml'
    '.md'    = 'text/plain; charset=utf-8'
    '.txt'   = 'text/plain; charset=utf-8'
    '.ico'   = 'image/x-icon'
}
$sep = [string][System.IO.Path]::DirectorySeparatorChar
$rootPrefix = $root.TrimEnd([System.IO.Path]::DirectorySeparatorChar) + $sep

try {
    while ($listener.IsListening) {
        $pending = $listener.GetContextAsync()
        while (-not $pending.Wait(250)) { }
        $ctx = $pending.Result
        $res = $ctx.Response
        try {
            $rel = [System.Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath).TrimStart('/')
            if ($rel -eq '') { $rel = 'index.html' }
            $file = [System.IO.Path]::GetFullPath([System.IO.Path]::Combine($root, $rel.Replace('/', $sep)))
            if ($file.StartsWith($rootPrefix, [System.StringComparison]::OrdinalIgnoreCase) -and [System.IO.File]::Exists($file)) {
                $ext = [System.IO.Path]::GetExtension($file).ToLowerInvariant()
                if ($types.ContainsKey($ext)) { $res.ContentType = $types[$ext] } else { $res.ContentType = 'application/octet-stream' }
                $res.AddHeader('Cache-Control', 'no-cache')
                $body = [System.IO.File]::ReadAllBytes($file)
            } else {
                $res.StatusCode = 404
                $body = [System.Text.Encoding]::UTF8.GetBytes('Not found')
            }
            $res.ContentLength64 = $body.Length
            $res.OutputStream.Write($body, 0, $body.Length)
        } catch {
            try { $res.StatusCode = 500 } catch { }
        } finally {
            try { $res.Close() } catch { }
        }
    }
} finally {
    $listener.Stop()
    $listener.Close()
}
