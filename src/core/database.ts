/**
 * PLIS (Penggilas Laundry Information System)
 * Core Database Module - TypeScript Edition
 */

import { Customer, LaundryService, Transaction } from '../types';

export const DB_NAME = 'PLIS_LAUNDRY_DB';
export const DB_VERSION = 1;

export type EntityName =
  | 'pelanggan'
  | 'layanan'
  | 'transaksi'
  | 'customers'
  | 'services'
  | 'transactions'
  | 'kategori'
  | 'klasifikasi'
  | 'satuan'
  | 'pembayaran'
  | 'pengeluaran'
  | 'pengaturan'
  | 'pengguna'
  | 'rekap_kas'
  | 'audit';

const STORE_ALIASES: Record<string, string> = {
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

export type DatabaseChangeListener = (event: {
  storeName: string;
  action: 'SAVE' | 'DELETE' | 'CLEAR';
  data: any;
}) => void;

const listeners = new Set<DatabaseChangeListener>();

export function onDatabaseChange(callback: DatabaseChangeListener): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function notifyChange(storeName: string, action: 'SAVE' | 'DELETE' | 'CLEAR', data: any) {
  listeners.forEach((fn) => {
    try {
      fn({ storeName, action, data });
    } catch (e) {
      console.error('[PLIS DB Event Error]:', e);
    }
  });
}

function resolveStore(entityName: string): string {
  const normalized = entityName.toLowerCase();
  return STORE_ALIASES[normalized] || normalized;
}

const memoryStore: Record<string, string> = {};

function getFallback<T>(key: string, defaultVal: T): T {
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

function setFallback<T>(key: string, val: T): void {
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

let dbInstance: IDBDatabase | null = null;

export function openDB(): Promise<IDBDatabase | null> {
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

// 1. Menyimpan (Create / Insert)
export async function simpan<T extends { id?: string }>(
  entityName: EntityName,
  data: T
): Promise<T & { id: string }> {
  const storeName = resolveStore(entityName);
  const db = await openDB();

  const key = data.id || `ID-${Date.now()}`;
  const itemWithKey = { ...data, id: key } as T & { id: string };

  const list = getFallback<any[]>(storeName, []);
  const idx = list.findIndex((i) => i.id === key);
  if (idx >= 0) {
    list[idx] = itemWithKey;
  } else {
    list.push(itemWithKey);
  }
  setFallback(storeName, list);

  if (db) {
    await new Promise<void>((resolve, reject) => {
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

// 2. Mengambil berdasarkan ID
export async function ambil<T>(entityName: EntityName, id: string): Promise<T | null> {
  const storeName = resolveStore(entityName);
  const db = await openDB();

  if (db) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.get(id);
      req.onsuccess = () => resolve((req.result as T) || null);
      req.onerror = () => reject(req.error);
    });
  }

  const list = getFallback<any[]>(storeName, []);
  return (list.find((item) => item.id === id) as T) || null;
}

// 3. Mengambil semua data
export async function ambilSemua<T>(entityName: EntityName): Promise<T[]> {
  const storeName = resolveStore(entityName);
  const db = await openDB();

  if (db) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.getAll();
      req.onsuccess = () => resolve((req.result as T[]) || []);
      req.onerror = () => reject(req.error);
    });
  }

  return getFallback<T[]>(storeName, []);
}

// 4. Memperbarui data
export async function perbarui<T>(
  entityName: EntityName,
  id: string,
  updateData: Partial<T>
): Promise<T> {
  const existing = await ambil<any>(entityName, id);
  if (!existing) {
    throw new Error(`Data "${entityName}" dengan ID "${id}" tidak ditemukan.`);
  }

  const updatedItem = {
    ...existing,
    ...updateData,
    id,
    updatedAt: new Date().toISOString(),
  };

  return simpan(entityName, updatedItem);
}

// 5. Menghapus data
export async function hapus(entityName: EntityName, id: string): Promise<boolean> {
  const storeName = resolveStore(entityName);
  const db = await openDB();

  const list = getFallback<any[]>(storeName, []).filter((item) => item.id !== id);
  setFallback(storeName, list);

  if (db) {
    await new Promise<void>((resolve, reject) => {
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

// 6. Mengosongkan store
export async function kosongkan(entityName: EntityName): Promise<boolean> {
  const storeName = resolveStore(entityName);
  const db = await openDB();

  setFallback(storeName, []);

  if (db) {
    await new Promise<void>((resolve, reject) => {
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

// API Khusus Entitas Utama
export const PelangganDB = {
  simpan: (data: Partial<Customer> & { name: string; phone: string }) => {
    const id = data.id || `CUST-${Date.now().toString().slice(-6)}`;
    const now = new Date().toISOString();
    return simpan<Customer>('pelanggan', {
      id,
      name: data.name,
      phone: data.phone,
      address: data.address || '',
      notes: data.notes || '',
      createdAt: data.createdAt || now,
      updatedAt: now,
    });
  },
  ambil: (id: string) => ambil<Customer>('pelanggan', id),
  ambilSemua: () => ambilSemua<Customer>('pelanggan'),
  perbarui: (id: string, data: Partial<Customer>) => perbarui<Customer>('pelanggan', id, data),
  hapus: (id: string) => hapus('pelanggan', id),
  cariBerdasarkanTelepon: async (phone: string): Promise<Customer | null> => {
    const all = await ambilSemua<Customer>('pelanggan');
    const cleanPhone = phone.replace(/\D/g, '');
    return all.find((c) => c.phone && c.phone.replace(/\D/g, '') === cleanPhone) || null;
  },
};

export const LayananDB = {
  simpan: (data: Partial<LaundryService> & { name: string; pricePerUnit: number }) => {
    const id = data.id || `SRV-${Date.now().toString().slice(-5)}`;
    return simpan<LaundryService>('layanan', {
      categoryName: data.categoryName || '',
      classificationName: data.classificationName || '',
      unitId: data.unitId || 'unit-kg',
      unitName: data.unitName || 'kg',
      categoryId: data.categoryId || '',
      classificationId: data.classificationId || '',
      estimatedDurationHours: data.estimatedDurationHours || 24,
      ...data,
      id,
      isActive: data.isActive !== undefined ? data.isActive : true,
    } as LaundryService);
  },
  ambil: (id: string) => ambil<LaundryService>('layanan', id),
  ambilSemua: async (hanyaAktif = false): Promise<LaundryService[]> => {
    const all = await ambilSemua<LaundryService>('layanan');
    return hanyaAktif ? all.filter((s) => s.isActive) : all;
  },
  perbarui: (id: string, data: Partial<LaundryService>) => perbarui<LaundryService>('layanan', id, data),
  hapus: (id: string) => hapus('layanan', id),
};

export const TransaksiDB = {
  simpan: (
    data: Partial<Transaction> & { id: string; customerId: string; customerName: string; finalAmount: number }
  ) => {
    const now = new Date().toISOString();
    return simpan<Transaction>('transaksi', {
      orderNumber: data.orderNumber || data.id,
      items: data.items || [],
      totalAmount: data.totalAmount || data.finalAmount,
      discount: data.discount || 0,
      paidAmount: data.paidAmount || 0,
      remainingAmount: data.remainingAmount || 0,
      customerPhone: data.customerPhone || '',
      statusHistory: data.statusHistory || [],
      estimatedCompletionAt: data.estimatedCompletionAt || now,
      createdByUserId: data.createdByUserId || 'usr-1',
      createdByUserName: data.createdByUserName || 'Kasir',
      ...data,
      createdAt: data.createdAt || now,
      laundryStatus: data.laundryStatus || 'DITERIMA',
      paymentStatus: data.paymentStatus || 'BELUM_DIBAYAR',
    } as Transaction);
  },
  ambil: (id: string) => ambil<Transaction>('transaksi', id),
  ambilSemua: async (filter?: { status?: string; paymentStatus?: string; customerId?: string }): Promise<Transaction[]> => {
    let list = await ambilSemua<Transaction>('transaksi');
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
  perbarui: (id: string, data: Partial<Transaction>) => perbarui<Transaction>('transaksi', id, data),
  hapus: (id: string) => hapus('transaksi', id),
  ambilTransaksiPelanggan: async (customerId: string): Promise<Transaction[]> => {
    const all = await ambilSemua<Transaction>('transaksi');
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
  transaksi: TransaksiDB,
  onChange: onDatabaseChange,
};

export default Database;
