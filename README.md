# SolidLink

A modern SolidWorks add-in (2024+) verifying the new architecture for the URDF Exporter upgrade.

## Architecture
- **Backend:** C# .NET Framework 4.8 (SolidWorks COM Add-in)
- **Frontend:** React + TypeScript + Vite (Hosted via WebView2)
- **Communication:** JSON Bridge (WebView2 `PostWebMessageAsJson`)

## Prerequisites
- SolidWorks 2024 or newer (Tested on 3DEXPERIENCE R2026x)
- Visual Studio 2022 (with .NET Framework 4.8 dev tools)
- Node.js & npm

## Setup & Build

### 1. Restore Dependencies
This project uses `packages.config` for legacy MSBuild compatibility.
```powershell
./SolidLink/scripts/nuget.exe restore SolidLink/SolidLink.sln
```
*Alternatively, open the solution in Visual Studio and let it restore.*

### 2. Build Solution
Build `SolidLink.sln` in **Debug / x64** mode.

### 3. Register Add-in
Run the registration script as **Administrator**:
```powershell
./SolidLink/scripts/register.ps1
```

## Usage
1. Open SolidWorks and load an Assembly.
2. Go to the **SolidLink** tab in the CommandManager (toolbar).
3. Click **Open SolidLink**.
4. The UI window should appear.

## Troubleshooting
- **WebView2 Access Denied:** If the window is blank or throws `E_ACCESSDENIED`, ensure the code is using `%LOCALAPPDATA%` for user data (fixed in v0.1.0).
- **Missing Toolbar:** Check `View > Toolbars > SolidLink`.
