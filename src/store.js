// Base de données JSON locale (dans le dossier de données de l'appli).
const fs = require('fs');
const path = require('path');

class Store {
  constructor(file, defaults) {
    this.file = file;
    this.defaults = defaults;
    this.data = this._load();
    this._timer = null;
  }

  _load() {
    const base = JSON.parse(JSON.stringify(this.defaults));
    for (const f of [this.file, this.file + '.bak']) {
      try {
        const raw = JSON.parse(fs.readFileSync(f, 'utf8'));
        return deepMerge(base, raw);
      } catch { /* fichier absent ou abîmé : on essaie la sauvegarde */ }
    }
    return base;
  }

  save(now = false) {
    clearTimeout(this._timer);
    const write = () => {
      try {
        fs.mkdirSync(path.dirname(this.file), { recursive: true });
        const tmp = this.file + '.tmp';
        fs.writeFileSync(tmp, JSON.stringify(this.data));
        if (fs.existsSync(this.file)) fs.copyFileSync(this.file, this.file + '.bak');
        fs.renameSync(tmp, this.file);
      } catch (e) { console.error('Sauvegarde impossible', e); }
    };
    if (now) write(); else this._timer = setTimeout(write, 400);
  }
}

function deepMerge(base, over) {
  if (Array.isArray(base) || Array.isArray(over)) return over === undefined ? base : over;
  if (base && typeof base === 'object' && over && typeof over === 'object') {
    const out = { ...base };
    for (const k of Object.keys(over)) out[k] = k in base ? deepMerge(base[k], over[k]) : over[k];
    return out;
  }
  return over === undefined ? base : over;
}

module.exports = { Store };
