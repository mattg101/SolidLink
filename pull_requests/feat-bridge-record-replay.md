# PR: Bridge Record/Replay (Ref: docs/dev/orchestration/feature-spec__feat-bridge-record-replay.md)

## 1. Summary of Changes
Implement bridge record/replay support with recording models, a recorder/replayer, and MessageBridge hooks for deterministic playback. Add unit coverage, a sample fixture, and a helper script for record/replay runs.

## 2. Run Instructions
1) Record a fixture: `scripts/bridge-record-replay.ps1 -Mode record -Path SolidLink.Tests/Fixtures/bridge_recording_sample.json`
2) Replay a fixture: `scripts/bridge-record-replay.ps1 -Mode replay -Path SolidLink.Tests/Fixtures/bridge_recording_sample.json`
3) Run unit tests: `dotnet test SolidLink.Tests/SolidLink.Tests.csproj`

## 3. Local Test Report
- [x] **Build Status**: PASS
- [x] **Unit Tests**: `dotnet test SolidLink.Tests/SolidLink.Tests.csproj`
- [x] **Manual Sanity Check**: record + replay script runs succeeded

## 4. Modified Files
- SolidLink.Addin/Bridge/MessageBridge.cs
- SolidLink.Addin/Bridge/BridgeRecorder.cs
- SolidLink.Addin/Bridge/BridgeReplayer.cs
- SolidLink.Addin/Bridge/BridgeRecording.cs
- SolidLink.Addin/Bridge/BridgeRecordingEntry.cs
- SolidLink.Addin/Bridge/BridgeMessageEventArgs.cs
- SolidLink.Addin/Bridge/InMemoryWebViewBridge.cs
- SolidLink.Addin/Bridge/CoreWebView2BridgeAdapter.cs
- SolidLink.Addin/SolidLink.Addin.csproj
- SolidLink.Tests/Unit/BridgeRecordReplayTests.cs
- SolidLink.Tests/Fixtures/bridge_recording_sample.json
- SolidLink.Tests/SolidLink.Tests.csproj
- scripts/bridge-record-replay.ps1

## 5. Definition of Done (Developer)
- [x] Code follows `orchestration/project_context.md`
- [x] Clean build
- [x] PR created in `pull_requests/`
