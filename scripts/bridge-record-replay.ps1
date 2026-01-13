param(
    [ValidateSet("record", "replay")]
    [string]$Mode = "record",
    [string]$Path = "SolidLink.Tests/Fixtures/bridge_recording_sample.json",
    [string]$Configuration = "Debug"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if ($PSVersionTable.PSEdition -eq "Core") {
    & powershell -NoProfile -ExecutionPolicy Bypass -File $PSCommandPath -Mode $Mode -Path $Path -Configuration $Configuration
    exit $LASTEXITCODE
}

$repoRoot = Split-Path -Parent $PSScriptRoot
$addinBridgePath = Join-Path $repoRoot "SolidLink.Addin/Bridge"
$jsonDll = Join-Path $repoRoot "packages/Newtonsoft.Json.13.0.3/lib/net45/Newtonsoft.Json.dll"
$webView2CoreDll = Join-Path $repoRoot "packages/Microsoft.Web.WebView2.1.0.2903.40/lib/net462/Microsoft.Web.WebView2.Core.dll"

if (!(Test-Path $jsonDll)) { throw "Newtonsoft.Json not found at $jsonDll" }
if (!(Test-Path $webView2CoreDll)) { throw "WebView2 Core assembly not found at $webView2CoreDll" }

Add-Type -Path $jsonDll
Add-Type -Path $webView2CoreDll

$bridgeFiles = @(
    (Join-Path $addinBridgePath "BridgeMessage.cs"),
    (Join-Path $addinBridgePath "BridgeMessageEventArgs.cs"),
    (Join-Path $addinBridgePath "BridgeRecording.cs"),
    (Join-Path $addinBridgePath "BridgeRecordingEntry.cs"),
    (Join-Path $addinBridgePath "BridgeRecorder.cs"),
    (Join-Path $addinBridgePath "BridgeReplayer.cs"),
    (Join-Path $addinBridgePath "CoreWebView2BridgeAdapter.cs"),
    (Join-Path $addinBridgePath "IWebViewBridge.cs"),
    (Join-Path $addinBridgePath "InMemoryWebViewBridge.cs"),
    (Join-Path $addinBridgePath "MessageBridge.cs")
)

foreach ($file in $bridgeFiles) {
    if (!(Test-Path $file)) { throw "Bridge source file not found at $file" }
}

Add-Type -Path $bridgeFiles -ReferencedAssemblies @($jsonDll, $webView2CoreDll, "System.dll", "System.Core.dll")

$fullPath = if ([System.IO.Path]::IsPathRooted($Path)) { $Path } else { Join-Path $repoRoot $Path }
$fullPath = [System.IO.Path]::GetFullPath($fullPath)

$webView = New-Object SolidLink.Addin.Bridge.InMemoryWebViewBridge
$bridge = New-Object SolidLink.Addin.Bridge.MessageBridge
$bridge.Initialize($webView)

if ($Mode -eq "record") {
    $recorder = New-Object SolidLink.Addin.Bridge.BridgeRecorder($bridge)
    $recorder.Start($fullPath)

    $bridge.Send("AUTH", @{ token = "secret"; user = "demo" })
    $inboundJson = [Newtonsoft.Json.JsonConvert]::SerializeObject(
        (New-Object SolidLink.Addin.Bridge.BridgeMessage("AUTH_OK", @{ accessToken = "secret2"; status = "ok" }))
    )
    $webView.Emit($inboundJson)

    $recorder.Stop()
    Write-Host "Recording written to $fullPath"
} else {
    $received = New-Object System.Collections.Generic.List[string]
    $bridge.add_MessageReceived({ param($sender, $message) $received.Add($message.Type) })

    $replayer = New-Object SolidLink.Addin.Bridge.BridgeReplayer($bridge)
    $replayer.Play($fullPath)

    Write-Host "Replay complete."
    Write-Host "Outbound messages: $($webView.SentMessages.Count)"
    Write-Host "Inbound messages: $($received.Count)"
}
