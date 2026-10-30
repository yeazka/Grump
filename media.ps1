# Membaca & mengontrol media yang sedang diputar di Windows (System Media Transport Controls).
# Mengeluarkan satu baris JSON per update ke stdout; menerima perintah dari stdin:
#   toggle | play | pause | next | prev | seek:<detik>
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$ErrorActionPreference = 'SilentlyContinue'

Add-Type -AssemblyName System.Runtime.WindowsRuntime
try { Add-Type -AssemblyName UIAutomationClient; Add-Type -AssemblyName UIAutomationTypes } catch {}
$null = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media.Control, ContentType = WindowsRuntime]
$null = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties, Windows.Media.Control, ContentType = WindowsRuntime]
$null = [Windows.Storage.Streams.DataReader, Windows.Storage.Streams, ContentType = WindowsRuntime]
$null = [Windows.Storage.Streams.IRandomAccessStreamWithContentType, Windows.Storage.Streams, ContentType = WindowsRuntime]
$null = [Windows.Media.Devices.MediaDevice, Windows.Media.Devices, ContentType = WindowsRuntime]
$null = [Windows.Devices.Enumeration.DeviceInformation, Windows.Devices.Enumeration, ContentType = WindowsRuntime]

$asTask = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
    $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and
    $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' })[0]

function Await($op, [Type]$type) {
    $task = $asTask.MakeGenericMethod($type).Invoke($null, @($op))
    [void]$task.Wait(-1)
    $task.Result
}


Add-Type -TypeDefinition @"
using System; using System.Runtime.InteropServices; using System.Text; using System.Threading;

