param(
  [string]$ContainerName = "scylladb",
  [string]$Image = "scylladb/scylla:latest",
  [string]$Keyspace = "online_travel_services",
  [string]$SchemaPath = ".\schema.cql",
  [int]$ReadyTimeoutSeconds = 180,
  [int]$CqlRequestTimeoutSeconds = 120,
  [int]$SchemaOperationRetries = 6,
  [int]$SchemaOperationRetryDelaySeconds = 10,
  [switch]$DropKeyspaceFirst
)

$ErrorActionPreference = "Stop"

$script:DockerViaWsl = $false

function Initialize-DockerCommand {
  if (Get-Command docker -CommandType Application -ErrorAction SilentlyContinue) {
    $script:DockerViaWsl = $false
    return
  }

  if (Get-Command wsl -ErrorAction SilentlyContinue) {
    $script:DockerViaWsl = $true
    return
  }

  throw "Docker was not found. Install Docker Desktop or enable Docker inside WSL."
}

function Invoke-Docker {
  param(
    [Parameter(Mandatory = $true)]
    [string[]]$Arguments
  )

  if ($script:DockerViaWsl) {
    & wsl docker @Arguments
  } else {
    & docker @Arguments
  }

  if ($LASTEXITCODE -ne 0) {
    throw "Docker command failed: docker $($Arguments -join ' ')"
  }
}

function Convert-PathForDockerCopy {
  param([string]$Path)

  $resolved = (Resolve-Path $Path).Path

  if (-not $script:DockerViaWsl) {
    return $resolved
  }

  if ($resolved -match "^([A-Za-z]):\\(.*)$") {
    $drive = $Matches[1].ToLowerInvariant()
    $pathPart = $Matches[2] -replace "\\", "/"
    return "/mnt/$drive/$pathPart"
  }

  throw "Could not convert Windows path for WSL: $resolved"
}

function Wait-ForScylla {
  $deadline = (Get-Date).AddSeconds($ReadyTimeoutSeconds)
  Write-Host "Waiting for ScyllaDB CQL service in container '$ContainerName'..."

  while ((Get-Date) -lt $deadline) {
    try {
      Invoke-Cqlsh -Arguments @("-e", "DESCRIBE KEYSPACES;") | Out-Null
      Write-Host "ScyllaDB is ready."
      return
    } catch {
      Start-Sleep -Seconds 2
    }
  }

  throw "ScyllaDB did not become ready within $ReadyTimeoutSeconds seconds."
}

function Invoke-Cqlsh {
  param(
    [Parameter(Mandatory = $true)]
    [string[]]$Arguments
  )

  $dockerArguments = @(
    "exec",
    $ContainerName,
    "cqlsh",
    "--request-timeout=$CqlRequestTimeoutSeconds"
  ) + $Arguments

  Invoke-Docker -Arguments $dockerArguments
}

function Invoke-CqlshWithRetry {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Description,
    [Parameter(Mandatory = $true)]
    [string[]]$Arguments
  )

  for ($attempt = 1; $attempt -le $SchemaOperationRetries; $attempt++) {
    try {
      Invoke-Cqlsh -Arguments $Arguments
      return
    } catch {
      if ($attempt -eq $SchemaOperationRetries) {
        throw
      }

      $delaySeconds = $SchemaOperationRetryDelaySeconds * $attempt
      Write-Warning "$Description failed on attempt $attempt/$SchemaOperationRetries. Retrying in $delaySeconds seconds..."
      Start-Sleep -Seconds $delaySeconds
    }
  }
}

function Get-ProjectTables {
  $query = "SELECT table_name FROM system_schema.tables WHERE keyspace_name = '$Keyspace';"
  $output = Invoke-CqlshWithRetry -Description "Listing tables in keyspace '$Keyspace'" -Arguments @("-e", $query)

  $tables = @()
  foreach ($line in $output) {
    $tableName = $line.Trim()
    if ($tableName -match "^[A-Za-z][A-Za-z0-9_]*$" -and $tableName -ne "table_name") {
      $tables += $tableName
    }
  }

  return $tables
}

function Clear-ProjectTables {
  $tables = Get-ProjectTables

  if (-not $tables -or $tables.Count -eq 0) {
    throw "No tables found in keyspace '$Keyspace' after loading schema."
  }

  Write-Host "Clearing data from $($tables.Count) project tables..."

  $truncateScript = New-TemporaryFile
  try {
    $truncateStatements = foreach ($table in $tables) {
      "TRUNCATE TABLE $Keyspace.$table;"
    }

    Set-Content -LiteralPath $truncateScript -Value $truncateStatements -Encoding ascii

    $truncateScriptForCopy = Convert-PathForDockerCopy $truncateScript
    $containerTruncatePath = "/tmp/online_travel_services_truncate.cql"

    Invoke-Docker -Arguments @("cp", $truncateScriptForCopy, "$ContainerName`:$containerTruncatePath") | Out-Null
    Invoke-CqlshWithRetry `
      -Description "Truncating project tables in keyspace '$Keyspace'" `
      -Arguments @("-f", $containerTruncatePath) | Out-Null
  } finally {
    Remove-Item -LiteralPath $truncateScript -Force -ErrorAction SilentlyContinue
  }
}

Initialize-DockerCommand

if (-not (Test-Path $SchemaPath)) {
  throw "Schema file not found: $SchemaPath"
}

$existingContainer = Invoke-Docker -Arguments @("ps", "-a", "--filter", "name=^/$ContainerName$", "--format", "{{.Names}}")

if (-not $existingContainer) {
  Write-Host "Container '$ContainerName' not found. Creating it..."
  Invoke-Docker -Arguments @(
    "run", "-d",
    "--name", $ContainerName,
    "-p", "9042:9042",
    "-p", "9180:9180",
    "--restart", "unless-stopped",
    $Image,
    "--smp", "2",
    "--memory", "4G",
    "--overprovisioned", "1"
  ) | Out-Null
} else {
  $runningContainer = Invoke-Docker -Arguments @("ps", "--filter", "name=^/$ContainerName$", "--filter", "status=running", "--format", "{{.Names}}")
  if (-not $runningContainer) {
    Write-Host "Starting existing container '$ContainerName'..."
    Invoke-Docker -Arguments @("start", $ContainerName) | Out-Null
  } else {
    Write-Host "Using running container '$ContainerName'."
  }
}

Wait-ForScylla
Start-Sleep -Seconds 5

$schemaForCopy = Convert-PathForDockerCopy $SchemaPath
$containerSchemaPath = "/tmp/online_travel_services_schema.cql"

Write-Host "Copying schema to container..."
Invoke-Docker -Arguments @("cp", $schemaForCopy, "$ContainerName`:$containerSchemaPath") | Out-Null

if ($DropKeyspaceFirst) {
  Write-Host "Dropping only project keyspace '$Keyspace'..."
  Invoke-CqlshWithRetry `
    -Description "Dropping keyspace '$Keyspace'" `
    -Arguments @("-e", "DROP KEYSPACE IF EXISTS $Keyspace;") | Out-Null
}

Write-Host "Loading schema if needed..."
Invoke-CqlshWithRetry `
  -Description "Loading schema '$containerSchemaPath'" `
  -Arguments @("-f", $containerSchemaPath) | Out-Null

Clear-ProjectTables

Write-Host "Database reset complete for keyspace '$Keyspace'."
