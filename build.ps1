<#
.SYNOPSIS
    Build script for the FabMo Cutting Settings App.
    Produces a .fma install package (zip) in the ./build folder.

.PARAMETER Clean
    Remove the build folder before building.

.PARAMETER Version
    Override the version string embedded in the package name.
    Defaults to the version in package.json.

.EXAMPLE
    .\build.ps1
    .\build.ps1 -Clean
    .\build.ps1 -Version "1.2.3"
#>
[CmdletBinding()]
param(
    [switch]$Clean,
    [string]$Version
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

# ── Paths ────────────────────────────────────────────────────────────────────
$projectRoot = $PSScriptRoot
$buildDir    = Join-Path $projectRoot 'build'
$pkgJson     = Get-Content (Join-Path $projectRoot 'package.json') -Raw | ConvertFrom-Json
$appName     = $pkgJson.name
$appVersion  = if ($Version) { $Version } else { $pkgJson.version }
$safeName    = $appName -replace '\s+', '_'
$fmaFile     = Join-Path $buildDir "$safeName-v$appVersion.fma"

# Files and folders to include in the .fma package
$includeItems = @(
    'index.html'
    'package.json'
    'Icon.png'
    'Icon 5 Axis.png'
    'Icon Buddy.png'
    'Icon Desktop.png'
    'Icon Gantry.png'
    'Icon Handibot.png'
    'js'
    'fonts'
    'files'
)

# ── Clean ────────────────────────────────────────────────────────────────────
if ($Clean -and (Test-Path $buildDir)) {
    Write-Host "Cleaning build directory..." -ForegroundColor Yellow
    Remove-Item $buildDir -Recurse -Force
}

# ── Ensure build dir exists ─────────────────────────────────────────────────
if (-not (Test-Path $buildDir)) { New-Item -ItemType Directory -Path $buildDir -Force | Out-Null }

# Remove previous .fma with the same name if it exists
if (Test-Path $fmaFile) { Remove-Item $fmaFile -Force }

Write-Host "Creating $($safeName)-v$appVersion.fma ..." -ForegroundColor Cyan

# ── Build zip directly from source (no staging) ─────────────────────────────
# Using .NET ZipArchive to avoid Dropbox file-locking issues with
# Compress-Archive and to support non-.zip extensions directly.

$zipStream = $null
$archive   = $null

try {
    $zipStream = [System.IO.File]::Create($fmaFile)
    $archive   = New-Object System.IO.Compression.ZipArchive($zipStream, [System.IO.Compression.ZipArchiveMode]::Create)

    foreach ($item in $includeItems) {
        $src = Join-Path $projectRoot $item
        if (-not (Test-Path $src)) {
            Write-Warning "Skipping missing item: $item"
            continue
        }

        if (Test-Path $src -PathType Container) {
            # Add all files in the directory recursively
            $dirFiles = Get-ChildItem $src -Recurse -File
            foreach ($f in $dirFiles) {
                $entryName = $item + '/' + $f.FullName.Substring((Resolve-Path $src).Path.Length + 1).Replace('\', '/')
                $entry = $archive.CreateEntry($entryName)
                $fileBytes = [System.IO.File]::ReadAllBytes($f.FullName)
                $entryStream = $entry.Open()
                try {
                    $entryStream.Write($fileBytes, 0, $fileBytes.Length)
                } finally {
                    $entryStream.Close()
                    $entryStream.Dispose()
                }
            }
        } else {
            # Single file
            $entryName = $item.Replace('\', '/')
            $entry = $archive.CreateEntry($entryName)
            $fileBytes = [System.IO.File]::ReadAllBytes($src)
            $entryStream = $entry.Open()
            try {
                $entryStream.Write($fileBytes, 0, $fileBytes.Length)
            } finally {
                $entryStream.Close()
                $entryStream.Dispose()
            }
        }
    }
} finally {
    if ($archive)   { $archive.Dispose() }
    if ($zipStream) { $zipStream.Dispose() }
}

# ── Done ─────────────────────────────────────────────────────────────────────
$size = (Get-Item $fmaFile).Length
$sizeKB = [math]::Round($size / 1KB, 1)
Write-Host ""
Write-Host "Build complete: $fmaFile ($sizeKB KB)" -ForegroundColor Green