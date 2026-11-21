/* Omissis (working name: Tessera): core protocol, no UI.
 *
 *  capture : image -> tiles -> salted SHA-256 leaves -> Merkle root -> sensor signs (root || T0)
 *  redact  : hidden tiles keep only their salted fingerprint; the signature still verifies
 *  register: anchor = SHA-256(sensor key || signed message || signature) goes on the ledger -> existed by T1
 *  verify  : pixels -> root -> signature -> certificate -> credential -> T0 -> registration -> revocation
 */
(function (root) {
  'use strict';

  const subtle = (root.crypto || globalThis.crypto).subtle;
  const enc = new TextEncoder();
  const DOMAIN = enc.encode('TESSERA/v1\n');
  const DOMAIN_ANCHOR = enc.encode('TESSERA/anchor/v1\n');
  const CRED_TYPE = 'TesseraManufacturer';
  // Memo types written from now on. LEGACY are the types used under the working name Tessera:
  // still read, so earlier certificates, registrations and revocations keep working.
  // ROOT is the old root-only registration: recognised, but no longer accepted as a date.
  const MEMO = { CERT: 'omissis/sensor-cert', ANCHOR: 'omissis/anchor', ROOT: 'tessera/root', REVOKE: 'omissis/revoke' };
  const LEGACY = { CERT: 'tessera/sensor-cert', ANCHOR: 'tessera/anchor', REVOKE: 'tessera/revoke' };
  const CERT_TYPES = [MEMO.CERT, LEGACY.CERT], ANCHOR_TYPES = [MEMO.ANCHOR, LEGACY.ANCHOR], REVOKE_TYPES = [MEMO.REVOKE, LEGACY.REVOKE];

  // ---------- encoding helpers ----------
  const toHex = (b) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  function fromHex(s) {
    const out = new Uint8Array(s.length >> 1);
    for (let i = 0; i < out.length; i++) out[i] = parseInt(s.substr(i * 2, 2), 16);
    return out;
  }
  const toB64u = (b) => btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  function fromB64u(s) {
    let t = s.replace(/-/g, '+').replace(/_/g, '/');
    while (t.length % 4) t += '=';
    return Uint8Array.from(atob(t), (c) => c.charCodeAt(0));
  }
  function concat(parts) {
    let len = 0;
    for (const p of parts) len += p.length;
    const out = new Uint8Array(len);
    let o = 0;
    for (const p of parts) { out.set(p, o); o += p.length; }
    return out;
  }
  function eq(a, b) {
    if (a.length !== b.length) return false;
    let d = 0;
    for (let i = 0; i < a.length; i++) d |= a[i] ^ b[i];
    return d === 0;
  }
  async function sha256(...parts) {
    return new Uint8Array(await subtle.digest('SHA-256', concat(parts)));
  }
  const shortAddr = (a) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : '—');
  const n = (x) => Number(x).toLocaleString('en-US');
  function fmtTime(iso) {
    if (!iso) return 'unknown time';
    const d = new Date(iso);
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  // ---------- mosaic ----------
  function tilePixels(rgb, width, tile, col, row) {
    const out = new Uint8Array(tile * tile * 3);
    const rowBytes = tile * 3;
    for (let y = 0; y < tile; y++) {
      const src = ((row * tile + y) * width + col * tile) * 3;
      out.set(rgb.subarray(src, src + rowBytes), y * rowBytes);
    }
    return out;
  }
  const leafHash = (i, salt, pix) => sha256(new Uint8Array([0x00, (i >> 8) & 0xff, i & 0xff]), salt, pix);
  const nodeHash = (l, r) => sha256(new Uint8Array([0x01]), l, r);

  async function merkleLevels(leaves) {
    const levels = [leaves];
    let cur = leaves;
    while (cur.length > 1) {
      const next = [];
      for (let i = 0; i < cur.length; i += 2) next.push(i + 1 < cur.length ? await nodeHash(cur[i], cur[i + 1]) : cur[i]);
      levels.push(next);
      cur = next;
    }
    return levels;
  }

  function signedMessage({ rootHash, t0Hash, t0Index, width, height, cols, rows }) {
    const out = new Uint8Array(DOMAIN.length + 32 + 32 + 4 + 2 + 2 + 1 + 1);
    let o = 0;
    out.set(DOMAIN, o); o += DOMAIN.length;
    out.set(rootHash, o); o += 32;
    out.set(t0Hash, o); o += 32;
    const dv = new DataView(out.buffer);
    dv.setUint32(o, t0Index); o += 4;
    dv.setUint16(o, width); o += 2;
    dv.setUint16(o, height); o += 2;
    out[o++] = cols;
    out[o++] = rows;
    return out;
  }

  // ---------- sensor (simulated secure element) ----------
  async function createSensorKey(opts) {
    // Non-extractable: the private key can sign but can never be exported, like a key fused in a chip.
    // (opts.extractable is only used as a storage fallback on browsers that cannot persist CryptoKey objects.)
    const kp = await subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, !!(opts && opts.extractable), ['sign', 'verify']);
    const pkRaw = new Uint8Array(await subtle.exportKey('raw', kp.publicKey));
    return { privateKey: kp.privateKey, pk: toB64u(pkRaw), id: toHex(await sha256(pkRaw)) };
  }
  const sensorIdFromPk = async (pk) => toHex(await sha256(fromB64u(pk)));

  /** Hash every tile with a fresh 128-bit salt, build the Merkle tree and sign root || T0. */
  async function capture({ rgb, width, height, tile, t0, sensor, network, consortium }) {
    const cols = width / tile, rows = height / tile, n = cols * rows;
    const salts = new Array(n), leaves = new Array(n);
    for (let i = 0; i < n; i++) {
      salts[i] = root.crypto.getRandomValues(new Uint8Array(16));
      leaves[i] = await leafHash(i, salts[i], tilePixels(rgb, width, tile, i % cols, Math.floor(i / cols)));
    }
    const levels = await merkleLevels(leaves);
    const rootHash = levels[levels.length - 1][0];
    const msg = signedMessage({ rootHash, t0Hash: fromHex(t0.hash), t0Index: t0.index, width, height, cols, rows });
    const sig = new Uint8Array(await subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, sensor.privateKey, msg));
    const manifest = {
      omissis: 1,
      image: { w: width, h: height, tile, cols, rows },
      root: toHex(rootHash),
      t0: { ledger_index: t0.index, ledger_hash: t0.hash },
      sensor: { pk: sensor.pk, cert_tx: sensor.certTx },
      sig: toB64u(sig),
      network,
      consortium,
      registration: null,
      leaves: leaves.map(toHex),
      salts: salts.map(toHex),
    };
    return { manifest, levels: levels.map((l) => l.map(toHex)) };
  }

  // ---------- registration anchor ----------
  /**
   * What goes on the ledger when a photo is registered: one hash of the whole signed statement
   * (sensor key, signed message = root || T0 || size, signature). It can only be computed once the
   * sensor has signed, so a registration made before a key theft proves the signature predates it.
   * (A bare root could be registered by anyone in advance, then signed with a stolen key later.)
   * It reveals nothing: the signature is random and stays in the file.
   */
  async function registrationAnchor(manifest) {
    const im = manifest.image;
    const msg = signedMessage({
      rootHash: fromHex(manifest.root), t0Hash: fromHex(manifest.t0.ledger_hash), t0Index: manifest.t0.ledger_index,
      width: im.w, height: im.h, cols: im.cols, rows: im.rows,
    });
    return toHex(await sha256(DOMAIN_ANCHOR, fromB64u(manifest.sensor.pk), msg, fromB64u(manifest.sig)));
  }

  // ---------- redaction ----------
  function paintHidden(rgb, width, tile, col, row) {
    for (let y = 0; y < tile; y++) {
      for (let x = 0; x < tile; x++) {
        const gx = col * tile + x, gy = row * tile + y;
        const o = (gy * width + gx) * 3;
        const stripe = (gx + gy) % 14 < 3;
        rgb[o] = stripe ? 52 : 17;
        rgb[o + 1] = stripe ? 60 : 21;
        rgb[o + 2] = stripe ? 86 : 32;
      }
    }
  }

  /** New copy where the given tiles are removed: pixels painted over, salt dropped, fingerprint kept. */
  function redact(photo, hidden) {
    const { tile, cols } = photo.manifest.image;
    const rgb = new Uint8Array(photo.rgb);
    const manifest = JSON.parse(JSON.stringify(photo.manifest));
    for (const i of hidden) {
      manifest.salts[i] = null;
      paintHidden(rgb, photo.width, tile, i % cols, Math.floor(i / cols));
    }
    return { rgb, manifest };
  }

  // ---------- verification ----------
  async function verifyMosaic(manifest, rgb, width, height) {
    const im = manifest.image || {};
    const res = { ok: false, rootOk: false, tampered: [], hidden: [], visible: 0, total: 0, reason: '' };
    if (im.w !== width || im.h !== height || im.cols * im.tile !== width || im.rows * im.tile !== height) {
      res.reason = 'Image size does not match the signed geometry (was it resized or cropped by another app?)';
      return res;
    }
    const n = im.cols * im.rows;
    res.total = n;
    if (!Array.isArray(manifest.leaves) || manifest.leaves.length !== n || !Array.isArray(manifest.salts) || manifest.salts.length !== n) {
      res.reason = 'Malformed proof';
      return res;
    }
    const leaves = manifest.leaves.map(fromHex);
    for (let i = 0; i < n; i++) {
      const s = manifest.salts[i];
      if (s == null) { res.hidden.push(i); continue; }
      res.visible++;
      const leaf = await leafHash(i, fromHex(s), tilePixels(rgb, width, im.tile, i % im.cols, Math.floor(i / im.cols)));
      if (!eq(leaf, leaves[i])) res.tampered.push(i);
    }
    const levels = await merkleLevels(leaves);
    res.rootOk = toHex(levels[levels.length - 1][0]) === String(manifest.root).toLowerCase();
    res.ok = res.rootOk && res.tampered.length === 0;
    if (!res.rootOk) res.reason = 'Tile fingerprints do not add up to the signed root';
    else if (res.tampered.length) res.reason = `${res.tampered.length} tile${res.tampered.length > 1 ? 's were' : ' was'} modified after capture`;
    return res;
  }

  async function verifySignature(manifest) {
    try {
      const im = manifest.image;
      const key = await subtle.importKey('raw', fromB64u(manifest.sensor.pk), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
      const msg = signedMessage({
        rootHash: fromHex(manifest.root), t0Hash: fromHex(manifest.t0.ledger_hash), t0Index: manifest.t0.ledger_index,
        width: im.w, height: im.h, cols: im.cols, rows: im.rows,
      });
      return await subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, fromB64u(manifest.sig), msg);
    } catch (e) {
      return false;
    }
  }

  async function safe(fn) {
    try { return await fn(); } catch (e) { console.warn('[tessera] ledger query failed', e); return undefined; }
  }
  const memoOf = (tx, types) => {
    const ts = [].concat(types);
    return tx && tx.memos ? tx.memos.find((m) => ts.includes(m.type)) : null;
  };

  /**
   * Full verification of a photo file against the ledger.
   * photo: { manifest, rgb, width, height }; ledger: backend; trust: { consortium, source }.
   * onStep(step) is awaited after each check so the UI can animate.
   */
  async function verifyFull(photo, ledger, trust, onStep) {
    const { manifest, rgb, width, height } = photo;
    const steps = [];
    const out = { steps, verdict: 'invalid', tampered: [], hidden: [], t0: null, t1: null, revokedFrom: null, sensorId: null, manufacturer: null };
    const emit = async (s) => { steps.push(s); if (onStep) await onStep(s); };
    const X = (kind, id) => (ledger.explorer ? ledger.explorer(kind, id) : null);

    // 0. Proof + trust anchor
    const im = manifest.image || {};
    await emit({
      id: 'proof', title: 'Omissis proof found in the file',
      status: trust.source === 'pinned' ? 'ok' : 'warn',
      detail: `${im.cols}×${im.rows} tiles · trust anchor: consortium ${shortAddr(trust.consortium)}` +
        (trust.source === 'pinned' ? '' : ' (read from the file — a real verifier pins it)'),
    });

    // 1. Pixels -> root
    const mosaic = await verifyMosaic(manifest, rgb, width, height);
    out.tampered = mosaic.tampered;
    out.hidden = mosaic.hidden;
    await emit({
      id: 'pixels', title: 'Pixels match the signed mosaic', status: mosaic.ok ? 'ok' : 'fail',
      hidden: mosaic.hidden, tampered: mosaic.tampered,
      detail: mosaic.ok
        ? `${mosaic.visible} visible tiles re-hashed` + (mosaic.hidden.length ? ` · ${mosaic.hidden.length} redacted tiles proven by fingerprint` : '')
        : mosaic.reason,
    });

    // 2. Sensor signature
    const sigOk = await verifySignature(manifest);
    out.sensorId = (await safe(() => sensorIdFromPk(manifest.sensor.pk))) || '';
    await emit({
      id: 'signature', title: 'Signed by the sensor', status: sigOk ? 'ok' : 'fail',
      detail: sigOk ? `ECDSA P-256 over root ‖ T0 · sensor ${out.sensorId.slice(0, 8)}` : 'The signature does not match this root and T0',
    });

    // 3. Sensor certificate (registered on the ledger by the manufacturer)
    const cert = await safe(() => ledger.getTx(manifest.sensor.cert_tx));
    const certMemo = memoOf(cert, CERT_TYPES);
    if (cert && cert.validated && certMemo && certMemo.data && certMemo.data.pk === manifest.sensor.pk) {
      out.manufacturer = cert.account;
      await emit({
        id: 'certificate', title: 'Sensor certificate on the ledger', status: 'ok',
        detail: `Issued by manufacturer ${shortAddr(cert.account)} · ledger #${n(cert.ledgerIndex)}`,
        link: X('tx', cert.hash),
      });
    } else {
      await emit({
        id: 'certificate', title: 'Sensor certificate on the ledger', status: 'fail',
        detail: cert === undefined ? 'Could not reach the ledger' : cert ? 'That transaction does not certify this sensor key' : 'Certificate not found on this network',
      });
    }

    // 4. Manufacturer credential (XLS-70) issued by the consortium
    if (out.manufacturer) {
      const cred = await safe(() => ledger.getCredential(out.manufacturer, trust.consortium, CRED_TYPE));
      const ok = !!(cred && cred.accepted);
      await emit({
        id: 'credential', title: 'Manufacturer accredited by the consortium', status: ok ? 'ok' : 'fail',
        detail: ok ? `On-ledger manufacturer credential (XLS-70) from ${shortAddr(trust.consortium)}, accepted`
          : 'No accepted credential from the consortium (expelled or never admitted)',
        link: ok ? X('account', out.manufacturer) : null,
      });
    } else {
      await emit({ id: 'credential', title: 'Manufacturer accredited by the consortium', status: 'skip', detail: 'Skipped: no valid certificate' });
    }

    // 5. T0: the sensor embedded a real ledger hash -> taken after T0
    const t0 = manifest.t0 || {};
    const lg = await safe(() => ledger.getLedger(t0.ledger_index));
    if (lg && String(lg.hash).toUpperCase() === String(t0.ledger_hash).toUpperCase()) {
      out.t0 = { index: t0.ledger_index, time: lg.time };
      await emit({
        id: 't0', title: 'Taken after T0', status: 'ok',
        detail: `Embeds the hash of ledger #${n(t0.ledger_index)}, closed at ${fmtTime(lg.time)}`,
        link: X('ledger', t0.ledger_index),
      });
    } else if (lg) {
      await emit({ id: 't0', title: 'Taken after T0', status: 'fail', detail: `Hash does not match ledger #${n(t0.ledger_index)}` });
    } else {
      out.t0 = { index: t0.ledger_index, time: null };
      await emit({ id: 't0', title: 'Taken after T0', status: 'warn', detail: `Ledger #${n(t0.ledger_index)} is not in this server's history` });
    }

    // 6. Registration: the anchor (sensor key || signed message || signature) is on the ledger -> existed by T1
    const reg = manifest.registration;
    if (reg && reg.tx) {
      const rtx = await safe(() => ledger.getTx(reg.tx));
      const am = memoOf(rtx, ANCHOR_TYPES);
      const legacy = !am ? memoOf(rtx, MEMO.ROOT) : null;
      const anchor = await safe(() => registrationAnchor(manifest));
      if (rtx && rtx.validated && am && am.data && anchor && String(am.data.anchor).toLowerCase() === anchor && rtx.ledgerIndex >= t0.ledger_index) {
        out.t1 = { index: rtx.ledgerIndex, time: rtx.time, hash: rtx.hash };
        await emit({
          id: 'registration', title: 'Existed by T1 (registered)', status: 'ok',
          detail: `Root and signature anchored in ledger #${n(rtx.ledgerIndex)} at ${fmtTime(rtx.time)}`,
          link: X('tx', rtx.hash),
        });
      } else if (rtx && rtx.validated && legacy && legacy.data && String(legacy.data.root).toLowerCase() === String(manifest.root).toLowerCase()) {
        // Root-only registration: it proves the image existed, not the signature, so it is not counted as T1.
        await emit({
          id: 'registration', title: 'Old registration format', status: 'warn',
          detail: 'Only the root was registered, not the signature: it does not count as a date (a stolen key could sign it later). Register again.',
          link: X('tx', rtx.hash),
        });
      } else {
        await emit({
          id: 'registration', title: 'Existed by T1 (registered)', status: 'fail',
          detail: rtx === undefined ? 'Could not reach the ledger' : 'The registration receipt does not match this photo and its signature',
        });
      }
    } else {
      await emit({ id: 'registration', title: 'Not registered', status: 'info', detail: 'Proven: taken after T0. No upper bound on the date.' });
    }

    // 7. Revocation with effective date
    const revs = await safe(() => ledger.getMemos(trust.consortium, REVOKE_TYPES));
    if (revs === undefined) {
      await emit({ id: 'revocation', title: 'Revocation status', status: 'warn', detail: 'Could not read revocations from the ledger' });
    } else {
      const mine = revs.map((r) => ({ r, m: memoOf(r, REVOKE_TYPES) })).filter((x) => x.m && x.m.data && x.m.data.sensor === out.sensorId);
      if (!mine.length) {
        await emit({ id: 'revocation', title: 'Sensor not revoked', status: 'ok', detail: 'No revocation published by the consortium' });
      } else {
        const first = mine.reduce((a, b) => (b.m.data.from_ledger < a.m.data.from_ledger ? b : a));
        const E = first.m.data.from_ledger;
        out.revokedFrom = E;
        if (out.t1 && out.t1.index < E) {
          await emit({
            id: 'revocation', title: 'Registered before the compromise', status: 'ok',
            detail: `Sensor revoked from ledger #${n(E)}; this photo was anchored earlier (#${n(out.t1.index)})`,
            link: X('tx', first.r.hash),
          });
        } else {
          await emit({
            id: 'revocation', title: 'Sensor revoked', status: 'fail',
            detail: out.t1
              ? `Anchored in #${n(out.t1.index)}, after the estimated compromise (#${n(E)})`
              : `Compromised from ledger #${n(E)}; an unregistered photo cannot prove it is older`,
            link: X('tx', first.r.hash),
          });
        }
      }
    }

    out.verdict = steps.some((s) => s.status === 'fail') ? 'invalid' : 'authentic';
    return out;
  }

  // ---------- files ----------
  async function toPng(photo) {
    return root.TesseraPNG.encode(photo.rgb, photo.width, photo.height, { omissis: JSON.stringify(photo.manifest) });
  }
  async function fromPng(bytes) {
    const img = await root.TesseraPNG.decode(bytes);
    let manifest = null;
    const raw = img.texts.omissis || img.texts.tessera; // files made under the working name use "tessera"
    if (raw) {
      try { manifest = JSON.parse(raw); } catch (e) { manifest = null; }
    }
    return { width: img.width, height: img.height, rgb: img.rgb, manifest };
  }

  root.Tessera = {
    CRED_TYPE, MEMO, LEGACY,
    toHex, fromHex, toB64u, fromB64u, sha256, shortAddr, fmtTime,
    tilePixels, merkleLevels, signedMessage,
    createSensorKey, sensorIdFromPk, capture, redact, registrationAnchor,
    verifyMosaic, verifySignature, verifyFull,
    toPng, fromPng,
  };
})(typeof window !== 'undefined' ? window : globalThis);