[Guid("5CDF2C82-841E-4546-9722-0CF74078229A"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IAudioEndpointVolume {
    int f(); int g(); int h(); int i();
    int SetMasterVolumeLevelScalar(float fLevel, IntPtr pguidEventContext);
    int j();
    int GetMasterVolumeLevelScalar(out float pfLevel);
    int SetMute([MarshalAs(UnmanagedType.Bool)] bool bMute, Guid pguidEventContext);
    int GetMute(out bool pbMute);
}

[Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IMMDevice {
    int Activate(ref Guid id, int clsCtx, int activationParams, out IAudioEndpointVolume val);
}

[Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IMMDeviceEnumerator {
    int EnumAudioEndpoints(int dataFlow, int dwStateMask, out IntPtr ppDevices);
    int GetDefaultAudioEndpoint(int dataFlow, int role, out IMMDevice ppDevice);
}

[ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")]
public class MMDeviceEnumeratorComObject { }

public class FSCheck {
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int L, T, R, B; }
  [StructLayout(LayoutKind.Sequential)] public struct MONITORINFO { public int cb; public RECT mon; public RECT work; public uint flags; }
  [DllImport("user32.dll")] static extern IntPtr GetForegroundWindow();
  public static IntPtr ForegroundHandle() { return GetForegroundWindow(); }
  [DllImport("user32.dll")] static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] static extern int GetClassName(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll")] static extern IntPtr MonitorFromWindow(IntPtr h, uint f);
  [DllImport("user32.dll")] static extern bool GetMonitorInfo(IntPtr m, ref MONITORINFO i);
  [DllImport("user32.dll", EntryPoint="GetWindowLongW")] static extern int GetWindowLong(IntPtr h, int i);
  [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
  public static bool PasteToForeground() {
    IntPtr h=GetForegroundWindow();if(h==IntPtr.Zero)return false;
    uint pid=0;GetWindowThreadProcessId(h,out pid);
    try { string name=System.Diagnostics.Process.GetProcessById((int)pid).ProcessName.ToLowerInvariant();
      if(name=="grump"||name=="dynamicisland"||name=="electron")return false;
    } catch { return false; }
    keybd_event(0x11,0,0,UIntPtr.Zero);
    keybd_event(0x56,0,0,UIntPtr.Zero);
    keybd_event(0x56,0,2,UIntPtr.Zero);
    keybd_event(0x11,0,2,UIntPtr.Zero);
    return true;
  }
  [DllImport("user32.dll", SetLastError=true)] static extern IntPtr OpenDesktop(string lpszDesktop, uint dwFlags, bool fInherit, uint dwDesiredAccess);
  [DllImport("user32.dll", SetLastError=true)] static extern bool SetThreadDesktop(IntPtr hDesktop);
  [DllImport("user32.dll")] static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);
  [DllImport("psapi.dll")] public static extern int EmptyWorkingSet(IntPtr hwProc);
  [DllImport("shell32.dll")] public static extern int SHQueryUserNotificationState(out int q);
  [DllImport("kernel32.dll")] public static extern IntPtr OpenProcess(uint dwDesiredAccess, bool bInheritHandle, uint dwProcessId);
  [DllImport("kernel32.dll")] public static extern bool CloseHandle(IntPtr hObject);

  public static float GetMasterVolume() {
    try {
      var enumerator = new MMDeviceEnumeratorComObject() as IMMDeviceEnumerator;
      IMMDevice dev = null;
      enumerator.GetDefaultAudioEndpoint(0, 1, out dev);
      var iid = typeof(IAudioEndpointVolume).GUID;
      IAudioEndpointVolume vol = null;
      dev.Activate(ref iid, 23, 0, out vol);
      float current = 0;
      vol.GetMasterVolumeLevelScalar(out current);
      return current;
    } catch { return 0.5f; }
  }

  public static void SetMasterVolume(float level) {
    try {
      var enumerator = new MMDeviceEnumeratorComObject() as IMMDeviceEnumerator;
      IMMDevice dev = null;
      enumerator.GetDefaultAudioEndpoint(0, 1, out dev);
      var iid = typeof(IAudioEndpointVolume).GUID;
      IAudioEndpointVolume vol = null;
      dev.Activate(ref iid, 23, 0, out vol);
      vol.SetMasterVolumeLevelScalar(level, IntPtr.Zero);
    } catch {}
  }

  public static void TrimProcess(uint pid) {
    try {
      IntPtr h = OpenProcess(0x1F0FFF, false, pid);
      if (h != IntPtr.Zero) {
        EmptyWorkingSet(h);
        CloseHandle(h);
      }
    } catch {}
  }

  public static void SendMediaKey(byte vk) {
    keybd_event(vk, 0, 0, UIntPtr.Zero);
    keybd_event(vk, 0, 2, UIntPtr.Zero);
  }

  static readonly IntPtr hDef = OpenDesktop("Default", 0, false, 0x01FF);
  static readonly System.Collections.Concurrent.ConcurrentQueue<string> cmdQ = new System.Collections.Concurrent.ConcurrentQueue<string>();
  static bool stdinStarted = false;

  public static string PopCmd() {
    if (!stdinStarted) {
      stdinStarted = true;
      Thread st = new Thread(() => {
        try {
          string line;
          while ((line = Console.In.ReadLine()) != null) { cmdQ.Enqueue(line); }
        } catch {}
      });
      st.IsBackground = true;
      st.Start();
    }
    string res;
    return cmdQ.TryDequeue(out res) ? res : null;
  }

  public static void QueryState(out bool isFs, out bool isGame, out int shouldTuck, out string fgProc, out string fgTitle, out int monitorX, out int monitorY) {
    bool fsOut = false;
    bool gameOut = false;
    int tuckOut = 0;
    string procOut = "";
    string titleOut = "";
    int mx = 0, my = 0;

    int quns = 0;
    try { SHQueryUserNotificationState(out quns); } catch {}
    bool d3dFullscreen = (quns == 3);

    IntPtr h = GetForegroundWindow();
    if (h == IntPtr.Zero) {
      if (d3dFullscreen) { fsOut = true; gameOut = true; }
      tuckOut = -1;
      isFs = fsOut; isGame = gameOut; shouldTuck = tuckOut; fgProc = ""; fgTitle = ""; monitorX = 0; monitorY = 0;
      return;
    }
    var sb = new StringBuilder(64); GetClassName(h, sb, 64); string c = sb.ToString();
    if (c == "Progman" || c == "WorkerW" || c == "Shell_TrayWnd" || c == "Shell_SecondaryTrayWnd") {
      isFs = false; isGame = false; shouldTuck = 0; fgProc = ""; fgTitle = ""; monitorX = 0; monitorY = 0;
      return;
    }
    RECT r; GetWindowRect(h, out r);
    MONITORINFO mi = new MONITORINFO(); mi.cb = Marshal.SizeOf(typeof(MONITORINFO));
    GetMonitorInfo(MonitorFromWindow(h, 2), ref mi);
    mx = (mi.mon.L + mi.mon.R) / 2; my = (mi.mon.T + mi.mon.B) / 2;

    uint pid = 0; GetWindowThreadProcessId(h, out pid);
    string proc = "";
    if (pid != 0) {
      try { proc = System.Diagnostics.Process.GetProcessById((int)pid).ProcessName.ToLowerInvariant(); } catch {}
    }
    procOut = proc;
    // The packaged Codex desktop app runs as ChatGPT.exe. Identify its
    // package path so it is distinct from the separate ChatGPT desktop app.
    if (proc == "chatgpt" && pid != 0) {
      try {
        string executable = System.Diagnostics.Process.GetProcessById((int)pid).MainModule.FileName;
        if (executable.IndexOf("OpenAI.Codex_", StringComparison.OrdinalIgnoreCase) >= 0) procOut = "codex";
      } catch {}
    }
    var titleBuffer=new StringBuilder(256);GetWindowText(h,titleBuffer,256);titleOut=titleBuffer.ToString();

    if (proc == "grump" || proc == "dynamicisland" || proc == "electron" || proc == "screenclippinghost" || proc == "snippingtool" || proc == "searchhost" || proc == "shellexperiencehost" || proc == "startmenuexperiencehost" || proc == "textinputhost" || proc == "taskmgr") {
      tuckOut = -1;
      isFs = false; isGame = false; shouldTuck = tuckOut; fgProc = procOut; fgTitle=titleOut; monitorX = mx; monitorY = my;
      return;
    }

    bool isBrowser = System.Text.RegularExpressions.Regex.IsMatch(proc, "^(brave|chrome|msedge|edge|firefox|opera|operagx|vivaldi|arc|zen|waterfox|thorium|chromium|tor|librewolf|floorp|whale|yandex|coccoc)$", System.Text.RegularExpressions.RegexOptions.IgnoreCase);
    bool coversMon = (r.L <= mi.mon.L + 2 && r.T <= mi.mon.T + 2 && r.R >= mi.mon.R - 2 && r.B >= mi.mon.B - 2);
    bool coversWorkArea = (r.B > mi.work.B || r.T < mi.work.T || (mi.mon.B == mi.work.B && coversMon));
    int style = GetWindowLong(h, -16);
    bool hasNoCaption = ((style & 0xC00000) == 0);
    // Chromium desktop apps can have a borderless style and overscan the
    // monitor by a few pixels while maximized. That is not fullscreen.
    bool isMaximized = (style & 0x01000000) != 0;

    if (d3dFullscreen) {
      fsOut = true;
      gameOut = true;
    } else if (coversMon && coversWorkArea && hasNoCaption && (!isMaximized || (isBrowser && Math.Abs(r.L-mi.mon.L)<=2 && Math.Abs(r.T-mi.mon.T)<=2 && Math.Abs(r.R-mi.mon.R)<=2 && Math.Abs(r.B-mi.mon.B)<=2))) {
      fsOut = true;
      if (!isBrowser && !System.Text.RegularExpressions.Regex.IsMatch(proc, "^(explorer|devenv|code|notepad|winword|excel|powerpnt)$", System.Text.RegularExpressions.RegexOptions.IgnoreCase)) {
        gameOut = true;
      }
    }

    if (isBrowser) {
      tuckOut = fsOut ? 0 : 1;
    } else {
      tuckOut = 0;
    }

    isFs = fsOut;
    isGame = gameOut;
    shouldTuck = tuckOut;
    fgProc = procOut;
    fgTitle = titleOut;
    monitorX = mx; monitorY = my;
  }
}
"@
$lastFs = $null
$lastGame = $null
$lastMonitorX = 0
$lastMonitorY = 0
$lastTuck = $null
$lastFgApp = ''
$lastFgTitle = ''
$lastAudioId = $null

$tMgr   = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]
$tProps = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties]
$tStrm  = [Windows.Storage.Streams.IRandomAccessStreamWithContentType]

$mgr = Await ($tMgr::RequestAsync()) $tMgr

$lastKey = ''
$lastSig = ''
$lastAppId = ''
$thumb = $null
$mime = 'image/jpeg'
$thumbTries = 0
$lastPos = 0.0
$lastT = [DateTime]::UtcNow
$loops = 0
$syncTick = 0

$script:lastBrightness = 50
function Get-ScreenBrightness {
    try {
        $b = (Get-CimInstance -Namespace root/wmi -ClassName WmiMonitorBrightness -ErrorAction SilentlyContinue).CurrentBrightness
        if ($null -ne $b) {
            $script:lastBrightness = [int]$b
            return [int]$b
        }
    } catch {}
    return $script:lastBrightness
}

function Set-ScreenBrightness([int]$target) {
    $script:lastBrightness = $target
    try {
        $m = Get-CimInstance -Namespace root/wmi -ClassName WmiMonitorBrightnessMethods -ErrorAction SilentlyContinue
        if ($m) {
            Invoke-CimMethod -InputObject $m -MethodName WmiSetBrightness -Arguments @{ Timeout = 1; Brightness = $target } | Out-Null
        }
    } catch {}
}

$lastEmitVol = -1
$lastEmitBri = -1

function Emit($o) { [Console]::Out.WriteLine(($o | ConvertTo-Json -Compress)); [Console]::Out.Flush() }

function GetActiveMediaSession($mgr, [string]$lastAppId) {
    $cur = $mgr.GetCurrentSession()
    if ($cur) {
        $pb = $cur.GetPlaybackInfo()
        if ($pb -and $pb.PlaybackStatus.ToString() -eq 'Playing') { return $cur }
    }
    $sessions = $mgr.GetSessions()
    if ($sessions) {
        foreach ($sess in $sessions) {
            $pb = $sess.GetPlaybackInfo()
            if ($pb -and $pb.PlaybackStatus.ToString() -eq 'Playing') { return $sess }
        }
        if ($lastAppId) {
            foreach ($sess in $sessions) {
                if ($sess.SourceAppUserModelId -eq $lastAppId) { return $sess }
            }
        }
    }
    return $cur
}

# Read radio power separately from connection state; never infer power from Internet access.
$null = [Windows.Devices.Radios.Radio, Windows.System.Devices, ContentType = WindowsRuntime]
$null = [Windows.Networking.Connectivity.NetworkInformation, Windows.Networking.Connectivity, ContentType = WindowsRuntime]
$null = [Windows.Devices.Bluetooth.BluetoothDevice, Windows.Devices.Bluetooth, ContentType = WindowsRuntime]
$null = [Windows.Devices.Bluetooth.BluetoothLEDevice, Windows.Devices.Bluetooth, ContentType = WindowsRuntime]
function Connectivity-Await($op,[Type]$type) {
    $task=$asTask.MakeGenericMethod($type).Invoke($null,@($op))
    if(-not $task.Wait(400)){throw 'Connectivity query timed out'}
    $task.Result
}
function Get-Connectivity {
    $wifi=@{on=$null;names=@()};$bt=@{on=$null;names=@()}
    try {
        $radios=Connectivity-Await ([Windows.Devices.Radios.Radio]::GetRadiosAsync()) ([System.Collections.Generic.IReadOnlyList[Windows.Devices.Radios.Radio]])
        $wifi.on=$false;$bt.on=$false
        foreach($r in $radios){if($r.Kind.ToString() -eq 'WiFi' -and $r.State.ToString() -eq 'On'){$wifi.on=$true};if($r.Kind.ToString() -eq 'Bluetooth' -and $r.State.ToString() -eq 'On'){$bt.on=$true}}
    } catch {}
    try {foreach($profile in [Windows.Networking.Connectivity.NetworkInformation]::GetConnectionProfiles()){if($profile.IsWlanConnectionProfile -and $profile.GetNetworkConnectivityLevel().ToString() -ne 'None'){$wifi.names+= $profile.WlanConnectionProfileDetails.GetConnectedSsid()}}} catch {}
    if($bt.on){
        foreach($type in @([Windows.Devices.Bluetooth.BluetoothDevice],[Windows.Devices.Bluetooth.BluetoothLEDevice])){
            try {$selector=$type::GetDeviceSelectorFromConnectionStatus([Windows.Devices.Bluetooth.BluetoothConnectionStatus]::Connected);$devices=Connectivity-Await ([Windows.Devices.Enumeration.DeviceInformation]::FindAllAsync($selector)) ([Windows.Devices.Enumeration.DeviceInformationCollection]);foreach($device in $devices){$bt.names+=$device.Name}}catch{}
        }
        $bt.names=@($bt.names | Select-Object -Unique)
    }
    Emit @{connectivity=@{wifi=$wifi;bluetooth=$bt}}
}

$overrideStatus = $null
$overrideUntil = [DateTime]::MinValue
$lastClaudeActive = $false
$lastChatgptActive = $false

function Get-AiResponding {
    try {
        $root = [System.Windows.Automation.AutomationElement]::FromHandle([FSCheck]::ForegroundHandle())
        if (-not $root) { return $false }
        $buttons = $root.FindAll([System.Windows.Automation.TreeScope]::Descendants,
            (New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::ControlTypeProperty,[System.Windows.Automation.ControlType]::Button)))
        foreach ($button in $buttons) {
            if ($button.Current.Name -match '^(Stop|Stop response|Stop generating|Stop generation|Cancel response)$') { return $true }
        }
    } catch {}
    return $false
}

while ($true) {
    $syncTick++
    if($syncTick -eq 1 -or $syncTick % 25 -eq 0){Get-Connectivity}
    while ($null -ne ($line = [FSCheck]::PopCmd())) {
        $c = $line.Trim()
        if ($c -like 'vol:*') {
            try {
                $v = [math]::Max(0, [math]::Min(100, [int]$c.Substring(4)))
                [FSCheck]::SetMasterVolume([float]($v / 100.0))
                $lastEmitVol = $v
                $briVal = if ($lastEmitBri -ge 0) { $lastEmitBri } else { Get-ScreenBrightness }
                Emit @{ sys = @{ volume = $v; brightness = $briVal } }
            } catch {}
            continue
        }
        elseif ($c -like 'bright:*') {
            try {
                $b = [math]::Max(0, [math]::Min(100, [int]$c.Substring(7)))
                Set-ScreenBrightness $b
                $lastEmitBri = $b
                $volVal = if ($lastEmitVol -ge 0) { $lastEmitVol } else { [math]::Round([FSCheck]::GetMasterVolume() * 100) }
                Emit @{ sys = @{ volume = $volVal; brightness = $b } }
            } catch {}
            continue
        }
        $s = GetActiveMediaSession $mgr $lastAppId
        if ($s) {
            $pb = $s.GetPlaybackInfo()
            $st = if ($pb) { $pb.PlaybackStatus.ToString() } else { '' }
            if ($c -eq 'toggle') {
                if ($st -eq 'Playing') {
                    $overrideStatus = 'Paused'; $overrideUntil = [DateTime]::UtcNow.AddMilliseconds(900)
                    $ok = Await ($s.TryPauseAsync()) ([bool])
                    if (-not $ok) {
                        $ok2 = Await ($s.TryTogglePlayPauseAsync()) ([bool])
                        if (-not $ok2) { [FSCheck]::SendMediaKey([byte]0xB3) }
                    }
                } else {
                    $overrideStatus = 'Playing'; $overrideUntil = [DateTime]::UtcNow.AddMilliseconds(900)
                    $ok = Await ($s.TryPlayAsync()) ([bool])
                    if (-not $ok) {
                        $ok2 = Await ($s.TryTogglePlayPauseAsync()) ([bool])
                        if (-not $ok2) { [FSCheck]::SendMediaKey([byte]0xB3) }
                    }
                }
            }
            elseif ($c -eq 'play') {
                $overrideStatus = 'Playing'; $overrideUntil = [DateTime]::UtcNow.AddMilliseconds(900)
                $ok = Await ($s.TryPlayAsync()) ([bool])
                if (-not $ok) {
                    $ok2 = Await ($s.TryTogglePlayPauseAsync()) ([bool])
                    if (-not $ok2) { [FSCheck]::SendMediaKey([byte]0xB3) }
                }
            }
            elseif ($c -eq 'pause') {
                $overrideStatus = 'Paused'; $overrideUntil = [DateTime]::UtcNow.AddMilliseconds(900)
                $ok = Await ($s.TryPauseAsync()) ([bool])
                if (-not $ok) {
                    $ok2 = Await ($s.TryTogglePlayPauseAsync()) ([bool])
                    if (-not $ok2) { [FSCheck]::SendMediaKey([byte]0xB3) }
                }
            }
            elseif ($c -eq 'next') {
                $ok = Await ($s.TrySkipNextAsync()) ([bool])
                if (-not $ok) { [FSCheck]::SendMediaKey([byte]0xB0) }
            }
            elseif ($c -eq 'prev') {
                $ok = Await ($s.TrySkipPreviousAsync()) ([bool])
                if (-not $ok) { [FSCheck]::SendMediaKey([byte]0xB1) }
            }
            elseif ($c -like 'seek:*') {
                $sec = [double]::Parse($c.Substring(5), [Globalization.CultureInfo]::InvariantCulture)
                [void](Await ($s.TryChangePlaybackPositionAsync([long]($sec * 10000000))) ([bool]))
            }
            $lastSig = ''   # paksa kirim ulang status terbaru
        } else {
            if ($c -eq 'toggle' -or $c -eq 'play' -or $c -eq 'pause') { [FSCheck]::SendMediaKey([byte]0xB3) }
            elseif ($c -eq 'next') { [FSCheck]::SendMediaKey([byte]0xB0) }
            elseif ($c -eq 'prev') { [FSCheck]::SendMediaKey([byte]0xB1) }
            elseif ($c -eq 'paste') { [FSCheck]::PasteToForeground() | Out-Null }
        }
    }

    $fs = $false
    $isGame = $false
    $st = 0
    $fgProc = ''
    $fgTitle = ''
    $monitorX = 0; $monitorY = 0
    [FSCheck]::QueryState([ref]$fs, [ref]$isGame, [ref]$st, [ref]$fgProc, [ref]$fgTitle, [ref]$monitorX, [ref]$monitorY)
    if ($syncTick % 10 -eq 0 -or ($fgProc -ne 'claude' -and $lastClaudeActive) -or ($fgProc -ne 'chatgpt' -and $lastChatgptActive)) {
        $aiResponding = ($fgProc -eq 'claude' -or $fgProc -eq 'chatgpt') -and (Get-AiResponding)
        $claudeActive = $fgProc -eq 'claude' -and $aiResponding
        $chatgptActive = $fgProc -eq 'chatgpt' -and $aiResponding
        if ($claudeActive -ne $lastClaudeActive) {
            $lastClaudeActive = $claudeActive
            Emit @{ claudeActivity = @{ active = $claudeActive; status = $(if ($claudeActive) { 'Replying' } else { '' }); detail = $(if ($claudeActive) { 'Writing response' } else { '' }) } }
        }
        if ($chatgptActive -ne $lastChatgptActive) {
            $lastChatgptActive = $chatgptActive
            Emit @{ chatgptActivity = @{ active = $chatgptActive; status = $(if ($chatgptActive) { 'Replying' } else { '' }); detail = $(if ($chatgptActive) { 'Writing response' } else { '' }) } }
        }
    }
    if ($st -eq -1) {
        $tuck = if ($null -eq $lastTuck) { $false } else { [bool]$lastTuck }
        if ($null -ne $lastFs) { $fs = [bool]$lastFs; $isGame = [bool]$lastGame; $monitorX = $lastMonitorX; $monitorY = $lastMonitorY }
    } else {
        $tuck = ($st -eq 1)
        $lastMonitorX = $monitorX; $lastMonitorY = $monitorY
    }
    if ($fs -ne $lastFs -or $isGame -ne $lastGame -or $tuck -ne $lastTuck -or $fgProc -ne $lastFgApp -or $fgTitle -ne $lastFgTitle -or ($syncTick % 10 -eq 0)) {
        $lastFs = $fs; $lastGame = $isGame; $lastTuck = $tuck; $lastFgApp = $fgProc; $lastFgTitle = $fgTitle
        Emit @{ fullscreen = $fs; isGame = $isGame; tuckApp = $tuck; fgApp = $fgProc; fgTitle = $fgTitle; monitorX = $monitorX; monitorY = $monitorY }
    }

    # Emisi status sistem (Volume & Kecerahan Layar)
    if ($syncTick % 10 -eq 0 -or $syncTick -le 2) {
        $curVol = [math]::Round([FSCheck]::GetMasterVolume() * 100)
        $curBri = Get-ScreenBrightness
        if ($curVol -ne $lastEmitVol -or $curBri -ne $lastEmitBri) {
            $lastEmitVol = $curVol; $lastEmitBri = $curBri
            Emit @{ sys = @{ volume = $curVol; brightness = $curBri } }
        }
    }

    # Let Windows manage working sets. Never trim other Electron applications.

    # Deteksi perubahan perangkat audio / Bluetooth headset tersambung
    try {
        $curAudioId = [Windows.Media.Devices.MediaDevice]::GetDefaultAudioRenderId([Windows.Media.Devices.AudioDeviceRole]::Default)
        if ($curAudioId -ne $lastAudioId) {
            $wasInit = ($null -eq $lastAudioId)
            $lastAudioId = $curAudioId
            if (-not $wasInit -and $curAudioId) {
                $op = [Windows.Devices.Enumeration.DeviceInformation]::CreateFromIdAsync($curAudioId)
                $dev = Await $op ([Windows.Devices.Enumeration.DeviceInformation])
                $name = [string]$dev.Name
                $isBluetooth = ($curAudioId -match 'BTHENUM|BTHLE|BTHHFENUM|BTHA2DP' -or $name -match 'Bluetooth|Wireless|AirPods|Buds')
                $isAudioAccessory = ($name -match 'Headphones|Headset|Buds|AirPods|WH-|WF-|Earbuds|Earphone|Speaker|Speakers|Bluetooth|Wireless' -or $isBluetooth)
                if ($isAudioAccessory) {
                    $cleanName = $name -replace '^Headphones \((.+)\)$', '$1' -replace '^Headset \((.+)\)$', '$1'
                    Emit @{ headset = @{ name = $cleanName; raw = $name; connected = $true; transport = $(if ($isBluetooth) { 'bluetooth' } else { 'wired' }) } }
                }
            }
        }
    } catch {}

    $s = GetActiveMediaSession $mgr $lastAppId
    if ($null -eq $s) {
        if ($lastSig -ne 'none') { Emit @{ active = $false }; $lastSig = 'none'; $lastKey = ''; $thumb = $null }
    }
    else {
        $lastAppId = [string]$s.SourceAppUserModelId
        $props = Await ($s.TryGetMediaPropertiesAsync()) $tProps
        $pb = $s.GetPlaybackInfo()
        $tl = $s.GetTimelineProperties()
        $status = $pb.PlaybackStatus.ToString()
        if ([DateTime]::UtcNow -lt $overrideUntil -and $overrideStatus) {
            $status = $overrideStatus
        } else {
            $overrideStatus = $null
        }
        $title = [string]$props.Title
        $artist = [string]$props.Artist
        $key = "$title|$artist"
        $newThumb = $false

        if ($key -ne $lastKey) { $lastKey = $key; $thumb = $null; $thumbTries = 0 }
        if (-not $thumb -and $thumbTries -lt 8 -and $props.Thumbnail) {
            $thumbTries++
            try {
                $stream = Await ($props.Thumbnail.OpenReadAsync()) $tStrm
                $size = [uint32]$stream.Size
                if ($size -gt 0) {
                    $reader = [Windows.Storage.Streams.DataReader]::new($stream)
                    [void](Await ($reader.LoadAsync($size)) ([uint32]))
                    $bytes = New-Object byte[] $size
                    $reader.ReadBytes($bytes)
                    $thumb = [Convert]::ToBase64String($bytes)
                    if ($stream.ContentType) { $mime = $stream.ContentType }
                    $newThumb = $true
                    $reader.Dispose()
                }
                $stream.Dispose()
            } catch {}
        }

        $rawPos = $tl.Position.TotalSeconds
        if ($status -eq 'Playing' -and $tl.LastUpdatedTime.UtcDateTime.Year -gt 2000) {
            $el = ([DateTime]::UtcNow - $tl.LastUpdatedTime.UtcDateTime).TotalSeconds
            if ($el -ge 0 -and $el -lt 3600) { $rawPos += $el }
        }
        $pos = [math]::Round($rawPos, 1)
        $dur = [math]::Round(($tl.EndTime - $tl.StartTime).TotalSeconds, 1)
        $now = [DateTime]::UtcNow
        $expected = $lastPos
        if ($status -eq 'Playing') { $expected = $lastPos + ($now - $lastT).TotalSeconds }
        $jumped = [math]::Abs($pos - $expected) -gt 2.5

        $sig = "$key|$status|$dur"
        $loops++
        if ($sig -ne $lastSig -or $newThumb -or $jumped -or ($loops % 8 -eq 0)) {
            $o = @{ active = $true; title = $title; artist = $artist; album = [string]$props.AlbumTitle
                    status = $status; pos = $pos; dur = $dur; app = [string]$s.SourceAppUserModelId }
            if ($newThumb) { $o.thumb = $thumb; $o.mime = $mime }
            Emit $o
            $lastSig = $sig
        }
        $lastPos = $pos
        $lastT = $now
    }
    Start-Sleep -Milliseconds 200
}
