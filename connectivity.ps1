$ErrorActionPreference='Stop'
[Console]::OutputEncoding=[Text.Encoding]::UTF8
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null=[Windows.Devices.Radios.Radio,Windows.System.Devices,ContentType=WindowsRuntime]
$null=[Windows.Devices.Enumeration.DeviceInformation,Windows.Devices.Enumeration,ContentType=WindowsRuntime]
$null=[Windows.Devices.Bluetooth.BluetoothDevice,Windows.Devices.Bluetooth,ContentType=WindowsRuntime]
$null=[Windows.Devices.WiFi.WiFiAdapter,Windows.Devices.WiFi,ContentType=WindowsRuntime]
$null=[Windows.Security.Credentials.PasswordCredential,Windows.Security.Credentials,ContentType=WindowsRuntime]
$null=[Windows.Networking.Connectivity.NetworkInformation,Windows.Networking.Connectivity,ContentType=WindowsRuntime]
$asTask=([System.WindowsRuntimeSystemExtensions].GetMethods()|Where-Object {$_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'})[0]
function Wait-Result($op,[Type]$type){$t=$asTask.MakeGenericMethod($type).Invoke($null,@($op));if(-not $t.Wait(15000)){throw 'Windows took too long. Try again.'};$t.Result}
function Wait-Action($op){$method=([System.WindowsRuntimeSystemExtensions].GetMethods()|Where-Object {$_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncAction'})[0];$t=$method.Invoke($null,@($op));if(-not $t.Wait(15000)){throw 'Scan timed out. Try again.'}}
try {
 $request=[Console]::In.ReadLine()|ConvertFrom-Json
 $kind=if($request.kind -eq 'wifi'){'WiFi'}else{'Bluetooth'}
 $radios=Wait-Result ([Windows.Devices.Radios.Radio]::GetRadiosAsync()) ([System.Collections.Generic.IReadOnlyList[Windows.Devices.Radios.Radio]])
 $radio=@($radios|Where-Object {$_.Kind.ToString() -eq $kind})|Select-Object -First 1
 if(-not $radio){throw "$kind adapter unavailable"}
 if($request.action -eq 'power'){
  $access=Wait-Result ([Windows.Devices.Radios.Radio]::RequestAccessAsync()) ([Windows.Devices.Radios.RadioAccessStatus])
  if($access.ToString() -ne 'Allowed'){throw 'Windows denied radio control.'}
  $state=if($request.on){[Windows.Devices.Radios.RadioState]::On}else{[Windows.Devices.Radios.RadioState]::Off}
  $result=Wait-Result ($radio.SetStateAsync($state)) ([Windows.Devices.Radios.RadioAccessStatus])
  if($result.ToString() -ne 'Allowed'){throw 'Windows denied this change.'}
 }
 $items=@();$message='';$on=$radio.State.ToString() -eq 'On'
 if($on -and $request.kind -eq 'wifi'){
  $access=Wait-Result ([Windows.Devices.WiFi.WiFiAdapter]::RequestAccessAsync()) ([Windows.Devices.WiFi.WiFiAccessStatus])
  if($access.ToString() -ne 'Allowed'){throw 'Windows denied Wi-Fi scanning. Check location permission for desktop apps.'}
  $adapters=Wait-Result ([Windows.Devices.WiFi.WiFiAdapter]::FindAllAdaptersAsync()) ([System.Collections.Generic.IReadOnlyList[Windows.Devices.WiFi.WiFiAdapter]])
  $adapter=@($adapters)|Select-Object -First 1
  if(-not $adapter){throw 'Wi-Fi adapter unavailable'}
  Wait-Action ($adapter.ScanAsync())
  $networks=@($adapter.NetworkReport.AvailableNetworks)
  if($request.action -eq 'connect'){
   $network=$networks|Where-Object {$_.Ssid -eq $request.id}|Select-Object -First 1
   if(-not $network){throw 'Network is no longer available. Refresh the list.'}
   if($request.password){$credential=New-Object Windows.Security.Credentials.PasswordCredential;$credential.Password=$request.password;$op=$adapter.ConnectAsync($network,[Windows.Devices.WiFi.WiFiReconnectionKind]::Automatic,$credential)}
   else{$op=$adapter.ConnectAsync($network,[Windows.Devices.WiFi.WiFiReconnectionKind]::Automatic)}
   $result=Wait-Result $op ([Windows.Devices.WiFi.WiFiConnectionResult])
   if($result.ConnectionStatus.ToString() -ne 'Success'){throw ('Connection failed: '+$result.ConnectionStatus)}
   $message='Connected'
  }
  if($request.action -eq 'disconnect'){$adapter.Disconnect();$message='Disconnected'}
  $connected=@([Windows.Networking.Connectivity.NetworkInformation]::GetConnectionProfiles()|Where-Object {$_.IsWlanConnectionProfile -and $_.GetNetworkConnectivityLevel().ToString() -ne 'None'}|ForEach-Object {$_.WlanConnectionProfileDetails.GetConnectedSsid()})
  $items=@($networks|Where-Object {$_.Ssid}|Sort-Object SignalBars -Descending|Group-Object Ssid|ForEach-Object {$n=$_.Group[0];@{id=$n.Ssid;name=$n.Ssid;connected=($connected -contains $n.Ssid);secured=($n.SecuritySettings.NetworkAuthenticationType.ToString() -ne 'Open80211');signal=[int]$n.SignalBars}})
 } elseif($on){
  if($request.action -eq 'disconnect'){throw 'Disconnect unavailable. Use Windows Bluetooth settings.'}
  $props=[string[]]@('System.Devices.Aep.IsConnected','System.Devices.Aep.DeviceAddress')
  $selector=[Windows.Devices.Bluetooth.BluetoothDevice]::GetDeviceSelectorFromPairingState($true)
  $devices=Wait-Result ([Windows.Devices.Enumeration.DeviceInformation]::FindAllAsync($selector,$props,[Windows.Devices.Enumeration.DeviceInformationKind]::AssociationEndpoint)) ([Windows.Devices.Enumeration.DeviceInformationCollection])
  if($request.action -eq 'connect'){
   $device=$devices|Where-Object {$_.Id -eq $request.id}|Select-Object -First 1
   if(-not $device -or -not $device.Pairing.IsPaired){throw 'Pair the device first.'}
   $native=Wait-Result ([Windows.Devices.Bluetooth.BluetoothDevice]::FromIdAsync($device.Id)) ([Windows.Devices.Bluetooth.BluetoothDevice]);if(-not $native){throw 'Device unavailable'};$address=$native.BluetoothAddress.ToString('X12');$native.Dispose()
   if($address -notmatch '^[0-9a-fA-F]{12}$'){throw 'Windows does not expose a connectable address for this device.'}
   Add-Type -TypeDefinition @"
using System;using System.Runtime.InteropServices;
public class GrumpBluetooth {
 [StructLayout(LayoutKind.Sequential)] public struct Time {public ushort y,m,dw,d,h,min,s,ms;}
 [StructLayout(LayoutKind.Sequential,CharSet=CharSet.Unicode)] public struct Info {
  public uint size;public ulong address;public uint deviceClass;public int connected,remembered,authenticated;public Time seen,used;
  [MarshalAs(UnmanagedType.ByValTStr,SizeConst=248)]public string name;
 }
 [DllImport("BluetoothAPIs.dll")]static extern uint BluetoothGetDeviceInfo(IntPtr radio,ref Info info);
 [DllImport("BluetoothAPIs.dll")]static extern uint BluetoothEnumerateInstalledServices(IntPtr radio,ref Info info,ref uint count,[Out] Guid[] services);
 [DllImport("BluetoothAPIs.dll")]static extern uint BluetoothSetServiceState(IntPtr radio,ref Info info,ref Guid service,uint flags);
 public static bool Connect(ulong address){
  Info i=new Info();i.size=(uint)Marshal.SizeOf(typeof(Info));i.address=address;
  uint err=BluetoothGetDeviceInfo(IntPtr.Zero,ref i);if(err!=0)throw new Exception("Device unavailable ("+err+")");
  uint count=32;Guid[] services=new Guid[count];err=BluetoothEnumerateInstalledServices(IntPtr.Zero,ref i,ref count,services);
  if(err!=0)throw new Exception("Cannot read Bluetooth services ("+err+")");
  bool requested=false;for(int n=0;n<count;n++){Guid g=services[n];string id=g.ToString();
   if(id=="0000110b-0000-1000-8000-00805f9b34fb"||id=="0000111e-0000-1000-8000-00805f9b34fb"||id=="00001124-0000-1000-8000-00805f9b34fb"){
    uint result=BluetoothSetServiceState(IntPtr.Zero,ref i,ref g,1);if(result==0||result==87)requested=true;
   }
  }return requested;
 }
}
"@
   if(-not [GrumpBluetooth]::Connect([Convert]::ToUInt64($address,16))){throw 'This device has no supported audio or input connection service.'}
   $message='Connection requested. Waiting for device…'
  }
  if($request.action -eq 'pair'){
   $device=$devices|Where-Object {$_.Id -eq $request.id}|Select-Object -First 1
   if(-not $device){throw 'Device is no longer available.'}
   $result=Wait-Result ($device.Pairing.PairAsync()) ([Windows.Devices.Enumeration.DevicePairingResult])
   $message=$result.Status.ToString()
   if($message -notin @('Paired','AlreadyPaired')){throw ('Pairing: '+$message)}
  }
  $items=@(foreach($device in $devices){
   if(-not $device.Name){continue}
   $connected=$null
   try{$native=Wait-Result ([Windows.Devices.Bluetooth.BluetoothDevice]::FromIdAsync($device.Id)) ([Windows.Devices.Bluetooth.BluetoothDevice]);if($native){$connected=$native.ConnectionStatus.ToString() -eq 'Connected';$native.Dispose()}}catch{}
   @{id=$device.Id;name=$device.Name;paired=$device.Pairing.IsPaired;connected=$connected}
  })
 }
 @{ok=$true;on=$on;canDisconnect=($request.kind -eq 'wifi');items=@($items);message=$message}|ConvertTo-Json -Depth 8 -Compress
}catch{@{ok=$false;error=$_.Exception.Message}|ConvertTo-Json -Compress}
