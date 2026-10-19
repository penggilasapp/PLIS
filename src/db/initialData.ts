import {
  AppUser,
  BusinessSettings,
  Customer,
  Expense,
  LaundryService,
  PaymentRecord,
  ServiceCategory,
  ServiceClassification,
  Transaction,
  UnitMaster,
} from '../types';

export const INITIAL_USERS: AppUser[] = [
  {
    id: 'USR-01',
    name: 'Pak Budi (Owner)',
    role: 'OWNER',
    pin: '1234',
    avatarColor: 'bg-blue-600',
    phone: '081234567890',
    createdAt: '2026-01-01T08:00:00.000Z',
  },
  {
    id: 'USR-02',
    name: 'Siti Rahma (Kasir)',
    role: 'KARYAWAN',
    pin: '0000',
    avatarColor: 'bg-emerald-600',
    phone: '081298765432',
    createdAt: '2026-01-10T08:00:00.000Z',
  },
];

export const INITIAL_SETTINGS: BusinessSettings = {
  storeName: 'PLIS Laundry Express',
  tagline: 'Bersih, Rapi, Wangi, & Tepat Waktu',
  phone: '081234567890',
  address: 'Jl. Merdeka No. 45, Kebayoran Baru, Jakarta Selatan',
  logoUrl: '',
  termsAndConditions:
    '1. Pengambilan cucian wajib membawa nota ini.\n' +
    '2. Klaim kerusakan/kelunturan maksimal 1x24 jam setelah serah terima.\n' +
    '3. Cucian yang tidak diambil dalam 30 hari di luar tanggung jawab laundry.\n' +
    '4. Barang berharga dalam kantong cucian harus diperiksa sebelum diserahkan.',
  printerPaperWidth: '58mm',
  receiptFooterMessage: 'Terima Kasih atas Kepercayaan Anda!',
  autoPrintReceiptOnSave: false,
  whatsappMessageTemplate:
    'Halo Kak {customer_name}, terima kasih telah mempercayakan pakaian Anda di {store_name}.\n\n' +
    '📋 *Nomor Nota:* {order_number}\n' +
    '🧺 *Status:* {laundry_status}\n' +
    '💰 *Total:* {total_amount}\n' +
    '💳 *Dibayar:* {paid_amount}\n' +
    '⚠️ *Sisa:* {remaining_amount}\n' +
    '⏰ *Estimasi Selesai:* {estimated_date}\n\n' +
    'Cek status pakaian Anda kapan saja melalui kami. Salam hangat dari {store_name}! ✨',
};

export const INITIAL_UNITS: UnitMaster[] = [
  { id: 'UNIT-KG', name: 'kg', description: 'Kilogram (Timbangan pakaian harian)' },
  { id: 'UNIT-PCS', name: 'pcs', description: 'Satuan per potong pakaian' },
  { id: 'UNIT-M2', name: 'm2', description: 'Meter persegi (Karpet, gordyn)' },
  { id: 'UNIT-PSG', name: 'pasang', description: 'Pasang (Sepatu, sandal kulit)' },
  { id: 'UNIT-SET', name: 'set', description: 'Set perlengkapan (Sprei + sarung bantal)' },
];

export const INITIAL_CATEGORIES: ServiceCategory[] = [
  { id: 'CAT-CS', name: 'CUCI SETRIKA' },
  { id: 'CAT-CKL', name: 'CUCI KERING LIPAT' },
  { id: 'CAT-SS', name: 'SETRIKA SAJA' },
  { id: 'CAT-SATUAN', name: 'SATUAN EXCLUSIVE' },
  { id: 'CAT-SEPATU', name: 'SEPATU & TAS' },
  { id: 'CAT-LINEN', name: 'BED COVER & LINEN' },
];

