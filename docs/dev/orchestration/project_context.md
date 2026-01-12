# Project Context: SolidLink
> [!IMPORTANT]
> **GROUND TRUTH:** This file is the primary technical context for all agents. Consult this file BEFORE searching the file tree or assuming any architectural patterns.

This file defines the **Technical Context** for the generic SOPs. All agents must read this to understand the concrete inputs/outputs of their general roles.

## Technology Stack
-   **Core Language:** C# .NET Framework 4.8 (Backend) / TypeScript (Frontend).
-   **UI:** React (Vite) hosted in WebView2.
-   **Host Application:** SolidWorks (Plugin/Add-in Development).
-   **API:** SolidWorks API (COM Interop) <-> JSON Bridge <-> React.
-   **Build System:** MSBuild (Legacy Mode with `packages.config`) + Vite (npm).
-   **Installation:** PowerShell Registration Script (Dev) / WiX (.msi Prod).

## Coding Standards (The "Rigor")
-   **Type Safety:** Strict static typing (C#) and Strict TypeScript.
-   **Error Handling:** Mandatory `try/catch` around SW API calls.
-   **Memory Management:** Explicitly release COM objects.

## Architecture Specifics
-   **Bridge Pattern:** All UI/Backend communication occurs via async JSON messages.
-   **Threading:** SolidWorks API on Main Thread; UI on WebView2 Process.
-   **Frontend:** Functional React components + Hooks.
-   **Abstraction Layer:** `SolidLink.Addin/Abstractions/` contains interfaces (`ISolidWorksContext`, `IModelDocument`, `IComponent`, etc.) that abstract SolidWorks COM types for dependency injection and testing.

## Known Pitfalls (Self-Annealed)
-   **WebView2 Permissions:** Must explicitly set `UserDataFolder` to `%LOCALAPPDATA%` to avoid `AccessDenied`.
-   **UI Entry Point:** Use `CommandManager` (Toolbar), NOT `AddMenuItem`.
-   **NuGet:** Use `packages.config` for .NET 4.8 MSBuild compatibility (no `PackageReference`).
-   **MSBuild Requirements:** The project uses C# 7+ features. If building with the .NET Framework MSBuild (v4.0), you MUST point it to the Roslyn compiler from the NuGet package:
    ```powershell
    $roslynPath = "$PWD\packages\Microsoft.Net.Compilers.3.11.0\tools"
    & "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\MSBuild.exe" SolidLink.sln /p:Configuration=Debug /p:Platform=x64 /p:CscToolPath=$roslynPath /p:CscToolExe="csc.exe"
    ```
-   **File Lock (MSB3027):** If build fails with "Could not copy... Exceeded retry count", **close SolidWorks** first. The add-in DLL is locked while SW is running.
-   **Transform Matrix Interpretation:** SolidWorks `MathTransform.ArrayData` stores rotation as **row vectors** (axis directions). Three.js expects **column vectors**. Always transpose the 3x3 rotation block when converting.
-   **Absolute Transforms:** SolidWorks `Component2.Transform2` returns **absolute** transforms from assembly origin, NOT parent-relative. When rendering nested hierarchies, flatten to root level or compute relative transforms.

## Workflow Specifics
-   **Testing:**
    -   *Unit Tests (No SolidWorks):* `SolidLink.Tests/` with NUnit 3.14.0 + Moq. Uses mock layer + JSON fixtures.
    -   *Run Command:*
        ```powershell
        cd SolidLink
        .\packages\NUnit.ConsoleRunner.3.16.3\tools\nunit3-console.exe .\SolidLink.Tests\bin\x64\Debug\SolidLink.Tests.dll --where "cat==Unit"
        ```
    -   *Integration:* Manual verification in SolidWorks (Task Panes, Property Pages). Use `[Category("RequiresSW")]` for tests that need SolidWorks.
-   **Deploy:** Generate `.msi` via WiX.
-   **Design Spec:** See `SolidLink/docs/solidlink-agent-dev-spec.md` for agent-friendly development toolchain details.

