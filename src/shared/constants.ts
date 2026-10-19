import { ExpenseCategory, LaundryStatus, PaymentMethod } from '../types';

export const PERFUME_OPTIONS = [
  'Ocean Fresh (Segar & Elegan)',
  'Akasia (Mewah & Tahan Lama)',
  'Lavender (Menenangkan)',
  'Downy Mystic (Sweet Florals)',
  'Sakura (Lembut & Manis)',
  'Snappy (Segar Sporty)',
  'Bebas Parfum (Hypoallergenic)',
];

export const EXPENSE_CATEGORIES: { id: ExpenseCategory; label: string; icon: string }[] = [
  { id: 'OPERASIONAL', label: 'Operasional Harian', icon: 'wrench' },
  { id: 'LISTRIK_AIR', label: 'Listrik & Air (PLN/PDAM)', icon: 'zap' },
  { id: 'DETERGEN_PARFUM', label: 'Deterjen, Parfum & Kimia', icon: 'droplet' },
  { id: 'GAJI', label: 'Gaji & Upah Karyawan', icon: 'users' },
  { id: 'SEWA', label: 'Sewa Tempat / Ruko', icon: 'home' },
  { id: 'PERALATAN_MAINTENANCE', label: 'Perawatan Mesin & Alat', icon: 'settings' },
  { id: 'LAINNYA', label: 'Pengeluaran Lain-lain', icon: 'more-horizontal' },
];

export const PAYMENT_METHODS: { id: PaymentMethod; label: string }[] = [
  { id: 'TUNAI', label: 'Tunai (Cash)' },
  { id: 'QRIS', label: 'QRIS (Semua E-Wallet/Bank)' },
  { id: 'TRANSFER_BANK', label: 'Transfer Bank (BCA/Mandiri/BRI)' },
  { id: 'E_WALLET', label: 'E-Wallet (GoPay/OVO/Dana)' },
];

export const LAUNDRY_STATUS_FLOW: LaundryStatus[] = ['DITERIMA', 'DIPROSES', 'SIAP_DIAMBIL', 'SELESAI'];