export const INITIAL_CLASSIFICATIONS: ServiceClassification[] = [
  { id: 'CLS-CS-REG', categoryId: 'CAT-CS', name: 'REGULAR (2 Hari)' },
  { id: 'CLS-CS-KILAT', categoryId: 'CAT-CS', name: 'KILAT (1 Hari / 24 Jam)' },
  { id: 'CLS-CS-EXP', categoryId: 'CAT-CS', name: 'EXPRESS (4-6 Jam)' },

  { id: 'CLS-CKL-REG', categoryId: 'CAT-CKL', name: 'REGULAR' },
  { id: 'CLS-CKL-EXP', categoryId: 'CAT-CKL', name: 'EXPRESS' },

  { id: 'CLS-SS-REG', categoryId: 'CAT-SS', name: 'REGULAR' },
  { id: 'CLS-SS-EXP', categoryId: 'CAT-SS', name: 'EXPRESS' },

  { id: 'CLS-SAT-JAS', categoryId: 'CAT-SATUAN', name: 'JAS & GAUN' },
  { id: 'CLS-SAT-HEM', categoryId: 'CAT-SATUAN', name: 'KEMEJA & BATIK' },

  { id: 'CLS-SEP-REG', categoryId: 'CAT-SEPATU', name: 'DEEP CLEANING' },
  { id: 'CLS-LIN-BC', categoryId: 'CAT-LINEN', name: 'BED COVER & SELIMUT' },
];

export const INITIAL_SERVICES: LaundryService[] = [
  {
    id: 'SRV-001',
    categoryId: 'CAT-CS',
    categoryName: 'CUCI SETRIKA',
    classificationId: 'CLS-CS-REG',
    classificationName: 'REGULAR (2 Hari)',
    name: 'Cuci Setrika Reguler 2 Hari',
    unitId: 'UNIT-KG',
    unitName: 'kg',
    pricePerUnit: 8000,
    estimatedDurationHours: 48,
    isActive: true,
  },
  {
    id: 'SRV-002',
    categoryId: 'CAT-CS',
    categoryName: 'CUCI SETRIKA',
    classificationId: 'CLS-CS-KILAT',
    classificationName: 'KILAT (1 Hari / 24 Jam)',
    name: 'Cuci Setrika Kilat 1 Hari',
    unitId: 'UNIT-KG',
    unitName: 'kg',
    pricePerUnit: 12000,
    estimatedDurationHours: 24,
    isActive: true,
  },
  {
    id: 'SRV-003',
    categoryId: 'CAT-CS',
    categoryName: 'CUCI SETRIKA',
    classificationId: 'CLS-CS-EXP',
    classificationName: 'EXPRESS (4-6 Jam)',
    name: 'Cuci Setrika Super Express 4 Jam',
    unitId: 'UNIT-KG',
    unitName: 'kg',
    pricePerUnit: 18000,
    estimatedDurationHours: 4,
    isActive: true,
  },
  {
    id: 'SRV-004',
    categoryId: 'CAT-CKL',
    categoryName: 'CUCI KERING LIPAT',
    classificationId: 'CLS-CKL-REG',
    classificationName: 'REGULAR',
    name: 'Cuci Kering Lipat 1 Hari',
    unitId: 'UNIT-KG',
    unitName: 'kg',
    pricePerUnit: 6000,
    estimatedDurationHours: 24,
    isActive: true,
  },
  {
    id: 'SRV-005',
    categoryId: 'CAT-SS',
    categoryName: 'SETRIKA SAJA',
    classificationId: 'CLS-SS-REG',
    classificationName: 'REGULAR',
    name: 'Setrika Uap Wangi 1 Hari',
    unitId: 'UNIT-KG',
    unitName: 'kg',
    pricePerUnit: 5000,
    estimatedDurationHours: 24,
    isActive: true,
  },
  {
    id: 'SRV-006',
    categoryId: 'CAT-SATUAN',
    categoryName: 'SATUAN EXCLUSIVE',
    classificationId: 'CLS-SAT-JAS',
    classificationName: 'JAS & GAUN',
    name: 'Jas Pria / Blazer Eksklusif',
    unitId: 'UNIT-PCS',
    unitName: 'pcs',
    pricePerUnit: 35000,
    estimatedDurationHours: 48,
    isActive: true,
  },
  {
    id: 'SRV-007',
    categoryId: 'CAT-SEPATU',
    categoryName: 'SEPATU & TAS',
    classificationId: 'CLS-SEP-REG',
    classificationName: 'DEEP CLEANING',
    name: 'Cuci Sepatu Sneakers / Canvas',
    unitId: 'UNIT-PSG',
    unitName: 'pasang',
    pricePerUnit: 30000,
    estimatedDurationHours: 72,
    isActive: true,
  },
  {
    id: 'SRV-008',
    categoryId: 'CAT-LINEN',
    categoryName: 'BED COVER & LINEN',
    classificationId: 'CLS-LIN-BC',
    classificationName: 'BED COVER & SELIMUT',
    name: 'Bed Cover King Size / Tebal',
    unitId: 'UNIT-PCS',
    unitName: 'pcs',
    pricePerUnit: 35000,
    estimatedDurationHours: 48,
    isActive: true,
  },
];

