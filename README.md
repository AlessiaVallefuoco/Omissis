<p align="center"><img src="omissis/docs/omissis-logo.png" width="96" alt="Omissis logo"></p>

# Omissis: blur the face, keep the proof

IXH26 Italian XRPL Hackathon, Bari · Track 01: Advanced Cryptography<br>
Team Asse Perugia-Napoli-Roma: Giorgia Gaj, Alessandro Giannoni, Alessandro Marangio, Lorenzo Spinelli, Alessia Vallefuoco.

Omissis certifies where a photo comes from and lets you hide faces and plates without losing that proof, with no central authority and without exposing the person who took it.

> **A valid photo proves** that it comes from a certified sensor, that it existed at a given date, that every visible pixel is original and that what was hidden stays hidden. **It does not prove** that the scene is real: staged scenes are out of scope.

## Run it

A static web app: no build step, no backend.

- **macOS:** double-click `start.command`. It serves the folder on <http://127.0.0.1:8000> and opens the browser. 
- **Windows:** open `index.html` in Chrome, Edge or Opera, or run `start-windows.bat`. 

Tested in Chrome; Safari 15+ works through `start.command`. Without internet, use the **Testnet / Offline** switch (top right). Keys `1`–`6` switch steps, `Space` takes the photo.

## How it works

| Step | What happens | On the ledger |
|---|---|---|
| **1 · Trust network** | A 2-of-3 multisig consortium (master key disabled) accredits a manufacturer, which certifies a sensor key: a non-extractable WebCrypto ECDSA P-256 key. | `SignerListSet`, `AccountSet`, `CredentialCreate` (XLS-70, multi-signed), `CredentialAccept`, certificate memo |
| **2 · Capture** | The 960×720 image is split into 192 tiles, each hashed with a fresh 128-bit salt: `leaf = SHA-256(0x00 ‖ i ‖ salt ‖ pixels)`. The sensor signs `root ‖ T0 ‖ size`, where **T0** is the latest validated ledger. | nothing |
| **3 · Register** *(optional)* | A 32-byte anchor, `SHA-256(sensor key ‖ signed message ‖ signature)`, proves that the photo and its signature existed by **T1**. | `AccountSet` + memo `omissis/anchor` |
| **4 · Redact** | Hide faces or plates, or crop. A hidden tile keeps only its salted hash: the signature still verifies and the pixels can't be recovered or brute-forced. | nothing |
| **5 · Verify** | With only the PNG and a public node: tiles → root, signature, certificate, credential, T0, registration, revocations. | reads only |
| **6 · Attack lab** | Tampered tiles turn red. A fake signed with a stolen key and a backdated T0 passes until the consortium revokes the sensor with an effective date. | multi-signed revocation memo |

Each step has one main button, and every badge links to the real transaction on the explorer. The setup takes about 40 seconds on the Testnet.

The anchor covers the **signature**, not just the root: anyone can compute a bare root without the key, so an attacker could register a fake's root before the theft and sign it after. After a revocation:

| Photo | Result |
|---|---|
| Registered before the theft, and its redacted copies | ✅ authentic |
| Never registered | ❌ rejected |
| Forgery: backdated, registered late, or root registered first | ❌ rejected |

## File format

A normal PNG with the proof in an `iTXt` chunk (keyword `omissis`; older files use `tessera`): geometry, Merkle root, T0, sensor key and certificate, signature, the 192 leaves, the salts (`null` for hidden tiles) and the registration. Pixels are decoded by our own codec (`js/png.js`), never through canvas readback, which some browsers add noise to.

**On the ledger:** signer list, credentials, sensor certificates, anchors, revocations. **Never:** pixels, metadata, location, or a public link between a sensor and a photo.

## Code and tests

`js/tessera.js` protocol core · `js/ledger.js` XRPL Testnet and offline simulation · `js/png.js` PNG codec · `js/app.js` UI · `js/store.js` persistence · `js/sample.js` sample scene.

`npm test` (Node 20+) runs the whole protocol end to end on the simulated ledger, attacks included.

## Limits

Staged scenes are out of scope. Only cropping and redaction are allowed: resizing, filters and social-media recompression break verification. Photos from the same sensor are linkable through its public key. The raw pipeline is simplified. In the demo the sensor is simulated in the browser, testnet seeds live in localStorage, and the verifier pins the local consortium address.

**Troubleshooting:** setup stopped halfway → **Resume setup**. No camera → **Sample** or **Upload**. Fresh start → **Start over** (step 1 or attack lab); after the attack lab the sensor stays revoked until you do this.

## AI declaration

The project idea is ours. We used Claude Opus 5.5 (Anthropic) to generate part of the code from our specifications. Also, it helped us with the slides.

## Third-party code

Vendored: [xrpl.js](https://github.com/XRPLF/xrpl.js) 5.3.0 (ISC) and [pako](https://github.com/nodeca/pako) 2.1.0 (MIT, Zlib). Fonts: Inter, Space Grotesk, JetBrains Mono (SIL OFL 1.1).
