param(
  [string]$RepoSkillsPath
)

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
if (-not $RepoSkillsPath) {
  $RepoSkillsPath = Join-Path $repoRoot "docs\dev\.agent\skills"
}

$codexHome = $env:CODEX_HOME
if ([string]::IsNullOrWhiteSpace($codexHome)) {
  $codexHome = Join-Path $env:USERPROFILE ".codex"
}

$destRoot = Join-Path $codexHome "skills"
New-Item -ItemType Directory -Force -Path $destRoot | Out-Null

if (-not (Test-Path -Path $RepoSkillsPath)) {
  throw "Repo skills path not found: $RepoSkillsPath"
}

$skillDirs = Get-ChildItem -Path $RepoSkillsPath -Directory
foreach ($dir in $skillDirs) {
  $dest = Join-Path $destRoot $dir.Name
  if (Test-Path -Path $dest) {
    $item = Get-Item -LiteralPath $dest -Force
    if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) {
      Remove-Item -LiteralPath $dest -Force
    } else {
      Write-Warning "Skipping $dest (exists and is not a symlink)."
      continue
    }
  }

  New-Item -ItemType SymbolicLink -Path $dest -Target $dir.FullName | Out-Null
}

Write-Host "Synced skills from $RepoSkillsPath to $destRoot"
