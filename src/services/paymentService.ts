import { dbService } from '../db/indexedDb';
import { AppUser, PaymentMethod, PaymentRecord, PaymentStatus, Transaction } from '../types';

export const paymentService = {
  async getAll(): Promise<PaymentRecord[]> {
    const list = await dbService.getAll<PaymentRecord>('payments');
    return list.sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
  },

  async getByTransactionId(transactionId: string): Promise<PaymentRecord[]> {
    const all = await this.getAll();
    return all.filter((p) => p.transactionId === transactionId);
  },

  async recordPayment(
    transactionId: string,
    amount: number,
    method: PaymentMethod,
    operator: AppUser,
    notes?: string,
    referenceNumber?: string
  ): Promise<{ payment: PaymentRecord; updatedTransaction: Transaction }> {
    const trx = await dbService.getById<Transaction>('transactions', transactionId);
    if (!trx) {
      throw new Error('Transaksi tidak ditemukan!');
    }

    if (amount <= 0) {
      throw new Error('Nominal pembayaran harus lebih besar dari Rp 0!');
    }

    if (amount > trx.remainingAmount) {
      throw new Error(
        `Nominal pembayaran (Rp ${amount.toLocaleString('id-ID')}) melebihi sisa tagihan (Rp ${trx.remainingAmount.toLocaleString('id-ID')})!`
      );
    }

    const nowIso = new Date().toISOString();
    const existingPayments = await this.getByTransactionId(transactionId);
    const seq = String(existingPayments.length + 1).padStart(2, '0');
    const paymentId = `PAY-${transactionId.replace('TRX-', '')}-${seq}`;

    const newPayment: PaymentRecord = {
      id: paymentId,
      transactionId,
      amount,
      method,
      paymentDate: nowIso,
      referenceNumber,
      notes: notes || (amount === trx.remainingAmount ? 'Pelunasan tagihan' : 'Pembayaran angsuran'),
      recordedByUserId: operator.id,
      recordedByUserName: operator.name,
      createdAt: nowIso,
    };

    const newPaidAmount = trx.paidAmount + amount;
    const newRemainingAmount = Math.max(0, trx.finalAmount - newPaidAmount);

    let newPaymentStatus: PaymentStatus = 'BELUM_DIBAYAR';
    if (newRemainingAmount === 0) {
      newPaymentStatus = 'LUNAS';
    } else if (newPaidAmount > 0) {
      newPaymentStatus = 'SEBAGIAN';
    }

    const updatedTrx: Transaction = {
      ...trx,
      paidAmount: newPaidAmount,
      remainingAmount: newRemainingAmount,
      paymentStatus: newPaymentStatus,
    };

    // Save payment and transaction atomically
    await dbService.put('payments', newPayment);
    await dbService.put('transactions', updatedTrx);

    // Audit log
    await dbService.put('auditLogs', {
      id: `AUDIT-${Date.now()}`,
      timestamp: nowIso,
      actionType: 'PAYMENT_RECEIVED',
      entityType: 'PAYMENT',
      entityId: paymentId,
      description: `Pembayaran diterima sebesar Rp ${amount.toLocaleString('id-ID')} (${method}) untuk nota ${transactionId}. Status sekarang: ${newPaymentStatus}`,
      userId: operator.id,
      userName: operator.name,
    });

    return { payment: newPayment, updatedTransaction: updatedTrx };
  },

  async updatePayment(
    paymentId: string,
    newAmount: number,
    newMethod: PaymentMethod,
    newNotes: string | undefined,
    operator: AppUser
  ): Promise<{ payment: PaymentRecord; updatedTransaction: Transaction }> {
    const payment = await dbService.getById<PaymentRecord>('payments', paymentId);
    if (!payment) throw new Error('Catatan pembayaran tidak ditemukan!');

    const trx = await dbService.getById<Transaction>('transactions', payment.transactionId);
    if (!trx) throw new Error('Transaksi terkait tidak ditemukan!');

    if (newAmount <= 0) {
      throw new Error('Nominal pembayaran harus lebih besar dari Rp 0!');
    }

    // Check all payments for this transaction excluding current payment
    const allPayments = await this.getByTransactionId(payment.transactionId);
    const otherPaymentsTotal = allPayments
      .filter((p) => p.id !== paymentId)
      .reduce((acc, p) => acc + p.amount, 0);

    const totalWithNew = otherPaymentsTotal + newAmount;
    if (totalWithNew > trx.finalAmount) {
      throw new Error(
        `Total pembayaran (Rp ${totalWithNew.toLocaleString('id-ID')}) melebihi total tagihan (Rp ${trx.finalAmount.toLocaleString('id-ID')})!`
      );
    }

    const updatedPayment: PaymentRecord = {
      ...payment,
      amount: newAmount,
      method: newMethod,
      notes: newNotes,
    };

    const newPaidAmount = totalWithNew;
    const newRemainingAmount = Math.max(0, trx.finalAmount - newPaidAmount);

    let newPaymentStatus: PaymentStatus = 'BELUM_DIBAYAR';
    if (newRemainingAmount === 0) {
      newPaymentStatus = 'LUNAS';
    } else if (newPaidAmount > 0) {
      newPaymentStatus = 'SEBAGIAN';
    }

    const updatedTrx: Transaction = {
      ...trx,
      paidAmount: newPaidAmount,
      remainingAmount: newRemainingAmount,
      paymentStatus: newPaymentStatus,
    };

    await dbService.put('payments', updatedPayment);
    await dbService.put('transactions', updatedTrx);

    await dbService.put('auditLogs', {
      id: `AUDIT-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actionType: 'PAYMENT_RECEIVED',
      entityType: 'PAYMENT',
      entityId: paymentId,
      description: `Koreksi pembayaran ${paymentId} untuk ${trx.id} oleh ${operator.name}. Nominal lama: Rp ${payment.amount.toLocaleString('id-ID')}, Nominal baru: Rp ${newAmount.toLocaleString('id-ID')} (${newMethod})`,
      userId: operator.id,
      userName: operator.name,
    });

    return { payment: updatedPayment, updatedTransaction: updatedTrx };
  },

  async deletePayment(
    paymentId: string,
    operator: AppUser
  ): Promise<Transaction> {
    const payment = await dbService.getById<PaymentRecord>('payments', paymentId);
    if (!payment) throw new Error('Catatan pembayaran tidak ditemukan!');

    const trx = await dbService.getById<Transaction>('transactions', payment.transactionId);
    if (!trx) throw new Error('Transaksi terkait tidak ditemukan!');

    // Delete payment record
    await dbService.delete('payments', paymentId);

    // Recalculate remaining payments
    const allPayments = await this.getByTransactionId(payment.transactionId);
    const newPaidAmount = allPayments
      .filter((p) => p.id !== paymentId)
      .reduce((acc, p) => acc + p.amount, 0);

    const newRemainingAmount = Math.max(0, trx.finalAmount - newPaidAmount);

    let newPaymentStatus: PaymentStatus = 'BELUM_DIBAYAR';
    if (newRemainingAmount === 0) {
      newPaymentStatus = 'LUNAS';
    } else if (newPaidAmount > 0) {
      newPaymentStatus = 'SEBAGIAN';
    }

    const updatedTrx: Transaction = {
      ...trx,
      paidAmount: newPaidAmount,
      remainingAmount: newRemainingAmount,
      paymentStatus: newPaymentStatus,
    };

    await dbService.put('transactions', updatedTrx);

    await dbService.put('auditLogs', {
      id: `AUDIT-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actionType: 'PAYMENT_RECEIVED',
      entityType: 'PAYMENT',
      entityId: paymentId,
      description: `Pembayaran ${paymentId} sebesar Rp ${payment.amount.toLocaleString('id-ID')} (${trx.id}) DIHAPUS oleh ${operator.name}. Status nota kembali menjadi ${newPaymentStatus}`,
      userId: operator.id,
      userName: operator.name,
    });

    return updatedTrx;
  },
};
