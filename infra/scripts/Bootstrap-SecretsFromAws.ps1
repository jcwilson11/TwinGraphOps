[CmdletBinding()]
param(
    [string]$SecretId = $env:AWS_SECRETS_MANAGER_SECRET_ID,
    [string]$Region = $env:AWS_REGION,
    [string]$SecretsDir = ""
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command aws -ErrorAction SilentlyContinue)) {
    throw "AWS CLI is required. Install it and authenticate before running this script."
}

if (-not $SecretId) {
    throw "Provide -SecretId or set AWS_SECRETS_MANAGER_SECRET_ID."
}

if (-not $SecretsDir) {
    $SecretsDir = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\secrets"))
}

$awsArgs = @(
    "secretsmanager",
    "get-secret-value",
    "--secret-id", $SecretId,
    "--query", "SecretString",
    "--output", "text"
)

if ($Region) {
    $awsArgs += @("--region", $Region)
}

$secretString = & aws @awsArgs
if ($LASTEXITCODE -ne 0) {
    throw "Failed to read '$SecretId' from AWS Secrets Manager."
}

$secretString = $secretString.Trim()
if (-not $secretString -or $secretString -eq "None") {
    throw "AWS Secrets Manager returned an empty SecretString for '$SecretId'."
}

try {
    $secret = $secretString | ConvertFrom-Json
}
catch {
    throw "SecretString must be valid JSON."
}

$neo4jUser = if ($secret.neo4j_user) {
    [string]$secret.neo4j_user
} elseif ($secret.NEO4J_USER) {
    [string]$secret.NEO4J_USER
} else {
    "neo4j"
}

$neo4jPassword = if ($secret.neo4j_password) {
    [string]$secret.neo4j_password
} elseif ($secret.NEO4J_PASSWORD) {
    [string]$secret.NEO4J_PASSWORD
} else {
    ""
}

$geminiApiKey = if ($secret.gemini_api_key) {
    [string]$secret.gemini_api_key
} elseif ($secret.GEMINI_API_KEY) {
    [string]$secret.GEMINI_API_KEY
} else {
    ""
}

$grafanaAdminUser = if ($secret.grafana_admin_user) {
    [string]$secret.grafana_admin_user
} elseif ($secret.GRAFANA_ADMIN_USER) {
    [string]$secret.GRAFANA_ADMIN_USER
} else {
    ""
}

$grafanaAdminPassword = if ($secret.grafana_admin_password) {
    [string]$secret.grafana_admin_password
} elseif ($secret.GRAFANA_ADMIN_PASSWORD) {
    [string]$secret.GRAFANA_ADMIN_PASSWORD
} else {
    ""
}

if (-not $neo4jPassword) {
    throw "The secret must contain neo4j_password (or NEO4J_PASSWORD)."
}

if ($neo4jUser -ne "neo4j") {
    Write-Warning "NEO4J_USER must be 'neo4j' for the local Compose-backed Neo4j instance. Using 'neo4j'."
    $neo4jUser = "neo4j"
}

if (-not $geminiApiKey) {
    $geminiApiKey = "replace-me"
}

if (-not $grafanaAdminUser) {
    throw "The secret must contain grafana_admin_user (or GRAFANA_ADMIN_USER)."
}

if (-not $grafanaAdminPassword) {
    throw "The secret must contain grafana_admin_password (or GRAFANA_ADMIN_PASSWORD)."
}

New-Item -ItemType Directory -Force -Path $SecretsDir | Out-Null
[System.IO.File]::WriteAllText((Join-Path $SecretsDir "neo4j_auth.txt"), "$neo4jUser/$neo4jPassword")
[System.IO.File]::WriteAllText((Join-Path $SecretsDir "neo4j_user.txt"), $neo4jUser)
[System.IO.File]::WriteAllText((Join-Path $SecretsDir "neo4j_password.txt"), $neo4jPassword)
[System.IO.File]::WriteAllText((Join-Path $SecretsDir "gemini_api_key.txt"), $geminiApiKey)
[System.IO.File]::WriteAllText((Join-Path $SecretsDir "grafana_admin_user.txt"), $grafanaAdminUser)
[System.IO.File]::WriteAllText((Join-Path $SecretsDir "grafana_admin_password.txt"), $grafanaAdminPassword)

Write-Host "Wrote:"
Write-Host "  - $(Join-Path $SecretsDir 'neo4j_auth.txt')"
Write-Host "  - $(Join-Path $SecretsDir 'neo4j_user.txt')"
Write-Host "  - $(Join-Path $SecretsDir 'neo4j_password.txt')"
Write-Host "  - $(Join-Path $SecretsDir 'gemini_api_key.txt')"
Write-Host "  - $(Join-Path $SecretsDir 'grafana_admin_user.txt')"
Write-Host "  - $(Join-Path $SecretsDir 'grafana_admin_password.txt')"
