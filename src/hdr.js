// HDR de Windows, activé pour un jeu puis remis comme avant.
// Utilise l'API d'affichage officielle de Windows (DisplayConfigSetDeviceInfo,
// « couleur avancée »), la même que l'interrupteur HDR des Paramètres Windows.
const { run } = require('./util');

const PS = (mode) => `$ErrorActionPreference='Stop'
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class HmzHdr {
  [DllImport("user32.dll")] static extern int GetDisplayConfigBufferSizes(uint flags, out uint numPaths, out uint numModes);
  [DllImport("user32.dll")] static extern int QueryDisplayConfig(uint flags, ref uint numPaths, byte[] paths, ref uint numModes, byte[] modes, IntPtr topology);
  [DllImport("user32.dll")] static extern int DisplayConfigGetDeviceInfo(byte[] packet);
  [DllImport("user32.dll")] static extern int DisplayConfigSetDeviceInfo(byte[] packet);
  const int PATH_SIZE = 72, MODE_SIZE = 64;
  // Renvoie une ligne par écran : identifiant;pris en charge;activé
  public static string Run(string mode, string only) {
    uint np, nm;
    if (GetDisplayConfigBufferSizes(2, out np, out nm) != 0) return "";
    byte[] paths = new byte[np * PATH_SIZE], modes = new byte[nm * MODE_SIZE];
    if (QueryDisplayConfig(2, ref np, paths, ref nm, modes, IntPtr.Zero) != 0) return "";
    var sb = new System.Text.StringBuilder();
    for (int i = 0; i < np; i++) {
      int o = i * PATH_SIZE + 20; // targetInfo : adapterId (8 octets) puis id
      uint low = BitConverter.ToUInt32(paths, o), id = BitConverter.ToUInt32(paths, o + 8);
      int high = BitConverter.ToInt32(paths, o + 4);
      string key = low + "-" + high + "-" + id;
      byte[] get = new byte[32];
      BitConverter.GetBytes(9).CopyTo(get, 0);   // GET_ADVANCED_COLOR_INFO
      BitConverter.GetBytes(32).CopyTo(get, 4);
      BitConverter.GetBytes(low).CopyTo(get, 8); BitConverter.GetBytes(high).CopyTo(get, 12); BitConverter.GetBytes(id).CopyTo(get, 16);
      if (DisplayConfigGetDeviceInfo(get) != 0) continue;
      uint v = BitConverter.ToUInt32(get, 20);
      bool supported = (v & 1) != 0, enabled = (v & 2) != 0;
      if ((mode == "on" || mode == "off") && supported && (only == "" || only.Contains("|" + key + "|"))) {
        bool want = mode == "on";
        if (want != enabled) {
          byte[] set = new byte[24];
          BitConverter.GetBytes(10).CopyTo(set, 0);  // SET_ADVANCED_COLOR_STATE
          BitConverter.GetBytes(24).CopyTo(set, 4);
          BitConverter.GetBytes(low).CopyTo(set, 8); BitConverter.GetBytes(high).CopyTo(set, 12); BitConverter.GetBytes(id).CopyTo(set, 16);
          BitConverter.GetBytes(want ? 1u : 0u).CopyTo(set, 20);
          if (DisplayConfigSetDeviceInfo(set) == 0) { sb.Append(key + ";1;" + (want ? "1" : "0") + ";changed\\n"); continue; }
        }
      }
      sb.Append(key + ";" + (supported ? "1" : "0") + ";" + (enabled ? "1" : "0") + "\\n");
    }
    return sb.ToString();
  }
}
'@
[HmzHdr]::Run('${mode}', '__ONLY__')`;

function parse(out) {
  return String(out).split(/\r?\n/).filter(Boolean).map((l) => { const [key, sup, on, changed] = l.split(';'); return { key, supported: sup === '1', enabled: on === '1', changed: changed === 'changed' }; });
}

async function call(mode, only = []) {
  if (process.platform !== 'win32') return [];
  const script = PS(mode).replace('__ONLY__', only.length ? `|${only.join('|')}|` : '');
  return parse(await run('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script]));
}

// Active le HDR sur les écrans compatibles ; renvoie ceux qui ont été changés (à remettre après).
async function enable() { return (await call('on')).filter((d) => d.changed).map((d) => d.key); }
async function restore(keys) { if (keys && keys.length) await call('off', keys); }
const status = () => call('status');

module.exports = { enable, restore, status, parse };
