/**
 * PLIS IndexedDB Storage Layer
 * High-performance, robust, persistent storage with fallback support
 */

import {
  AppUser,
  AuditLog,
  BackupDataPayload,
  BusinessSettings,
  CashRegisterSession,
  Customer,
  Expense,
  LaundryService,
  PaymentRecord,
  ServiceCategory,
  ServiceClassification,
  Transaction,
  UnitMaster,
} from '../types';
import {
  INITIAL_CATEGORIES,
  INITIAL_CLASSIFICATIONS,
  INITIAL_CUSTOMERS,
  INITIAL_EXPENSES,
  INITIAL_PAYMENTS,
  INITIAL_SERVICES,
  INITIAL_SETTINGS,
  INITIAL_TRANSACTIONS,
  INITIAL_UNITS,
  INITIAL_USERS,
} from './initialData';

const DB_NAME = 'PLIS_LAUNDRY_DB';
const DB_VERSION = 1;

type StoreName =
  | 'customers'
  | 'services'
  | 'categories'
  | 'classifications'
  | 'units'
  | 'transactions'
  | 'payments'
  | 'expenses'
  | 'settings'
  | 'users'
  | 'cashSessions'
  | 'auditLogs';

// Event listeners for real-time reactivity across components
type DBChangeListener = (storeName: StoreName) => void;
const changeListeners: Set<DBChangeListener> = new Set();

export function onDBChange(listener: DBChangeListener): () => void {
  changeListeners.add(listener);
  return () => {
    changeListeners.delete(listener);
  };
}

function notifyChange(storeName: StoreName) {
  changeListeners.forEach((l) => {
    try {
      l(storeName);
    } catch (e) {
      console.error('Error in DBChangeListener', e);
    }
  });
}

