import { dbService } from '../db/indexedDb';
import {
  AppUser,
  LaundryStatus,
  PaymentMethod,
  PaymentRecord,
  PaymentStatus,
  Transaction,
  TransactionItem,
} from '../types';
import {
  calculateDiscount,
  calculateFinalTotal,
  calculateItemSubtotal,
  calculatePaymentDetails,
} from '../shared/calculations';

export interface CreateTransactionDTO {
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  items: Array<{
    serviceId: string;
    serviceName: string;
    categoryName: string;
    classificationName: string;
    unitName: string;
    pricePerUnit: number;
    quantity: number;
    notes?: string;
  }>;
  discount?: number;
  initialPaymentAmount?: number;
  initialPaymentMethod?: PaymentMethod;
  paymentReferenceNumber?: string;
  perfumePreference?: string;
  specialNotes?: string;
  isUrgent?: boolean;
  estimatedCompletionHours?: number;
}

export const transactionService = {
  async getAll(): Promise<Transaction[]> {
    const list = await dbService.getAll<Transaction>('transactions');
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async getById(id: string): Promise<Transaction | null> {
    return dbService.getById<Transaction>('transactions', id);
  },

  async create(dto: CreateTransactionDTO, operator: AppUser): Promise<Transaction> {
    // 1. Validations
    if (!dto.customerId || !dto.customerName) {
      throw new Error('Pelanggan wajib dipilih atau diisi!');
    }
    if (!dto.items || dto.items.length === 0) {
      throw new Error('Transaksi harus memiliki minimal 1 item layanan!');
    }

    const calculatedItems: TransactionItem[] = [];
    let calculatedTotal = 0;

    for (let i = 0; i < dto.items.length; i++) {
      const it = dto.items[i];
      if (it.quantity <= 0) {
        throw new Error(`Jumlah untuk item "${it.serviceName}" harus lebih besar dari 0!`);
      }
      if (it.pricePerUnit < 0) {
        throw new Error(`Harga untuk item "${it.serviceName}" tidak boleh negatif!`);
      }
      const subtotal = calculateItemSubtotal(it.quantity, it.pricePerUnit);
      calculatedTotal += subtotal;

      calculatedItems.push({
        id: `ITEM-${Date.now()}-${i}`,
        serviceId: it.serviceId,
        serviceName: it.serviceName,
        categoryName: it.categoryName,
        classificationName: it.classificationName,
        unitName: it.unitName,
        pricePerUnit: it.pricePerUnit,
        quantity: it.quantity,
        subtotal,
        notes: it.notes || '',
      });
    }

    const discount = calculateDiscount(calculatedTotal, dto.discount || 0);
    const finalAmount = calculateFinalTotal(calculatedTotal, discount);

    const initialPay = Math.max(0, dto.initialPaymentAmount || 0);
    if (initialPay > finalAmount) {
      throw new Error('Pembayaran awal tidak boleh melebihi total tagihan!');
    }

    const payDetails = calculatePaymentDetails(finalAmount, initialPay);
    const remainingAmount = payDetails.remainingAmount;
    const paymentStatus = payDetails.paymentStatus;

    // Allocate persistent sequential transaction ID
    const newId = await dbService.generateNextTransactionNumber();
    const now = new Date();
    const nowIso = now.toISOString();

    const hoursToAdd = dto.estimatedCompletionHours || 24;
    const estDate = new Date(now.getTime() + hoursToAdd * 60 * 60 * 1000);

    const newTransaction: Transaction = {
      id: newId,
      orderNumber: newId,
      customerId: dto.customerId,
      customerName: dto.customerName,
      customerPhone: dto.customerPhone,
      customerAddress: dto.customerAddress,
      items: calculatedItems,
      totalAmount: calculatedTotal,
      discount,
      finalAmount,
      paidAmount: initialPay,
      remainingAmount,
      paymentStatus,
      laundryStatus: 'DITERIMA',
      statusHistory: [
        {
          status: 'DITERIMA',
          timestamp: nowIso,
          updatedByUserId: operator.id,
          updatedByUserName: operator.name,
          note: 'Nota dibuat di kasir',
        },
      ],
      createdAt: nowIso,
      estimatedCompletionAt: estDate.toISOString(),
      perfumePreference: dto.perfumePreference || 'Ocean Fresh',
      specialNotes: dto.specialNotes,
      isUrgent: !!dto.isUrgent,
      createdByUserId: operator.id,
      createdByUserName: operator.name,
    };

    // Save transaction
    await dbService.put('transactions', newTransaction);

    // Save payment record if initial payment made
    if (initialPay > 0) {
      const paymentId = `PAY-${newId.replace('TRX-', '')}-01`;
      const paymentRecord: PaymentRecord = {
        id: paymentId,
        transactionId: newId,
        amount: initialPay,
        method: dto.initialPaymentMethod || 'TUNAI',
        paymentDate: nowIso,
        referenceNumber: dto.paymentReferenceNumber,
        notes: initialPay === finalAmount ? 'Pelunasan di awal' : 'Uang muka (DP) awal',
        recordedByUserId: operator.id,
        recordedByUserName: operator.name,
        createdAt: nowIso,
      };
      await dbService.put('payments', paymentRecord);
    }

    // Audit log
    await dbService.put('auditLogs', {
      id: `AUDIT-${Date.now()}`,
      timestamp: nowIso,
      actionType: 'TRANSACTION_CREATE',
      entityType: 'TRANSACTION',
      entityId: newId,
      description: `Transaksi baru dibuat: ${newId} untuk ${newTransaction.customerName} (Total: ${newTransaction.finalAmount}, Bayar: ${initialPay})`,
      userId: operator.id,
      userName: operator.name,
    });

    return newTransaction;
  },

  async updateStatus(
    transactionId: string,
    newStatus: LaundryStatus,
    operator: AppUser,
    note?: string
  ): Promise<Transaction> {
    const trx = await this.getById(transactionId);
    if (!trx) throw new Error('Transaksi tidak ditemukan!');

    const nowIso = new Date().toISOString();
    const updatedHistory = [
      ...trx.statusHistory,
      {
        status: newStatus,
        timestamp: nowIso,
        updatedByUserId: operator.id,
        updatedByUserName: operator.name,
        note: note || `Status diubah ke ${newStatus}`,
      },
    ];

    const updatedTrx: Transaction = {
      ...trx,
      laundryStatus: newStatus,
      statusHistory: updatedHistory,
      completedAt: newStatus === 'SELESAI' ? nowIso : trx.completedAt,
    };

    await dbService.put('transactions', updatedTrx);

    await dbService.put('auditLogs', {
      id: `AUDIT-${Date.now()}`,
      timestamp: nowIso,
      actionType: 'STATUS_CHANGE',
      entityType: 'TRANSACTION',
      entityId: transactionId,
      description: `Status cucian ${transactionId} diubah dari ${trx.laundryStatus} menjadi ${newStatus}`,
      userId: operator.id,
      userName: operator.name,
    });

    return updatedTrx;
  },

  async updateTransactionDetails(
    transactionId: string,
    updatedItems: TransactionItem[],
    discount: number,
    specialNotes: string,
    perfumePreference: string,
    operator: AppUser,
    reason: string
  ): Promise<Transaction> {
    const trx = await this.getById(transactionId);
    if (!trx) throw new Error('Transaksi tidak ditemukan!');

    if (!updatedItems || updatedItems.length === 0) {
      throw new Error('Transaksi harus memiliki minimal satu item!');
    }

    let calculatedTotal = 0;
    const sanitizedItems: TransactionItem[] = updatedItems.map((item, idx) => {
      if (item.quantity <= 0) {
        throw new Error(`Jumlah untuk item "${item.serviceName}" harus lebih dari 0!`);
      }
      const subtotal = calculateItemSubtotal(item.quantity, item.pricePerUnit);
      calculatedTotal += subtotal;
      return {
        ...item,
        id: item.id || `ITEM-${Date.now()}-${idx}`,
        subtotal,
      };
    });

    const sanitizedDiscount = calculateDiscount(calculatedTotal, discount);
    const finalAmount = calculateFinalTotal(calculatedTotal, sanitizedDiscount);

    // Keep existing paidAmount
    const paidAmount = trx.paidAmount;
    const payDetails = calculatePaymentDetails(finalAmount, paidAmount);
    const remainingAmount = payDetails.remainingAmount;
    const paymentStatus = payDetails.paymentStatus;

    const updatedTrx: Transaction = {
      ...trx,
      items: sanitizedItems,
      totalAmount: calculatedTotal,
      discount: sanitizedDiscount,
      finalAmount,
      remainingAmount,
      paymentStatus,
      specialNotes,
      perfumePreference,
    };

    await dbService.put('transactions', updatedTrx);

    await dbService.put('auditLogs', {
      id: `AUDIT-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actionType: 'TRANSACTION_UPDATE',
      entityType: 'TRANSACTION',
      entityId: transactionId,
      description: `Transaksi ${transactionId} diedit oleh ${operator.name}. Alasan: ${reason || 'Koreksi item/berat/diskon'}. Total baru: ${finalAmount}`,
      userId: operator.id,
      userName: operator.name,
    });

    return updatedTrx;
  },

  async deleteTransaction(
    transactionId: string,
    operator: AppUser,
    reason?: string
  ): Promise<void> {
    const trx = await this.getById(transactionId);
    if (!trx) throw new Error('Transaksi tidak ditemukan!');

    // 1. Delete associated payments
    const payments = await dbService.getAll<PaymentRecord>('payments');
    const relatedPayments = payments.filter((p) => p.transactionId === transactionId);
    for (const p of relatedPayments) {
      await dbService.delete('payments', p.id);
    }

    // 2. Delete transaction record
    await dbService.delete('transactions', transactionId);

    // 3. Audit log
    await dbService.put('auditLogs', {
      id: `AUDIT-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actionType: 'TRANSACTION_UPDATE',
      entityType: 'TRANSACTION',
      entityId: transactionId,
      description: `Transaksi ${transactionId} (${trx.customerName}, Nilai: Rp ${trx.finalAmount.toLocaleString('id-ID')}) DIHAPUS oleh ${operator.name}. Alasan: ${reason || 'Pembatalan transaksi'}`,
      userId: operator.id,
      userName: operator.name,
    });
  },
};
