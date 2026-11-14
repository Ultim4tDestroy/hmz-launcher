// Fiche d'un jeu : succès Steam (lus sur le PC) et lien HowLongToBeat.
const fs = require('fs');
const path = require('path');

// --- Format binaire « KeyValues » de Steam ------------------------------------------------
function readKv(buf) {
  let i = 0;
  const cstr = () => { const e = buf.indexOf(0, i); const s = buf.toString('utf8', i, e < 0 ? buf.length : e); i = e < 0 ? buf.length : e + 1; return s; };
  const node = () => {
    const o = {};
    while (i < buf.length) {
      const t = buf[i++];
      if (t === 0x08 || t === 0x0b) return o;
      const k = cstr();
      switch (t) {
        case 0x00: o[k] = node(); break;
        case 0x01: o[k] = cstr(); break;
        case 0x02: case 0x04: case 0x06: o[k] = buf.readInt32LE(i); i += 4; break;
        case 0x03: o[k] = buf.readFloatLE(i); i += 4; break;
        case 0x07: case 0x0a: o[k] = Number(buf.readBigUInt64LE(i)); i += 8; break;
        case 0x05: { const e = buf.indexOf('\0\0', i, 'utf16le'); o[k] = buf.toString('utf16le', i, e); i = e + 2; break; }
        default: return o; // type inconnu : on s'arrête proprement
      }
    }
    return o;
  };
  return node();
}

const lower = (o) => { const r = {}; for (const [k, v] of Object.entries(o || {})) r[k.toLowerCase()] = v; return r; };
const tr = (v) => (typeof v === 'string' ? v : v ? v.french || v.english || Object.values(v).find((x) => typeof x === 'string') || '' : '');

// Succès d'un jeu Steam, d'après les fichiers que Steam garde pour les jeux lancés sur ce PC.
function steamAchievements(steamRoot, appid) {
  const dir = path.join(steamRoot, 'appcache', 'stats');
  let schema;
  try { schema = readKv(fs.readFileSync(path.join(dir, `UserGameStatsSchema_${appid}.bin`))); } catch { return null; }
  const root = schema[String(appid)] || Object.values(schema)[0] || {};
  const stats = lower(root).stats || {};
  // Fichier de progression le plus récent (un par compte Steam).
  let user = {};
  try {
    const files = fs.readdirSync(dir).filter((f) => new RegExp(`^UserGameStats_\\d+_${appid}\\.bin$`).test(f))
      .map((f) => ({ f, t: fs.statSync(path.join(dir, f)).mtimeMs })).sort((a, b) => b.t - a.t);
    if (files[0]) user = readKv(fs.readFileSync(path.join(dir, files[0].f))).cache || {};
  } catch {}
  const list = [];
  for (const [sid, st] of Object.entries(stats)) {
    const s = lower(st);
    const type = String(s.type);
    if (!['4', '5', 'ACHIEVEMENTS', 'GROUPACHIEVEMENTS'].includes(type) || !s.bits) continue;
    const u = user[sid] || {};
    const data = Number(u.data) || 0;
    const times = u.AchievementTimes || u.achievementtimes || {};
    for (const [bid, b] of Object.entries(s.bits)) {
      const bb = lower(b);
      const bit = bb.bit !== undefined ? Number(bb.bit) : Number(bid);
      const d = lower(bb.display);
      const got = ((data >>> bit) & 1) === 1;
      const icon = got ? d.icon : (d.icon_gray || d.icon);
      list.push({
        name: tr(d.name) || bb.name || '',
        desc: tr(d.desc),
        hidden: String(d.hidden) === '1',
        unlocked: got,
        time: got && times[String(bit)] ? Number(times[String(bit)]) * 1000 : null,
        icon: icon ? `https://cdn.cloudflare.steamstatic.com/steamcommunity/public/images/apps/${appid}/${icon}` : null,
      });
    }
  }
  if (!list.length) return null;
  list.sort((a, b) => (b.unlocked - a.unlocked) || ((b.time || 0) - (a.time || 0)));
  return { total: list.length, unlocked: list.filter((a) => a.unlocked).length, list };
}

// --- HowLongToBeat -----------------------------------------------------------------------
// Le site n'a pas d'API publique : la fiche propose simplement un lien vers sa page de recherche.
function hltbLink(name) {
  return `https://howlongtobeat.com/?q=${encodeURIComponent(name.replace(/[™®©]/g, '').trim())}`;
}

module.exports = { readKv, steamAchievements, hltbLink };
