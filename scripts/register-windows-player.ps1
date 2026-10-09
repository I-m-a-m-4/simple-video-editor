# Windows PowerShell script to register AmberCut as a Video Player in Windows "Open with" menu
# Run this script to associate .mp4, .mkv, .mov, .webm, .avi with AmberCut!

param(
    [string]$AppExecutable = ""
)

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  AmberCut Windows Video Player Setup     " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# Locate executable if not provided
if (-not $AppExecutable) {
    $possiblePaths = @(
        "$PSScriptRoot\..\target\release\AmberCut.exe",
        "$PSScriptRoot\..\src-tauri\target\release\AmberCut.exe",
        "$env:LOCALAPPDATA\Programs\AmberCut\AmberCut.exe"
    )
    foreach ($p in $possiblePaths) {
        if (Test-Path $p) {
            $AppExecutable = (Resolve-Path $p).Path
            break
        }
    }
}

$ProgId = "AmberCut.Video"
$VideoExtensions = @(".mp4", ".mkv", ".mov", ".webm", ".avi", ".m4v", ".wmv")

try {
    # 1. Create ProgId entry
    $progPath = "HKCU:\Software\Classes\$ProgId"
    New-Item -Path $progPath -Force | Out-Null
    Set-ItemProperty -Path $progPath -Name "(Default)" -Value "AmberCut Video Media"

    # Command
    $cmdPath = "$progPath\shell\open\command"
    New-Item -Path $cmdPath -Force | Out-Null
    
    if ($AppExecutable -and (Test-Path $AppExecutable)) {
        Set-ItemProperty -Path $cmdPath -Name "(Default)" -Value "`"$AppExecutable`" `"%1`""
        Write-Host "Configured file execution target: $AppExecutable" -ForegroundColor Green
    } else {
        # Fallback to local player web URL runner
        $webCmd = "cmd.exe /c start http://localhost:3000/player"
        Set-ItemProperty -Path $cmdPath -Name "(Default)" -Value "$webCmd"
        Write-Host "Configured player target for AmberCut Player." -ForegroundColor Yellow
    }

    # 2. Register OpenWithProgids for each video extension
    foreach ($ext in $VideoExtensions) {
        $extPath = "HKCU:\Software\Classes\$ext\OpenWithProgids"
        if (-not (Test-Path $extPath)) {
            New-Item -Path $extPath -Force | Out-Null
        }
        New-ItemProperty -Path $extPath -Name $ProgId -PropertyType String -Value "" -Force | Out-Null
        Write-Host "Associated $ext with AmberCut Video Player" -ForegroundColor Gray
    }

    # 3. Add to Applications list
    $appRegPath = "HKCU:\Software\Classes\Applications\AmberCut.exe\shell\open\command"
    New-Item -Path $appRegPath -Force | Out-Null
    if ($AppExecutable) {
        Set-ItemProperty -Path $appRegPath -Name "(Default)" -Value "`"$AppExecutable`" `"%1`""
    }

    Write-Host ""
    Write-Host "Success! AmberCut is now registered with Windows Open with!" -ForegroundColor Green
    Write-Host "You can now right-click any video in Windows Explorer -> Open with -> AmberCut." -ForegroundColor Cyan
} catch {
    Write-Error "Failed to update registry: $_"
}
