/* Omissis: local persistence (storage keys keep the working name "tessera").
 * World config (testnet accounts) in localStorage; sensor key and photos in IndexedDB.
 * The sensor's private key is a non-extractable CryptoKey: IndexedDB can store it, nothing can export it.
 */
(function (root) {
  'use strict';

  const DB_NAME = 'tessera-demo';
  const STORE = 'kv';
  let dbPromise = null;

  const memory = new Map(); // used only if IndexedDB is unavailable
  const status = { persistent: true };
  function db() {
    if (!dbPromise) {
      dbPromise = new Promise((resolve, reject) => {
        if (typeof indexedDB === 'undefined' || !indexedDB) { reject(new Error('IndexedDB unavailable')); return; }
        let req;
        try { req = indexedDB.open(DB_NAME, 1); } catch (e) { reject(e); return; }
        req.onupgradeneeded = () => req.result.createObjectStore(STORE);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
        setTimeout(() => reject(new Error('IndexedDB did not open')), 4000);
      }).catch((e) => {
        console.warn('[tessera] IndexedDB unavailable, keeping data in memory only', e);
        status.persistent = false;
        return null;
      });
    }
    return dbPromise;
  }
  async function op(mode, fn, memFn) {
    const d = await db();
    if (!d) return memFn();
    return new Promise((resolve, reject) => {
      const tx = d.transaction(STORE, mode);
      const req = fn(tx.objectStore(STORE));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      tx.onabort = () => reject(tx.error || req.error || new Error('IndexedDB transaction aborted'));
    });
  }
  const get = (key) => op('readonly', (s) => s.get(key), () => memory.get(key));
  const set = (key, val) => op('readwrite', (s) => s.put(val, key), () => { memory.set(key, val); });
  const del = (key) => op('readwrite', (s) => s.delete(key), () => { memory.delete(key); });

  const worldKey = (net) => `tessera.world.v1.${net}`;
  function loadWorld(net) {
    try { return JSON.parse(localStorage.getItem(worldKey(net))); } catch (e) { return null; }
  }
  function saveWorld(net, world) {
    try { localStorage.setItem(worldKey(net), JSON.stringify(world)); } catch (e) { console.warn('could not save world', e); }
  }
  function clearWorld(net) {
    try { localStorage.removeItem(worldKey(net)); } catch (e) { /* ignore */ }
  }
  function pref(name, value) {
    try {
      if (value === undefined) return localStorage.getItem(`tessera.pref.${name}`);
      localStorage.setItem(`tessera.pref.${name}`, value);
    } catch (e) { return null; }
    return value;
  }

  // Photos: one record per key + an ordered id list per network.
  async function loadRoll(net) {
    const ids = (await get(`roll.${net}`)) || [];
    const out = [];
    for (const id of ids) {
      const p = await get(`photo.${net}.${id}`);
      if (p) out.push(p);
    }
    return out;
  }
  async function savePhoto(net, photo, ids) {
    await set(`photo.${net}.${photo.id}`, photo);
    await set(`roll.${net}`, ids);
  }
  async function deletePhoto(net, id, ids) {
    await del(`photo.${net}.${id}`);
    await set(`roll.${net}`, ids);
  }
  async function clearNetwork(net) {
    const ids = (await get(`roll.${net}`)) || [];
    for (const id of ids) await del(`photo.${net}.${id}`);
    await del(`roll.${net}`);
    await del(`sensor.${net}`);
    clearWorld(net);
  }

  root.TesseraStore = { get, set, del, loadWorld, saveWorld, clearWorld, pref, loadRoll, savePhoto, deletePhoto, clearNetwork, status, ready: db };
})(typeof window !== 'undefined' ? window : globalThis);
