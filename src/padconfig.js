// Manette réglée automatiquement dans les émulateurs qui ne le font pas tout seuls.
// Appliqué juste avant de lancer un jeu, et SEULEMENT si aucune manette n'est déjà réglée
// dans l'émulateur (un réglage fait à la main n'est jamais écrasé).
//
// Noms des boutons vérifiés dans le code source de chaque émulateur :
//   DuckStation : src/util/sdl_input_source.cpp (noms Xbox « A, B… » ou PlayStation « Cross… »)
//   PCSX2       : pcsx2/Input/SDLInputSource.cpp (noms enregistrés sans espace : FaceSouth…)
//   Dolphin     : InputCommon/ControllerInterface/XInput/XInput.cpp (« Button A », « Pad N »…)
//
// Émulateurs qui reconnaissent déjà la manette tout seuls (rien à écrire) : PPSSPP, mGBA,
// Rosalie's Mupen GUI, Flycast, xemu, Xenia, Vita3K, shadPS4, Eden, Lichii, Azahar, melonDS (déjà réglés par HMZ).
const fs = require('fs');
const path = require('path');
const { setKeys, getKey } = require('./emuconfig');

const exists = (p) => { try { fs.accessSync(p); return true; } catch { return false; } };
const readText = (p) => { try { return fs.readFileSync(p, 'utf8'); } catch { return ''; } };

// Section [Pad1] déjà reliée à une manette ?
function hasPadBinding(file, section) {
  const t = readText(file);
  const start = t.search(new RegExp(`^\\[${section}\\]\\s*$`, 'm'));
  if (start < 0) return false;
  const rest = t.slice(start + section.length + 2);
  const end = rest.search(/^\[.+\]\s*$/m);
  const body = end < 0 ? rest : rest.slice(0, end);
  return /=\s*(SDL|XInput|DInput|DualShock|SInput)-\d/i.test(body);
}

// --- DuckStation (PS1) et PCSX2 (PS2) : même logique de boutons --------------------------
function sdlPad(names, ps) {
  const b = (n) => `SDL-0/${n}`;
  return {
    Up: b('DPadUp'), Right: b('DPadRight'), Down: b('DPadDown'), Left: b('DPadLeft'),
    Cross: b(names.south), Circle: b(names.east), Square: b(names.west), Triangle: b(names.north),
    Select: b(names.back), Start: b(names.start),
    L1: b(names.l1), R1: b(names.r1), L2: b(`+${names.lt}`), R2: b(`+${names.rt}`), L3: b(names.l3), R3: b(names.r3),
    LUp: b('-LeftY'), LDown: b('+LeftY'), LLeft: b('-LeftX'), LRight: b('+LeftX'),
    RUp: b('-RightY'), RDown: b('+RightY'), RLeft: b('-RightX'), RRight: b('+RightX'),
    Analog: b(names.guide), LargeMotor: b('LargeMotor'), SmallMotor: b('SmallMotor'),
  };
}
const DUCK_XBOX = { south: 'A', east: 'B', west: 'X', north: 'Y', back: 'Back', start: 'Start', guide: 'Guide', l1: 'LeftShoulder', r1: 'RightShoulder', l3: 'LeftStick', r3: 'RightStick', lt: 'LeftTrigger', rt: 'RightTrigger' };
const DUCK_PS = { south: 'Cross', east: 'Circle', west: 'Square', north: 'Triangle', back: 'Create', start: 'Options', guide: 'PS', l1: 'L1', r1: 'R1', l3: 'L3', r3: 'R3', lt: 'L2', rt: 'R2' };
const PCSX2_ALL = { south: 'FaceSouth', east: 'FaceEast', west: 'FaceWest', north: 'FaceNorth', back: 'Back', start: 'Start', guide: 'Guide', l1: 'LeftShoulder', r1: 'RightShoulder', l3: 'LeftStick', r3: 'RightStick', lt: 'LeftTrigger', rt: 'RightTrigger' };

function duckstation(dir, kind) {
  const file = path.join(dir, 'settings.ini');
  // Avant le tout premier lancement, DuckStation crée ses propres réglages : on attend qu'ils existent.
  if (!exists(file)) return { skipped: 'premier lancement' };
  if (hasPadBinding(file, 'Pad1')) return { skipped: 'déjà réglée' };
  const map = sdlPad(kind === 'playstation' ? DUCK_PS : DUCK_XBOX);
  setKeys(file, { Pad1: { Type: 'AnalogController', ...map }, InputSources: { SDL: 'true' } }, ' = ');
  return { done: true };
}

function pcsx2(dir) {
  const file = path.join(dir, 'inis', 'PCSX2.ini');
  if (!exists(file)) return { skipped: 'premier lancement' };
  if (hasPadBinding(file, 'Pad1')) return { skipped: 'déjà réglée' };
  setKeys(file, { Pad1: { Type: 'DualShock2', ...sdlPad(PCSX2_ALL) }, InputSources: { SDL: 'true' } }, ' = ');
  return { done: true };
}

// --- Dolphin (GameCube) : manettes XInput (Xbox et compatibles) -------------------------
function dolphin(dir, kind) {
  if (kind !== 'xbox' && kind !== 'generic') return { skipped: 'manette non XInput' };
  const file = path.join(dir, 'User', 'Config', 'GCPadNew.ini');
  const cur = getKey(file, 'GCPad1', 'Device');
  if (cur && !/^DInput\/0\/Keyboard/i.test(cur)) return { skipped: 'déjà réglée' };
  const t = (x) => `\`${x}\``;
  setKeys(file, {
    GCPad1: {
      Device: 'XInput/0/Gamepad',
      'Buttons/A': t('Button A'), 'Buttons/B': t('Button B'), 'Buttons/X': t('Button X'), 'Buttons/Y': t('Button Y'),
      'Buttons/Z': t('Shoulder R'), 'Buttons/Start': 'Start',
      'Main Stick/Up': t('Left Y+'), 'Main Stick/Down': t('Left Y-'), 'Main Stick/Left': t('Left X-'), 'Main Stick/Right': t('Left X+'),
      'C-Stick/Up': t('Right Y+'), 'C-Stick/Down': t('Right Y-'), 'C-Stick/Left': t('Right X-'), 'C-Stick/Right': t('Right X+'),
      'Triggers/L': t('Trigger L'), 'Triggers/R': t('Trigger R'), 'Triggers/L-Analog': t('Trigger L'), 'Triggers/R-Analog': t('Trigger R'),
      'D-Pad/Up': t('Pad N'), 'D-Pad/Down': t('Pad S'), 'D-Pad/Left': t('Pad W'), 'D-Pad/Right': t('Pad E'),
      'Rumble/Motor': `${t('Motor L')} | ${t('Motor R')}`,
    },
  }, ' = ');
  return { done: true };
}

const BY_EMU = { duckstation, pcsx2, dolphin };

// Appelé avant chaque lancement. Ne lève jamais d'erreur : au pire, rien n'est écrit.
function ensure(emuId, emuDir, padKind) {
  const fn = BY_EMU[emuId];
  if (!fn || !emuDir) return { skipped: 'rien à faire' };
  try { return fn(emuDir, padKind || 'xbox'); } catch (e) { return { error: e.message }; }
}

const AUTO = ['ppsspp', 'mgba', 'rmg', 'flycast', 'xemu', 'xenia', 'vita3k', 'shadps4'];
module.exports = { ensure, hasPadBinding, BY_EMU, AUTO, sdlPad };
