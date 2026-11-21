/* Omissis: minimal lossless PNG codec.
 * Pixels are encoded and decoded here (not through <canvas>) so that the bytes we hash are
 * exactly the bytes in the file, on every browser. The Omissis proof travels inside the PNG
 * as an iTXt chunk with keyword "omissis" ("tessera" in files made under the working name).
 */
(function (root) {
  'use strict';

  const SIGNATURE = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

  const CRC_TABLE = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })();

  function crc32(bytes) {
    let c = 0xffffffff;
    for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }

  function concat(parts) {
    let len = 0;
    for (const p of parts) len += p.length;
    const out = new Uint8Array(len);
    let o = 0;
    for (const p of parts) { out.set(p, o); o += p.length; }
    return out;
  }

  async function pump(bytes, transform) {
    const stream = new Blob([bytes]).stream().pipeThrough(transform);
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }
  // Native zlib streams where available; pako (vendored) on browsers without them (e.g. Safari < 16.4).
  const native = typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined' && typeof Blob !== 'undefined' && !!Blob.prototype.stream;
  function zlibDeflate(bytes) {
    if (native) return pump(bytes, new CompressionStream('deflate'));
    if (root.pako) return Promise.resolve(root.pako.deflate(bytes));
    return Promise.reject(new Error('No zlib support in this browser'));
  }
  function zlibInflate(bytes) {
    if (native) return pump(bytes, new DecompressionStream('deflate'));
    if (root.pako) return Promise.resolve(root.pako.inflate(bytes));
    return Promise.reject(new Error('No zlib support in this browser'));
  }

  function chunk(type, data) {
    const typeBytes = new TextEncoder().encode(type);
    const out = new Uint8Array(12 + data.length);
    const dv = new DataView(out.buffer);
    dv.setUint32(0, data.length);
    out.set(typeBytes, 4);
    out.set(data, 8);
    dv.setUint32(8 + data.length, crc32(concat([typeBytes, data])));
    return out;
  }

  function itxt(keyword, text) {
    const enc = new TextEncoder();
    // keyword \0 compression-flag compression-method language \0 translated-keyword \0 text
    return concat([enc.encode(keyword), new Uint8Array([0, 0, 0, 0, 0]), enc.encode(text)]);
  }

  /** Encode packed RGB (width*height*3 bytes) as an 8-bit truecolour PNG. */
  async function encode(rgb, width, height, texts) {
    const stride = width * 3;
    const raw = new Uint8Array((stride + 1) * height);
    for (let y = 0; y < height; y++) {
      const o = y * (stride + 1);
      const r = y * stride;
      raw[o] = 1; // filter: Sub
      for (let x = 0; x < stride; x++) {
        const left = x >= 3 ? rgb[r + x - 3] : 0;
        raw[o + 1 + x] = (rgb[r + x] - left) & 0xff;
      }
    }
    const ihdr = new Uint8Array(13);
    const dv = new DataView(ihdr.buffer);
    dv.setUint32(0, width);
    dv.setUint32(4, height);
    ihdr[8] = 8; // bit depth
    ihdr[9] = 2; // colour type: truecolour
    const parts = [SIGNATURE, chunk('IHDR', ihdr)];
    for (const [k, v] of Object.entries(texts || {})) parts.push(chunk('iTXt', itxt(k, v)));
    parts.push(chunk('IDAT', await zlibDeflate(raw)));
    parts.push(chunk('IEND', new Uint8Array(0)));
    return concat(parts);
  }

  function paeth(a, b, c) {
    const p = a + b - c;
    const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
    if (pa <= pb && pa <= pc) return a;
    return pb <= pc ? b : c;
  }

  /** Decode an 8-bit RGB/RGBA non-interlaced PNG. Returns { width, height, rgb, texts }. */
  async function decode(input) {
    const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
    for (let i = 0; i < 8; i++) if (bytes[i] !== SIGNATURE[i]) throw new Error('This file is not a PNG image.');
    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const dec = new TextDecoder();
    let pos = 8, width = 0, height = 0, depth = 0, ctype = 0, interlace = 0;
    const idat = [];
    const texts = {};
    while (pos + 8 <= bytes.length) {
      const len = dv.getUint32(pos);
      const type = String.fromCharCode(...bytes.subarray(pos + 4, pos + 8));
      const data = bytes.subarray(pos + 8, pos + 8 + len);
      if (type === 'IHDR') {
        width = dv.getUint32(pos + 8);
        height = dv.getUint32(pos + 12);
        depth = data[8]; ctype = data[9]; interlace = data[12];
      } else if (type === 'IDAT') {
        idat.push(data);
      } else if (type === 'iTXt') {
        const k = data.indexOf(0);
        const keyword = dec.decode(data.subarray(0, k));
        const compressed = data[k + 1] === 1;
        let p = k + 3;
        p = data.indexOf(0, p) + 1; // language tag
        p = data.indexOf(0, p) + 1; // translated keyword
        let body = data.subarray(p);
        if (compressed) body = await zlibInflate(body);
        texts[keyword] = dec.decode(body);
      } else if (type === 'tEXt') {
        const k = data.indexOf(0);
        texts[dec.decode(data.subarray(0, k))] = String.fromCharCode(...data.subarray(k + 1));
      } else if (type === 'IEND') {
        break;
      }
      pos += 12 + len;
    }
    if (depth !== 8 || (ctype !== 2 && ctype !== 6) || interlace !== 0) {
      throw new Error('Unsupported PNG flavour (expected 8-bit RGB, non-interlaced).');
    }
    const bpp = ctype === 6 ? 4 : 3;
    const stride = width * bpp;
    const raw = await zlibInflate(concat(idat));
    if (raw.length < (stride + 1) * height) throw new Error('Truncated PNG image data.');
    const rgb = new Uint8Array(width * height * 3);
    let prev = new Uint8Array(stride);
    let cur = new Uint8Array(stride);
    for (let y = 0; y < height; y++) {
      const base = y * (stride + 1);
      const filter = raw[base];
      for (let x = 0; x < stride; x++) {
        const a = x >= bpp ? cur[x - bpp] : 0;
        const b = prev[x];
        const c = x >= bpp ? prev[x - bpp] : 0;
        let v = raw[base + 1 + x];
        if (filter === 1) v += a;
        else if (filter === 2) v += b;
        else if (filter === 3) v += (a + b) >> 1;
        else if (filter === 4) v += paeth(a, b, c);
        else if (filter !== 0) throw new Error('Corrupt PNG (bad filter type).');
        cur[x] = v & 0xff;
      }
      const o = y * width * 3;
      for (let x = 0; x < width; x++) {
        rgb[o + x * 3] = cur[x * bpp];
        rgb[o + x * 3 + 1] = cur[x * bpp + 1];
        rgb[o + x * 3 + 2] = cur[x * bpp + 2];
      }
      const t = prev; prev = cur; cur = t;
    }
    return { width, height, rgb, texts };
  }

  root.TesseraPNG = { encode, decode, crc32 };
})(typeof window !== 'undefined' ? window : globalThis);
