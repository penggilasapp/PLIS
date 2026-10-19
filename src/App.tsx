/**
 * PLIS (Penggilas Laundry Information System)
 * Mobile-First Android Material 3 & PWA Laundry Management System
 */

import React, { useEffect, useState } from 'react';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { dbService, onDBChange } from './db/indexedDb';
import { INITIAL_SETTINGS, INITIAL_USERS } from './db/initialData';
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
} from './types';

// Common Components
import { AppNavbar } from './components/common/AppNavbar';
import { BottomNav, MainTab } from './components/common/BottomNav';
import { DeadlineNotificationModal } from './components/common/DeadlineNotificationModal';
import { OfflineIndicator } from './components/common/OfflineIndicator';
import { getUrgentDeadlineTransactions } from './shared/deadline';

// Modules
import { DashboardView } from './components/modules/dashboard/DashboardView';
import { TransactionFormView } from './components/modules/transaksi/TransactionFormView';
import { TransactionListView } from './components/modules/transaksi/TransactionListView';
import { TransactionDetailModal } from './components/modules/transaksi/TransactionDetailModal';
import { CustomerListView } from './components/modules/pelanggan/CustomerListView';
import { ReportView } from './components/modules/laporan/ReportView';
import { ReceiptModal } from './components/modules/nota/ReceiptModal';
import { MoreMenuView, SubMenuType } from './components/modules/lainnya/MoreMenuView';
import { LaundryStatusBoardView } from './components/modules/status-cucian/LaundryStatusBoardView';
import { ExpenseView } from './components/modules/pengeluaran/ExpenseView';
import { ServiceMasterView } from './components/modules/master-layanan/ServiceMasterView';
import { BluetoothPrinterView } from './components/modules/bluetooth/BluetoothPrinterView';
import { CashRecapView } from './components/modules/rekap-kas/CashRecapView';
import { ReceivablesView } from './components/modules/piutang/ReceivablesView';
import { BackupRestoreView } from './components/modules/backup-restore/BackupRestoreView';
import { UserManagementView } from './components/modules/pengguna/UserManagementView';
import { BusinessSettingsView } from './components/modules/pengaturan/BusinessSettingsView';
import { AuditLogView } from './components/modules/audit/AuditLogView';
import { ExportDataView } from './components/modules/ekspor/ExportDataView';

