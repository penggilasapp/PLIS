import React, { useState } from 'react';
import {
  MessageCircle,
  Phone,
  Plus,
  Receipt,
  Search,
  User,
  Users,
  X,
} from 'lucide-react';
import { formatPhone, toWhatsAppPhone } from '../../../shared/formatters';
import { AppUser, Customer, Transaction } from '../../../types';
import { PullToRefreshContainer } from '../../common/PullToRefreshContainer';
import { CustomerDetailModal } from './CustomerDetailModal';
import { CustomerFormModal } from './CustomerFormModal';

interface CustomerListViewProps {
  customers: Customer[];
  transactions: Transaction[];
  currentUser: AppUser;
  onSelectTransaction: (trx: Transaction) => void;
  onRefreshData: () => void;
}

export const CustomerListView: React.FC<CustomerListViewProps> = ({
  customers,
  transactions,
  currentUser,
  onSelectTransaction,
  onRefreshData,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerToEdit, setCustomerToEdit] = useState<Customer | null>(null);
  const [showFormModal, setShowFormModal] = useState(false);

  // Search filter
  const filteredCustomers = customers.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.phone.includes(q);
  });

  return (
    <PullToRefreshContainer onRefresh={onRefreshData}>
      <div className="space-y-3.5 pb-24">
        {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Cari nama atau nomor telepon pelanggan..."
          className="w-full pl-10 pr-9 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Customer Count Summary */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-100 rounded-xl text-xs text-slate-600 font-medium">
        <span>Total: {filteredCustomers.length} pelanggan</span>
        <button
          onClick={() => {
            setCustomerToEdit(null);
            setShowFormModal(true);
          }}
          className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" />
          Tambah Baru
        </button>
      </div>

      {/* Customers List */}
      {filteredCustomers.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-3">
          <Users className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-slate-600 font-semibold text-sm">Tidak ada pelanggan ditemukan</p>
          <button
            onClick={() => {
              setCustomerToEdit(null);
              setShowFormModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold shadow-xs hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Tambah Pelanggan Sekarang
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2.5">
          {filteredCustomers.map((cust) => {
            // Count total orders for this customer
            const orderCount = transactions.filter((t) => t.customerId === cust.id).length;
            const waPhone = toWhatsAppPhone(cust.phone);

            return (
              <div
                key={cust.id}
                onClick={() => setSelectedCustomer(cust)}
                className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs hover:border-blue-400 transition cursor-pointer flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-black text-sm shrink-0">
                    {cust.name.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-sm text-slate-900 truncate">{cust.name}</h4>
                    <p className="text-xs text-slate-500 truncate flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-400" />
                      {formatPhone(cust.phone)}
                    </p>
                    {cust.address && (
                      <p className="text-[11px] text-slate-400 truncate mt-0.5 max-w-[200px] sm:max-w-md">
                        {cust.address}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] font-bold px-2 py-1 bg-slate-100 text-slate-700 rounded-full">
                    {orderCount} Order
                  </span>

                  <a
                    href={`https://wa.me/${waPhone}`}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="p-2 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition"
                    title="Kirim WhatsApp"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Action Button for Add Customer */}
      <button
        onClick={() => {
          setCustomerToEdit(null);
          setShowFormModal(true);
        }}
        className="fixed bottom-20 right-4 sm:right-8 z-30 flex items-center gap-2 px-5 py-3.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-sm rounded-full shadow-xl transition touch-manipulation"
      >
        <Plus className="w-5 h-5 stroke-[3]" />
        <span className="hidden xs:inline">Pelanggan Baru</span>
      </button>

      {/* Detail Modal */}
      <CustomerDetailModal
        isOpen={!!selectedCustomer}
        onClose={() => setSelectedCustomer(null)}
        customer={selectedCustomer}
        transactions={transactions}
        onEditCustomer={(c) => {
          setCustomerToEdit(c);
          setShowFormModal(true);
        }}
        onSelectTransaction={onSelectTransaction}
      />

      {/* Form Modal */}
      <CustomerFormModal
        isOpen={showFormModal}
        onClose={() => {
          setShowFormModal(false);
          setCustomerToEdit(null);
        }}
        customerToEdit={customerToEdit}
        existingCustomers={customers}
        currentUser={currentUser}
        onSuccess={() => {
          onRefreshData();
        }}
      />
      </div>
    </PullToRefreshContainer>
  );
};
