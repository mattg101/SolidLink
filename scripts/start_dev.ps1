$ErrorActionPreference = "Stop"

# 1. Check for Admin privileges (needed for RegAsm)
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Warning "This script requires Administrator privileges to register the Add-in (RegAsm)."
    Write-Warning "Please run PowerShell as Administrator."
    # Don't exit, might just want to build/launch if already reg'd, but warn heavily
    Write-Host "Continuing, but RegAsm may fail..." -ForegroundColor Yellow
}

$root = Resolve-Path "$PSScriptRoot\.."

# 2. Build Solution
Write-Host "`n[1/4] Building Solution..." -ForegroundColor Cyan
$msbuild = "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\MSBuild.exe"
$roslyn = Join-Path $root "packages\Microsoft.Net.Compilers.3.11.0\tools"
$sln = Join-Path $root "SolidLink.sln"

& $msbuild $sln /p:Configuration=Debug /p:Platform=x64 /p:CscToolPath=$roslyn /p:CscToolExe="csc.exe" /v:minimal /nologo

if ($LASTEXITCODE -ne 0) {
    Write-Error "Build failed."
    exit $LASTEXITCODE
}

# 3. Register Add-in
Write-Host "`n[2/4] Registering Add-in (RegAsm)..." -ForegroundColor Cyan
$regasm = "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\RegAsm.exe"
$dll = Join-Path $root "SolidLink.Addin\bin\x64\Debug\SolidLink.Addin.dll"

if (-not (Test-Path $dll)) {
    Write-Error "DLL not found at $dll"
    exit 1
}

# Only run RegAsm if we have admin, otherwise hope it's done
if ($currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    & $regasm /codebase /nologo $dll
} else {
    Write-Warning "Skipping RegAsm (no admin rights)."
}

# 4. Start UI Server
Write-Host "`n[3/4] Starting UI Server (npm run dev)..." -ForegroundColor Cyan
$uiDir = Join-Path $root "SolidLink.UI"
# Start-Process doesn't block
$npmProcess = Start-Process -FilePath "npm.cmd" -ArgumentList "run dev" -WorkingDirectory $uiDir -PassThru -WindowStyle Minimized
Write-Host "UI Server started (PID: $($npmProcess.Id)). Window minimized."

# 5. Launch SolidWorks
Write-Host "`n[4/4] Launching SolidWorks..." -ForegroundColor Cyan

# 3DEXPERIENCE Launcher (Primary)
$catStart = "C:\Program Files\Dassault Systemes\SOLIDWORKS 3DEXPERIENCE R2026x\win_b64\code\bin\CATSTART.exe"
# Standard Desktop Launcher (Fallback)
$stdPaths = @(
    "C:\Program Files\SOLIDWORKS Corp\SOLIDWORKS\SLDWORKS.exe",
    "C:\Program Files\Dassault Systemes\SOLIDWORKS 3DEXPERIENCE R2026x\SOLIDWORKS\SLDWORKS.exe"
)

if (Test-Path $catStart) {
    Write-Host "Found 3DEXPERIENCE Launcher: $catStart"
    
    # Arguments for 3DEXPERIENCE maker/cloud edition
    # Note: Using single quotes for outer PowerShell string to handle inner quotes easier
    $argsList = @(
        "-run", 
        '"SWXDesktopLauncher.exe"', 
        "-object", 
        '"--AppName=\"SWXCSWK_AP\" -tenant=OI000026449 -monoapp -3DRegistryURL=https://eu1-makers-registry.3dexperience.3ds.com"', 
        "-nowindow"
    )
    
    Start-Process -FilePath $catStart -ArgumentList $argsList
} else {
    $swExe = $null
    foreach ($path in $stdPaths) {
        if (Test-Path $path) {
            $swExe = $path
            break
        }
    }

    if ($swExe) {
        Write-Host "Found Desktop SolidWorks at: $swExe"
        Start-Process $swExe
    } else {
        Write-Warning "Could not automatically locate CATSTART.exe or SLDWORKS.exe."
        Write-Host "Please launch SolidWorks manually."
    }
}

Write-Host "`nReady! Enable 'SolidLink' in Tools > Add-ins." -ForegroundColor Green
