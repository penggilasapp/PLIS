/**
 * PLIS (Penggilas Laundry Information System) Data Types
 */

export type UserRole = 'OWNER' | 'KARYAWAN';

export interface AppUser {
  id: string;
  name: string;
  role: UserRole;
  pin: string; // 4-digit PIN for quick role switching/auth
  avatarColor: string;
  phone?: string;
  createdAt: string;
}

export interface UnitMaster {
  id: string;
  name: string; // e.g. "kg", "pcs", "m2", "pasang", "set"
  description: string;
}

export interface ServiceCategory {
  id: string;
  name: string; // e.g. "CUCI SETRIKA", "SETRIKA SAJA", "CUCI KERING LIPAT", "SEPATU & TAS", "BED COVER & LINEN"
  icon?: string;
}

export interface ServiceClassification {
  id: string;
  categoryId: string;
  name: string; // e.g. "REGULAR", "EXPRESS", "SUPER EXPRESS"
}

export interface LaundryService {
  id: string;
  categoryId: string;
  categoryName: string;
  classificationId: string;
  classificationName: string;
  name: string; // e.g. "1 Hari", "4 Jam", "3 Hari", "Sprei King"
  unitId: string;
  unitName: string; // e.g. "kg", "pcs", "m2"
  pricePerUnit: number;
  estimatedDurationHours: number; // e.g. 24, 4, 72
  isActive: boolean;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type LaundryStatus = 'DITERIMA' | 'DIPROSES' | 'SIAP_DIAMBIL' | 'SELESAI';

export type PaymentStatus = 'BELUM_DIBAYAR' | 'SEBAGIAN' | 'LUNAS';

export type PaymentMethod = 'TUNAI' | 'TRANSFER_BANK' | 'QRIS' | 'E_WALLET';

export interface TransactionItem {
  id: string;
  serviceId: string;
  serviceName: string;
  categoryName: string;
  classificationName: string;
  unitName: string;
  pricePerUnit: number; // Snapshot at transaction time
  quantity: number;
  subtotal: number;
  notes?: string;
}

export interface PaymentRecord {
  id: string;
  transactionId: string;
  amount: number;
  method: PaymentMethod;
  paymentDate: string;
  referenceNumber?: string;
  notes?: string;
  recordedByUserId: string;
  recordedByUserName: string;
  createdAt: string;
}

export interface StatusHistoryEntry {
  status: LaundryStatus;
  timestamp: string;
  updatedByUserId: string;
  updatedByUserName: string;
  note?: string;
}

export interface Transaction {
  id: string; // Permanent unique ID: e.g. TRX-20261017-0001
  orderNumber: string; // Same as id
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  
  items: TransactionItem[];
  
  totalAmount: number; // Total calculated subtotal of all items
  discount: number;
  finalAmount: number; // totalAmount - discount
  paidAmount: number;  // Sum of valid payments
  remainingAmount: number; // finalAmount - paidAmount
  
  paymentStatus: PaymentStatus;
  laundryStatus: LaundryStatus;
  statusHistory: StatusHistoryEntry[];
  
  createdAt: string;
  estimatedCompletionAt: string;
  completedAt?: string;
  
  perfumePreference?: string; // e.g. "Akasia", "Ocean Fresh", "Lavender", "Bebas Alergi"
  specialNotes?: string;
  isUrgent?: boolean;
  
  createdByUserId: string;
  createdByUserName: string;
}

export type ExpenseCategory =
  | 'OPERASIONAL'
  | 'LISTRIK_AIR'
  | 'DETERGEN_PARFUM'
  | 'GAJI'
  | 'SEWA'
  | 'PERALATAN_MAINTENANCE'
  | 'LAINNYA';

export interface Expense {
  id: string;
  date: string;
  category: ExpenseCategory;
  categoryLabel: string;
  description: string;
  amount: number;
  paymentMethod: PaymentMethod;
  notes?: string;
  recordedByUserId: string;
  recordedByUserName: string;
  createdAt: string;
}

export interface BusinessSettings {
  storeName: string;
  tagline: string;
  phone: string;
  address: string;
  logoUrl?: string;
  termsAndConditions: string;
  printerPaperWidth: '58mm' | '80mm';
  receiptFooterMessage: string;
  autoPrintReceiptOnSave: boolean;
  whatsappMessageTemplate: string;
}

export type AuditActionType =
  | 'TRANSACTION_CREATE'
  | 'TRANSACTION_UPDATE'
  | 'STATUS_CHANGE'
  | 'PAYMENT_RECEIVED'
  | 'EXPENSE_CREATE'
  | 'EXPENSE_DELETE'
  | 'MASTER_SERVICE_UPDATE'
  | 'CUSTOMER_CREATE'
  | 'CUSTOMER_UPDATE'
  | 'CASH_RECAP_CLOSE'
  | 'DATA_BACKUP'
  | 'DATA_RESTORE'
  | 'SETTINGS_UPDATE';

export interface AuditLog {
  id: string;
  timestamp: string;
  actionType: AuditActionType;
  entityType: 'TRANSACTION' | 'PAYMENT' | 'CUSTOMER' | 'EXPENSE' | 'MASTER' | 'SYSTEM' | 'SETTINGS';
  entityId: string;
  description: string;
  userId: string;
  userName: string;
  details?: Record<string, unknown>;
}

export interface CashRegisterSession {
  id: string;
  date: string;
  openedAt: string;
  closedAt?: string;
  startingCash: number;
  totalCashReceived: number;
  totalCashExpense: number;
  expectedEndingCash: number;
  actualEndingCash?: number;
  cashDifference?: number; // actualEndingCash - expectedEndingCash
  isClosed: boolean;
  notes?: string;
  openedByUserId: string;
  closedByUserId?: string;
}

export interface BackupDataPayload {
  version: string;
  exportedAt: string;
  sourceApp: string;
  data: {
    customers: Customer[];
    services: LaundryService[];
    categories: ServiceCategory[];
    classifications: ServiceClassification[];
    units: UnitMaster[];
    transactions: Transaction[];
    payments: PaymentRecord[];
    expenses: Expense[];
    settings: BusinessSettings;
    users: AppUser[];
    cashSessions: CashRegisterSession[];
    auditLogs: AuditLog[];
  };
}
