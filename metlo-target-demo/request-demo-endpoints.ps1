param(
    [Parameter(Mandatory = $true)]
    [string]$BaseUrl
)

$ErrorActionPreference = "Stop"
$base = $BaseUrl.TrimEnd("/")

Write-Host "Sending requests to $base. Scan this exact URL in the portal."

$verification = Invoke-RestMethod -Uri "$base/debug/metlo"
$verification | ConvertTo-Json -Depth 5

if (-not $verification.authorized) {
    throw "Metlo collector verification failed. Resolve it before sending endpoint traffic."
}

$paths = @("/", "/health", "/users", "/orders", "/search?q=test")
foreach ($path in $paths) {
    Write-Host "Requesting $base$path"
    Invoke-RestMethod -Uri "$base$path" | Out-Null
    Start-Sleep -Seconds 2
}

Write-Host "Requests sent. Wait a few seconds, then refresh Metlo Web and scan $base in Netra-Thip."
