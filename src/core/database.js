/**
 * PLIS (Penggilas Laundry Information System)
 * Core Database Module - JavaScript Edition
 * 
 * Modul database IndexedDB yang mengekspos API untuk menyimpan,
 * mengambil, memperbarui, dan menghapus data untuk entitas utama
 * seperti 'pelanggan', 'layanan', dan 'transaksi'.
 * Data tersimpan persisten di IndexedDB peramban lokal.
 */

export const DB_NAME = 'PLIS_LAUNDRY_DB';
export const DB_VERSION = 1;

export const STORE_ALIASES = {
  pelanggan: 'customers',
  layanan: 'services',
  transaksi: 'transactions',
  kategori: 'categories',
  klasifikasi: 'classifications',
  satuan: 'units',
  pembayaran: 'payments',
  pengeluaran: 'expenses',
  pengaturan: 'settings',
  pengguna: 'users',
  rekap_kas: 'cashSessions',
  audit: 'auditLogs',
};

const listeners = new Set();

/**
 * Mendaftarkan listener untuk mendengarkan perubahan data di DB
 */
export function onDatabaseChange(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function notifyChange(storeName, action, data) {
  listeners.forEach((fn) => {
    try {
      fn({ storeName, action, data });
    } catch (e) {
      console.error('[PLIS DB Event Error]:', e);
    }
  });
}

function resolveStore(entityName) {
  if (!entityName) return 'transactions';
  const normalized = String(entityName).toLowerCase();
  return STORE_ALIASES[normalized] || normalized;
}

const memoryStore = {};

function getFallback(key, defaultVal) {
  try {
    if (typeof localStorage !== 'undefined') {
      const item = localStorage.getItem(`plis_${key}`);
      return item ? JSON.parse(item) : defaultVal;
    }
    const mem = memoryStore[`plis_${key}`];
    return mem ? JSON.parse(mem) : defaultVal;
  } catch {
    return defaultVal;
  }
}

function setFallback(key, val) {
  try {
    const serialized = JSON.stringify(val);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(`plis_${key}`, serialized);
    }
    memoryStore[`plis_${key}`] = serialized;
  } catch (err) {
    console.error('[PLIS Storage Fallback Error]:', err);
  }
}

let dbInstance = null;

/**
 * Membuka koneksi IndexedDB dengan pembuatan tabel (object store) otomatis
 */
