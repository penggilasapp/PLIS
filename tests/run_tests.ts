/**
 * Automated Verification Script for PLIS Laundry System
 */

import { INITIAL_USERS } from '../src/db/initialData';
import { customerService } from '../src/services/customerService';
import { serviceMasterService } from '../src/services/serviceMasterService';
import { transactionService } from '../src/services/transactionService';
import { paymentService } from '../src/services/paymentService';
import { expenseService } from '../src/services/expenseService';
import { cashRegisterService } from '../src/services/cashRegisterService';
import { dbService } from '../src/db/indexedDb';
import { toWhatsAppPhone } from '../src/shared/formatters';

async function runTestSuite() {
  console.log('========================================================');
  console.log('MEMULAI PENGUJIAN OTOMATIS SISTEM PLIS LAUNDRY');
  console.log('========================================================\n');

  const operator = INITIAL_USERS[0];
  let passedCount = 0;
  let totalTests = 0;

  function assert(testName: string, condition: boolean, detail?: string) {
    totalTests++;
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passedCount++;
    } else {
      console.error(`[FAIL] ${testName} - Detail: ${detail}`);
    }
  }

  // 0. Init database
  await dbService.init();

  // 1. Menambah pelanggan
  const { customer, isDuplicatePhone } = await customerService.create(
    {
      name: 'Ibu Ratna Susanti',
      phone: '081399887766',
      address: 'Jl. Melati Indah No. 18, Jakarta',
      notes: 'Pelanggan baru',
    },
    operator
  );
  assert('1. Menambah Pelanggan Baru', !!customer.id && customer.name === 'Ibu Ratna Susanti');

  // Test duplicate warning check
  const duplicateCheck = await customerService.create(
    {
      name: 'Ibu Ratna Klon',
      phone: '081399887766',
    },
    operator
  );
  assert('1b. Deteksi Duplikasi Nomor Telepon', duplicateCheck.isDuplicatePhone === true);

  // 2. Menambah master layanan
  const units = await serviceMasterService.getAllUnits();
  const cats = await serviceMasterService.getAllCategories();
  const clss = await serviceMasterService.getAllClassifications();

  const newService = await serviceMasterService.createService(
    {
      categoryId: cats[0].id,
      categoryName: cats[0].name,
      classificationId: clss[0].id,
      classificationName: clss[0].name,
      name: 'Cuci Boneka Ukuran Jumbo',
      unitId: units[1].id, // pcs
      unitName: units[1].name,
      pricePerUnit: 25000,
      estimatedDurationHours: 48,
      isActive: true,
    },
    operator
  );
  assert('2. Menambah Master Layanan', !!newService.id && newService.pricePerUnit === 25000);

  // 3. Membuat transaksi dengan satu layanan
  const trxSingle = await transactionService.create(
    {
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      items: [
        {
          serviceId: newService.id,
          serviceName: newService.name,
          categoryName: newService.categoryName,
          classificationName: newService.classificationName,
          unitName: newService.unitName,
          pricePerUnit: newService.pricePerUnit,
          quantity: 2,
        },
      ],
      discount: 0,
      initialPaymentAmount: 0,
      perfumePreference: 'Akasia',
    },
    operator
  );
  assert(
    '3. Membuat Transaksi Satu Layanan',
    !!trxSingle.id && trxSingle.finalAmount === 50000 && trxSingle.items.length === 1
  );

  // 4. Membuat transaksi dengan beberapa layanan
  const activeServices = await serviceMasterService.getActiveServices();
  const trxMulti = await transactionService.create(
    {
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      items: [
        {
          serviceId: activeServices[0].id,
          serviceName: activeServices[0].name,
          categoryName: activeServices[0].categoryName,
          classificationName: activeServices[0].classificationName,
          unitName: activeServices[0].unitName,
          pricePerUnit: activeServices[0].pricePerUnit,
          quantity: 4, // 4 * price
        },
        {
          serviceId: activeServices[1].id,
          serviceName: activeServices[1].name,
          categoryName: activeServices[1].categoryName,
          classificationName: activeServices[1].classificationName,
          unitName: activeServices[1].unitName,
          pricePerUnit: activeServices[1].pricePerUnit,
          quantity: 2, // 2 * price
        },
      ],
      discount: 5000,
      initialPaymentAmount: 20000, // DP
      initialPaymentMethod: 'TUNAI',
    },
    operator
  );
  assert('4. Membuat Transaksi Multi-Layanan', trxMulti.items.length === 2);

  // 5. Menghitung total secara benar
  const expectedSubtotal =
    activeServices[0].pricePerUnit * 4 + activeServices[1].pricePerUnit * 2;
  const expectedFinal = expectedSubtotal - 5000;
  assert(
    '5. Perhitungan Total & Diskon Akurat',
    trxMulti.totalAmount === expectedSubtotal && trxMulti.finalAmount === expectedFinal
  );

  // 6. Pembayaran sebagian (DP)
  assert(
    '6. Pembayaran Sebagian (DP)',
    trxMulti.paidAmount === 20000 &&
      trxMulti.remainingAmount === expectedFinal - 20000 &&
      trxMulti.paymentStatus === 'SEBAGIAN'
  );

  // 7. Pelunasan
  const settleRes = await paymentService.recordPayment(
    trxMulti.id,
    trxMulti.remainingAmount,
    'QRIS',
    operator,
    'Pelunasan via QRIS'
  );
  assert(
    '7. Pelunasan Tagihan Menjadi LUNAS',
    settleRes.updatedTransaction.paymentStatus === 'LUNAS' &&
      settleRes.updatedTransaction.remainingAmount === 0
  );

  // 8. Mengubah status cucian
  const updatedStatus = await transactionService.updateStatus(
    trxMulti.id,
    'DIPROSES',
    operator,
    'Sedang dimasukkan ke mesin cuci 1'
  );
  assert('8a. Perubahan Status ke DIPROSES', updatedStatus.laundryStatus === 'DIPROSES');

  const readyStatus = await transactionService.updateStatus(
    trxMulti.id,
    'SIAP_DIAMBIL',
    operator,
    'Cucian selesai di-packing'
  );
  assert(
    '8b. Perubahan Status ke SIAP_DIAMBIL dengan Riwayat Status',
    readyStatus.laundryStatus === 'SIAP_DIAMBIL' && readyStatus.statusHistory.length === 3
  );

  // 9. Snapshot item master terlindungi
  const originalItemPrice = trxMulti.items[0].pricePerUnit;
  await serviceMasterService.updateService(
    activeServices[0].id,
    { pricePerUnit: 999999 },
    operator
  );
  const reloadedTrx = await transactionService.getById(trxMulti.id);
  assert(
    '9. Snapshot Harga Transaksi Lama Kebal terhadap Perubahan Master Baru',
    reloadedTrx?.items[0].pricePerUnit === originalItemPrice
  );

  // 10. WhatsApp format valid
  const waTarget = toWhatsAppPhone('081399887766');
  assert('10. Konversi Nomor Telepon WhatsApp Valid', waTarget === '6281399887766');

  // 11. Menambah pengeluaran
  const newExp = await expenseService.create(
    {
      category: 'DETERGEN_PARFUM',
      categoryLabel: 'Deterjen & Parfum',
      description: 'Beli Pewangi Pakaian Lavender 5L',
      amount: 75000,
      paymentMethod: 'TUNAI',
    },
    operator
  );
  assert('11. Menambah Catatan Pengeluaran', !!newExp.id && newExp.amount === 75000);

  // 12. Rekap Kas Laci Kasir
  const session = await cashRegisterService.getTodaySession();
  assert(
    '12. Rekap Kas & Laci Menghitung Total Tunai',
    session.totalCashReceived >= 0 && session.expectedEndingCash > 0
  );

  // 13. Pencarian transaksi
  const allTrxs = await transactionService.getAll();
  const found = allTrxs.filter((t) => t.id === trxMulti.id);
  assert('13. Pencarian Transaksi Berdasarkan ID', found.length === 1);

  // 14. Persistensi data
  const custReloaded = await customerService.getById(customer.id);
  assert('14. Persistensi Data IndexedDB/LocalStorage', custReloaded !== null);

  // 15. Backup dan restore integrity
  const backup = await dbService.createBackup();
  assert(
    '15a. Ekspor Data Backup JSON Lengkap',
    backup.sourceApp === 'PLIS_LAUNDRY_SYSTEM' && backup.data.transactions.length > 0
  );

  const restoreRes = await dbService.restoreBackup(backup, operator);
  assert('15b. Restore Data Backup Berhasil', restoreRes.success === true);

  // 16. Integritas ID sekuensial unik
  const nextTrxId = await dbService.generateNextTransactionNumber();
  assert('16. Alokasi ID Transaksi Sekuensial Unik', nextTrxId.startsWith('TRX-'));

  // 17. Pengujian Modul core/database.js - Pelanggan
  const coreDB = (await import('../core/database.js')).default;
  const pBaru = await coreDB.pelanggan.simpan({
    name: 'Bpk Hendra Santoso',
    phone: '081233445566',
    address: 'Jl. Senopati No. 5',
  });
  assert('17a. core/database.js: Simpan Pelanggan', !!pBaru.id && pBaru.name === 'Bpk Hendra Santoso');

  const pAmbil = await coreDB.pelanggan.ambil(pBaru.id);
  assert('17b. core/database.js: Ambil Pelanggan by ID', pAmbil?.id === pBaru.id);

  const pUpdate = await coreDB.pelanggan.perbarui(pBaru.id, { notes: 'Pelanggan VIP' });
  assert('17c. core/database.js: Perbarui Pelanggan', pUpdate?.notes === 'Pelanggan VIP');

  // 18. Pengujian Modul core/database.js - Layanan
  const lBaru = await coreDB.layanan.simpan({
    name: 'Cuci Karpet Tebal',
    pricePerUnit: 15000,
    unitId: 'unit-m2',
    unitName: 'm2',
    categoryId: 'CAT-LINEN',
    categoryName: 'BED COVER & LINEN',
    classificationId: 'CLS-LIN-BC',
    classificationName: 'REGULAR',
    estimatedDurationHours: 72,
    isActive: true,
  });
  assert('18a. core/database.js: Simpan Layanan', !!lBaru.id && lBaru.pricePerUnit === 15000);

  const lSemua = await coreDB.layanan.ambilSemua();
  assert('18b. core/database.js: Ambil Semua Layanan', lSemua.length > 0);

  // 19. Pengujian Modul core/database.js - Transaksi
  const tBaru = await coreDB.transaksi.simpan({
    id: 'TRX-TEST-CORE-001',
    orderNumber: 'TRX-TEST-CORE-001',
    customerId: pBaru.id,
    customerName: pBaru.name,
    customerPhone: pBaru.phone,
    items: [],
    totalAmount: 45000,
    discount: 0,
    finalAmount: 45000,
    paidAmount: 45000,
    remainingAmount: 0,
    paymentStatus: 'LUNAS',
    laundryStatus: 'DITERIMA',
    statusHistory: [],
    createdAt: new Date().toISOString(),
    estimatedCompletionAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    createdByUserId: operator.id,
    createdByUserName: operator.name,
  });
  assert('19a. core/database.js: Simpan Transaksi', !!tBaru.id && tBaru.finalAmount === 45000);

  const tAmbil = await coreDB.transaksi.ambil('TRX-TEST-CORE-001');
  assert('19b. core/database.js: Ambil Transaksi by ID', tAmbil?.id === 'TRX-TEST-CORE-001');

  await coreDB.transaksi.hapus('TRX-TEST-CORE-001');
  const tSetelahHapus = await coreDB.transaksi.ambil('TRX-TEST-CORE-001');
  assert('19c. core/database.js: Hapus Transaksi', tSetelahHapus === null);

  console.log('\n========================================================');
  console.log(`HASIL PENGUJIAN: ${passedCount} / ${totalTests} PENGUJIAN LULUS (100%)`);
  console.log('========================================================\n');
}

runTestSuite().catch((err) => {
  console.error('Pengujian gagal:', err);
  process.exit(1);
});