export default function App() {
  const [isReady, setIsReady] = useState(false);

  // Active Navigation
  const [activeTab, setActiveTab] = useState<MainTab>('dashboard');
  const [activeSubView, setActiveSubView] = useState<SubMenuType | null>(null);
  const [isCreatingTransaction, setIsCreatingTransaction] = useState(false);

  // Selected Detail & Receipt Modal
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [receiptTransaction, setReceiptTransaction] = useState<Transaction | null>(null);
  const [showDeadlineModal, setShowDeadlineModal] = useState(false);

  // Domain Entities from IndexedDB
  const [settings, setSettings] = useState<BusinessSettings>(INITIAL_SETTINGS);
  const [users, setUsers] = useState<AppUser[]>(INITIAL_USERS);
  const [currentUser, setCurrentUser] = useState<AppUser>(INITIAL_USERS[0]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [services, setServices] = useState<LaundryService[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [classifications, setClassifications] = useState<ServiceClassification[]>([]);
  const [units, setUnits] = useState<UnitMaster[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  // Load all data from storage
  const reloadData = async () => {
    try {
      const [
        st,
        us,
        tx,
        cs,
        sv,
        ct,
        cl,
        un,
        py,
        ex,
      ] = await Promise.all([
        dbService.getSetting<BusinessSettings>('business_settings', INITIAL_SETTINGS),
        dbService.getAll<AppUser>('users'),
        dbService.getAll<Transaction>('transactions'),
        dbService.getAll<Customer>('customers'),
        dbService.getAll<LaundryService>('services'),
        dbService.getAll<ServiceCategory>('categories'),
        dbService.getAll<ServiceClassification>('classifications'),
        dbService.getAll<UnitMaster>('units'),
        dbService.getAll<PaymentRecord>('payments'),
        dbService.getAll<Expense>('expenses'),
      ]);

      setSettings(st);
      if (us && us.length > 0) {
        setUsers(us);
        // Retain current user if exists
        setCurrentUser((prev) => us.find((u) => u.id === prev.id) || us[0]);
      }
      setTransactions(
        tx.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      );
      setCustomers(
        cs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      );
      setServices(sv);
      setCategories(ct);
      setClassifications(cl);
      setUnits(un);
      setPayments(
        py.sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())
      );
      setExpenses(
        ex.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      );

      // Keep selectedTransaction updated if modal is open
      setSelectedTransaction((prev) => {
        if (!prev) return null;
        return tx.find((t) => t.id === prev.id) || null;
      });
    } catch (err) {
      console.error('Error loading PLIS data', err);
    }
  };

  // On mount: init DB and setup reactive listener
  useEffect(() => {
    dbService.init().then(() => {
      reloadData().then(() => {
        setIsReady(true);
      });
    });

    const unsubscribe = onDBChange(() => {
      reloadData();
    });

    return () => {
      unsubscribe();
    };
  }, []);

  if (!isReady) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-4">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <h2 className="mt-4 font-black text-lg tracking-tight">PLIS LAUNDRY</h2>
        <p className="text-xs text-slate-400 mt-1">Menginisialisasi database IndexedDB...</p>
      </div>
    );
  }

  // Active orders in progress
  const activeOrdersCount = transactions.filter(
    (t) => t.laundryStatus === 'DITERIMA' || t.laundryStatus === 'DIPROSES'
  ).length;

  const unpaidCount = transactions.filter((t) => t.remainingAmount > 0).length;

  // Real-time calculated urgent deadline orders (< 4h or overdue)
  const urgentTransactions = getUrgentDeadlineTransactions(transactions);

  // Title for top navbar
  const getNavbarTitle = () => {
    if (isCreatingTransaction) return 'Buat Transaksi Baru';
    if (activeTab === 'dashboard') return 'Dashboard Ringkasan';
    if (activeTab === 'transaksi') return 'Daftar Transaksi';
    if (activeTab === 'pelanggan') return 'Buku Pelanggan';
    if (activeTab === 'laporan') return 'Laporan & Rekap Kas';
    if (activeTab === 'lainnya') {
      if (!activeSubView) return 'Menu Tambahan';
      switch (activeSubView) {
        case 'status-cucian':
          return 'Status Cucian';
        case 'pengeluaran':
          return 'Buku Pengeluaran';
        case 'bluetooth':
          return 'Printer Bluetooth 58mm';
        case 'rekap-kas':
          return 'Rekap Kas & Laci';
        case 'piutang':
          return 'Buku Piutang';
        case 'master-layanan':
          return 'Master Layanan';
        case 'backup-restore':
          return 'Backup & Restore';
        case 'pengguna':
          return 'Manajemen Pengguna';
        case 'pengaturan':
          return 'Pengaturan Usaha';
        case 'audit':
          return 'Audit Aktivitas';
        case 'ekspor':
          return 'Ekspor Data CSV';
        default:
          return 'Menu Tambahan';
      }
    }
    return 'PLIS Laundry';
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 font-sans flex flex-col antialiased">
      {/* Offline Connectivity Bar */}
      <OfflineIndicator />

      {/* Top Application Bar with Deadline Notification Bell */}
      <AppNavbar
        settings={settings}
        currentUser={currentUser}
        users={users}
        onSwitchUser={(u) => setCurrentUser(u)}
        activeTabTitle={getNavbarTitle()}
        urgentDeadlineCount={urgentTransactions.length}
        onOpenDeadlineModal={() => setShowDeadlineModal(true)}
      />

      {/* Main View Area (Max width optimized for Android mobile & tablet) */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-3 sm:px-4 pt-3.5 pb-20">
        {/* Sub-view Back Header */}
        {(activeSubView || isCreatingTransaction) && (
          <div className="mb-3 flex items-center justify-between">
            <button
              onClick={() => {
                if (isCreatingTransaction) {
                  setIsCreatingTransaction(false);
                } else {
                  setActiveSubView(null);
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
            >
              <ArrowLeft className="w-4 h-4 text-slate-500" />
              <span>Kembali</span>
            </button>

            <span className="text-xs font-bold text-slate-600 truncate">
              {getNavbarTitle()}
            </span>
          </div>
        )}

        {/* 1. NEW TRANSACTION FORM */}
        {isCreatingTransaction ? (
          <TransactionFormView
            customers={customers}
            services={services}
            categories={categories}
            currentUser={currentUser}
            onCancel={() => setIsCreatingTransaction(false)}
            onSuccess={(created) => {
              setIsCreatingTransaction(false);
              setReceiptTransaction(created);
              reloadData();
            }}
          />
        ) : activeTab === 'dashboard' ? (
          /* 2. DASHBOARD VIEW */
          <DashboardView
            transactions={transactions}
            customers={customers}
            payments={payments}
            expenses={expenses}
            urgentTransactions={urgentTransactions}
            onOpenDeadlineModal={() => setShowDeadlineModal(true)}
            onOpenNewTransaction={() => setIsCreatingTransaction(true)}
            onSelectTransaction={(trx) => setSelectedTransaction(trx)}
            onNavigateTab={(tab, subView) => {
              setActiveTab(tab);
              if (subView) {
                setActiveSubView(subView as SubMenuType);
              } else {
                setActiveSubView(null);
              }
            }}
            onRefreshData={reloadData}
          />
        ) : activeTab === 'transaksi' ? (
          /* 3. TRANSAKSI LIST VIEW */
          <TransactionListView
            transactions={transactions}
            onOpenNewTransaction={() => setIsCreatingTransaction(true)}
            onSelectTransaction={(trx) => setSelectedTransaction(trx)}
            onRefreshData={reloadData}
          />
        ) : activeTab === 'pelanggan' ? (
          /* 4. PELANGGAN VIEW */
          <CustomerListView
            customers={customers}
            transactions={transactions}
            currentUser={currentUser}
            onSelectTransaction={(trx) => setSelectedTransaction(trx)}
            onRefreshData={reloadData}
          />
        ) : activeTab === 'laporan' ? (
          /* 5. LAPORAN & REKAP KAS */
          <ReportView
            transactions={transactions}
            payments={payments}
            expenses={expenses}
          />
        ) : (
          /* 6. LAINNYA & SUBVIEWS */
          <>
            {!activeSubView ? (
              <MoreMenuView
                onSelectMenu={(menu) => setActiveSubView(menu)}
                currentUser={currentUser}
                inProcessCount={activeOrdersCount}
                unpaidCount={unpaidCount}
              />
            ) : activeSubView === 'status-cucian' ? (
              <LaundryStatusBoardView
                transactions={transactions}
                currentUser={currentUser}
                settings={settings}
                onSelectTransaction={(trx) => setSelectedTransaction(trx)}
                onRefreshData={reloadData}
              />
            ) : activeSubView === 'pengeluaran' ? (
              <ExpenseView
                expenses={expenses}
                currentUser={currentUser}
                onRefreshData={reloadData}
              />
            ) : activeSubView === 'master-layanan' ? (
              <ServiceMasterView
                services={services}
                categories={categories}
                classifications={classifications}
                units={units}
                currentUser={currentUser}
                onRefreshData={reloadData}
              />
            ) : activeSubView === 'bluetooth' ? (
              <BluetoothPrinterView settings={settings} />
            ) : activeSubView === 'rekap-kas' ? (
              <CashRecapView
                currentUser={currentUser}
                onRefreshData={reloadData}
              />
            ) : activeSubView === 'piutang' ? (
              <ReceivablesView
                transactions={transactions}
                currentUser={currentUser}
                settings={settings}
                onRefreshData={reloadData}
              />
            ) : activeSubView === 'backup-restore' ? (
              <BackupRestoreView
                currentUser={currentUser}
                onRefreshData={reloadData}
              />
            ) : activeSubView === 'pengguna' ? (
              <UserManagementView
                users={users}
                currentUser={currentUser}
                onRefreshData={reloadData}
              />
            ) : activeSubView === 'pengaturan' ? (
              <BusinessSettingsView
                settings={settings}
                currentUser={currentUser}
                onRefreshData={reloadData}
              />
            ) : activeSubView === 'audit' ? (
              <AuditLogView />
            ) : activeSubView === 'ekspor' ? (
              <ExportDataView
                transactions={transactions}
                customers={customers}
                expenses={expenses}
                payments={payments}
              />
            ) : null}
          </>
        )}
      </main>

      {/* Android Material 3 Bottom Navigation Bar */}
      {!isCreatingTransaction && (
        <BottomNav
          activeTab={activeTab}
          onChangeTab={(tab) => {
            setActiveTab(tab);
            setActiveSubView(null);
            setIsCreatingTransaction(false);
          }}
          activeOrderCount={activeOrdersCount}
        />
      )}

      {/* Transaction Detail Modal */}
      <TransactionDetailModal
        isOpen={!!selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
        transaction={selectedTransaction}
        payments={payments}
        services={services}
        currentUser={currentUser}
        settings={settings}
        onOpenReceipt={(trx) => {
          setSelectedTransaction(null);
          setReceiptTransaction(trx);
        }}
        onRefreshData={reloadData}
      />

      {/* Deadline Alert Modal */}
      <DeadlineNotificationModal
        isOpen={showDeadlineModal}
        onClose={() => setShowDeadlineModal(false)}
        urgentTransactions={urgentTransactions}
        settings={settings}
        onSelectTransaction={(trx) => {
          setShowDeadlineModal(false);
          setSelectedTransaction(trx);
        }}
      />

      {/* Receipt & Thermal Print Modal */}
      <ReceiptModal
        isOpen={!!receiptTransaction}
        onClose={() => setReceiptTransaction(null)}
        transaction={receiptTransaction}
        settings={settings}
      />
    </div>
  );
}
