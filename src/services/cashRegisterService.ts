import { dbService } from '../db/indexedDb';
import { AppUser, CashRegisterSession, Expense, PaymentRecord } from '../types';

export const cashRegisterService = {
  async getTodaySession(): Promise<CashRegisterSession> {
    const todayStr = new Date().toISOString().slice(0, 10);
    const sessions = await dbService.getAll<CashRegisterSession>('cashSessions');
    const existing = sessions.find((s) => s.date === todayStr);

    if (existing) {
      // Recalculate real-time
      const [payments, expenses] = await Promise.all([
        dbService.getAll<PaymentRecord>('payments'),
        dbService.getAll<Expense>('expenses'),
      ]);

      const todaysCashPayments = payments.filter(
        (p) => p.paymentDate.startsWith(todayStr) && p.method === 'TUNAI'
      );
      const todaysCashExpenses = expenses.filter(
        (e) => e.date.startsWith(todayStr) && e.paymentMethod === 'TUNAI'
      );

      const totalCashReceived = todaysCashPayments.reduce((acc, p) => acc + p.amount, 0);
      const totalCashExpense = todaysCashExpenses.reduce((acc, e) => acc + e.amount, 0);
      const expectedEndingCash = existing.startingCash + totalCashReceived - totalCashExpense;

      const updated: CashRegisterSession = {
        ...existing,
        totalCashReceived,
        totalCashExpense,
        expectedEndingCash,
      };
      return updated;
    }

    // Default auto-open session for today if none exists
    const [payments, expenses] = await Promise.all([
      dbService.getAll<PaymentRecord>('payments'),
      dbService.getAll<Expense>('expenses'),
    ]);
    const todaysCashPayments = payments.filter(
      (p) => p.paymentDate.startsWith(todayStr) && p.method === 'TUNAI'
    );
    const todaysCashExpenses = expenses.filter(
      (e) => e.date.startsWith(todayStr) && e.paymentMethod === 'TUNAI'
    );
    const totalCashReceived = todaysCashPayments.reduce((acc, p) => acc + p.amount, 0);
    const totalCashExpense = todaysCashExpenses.reduce((acc, e) => acc + e.amount, 0);
    const startingCash = 200000; // Standard Rp 200.000 starting cash change
    const expectedEndingCash = startingCash + totalCashReceived - totalCashExpense;

    const newSession: CashRegisterSession = {
      id: `CASH-${todayStr}`,
      date: todayStr,
      openedAt: `${todayStr}T07:00:00.000Z`,
      startingCash,
      totalCashReceived,
      totalCashExpense,
      expectedEndingCash,
      isClosed: false,
      openedByUserId: 'USR-01',
    };
    await dbService.put('cashSessions', newSession);
    return newSession;
  },

  async updateStartingCash(amount: number): Promise<CashRegisterSession> {
    const session = await this.getTodaySession();
    session.startingCash = amount;
    session.expectedEndingCash = amount + session.totalCashReceived - session.totalCashExpense;
    await dbService.put('cashSessions', session);
    return session;
  },

  async closeSession(
    actualEndingCash: number,
    notes: string,
    operator: AppUser
  ): Promise<CashRegisterSession> {
    const session = await this.getTodaySession();
    const cashDifference = actualEndingCash - session.expectedEndingCash;

    const closedSession: CashRegisterSession = {
      ...session,
      actualEndingCash,
      cashDifference,
      isClosed: true,
      closedAt: new Date().toISOString(),
      closedByUserId: operator.id,
      notes,
    };

    await dbService.put('cashSessions', closedSession);

    await dbService.put('auditLogs', {
      id: `AUDIT-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actionType: 'CASH_RECAP_CLOSE',
      entityType: 'SYSTEM',
      entityId: closedSession.id,
      description: `Tutup Kas Laci oleh ${operator.name}. Fisik: Rp ${actualEndingCash.toLocaleString('id-ID')}, Harapan: Rp ${session.expectedEndingCash.toLocaleString('id-ID')}, Selisih: Rp ${cashDifference.toLocaleString('id-ID')}`,
      userId: operator.id,
      userName: operator.name,
    });

    return closedSession;
  },
};
