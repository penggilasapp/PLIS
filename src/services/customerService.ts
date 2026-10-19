import { dbService } from '../db/indexedDb';
import { AppUser, Customer, Transaction } from '../types';

export const customerService = {
  async getAll(): Promise<Customer[]> {
    const list = await dbService.getAll<Customer>('customers');
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async getById(id: string): Promise<Customer | null> {
    return dbService.getById<Customer>('customers', id);
  },

  async findByPhone(phone: string): Promise<Customer | undefined> {
    const cleanPhone = phone.replace(/\D/g, '');
    const all = await dbService.getAll<Customer>('customers');
    return all.find((c) => c.phone.replace(/\D/g, '') === cleanPhone);
  },

  async create(
    data: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>,
    operator: AppUser
  ): Promise<{ customer: Customer; isDuplicatePhone: boolean }> {
    const cleanPhone = data.phone.trim().replace(/\D/g, '');
    const existing = await this.findByPhone(cleanPhone);

    const now = new Date().toISOString();
    const newId = `CUST-${Date.now().toString().slice(-6)}`;
    const newCustomer: Customer = {
      ...data,
      id: newId,
      phone: data.phone.trim(),
      createdAt: now,
      updatedAt: now,
    };

    await dbService.put('customers', newCustomer);

    await dbService.put('auditLogs', {
      id: `AUDIT-${Date.now()}`,
      timestamp: now,
      actionType: 'CUSTOMER_CREATE',
      entityType: 'CUSTOMER',
      entityId: newId,
      description: `Pelanggan baru ditambahkan: ${newCustomer.name} (${newCustomer.phone})`,
      userId: operator.id,
      userName: operator.name,
    });

    return { customer: newCustomer, isDuplicatePhone: !!existing };
  },

  async update(
    id: string,
    data: Partial<Omit<Customer, 'id' | 'createdAt'>>,
    operator: AppUser
  ): Promise<Customer> {
    const existing = await this.getById(id);
    if (!existing) throw new Error('Pelanggan tidak ditemukan');

    const updated: Customer = {
      ...existing,
      ...data,
      updatedAt: new Date().toISOString(),
    };

    await dbService.put('customers', updated);

    await dbService.put('auditLogs', {
      id: `AUDIT-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actionType: 'CUSTOMER_UPDATE',
      entityType: 'CUSTOMER',
      entityId: id,
      description: `Data pelanggan ${updated.name} diperbarui`,
      userId: operator.id,
      userName: operator.name,
    });

    return updated;
  },

  async getCustomerStats(customerId: string): Promise<{
    totalOrders: number;
    totalSpent: number;
    totalPaid: number;
    totalReceivable: number;
    lastOrderDate?: string;
  }> {
    const transactions = await dbService.getAll<Transaction>('transactions');
    const customerOrders = transactions.filter((t) => t.customerId === customerId);

    const totalOrders = customerOrders.length;
    let totalSpent = 0;
    let totalPaid = 0;
    let totalReceivable = 0;

    customerOrders.forEach((order) => {
      totalSpent += order.finalAmount;
      totalPaid += order.paidAmount;
      totalReceivable += order.remainingAmount;
    });

    const sorted = [...customerOrders].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return {
      totalOrders,
      totalSpent,
      totalPaid,
      totalReceivable,
      lastOrderDate: sorted[0]?.createdAt,
    };
  },
};
