// Lecture de la manette en tâche de fond (même quand HMZ n'est pas au premier plan).
// Un petit script PowerShell interroge XInput toutes les 50 ms et signale :
//   QUIT : Select (Back/View) + Start maintenus 1 seconde → quitter le jeu en cours
//   HOME : bouton Xbox (Guide) → revenir à HMZ
// Manettes Xbox via XInput ; PlayStation (DualShock 4, DualSense), Switch Pro et
// manettes génériques via l'API joystick de Windows. Sur ces manettes :
// Share/Create/- + Options/+ maintenus = quitter, bouton PS/Home = revenir à HMZ.
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const SCRIPT = String.raw`
$ErrorActionPreference = 'SilentlyContinue'
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public static class HmzPad {
  // XInput : manettes Xbox et manettes vues comme des manettes Xbox.
  [StructLayout(LayoutKind.Sequential)] public struct Pad { public ushort Buttons; public byte LT; public byte RT; public short LX; public short LY; public short RX; public short RY; }
  [StructLayout(LayoutKind.Sequential)] public struct State { public uint Packet; public Pad Gamepad; }
  [DllImport("xinput1_4.dll", EntryPoint = "#100")] static extern int GetStateEx(int i, out State s);
  [DllImport("xinput1_4.dll", EntryPoint = "XInputGetState")] static extern int GetState(int i, out State s);
  static bool exOk = true;
  public static int ReadX(int i) {
    State s;
    if (exOk) { try { if (GetStateEx(i, out s) == 0) return s.Gamepad.Buttons; return -1; } catch { exOk = false; } }
    try { if (GetState(i, out s) == 0) return s.Gamepad.Buttons; } catch {}
    return -1;
  }
  // API joystick de Windows : manettes PlayStation, Switch Pro et génériques.
  [StructLayout(LayoutKind.Sequential)] public struct JoyEx { public int Size; public int Flags; public int X; public int Y; public int Z; public int R; public int U; public int V; public int Buttons; public int ButtonNumber; public int Pov; public int R1; public int R2; }
  [DllImport("winmm.dll")] static extern int joyGetPosEx(int id, ref JoyEx j);
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)] public struct JoyCaps { public ushort Mid; public ushort Pid; [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 32)] public string Name; public int XMin, XMax, YMin, YMax, ZMin, ZMax, NumButtons, PeriodMin, PeriodMax, RMin, RMax, UMin, UMax, VMin, VMax, Caps, MaxAxes, NumAxes, MaxButtons; [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 32)] public string RegKey; [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 260)] public string OemVxD; }
  [DllImport("winmm.dll", CharSet = CharSet.Unicode)] static extern int joyGetDevCapsW(IntPtr id, ref JoyCaps c, int size);
  public static int ReadJ(int id) {
    JoyEx j = new JoyEx(); j.Size = Marshal.SizeOf(typeof(JoyEx)); j.Flags = 0xFF;
    try { if (joyGetPosEx(id, ref j) == 0) return j.Buttons; } catch {}
    return -1;
  }
  public static int Vendor(int id) {
    JoyCaps c = new JoyCaps();
    try { if (joyGetDevCapsW((IntPtr)id, ref c, Marshal.SizeOf(typeof(JoyCaps))) == 0) return c.Mid; } catch {}
    return 0;
  }
}
"@
[Console]::Out.WriteLine('READY')
$comboSince = $null; $comboSent = $false; $guidePrev = $false; $seen = ''
$joys = @(); $lastScan = [DateTime]::MinValue
while ($true) {
  # Les manettes branchées sont recherchées toutes les 3 s : interroger un
  # emplacement vide à chaque tour ralentirait Windows.
  if (([DateTime]::UtcNow - $lastScan).TotalSeconds -ge 3) {
    $lastScan = [DateTime]::UtcNow; $joys = @()
    for ($id = 0; $id -lt 16; $id++) {
      if ([HmzPad]::ReadJ($id) -ge 0) {
        $v = [HmzPad]::Vendor($id)
        # Les manettes Xbox (Microsoft, 0x045E) sont déjà lues par XInput.
        if ($v -ne 0x045E) { $joys += ,@($id, $v) }
      }
    }
  }
  $combo = $false; $guide = $false; $kinds = @()
  for ($i = 0; $i -lt 4; $i++) {
    $b = [HmzPad]::ReadX($i)
    if ($b -ge 0) {
      $kinds += 'xbox'
      if (($b -band 0x30) -eq 0x30) { $combo = $true }
      if ($b -band 0x400) { $guide = $true }
    }
  }
  foreach ($j in $joys) {
    $b = [HmzPad]::ReadJ($j[0])
    if ($b -lt 0) { continue }
    $kinds += $(if ($j[1] -eq 0x054C) { 'playstation' } elseif ($j[1] -eq 0x057E) { 'switch' } else { 'generic' })
    # Disposition commune PlayStation / Switch Pro / génériques :
    # bouton 9 = Share/Create/-/Select, bouton 10 = Options/+/Start, bouton 13 = PS/Home.
    if (($b -band 0x300) -eq 0x300) { $combo = $true }
    if ($b -band 0x1000) { $guide = $true }
  }
  $k = ($kinds | Sort-Object -Unique) -join ','
  if ($k -ne $seen) { $seen = $k; [Console]::Out.WriteLine('PAD:' + $k) }
  if ($combo) {
    if ($comboSince -eq $null) { $comboSince = [DateTime]::UtcNow }
    elseif (-not $comboSent -and ([DateTime]::UtcNow - $comboSince).TotalMilliseconds -ge 1000) { [Console]::Out.WriteLine('QUIT'); $comboSent = $true }
  } else { $comboSince = $null; $comboSent = $false }
  if ($guide -and -not $guidePrev) { [Console]::Out.WriteLine('HOME') }
  $guidePrev = $guide
  Start-Sleep -Milliseconds 50
}
`;

