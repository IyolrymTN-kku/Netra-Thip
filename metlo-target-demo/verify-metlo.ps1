$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath ".env")) {
    throw "Missing .env. Copy .env.example to .env and add a valid METLO_API_KEY first."
}

$keyLine = (Get-Content -LiteralPath ".env" | Select-String "^METLO_API_KEY=").Line
$hostLine = (Get-Content -LiteralPath ".env" | Select-String "^METLO_HOST=").Line

if (-not $keyLine -or -not $hostLine) {
    throw "METLO_HOST and METLO_API_KEY are required in .env."
}

$apiKey = ($keyLine -split "=", 2)[1].Trim()
$collectorUrl = ($hostLine -split "=", 2)[1].Trim().TrimEnd("/")

$response = Invoke-WebRequest -Uri "$collectorUrl/api/v1/verify" -Headers @{ Authorization = $apiKey }

Write-Host "Collector: $collectorUrl"
Write-Host "Status:    $($response.StatusCode)"
Write-Host "Response:  $($response.Content)"