export function openDB() {
  if (dbInstance) {
    return Promise.resolve(dbInstance);
  }

  return new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') {
      return resolve(null);
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      resolve(null);
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      dbInstance.onversionchange = () => {
        dbInstance?.close();
        dbInstance = null;
      };
      resolve(dbInstance);
    };

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains('customers')) {
        const store = db.createObjectStore('customers', { keyPath: 'id' });
        store.createIndex('phone', 'phone', { unique: false });
        store.createIndex('name', 'name', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }

      if (!db.objectStoreNames.contains('services')) {
        const store = db.createObjectStore('services', { keyPath: 'id' });
        store.createIndex('categoryId', 'categoryId', { unique: false });
        store.createIndex('classificationId', 'classificationId', { unique: false });
        store.createIndex('isActive', 'isActive', { unique: false });
        store.createIndex('name', 'name', { unique: false });
      }

      if (!db.objectStoreNames.contains('transactions')) {
        const store = db.createObjectStore('transactions', { keyPath: 'id' });
        store.createIndex('customerId', 'customerId', { unique: false });
        store.createIndex('customerPhone', 'customerPhone', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
        store.createIndex('laundryStatus', 'laundryStatus', { unique: false });
        store.createIndex('paymentStatus', 'paymentStatus', { unique: false });
      }

      if (!db.objectStoreNames.contains('categories')) {
        db.createObjectStore('categories', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('classifications')) {
        const store = db.createObjectStore('classifications', { keyPath: 'id' });
        store.createIndex('categoryId', 'categoryId', { unique: false });
      }
      if (!db.objectStoreNames.contains('units')) {
        db.createObjectStore('units', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('payments')) {
        const store = db.createObjectStore('payments', { keyPath: 'id' });
        store.createIndex('transactionId', 'transactionId', { unique: false });
        store.createIndex('paymentDate', 'paymentDate', { unique: false });
      }
      if (!db.objectStoreNames.contains('expenses')) {
        const store = db.createObjectStore('expenses', { keyPath: 'id' });
        store.createIndex('date', 'date', { unique: false });
        store.createIndex('category', 'category', { unique: false });
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains('users')) {
        db.createObjectStore('users', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('cashSessions')) {
        const store = db.createObjectStore('cashSessions', { keyPath: 'id' });
        store.createIndex('date', 'date', { unique: false });
      }
      if (!db.objectStoreNames.contains('auditLogs')) {
        const store = db.createObjectStore('auditLogs', { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}

/**
 * 1. Menyimpan data (Create / Insert / Upsert)
 * @param {string} entityName Nama entitas ('pelanggan', 'layanan', 'transaksi', dll)
 * @param {object} data Objek data yang akan disimpan
 * @returns {Promise<object>} Data yang tersimpan dengan ID
 */
export async function simpan(entityName, data) {
  const storeName = resolveStore(entityName);
  const db = await openDB();

  const key = data.id || `ID-${Date.now()}`;
  const itemWithKey = { ...data, id: key };

  const list = getFallback(storeName, []);
  const idx = list.findIndex((i) => i.id === key);
  if (idx >= 0) {
    list[idx] = itemWithKey;
  } else {
    list.push(itemWithKey);
  }
  setFallback(storeName, list);

  if (db) {
    await new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.put(itemWithKey);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  notifyChange(storeName, 'SAVE', itemWithKey);
  return itemWithKey;
}

/**
 * 2. Mengambil data berdasarkan ID (Get by ID)
 * @param {string} entityName Nama entitas ('pelanggan', 'layanan', 'transaksi', dll)
 * @param {string} id ID data
 * @returns {Promise<object|null>}
 */
export async function ambil(entityName, id) {
  const storeName = resolveStore(entityName);
  const db = await openDB();

  if (db) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  const list = getFallback(storeName, []);
  return list.find((item) => item.id === id) || null;
}

/**
 * 3. Mengambil semua data dari entitas (Get All)
 * @param {string} entityName Nama entitas ('pelanggan', 'layanan', 'transaksi', dll)
 * @returns {Promise<Array>}
 */
export async function ambilSemua(entityName) {
  const storeName = resolveStore(entityName);
  const db = await openDB();

  if (db) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  return getFallback(storeName, []);
}

/**
 * 4. Memperbarui data yang ada (Update)
 * @param {string} entityName Nama entitas
 * @param {string} id ID yang sudah terbit
 * @param {object} updateData Data pembaruan
 * @returns {Promise<object>}
 */
export async function perbarui(entityName, id, updateData) {
  const existing = await ambil(entityName, id);
  if (!existing) {
    throw new Error(`Data "${entityName}" dengan ID "${id}" tidak ditemukan.`);
  }

  const updatedItem = {
    ...existing,
    ...updateData,
    id, // Mempertahankan no ID yang sudah terbit
    updatedAt: new Date().toISOString(),
  };

  return simpan(entityName, updatedItem);
}

/**
 * 5. Menghapus data (Delete)
 * @param {string} entityName Nama entitas
 * @param {string} id ID data
 * @returns {Promise<boolean>}
 */
export async function hapus(entityName, id) {
  const storeName = resolveStore(entityName);
  const db = await openDB();

  const list = getFallback(storeName, []).filter((item) => item.id !== id);
  setFallback(storeName, list);

  if (db) {
    await new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  notifyChange(storeName, 'DELETE', { id });
  return true;
}

/**
 * 6. Mengosongkan entitas (Clear)
 * @param {string} entityName
 * @returns {Promise<boolean>}
 */
export async function kosongkan(entityName) {
  const storeName = resolveStore(entityName);
  const db = await openDB();

  setFallback(storeName, []);

  if (db) {
    await new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  notifyChange(storeName, 'CLEAR', {});
  return true;
}

/**
 * API Khusus Entitas Utama: Pelanggan
 */
export const PelangganDB = {
  simpan: (data) => {
    const id = data.id || `CUST-${Date.now().toString().slice(-6)}`;
    const now = new Date().toISOString();
    return simpan('pelanggan', {
      id,
      name: data.name,
      phone: data.phone,
      address: data.address || '',
      notes: data.notes || '',
      createdAt: data.createdAt || now,
      updatedAt: now,
    });
  },
  ambil: (id) => ambil('pelanggan', id),
  ambilSemua: () => ambilSemua('pelanggan'),
  perbarui: (id, data) => perbarui('pelanggan', id, data),
  hapus: (id) => hapus('pelanggan', id),
  cariBerdasarkanTelepon: async (phone) => {
    const all = await ambilSemua('pelanggan');
    const cleanPhone = String(phone).replace(/\D/g, '');
    return all.find((c) => c.phone && c.phone.replace(/\D/g, '') === cleanPhone) || null;
  },
};

/**
 * API Khusus Entitas Utama: Layanan (Service Master)
 */
export const LayananDB = {
  simpan: (data) => {
    const id = data.id || `SRV-${Date.now().toString().slice(-5)}`;
    return simpan('layanan', {
      ...data,
      id,
      isActive: data.isActive !== undefined ? data.isActive : true,
    });
  },
  ambil: (id) => ambil('layanan', id),
  ambilSemua: async (hanyaAktif = false) => {
    const all = await ambilSemua('layanan');
    return hanyaAktif ? all.filter((s) => s.isActive) : all;
  },
  perbarui: (id, data) => perbarui('layanan', id, data),
  hapus: (id) => hapus('layanan', id),
};

/**
 * API Khusus Entitas Utama: Satuan (Unit Master)
 */
export const SatuanDB = {
  simpan: (data) => {
    const cleanName = String(data.name || '').trim().toLowerCase();
    const id = data.id || `UNIT-${cleanName.replace(/\s+/g, '-').toUpperCase()}`;
    return simpan('satuan', {
      id,
      name: cleanName,
      description: data.description || '',
    });
  },
  ambil: (id) => ambil('satuan', id),
  ambilSemua: () => ambilSemua('satuan'),
  perbarui: async (id, data) => {
    const cleanName = data.name !== undefined ? String(data.name).trim().toLowerCase() : undefined;
    const res = await perbarui('satuan', id, {
      ...(cleanName !== undefined ? { name: cleanName } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
    });

    // Sinkronisasi otomatis ke semua layanan yang menggunakan satuan ini jika nama satuan berubah
    if (cleanName) {
      const services = await ambilSemua('layanan');
      const inUse = services.filter((s) => s.unitId === id);
      for (const s of inUse) {
        await perbarui('layanan', s.id, { unitName: cleanName });
      }
    }
    return res;
  },
  hapus: (id) => hapus('satuan', id),
};

/**
 * API Khusus Entitas Utama: Transaksi
 */
export const TransaksiDB = {
  simpan: (data) => {
    const now = new Date().toISOString();
    return simpan('transaksi', {
      ...data,
      createdAt: data.createdAt || now,
      laundryStatus: data.laundryStatus || 'DITERIMA',
      paymentStatus: data.paymentStatus || 'BELUM_DIBAYAR',
    });
  },
  ambil: (id) => ambil('transaksi', id),
  ambilSemua: async (filter) => {
    let list = await ambilSemua('transaksi');
    if (filter?.status) {
      list = list.filter((t) => t.laundryStatus === filter.status);
    }
    if (filter?.paymentStatus) {
      list = list.filter((t) => t.paymentStatus === filter.paymentStatus);
    }
    if (filter?.customerId) {
      list = list.filter((t) => t.customerId === filter.customerId);
    }
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },
  perbarui: (id, data) => perbarui('transaksi', id, data),
  hapus: (id) => hapus('transaksi', id),
  ambilTransaksiPelanggan: async (customerId) => {
    const all = await ambilSemua('transaksi');
    return all.filter((t) => t.customerId === customerId);
  },
};

const Database = {
  open: openDB,
  simpan,
  ambil,
  ambilSemua,
  perbarui,
  hapus,
  kosongkan,
  pelanggan: PelangganDB,
  layanan: LayananDB,
  satuan: SatuanDB,
  transaksi: TransaksiDB,
  onChange: onDatabaseChange,
};

export default Database;