class PadWatcher {
  constructor(dir, onEvent) {
    this.dir = dir;
    this.onEvent = onEvent;
    this.proc = null;
    this.stopped = false;
    this.restarts = 0;
    this.kinds = [];
  }

  start() {
    if (process.platform !== 'win32' || this.proc) return;
    const file = path.join(this.dir, 'hmz-manette.ps1');
    try {
      fs.mkdirSync(this.dir, { recursive: true });
      fs.writeFileSync(file, '﻿' + SCRIPT);
    } catch { return; }
    const p = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-File', file], { windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] });
    this.proc = p;
    let buf = '';
    p.stdout.on('data', (d) => {
      buf += d.toString();
      let i;
      while ((i = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, i).trim();
        buf = buf.slice(i + 1);
        if (line.startsWith('PAD:')) { this.kinds = line.slice(4).split(',').filter(Boolean); this.onEvent('PAD', this.kinds); }
        else if (line) this.onEvent(line);
      }
    });
    p.on('exit', () => {
      this.proc = null;
      if (!this.stopped && this.restarts++ < 5) setTimeout(() => this.start(), 3000);
    });
  }

  // L'API joystick de Windows (winmm) ne voit que les manettes présentes au
  // lancement du script : une manette PlayStation branchée après coup reste
  // invisible tant que le script n'est pas relancé.
  refresh() {
    if (this.stopped || process.platform !== 'win32') return;
    this.restarts = 0;
    const p = this.proc;
    if (!p) return this.start();
    p.removeAllListeners('exit');
    p.on('exit', () => { this.proc = null; this.start(); });
    try { p.kill(); } catch { this.proc = null; this.start(); }
  }

  stop() {
    this.stopped = true;
    if (this.proc) { try { this.proc.kill(); } catch {} }
  }
}

module.exports = { PadWatcher, SCRIPT };