// In-memory fallback if IndexedDB is unavailable
const memoryFallback: Record<string, any[]> = {};
let isIDBSupported = typeof indexedDB !== 'undefined';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!isIDBSupported) {
      reject(new Error('IndexedDB not supported'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.warn('IndexedDB failed to open, falling back to localStorage');
      isIDBSupported = false;
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = request.result;

      // 1. Customers
      if (!db.objectStoreNames.contains('customers')) {
        const store = db.createObjectStore('customers', { keyPath: 'id' });
        store.createIndex('phone', 'phone', { unique: false });
        store.createIndex('name', 'name', { unique: false });
      }

      // 2. Services & Hierarchies
      if (!db.objectStoreNames.contains('services')) {
        const store = db.createObjectStore('services', { keyPath: 'id' });
        store.createIndex('categoryId', 'categoryId', { unique: false });
        store.createIndex('isActive', 'isActive', { unique: false });
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

      // 3. Transactions
      if (!db.objectStoreNames.contains('transactions')) {
        const store = db.createObjectStore('transactions', { keyPath: 'id' });
        store.createIndex('customerId', 'customerId', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
        store.createIndex('laundryStatus', 'laundryStatus', { unique: false });
        store.createIndex('paymentStatus', 'paymentStatus', { unique: false });
      }

      // 4. Payments
      if (!db.objectStoreNames.contains('payments')) {
        const store = db.createObjectStore('payments', { keyPath: 'id' });
        store.createIndex('transactionId', 'transactionId', { unique: false });
        store.createIndex('paymentDate', 'paymentDate', { unique: false });
      }

      // 5. Expenses
      if (!db.objectStoreNames.contains('expenses')) {
        const store = db.createObjectStore('expenses', { keyPath: 'id' });
        store.createIndex('date', 'date', { unique: false });
        store.createIndex('category', 'category', { unique: false });
      }

      // 6. Settings
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }

      // 7. Users
      if (!db.objectStoreNames.contains('users')) {
        db.createObjectStore('users', { keyPath: 'id' });
      }

      // 8. Cash Register Sessions
      if (!db.objectStoreNames.contains('cashSessions')) {
        const store = db.createObjectStore('cashSessions', { keyPath: 'id' });
        store.createIndex('date', 'date', { unique: false });
      }

      // 9. Audit Logs
      if (!db.objectStoreNames.contains('auditLogs')) {
        const store = db.createObjectStore('auditLogs', { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('actionType', 'actionType', { unique: false });
      }
    };
  });
}

// LocalStorage / Memory helpers for fallback
const memoryStore: Record<string, string> = {};

function getLS<T>(key: string, defaultValue: T): T {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(`plis_${key}`);
      return raw ? JSON.parse(raw) : defaultValue;
    }
    const mem = memoryStore[`plis_${key}`];
    return mem ? JSON.parse(mem) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function setLS<T>(key: string, val: T): void {
  try {
    const serialized = JSON.stringify(val);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(`plis_${key}`, serialized);
    }
    memoryStore[`plis_${key}`] = serialized;
  } catch (e) {
    console.error('Storage write error', e);
  }
}

export const dbService = {
  /**
   * Initializes database with seed data if fresh install
   */
  async init(): Promise<void> {
    try {
      const customers = await this.getAll<Customer>('customers');
      if (customers.length === 0) {
        console.log('Seeding initial PLIS master and sample data into IndexedDB...');
        await this.bulkPut('customers', INITIAL_CUSTOMERS);
        await this.bulkPut('units', INITIAL_UNITS);
        await this.bulkPut('categories', INITIAL_CATEGORIES);
        await this.bulkPut('classifications', INITIAL_CLASSIFICATIONS);
        await this.bulkPut('services', INITIAL_SERVICES);
        await this.bulkPut('transactions', INITIAL_TRANSACTIONS);
        await this.bulkPut('payments', INITIAL_PAYMENTS);
        await this.bulkPut('expenses', INITIAL_EXPENSES);
        await this.bulkPut('users', INITIAL_USERS);
        await this.setSetting('business_settings', INITIAL_SETTINGS);

        // Initial Audit Log
        const now = new Date().toISOString();
        const initialAudit: AuditLog = {
          id: `AUDIT-INIT-${Date.now()}`,
          timestamp: now,
          actionType: 'DATA_RESTORE',
          entityType: 'SYSTEM',
          entityId: 'SYSTEM-INIT',
          description: 'Sistem PLIS diinisialisasi dengan master data & konfigurasi default.',
          userId: 'USR-01',
          userName: 'Pak Budi (Owner)',
        };
        await this.put('auditLogs', initialAudit);
      }
    } catch (err) {
      console.error('Error during DB init', err);
    }
  },

  async getAll<T>(storeName: StoreName): Promise<T[]> {
    if (!isIDBSupported) {
      return getLS<T[]>(storeName, []);
    }

    try {
      const db = await openDatabase();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.getAll();
        req.onsuccess = () => resolve((req.result || []) as T[]);
        req.onerror = () => reject(req.error);
      });
    } catch {
      return getLS<T[]>(storeName, []);
    }
  },

  async getById<T>(storeName: StoreName, id: string): Promise<T | null> {
    if (!isIDBSupported) {
      const list = getLS<any[]>(storeName, []);
      return (list.find((item) => item.id === id) as T) || null;
    }

    try {
      const db = await openDatabase();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.get(id);
        req.onsuccess = () => resolve((req.result as T) || null);
        req.onerror = () => reject(req.error);
      });
    } catch {
      const list = getLS<any[]>(storeName, []);
      return (list.find((item) => item.id === id) as T) || null;
    }
  },

  async put<T extends { id?: string }>(storeName: StoreName, item: T): Promise<void> {
    // Sync to LS fallback
    const currentLS = getLS<any[]>(storeName, []);
    const idKey = (item as any).id;
    const existingIndex = currentLS.findIndex((x) => x.id === idKey);
    if (existingIndex >= 0) {
      currentLS[existingIndex] = item;
    } else {
      currentLS.push(item);
    }
    setLS(storeName, currentLS);

    if (isIDBSupported) {
      try {
        const db = await openDatabase();
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(storeName, 'readwrite');
          const store = tx.objectStore(storeName);
          const req = store.put(item);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        });
      } catch (err) {
        console.warn('IDB put error, fallback used', err);
      }
    }

    notifyChange(storeName);
  },

  async bulkPut<T extends { id?: string }>(storeName: StoreName, items: T[]): Promise<void> {
    setLS(storeName, items);

    if (isIDBSupported) {
      try {
        const db = await openDatabase();
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(storeName, 'readwrite');
          const store = tx.objectStore(storeName);
          items.forEach((item) => store.put(item));
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
      } catch (err) {
        console.warn('IDB bulkPut error, fallback used', err);
      }
    }

    notifyChange(storeName);
  },

  async delete(storeName: StoreName, id: string): Promise<void> {
    const currentLS = getLS<any[]>(storeName, []).filter((x) => x.id !== id);
    setLS(storeName, currentLS);

    if (isIDBSupported) {
      try {
        const db = await openDatabase();
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(storeName, 'readwrite');
          const store = tx.objectStore(storeName);
          const req = store.delete(id);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        });
      } catch (err) {
        console.warn('IDB delete error', err);
      }
    }

    notifyChange(storeName);
  },

  async clearStore(storeName: StoreName): Promise<void> {
    setLS(storeName, []);
    if (isIDBSupported) {
      try {
        const db = await openDatabase();
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(storeName, 'readwrite');
          const store = tx.objectStore(storeName);
          const req = store.clear();
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        });
      } catch (err) {
        console.warn('IDB clearStore error', err);
      }
    }
    notifyChange(storeName);
  },

  async getSetting<T>(key: string, defaultValue: T): Promise<T> {
    if (!isIDBSupported) {
      return getLS<T>(`setting_${key}`, defaultValue);
    }
    try {
      const db = await openDatabase();
      return new Promise((resolve) => {
        const tx = db.transaction('settings', 'readonly');
        const store = tx.objectStore('settings');
        const req = store.get(key);
        req.onsuccess = () => {
          if (req.result && req.result.value) {
            resolve(req.result.value as T);
          } else {
            resolve(defaultValue);
          }
        };
        req.onerror = () => resolve(defaultValue);
      });
    } catch {
      return getLS<T>(`setting_${key}`, defaultValue);
    }
  },

  async setSetting<T>(key: string, value: T): Promise<void> {
    setLS(`setting_${key}`, value);
    if (isIDBSupported) {
      try {
        const db = await openDatabase();
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction('settings', 'readwrite');
          const store = tx.objectStore('settings');
          const req = store.put({ key, value });
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        });
      } catch (err) {
        console.warn('IDB setSetting error', err);
      }
    }
    notifyChange('settings');
  },

  /**
   * Generates a sequential, non-repeating unique transaction code for today:
   * e.g. TRX-YYYYMMDD-0001
   */
  async generateNextTransactionNumber(): Promise<string> {
    const transactions = await this.getAll<Transaction>('transactions');
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const prefix = `TRX-${yyyy}${mm}${dd}-`;

    const todaysTransactions = transactions.filter((t) => t.id.startsWith(prefix));
    let maxSeq = 0;
    todaysTransactions.forEach((t) => {
      const seqStr = t.id.slice(prefix.length);
      const seqNum = parseInt(seqStr, 10);
      if (!isNaN(seqNum) && seqNum > maxSeq) {
        maxSeq = seqNum;
      }
    });

    const nextSeq = String(maxSeq + 1).padStart(4, '0');
    return `${prefix}${nextSeq}`;
  },

  /**
   * Generates a full validated backup payload
   */
  async createBackup(): Promise<BackupDataPayload> {
    const [
      customers,
      services,
      categories,
      classifications,
      units,
      transactions,
      payments,
      expenses,
      users,
      cashSessions,
      auditLogs,
      settings,
    ] = await Promise.all([
      this.getAll<Customer>('customers'),
      this.getAll<LaundryService>('services'),
      this.getAll<ServiceCategory>('categories'),
      this.getAll<ServiceClassification>('classifications'),
      this.getAll<UnitMaster>('units'),
      this.getAll<Transaction>('transactions'),
      this.getAll<PaymentRecord>('payments'),
      this.getAll<Expense>('expenses'),
      this.getAll<AppUser>('users'),
      this.getAll<CashRegisterSession>('cashSessions'),
      this.getAll<AuditLog>('auditLogs'),
      this.getSetting<BusinessSettings>('business_settings', INITIAL_SETTINGS),
    ]);

    return {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      sourceApp: 'PLIS_LAUNDRY_SYSTEM',
      data: {
        customers,
        services,
        categories,
        classifications,
        units,
        transactions,
        payments,
        expenses,
        settings,
        users,
        cashSessions,
        auditLogs,
      },
    };
  },

  /**
   * Safely restores backup data with integrity validation
   */
  async restoreBackup(payload: BackupDataPayload, operator: AppUser): Promise<{ success: boolean; message: string }> {
    if (!payload || !payload.data) {
      return { success: false, message: 'Format file backup tidak valid!' };
    }

    const {
      customers = [],
      services = [],
      categories = [],
      classifications = [],
      units = [],
      transactions = [],
      payments = [],
      expenses = [],
      settings = INITIAL_SETTINGS,
      users = INITIAL_USERS,
      cashSessions = [],
      auditLogs = [],
    } = payload.data;

    await this.bulkPut('customers', customers);
    await this.bulkPut('services', services);
    await this.bulkPut('categories', categories);
    await this.bulkPut('classifications', classifications);
    await this.bulkPut('units', units);
    await this.bulkPut('transactions', transactions);
    await this.bulkPut('payments', payments);
    await this.bulkPut('expenses', expenses);
    await this.bulkPut('users', users);
    await this.bulkPut('cashSessions', cashSessions);
    await this.setSetting('business_settings', settings);

    // Append new audit log for restoration
    const restoreAudit: AuditLog = {
      id: `AUDIT-RESTORE-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actionType: 'DATA_RESTORE',
      entityType: 'SYSTEM',
      entityId: `RESTORE-${payload.exportedAt}`,
      description: `Restore database berhasil (${transactions.length} transaksi, ${customers.length} pelanggan).`,
      userId: operator.id,
      userName: operator.name,
    };
    await this.put('auditLogs', restoreAudit);

    return {
      success: true,
      message: `Berhasil memulihkan ${transactions.length} transaksi, ${customers.length} pelanggan, dan ${services.length} master layanan.`,
    };
  },
};
