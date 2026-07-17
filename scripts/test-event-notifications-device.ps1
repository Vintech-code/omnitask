param(
  [string]$PackageName = 'com.vincentements_007.omnitask',
  [int]$DeliveryWaitSeconds = 6,
  [string]$AdbPath = ''
)

$ErrorActionPreference = 'Stop'

function Resolve-AdbPath {
  $candidates = @()
  if ($AdbPath) { $candidates += $AdbPath }
  $pathCommand = Get-Command adb -ErrorAction SilentlyContinue
  if ($pathCommand) { $candidates += $pathCommand.Source }
  if ($env:ANDROID_HOME) { $candidates += (Join-Path $env:ANDROID_HOME 'platform-tools\adb.exe') }
  if ($env:ANDROID_SDK_ROOT) { $candidates += (Join-Path $env:ANDROID_SDK_ROOT 'platform-tools\adb.exe') }
  if ($env:LOCALAPPDATA) { $candidates += (Join-Path $env:LOCALAPPDATA 'Android\Sdk\platform-tools\adb.exe') }

  $resolved = $candidates | Where-Object { $_ -and (Test-Path -LiteralPath $_) } | Select-Object -First 1
  if (-not $resolved) {
    throw 'Android Platform Tools (adb) were not found. Install them from Android Studio SDK Manager or add <Android SDK>\platform-tools to PATH.'
  }
  return (Resolve-Path -LiteralPath $resolved).Path
}

$script:AdbExe = Resolve-AdbPath

function Invoke-Adb {
  param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Arguments)
  & $script:AdbExe @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "adb failed: $($Arguments -join ' ')"
  }
}

$savedErrorAction = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
$deviceOutput = & $script:AdbExe get-state 2>&1
$deviceExitCode = $LASTEXITCODE
$ErrorActionPreference = $savedErrorAction
$device = (($deviceOutput | Select-Object -Last 1) -as [string]).Trim()
if ($deviceExitCode -ne 0 -or $device -ne 'device') {
  throw 'No authorized Android device or emulator is connected. Start an emulator or enable USB debugging and accept the device authorization prompt.'
}
$sdkVersion = [int]((& $script:AdbExe shell getprop ro.build.version.sdk).Trim())
if ($sdkVersion -lt 33) {
  throw 'The permission-denied device check requires Android 13 (API 33) or newer.'
}
$installedPath = (& $script:AdbExe shell pm path $PackageName 2>&1)
if ($LASTEXITCODE -ne 0 -or -not ($installedPath -match '^package:')) {
  throw "OmniTask is not installed on the connected device. Rebuild it with 'npm run android' before running this test."
}

$permissionToken = "denied_$([DateTimeOffset]::UtcNow.ToUnixTimeSeconds())"
Invoke-Adb shell pm revoke $PackageName android.permission.POST_NOTIFICATIONS
Invoke-Adb shell appops set $PackageName POST_NOTIFICATION ignore
Invoke-Adb logcat -c
Invoke-Adb shell am start -W -a android.intent.action.VIEW -d "omnitask://notification-probe?mode=permission-check&token=$permissionToken" $PackageName
Start-Sleep -Seconds 2
$permissionLog = (& $script:AdbExe logcat -d)
if ($permissionLog -notmatch [regex]::Escape("$permissionToken:permission-denied")) {
  throw 'The app did not report the Android notification permission-denied state.'
}

$deliveryToken = "delivery_$([DateTimeOffset]::UtcNow.ToUnixTimeSeconds())"
Invoke-Adb shell appops set $PackageName POST_NOTIFICATION allow
Invoke-Adb shell pm grant $PackageName android.permission.POST_NOTIFICATIONS
Invoke-Adb logcat -c
Invoke-Adb shell am start -W -a android.intent.action.VIEW -d "omnitask://notification-probe?mode=schedule&token=$deliveryToken" $PackageName
Start-Sleep -Seconds $DeliveryWaitSeconds
$deliveryLog = (& $script:AdbExe logcat -d)
if ($deliveryLog -notmatch [regex]::Escape("$deliveryToken:scheduled")) {
  throw 'The app did not schedule the notification probe.'
}
$notificationState = (& $script:AdbExe shell dumpsys notification --noredact)
if ($notificationState -notmatch [regex]::Escape("OmniTask notification probe $deliveryToken")) {
  throw 'Android did not deliver the scheduled notification probe.'
}

Write-Host 'Notification permission-denied and real delivery device checks passed.'
