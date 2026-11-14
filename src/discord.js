// Statut Discord (« Joue à … ») par la connexion locale officielle de l'application Discord
// (Rich Presence). Rien ne passe par Internet : HMZ parle seulement à Discord ouvert sur le PC.
const net = require('net');

class DiscordPresence {
  constructor() { this.sock = null; this.ready = false; this.clientId = null; this.pending = null; this.buf = Buffer.alloc(0); }

  frame(op, data) {
    const json = Buffer.from(JSON.stringify(data));
    const h = Buffer.alloc(8);
    h.writeInt32LE(op, 0); h.writeInt32LE(json.length, 4);
    return Buffer.concat([h, json]);
  }

  connect(clientId) {
    if (process.platform !== 'win32' || !clientId) return Promise.resolve(false);
    if (this.sock && this.clientId === clientId) return Promise.resolve(this.ready);
    this.close();
    this.clientId = clientId;
    const tryPipe = (n) => new Promise((resolve) => {
      if (n > 9) return resolve(false);
      const s = net.createConnection(`\\\\?\\pipe\\discord-ipc-${n}`);
      const fail = () => { s.destroy(); resolve(tryPipe(n + 1)); };
      s.once('error', fail);
      s.once('connect', () => {
        s.removeListener('error', fail);
        this.sock = s;
        s.on('error', () => this.close());
        s.on('close', () => { this.sock = null; this.ready = false; });
        s.on('data', (d) => this.onData(d, resolve));
        s.write(this.frame(0, { v: 1, client_id: clientId }));
        setTimeout(() => resolve(this.ready), 4000);
      });
    });
    return tryPipe(0);
  }

  onData(d, resolve) {
    this.buf = Buffer.concat([this.buf, d]);
    while (this.buf.length >= 8) {
      const op = this.buf.readInt32LE(0), len = this.buf.readInt32LE(4);
      if (this.buf.length < 8 + len) return;
      let msg = {};
      try { msg = JSON.parse(this.buf.toString('utf8', 8, 8 + len)); } catch {}
      this.buf = this.buf.subarray(8 + len);
      if (op === 1 && msg.evt === 'READY') {
        this.ready = true;
        resolve && resolve(true);
        if (this.pending !== null) { const p = this.pending; this.pending = null; this.send(p); }
      }
      if (op === 2) this.close(); // Discord a refusé (identifiant d'application invalide)
    }
  }

  send(activity) {
    if (!this.sock || !this.ready) { this.pending = activity; return; }
    this.sock.write(this.frame(1, { cmd: 'SET_ACTIVITY', args: { pid: process.pid, activity: activity || undefined }, nonce: String(Date.now()) + Math.random() }));
  }

  async set(clientId, activity) {
    if (!(await this.connect(clientId))) { this.pending = activity; return false; }
    this.send(activity);
    return true;
  }

  clear() { if (this.sock && this.ready) this.send(null); this.pending = null; }
  close() { try { if (this.sock) this.sock.destroy(); } catch {} this.sock = null; this.ready = false; }
}

module.exports = { DiscordPresence };
