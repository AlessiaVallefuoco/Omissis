/* Omissis: ledger backends with one interface.
 *   XrplLedger : the real XRP Ledger Testnet through xrpl.js
 *   SimLedger  : an in-browser simulation of the same calls (offline fallback, clearly labelled)
 */
(function (root) {
  'use strict';

  const RIPPLE_EPOCH = 946684800;
  const rippleToIso = (t) => new Date((t + RIPPLE_EPOCH) * 1000).toISOString();
  const strToHex = (s) => Array.from(new TextEncoder().encode(s), (b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  function hexToStr(h) {
    try { return new TextDecoder().decode(Uint8Array.from(h.match(/../g) || [], (x) => parseInt(x, 16))); } catch (e) { return ''; }
  }
  const delay = (ms) => new Promise((r) => setTimeout(r, ms));

  class Emitter {
    constructor() { this.fns = new Set(); }
    on(fn) { this.fns.add(fn); return () => this.fns.delete(fn); }
    emit(x) { for (const f of this.fns) { try { f(x); } catch (e) { console.error(e); } } }
  }

  function memosField(type, data) {
    return [{ Memo: { MemoType: strToHex(type), MemoData: strToHex(JSON.stringify(data)), MemoFormat: strToHex('application/json') } }];
  }
  function parseMemos(txj) {
    return (txj.Memos || []).map(({ Memo }) => {
      const type = Memo && Memo.MemoType ? hexToStr(Memo.MemoType) : '';
      const raw = Memo && Memo.MemoData ? hexToStr(Memo.MemoData) : '';
      let data = raw;
      try { data = JSON.parse(raw); } catch (e) { /* plain text memo */ }
      return { type, data };
    });
  }
  const errCode = (e) => (e && e.data && (e.data.error || (e.data.result && e.data.result.error))) || '';

  // =====================================================================
  //  Real XRPL Testnet
  // =====================================================================
  class XrplLedger {
    constructor(opts) {
      this.kind = 'testnet';
      this.label = 'XRPL Testnet';
      this.urls = (opts && opts.urls) || ['wss://s.altnet.rippletest.net:51233', 'wss://testnet.xrpl-labs.com'];
      this.ledgers = new Emitter();
      this.status = new Emitter();
      this.latestLedger = null;
      this.client = null;
    }

    async connect() {
      const xrpl = root.xrpl;
      if (!xrpl) throw new Error('xrpl.js did not load (vendor/xrpl-latest-min.js)');
      let lastErr = null;
      for (const url of this.urls) {
        try {
          const client = new xrpl.Client(url, { connectionTimeout: 8000 });
          let dropped = false;
          client.on('ledgerClosed', (l) => this._onLedger({ index: l.ledger_index, hash: l.ledger_hash, time: rippleToIso(l.ledger_time), txns: l.txn_count }));
          client.on('disconnected', () => { dropped = true; this.status.emit('disconnected'); });
          client.on('connected', () => {
            this.status.emit('connected');
            if (dropped) { dropped = false; client.request({ command: 'subscribe', streams: ['ledger'] }).catch(() => {}); }
          });
          await client.connect();
          const s = (await client.request({ command: 'subscribe', streams: ['ledger'] })).result;
          this.client = client;
          this.url = url;
          this._onLedger({ index: s.ledger_index, hash: s.ledger_hash, time: rippleToIso(s.ledger_time), txns: s.txn_count || 0 });
          this.status.emit('connected');
          return;
        } catch (e) {
          lastErr = e;
        }
      }
      throw lastErr || new Error('Could not connect to the XRPL Testnet');
    }

    disconnect() { if (this.client) this.client.disconnect().catch(() => {}); }
    _onLedger(l) { this.latestLedger = l; this.ledgers.emit(l); }
    latest() { return this.latestLedger; }

    _w(seed) { return root.xrpl.Wallet.fromSeed(seed); }
    keypair() { const w = root.xrpl.Wallet.generate(); return { address: w.classicAddress, seed: w.seed }; }
    async fund() {
      const { wallet } = await this.client.fundWallet();
      return { address: wallet.classicAddress, seed: wallet.seed };
    }

    _receipt(res) {
      const r = res.result;
      const code = r.meta && typeof r.meta === 'object' ? r.meta.TransactionResult : undefined;
      if (code !== 'tesSUCCESS') throw new Error(`The ledger rejected the transaction (${code || 'unknown result'})`);
      const time = r.close_time_iso || (r.tx_json && r.tx_json.date != null ? rippleToIso(r.tx_json.date) : new Date().toISOString());
      return { hash: r.hash, ledgerIndex: r.ledger_index, time };
    }
    async _submit(tx, seed) {
      const w = this._w(seed);
      tx.Account = w.classicAddress;
      return this._receipt(await this.client.submitAndWait(tx, { wallet: w, autofill: true }));
    }
    // Multi-signed transaction: every member signs the same autofilled tx, xrpl.js merges the signatures.
    async _submitMulti(tx, seeds) {
      const prepared = await this.client.autofill(tx, seeds.length);
      const blobs = seeds.map((s) => this._w(s).sign(prepared, true).tx_blob);
      return this._receipt(await this.client.submitAndWait(root.xrpl.multisign(blobs)));
    }

    // Consortium account: one vote per member, `quorum` signatures needed (2 of 3 in the demo).
    setSignerList(seed, members, quorum) {
      return this._submit({
        TransactionType: 'SignerListSet', SignerQuorum: quorum,
        SignerEntries: members.map((a) => ({ SignerEntry: { Account: a, SignerWeight: 1 } })),
      }, seed);
    }
    disableMaster(seed) { return this._submit({ TransactionType: 'AccountSet', SetFlag: 4 /* asfDisableMaster */ }, seed); }
    // XLS-70 credential: the consortium (multi-signed) accredits a manufacturer, who must accept it.
    issueCredential(account, seeds, subject, type) {
      return this._submitMulti({ TransactionType: 'CredentialCreate', Account: account, Subject: subject, CredentialType: strToHex(type) }, seeds);
    }
    acceptCredential(seed, issuer, type) {
      return this._submit({ TransactionType: 'CredentialAccept', Issuer: issuer, CredentialType: strToHex(type) }, seed);
    }
    // Certificates, anchors and revocations are memos on an AccountSet that changes nothing else.
    postMemo(seed, type, data) { return this._submit({ TransactionType: 'AccountSet', Memos: memosField(type, data) }, seed); }
    postMemoMulti(account, seeds, type, data) {
      return this._submitMulti({ TransactionType: 'AccountSet', Account: account, Memos: memosField(type, data) }, seeds);
    }

    _norm(r) {
      const txj = r.tx_json || r.tx || r;
      return {
        hash: r.hash || txj.hash,
        account: txj.Account,
        type: txj.TransactionType,
        memos: parseMemos(txj),
        ledgerIndex: r.ledger_index || txj.ledger_index,
        time: r.close_time_iso || (txj.date != null ? rippleToIso(txj.date) : null),
        validated: !!r.validated,
        result: r.meta && typeof r.meta === 'object' ? r.meta.TransactionResult : undefined,
        signers: (txj.Signers || []).length,
      };
    }
    async getTx(hash) {
      if (!hash) return null;
      try {
        return this._norm((await this.client.request({ command: 'tx', transaction: hash })).result);
      } catch (e) {
        if (errCode(e) === 'txnNotFound') return null;
        throw e;
      }
    }
    async getLedger(index) {
      try {
        const r = (await this.client.request({ command: 'ledger', ledger_index: index })).result;
        const l = r.ledger || {};
        return { index, hash: r.ledger_hash || l.ledger_hash, time: l.close_time_iso || (l.close_time != null ? rippleToIso(l.close_time) : null) };
      } catch (e) {
        if (errCode(e) === 'lgrNotFound') return null;
        throw e;
      }
    }
    async getCredential(subject, issuer, type) {
      try {
        const r = (await this.client.request({
          command: 'ledger_entry', ledger_index: 'validated',
          credential: { subject, issuer, credential_type: strToHex(type) },
        })).result;
        return { accepted: !!(r.node.Flags & 0x00010000), flags: r.node.Flags };
      } catch (e) {
        if (errCode(e) === 'entryNotFound') return null;
        throw e;
      }
    }
    async getMemos(account, type) {
      const types = [].concat(type);
      const out = [];
      let marker;
      for (let page = 0; page < 10; page++) {
        const req = { command: 'account_tx', account, ledger_index_min: -1, ledger_index_max: -1, forward: true, limit: 200 };
        if (marker) req.marker = marker;
        const r = (await this.client.request(req)).result;
        for (const t of r.transactions) {
          const n = this._norm(t);
          if (n.account === account && n.validated && n.result === 'tesSUCCESS' && n.memos.some((m) => types.includes(m.type))) out.push(n);
        }
        marker = r.marker;
        if (!marker) break;
      }
      return out;
    }
    explorer(kind, id) {
      const base = 'https://testnet.xrpl.org';
      if (kind === 'tx') return `${base}/transactions/${id}`;
      if (kind === 'account') return `${base}/accounts/${id}`;
      return `${base}/ledgers/${id}`;
    }
  }

  // =====================================================================
  //  Simulated ledger (offline fallback)
  // =====================================================================
  const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  const rnd = (n) => (root.crypto || globalThis.crypto).getRandomValues(new Uint8Array(n));
  const randHex = (n) => Array.from(rnd(n), (b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  const fakeAddr = () => 'r' + Array.from(rnd(32), (b) => B58[b % 58]).join('');
  const fakeSeed = () => 'sEd' + Array.from(rnd(26), (b) => B58[b % 58]).join('');

  class SimLedger {
    constructor() {
      this.kind = 'sim';
      this.label = 'Simulated ledger';
      this.key = 'tessera.sim.v1';
      this.ledgers = new Emitter();
      this.status = new Emitter();
      this.pending = [];
      let saved = null;
      try { saved = JSON.parse(localStorage.getItem(this.key)); } catch (e) { saved = null; }
      this.s = saved || { index: 9000000 + Math.floor(Math.random() * 900000), ledgers: [], txs: {}, accounts: {}, seeds: {}, creds: {} };
    }
    _save() { try { localStorage.setItem(this.key, JSON.stringify(this.s)); } catch (e) { /* storage full: keep going in memory */ } }

    async connect() {
      if (!this.s.ledgers.length) this._close();
      const tick = () => { this._close(); this.timer = setTimeout(tick, 3300 + Math.random() * 900); };
      this.timer = setTimeout(tick, 1500);
      setTimeout(() => this.status.emit('connected'), 0);
    }
    disconnect() { clearTimeout(this.timer); }
    latest() { return this.s.ledgers[this.s.ledgers.length - 1] || null; }
    reset() { try { localStorage.removeItem(this.key); } catch (e) { /* ignore */ } }

    _close() {
      const index = ++this.s.index;
      const time = new Date().toISOString();
      const batch = this.pending.splice(0);
      for (const p of batch) {
        try {
          p.apply();
          const tx = Object.assign({}, p.tx, { ledgerIndex: index, time, validated: true, result: 'tesSUCCESS' });
          this.s.txs[tx.hash] = tx;
          p.resolve({ hash: tx.hash, ledgerIndex: index, time });
        } catch (e) {
          p.reject(e);
        }
      }
      const l = { index, hash: randHex(32), time, txns: batch.length + 3 + Math.floor(Math.random() * 14) };
      this.s.ledgers.push(l);
      if (this.s.ledgers.length > 5000) this.s.ledgers.splice(0, this.s.ledgers.length - 5000);
      this._save();
      this.ledgers.emit(l);
    }
    _queue(build) {
      return new Promise((resolve, reject) => {
        let spec;
        try { spec = build(); } catch (e) { reject(e); return; }
        spec.tx.hash = randHex(32);
        spec.tx.memos = spec.tx.memos || [];
        spec.tx.signers = spec.tx.signers || 0;
        this.pending.push({ tx: spec.tx, apply: spec.apply || (() => {}), resolve, reject });
      });
    }
    _acct(addr) {
      const a = this.s.accounts[addr];
      if (!a) throw new Error('Account not found (actNotFound)');
      return a;
    }
    _addrOf(seed) {
      const a = this.s.seeds[seed];
      if (!a) throw new Error('Unknown signing key');
      return a;
    }
    _single(seed) {
      const addr = this._addrOf(seed);
      if (this._acct(addr).masterDisabled) throw new Error('Master key is disabled (tefMASTER_DISABLED)');
      return addr;
    }
    _multi(account, seeds) {
      const acct = this._acct(account);
      if (!acct.signerList) throw new Error('Account has no signer list (tefNOT_MULTI_SIGNING)');
      const signers = new Set(seeds.map((s) => this.s.seeds[s]).filter((a) => acct.signerList.members.includes(a)));
      if (signers.size < acct.signerList.quorum) throw new Error('Signer quorum not met (tefBAD_QUORUM)');
      return signers.size;
    }

    keypair() {
      const k = { address: fakeAddr(), seed: fakeSeed() };
      this.s.seeds[k.seed] = k.address;
      this._save();
      return k;
    }
    async fund() {
      await delay(700 + Math.random() * 700);
      const k = this.keypair();
      this.s.accounts[k.address] = { balance: 100, masterDisabled: false, signerList: null };
      this._save();
      return k;
    }
    setSignerList(seed, members, quorum) {
      return this._queue(() => {
        const account = this._single(seed);
        return { tx: { account, type: 'SignerListSet' }, apply: () => { this._acct(account).signerList = { members, quorum }; } };
      });
    }
    disableMaster(seed) {
      return this._queue(() => {
        const account = this._single(seed);
        if (!this._acct(account).signerList) throw new Error('Set a signer list before disabling the master key');
        return { tx: { account, type: 'AccountSet' }, apply: () => { this._acct(account).masterDisabled = true; } };
      });
    }
    issueCredential(account, seeds, subject, type) {
      return this._queue(() => {
        const n = this._multi(account, seeds);
        return { tx: { account, type: 'CredentialCreate', signers: n }, apply: () => { this.s.creds[`${subject}|${account}|${type}`] = { accepted: false }; } };
      });
    }
    acceptCredential(seed, issuer, type) {
      return this._queue(() => {
        const account = this._single(seed);
        const key = `${account}|${issuer}|${type}`;
        return { tx: { account, type: 'CredentialAccept' }, apply: () => { const c = this.s.creds[key]; if (!c) throw new Error('No such credential (tecNO_ENTRY)'); c.accepted = true; } };
      });
    }
    postMemo(seed, type, data) {
      return this._queue(() => {
        const account = this._single(seed);
        return { tx: { account, type: 'AccountSet', memos: [{ type, data }] } };
      });
    }
    postMemoMulti(account, seeds, type, data) {
      return this._queue(() => {
        const n = this._multi(account, seeds);
        return { tx: { account, type: 'AccountSet', memos: [{ type, data }], signers: n } };
      });
    }

    async getTx(hash) { await delay(50); const t = this.s.txs[hash]; return t ? JSON.parse(JSON.stringify(t)) : null; }
    async getLedger(index) {
      await delay(40);
      const l = this.s.ledgers.find((x) => x.index === index);
      return l ? { index, hash: l.hash, time: l.time } : null;
    }
    async getCredential(subject, issuer, type) { await delay(40); return this.s.creds[`${subject}|${issuer}|${type}`] || null; }
    async getMemos(account, type) {
      const types = [].concat(type);
      await delay(70);
      return Object.values(this.s.txs)
        .filter((t) => t.account === account && t.memos.some((m) => types.includes(m.type)))
        .sort((a, b) => a.ledgerIndex - b.ledgerIndex)
        .map((t) => JSON.parse(JSON.stringify(t)));
    }
    explorer() { return null; }
  }

  root.TesseraLedger = { XrplLedger, SimLedger };
})(typeof window !== 'undefined' ? window : globalThis);
