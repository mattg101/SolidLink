---
name: build-addin
description: Build, register, and launch the SolidLink environment.
---
# SolidLink Development Workflow

This skill covers building the C# add-in, registering it, and launching the full development environment (UI + SolidWorks).

## Quick Start (PowerShell)

Run the automated dev script from the repo root (Administrator privileges required for RegAsm):

```powershell
.\scripts\start_dev.ps1
```

This script will:
1.  **Build** the solution (`SolidLink.sln`).
2.  **Register** the DLL with COM (`RegAsm /codebase`).
3.  **Start** the UI server (`npm run dev`) in the background.
4.  **Launch** SolidWorks (supports 3DEXPERIENCE via `CATSTART.exe` or standard `SLDWORKS.exe`).

## Manual Steps

### 1. Build
```powershell
$roslynPath = "$PWD\packages\Microsoft.Net.Compilers.3.11.0\tools"
& "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\MSBuild.exe" SolidLink.sln /p:Configuration=Debug /p:Platform=x64 /p:CscToolPath=$roslynPath /p:CscToolExe="csc.exe" /v:minimal
```

### 2. Register (Admin required)
```powershell
& "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\RegAsm.exe" /codebase "SolidLink.Addin\bin\x64\Debug\SolidLink.Addin.dll"
```

### 3. Start UI
```bash
cd SolidLink.UI
npm run dev
```

### 4. Enable in SolidWorks
- Open **Tools > Add-ins**.
- Check **SolidLink** (Active Add-ins) and optionally **Start Up**.