export const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: 'CUST-001',
    name: 'Ibu Anita Wijaya',
    phone: '081288997711',
    address: 'Komplek Permata Hijau Blok C No. 12',
    notes: 'Pelanggan setia. Minta parfum Ocean Fresh agak banyak.',
    createdAt: '2026-03-01T10:00:00.000Z',
    updatedAt: '2026-03-01T10:00:00.000Z',
  },
  {
    id: 'CUST-002',
    name: 'Mas Dimas Aditya',
    phone: '085712345678',
    address: 'Kost Graha Putri, Kamar 204, Jl. Kemang Timur',
    notes: 'Kemeja kantor jangan sampai kancing terlepas.',
    createdAt: '2026-03-05T14:30:00.000Z',
    updatedAt: '2026-03-05T14:30:00.000Z',
  },
  {
    id: 'CUST-003',
    name: 'Mbak Rina Kartika',
    phone: '087890123456',
    address: 'Apartemen Sudirman Tower A Lt 15',
    notes: 'Sering cuci sepatu dan dress pesta.',
    createdAt: '2026-03-10T09:15:00.000Z',
    updatedAt: '2026-03-10T09:15:00.000Z',
  },
];

const now = new Date();
const todayDateStr = now.toISOString().slice(0, 10);

export const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: 'TRX-20261017-0001',
    orderNumber: 'TRX-20261017-0001',
    customerId: 'CUST-001',
    customerName: 'Ibu Anita Wijaya',
    customerPhone: '081288997711',
    customerAddress: 'Komplek Permata Hijau Blok C No. 12',
    items: [
      {
        id: 'ITEM-01',
        serviceId: 'SRV-001',
        serviceName: 'Cuci Setrika Reguler 2 Hari',
        categoryName: 'CUCI SETRIKA',
        classificationName: 'REGULAR (2 Hari)',
        unitName: 'kg',
        pricePerUnit: 8000,
        quantity: 5,
        subtotal: 40000,
        notes: 'Pakaian harian campur',
      },
      {
        id: 'ITEM-02',
        serviceId: 'SRV-008',
        serviceName: 'Bed Cover King Size / Tebal',
        categoryName: 'BED COVER & LINEN',
        classificationName: 'BED COVER & SELIMUT',
        unitName: 'pcs',
        pricePerUnit: 35000,
        quantity: 1,
        subtotal: 35000,
        notes: 'Warna biru tua',
      },
    ],
    totalAmount: 75000,
    discount: 0,
    finalAmount: 75000,
    paidAmount: 50000,
    remainingAmount: 25000,
    paymentStatus: 'SEBAGIAN',
    laundryStatus: 'DIPROSES',
    statusHistory: [
      {
        status: 'DITERIMA',
        timestamp: `${todayDateStr}T08:30:00.000Z`,
        updatedByUserId: 'USR-02',
        updatedByUserName: 'Siti Rahma (Kasir)',
        note: 'Pakaian diterima & ditimbang di kasir',
      },
      {
        status: 'DIPROSES',
        timestamp: `${todayDateStr}T09:15:00.000Z`,
        updatedByUserId: 'USR-02',
        updatedByUserName: 'Siti Rahma (Kasir)',
        note: 'Masuk mesin cuci #2',
      },
    ],
    createdAt: `${todayDateStr}T08:30:00.000Z`,
    estimatedCompletionAt: `${todayDateStr}T18:00:00.000Z`,
    perfumePreference: 'Ocean Fresh',
    specialNotes: 'Jangan dicampur pemutih',
    isUrgent: false,
    createdByUserId: 'USR-02',
    createdByUserName: 'Siti Rahma (Kasir)',
  },
  {
    id: 'TRX-20261017-0002',
    orderNumber: 'TRX-20261017-0002',
    customerId: 'CUST-002',
    customerName: 'Mas Dimas Aditya',
    customerPhone: '085712345678',
    customerAddress: 'Kost Graha Putri, Kamar 204, Jl. Kemang Timur',
    items: [
      {
        id: 'ITEM-03',
        serviceId: 'SRV-003',
        serviceName: 'Cuci Setrika Super Express 4 Jam',
        categoryName: 'CUCI SETRIKA',
        classificationName: 'EXPRESS (4-6 Jam)',
        unitName: 'kg',
        pricePerUnit: 18000,
        quantity: 3,
        subtotal: 54000,
        notes: 'Kemeja kantor kerja besok',
      },
    ],
    totalAmount: 54000,
    discount: 0,
    finalAmount: 54000,
    paidAmount: 54000,
    remainingAmount: 0,
    paymentStatus: 'LUNAS',
    laundryStatus: 'SIAP_DIAMBIL',
    statusHistory: [
      {
        status: 'DITERIMA',
        timestamp: `${todayDateStr}T07:45:00.000Z`,
        updatedByUserId: 'USR-02',
        updatedByUserName: 'Siti Rahma (Kasir)',
      },
      {
        status: 'DIPROSES',
        timestamp: `${todayDateStr}T08:00:00.000Z`,
        updatedByUserId: 'USR-02',
        updatedByUserName: 'Siti Rahma (Kasir)',
      },
      {
        status: 'SIAP_DIAMBIL',
        timestamp: `${todayDateStr}T11:45:00.000Z`,
        updatedByUserId: 'USR-02',
        updatedByUserName: 'Siti Rahma (Kasir)',
        note: 'Selesai di-packing rapi di rak B-04',
      },
    ],
    createdAt: `${todayDateStr}T07:45:00.000Z`,
    estimatedCompletionAt: `${todayDateStr}T12:00:00.000Z`,
    perfumePreference: 'Akasia',
    isUrgent: true,
    createdByUserId: 'USR-02',
    createdByUserName: 'Siti Rahma (Kasir)',
  },
];

