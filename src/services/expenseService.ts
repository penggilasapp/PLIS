import { dbService } from '../db/indexedDb';
import { AppUser, Expense, ExpenseCategory, PaymentMethod } from '../types';

export const expenseService = {
  async getAll(): Promise<Expense[]> {
    const list = await dbService.getAll<Expense>('expenses');
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  async create(
    data: {
      category: ExpenseCategory;
      categoryLabel: string;
      description: string;
      amount: number;
      paymentMethod: PaymentMethod;
      notes?: string;
      customDate?: string;
    },
    operator: AppUser
  ): Promise<Expense> {
    if (data.amount <= 0) {
      throw new Error('Nominal pengeluaran harus lebih besar dari Rp 0!');
    }
    if (!data.description.trim()) {
      throw new Error('Deskripsi pengeluaran wajib diisi!');
    }

    const nowIso = new Date().toISOString();
    const id = `EXP-${Date.now()}`;
    const newExpense: Expense = {
      id,
      date: data.customDate || nowIso,
      category: data.category,
      categoryLabel: data.categoryLabel,
      description: data.description.trim(),
      amount: data.amount,
      paymentMethod: data.paymentMethod,
      notes: data.notes,
      recordedByUserId: operator.id,
      recordedByUserName: operator.name,
      createdAt: nowIso,
    };

    await dbService.put('expenses', newExpense);

    await dbService.put('auditLogs', {
      id: `AUDIT-${Date.now()}`,
      timestamp: nowIso,
      actionType: 'EXPENSE_CREATE',
      entityType: 'EXPENSE',
      entityId: id,
      description: `Pengeluaran dicatat: ${newExpense.description} sebesar Rp ${data.amount.toLocaleString('id-ID')} (${data.categoryLabel})`,
      userId: operator.id,
      userName: operator.name,
    });

    return newExpense;
  },

  async update(
    id: string,
    data: {
      category?: ExpenseCategory;
      categoryLabel?: string;
      description?: string;
      amount?: number;
      paymentMethod?: PaymentMethod;
      notes?: string;
      date?: string;
    },
    operator: AppUser
  ): Promise<Expense> {
    const existing = await dbService.getById<Expense>('expenses', id);
    if (!existing) throw new Error('Pengeluaran tidak ditemukan!');

    if (data.amount !== undefined && data.amount <= 0) {
      throw new Error('Nominal pengeluaran harus lebih besar dari Rp 0!');
    }

    const updated: Expense = {
      ...existing,
      category: data.category || existing.category,
      categoryLabel: data.categoryLabel || existing.categoryLabel,
      description: data.description ? data.description.trim() : existing.description,
      amount: data.amount !== undefined ? data.amount : existing.amount,
      paymentMethod: data.paymentMethod || existing.paymentMethod,
      notes: data.notes !== undefined ? data.notes : existing.notes,
      date: data.date || existing.date,
    };

    await dbService.put('expenses', updated);

    await dbService.put('auditLogs', {
      id: `AUDIT-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actionType: 'EXPENSE_CREATE',
      entityType: 'EXPENSE',
      entityId: id,
      description: `Pengeluaran ${id} (${updated.description}) diedit oleh ${operator.name}. Nominal baru: Rp ${updated.amount.toLocaleString('id-ID')}`,
      userId: operator.id,
      userName: operator.name,
    });

    return updated;
  },

  async delete(id: string, operator: AppUser): Promise<void> {
    const exp = await dbService.getById<Expense>('expenses', id);
    if (!exp) return;

    await dbService.delete('expenses', id);

    await dbService.put('auditLogs', {
      id: `AUDIT-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actionType: 'EXPENSE_DELETE',
      entityType: 'EXPENSE',
      entityId: id,
      description: `Pengeluaran dihapus: ${exp.description} (Rp ${exp.amount.toLocaleString('id-ID')})`,
      userId: operator.id,
      userName: operator.name,
    });
  },
};
