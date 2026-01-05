$ErrorActionPreference = "Stop"

# Ensure we are admin
if (!([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Start-Process powershell.exe "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`"" -Verb RunAs
    exit
}

$projectDir = Convert-Path (Join-Path $PSScriptRoot "..\SolidLink.Addin")
$dllPath = Join-Path $projectDir "bin\x64\Debug\SolidLink.Addin.dll"
$regasm = "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\RegAsm.exe"

Write-Host "Registering SolidLink..." -ForegroundColor Cyan
Write-Host "DLL: $dllPath"

if (!(Test-Path $dllPath)) {
    Write-Error "DLL not found! Build the project first."
}

# Unregister first to clean up
& $regasm /u "$dllPath"

# Register with codebase
& $regasm /codebase "$dllPath"

if ($LASTEXITCODE -eq 0) {
    Write-Host "Registration Successful!" -ForegroundColor Green
    Write-Host "You can now open SolidWorks." -ForegroundColor Yellow
} else {
    Write-Error "Registration Failed."
}

Read-Host "Press Enter to exit..."