export const INITIAL_PAYMENTS: PaymentRecord[] = [
  {
    id: 'PAY-20261017-0001',
    transactionId: 'TRX-20261017-0001',
    amount: 50000,
    method: 'TUNAI',
    paymentDate: `${todayDateStr}T08:32:00.000Z`,
    notes: 'DP Awal tunai',
    recordedByUserId: 'USR-02',
    recordedByUserName: 'Siti Rahma (Kasir)',
    createdAt: `${todayDateStr}T08:32:00.000Z`,
  },
  {
    id: 'PAY-20261017-0002',
    transactionId: 'TRX-20261017-0002',
    amount: 54000,
    method: 'QRIS',
    paymentDate: `${todayDateStr}T07:47:00.000Z`,
    referenceNumber: 'QRIS-83921873',
    notes: 'Lunas di awal via QRIS',
    recordedByUserId: 'USR-02',
    recordedByUserName: 'Siti Rahma (Kasir)',
    createdAt: `${todayDateStr}T07:47:00.000Z`,
  },
];

export const INITIAL_EXPENSES: Expense[] = [
  {
    id: 'EXP-20261017-0001',
    date: `${todayDateStr}T09:00:00.000Z`,
    category: 'DETERGEN_PARFUM',
    categoryLabel: 'Deterjen & Parfum',
    description: 'Beli Deterjen Matic 5 Liter & Softener Akasia',
    amount: 85000,
    paymentMethod: 'TUNAI',
    notes: 'Beli di Toko Bahan Kimia Berkah',
    recordedByUserId: 'USR-02',
    recordedByUserName: 'Siti Rahma (Kasir)',
    createdAt: `${todayDateStr}T09:00:00.000Z`,
  },
  {
    id: 'EXP-20261017-0002',
    date: `${todayDateStr}T10:15:00.000Z`,
    category: 'OPERASIONAL',
    categoryLabel: 'Operasional',
    description: 'Kertas Thermal Roll 58mm (1 pak isi 10 roll)',
    amount: 45000,
    paymentMethod: 'TUNAI',
    notes: 'Stok nota laci kasir',
    recordedByUserId: 'USR-02',
    recordedByUserName: 'Siti Rahma (Kasir)',
    createdAt: `${todayDateStr}T10:15:00.000Z`,
  },
];
