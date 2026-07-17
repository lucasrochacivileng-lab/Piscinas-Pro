[CmdletBinding()]
param(
  [Parameter(Mandatory)]
  [string]$BackupDirectory,
  [string]$TargetDatabaseUrl = $env:POOLSTRUCT_RECOVERY_DATABASE_URL,
  [switch]$ConfirmIsolatedTarget
)

$ErrorActionPreference = "Stop"
$backupPath = [System.IO.Path]::GetFullPath($BackupDirectory)
if (-not $ConfirmIsolatedTarget) {
  throw "A restauracao so e permitida com -ConfirmIsolatedTarget em um banco vazio e descartavel."
}
if (-not $TargetDatabaseUrl) {
  throw "Defina POOLSTRUCT_RECOVERY_DATABASE_URL ou informe -TargetDatabaseUrl."
}

$manifestPath = Join-Path $backupPath "manifest.json"
if (-not (Test-Path -LiteralPath $manifestPath)) {
  throw "manifest.json nao encontrado em $backupPath"
}
$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
if ($manifest.formatVersion -ne 1 -or $manifest.product -ne "POOLSTRUCT") {
  throw "Manifesto de backup incompativel."
}

foreach ($file in $manifest.files) {
  $path = Join-Path $backupPath $file.name
  if (-not (Test-Path -LiteralPath $path)) { throw "Arquivo ausente: $($file.name)" }
  $actualHash = (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($actualHash -ne $file.sha256) { throw "Hash invalido: $($file.name)" }
}

$psql = (Get-Command psql -ErrorAction Stop).Source
$restoreFiles = @("roles.sql", "schema.sql", "data.sql")
$arguments = @(
  "--single-transaction",
  "--variable", "ON_ERROR_STOP=1",
  "--dbname=$TargetDatabaseUrl"
)
foreach ($name in $restoreFiles) {
  $arguments += @("--file", (Join-Path $backupPath $name))
}

& $psql @arguments
if ($LASTEXITCODE -ne 0) { throw "A restauracao transacional falhou e foi revertida." }

$healthQuery = @"
select json_build_object(
  'projects', (select count(*) from public.projects),
  'revisions', (select count(*) from public.project_revisions),
  'runs', (select count(*) from public.calculation_runs),
  'rls_tables', (select count(*) from pg_class where relnamespace = 'public'::regnamespace and relrowsecurity)
);
"@
& $psql "--dbname=$TargetDatabaseUrl" --tuples-only --no-align --command $healthQuery
if ($LASTEXITCODE -ne 0) { throw "A verificacao pos-restauracao falhou." }

Write-Host "Drill de recuperacao concluido. Registre duracao, RPO observado e evidencia no runbook."
