/* Omissis demo: user interface */
(function () {
  'use strict';

  const T = window.Tessera, LG = window.TesseraLedger, S = window.TesseraStore, SAMPLE = window.TesseraSample;
  const W = 960, H = 720, TILE = 60, COLS = W / TILE, ROWS = H / TILE, N = COLS * ROWS;
  const MAKER = 'Lumen Optics';
  const MODEL = 'Lumen S1 sensor';
  const MEMBERS = [
    { name: 'Press Union', short: 'PU', color: '#8ab4ff' },
    { name: 'Univ. Lab', short: 'UL', color: '#7de6d4' },
    { name: 'Rights NGO', short: 'RN', color: '#ffd27a' },
  ];
  const STEPS = [
    { id: 'network', label: 'Trust network' },
    { id: 'capture', label: 'Capture' },
    { id: 'register', label: 'Register' },
    { id: 'redact', label: 'Redact' },
    { id: 'verify', label: 'Verify' },
    { id: 'attack', label: 'Attack lab' },
  ];
  const SETUP = [
    { id: 'fund', title: 'Create the accounts', sub: 'Consortium, manufacturer and photographer, funded by the testnet faucet' },
    { id: 'signers', title: 'Consortium becomes 2-of-3', sub: 'SignerListSet: three independent members, any two can act' },
    { id: 'master', title: 'Nobody owns it alone', sub: 'Master key disabled: only the members together control the consortium' },
    { id: 'credential', title: 'Admit the manufacturer', sub: 'CredentialCreate (XLS-70), multi-signed by two members' },
    { id: 'accept', title: 'Manufacturer accepts', sub: 'CredentialAccept: the accreditation is live on the ledger' },
    { id: 'sensor', title: 'Sensor key born in the chip', sub: 'ECDSA P-256, non-extractable: it can sign, it can never leave' },
    { id: 'cert', title: 'Certify the sensor', sub: 'The manufacturer registers the sensor public key on the ledger' },
  ];

  // --- icons ---
  const P = {
    camera: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    spin: '<path d="M21 12a9 9 0 1 1-6.2-8.56"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/>',
    warn: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
    minus: '<path d="M6 12h12"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
    shieldX: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9.5 9.5 5 5M14.5 9.5l-5 5"/>',
    key: '<circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6M15.5 7.5l3 3L22 7l-3-3"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    factory: '<path d="M2 20h20V9l-6 4V9l-6 4V4H2z"/><path d="M6 16h.01M10 16h.01M14 16h.01M18 16h.01"/>',
    chip: '<rect x="5" y="5" width="14" height="14" rx="2"/><path d="M9 9h6v6H9zM9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/>',
    eye: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>',
    anchor: '<circle cx="12" cy="5" r="3"/><path d="M12 22V8M5 12H2a10 10 0 0 0 20 0h-3"/>',
    brush: '<path d="m9.06 11.9 8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08"/><path d="M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1.08 1.1 2.49 2.02 4 2.02 2.2 0 4-1.8 4-4.04a3.01 3.01 0 0 0-3-3.02z"/>',
    crop: '<path d="M6 2v14a2 2 0 0 0 2 2h14M18 22V8a2 2 0 0 0-2-2H2"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
    arrow: '<path d="M5 12h14M13 5l7 7-7 7"/>',
    refresh: '<path d="M21 12a9 9 0 0 1-15.5 6.2L3 16M3 21v-5h5M3 12A9 9 0 0 1 18.5 5.8L21 8M21 3v5h-5"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>',
    ban: '<circle cx="12" cy="12" r="9"/><path d="m5.6 5.6 12.8 12.8"/>',
    flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
    sparkle: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/>',
    timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9.5 2h5"/>',
    flip: '<path d="M12 3v18"/><path d="M8.5 7 4 12l4.5 5zM15.5 7 20 12l-4.5 5z"/>',
  };
  const icon = (name, sw) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw || 2}" stroke-linecap="round" stroke-linejoin="round">${P[name] || ''}</svg>`;
  const iconEl = (name, sw) => { const s = document.createElement('span'); s.style.display = 'contents'; s.innerHTML = icon(name, sw); return s; };

  // --- dom helpers ---
  const $ = (id) => document.getElementById(id);
  function h(tag, props, ...kids) {
    const el = document.createElement(tag);
    if (props) {
      for (const [k, v] of Object.entries(props)) {
        if (v == null || v === false) continue;
        if (k === 'class') el.className = v;
        else if (k === 'html') el.innerHTML = v;
        else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
        else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
        else el.setAttribute(k, v === true ? '' : v);
      }
    }
    for (const kid of kids.flat(Infinity)) {
      if (kid == null || kid === false) continue;
      el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
    }
    return el;
  }
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const fill = (node, ...kids) => node.replaceChildren(...kids.flat(Infinity).filter((k) => k != null && k !== false));
  const fmtInt = (n) => Number(n).toLocaleString('en-US');
  const fmtClock = (iso) => (iso ? new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—');
  const short = (s, n) => { n = n || 6; return s ? (s.length > n + 6 ? `${s.slice(0, n)}…${s.slice(-4)}` : s) : '—'; };
  const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const el = {
    stage: $('stage'), frame: $('frame'), video: $('video'), canvas: $('canvas'), tiles: $('tiles'), crop: $('cropBox'),
    hudTL: $('hudTL'), hudTR: $('hudTR'), hudBL: $('hudBL'), flash: $('flash'), countdown: $('countdown'), empty: $('empty'),
    diagram: $('diagram'), audit: $('audit'), roll: $('roll'), panel: $('panel'), steps: $('steps'),
    net: $('net'), netLabel: $('netLabel'), netLedger: $('netLedger'), netSwitch: $('netSwitch'),
    blocks: $('blocks'), chainSub: $('chainSub'), toasts: $('toasts'), file: $('fileInput'),
  };
  const ctx = el.canvas.getContext('2d');
  const tileEls = [];
  for (let i = 0; i < N; i++) { const t = h('div', { class: 'tile', 'data-i': i }); tileEls.push(t); el.tiles.append(t); }

  // --- state ---
  const app = {
    net: S.pref('network') === 'sim' ? 'sim' : 'testnet',
    ledger: null,
    connected: false,
    world: null,
    sensor: null,
    roll: [],
    currentId: null,
    step: 'network',
    stream: null,
    capView: 'live',
    blocks: [],
    busy: null,
    setupRun: { running: null, error: null },
    redact: null,
    tamper: null,
    verifyCache: {},
    revokeChoice: 'theft',
    signing: [false, false, false],
    resetArmed: false,
    fileMode: 'verify',
    // Selfie mode: mirrored preview (like a phone's front camera) and a 3-2-1 self-timer.
    mirror: S.pref('mirror') !== '0',
    selfTimer: S.pref('selftimer') !== '0',
    countdown: null,
  };
  const ready = () => !!(app.world && app.world.ready && app.sensor && app.sensor.certTx);
  const current = () => app.roll.find((p) => p.id === app.currentId) || null;

  // Sensor key persistence. Normally the non-extractable CryptoKey itself is stored in IndexedDB.
  // Some browsers/configurations refuse to store CryptoKey objects: then we keep a JWK copy (demo fallback).
  async function persistSensor() {
    const s = app.sensor;
    if (!s) return;
    if (s.jwk) await S.set(`sensor.${app.net}`, { pk: s.pk, id: s.id, certTx: s.certTx, certLedger: s.certLedger, jwk: s.jwk });
    else await S.set(`sensor.${app.net}`, s);
  }
  async function loadSensor(net) {
    const rec = await S.get(`sensor.${net}`);
    if (!rec) return null;
    if (rec.privateKey) return rec;
    if (rec.jwk) {
      const privateKey = await crypto.subtle.importKey('jwk', rec.jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
      return Object.assign({}, rec, { privateKey });
    }
    return null;
  }

  // --- toasts ---
  function toast(msg, kind, actions) {
    const t = h('div', { class: `toast ${kind || ''}` }, h('div', null, msg),
      actions && actions.length ? h('div', { class: 'tb' }, actions) : null);
    el.toasts.append(t);
    setTimeout(() => t.remove(), actions ? 12000 : 5200);
    return t;
  }
  async function guard(fn) {
    try { return await fn(); } catch (e) {
      console.error(e);
      toast(e && e.message ? e.message : String(e), 'err');
    } finally { app.busy = null; }
  }

  // --- generic UI pieces ---
  function head(kicker, title, lead) {
    return h('div', { class: 'p-head' }, h('div', { class: 'p-kicker' }, kicker), h('h2', { class: 'p-title' }, title),
      lead ? h('p', { class: 'p-lead', html: lead }) : null);
  }
  function card(title, right, ...kids) {
    return h('div', { class: 'card' }, title ? h('div', { class: 'card-h' }, h('span', null, title), right || null) : null, kids);
  }
  const kv = (k, v, cls) => h('div', { class: 'kv' }, h('span', { class: 'k' }, k), h('span', { class: `v ${cls || ''}` }, v));
  function button(label, o) {
    o = o || {};
    return h('button', { class: `btn ${o.kind || ''}`, onclick: o.onClick, disabled: o.disabled, title: o.title, id: o.id },
      o.icon ? iconEl(o.icon) : null, label);
  }
  function busyButton(b, label) {
    b.classList.add('busy');
    b.disabled = true;
    b.innerHTML = `${icon('spin', 2.5)}${label}`;
  }
  function txLink(hash, label) {
    if (!hash) return h('span', { class: 'dim' }, '—');
    const url = app.ledger && app.ledger.explorer ? app.ledger.explorer('tx', hash) : null;
    const text = `${label ? label + ' ' : ''}${short(hash, 6)}`;
    return url ? h('a', { class: 'tx', href: url, target: '_blank', rel: 'noopener' }, text, ' ↗')
      : h('span', { class: 'tx sim', title: 'Simulated ledger' }, text);
  }
  function acctLink(addr) {
    if (!addr) return h('span', { class: 'dim' }, '—');
    const url = app.ledger && app.ledger.explorer ? app.ledger.explorer('account', addr) : null;
    return url ? h('a', { class: 'tx', href: url, target: '_blank', rel: 'noopener' }, short(addr, 7), ' ↗')
      : h('span', { class: 'tx sim' }, short(addr, 7));
  }
  const chip = (cls, ...kids) => h('span', { class: `chip ${cls || ''}` }, kids);
  function hud(tl, tr, bl) {
    el.hudTL.replaceChildren(...(tl || []));
    el.hudTR.replaceChildren(...(tr || []));
    el.hudBL.replaceChildren(...(bl || []));
  }
  function emptyBox(ic, title, text, ...actions) {
    return h('div', { class: 'empty-inner' }, iconEl(ic, 1.6), h('h3', null, title), h('p', null, text),
      actions.length ? h('div', { class: 'actions', style: { justifyContent: 'center', marginTop: '4px' } }, actions) : null);
  }

  // --- stage ---
  function setFrame(mode) {
    el.frame.className = `frame mode-${mode}${app.mirror ? ' mirror' : ''}`;
    el.stage.classList.remove('show-diagram', 'show-audit');
  }
  function showDiagram() { el.stage.classList.add('show-diagram'); el.stage.classList.remove('show-audit'); }
  function showAudit() { el.stage.classList.add('show-audit'); el.stage.classList.remove('show-diagram'); }
  function drawRgb(rgb, target) {
    const c = target || ctx;
    const img = c.createImageData(W, H);
    const d = img.data;
    for (let i = 0, j = 0; j < rgb.length; i += 4, j += 3) { d[i] = rgb[j]; d[i + 1] = rgb[j + 1]; d[i + 2] = rgb[j + 2]; d[i + 3] = 255; }
    c.putImageData(img, 0, 0);
  }
  function rgbFromCtx(c) {
    const d = c.getImageData(0, 0, W, H).data;
    const rgb = new Uint8Array(W * H * 3);
    for (let i = 0, j = 0; i < d.length; i += 4, j += 3) { rgb[j] = d[i]; rgb[j + 1] = d[i + 1]; rgb[j + 2] = d[i + 2]; }
    return rgb;
  }
  function clearTiles(gridLines) {
    el.tiles.className = `tiles${gridLines ? ' grid' : ''}`;
    for (const t of tileEls) { t.className = 'tile'; t.style.removeProperty('--c'); t.style.removeProperty('--d'); }
    el.crop.style.display = 'none';
  }
  function showPhoto(photo, opts) {
    opts = opts || {};
    setFrame('photo');
    drawRgb(photo.rgb);
    clearTiles(opts.grid !== false);
    for (let i = 0; i < N; i++) if (photo.manifest.salts[i] == null) tileEls[i].classList.add('gone');
  }
  function hashColor(hex) {
    const a = parseInt(hex.slice(0, 2), 16), b = parseInt(hex.slice(2, 4), 16), c = parseInt(hex.slice(4, 6), 16);
    return `hsl(${Math.round((a / 255) * 360)} ${58 + Math.round((b / 255) * 22)}% ${48 + Math.round((c / 255) * 14)}%)`;
  }
  function scanTiles(manifest) {
    for (let i = 0; i < N; i++) {
      const t = tileEls[i];
      const r = Math.floor(i / COLS), c = i % COLS;
      t.style.setProperty('--c', hashColor(manifest.leaves[i]));
      t.style.setProperty('--d', `${(r + c) * 34}ms`);
      t.classList.remove('scan');
      void t.offsetWidth;
      t.classList.add('scan');
    }
    setTimeout(() => tileEls.forEach((t) => t.classList.remove('scan')), 2600);
  }
  function flash() { el.flash.classList.remove('go'); void el.flash.offsetWidth; el.flash.classList.add('go'); }
  function makeThumb(rgb) {
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    drawRgb(rgb, c.getContext('2d'));
    const t = document.createElement('canvas'); t.width = 240; t.height = 180;
    const tc = t.getContext('2d');
    tc.imageSmoothingQuality = 'high';
    tc.drawImage(c, 0, 0, 240, 180);
    return t.toDataURL('image/jpeg', 0.82);
  }
  function fly(fromEl, text) {
    const target = el.blocks.lastElementChild || el.blocks;
    if (!fromEl) return;
    const a = fromEl.getBoundingClientRect(), b = target.getBoundingClientRect();
    const f = h('div', { class: 'flyer' }, text);
    document.body.append(f);
    f.style.left = `${a.left}px`;
    f.style.top = `${a.top}px`;
    const dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + a.height / 2);
    const anim = f.animate([
      { transform: 'translate(0,0) scale(1)', opacity: 1 },
      { transform: `translate(${dx * 0.45}px, ${dy * 0.45 - 70}px) scale(1.05)`, opacity: 1, offset: 0.45 },
      { transform: `translate(${dx}px, ${dy}px) scale(0.35)`, opacity: 0.15 },
    ], { duration: 1200, easing: 'cubic-bezier(.45,0,.25,1)' });
    anim.onfinish = () => f.remove();
  }

  // --- photos ---
  function newPhoto(o) {
    return {
      id: `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      kind: o.kind, label: o.label, parent: o.parent || null, createdAt: new Date().toISOString(),
      width: W, height: H, rgb: o.rgb, manifest: o.manifest, thumb: makeThumb(o.rgb), verdict: null,
    };
  }
  const persist = (p) => S.savePhoto(app.net, p, app.roll.map((x) => x.id));
  async function addPhoto(p) {
    app.roll.push(p);
    app.currentId = p.id;
    await persist(p);
    renderRoll();
  }
  function select(id) {
    if (app.busy) return;
    if (app.tamper && app.tamper.photoId !== id) app.tamper = null;
    app.currentId = id;
    renderRoll();
    app.capView = 'result';
    go(app.step === 'network' ? 'capture' : app.step);
  }
  function nav(id) {
    if (app.busy === 'setup' && id !== 'network') { toast('Setup is running — one moment.'); return; }
    if (id === 'capture') app.capView = 'live';
    go(id);
  }
  const originals = () => app.roll.filter((p) => p.kind === 'original');
  const kindLabel = { original: '', redacted: 'redacted', tampered: 'tampered', forged: 'forged', imported: 'file' };

  function renderRoll() {
    if (!app.roll.length) {
      el.roll.replaceChildren(h('div', { class: 'roll-empty' }, iconEl('image', 1.6), 'Camera roll — your captures and their copies appear here'));
      return;
    }
    el.roll.replaceChildren(...app.roll.map((p) => {
      const reg = p.manifest && p.manifest.registration;
      return h('div', { class: `thumb${p.id === app.currentId ? ' on' : ''}`, title: p.label, onclick: () => select(p.id) },
        h('img', { src: p.thumb, alt: '' }),
        h('div', { class: 't-badges' },
          kindLabel[p.kind] ? h('span', { class: `badge kind-${p.kind}` }, kindLabel[p.kind]) : h('span'),
          reg ? h('span', { class: 'badge reg', title: 'Registered on the ledger (root and signature anchored)', html: icon('anchor', 2.4) }) : null),
        h('div', { class: 't-label' }, p.label),
        p.verdict ? h('span', { class: `v ${p.verdict}` }, p.verdict === 'authentic' ? '✓' : '✕') : null);
    }));
    const on = el.roll.querySelector('.thumb.on');
    if (on) on.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }

  // --- header: steps + network ---
  function stepDone(id) {
    if (id === 'network') return ready();
    if (id === 'capture') return originals().length > 0;
    if (id === 'register') return app.roll.some((p) => p.manifest && p.manifest.registration);
    if (id === 'redact') return app.roll.some((p) => p.kind === 'redacted');
    if (id === 'verify') return app.roll.some((p) => p.verdict);
    if (id === 'attack') return !!(app.world && app.world.revocations && app.world.revocations.length);
    return false;
  }
  function renderSteps() {
    el.steps.replaceChildren(...STEPS.map((s, i) => h('button', {
      class: `step-btn${app.step === s.id ? ' active' : ''}${stepDone(s.id) && app.step !== s.id ? ' done' : ''}`,
      onclick: () => nav(s.id), title: `${s.label} (${i + 1})`,
    }, h('span', { class: 'n' }, stepDone(s.id) && app.step !== s.id ? iconEl('check', 3) : String(i + 1)), h('span', { class: 'lbl' }, s.label))));
  }
  function setNet(status) {
    el.net.classList.remove('live', 'sim', 'err');
    if (status === 'connected') el.net.classList.add(app.net === 'sim' ? 'sim' : 'live');
    if (status === 'error' || status === 'disconnected') el.net.classList.add('err');
    const labels = app.net === 'sim'
      ? { connected: 'Simulated ledger', connecting: 'Starting simulation…', error: 'Simulation error', disconnected: 'Simulation stopped' }
      : { connected: 'XRPL Testnet', connecting: 'Connecting to Testnet…', error: 'Testnet unreachable', disconnected: 'Reconnecting…' };
    el.netLabel.textContent = labels[status] || status;
    el.chainSub.textContent = app.net === 'sim' ? 'offline simulation of the ledger' : 'validated ledgers, live from Testnet';
    for (const b of el.netSwitch.querySelectorAll('button')) b.classList.toggle('on', b.dataset.net === app.net);
  }
  el.netSwitch.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b || b.dataset.net === app.net || app.busy) return;
    switchNetwork(b.dataset.net);
  });

  // --- ledger strip ---
  function onLedger(l) {
    app.blocks.push(l);
    if (app.blocks.length > 16) app.blocks.shift();
    renderBlocks(l.index);
    el.netLedger.textContent = `ledger #${fmtInt(l.index)}`;
    el.netLedger.classList.remove('tick'); void el.netLedger.offsetWidth; el.netLedger.classList.add('tick');
    const t0 = document.getElementById('t0chip');
    if (t0) {
      t0.querySelector('.mono').textContent = `#${fmtInt(l.index)}`;
      t0.classList.remove('tick'); void t0.offsetWidth; t0.classList.add('tick');
    }
  }
  function renderBlocks(newIndex) {
    const log = (app.world && app.world.log) || [];
    el.blocks.replaceChildren(...app.blocks.map((b) => {
      const marks = log.filter((x) => x.ledgerIndex === b.index);
      const url = app.ledger && app.ledger.explorer ? app.ledger.explorer('ledger', b.index) : null;
      const cls = ['block'];
      if (b.index === newIndex) cls.push('new');
      if (marks.some((m) => m.kind === 'register')) cls.push('hot');
      if (marks.some((m) => m.kind === 'revoke')) cls.push('hot-revoke');
      return h(url ? 'a' : 'div', {
        class: cls.join(' '), href: url, target: url ? '_blank' : null, rel: url ? 'noopener' : null,
        title: `Ledger #${b.index}\n${b.hash}${marks.map((m) => `\n• ${m.label}`).join('')}`,
      },
      h('span', { class: 'bi' }, `#${fmtInt(b.index)}`),
      h('span', { class: 'bt' }, fmtClock(b.time), b.txns != null ? ` · ${b.txns} tx` : ''),
      h('div', { class: 'bm' }, marks.map((m) => h('i', { class: `mark m-${m.kind}` }))));
    }));
  }
  function logTx(kind, label, receipt) {
    if (!app.world.log) app.world.log = [];
    app.world.log.push({ kind, label, hash: receipt.hash, ledgerIndex: receipt.ledgerIndex, time: receipt.time });
    S.saveWorld(app.net, app.world);
    renderBlocks(null);
  }

  // --- navigation ---
  function go(step) {
    if (app.countdown) cancelCountdown();
    if (app.tamper && step !== 'attack') app.tamper = null;
    app.step = step;
    el.tiles.onpointerdown = el.tiles.onpointermove = el.tiles.onpointerup = null;
    el.tiles.className = 'tiles';
    renderSteps();
    hud();
    if (step === 'network') enterNetwork();
    else if (step === 'capture') enterCapture();
    else if (step === 'register') enterRegister();
    else if (step === 'redact') enterRedact();
    else if (step === 'verify') enterVerify();
    else if (step === 'attack') enterAttack();
    if (step !== 'capture' && step !== 'network') stopCameraSoon();
  }
  let camTimer = null;
  function stopCameraSoon() {
    clearTimeout(camTimer);
    camTimer = setTimeout(() => { if (app.step !== 'capture') stopCamera(); }, 15000);
  }
  function stopCamera() {
    if (app.stream) { app.stream.getTracks().forEach((t) => t.stop()); app.stream = null; el.video.srcObject = null; }
  }
  async function startCamera() {
    clearTimeout(camTimer);
    if (app.stream) return true;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { app.cameraError = 'Camera API not available (open the demo from http://localhost).'; return false; }
    try {
      app.stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false });
      el.video.muted = true;
      el.video.setAttribute('playsinline', '');
      el.video.srcObject = app.stream;
      await new Promise((resolve) => {
        if (el.video.readyState >= 1) { resolve(); return; }
        el.video.onloadedmetadata = () => resolve();
        setTimeout(resolve, 2500);
      });
      await el.video.play().catch(() => {});
      return true;
    } catch (e) {
      app.cameraError = e && e.name === 'NotAllowedError' ? 'Camera permission was denied.' : 'No camera available.';
      return false;
    }
  }

  // ===== Step 1: trust network =====
  function setupStatus(id) {
    const w = app.world || {};
    const st = w.steps || {};
    if (app.setupRun.running === id) return 'running';
    if (app.setupRun.error && app.setupRun.error.id === id) return 'error';
    if (id === 'fund') return w.consortium && w.consortium.address ? 'done' : '';
    if (id === 'sensor') return app.sensor ? 'done' : '';
    if (id === 'cert') return app.sensor && app.sensor.certTx ? 'done' : '';
    return st[id] ? 'done' : '';
  }
  function setupReceipt(id) {
    const st = (app.world && app.world.steps) || {};
    if (id === 'cert') return app.sensor && app.sensor.certTx;
    return st[id] && st[id].hash;
  }
  function renderDiagram() {
    const w = app.world || {};
    const st = w.steps || {};
    const c = w.consortium || {}, m = w.manufacturer || {}, ph = w.photographer || {};
    const run = app.setupRun.running;
    const pill = (ok, text) => h('span', { class: `pill${ok ? ' ok' : ''}` }, ok ? '✓ ' : '', text);
    const node = (cls, on, role, ic, name, ...meta) => h('div', { class: `node ${cls}${on ? ' on' : ''}` },
      h('div', { class: 'role' }, iconEl(ic), role), h('div', { class: 'name' }, name), h('div', { class: 'meta' }, meta));
    const edge = (on, flow, label) => h('div', { class: `edge${on ? ' on' : ''}${flow ? ' flow' : ''}` }, h('span', { class: 'edge-label' }, label));

    el.diagram.replaceChildren(h('div', { class: 'dg' },
      h('div', { style: { gridColumn: '2', gridRow: '1', width: '100%', display: 'flex', justifyContent: 'center' } },
        node('c', !!c.address, 'Consortium', 'users', 'Omissis Consortium',
          h('span', { class: 'members-mini' }, MEMBERS.map((x) => h('span', { style: { background: x.color }, title: x.name }, x.short))),
          pill(!!st.signers, '2-of-3 multisig'), pill(!!st.master, 'no master key'), c.address ? acctLink(c.address) : null)),
      h('div', { style: { gridColumn: '2', gridRow: '2', height: '100%' } }, edge(!!st.accept, run === 'credential' || run === 'accept', 'credential · XLS-70')),
      h('div', { style: { gridColumn: '2', gridRow: '3', width: '100%', display: 'flex', justifyContent: 'center' } },
        node('m', !!m.address, 'Manufacturer', 'factory', MAKER,
          pill(!!st.credential, 'credential issued'), pill(!!st.accept, 'accepted'), m.address ? acctLink(m.address) : null)),
      h('div', { style: { gridColumn: '2', gridRow: '4', height: '100%' } }, edge(!!(app.sensor && app.sensor.certTx), run === 'cert', 'sensor certificate')),
      h('div', { style: { gridColumn: '2', gridRow: '5', width: '100%', display: 'flex', justifyContent: 'center' } },
        node('s', !!app.sensor, 'Sensor · secure element', 'chip', MODEL,
          pill(!!app.sensor, 'key non-extractable'), pill(!!(app.sensor && app.sensor.certTx), 'certified on-ledger'),
          app.sensor ? h('span', { class: 'mono dim' }, `id ${app.sensor.id.slice(0, 8)}`) : null)),
      h('div', { class: 'side', style: { gridColumn: '1', gridRow: '3 / 6' } },
        node('p', !!ph.address, 'Photographer', 'user', 'Field reporter', h('span', null, 'pays for registrations'), ph.address ? acctLink(ph.address) : null)),
      h('div', { class: 'side', style: { gridColumn: '3', gridRow: '3 / 6' } },
        node('v', true, 'Verifier', 'eye', 'Anyone', h('span', null, 'the file + a public XRPL node')))));
    fitDiagram();
  }
  function enterNetwork() {
    showDiagram();
    renderDiagram();
    renderNetworkPanel();
  }
  function renderNetworkPanel() {
    const partial = app.world && app.world.consortium && !ready();
    const list = h('ul', { class: 'setup' }, SETUP.map((s, i) => {
      const status = setupStatus(s.id);
      const rc = setupReceipt(s.id);
      return h('li', { class: status },
        h('span', { class: 'st', html: status === 'done' ? icon('check', 3) : status === 'running' ? icon('spin', 3) : status === 'error' ? icon('x', 3) : String(i + 1) }),
        h('div', null, h('div', { class: 'tt' }, s.title), h('div', { class: 'ts' },
          status === 'error' ? app.setupRun.error.msg : s.sub)),
        rc ? txLink(rc) : h('span'));
    }));
    const actions = [];
    if (!ready()) {
      actions.push(button(partial ? 'Resume setup' : 'Create the trust network', {
        kind: 'primary big wide', icon: 'sparkle', id: 'setupBtn', disabled: !app.connected || !!app.setupRun.running, onClick: runSetup,
      }));
    } else {
      actions.push(button('Next: capture a photo', { kind: 'primary big wide', icon: 'camera', onClick: () => go('capture') }));
    }
    fill(el.panel, 
      head('Step 1 · Setup', 'The trust network',
        'No central authority: a <b>consortium</b> of independent members accredits camera <b>manufacturers</b>, who certify the keys of their <b>sensors</b>. All of it lives on the XRP Ledger.'),
      card(app.net === 'sim' ? 'Setup · simulated ledger' : 'Setup · on XRPL Testnet', h('span', { class: 'dim' }, ready() ? 'complete' : app.net === 'sim' ? '~25 s' : '~40 s'), list),
      h('div', { class: 'dim', style: { fontSize: '12px' } }, app.net === 'sim' ? 'Offline mode: nothing is sent to a real network.' : 'Testnet accounts are created with the public faucet.'),
      app.world && app.world.consortium ? startOverControl() : null,
      h('div', { class: 'actions sticky' }, actions));
  }
  // "Start over": wipe this run (accounts, sensor key, photos, revocations) and build a fresh trust network.
  function startOverControl() {
    const label = 'Start over';
    const b = button(label, { kind: 'ghost', icon: 'refresh', id: 'startOverBtn', title: 'Erase this run and create a fresh trust network' });
    const note = h('span', { class: 'dim', style: { fontSize: '12px' } }, 'Erases this run (accounts, sensor key, photos, revocation) and rebuilds the trust network.');
    b.addEventListener('click', () => {
      if (app.busy) { toast('Wait for the current operation to finish.'); return; }
      if (!app.resetArmed) {
        app.resetArmed = true;
        b.className = 'btn danger';
        b.innerHTML = `${icon('refresh')}Click again to confirm`;
        setTimeout(() => { app.resetArmed = false; if (b.isConnected) { b.className = 'btn ghost'; b.innerHTML = `${icon('refresh')}${label}`; } }, 4000);
        return;
      }
      resetDemo();
    });
    return h('div', { class: 'card', style: { flexDirection: 'row', alignItems: 'center', gap: '12px' } }, b, note);
  }
  function newWorld() {
    return { net: app.net, createdAt: new Date().toISOString(), ready: false, steps: {}, log: [], revocations: [], theft: null };
  }
  async function runSetup() {
    if (app.busy || app.setupRun.running) return;
    app.busy = 'setup';
    app.setupRun.error = null;
    const L = app.ledger;
    const w = app.world || newWorld();
    app.world = w;
    const save = () => S.saveWorld(app.net, w);
    const stepRun = async (id, fn) => {
      if (setupStatus(id) === 'done') return;
      app.setupRun.running = id;
      renderNetworkPanel(); renderDiagram();
      try {
        await fn();
      } catch (e) {
        app.setupRun.error = { id, msg: e && e.message ? e.message : String(e) };
        throw e;
      } finally {
        app.setupRun.running = null;
        save();
        renderNetworkPanel(); renderDiagram();
      }
    };
    try {
      await stepRun('fund', async () => {
        const [c, m, p] = await Promise.all([L.fund(), L.fund(), L.fund()]);
        w.consortium = { address: c.address, seed: c.seed, quorum: 2, members: MEMBERS.map((x) => Object.assign({ name: x.name }, L.keypair())) };
        w.manufacturer = { name: MAKER, address: m.address, seed: m.seed };
        w.photographer = { address: p.address, seed: p.seed };
      });
      await stepRun('signers', async () => {
        const r = await L.setSignerList(w.consortium.seed, w.consortium.members.map((x) => x.address), 2);
        w.steps.signers = r; logTx('setup', 'Consortium signer list (2-of-3)', r);
      });
      await stepRun('master', async () => {
        const r = await L.disableMaster(w.consortium.seed);
        w.steps.master = r; logTx('setup', 'Consortium master key disabled', r);
      });
      await stepRun('credential', async () => {
        const ms = w.consortium.members;
        const r = await L.issueCredential(w.consortium.address, [ms[0].seed, ms[1].seed], w.manufacturer.address, T.CRED_TYPE);
        w.steps.credential = r; logTx('setup', 'Credential issued to manufacturer (multisig)', r);
      });
      await stepRun('accept', async () => {
        const r = await L.acceptCredential(w.manufacturer.seed, w.consortium.address, T.CRED_TYPE);
        w.steps.accept = r; logTx('setup', 'Manufacturer accepted credential', r);
      });
      await stepRun('sensor', async () => {
        const k = await T.createSensorKey();
        app.sensor = { privateKey: k.privateKey, pk: k.pk, id: k.id, certTx: null };
        try {
          await persistSensor();
        } catch (e) {
          console.warn('[tessera] this browser cannot store a CryptoKey; using a JWK copy instead', e);
          const k2 = await T.createSensorKey({ extractable: true });
          const jwk = await crypto.subtle.exportKey('jwk', k2.privateKey);
          app.sensor = { privateKey: k2.privateKey, pk: k2.pk, id: k2.id, certTx: null, jwk };
          await persistSensor();
        }
        await sleep(500);
      });
      await stepRun('cert', async () => {
        const r = await L.postMemo(w.manufacturer.seed, T.MEMO.CERT, { v: 1, pk: app.sensor.pk, model: MODEL, maker: MAKER });
        app.sensor.certTx = r.hash;
        app.sensor.certLedger = r.ledgerIndex;
        await persistSensor();
        logTx('cert', 'Sensor certificate registered', r);
      });
      w.ready = true;
      save();
      toast('Trust network ready. Time to take a photo.', 'ok');
      renderSteps();
      renderNetworkPanel();
    } catch (e) {
      console.error(e);
      toast(`Setup stopped: ${e && e.message ? e.message : e}. You can resume.`, 'err');
    } finally {
      app.busy = null;
      app.setupRun.running = null;
      renderNetworkPanel();
    }
  }
  async function resetDemo() {
    stopCamera();
    try { sessionStorage.setItem('tessera.autosetup', '1'); } catch (e) { /* ignore */ }
    await S.clearNetwork(app.net);
    if (app.net === 'sim' && app.ledger.reset) { app.ledger.disconnect(); app.ledger.reset(); }
    location.reload();
  }

  // ===== Step 2: capture =====
  async function enterCapture() {
    if (!ready()) {
      setFrame('empty');
      el.empty.replaceChildren(emptyBox('chip', 'No certified sensor yet', 'Create the trust network first: the sensor key must be certified on the ledger.',
        button('Set up the trust network', { kind: 'primary', icon: 'sparkle', onClick: () => go('network') })));
      fill(el.panel, head('Step 2 · Capture', 'Shoot a photo', 'Set up the trust network first.'));
      return;
    }
    const p = current();
    if (app.capView === 'result' && p) { showCaptureResult(p, false); return; }
    app.capView = 'live';
    renderCaptureLivePanel();
    hud([chip('live', 'LIVE')], [t0Chip(), chip('lapis', iconEl('chip'), h('span', { class: 'mono' }, `sensor ${app.sensor.id.slice(0, 8)}`))]);
    setFrame('live');
    const ok = await startCamera();
    if (app.step !== 'capture' || app.capView !== 'live') return;
    if (ok) {
      setFrame('live');
    } else {
      setFrame('empty');
      hud([], [t0Chip()]);
      el.empty.replaceChildren(emptyBox('camera', 'Camera unavailable', `${app.cameraError || ''} Use the sample scene or upload a photo instead.`,
        button('Sample scene', { kind: 'primary', icon: 'image', onClick: () => doCapture('sample') }),
        button('Upload photo', { icon: 'upload', onClick: () => pickFile('capture') })));
    }
  }
  function t0Chip() {
    const l = app.ledger && app.ledger.latest();
    return h('span', { class: 'chip gold t0', id: 't0chip', title: 'T0: the latest validated ledger, read at the moment of capture' },
      'T0', h('span', { class: 'mono' }, l ? `#${fmtInt(l.index)}` : '…'));
  }
  function renderCaptureLivePanel() {
    fill(el.panel, 
      head('Step 2 · Capture', 'Shoot a photo',
        'At the shutter the sensor reads the <b>latest validated ledger</b> (T0), hashes every tile with a fresh salt and <b>signs the Merkle root</b>.'),
      h('div', { class: 'card' },
        h('div', { class: 'shutter-row' },
          h('button', { class: `shutter${app.countdown ? ' counting' : ''}`, id: 'shutter', title: 'Capture (Space). With the timer on, press again to cancel.', onclick: (e) => { e.currentTarget.blur(); shutter(); } }, h('span')),
          h('div', { class: 'shutter-side' },
            h('div', { style: { fontWeight: 600 } }, 'Capture'),
            h('div', { class: 'hint' }, 'Press ', h('kbd', null, 'Space'), ' or click the shutter'),
            h('div', { class: 'row', style: { display: 'flex', gap: '6px', marginTop: '4px' } },
              button('Sample', { kind: 'ghost', icon: 'image', title: 'Use the built-in sample scene', onClick: () => doCapture('sample') }),
              button('Upload', { kind: 'ghost', icon: 'upload', title: 'Use a photo from disk', onClick: () => pickFile('capture') })))),
        h('div', { class: 'cap-opts' },
          optToggle('selfTimer', 'selftimer', 'timer', '3-s timer', 'Count 3-2-1 before the shot: time to hold the camera still and smile'),
          optToggle('mirror', 'mirror', 'flip', 'Mirror', 'Selfie view: preview and photo mirrored, like a phone’s front camera'))),
      card('Signed inside the sensor', null,
        h('pre', { class: 'code', html: `<span class="k">sign</span>( root ‖ <span class="s">T0</span> ‖ size )\n<span class="k">root</span> = Merkle( SHA-256(i ‖ salt ‖ tile) )\n<span class="dim">192 tiles · fresh 128-bit salt each</span>` })),
      card('This camera', null,
        kv('Sensor', MODEL),
        kv('Key', h('span', { class: 'mono' }, `P-256 · ${app.sensor.id.slice(0, 16)}…`)),
        kv('Certificate', txLink(app.sensor.certTx)),
        kv('Manufacturer', h('span', null, MAKER, ' ', acctLink(app.world.manufacturer.address)))));
  }
  async function grabFrame(source, file) {
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const cx = c.getContext('2d', { willReadFrequently: true });
    let srcEl, sw, sh;
    if (source === 'camera') {
      srcEl = el.video; sw = el.video.videoWidth; sh = el.video.videoHeight;
      if (!sw) throw new Error('The camera is not ready yet.');
    } else if (source === 'file') {
      srcEl = await createImageBitmap(file); sw = srcEl.width; sh = srcEl.height;
    } else {
      SAMPLE.draw(cx, W, H);
      const rgb = rgbFromCtx(cx);
      SAMPLE.addGrain(rgb, 9);
      return rgb;
    }
    const target = W / H;
    let sx = 0, sy = 0, cw = sw, ch = sh;
    if (sw / sh > target) { cw = sh * target; sx = (sw - cw) / 2; } else { ch = sw / target; sy = (sh - ch) / 2; }
    // mirrored preview -> mirrored photo, so the shot matches what you saw
    if (source === 'camera' && app.mirror) { cx.translate(W, 0); cx.scale(-1, 1); }
    cx.drawImage(srcEl, sx, sy, cw, ch, 0, 0, W, H);
    return rgbFromCtx(cx);
  }
  // With the self-timer on, count 3-2-1 on the frame first. Space or the shutter again cancels it.
  function shutter() {
    if (app.countdown) { cancelCountdown(); return; }
    if (app.busy || !ready() || app.step !== 'capture' || app.capView !== 'live') return;
    if (!app.selfTimer || !app.stream) { doCapture('camera'); return; }
    let n = 3;
    const tick = () => {
      if (app.step !== 'capture' || app.capView !== 'live') { cancelCountdown(); return; }
      if (n === 0) { cancelCountdown(); doCapture('camera'); return; }
      el.countdown.replaceChildren(h('b', null, String(n)), h('span', null, 'Smile!'));
      el.countdown.classList.add('on');
      n -= 1;
      app.countdown = setTimeout(tick, 1000);
    };
    tick();
    const s = $('shutter');
    if (s) s.classList.add('counting');
  }
  function cancelCountdown() {
    clearTimeout(app.countdown);
    app.countdown = null;
    el.countdown.classList.remove('on');
    el.countdown.replaceChildren();
    const s = $('shutter');
    if (s) s.classList.remove('counting');
  }
  function optToggle(key, prefName, ic, label, title) {
    const b = h('button', { class: `opt${app[key] ? ' on' : ''}`, title, 'aria-pressed': String(!!app[key]) }, iconEl(ic), label);
    b.addEventListener('click', () => {
      app[key] = !app[key];
      S.pref(prefName, app[key] ? '1' : '0');
      b.classList.toggle('on', app[key]);
      b.setAttribute('aria-pressed', String(app[key]));
      if (key === 'mirror') el.frame.classList.toggle('mirror', app.mirror);
      b.blur(); // Space stays the shutter
    });
    return b;
  }
  async function doCapture(source, file) {
    if (app.busy || !ready()) return;
    const t0 = app.ledger.latest();
    if (!t0) { toast('Waiting for the first ledger…'); return; }
    app.busy = 'capture';
    await guard(async () => {
      app.busy = 'capture';
      const rgb = await grabFrame(source, file);
      flash();
      const cap = await T.capture({
        rgb, width: W, height: H, tile: TILE, t0: { index: t0.index, hash: t0.hash },
        sensor: { privateKey: app.sensor.privateKey, pk: app.sensor.pk, certTx: app.sensor.certTx },
        network: app.net, consortium: app.world.consortium.address,
      });
      const n = originals().length + 1;
      const photo = newPhoto({ kind: 'original', label: `Photo ${n}`, rgb, manifest: cap.manifest });
      photo.t0Time = t0.time;
      await addPhoto(photo);
      app.capView = 'result';
      showCaptureResult(photo, true);
      renderSteps();
    });
  }
  function showCaptureResult(p, animate) {
    showPhoto(p);
    if (animate) scanTiles(p.manifest);
    hud([chip('ok', iconEl('shield'), 'signed by sensor')],
      [chip('gold', 'T0', h('span', { class: 'mono' }, `#${fmtInt(p.manifest.t0.ledger_index)}`)),
        chip('gold', 'root', h('span', { class: 'mono' }, p.manifest.root.slice(0, 10)))]);
    const funnelBox = h('div');
    renderFunnel(funnelBox, p.manifest, animate);
    const m = p.manifest;
    fill(el.panel, 
      head('Step 2 · Capture', `${p.label} captured`,
        `192 tiles hashed with a salt each, folded into one <b>Merkle root</b>, then signed together with <b>T0</b>.`),
      card('Mosaic signature', h('span', { class: 'mono' }, '192 → 1'), funnelBox,
        h('div', { class: 'funnel-cap' }, h('span', null, 'tile fingerprints'), h('span', null, 'Merkle root'))),
      card('Proof inside the file', null,
        kv('Merkle root', h('span', { class: 'mono' }, short(m.root, 14))),
        kv('T0', h('span', null, h('span', { class: 'mono' }, `ledger #${fmtInt(m.t0.ledger_index)}`), p.t0Time ? h('span', { class: 'dim' }, ` · ${fmtClock(p.t0Time)}`) : null)),
        kv('T0 hash', h('span', { class: 'mono' }, short(m.t0.ledger_hash, 14))),
        kv('Signature', h('span', { class: 'mono' }, `ECDSA P-256 · ${m.sig.slice(0, 12)}…`))),
      h('div', { class: 'actions sticky' },
        button(m.registration ? 'Registered — see receipt' : 'Next: register on the ledger', { kind: 'primary wide', icon: 'anchor', onClick: () => go('register') }),
        button('New shot', { kind: 'ghost', icon: 'camera', onClick: () => { app.capView = 'live'; go('capture'); } })));
  }
  async function renderFunnel(box, manifest, animate) {
    const levels = await T.merkleLevels(manifest.leaves.map(T.fromHex));
    const hex = levels.map((l) => l.map(T.toHex));
    const f = h('div', { class: `funnel${animate ? ' anim' : ''}` });
    const leaves = h('div', { class: 'leaves' }, hex[0].map((x, i) => h('i', { class: manifest.salts[i] == null ? 'h' : null, style: { background: hashColor(x) } })));
    f.append(leaves);
    for (let k = 1; k < hex.length - 1; k++) {
      const width = Math.max(18, Math.round(300 * Math.pow(hex[k].length / hex[1].length, 0.62)));
      f.append(h('div', { class: 'lvl', style: { width: `${width}px`, animationDelay: animate ? `${900 + k * 110}ms` : null } },
        hex[k].map((x) => h('i', { style: { background: hashColor(x) } }))));
    }
    f.append(h('div', { class: 'root', style: { animationDelay: animate ? `${900 + hex.length * 110}ms` : null } }, `root ${short(hex[hex.length - 1][0], 16)}`));
    if (animate) leaves.style.animationDelay = '200ms';
    box.replaceChildren(f);
  }

  // ===== Step 3: register =====
  function needPhoto(stepTitle, kicker) {
    setFrame('empty');
    el.empty.replaceChildren(emptyBox('camera', 'No photo selected', 'Capture a photo first, or pick one from the camera roll.',
      button('Go to capture', { kind: 'primary', icon: 'camera', onClick: () => go('capture') })));
    fill(el.panel, head(kicker, stepTitle, 'Capture a photo first.'));
  }
  function timeline(t0, t1, e) {
    const tl = h('div', { class: 'timeline' }, h('div', { class: 'bar' }));
    const pins = [];
    if (t0) pins.push({ cls: 't0', label: 'T0', idx: t0.index, time: t0.time });
    if (t1) pins.push({ cls: 't1', label: 'T1', idx: t1.index, time: t1.time });
    if (e) pins.push({ cls: 'e', label: 'compromised', idx: e, time: null });
    if (!pins.length) return tl;
    const idxs = pins.map((p) => p.idx);
    const lo = Math.min(...idxs), hi = Math.max(...idxs);
    const pos = (i) => (hi === lo ? 50 : 18 + ((i - lo) / (hi - lo)) * 64);
    if (t0) {
      const a = pos(t0.index), b = t1 ? pos(t1.index) : 100;
      tl.append(h('div', { class: `span${t1 ? '' : ' open'}`, style: { left: `${a}%`, width: `${Math.max(1, b - a)}%` } }));
    }
    const sorted = pins.slice().sort((x, y) => x.idx - y.idx);
    for (let k = 1; k < sorted.length; k++) {
      if (Math.abs(pos(sorted[k].idx) - pos(sorted[k - 1].idx)) < 14) { sorted[k - 1].nudge = (sorted[k - 1].nudge || 0) - 6; sorted[k].nudge = 6; }
    }
    for (const p of pins) {
      tl.append(h('div', { class: `pin ${p.cls}`, style: { left: `${pos(p.idx) + (p.nudge || 0)}%` } },
        h('b', null, p.label), h('i'), h('span', null, `#${fmtInt(p.idx)}`), p.time ? h('span', null, fmtClock(p.time)) : null));
    }
    return tl;
  }
  function enterRegister() {
    const p = current();
    if (!p) { needPhoto('Anchor it on the ledger', 'Step 3 · Register'); return; }
    showPhoto(p);
    const m = p.manifest;
    const reg = m.registration;
    hud([chip('ok', iconEl('shield'), p.label)],
      [h('span', { class: 'chip gold', id: 'rootChip' }, 'root', h('span', { class: 'mono' }, m.root.slice(0, 10))),
        reg ? chip('gold', 'T1', h('span', { class: 'mono' }, `#${fmtInt(reg.ledger_index)}`)) : chip('', 'not registered')]);
    const payload = `<span class="dim">AccountSet · from the photographer</span>\n<span class="k">MemoType</span>  <span class="s">"${T.MEMO.ANCHOR}"</span>\n<span class="k">MemoData</span>  { <span class="k">"v"</span>: 2, <span class="k">"anchor"</span>: <span class="s">"<span id="anchorVal">…</span>…"</span> }\n<span class="dim">anchor = SHA-256( sensor key ‖ root ‖ T0 ‖ size ‖ signature )</span>`;
    T.registrationAnchor(m).then((a) => { const v = document.getElementById('anchorVal'); if (v) v.textContent = a.slice(0, 16); }).catch(() => {});
    const forged = p.kind === 'forged';
    const parts = [
      head('Step 3 · Register (optional)', 'Anchor it on the ledger',
        'Registration proves the photo <b>and its signature</b> existed by <b>T1</b>. Only <b>32 bytes</b> go on-chain: one hash of the root and the signature. Unregistered photos rely on T0 alone — and won\'t survive a key compromise.'),
      card('On-chain payload', h('span', { class: 'mono' }, '32 bytes'), h('pre', { class: 'code', html: payload })),
      card('Never on-chain', null, h('ul', { class: 'list' },
        h('li', { class: 'no', html: `${icon('x', 2.6)}<span>The pixels — nothing about the picture can be read from the anchor</span>` }),
        h('li', { class: 'no', html: `${icon('x', 2.6)}<span>Location, metadata, who or what is in it</span>` }),
        h('li', { class: 'no', html: `${icon('x', 2.6)}<span>The sensor\'s identity: the signature itself stays inside the file</span>` }))),
    ];
    if (reg) {
      parts.push(h('div', { class: 'card glow-gold' },
        h('div', { class: 'card-h' }, h('span', null, 'Receipt'), h('span', { style: { color: 'var(--gold-2)' } }, 'validated')),
        kv('Transaction', txLink(reg.tx)),
        kv('Ledger', h('span', { class: 'mono' }, `#${fmtInt(reg.ledger_index)}`)),
        kv('T1', reg.time ? fmtClock(reg.time) : '—'),
        timeline({ index: m.t0.ledger_index, time: p.t0Time }, { index: reg.ledger_index, time: reg.time })));
      parts.push(h('div', { class: 'actions sticky' },
        button('Next: redact', { kind: 'primary wide', icon: 'grid', onClick: () => go('redact') }),
        button('Verify', { kind: 'ghost', icon: 'search', onClick: () => go('verify') })));
    } else {
      parts.push(h('div', { class: 'actions sticky' },
        button(forged ? 'Register the forgery (attacker)' : 'Register on the XRPL', { kind: `${forged ? 'danger' : 'gold'} big wide`, icon: 'anchor', id: 'regBtn', onClick: doRegister }),
        button('Skip', { kind: 'ghost', onClick: () => go('redact') })));
    }
    fill(el.panel, ...parts);
  }
  async function doRegister() {
    const p = current();
    if (!p || app.busy) return;
    const btn = $('regBtn');
    if (btn) busyButton(btn, 'Waiting for validation…');
    app.busy = 'register';
    await guard(async () => {
      app.busy = 'register';
      // The anchor binds the root AND the signature: a root registered in advance could be signed later with a stolen key.
      const anchor = await T.registrationAnchor(p.manifest);
      fly($('rootChip'), `anchor ${anchor.slice(0, 8)}`);
      const r = await app.ledger.postMemo(app.world.photographer.seed, T.MEMO.ANCHOR, { v: 2, anchor });
      const receipt = { tx: r.hash, ledger_index: r.ledgerIndex, time: r.time, anchor };
      for (const q of app.roll) { // copies (crops, redactions) share root and signature, so the same anchor
        if (q.manifest.root === p.manifest.root && q.manifest.sig === p.manifest.sig && !q.manifest.registration) {
          q.manifest.registration = receipt;
          q.verdict = null;
          await persist(q);
        }
      }
      logTx('register', `${p.label}: root + signature anchored`, r);
      toast(`Anchored in ledger #${fmtInt(r.ledgerIndex)}: root and signature.`, 'ok');
    });
    renderRoll();
    renderSteps();
    if (app.step === 'register') enterRegister();
  }

  // ===== Step 4: redact =====
  function enterRedact() {
    const p = current();
    if (!p) { needPhoto('Hide what must stay private', 'Step 4 · Redact'); return; }
    showPhoto(p);
    const locked = new Set();
    p.manifest.salts.forEach((s, i) => { if (s == null) locked.add(i); });
    if (!app.redact || app.redact.photoId !== p.id) app.redact = { photoId: p.id, hidden: new Set(locked), locked, mode: 'paint', created: null };
    el.tiles.classList.add('interactive');
    paintSelection();
    hud([chip('lapis', iconEl('brush'), 'click or drag over tiles')], [chip('', p.label)]);
    bindRedactPointer();
    renderRedactPanel();
  }
  function paintSelection() {
    const r = app.redact;
    for (let i = 0; i < N; i++) {
      tileEls[i].classList.toggle('gone', r.locked.has(i));
      tileEls[i].classList.toggle('sel', r.hidden.has(i) && !r.locked.has(i));
    }
  }
  function tileAt(e) {
    const rect = el.frame.getBoundingClientRect();
    const c = Math.floor(((e.clientX - rect.left) / rect.width) * COLS);
    const r = Math.floor(((e.clientY - rect.top) / rect.height) * ROWS);
    if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return null;
    return { c, r, i: r * COLS + c };
  }
  function bindRedactPointer() {
    let drag = null;
    el.tiles.onpointerdown = (e) => {
      const t = tileAt(e);
      if (!t) return;
      el.tiles.setPointerCapture(e.pointerId);
      const r = app.redact;
      if (r.mode === 'paint') {
        drag = { value: !r.hidden.has(t.i) };
        apply(t.i, drag.value);
      } else {
        drag = { start: t, end: t };
        drawCrop(drag.start, drag.end);
      }
    };
    el.tiles.onpointermove = (e) => {
      if (!drag) return;
      const t = tileAt(e);
      if (!t) return;
      if (app.redact.mode === 'paint') apply(t.i, drag.value);
      else { drag.end = t; drawCrop(drag.start, drag.end); }
    };
    el.tiles.onpointerup = () => {
      if (drag && app.redact.mode === 'crop') {
        const r = app.redact;
        const c0 = Math.min(drag.start.c, drag.end.c), c1 = Math.max(drag.start.c, drag.end.c);
        const r0 = Math.min(drag.start.r, drag.end.r), r1 = Math.max(drag.start.r, drag.end.r);
        r.hidden = new Set(r.locked);
        for (let i = 0; i < N; i++) {
          const c = i % COLS, rr = Math.floor(i / COLS);
          if (c < c0 || c > c1 || rr < r0 || rr > r1) r.hidden.add(i);
        }
        el.crop.style.display = 'none';
        paintSelection();
        renderRedactPanel();
      }
      drag = null;
    };
    function apply(i, value) {
      const r = app.redact;
      if (r.locked.has(i)) return;
      if (value) r.hidden.add(i); else r.hidden.delete(i);
      tileEls[i].classList.toggle('sel', value);
      updateRedactStats();
    }
  }
  function drawCrop(a, b) {
    const c0 = Math.min(a.c, b.c), c1 = Math.max(a.c, b.c), r0 = Math.min(a.r, b.r), r1 = Math.max(a.r, b.r);
    Object.assign(el.crop.style, {
      display: 'block', left: `${(c0 / COLS) * 100}%`, top: `${(r0 / ROWS) * 100}%`,
      width: `${((c1 - c0 + 1) / COLS) * 100}%`, height: `${((r1 - r0 + 1) / ROWS) * 100}%`,
    });
  }
  function updateRedactStats() {
    const r = app.redact;
    const n = r.hidden.size;
    const s = document.getElementById('redStat');
    if (s) s.textContent = `${n} / ${N}`;
    const m = document.getElementById('redMeter');
    if (m) m.style.width = `${(n / N) * 100}%`;
    const b = document.getElementById('redBtn');
    if (b) b.disabled = n === r.locked.size;
  }
  function renderRedactPanel() {
    const r = app.redact;
    const p = current();
    const tool = (mode, ic, label) => h('button', {
      class: `tool${r.mode === mode ? ' on' : ''}`,
      onclick: () => { r.mode = mode; el.crop.style.display = 'none'; renderRedactPanel(); },
    }, iconEl(ic), label);
    const created = r.created ? app.roll.find((x) => x.id === r.created) : null;
    fill(el.panel, 
      head('Step 4 · Redact', 'Hide what must stay private',
        'Paint over faces or plates, or crop. Hidden tiles keep only their <b>salted fingerprint</b>: the sensor signature still verifies, the pixels can\'t be recovered or guessed.'),
      h('div', { class: 'tools' }, tool('paint', 'brush', 'Paint tiles'), tool('crop', 'crop', 'Crop')),
      card('Removed from the copy', null,
        h('div', { class: 'stat' }, h('span', { class: 'muted' }, 'Hidden tiles'), h('b', { id: 'redStat' }, `${r.hidden.size} / ${N}`)),
        h('div', { class: 'meter' }, h('i', { id: 'redMeter', style: { width: `${(r.hidden.size / N) * 100}%` } })),
        h('div', { class: 'dim', style: { fontSize: '12px' } }, r.mode === 'paint' ? 'Click or drag across tiles to hide them; drag again to restore.' : 'Drag a rectangle: everything outside it is removed.')),
      card('Why it can\'t be undone', null, h('ul', { class: 'list' },
        h('li', { class: 'yes', html: `${icon('check', 2.6)}<span>The copy carries each hidden tile's hash, not its pixels</span>` }),
        h('li', { class: 'yes', html: `${icon('check', 2.6)}<span>A 128-bit salt per tile: no brute-forcing a licence plate from its hash</span>` }),
        h('li', { class: 'yes', html: `${icon('check', 2.6)}<span>The verifier still sees exactly where and how much was removed</span>` }))),
      created ? h('div', { class: 'card glow-gold' }, h('div', { class: 'card-h' }, h('span', null, 'Copy created'), h('span', null, created.label)),
        h('div', { class: 'actions' },
          button('Verify this copy', { kind: 'primary wide', icon: 'search', onClick: () => { app.currentId = created.id; renderRoll(); go('verify'); setTimeout(() => runVerifyCurrent(), 150); } }),
          button('Download PNG', { kind: 'ghost', icon: 'download', onClick: () => download(created) }))) : null,
      h('div', { class: 'actions sticky' },
        button('Create redacted copy', { kind: 'primary wide', icon: 'grid', id: 'redBtn', disabled: r.hidden.size === r.locked.size, onClick: doRedact }),
        button('Clear', { kind: 'ghost', onClick: () => { r.hidden = new Set(r.locked); paintSelection(); renderRedactPanel(); } }),
        button('', { kind: 'ghost', icon: 'download', title: `Download ${p ? p.label : ''} as PNG`, onClick: () => p && download(p) })));
  }
  async function doRedact() {
    const p = current();
    if (!p || app.busy) return;
    const r = app.redact;
    const out = T.redact(p, r.hidden);
    const base = p.label.replace(/ · redacted$/, '');
    const copy = newPhoto({ kind: 'redacted', label: `${base} · redacted`, rgb: out.rgb, manifest: out.manifest, parent: p.id });
    copy.t0Time = p.t0Time;
    await addPhoto(copy);
    app.redact = { photoId: copy.id, hidden: new Set(r.hidden), locked: new Set(r.hidden), mode: r.mode, created: copy.id };
    showPhoto(copy);
    el.tiles.classList.add('interactive');
    paintSelection();
    renderRedactPanel();
    renderSteps();
    toast(`${copy.label} created: ${r.hidden.size} tiles removed.`, 'ok');
  }
  async function download(photo) {
    const bytes = await T.toPng(photo);
    const url = URL.createObjectURL(new Blob([bytes], { type: 'image/png' }));
    const a = h('a', { href: url, download: `${slug(photo.label)}.omissis.png` });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  // ===== Step 5: verify =====
  function trustFor(manifest) {
    const pinned = app.world && app.world.consortium && app.world.consortium.address;
    if (pinned && (!manifest.consortium || manifest.consortium === pinned)) return { consortium: pinned, source: 'pinned' };
    return { consortium: manifest.consortium, source: 'file' };
  }
  function enterVerify() {
    const p = current();
    if (p) {
      showPhoto(p);
      hud([chip('', iconEl('image'), p.label)], []);
    } else {
      setFrame('empty');
      el.empty.replaceChildren(emptyBox('search', 'Nothing to verify yet', 'Pick a photo from the camera roll, or drop any Omissis PNG on this window.',
        button('Open a file', { kind: 'primary', icon: 'upload', onClick: () => pickFile('verify') })));
    }
    const cached = p && app.verifyCache[p.id];
    renderVerifyPanel(p, cached || null);
    if (cached) paintVerifyOverlay(cached.res);
  }
  function renderVerifyPanel(p, cached) {
    const checks = h('ul', { class: 'checks', id: 'checks' });
    const verdictBox = h('div', { id: 'verdictBox' });
    if (cached) {
      cached.res.steps.forEach((s) => checks.append(checkRow(s)));
      verdictBox.append(verdictEl(cached.res));
    }
    fill(el.panel, 
      head('Step 5 · Verify', 'Anyone can check it',
        'A verifier needs only the <b>file</b> and a <b>public XRPL node</b>. No account, no trusted server: every check is recomputed locally.'),
      card('Input', h('button', { class: 'linkbtn', onclick: () => pickFile('verify') }, 'open a file…'),
        p ? kv('File', h('span', null, `${slug(p.label)}.omissis.png`)) : kv('File', h('span', { class: 'dim' }, 'none selected'))),
      h('div', { class: 'actions', style: { marginTop: 0 } },
        button(cached ? 'Verify again' : 'Verify this photo', { kind: 'primary big wide', icon: 'search', id: 'verifyBtn', disabled: !p, onClick: runVerifyCurrent }),
        p ? button('', { kind: 'ghost big', icon: 'download', title: 'Download PNG', onClick: () => download(p) }) : null),
      checks,
      verdictBox);
  }
  function checkRow(s) {
    const ic = { ok: 'check', fail: 'x', warn: 'warn', info: 'info', skip: 'minus', pending: 'spin' }[s.status] || 'info';
    return h('li', { class: s.status },
      h('span', { class: 'ic', html: icon(ic, 3) }),
      h('div', null, h('div', { class: 'ct' }, s.title),
        h('div', { class: 'cd' }, s.detail || '', s.link ? h('a', { href: s.link, target: '_blank', rel: 'noopener' }, 'view ↗') : null)));
  }
  function verdictEl(res) {
    const fail = res.steps.find((s) => s.status === 'fail');
    let sub;
    if (res.verdict === 'authentic') {
      const bits = [];
      if (res.t0) bits.push(`taken after ${res.t0.time ? fmtClock(res.t0.time) : 'ledger #' + fmtInt(res.t0.index)}`);
      bits.push(res.t1 ? `existed by ${fmtClock(res.t1.time)}` : 'not registered');
      if (res.hidden.length) bits.push(`${res.hidden.length} tiles redacted`);
      sub = bits.join(' · ');
    } else {
      sub = fail ? `${fail.title}: ${fail.detail}` : 'Verification failed';
    }
    const box = h('div', { class: `verdict ${res.verdict}` },
      h('div', { class: 'big-ic', html: icon(res.verdict === 'authentic' ? 'shield' : 'shieldX', 2.2) }),
      h('div', null, h('div', { class: 'vt' }, res.verdict === 'authentic' ? 'AUTHENTIC' : 'NOT AUTHENTIC'), h('div', { class: 'vs' }, sub)));
    const wrap = h('div', { style: { display: 'flex', flexDirection: 'column', gap: '10px' } }, box);
    if (res.t0 && (res.t1 || res.revokedFrom)) wrap.append(timeline(res.t0, res.t1, res.revokedFrom));
    return wrap;
  }
  function paintVerifyOverlay(res, animate) {
    const hidden = new Set(res.hidden), bad = new Set(res.tampered);
    for (let i = 0; i < N; i++) {
      const t = tileEls[i];
      t.classList.remove('ok', 'bad', 'gone', 'sel', 'scan');
      if (hidden.has(i)) t.classList.add('gone');
      else if (bad.has(i)) t.classList.add('bad');
      else if (animate && res.steps[1] && res.steps[1].status === 'ok') {
        t.style.setProperty('--d', `${((i % COLS) + Math.floor(i / COLS)) * 22}ms`);
        void t.offsetWidth;
        t.classList.add('ok');
      }
    }
  }
  function runVerifyCurrent() {
    const p = current();
    if (p) doVerify(p, null, null);
  }
  async function doVerify(photo, bytes, fileName) {
    if (app.busy) return;
    app.busy = 'verify';
    const btn = $('verifyBtn');
    if (btn) busyButton(btn, 'Verifying…');
    await guard(async () => {
      app.busy = 'verify';
      const data = bytes || (await T.toPng(photo));
      const parsed = await T.fromPng(data);
      if (!parsed.manifest) throw new Error('This file carries no Omissis proof.');
      if (parsed.manifest.network && parsed.manifest.network !== app.net) {
        toast(`This photo was certified on the ${parsed.manifest.network === 'sim' ? 'simulated ledger' : 'XRPL Testnet'}; switch network to verify it.`, 'err');
      }
      setFrame('photo');
      drawRgb(parsed.rgb);
      clearTiles(true);
      hud([chip('', iconEl('search'), photo ? photo.label : fileName || 'file')], [chip('lapis', `${(data.length / 1024).toFixed(0)} KB PNG`)]);
      const checks = $('checks');
      const vbox = $('verdictBox');
      checks.replaceChildren();
      vbox.replaceChildren();
      let pending = checkRow({ status: 'pending', title: 'Reading the proof…', detail: '' });
      checks.append(pending);
      const nextTitles = { proof: 'Re-hashing every visible tile…', pixels: 'Checking the sensor signature…', signature: 'Looking up the certificate on the ledger…', certificate: 'Reading the manufacturer credential…', credential: 'Checking T0 against the ledger…', t0: 'Looking for a registration…', registration: 'Reading consortium revocations…' };
      const res = await T.verifyFull(parsed, app.ledger, trustFor(parsed.manifest), async (s) => {
        pending.remove();
        const row = checkRow(s);
        checks.append(row);
        if (s.id === 'pixels') paintVerifyOverlay({ hidden: s.hidden || [], tampered: s.tampered || [], steps: [null, s] }, true);
        if (nextTitles[s.id]) {
          pending = checkRow({ status: 'pending', title: nextTitles[s.id], detail: '' });
          checks.append(pending);
        }
        (pending.isConnected ? pending : row).scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        await sleep(s.id === 'pixels' ? 650 : 330);
      });
      pending.remove();
      paintVerifyOverlay(res, false);
      vbox.replaceChildren(verdictEl(res));
      setTimeout(() => vbox.scrollIntoView({ block: 'end', behavior: 'smooth' }), 60);
      if (photo) {
        photo.verdict = res.verdict;
        app.verifyCache[photo.id] = { res };
        await persist(photo);
        renderRoll();
        renderSteps();
      }
    });
    const b = $('verifyBtn');
    if (b) { b.classList.remove('busy'); b.disabled = false; b.innerHTML = `${icon('search')}Verify again`; }
  }

  // ===== Step 6: attack lab =====
  function enterAttack() {
    const p = current();
    const tp = app.tamper && app.roll.find((x) => x.id === app.tamper.photoId);
    if (!tp) app.tamper = null;
    if (tp) {
      showPhoto({ rgb: app.tamper.rgb, manifest: tp.manifest });
      el.tiles.classList.add('paint');
      bindTamperPointer();
      hud([chip('bad', iconEl('brush'), 'tampering: paint over the photo')], [chip('', tp.label)]);
    } else if (p) {
      showPhoto(p);
      hud([chip('', iconEl('image'), p.label)], []);
    } else {
      setFrame('empty');
      el.empty.replaceChildren(emptyBox('flame', 'The attack lab', 'Capture and register a photo first, then try to break the system.',
        button('Go to capture', { kind: 'primary', icon: 'camera', onClick: () => go('capture') })));
    }
    renderAttackPanel();
  }
  function renderAttackPanel() {
    const p = current();
    const w = app.world || {};
    const forgery = [...app.roll].reverse().find((x) => x.kind === 'forged');
    const revs = w.revocations || [];
    const latest = app.ledger && app.ledger.latest();

    const tamperCard = h('div', { class: 'atk' },
      h('div', { class: 'atk-h' }, h('span', { class: 'atk-n' }, '1'), h('span', { class: 'atk-t' }, 'Tamper with the pixels')),
      h('p', null, 'Paint over a detail of the selected photo, then verify: the changed tiles light up in red.'),
      app.tamper
        ? h('div', { class: 'row' },
          button('Save tampered copy & verify', { kind: 'danger wide', icon: 'search', onClick: saveTamper }),
          button('Cancel', { kind: 'ghost', onClick: () => { app.tamper = null; enterAttack(); } }))
        : h('div', { class: 'row' }, button('Paint on the photo', { icon: 'brush', disabled: !p || !ready(), onClick: startTamper })));

    const forgeCard = h('div', { class: 'atk' },
      h('div', { class: 'atk-h' }, h('span', { class: 'atk-n' }, '2'), h('span', { class: 'atk-t' }, 'Steal the sensor key')),
      h('p', null, 'The attacker extracts the key and signs a fabricated photo. To make it look old, it embeds the hash of an earlier ledger as T0.'),
      forgery ? h('div', { class: 'dim', style: { fontSize: '12px' } },
        `Forged with T0 = ledger #${fmtInt(forgery.manifest.t0.ledger_index)}` + (w.theft ? ` · theft at #${fmtInt(w.theft.ledgerIndex)}` : '')) : null,
      h('div', { class: 'row' },
        button(forgery ? 'Forge another' : 'Forge a backdated photo', { kind: forgery ? 'ghost' : 'danger', icon: 'key', disabled: !ready() || !!app.busy, onClick: doForge }),
        forgery ? button('Verify the forgery', { icon: 'search', onClick: () => { app.currentId = forgery.id; renderRoll(); go('verify'); setTimeout(runVerifyCurrent, 150); } }) : null,
        forgery && !forgery.manifest.registration ? button('Register it', { kind: 'ghost', icon: 'anchor', onClick: () => { app.currentId = forgery.id; renderRoll(); go('register'); } }) : null));

    const opts = [];
    if (w.theft) opts.push(h('option', { value: 'theft', selected: app.revokeChoice === 'theft' }, `At the theft · ledger #${fmtInt(w.theft.ledgerIndex)}`));
    opts.push(h('option', { value: 'now', selected: app.revokeChoice === 'now' || !w.theft }, `Right now · ledger #${latest ? fmtInt(latest.index + 1) : '…'}`));
    const sel = h('select', { id: 'revokeWhen', onchange: (e) => { app.revokeChoice = e.target.value; } }, opts);
    const members = h('div', { class: 'members' }, MEMBERS.map((x, i) => h('div', { class: `member${app.signing[i] ? ' signed' : ''}` },
      h('span', { class: 'av', style: { background: x.color } }, x.short), h('span', null, x.name), h('span', { class: 'sig' }, 'signed ✓'))));
    const revokeCard = h('div', { class: 'atk' },
      h('div', { class: 'atk-h' }, h('span', { class: 'atk-n def' }, '3'), h('span', { class: 'atk-t' }, 'The consortium revokes the sensor')),
      h('p', null, 'Two of the three members sign a revocation with an estimated compromise date. Photos registered before it stay valid.'),
      members,
      revs.length
        ? h('div', { class: 'row' }, h('span', { class: 'muted', style: { fontSize: '12.5px' } }, `Revoked from ledger #${fmtInt(revs[0].fromLedger)}`), txLink(revs[0].hash))
        : h('div', { class: 'row' }, h('span', { class: 'muted', style: { fontSize: '12px' } }, 'Compromised from'), sel),
      revs.length ? null : h('div', { class: 'row' }, button('Revoke · 2-of-3 multisig', { kind: 'danger wide', icon: 'ban', id: 'revokeBtn', disabled: !ready(), onClick: doRevoke })));

    const auditCard = h('div', { class: 'atk' },
      h('div', { class: 'atk-h' }, h('span', { class: 'atk-n def' }, '4'), h('span', { class: 'atk-t' }, 'Re-verify the camera roll')),
      h('p', null, 'Check every photo again against the ledger. Who survives the compromise?'),
      h('div', { class: 'row' }, button('Re-verify all photos', { kind: 'primary wide', icon: 'refresh', id: 'auditBtn', disabled: !app.roll.length, onClick: doAudit })));

    fill(el.panel, 
      head('Step 6 · Attack lab', 'Try to break it',
        'Tamper with pixels, steal a sensor key, backdate a fake. Then watch the protocol respond.'),
      tamperCard, forgeCard, revokeCard, auditCard,
      h('div', { class: 'atk' },
        h('div', { class: 'atk-h' }, h('span', { class: 'atk-n def' }, '↺'), h('span', { class: 'atk-t' }, 'Run it again')),
        h('p', null, 'After a revocation the sensor stays revoked. Start over for a fresh run.'),
        h('div', { class: 'row' }, startOverControl().firstChild)));
  }
  function startTamper() {
    const p = current();
    if (!p) return;
    app.tamper = { rgb: new Uint8Array(p.rgb), dirty: false, photoId: p.id };
    enterAttack();
  }
  function bindTamperPointer() {
    let down = false, color = null;
    const paint = (e) => {
      const rect = el.frame.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * W, y = ((e.clientY - rect.top) / rect.height) * H;
      const rgb = app.tamper.rgb;
      if (!color) color = [27, 25, 36];
      const R = 18;
      for (let yy = Math.max(0, Math.floor(y - R)); yy < Math.min(H, y + R); yy++) {
        for (let xx = Math.max(0, Math.floor(x - R)); xx < Math.min(W, x + R); xx++) {
          const d = Math.hypot(xx - x, yy - y) / R;
          if (d >= 1) continue;
          const a = 0.85 * (1 - d * d);
          const o = (yy * W + xx) * 3;
          rgb[o] += (color[0] - rgb[o]) * a; rgb[o + 1] += (color[1] - rgb[o + 1]) * a; rgb[o + 2] += (color[2] - rgb[o + 2]) * a;
        }
      }
      app.tamper.dirty = true;
      drawRgb(rgb);
    };
    el.tiles.onpointerdown = (e) => { down = true; color = null; el.tiles.setPointerCapture(e.pointerId); paint(e); };
    el.tiles.onpointermove = (e) => { if (down) paint(e); };
    el.tiles.onpointerup = () => { down = false; };
  }
  async function saveTamper() {
    const t = app.tamper;
    const p = app.roll.find((x) => x.id === t.photoId);
    if (!p) return;
    if (!t.dirty) { toast('Paint on the photo first.'); return; }
    const copy = newPhoto({ kind: 'tampered', label: `${p.label.replace(/ · (redacted|tampered)$/, '')} · tampered`, rgb: new Uint8Array(t.rgb), manifest: JSON.parse(JSON.stringify(p.manifest)), parent: p.id });
    copy.t0Time = p.t0Time;
    app.tamper = null;
    await addPhoto(copy);
    go('verify');
    setTimeout(runVerifyCurrent, 150);
  }
  async function doForge() {
    if (app.busy || !ready()) return;
    app.busy = 'forge';
    await guard(async () => {
      app.busy = 'forge';
      const origs = originals();
      const base = origs.length ? origs[origs.length - 1] : null;
      let rgb;
      if (base) rgb = new Uint8Array(base.rgb);
      else rgb = await grabFrame('sample');
      SAMPLE.addSmoke(rgb, W, H, 300, 380);
      // Backdate: reuse the oldest T0 we know (an old, public ledger hash)
      let t0;
      if (origs.length) t0 = { index: origs[0].manifest.t0.ledger_index, hash: origs[0].manifest.t0.ledger_hash, time: origs[0].t0Time };
      else {
        const lg = await app.ledger.getLedger(app.sensor.certLedger);
        t0 = { index: app.sensor.certLedger, hash: lg.hash, time: lg.time };
      }
      const now = app.ledger.latest();
      // The key is stolen now: everything already validated (up to the latest ledger) happened before the theft,
      // so the compromise starts with the next ledger. A registration that is already on the ledger stays valid.
      app.world.theft = { ledgerIndex: now.index + 1, time: now.time };
      S.saveWorld(app.net, app.world);
      const cap = await T.capture({
        rgb, width: W, height: H, tile: TILE, t0,
        sensor: { privateKey: app.sensor.privateKey, pk: app.sensor.pk, certTx: app.sensor.certTx },
        network: app.net, consortium: app.world.consortium.address,
      });
      const photo = newPhoto({ kind: 'forged', label: 'Forgery · stolen key', rgb, manifest: cap.manifest });
      photo.t0Time = t0.time;
      await addPhoto(photo);
      showPhoto(photo);
      scanTiles(photo.manifest);
      hud([chip('bad', iconEl('key'), 'signed with the stolen key')], [chip('gold', 'T0 (backdated)', h('span', { class: 'mono' }, `#${fmtInt(t0.index)}`))]);
      toast(`Forgery signed with T0 = ledger #${fmtInt(t0.index)} — it looks older than it is.`, 'err');
    });
    renderAttackPanel();
  }
  async function doRevoke() {
    if (app.busy || !ready()) return;
    const w = app.world;
    const latest = app.ledger.latest();
    const choice = (document.getElementById('revokeWhen') || {}).value || app.revokeChoice;
    const E = choice === 'theft' && w.theft ? w.theft.ledgerIndex : latest.index + 1; // "now": after the latest validated ledger
    app.busy = 'revoke';
    const btn = $('revokeBtn');
    if (btn) busyButton(btn, 'Collecting signatures…');
    await guard(async () => {
      app.busy = 'revoke';
      for (let i = 0; i < 2; i++) {
        await sleep(450);
        app.signing[i] = true;
        const m = el.panel.querySelectorAll('.member')[i];
        if (m) m.classList.add('signed');
      }
      if (btn) btn.innerHTML = `${icon('spin', 2.5)}Waiting for validation…`;
      const ms = w.consortium.members;
      const r = await app.ledger.postMemoMulti(w.consortium.address, [ms[0].seed, ms[1].seed], T.MEMO.REVOKE,
        { v: 1, sensor: app.sensor.id, from_ledger: E, reason: 'key-compromise' });
      w.revocations = w.revocations || [];
      w.revocations.push({ hash: r.hash, fromLedger: E, ledgerIndex: r.ledgerIndex });
      logTx('revoke', `Sensor revoked from #${E} (2-of-3)`, r);
      app.verifyCache = {};
      for (const p of app.roll) { p.verdict = null; await persist(p); }
      renderRoll();
      toast(`Revocation validated in ledger #${fmtInt(r.ledgerIndex)}.`, 'ok');
    });
    if (!(w.revocations && w.revocations.length)) app.signing = [false, false, false];
    renderSteps();
    if (app.step === 'attack') renderAttackPanel();
  }
  async function doAudit() {
    if (app.busy || !app.roll.length) return;
    app.busy = 'audit';
    const btn = $('auditBtn');
    if (btn) busyButton(btn, 'Verifying…');
    await guard(async () => {
      app.busy = 'audit';
      showAudit();
      const grid = h('div', { class: 'audit-grid' });
      const summary = h('p', { class: 'sub' }, `Verifying ${app.roll.length} photos against the ledger…`);
      el.audit.replaceChildren(h('h3', null, 'Camera roll audit'), summary, grid);
      let okN = 0;
      for (const [k, p] of app.roll.entries()) {
        const parsed = await T.fromPng(await T.toPng(p));
        const res = await T.verifyFull(parsed, app.ledger, trustFor(parsed.manifest));
        p.verdict = res.verdict;
        app.verifyCache[p.id] = { res };
        await persist(p);
        if (res.verdict === 'authentic') okN++;
        const fail = res.steps.find((s) => s.status === 'fail');
        const rev = res.steps.find((s) => s.id === 'revocation');
        const why = res.verdict === 'authentic'
          ? (res.revokedFrom ? `Registered before the compromise (#${fmtInt(res.t1.index)} < #${fmtInt(res.revokedFrom)})` : (res.t1 ? 'Registered · sensor in good standing' : 'Unregistered · sensor in good standing'))
          : (fail ? fail.detail : (rev ? rev.detail : 'Rejected'));
        grid.append(h('div', { class: `acard ${res.verdict}`, style: { animationDelay: `${k * 90}ms` }, onclick: () => { app.currentId = p.id; renderRoll(); go('verify'); } },
          h('div', { class: 'img' }, h('img', { src: p.thumb, alt: '' }), h('span', { class: 'stamp' }, res.verdict === 'authentic' ? 'AUTHENTIC' : 'REJECTED')),
          h('div', { class: 'body' }, h('span', { class: 'lb' }, p.label), h('span', { class: 'why' }, why))));
        await sleep(120);
      }
      summary.textContent = `${okN} authentic · ${app.roll.length - okN} rejected — checked against ${app.ledger.label}.`;
      renderRoll();
      renderSteps();
    });
    const b = $('auditBtn');
    if (b) { b.classList.remove('busy'); b.disabled = false; b.innerHTML = `${icon('refresh')}Re-verify all photos`; }
  }

  // --- files, drag & drop, keys ---
  function pickFile(mode) {
    app.fileMode = mode;
    el.file.value = '';
    el.file.click();
  }
  el.file.addEventListener('change', async () => {
    const f = el.file.files && el.file.files[0];
    if (!f) return;
    if (app.fileMode === 'capture') doCapture('file', f);
    else importForVerify(f);
  });
  async function importForVerify(file) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    let parsed;
    try { parsed = await T.fromPng(bytes); } catch (e) { toast(e.message, 'err'); return; }
    if (!parsed.manifest) { toast('This image carries no Omissis proof.', 'err'); return; }
    const existing = app.roll.find((p) => p.manifest.root === parsed.manifest.root && p.manifest.salts.join() === parsed.manifest.salts.join() && p.rgb.length === parsed.rgb.length && p.rgb.every((v, i) => v === parsed.rgb[i]));
    let photo = existing;
    if (!photo) {
      photo = newPhoto({ kind: 'imported', label: file.name.replace(/\.(omissis|tessera)\.png$|\.png$/i, ''), rgb: parsed.rgb, manifest: parsed.manifest });
      await addPhoto(photo);
    }
    app.currentId = photo.id;
    renderRoll();
    go('verify');
    doVerify(photo, bytes, file.name);
  }
  let dragDepth = 0;
  window.addEventListener('dragenter', (e) => { if (e.dataTransfer && [...e.dataTransfer.types].includes('Files')) { dragDepth++; document.body.classList.add('dragging'); } });
  window.addEventListener('dragleave', () => { dragDepth = Math.max(0, dragDepth - 1); if (!dragDepth) document.body.classList.remove('dragging'); });
  window.addEventListener('dragover', (e) => e.preventDefault());
  window.addEventListener('drop', (e) => {
    e.preventDefault();
    dragDepth = 0;
    document.body.classList.remove('dragging');
    const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) importForVerify(f);
  });
  document.addEventListener('keydown', (e) => {
    if (e.target.closest && e.target.closest('input, select, textarea')) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key >= '1' && e.key <= '6') { nav(STEPS[Number(e.key) - 1].id); return; }
    if (e.code === 'Space' && e.target.closest && e.target.closest('button')) return;
    if (e.code === 'Space' && app.step === 'capture' && app.capView === 'live' && ready()) {
      e.preventDefault();
      if (e.repeat) return;
      if (app.countdown || (app.stream && el.frame.classList.contains('mode-live'))) shutter();
      else doCapture('camera'); // no live camera: shows the "not ready" error
    }
  });

  // --- boot / network switching ---
  async function switchNetwork(net) {
    if (app.ledger) app.ledger.disconnect();
    stopCamera();
    app.net = net;
    S.pref('network', net);
    app.world = S.loadWorld(net);
    app.sensor = await loadSensor(net).catch((e) => { console.warn('[tessera] could not load the sensor key', e); return null; });
    app.roll = await S.loadRoll(net);
    // Root-only registrations (older demo versions) no longer count as a date: drop them so the photo can be registered again.
    for (const q of app.roll) {
      if (q.manifest && q.manifest.registration && !q.manifest.registration.anchor) { q.manifest.registration = null; q.verdict = null; await persist(q); }
    }
    app.currentId = app.roll.length ? app.roll[app.roll.length - 1].id : null;
    app.blocks = [];
    app.verifyCache = {};
    app.redact = null;
    app.tamper = null;
    app.signing = [false, false, false];
    app.connected = false;
    el.blocks.replaceChildren();
    el.netLedger.textContent = 'ledger —';
    renderRoll();
    app.ledger = net === 'sim' ? new LG.SimLedger() : new LG.XrplLedger();
    app.ledger.ledgers.on(onLedger);
    app.ledger.status.on((s) => setNet(s));
    setNet('connecting');
    go(ready() ? 'capture' : 'network');
    try {
      await app.ledger.connect();
      app.connected = true;
      setNet('connected');
      let auto = false;
      try { auto = sessionStorage.getItem('tessera.autosetup') === '1'; sessionStorage.removeItem('tessera.autosetup'); } catch (e) { /* ignore */ }
      if (auto && !ready()) { go('network'); setTimeout(runSetup, 300); }
    } catch (e) {
      console.error(e);
      setNet('error');
      toast(`Could not reach the XRPL Testnet (${e && e.message ? e.message : e}).`, 'err',
        [button('Use offline mode', { kind: 'primary', onClick: () => switchNetwork('sim') }), button('Retry', { onClick: () => switchNetwork('testnet') })]);
    }
    if (app.step === 'network') renderNetworkPanel();
  }

  // --- layout + compatibility ---
  // Size the 4:3 frame in JS (container-query units are missing in older Safari).
  function sizeFrame() {
    const r = el.stage.getBoundingClientRect();
    const w = Math.max(120, Math.min(r.width - 36, ((r.height - 36) * 4) / 3));
    el.frame.style.width = `${Math.floor(w)}px`;
    el.frame.style.height = `${Math.floor((w * 3) / 4)}px`;
    fitDiagram();
  }
  // Scale the trust-network diagram down so it always fits the stage
  // (short windows, Windows display scaling at 125-150%, small projectors).
  function fitDiagram() {
    const dg = el.diagram.firstElementChild;
    if (!dg || !el.stage.classList.contains('show-diagram')) return;
    const pad = 20;
    const aw = el.diagram.clientWidth - pad * 2, ah = el.diagram.clientHeight - pad * 2;
    const w = dg.offsetWidth, ht = dg.offsetHeight;
    if (!w || !ht || aw <= 0 || ah <= 0) return;
    const s = Math.min(1, aw / w, ah / ht);
    dg.style.transform = `translate(-50%, -50%) scale(${s.toFixed(4)})`;
  }
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(sizeFrame).observe(el.stage);
  window.addEventListener('resize', sizeFrame);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitDiagram).catch(() => {});
  sizeFrame();

  function compatIssues() {
    const fatal = [], warn = [];
    if (!window.isSecureContext) fatal.push('The page is not a secure context. Open it through start.command (http://127.0.0.1:8000), not by double-clicking index.html.');
    if (!(window.crypto && crypto.subtle)) fatal.push('WebCrypto (crypto.subtle) is not available here, so the sensor cannot sign. Update the browser, or open the demo from http://127.0.0.1:8000.');
    if (!window.xrpl) warn.push('xrpl.js cannot run in this browser version, so Testnet is unavailable: update Safari (15 or newer) or use Chrome. Offline mode still works.');
    if (typeof CompressionStream === 'undefined' && !window.pako) warn.push('No zlib support: PNG export and verification will fail.');
    return { fatal, warn };
  }
  function showFatal(lines) {
    setFrame('empty');
    el.empty.replaceChildren(emptyBox('warn', 'This browser can\'t run the demo', lines.join(' ')));
    fill(el.panel, head('Compatibility', 'Something is blocking the demo', lines.map((l) => `• ${l}`).join('<br>')),
      card('Quick fix', null, h('ul', { class: 'list' },
        h('li', { class: 'yes', html: `${icon('check', 2.6)}<span>Double-click <b>start.command</b> and use the address it opens (http://127.0.0.1:8000)</span>` }),
        h('li', { class: 'yes', html: `${icon('check', 2.6)}<span>Update Safari, or open the same address in Chrome or Firefox</span>` }))));
  }

  const compat = compatIssues();
  renderSteps();
  if (compat.fatal.length) {
    showFatal(compat.fatal);
  } else {
    switchNetwork(compat.warn.length && !window.xrpl ? 'sim' : app.net);
    compat.warn.forEach((w) => toast(w, 'err'));
    S.ready().then(() => { if (!S.status.persistent) toast('Browser storage is unavailable (private window?): photos and accounts will not survive a reload.', 'err'); });
  }
  window.tesseraApp = app; // handy for debugging from the console
})();
