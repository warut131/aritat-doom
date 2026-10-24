// A drop-in stand-in for PeerJS that talks between tabs of the same browser over BroadcastChannel.
// Used by the "test with several tabs" button and by automated tests, so the real lobby/net code runs unchanged.
const BC_NAME = 'aritat-mockpeer-v2';
let bc = null;
const local = new Map();      // id -> MockPeer living in this tab
const conns = new Map();      // cid -> MockConn living in this tab
const claims = new Set();     // peers still claiming their id
function chan() {
  if (bc) return bc;
  bc = new BroadcastChannel(BC_NAME);
  bc.onmessage = ev => {
    const m = ev.data;
    if (m.k === 'who') { if (local.has(m.id) && !local.get(m.id).destroyed) bc.postMessage({ k: 'mine', id: m.id, tok: -1 });
      for (const p of claims) if (p._claim && p._claim.id === m.id) { if (p._claim.tok < m.tok) bc.postMessage({ k: 'mine', id: m.id, tok: p._claim.tok }); else p._claim.taken = true; } }
    else if (m.k === 'mine') { for (const p of claims) if (p._claim && p._claim.id === m.id) p._claim.taken = true; }
    else if (m.k === 'conn') {
      const p = local.get(m.to); if (!p || p.destroyed || !p.open) return;
      const c = new MockConn(p, m.from, m.cid, m.meta); conns.set(m.cid, c); c.open = true;
      p._emit('connection', c); bc.postMessage({ k: 'acc', cid: m.cid }); setTimeout(() => c._emit('open'), 0);
    }
    else if (m.k === 'acc') { const c = conns.get(m.cid); if (c && !c.open && c._out) { c.open = true; clearTimeout(c._to); c._emit('open'); } }
    else if (m.k === 'msg') { const c = conns.get(m.cid); if (c && c.open && c._side !== m.side) c._emit('data', m.d); }
    else if (m.k === 'close') { const c = conns.get(m.cid); if (c && c._side !== m.side) c._remoteClose(); }
  };
  addEventListener('pagehide', () => { for (const c of conns.values()) c.close(); });
  return bc;
}
class Emitter {
  constructor() { this._h = {}; }
  on(e, f) { (this._h[e] = this._h[e] || []).push(f); return this; }
  _emit(e, ...a) { for (const f of this._h[e] || []) { try { f(...a); } catch (err) { console.error(err); } } }
}
class MockConn extends Emitter {
  constructor(peer, other, cid, meta) { super(); this.peer = peer.id; this._p = peer; this.other = other; this.cid = cid; this.open = false; this.metadata = meta; this._side = peer.id; }
  send(d) { if (!this.open) return; chan().postMessage({ k: 'msg', cid: this.cid, side: this._side, d: JSON.parse(JSON.stringify(d)) }); }
  close() { if (this._closed) return; this._closed = true; const was = this.open; this.open = false; chan().postMessage({ k: 'close', cid: this.cid, side: this._side }); conns.delete(this.cid); if (was) this._emit('close'); }
  _remoteClose() { if (this._closed) return; this._closed = true; this.open = false; conns.delete(this.cid); this._emit('close'); }
}
export class MockPeer extends Emitter {
  constructor(id, opts) {
    super(); if (typeof id === 'object') { opts = id; id = null; }
    this.id = id || 'mock-' + Math.random().toString(36).slice(2, 10); this.open = false; this.destroyed = false;
    chan();
    this._claim = { id: this.id, taken: false, tok: Math.random() }; claims.add(this);
    bc.postMessage({ k: 'who', id: this.id, tok: this._claim.tok });
    setTimeout(() => {
      claims.delete(this);
      if (this.destroyed) return;
      if (this._claim.taken) { this._emit('error', { type: 'unavailable-id', message: 'ID "' + this.id + '" is taken' }); return; }
      this._claim = null; local.set(this.id, this); this.open = true; this._emit('open', this.id);
    }, 400);
  }
  connect(to, o = {}) {
    const cid = Math.random().toString(36).slice(2);
    const c = new MockConn(this, to, cid, o.metadata); c._out = true; conns.set(cid, c);
    chan().postMessage({ k: 'conn', to, from: this.id, cid, meta: o.metadata });
    c._to = setTimeout(() => { if (!c.open) { conns.delete(cid); this._emit('error', { type: 'peer-unavailable', message: 'Could not connect to peer ' + to }); } }, 2500);
    return c;
  }
  reconnect() {}
  destroy() { if (this.destroyed) return; this.destroyed = true; this.open = false; for (const c of [...conns.values()]) if (c._p === this) c.close(); if (local.get(this.id) === this) local.delete(this.id); }
}
