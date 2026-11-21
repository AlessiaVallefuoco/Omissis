// Node test of the protocol core + PNG codec + simulated ledger.  Run: node test/core.test.js
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const assert = require('assert');

globalThis.window = globalThis;
globalThis.localStorage = {
  s: {}, getItem(k) { return k in this.s ? this.s[k] : null; }, setItem(k, v) { this.s[k] = String(v); }, removeItem(k) { delete this.s[k]; },
};
for (const f of ['png.js', 'tessera.js', 'ledger.js', 'sample.js']) {
  vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8'), { filename: f });
}
const T = globalThis.Tessera;
const { SimLedger } = globalThis.TesseraLedger;

const W = 960, H = 720, TILE = 60;

async function main() {
  const L = new SimLedger();
  await L.connect();
  clearTimeout(L.timer); // drive ledger closes by hand
  const step = async (p) => { const r = p; L._close(); return r; };

  // --- trust network ---
  const C = await L.fund(), M = await L.fund(), P = await L.fund();
  const members = [L.keypair(), L.keypair(), L.keypair()];
  await step(L.setSignerList(C.seed, members.map((m) => m.address), 2));
  await step(L.disableMaster(C.seed));
  await assert.rejects(step(L.postMemo(C.seed, 'x', {})), /MASTER_DISABLED/);
  await assert.rejects(step(L.issueCredential(C.address, [members[0].seed], M.address, T.CRED_TYPE)), /QUORUM/);
  await step(L.issueCredential(C.address, [members[0].seed, members[1].seed], M.address, T.CRED_TYPE));
  await step(L.acceptCredential(M.seed, C.address, T.CRED_TYPE));
  const sensor = await T.createSensorKey();
  const cert = await step(L.postMemo(M.seed, T.MEMO.CERT, { v: 1, pk: sensor.pk, model: 'S1' }));
  sensor.certTx = cert.hash;
  const trust = { consortium: C.address, source: 'pinned' };
  console.log('world ok; sensor', sensor.id.slice(0, 8));

  // --- capture ---
  const rgb = new Uint8Array(W * H * 3);
  for (let i = 0; i < rgb.length; i++) rgb[i] = (i * 31 + (i >> 9)) & 0xff;
  const t0 = L.latest();
  const t = Date.now();
  const cap = await T.capture({ rgb, width: W, height: H, tile: TILE, t0, sensor, network: 'sim', consortium: C.address });
  console.log('capture ms', Date.now() - t, 'levels', cap.levels.map((l) => l.length).join('→'));
  const photo = { rgb, width: W, height: H, manifest: cap.manifest };

  // --- PNG round trip ---
  const png = await T.toPng(photo);
  const back = await T.fromPng(png);
  assert.strictEqual(back.width, W);
  assert.ok(Buffer.from(back.rgb).equals(Buffer.from(rgb)), 'pixels survive PNG round trip');
  assert.strictEqual(back.manifest.root, cap.manifest.root);
  console.log('png bytes', png.length);

  let v = await T.verifyFull(back, L, trust);
  assert.strictEqual(v.verdict, 'authentic', JSON.stringify(v.steps, null, 1));
  assert.ok(v.steps.find((s) => s.id === 'registration').status === 'info');

  // --- register: the anchor binds root + signature ---
  L._close(); L._close();
  const anchor = await T.registrationAnchor(cap.manifest);
  const reg = await step(L.postMemo(P.seed, T.MEMO.ANCHOR, { v: 2, anchor }));
  const registered = { ...photo, manifest: { ...photo.manifest, registration: { tx: reg.hash, ledger_index: reg.ledgerIndex, anchor } } };
  v = await T.verifyFull(registered, L, trust);
  assert.strictEqual(v.verdict, 'authentic');
  assert.ok(v.t1 && v.t1.index === reg.ledgerIndex);

  // anchors written under the working name's memo type ('tessera/anchor') still count
  const legacyAnchorReg = await step(L.postMemo(P.seed, T.LEGACY.ANCHOR, { v: 2, anchor }));
  v = await T.verifyFull({ ...photo, manifest: { ...photo.manifest, registration: { tx: legacyAnchorReg.hash, ledger_index: legacyAnchorReg.ledgerIndex, anchor } } }, L, trust);
  assert.ok(v.verdict === 'authentic' && v.t1 && v.t1.index === legacyAnchorReg.ledgerIndex, 'old anchor memo type accepted');

  // a sensor certified under the old memo type ('tessera/sensor-cert') still verifies, and an old-type revocation still applies
  const sensorOld = await T.createSensorKey();
  sensorOld.certTx = (await step(L.postMemo(M.seed, T.LEGACY.CERT, { v: 1, pk: sensorOld.pk, model: 'S0' }))).hash;
  const capOld = await T.capture({ rgb, width: W, height: H, tile: TILE, t0: L.latest(), sensor: sensorOld, network: 'sim', consortium: C.address });
  const photoOld = { rgb, width: W, height: H, manifest: capOld.manifest };
  assert.strictEqual((await T.verifyFull(photoOld, L, trust)).verdict, 'authentic', 'old certificate memo type accepted');
  const backOld = await T.fromPng(await T.toPng(photoOld));
  assert.strictEqual(backOld.manifest.root, capOld.manifest.root, 'proof chunk round trip (omissis keyword)');
  await step(L.postMemoMulti(C.address, [members[0].seed, members[2].seed], T.LEGACY.REVOKE, { v: 1, sensor: sensorOld.id, from_ledger: L.latest().index }));
  assert.strictEqual((await T.verifyFull(photoOld, L, trust)).verdict, 'invalid', 'old revocation memo type still applies');

  // an old root-only registration is recognised but not counted as a date
  const legacyReg = await step(L.postMemo(P.seed, T.MEMO.ROOT, { v: 1, root: cap.manifest.root }));
  v = await T.verifyFull({ ...photo, manifest: { ...photo.manifest, registration: { tx: legacyReg.hash } } }, L, trust);
  assert.strictEqual(v.verdict, 'authentic');
  assert.strictEqual(v.t1, null);
  assert.strictEqual(v.steps.find((x) => x.id === 'registration').status, 'warn');

  // --- redact ---
  const red = T.redact(registered, [5, 6, 21, 22]);
  const redPhoto = { rgb: red.rgb, width: W, height: H, manifest: red.manifest };
  const redBack = await T.fromPng(await T.toPng(redPhoto));
  v = await T.verifyFull(redBack, L, trust);
  assert.strictEqual(v.verdict, 'authentic');
  assert.deepStrictEqual(v.hidden, [5, 6, 21, 22]);

  // --- tamper ---
  const tam = { ...registered, rgb: new Uint8Array(registered.rgb) };
  tam.rgb[(130 * W + 200) * 3] ^= 0xff; // pixel (200,130) -> tile col 3, row 2 -> index 35
  v = await T.verifyFull(tam, L, trust);
  assert.strictEqual(v.verdict, 'invalid');
  assert.deepStrictEqual(v.tampered, [35]);

  // --- register first, sign later: an attacker registers the root of a prepared fake BEFORE stealing the key ---
  // (no key needed to compute a root: a throwaway key gives the same root for the same pixels and salts)
  const fake2 = new Uint8Array(rgb);
  globalThis.TesseraSample.addSmoke(fake2, W, H, 200, 300);
  const throwaway = await T.createSensorKey();
  const pre = await T.capture({ rgb: fake2, width: W, height: H, tile: TILE, t0, sensor: { ...throwaway, certTx: sensor.certTx }, network: 'sim', consortium: C.address });
  const preRoot = await step(L.postMemo(P.seed, T.MEMO.ROOT, { v: 1, root: pre.manifest.root }));
  const preGuess = await step(L.postMemo(P.seed, T.MEMO.ANCHOR, { v: 2, anchor: 'ab'.repeat(32) })); // the anchor can't be computed without signing

  // --- forged with stolen key, backdated T0 ---
  const fakeRgb = new Uint8Array(rgb);
  globalThis.TesseraSample.addSmoke(fakeRgb, W, H, 300, 380);
  const forged = await T.capture({ rgb: fakeRgb, width: W, height: H, tile: TILE, t0, sensor, network: 'sim', consortium: C.address });
  const forgedPhoto = { rgb: fakeRgb, width: W, height: H, manifest: forged.manifest };
  v = await T.verifyFull(forgedPhoto, L, trust);
  assert.strictEqual(v.verdict, 'authentic', 'before revocation the forgery passes (that is the threat)');

  // --- revoke from now ---
  L._close();
  const E = L.latest().index + 1;
  await step(L.postMemoMulti(C.address, [members[1].seed, members[2].seed], T.MEMO.REVOKE, { v: 1, sensor: sensor.id, from_ledger: E }));
  const forgedReg = await step(L.postMemo(P.seed, T.MEMO.ANCHOR, { v: 2, anchor: await T.registrationAnchor(forged.manifest) }));
  const forgedRegPhoto = { ...forgedPhoto, manifest: { ...forgedPhoto.manifest, registration: { tx: forgedReg.hash } } };

  // after the theft: the attacker signs the pre-registered root with the stolen key and attaches the old receipts
  const pm = pre.manifest;
  const preMsg = T.signedMessage({ rootHash: T.fromHex(pm.root), t0Hash: T.fromHex(pm.t0.ledger_hash), t0Index: pm.t0.ledger_index, width: W, height: H, cols: 16, rows: 12 });
  const preSig = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, sensor.privateKey, preMsg));
  const preForged = (rc) => ({ rgb: fake2, width: W, height: H, manifest: { ...pm, sensor: { pk: sensor.pk, cert_tx: sensor.certTx }, sig: T.toB64u(preSig), registration: { tx: rc.hash, ledger_index: rc.ledgerIndex } } });
  assert.ok(preRoot.ledgerIndex < E && preGuess.ledgerIndex < E, 'the receipts predate the compromise');
  assert.ok(await T.verifySignature(preForged(preRoot).manifest), 'the stolen key really signed it');

  const results = {
    preRegisteredRoot: (await T.verifyFull(preForged(preRoot), L, trust)).verdict,
    preRegisteredGuess: (await T.verifyFull(preForged(preGuess), L, trust)).verdict,
    registered: (await T.verifyFull(registered, L, trust)).verdict,
    redacted: (await T.verifyFull(redBack, L, trust)).verdict,
    unregistered: (await T.verifyFull(back, L, trust)).verdict,
    forged: (await T.verifyFull(forgedPhoto, L, trust)).verdict,
    forgedRegisteredLate: (await T.verifyFull(forgedRegPhoto, L, trust)).verdict,
  };
  console.log(results);
  assert.deepStrictEqual(results, { preRegisteredRoot: 'invalid', preRegisteredGuess: 'invalid', registered: 'authentic', redacted: 'authentic', unregistered: 'invalid', forged: 'invalid', forgedRegisteredLate: 'invalid' });

  // signature binds T0: swapping T0 breaks it
  const swapped = JSON.parse(JSON.stringify(registered.manifest));
  swapped.t0.ledger_index -= 1;
  assert.strictEqual(await T.verifySignature(swapped), false);
  console.log('ALL TESTS PASSED');
  L.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
