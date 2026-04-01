<#
backup-project.ps1
Create a timestamped backup ZIP of the project root.
- Excludes node_modules and .git by default
- Copies .env files (if present)
- Attempts a mongodump if mongodump is available on PATH
- Places outputs in ./backups/devlink_backup_<timestamp>.zip

Usage (PowerShell):
  cd "C:\Users\Lenovo\OneDrive\Desktop\devlink by deep"
  .\backup-project.ps1

#>

param(
    [string]$OutputDir = "$(Join-Path $PSScriptRoot 'backups')",
    [switch]$IncludeNodeModules = $false,
    [switch]$RunMongoDump = $false
)

function Write-Log { param($m) Write-Host "[backup] $m" }

# timestamp
$ts = Get-Date -Format 'yyyyMMdd_HHmmss'
if (-not (Test-Path $OutputDir)) { New-Item -ItemType Directory -Path $OutputDir | Out-Null }
$zipName = "devlink_backup_$ts.zip"
$zipPath = Join-Path $OutputDir $zipName
$tmpEnvDir = Join-Path $OutputDir "env_copy_$ts"

Write-Log "Creating backup at: $zipPath"

# Copy .env files if present (root and frontend)
$envFiles = @('.env', 'frontend\.env', 'frontend\.env.local')
New-Item -ItemType Directory -Path $tmpEnvDir -Force | Out-Null
foreach ($f in $envFiles) {
    $p = Join-Path $PSScriptRoot $f
    if (Test-Path $p) {
        Write-Log "Including env file: $f"
        $target = Join-Path $tmpEnvDir (Split-Path $f -Leaf)
        Copy-Item -Path $p -Destination $target -Force
    }
}

# Optionally run mongodump (only if user requests or mongodump present)
$dumpDir = Join-Path $OutputDir "mongodump_$ts"
if ($RunMongoDump -or (Get-Command mongodump -ErrorAction SilentlyContinue)) {
    $mdCmd = Get-Command mongodump -ErrorAction SilentlyContinue
    if ($mdCmd) {
        Write-Log "mongodump found. Attempting DB dump to $dumpDir"
        # Try common env vars for URI
        $uri = $env:MONGODB_URI
        if (-not $uri) { $uri = $env:MONGO_URL }
        if (-not $uri) { $uri = "mongodb://localhost:27017/devlink" }
        try {
            New-Item -ItemType Directory -Path $dumpDir -Force | Out-Null
            mongodump --uri="$uri" --out="$dumpDir"
            Write-Log "mongodump completed"
        } catch {
            Write-Log "mongodump failed: $($_.Exception.Message)"
            Remove-Item -Recurse -Force $dumpDir -ErrorAction SilentlyContinue
        }
    } else {
        Write-Log "mongodump not found on PATH; skipping DB dump"
    }
}

# Collect files to compress
Write-Log "Collecting files to archive (excluding node_modules and .git unless requested)"
$excludePatterns = @('\\node_modules\\', '\\.git\\')
if ($IncludeNodeModules) { $excludePatterns = @() }

# Get all file paths while respecting excludes
$paths = Get-ChildItem -Path $PSScriptRoot -Recurse -File -Force | Where-Object {
    $full = $_.FullName
    # exclude the backups folder itself
    if ($full -like "$OutputDir*") { return $false }
    foreach ($pat in $excludePatterns) { if ($full -match $pat) { return $false } }
    return $true
} | Select-Object -ExpandProperty FullName

# Add any temp env files and dump dir to the list
$extra = @()
if (Test-Path $tmpEnvDir) { $extra += (Get-ChildItem -Path $tmpEnvDir -File -Recurse | Select-Object -ExpandProperty FullName) }
if (Test-Path $dumpDir) { $extra += (Get-ChildItem -Path $dumpDir -File -Recurse | Select-Object -ExpandProperty FullName) }

$allPaths = @()
$allPaths += $paths
$allPaths += $extra

if ($allPaths.Count -eq 0) {
    Write-Log "No files found to archive. Aborting."
    exit 1
}

# Create the zip
try {
    # Compress-Archive can accept an array of full paths
    Compress-Archive -Path $allPaths -DestinationPath $zipPath -Force
    Write-Log "Project archive created: $zipPath"
} catch {
    Write-Log "Compress-Archive failed: $($_.Exception.Message)"
    exit 1
}

# Cleanup temp env and dump dirs (keep the zip only)
try {
    Remove-Item -Recurse -Force $tmpEnvDir -ErrorAction SilentlyContinue
    Remove-Item -Recurse -Force $dumpDir -ErrorAction SilentlyContinue
} catch {}

Write-Log "Backup complete. Files located at: $zipPath"
Write-Log "Tip: move the zip file to an external drive or cloud storage for safe keeping"

exit 0
