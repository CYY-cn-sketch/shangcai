$ErrorActionPreference = "Stop"

$envFile = Join-Path $PSScriptRoot ".env.local"
if (-not (Test-Path -LiteralPath $envFile)) {
    throw "Missing local environment file: $envFile"
}

foreach ($line in Get-Content -LiteralPath $envFile -Encoding UTF8) {
    if ([string]::IsNullOrWhiteSpace($line) -or $line.TrimStart().StartsWith("#")) {
        continue
    }

    $parts = $line.Split("=", 2)
    if ($parts.Count -ne 2 -or [string]::IsNullOrWhiteSpace($parts[0])) {
        throw "Invalid environment entry in $envFile"
    }

    [Environment]::SetEnvironmentVariable($parts[0], $parts[1], "Process")
}

$jar = Get-ChildItem -LiteralPath (Join-Path $PSScriptRoot "target") -Filter "*.jar" |
    Where-Object { $_.Name -notlike "*.original" } |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1

if (-not $jar) {
    throw "Backend jar not found. Run .\mvnw.cmd package first."
}

& java -jar $jar.FullName --spring.profiles.active=mysql-local
exit $LASTEXITCODE
