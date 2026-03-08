(function (global) {
  'use strict';

  if (global.firebase && global.firebase.__isSupabaseCompat) {
    return;
  }

  const POLL_INTERVAL_MS = 1200;
  const MAX_TX_RETRIES = 20;
  const TIMESTAMP_TOKEN = Object.freeze({ __rtdbServerTimestamp: true });

  function isPlainObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  function cloneValue(value) {
    if (value === undefined) return undefined;
    return JSON.parse(JSON.stringify(value));
  }

  function normalizePath(path) {
    const raw = String(path == null ? '' : path).trim();
    if (!raw || raw === '/') return '';
    if (raw === '.info/connected') return '.info/connected';
    return raw
      .replace(/^\/+/, '')
      .replace(/\/+$/, '')
      .replace(/\/{2,}/g, '/');
  }

  function splitPath(path) {
    const normalized = normalizePath(path);
    if (!normalized) return [];
    return normalized.split('/').filter(Boolean);
  }

  function getLastPathSegment(path) {
    const parts = splitPath(path);
    return parts.length ? parts[parts.length - 1] : null;
  }

  function getValueByPath(root, path) {
    const parts = splitPath(path);
    let cursor = root;
    for (const segment of parts) {
      if (cursor === null || cursor === undefined || typeof cursor !== 'object') return undefined;
      cursor = cursor[segment];
    }
    return cursor;
  }

  function resolveServerTimestamps(value) {
    if (value === TIMESTAMP_TOKEN) return Date.now();
    if (Array.isArray(value)) return value.map(resolveServerTimestamps);
    if (isPlainObject(value)) {
      if (value.__rtdbServerTimestamp === true || value['.sv'] === 'timestamp') {
        return Date.now();
      }
      const result = {};
      Object.entries(value).forEach(([key, entry]) => {
        result[key] = resolveServerTimestamps(entry);
      });
      return result;
    }
    return value;
  }

  function toSnapshotValue(value) {
    return value === undefined ? null : value;
  }

  function normalizeScalarRpcResponse(data, keyName) {
    if (Array.isArray(data)) {
      if (!data.length) return null;
      const row = data[0];
      if (row && typeof row === 'object' && keyName && Object.prototype.hasOwnProperty.call(row, keyName)) {
        return row[keyName];
      }
      return row;
    }
    if (data && typeof data === 'object' && keyName && Object.prototype.hasOwnProperty.call(data, keyName)) {
      return data[keyName];
    }
    return data;
  }

  function parseBooleanRpcResponse(data, keyName) {
    const raw = normalizeScalarRpcResponse(data, keyName);
    if (typeof raw === 'boolean') return raw;
    if (typeof raw === 'string') {
      const value = raw.trim().toLowerCase();
      if (value === 'true' || value === 't' || value === '1') return true;
      if (value === 'false' || value === 'f' || value === '0') return false;
    }
    if (typeof raw === 'number') return raw !== 0;
    return !!raw;
  }

  function applyQueryFilter(value, query) {
    if (!query || !query.orderByChild) {
      return value;
    }

    if (value === null || value === undefined || typeof value !== 'object') {
      return null;
    }

    const rows = Object.entries(value);
    const field = String(query.orderByChild || '').trim();

    let filtered = rows;
    if (Object.prototype.hasOwnProperty.call(query, 'equalTo')) {
      filtered = rows.filter(([, row]) => {
        if (row === null || row === undefined || typeof row !== 'object') return false;
        return row[field] === query.equalTo;
      });
    }

    filtered.sort((a, b) => {
      const aValue = a[1] && typeof a[1] === 'object' ? a[1][field] : undefined;
      const bValue = b[1] && typeof b[1] === 'object' ? b[1][field] : undefined;
      if (aValue === bValue) return String(a[0]).localeCompare(String(b[0]));
      if (aValue === undefined || aValue === null) return -1;
      if (bValue === undefined || bValue === null) return 1;
      if (aValue > bValue) return 1;
      if (aValue < bValue) return -1;
      return 0;
    });

    if (!filtered.length) return null;

    const result = {};
    filtered.forEach(([key, row]) => {
      result[key] = row;
    });
    return result;
  }

  function buildPushKey() {
    const timePart = Date.now().toString(36).padStart(9, '0');
    const randomPart = Math.random().toString(36).slice(2, 12).padEnd(10, '0');
    return `-${timePart}${randomPart}`;
  }

  class DataSnapshot {
    constructor(value, key) {
      this._value = toSnapshotValue(value);
      this.key = key == null ? null : String(key);
    }

    val() {
      return cloneValue(this._value);
    }

    exists() {
      return this._value !== null && this._value !== undefined;
    }
  }

  class SupabaseRealtimeDatabase {
    constructor(client) {
      this._client = client;
      this._listeners = [];
      this._listenerSeq = 0;
      this._pollTimer = null;
      this._polling = false;
      this._refreshTimer = null;
      this._cacheVersion = null;
      this._cacheRoot = null;
    }

    ref(path = '') {
      return new DatabaseRef(this, path, null);
    }

    async _rpc(fn, args) {
      const { data, error } = await this._client.rpc(fn, args || {});
      if (error) {
        const details = error.details ? ` (${error.details})` : '';
        throw new Error(`[Supabase:${fn}] ${error.message || 'RPC error'}${details}`);
      }
      return data;
    }

    async _readRaw(path) {
      if (path === '.info/connected') return true;
      const data = await this._rpc('rtdb_read', { p_path: path || '' });
      return toSnapshotValue(data);
    }

    async _read(path, query) {
      const baseValue = await this._readRaw(path);
      return toSnapshotValue(applyQueryFilter(baseValue, query));
    }

    async _set(path, value) {
      if (path === '.info/connected') return;
      const resolved = resolveServerTimestamps(value);
      await this._rpc('rtdb_set', {
        p_path: path || '',
        p_value: resolved === undefined ? null : resolved
      });
      this._scheduleImmediateRefresh();
    }

    async _patch(patches) {
      const prepared = {};
      Object.entries(patches || {}).forEach(([rawPath, rawValue]) => {
        const normalizedPath = normalizePath(rawPath);
        if (!normalizedPath && rawPath !== '') return;
        if (rawValue === undefined) return;
        prepared[normalizedPath] = resolveServerTimestamps(rawValue);
      });

      if (!Object.keys(prepared).length) return;

      await this._rpc('rtdb_patch', { p_updates: prepared });
      this._scheduleImmediateRefresh();
    }

    async _update(basePath, payload) {
      if (!isPlainObject(payload)) {
        throw new Error('update() expects an object payload.');
      }

      const updates = {};
      Object.entries(payload).forEach(([childPath, value]) => {
        if (value === undefined) return;
        const normalizedChild = normalizePath(childPath);
        const fullPath = normalizePath(basePath)
          ? normalizePath(`${basePath}/${normalizedChild}`)
          : normalizedChild;
        if (!fullPath && childPath !== '') return;
        updates[fullPath] = value;
      });

      await this._patch(updates);
    }

    async _compareAndSet(path, expected, nextValue) {
      const data = await this._rpc('rtdb_compare_and_set', {
        p_path: path || '',
        p_expected: expected === undefined ? null : expected,
        p_next: nextValue === undefined ? null : nextValue
      });
      return parseBooleanRpcResponse(data, 'rtdb_compare_and_set');
    }

    async _transaction(path, updateFn) {
      if (typeof updateFn !== 'function') {
        throw new Error('transaction() expects a function.');
      }

      const normalizedPath = normalizePath(path);
      const key = getLastPathSegment(normalizedPath);

      for (let i = 0; i < MAX_TX_RETRIES; i += 1) {
        const current = await this._readRaw(normalizedPath);
        const nextInput = cloneValue(current);
        const next = updateFn(nextInput);

        if (next === undefined) {
          return {
            committed: false,
            snapshot: new DataSnapshot(current, key)
          };
        }

        const resolvedNext = resolveServerTimestamps(next);
        const committed = await this._compareAndSet(normalizedPath, current, resolvedNext);
        if (committed) {
          this._scheduleImmediateRefresh();
          return {
            committed: true,
            snapshot: new DataSnapshot(resolvedNext, key)
          };
        }
      }

      const latest = await this._readRaw(normalizedPath);
      return {
        committed: false,
        snapshot: new DataSnapshot(latest, key)
      };
    }

    async _readAll() {
      const data = await this._rpc('rtdb_read_all');
      const row = Array.isArray(data) ? data[0] : data;
      const version = Number((row && row.version) || 0);
      const root = row && row.data !== null && row.data !== undefined ? row.data : {};
      return {
        version,
        data: root && typeof root === 'object' ? root : {}
      };
    }

    async _readVersion() {
      const data = await this._rpc('rtdb_version');
      const version = normalizeScalarRpcResponse(data, 'rtdb_version');
      return Number(version || 0);
    }

    async _emitOne(listener) {
      if (listener.path === '.info/connected') {
        listener.callback(new DataSnapshot(true, 'connected'));
        return;
      }

      if (this._cacheRoot === null) {
        const state = await this._readAll();
        this._cacheVersion = state.version;
        this._cacheRoot = state.data;
      }

      const raw = getValueByPath(this._cacheRoot, listener.path);
      const filtered = applyQueryFilter(raw, listener.query);
      listener.callback(new DataSnapshot(filtered, getLastPathSegment(listener.path)));
    }

    _emitAll() {
      this._listeners.forEach((listener) => {
        Promise.resolve()
          .then(() => this._emitOne(listener))
          .catch((error) => {
            console.error('[RTDB] listener callback failed:', error);
          });
      });
    }

    _ensurePolling() {
      if (this._pollTimer || !this._listeners.length) return;
      this._pollTimer = setInterval(() => {
        this._poll().catch((error) => {
          console.error('[RTDB] polling failed:', error);
        });
      }, POLL_INTERVAL_MS);
    }

    _stopPollingIfIdle() {
      if (this._listeners.length) return;
      if (this._pollTimer) {
        clearInterval(this._pollTimer);
        this._pollTimer = null;
      }
    }

    async _poll() {
      if (this._polling || !this._listeners.length) return;
      this._polling = true;
      try {
        const version = await this._readVersion();
        if (this._cacheVersion === version && this._cacheRoot !== null) return;
        const state = await this._readAll();
        this._cacheVersion = state.version;
        this._cacheRoot = state.data;
        this._emitAll();
      } finally {
        this._polling = false;
      }
    }

    _scheduleImmediateRefresh() {
      if (this._refreshTimer) return;
      this._refreshTimer = setTimeout(() => {
        this._refreshTimer = null;
        this._poll().catch((error) => {
          console.error('[RTDB] refresh failed:', error);
        });
      }, 0);
    }

    _addListener(path, query, callback) {
      const listener = {
        id: ++this._listenerSeq,
        path: normalizePath(path),
        query: query || null,
        callback
      };
      this._listeners.push(listener);
      this._ensurePolling();
      Promise.resolve()
        .then(() => this._emitOne(listener))
        .catch((error) => {
          console.error('[RTDB] initial listener emission failed:', error);
        });
      return callback;
    }

    _removeListener(path, query, callback) {
      const normalizedPath = normalizePath(path);
      this._listeners = this._listeners.filter((listener) => {
        if (listener.path !== normalizedPath) return true;
        if (callback && listener.callback !== callback) return true;
        if (query) {
          const left = JSON.stringify(listener.query || {});
          const right = JSON.stringify(query || {});
          if (left !== right) return true;
        }
        return false;
      });
      this._stopPollingIfIdle();
    }
  }

  class DatabaseRef {
    constructor(database, path, query) {
      this._db = database;
      this._path = normalizePath(path);
      this._query = query || null;
      this.key = getLastPathSegment(this._path);
    }

    child(childPath) {
      const combined = this._path
        ? `${this._path}/${normalizePath(childPath)}`
        : normalizePath(childPath);
      return new DatabaseRef(this._db, combined, null);
    }

    orderByChild(field) {
      const query = {
        ...(this._query || {}),
        orderByChild: String(field || '')
      };
      return new DatabaseRef(this._db, this._path, query);
    }

    equalTo(value) {
      const query = {
        ...(this._query || {}),
        equalTo: value
      };
      return new DatabaseRef(this._db, this._path, query);
    }

    once(eventName) {
      if (eventName !== 'value') {
        return Promise.reject(new Error(`Unsupported event: ${eventName}`));
      }
      return this._db._read(this._path, this._query)
        .then((value) => new DataSnapshot(value, this.key));
    }

    on(eventName, callback) {
      if (eventName !== 'value') {
        throw new Error(`Unsupported event: ${eventName}`);
      }
      if (typeof callback !== 'function') {
        throw new Error('on() expects a callback function.');
      }
      return this._db._addListener(this._path, this._query, callback);
    }

    off(eventName, callback) {
      if (eventName && eventName !== 'value') return;
      this._db._removeListener(this._path, this._query, callback);
    }

    set(value) {
      return this._db._set(this._path, value);
    }

    update(payload) {
      return this._db._update(this._path, payload);
    }

    remove() {
      return this._db._set(this._path, null);
    }

    push(value) {
      const childRef = this.child(buildPushKey());
      if (arguments.length === 0) return childRef;

      const writePromise = childRef.set(value).then(() => childRef);
      childRef.then = writePromise.then.bind(writePromise);
      childRef.catch = writePromise.catch.bind(writePromise);
      if (typeof writePromise.finally === 'function') {
        childRef.finally = writePromise.finally.bind(writePromise);
      }
      return childRef;
    }

    transaction(updateFn) {
      return this._db._transaction(this._path, updateFn);
    }

    onDisconnect() {
      return {
        set: async () => null,
        update: async () => null,
        remove: async () => null,
        cancel: async () => null
      };
    }
  }

  function buildSupabaseClient(config) {
    const fallbackConfig = global.__SUPABASE_CONFIG__ || {};
    const merged = {
      ...fallbackConfig,
      ...(config || {})
    };

    const url = merged.supabaseUrl || merged.url || '';
    const anonKey = merged.supabaseAnonKey || merged.anonKey || '';

    if (!url || !anonKey) {
      throw new Error('Supabase configuration is missing. Define window.__SUPABASE_CONFIG__.');
    }

    if (!global.supabase || typeof global.supabase.createClient !== 'function') {
      throw new Error('Supabase browser SDK is not loaded.');
    }

    return global.supabase.createClient(url, anonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }

  const apps = [];
  let databaseInstance = null;

  const firebaseCompat = {
    __isSupabaseCompat: true,
    apps,
    initializeApp(config) {
      if (apps.length) return apps[0];
      const client = buildSupabaseClient(config);
      const app = {
        options: config || {},
        name: '[DEFAULT]',
        _supabaseClient: client
      };
      apps.push(app);
      databaseInstance = new SupabaseRealtimeDatabase(client);
      return app;
    },
    app() {
      if (!apps.length) {
        throw new Error('No app has been initialized. Call firebase.initializeApp first.');
      }
      return apps[0];
    },
    database() {
      if (!databaseInstance) {
        this.initializeApp(global.__SUPABASE_CONFIG__ || {});
      }
      return databaseInstance;
    }
  };

  firebaseCompat.database.ServerValue = {
    TIMESTAMP: TIMESTAMP_TOKEN
  };

  global.firebase = firebaseCompat;
}(window));
