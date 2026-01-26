---
name: build-addin
description: Build, register, and launch the SolidLink C# add-in + UI dev environment (PowerShell-first).
trigger: always_on
---

This skill follows `engineering-doctrine` and `structured-workflow`.

# SolidLink Dev Workflow

## When to use
- You need to build the C# add-in, register it for COM, and launch SolidWorks + the UI server.
- You are iterating on the add-in/UI bridge and want a repeatable "one command" loop.

## Fast path (recommended)
From repo root, run (Admin required for COM registration):
```powershell
.\scripts\start_dev.ps1
```

Expected behavior:
1. Build `SolidLink.sln`
2. Register the add-in DLL (`RegAsm /codebase`)
3. Start the UI dev server (`npm run dev`)
4. Launch SolidWorks (`SLDWORKS.exe` or 3DEXPERIENCE via `CATSTART.exe` if configured)

## Manual path (when debugging)

### 1) Build the solution
```powershell
$msbuild = "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\MSBuild.exe"
& $msbuild SolidLink.sln /p:Configuration=Debug /p:Platform=x64 /v:minimal
```

> If the repo pins a Roslyn compiler toolset, use the repo’s documented path/vars (don’t invent versions).

### 2) Register the add-in (Admin)
```powershell
$regasm = "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\RegAsm.exe"
& $regasm /codebase ".\SolidLink.Addin\bin\x64\Debug\SolidLink.Addin.dll"
```

### 3) Start the UI dev server
```powershell
cd .\SolidLink.UI
npm install
npm run dev
```

### 4) Enable in SolidWorks
- **Tools → Add-ins**
- Check **SolidLink** under “Active Add-ins” (and optionally “Start Up”)

## Common failure modes
- **RegAsm fails**: you are not elevated, or the DLL path is wrong.
- **Add-in doesn’t appear**: registration succeeded but SolidWorks needs a restart; confirm Tools→Add-ins list.
- **UI doesn’t connect**: confirm UI server is running and the bridge endpoint/port matches config.

## Guardrails
- Never run registration steps without warning about elevation.
- Don’t commit build outputs or COM registration side-effects into git.
