/**
 * PLIS Laundry Formatters
 */

import { LaundryStatus, PaymentMethod, PaymentStatus } from '../types';

export function formatCurrency(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return 'Rp 0';
  }
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateString: string | undefined | null, withTime = true): string {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '-';

    const day = d.getDate();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const month = months[d.getMonth()];
    const year = d.getFullYear();

    if (!withTime) {
      return `${day} ${month} ${year}`;
    }

    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day} ${month} ${year}, ${hours}:${minutes}`;
  } catch {
    return '-';
  }
}

export function formatTimeOnly(dateString: string | undefined | null): string {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '-';
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  } catch {
    return '-';
  }
}

export function formatPhone(phone: string | undefined | null): string {
  if (!phone) return '-';
  const clean = phone.replace(/\D/g, '');
  if (clean.startsWith('08')) {
    return `08${clean.slice(2, 5)}-${clean.slice(5, 9)}-${clean.slice(9)}`;
  }
  return phone;
}

export function toWhatsAppPhone(phone: string): string {
  let clean = phone.replace(/\D/g, '');
  if (clean.startsWith('0')) {
    clean = '62' + clean.slice(1);
  } else if (!clean.startsWith('62')) {
    clean = '62' + clean;
  }
  return clean;
}

export function getLaundryStatusDetails(status: LaundryStatus) {
  switch (status) {
    case 'DITERIMA':
      return {
        label: 'Diterima',
        color: 'text-amber-800 bg-amber-100 border-amber-300',
        badgeBg: 'bg-amber-500',
        step: 1,
        description: 'Cucian telah diterima dan masuk antrean',
      };
    case 'DIPROSES':
      return {
        label: 'Diproses',
        color: 'text-blue-800 bg-blue-100 border-blue-300',
        badgeBg: 'bg-blue-600',
        step: 2,
        description: 'Sedang dicuci, dikeringkan, atau disetrika',
      };
    case 'SIAP_DIAMBIL':
      return {
        label: 'Siap Diambil',
        color: 'text-emerald-800 bg-emerald-100 border-emerald-300',
        badgeBg: 'bg-emerald-600',
        step: 3,
        description: 'Selesai di-packing dan siap diserahkan ke pelanggan',
      };
    case 'SELESAI':
      return {
        label: 'Selesai / Diserahkan',
        color: 'text-slate-800 bg-slate-100 border-slate-300',
        badgeBg: 'bg-slate-600',
        step: 4,
        description: 'Pakaian telah diambil oleh pelanggan',
      };
    default:
      return {
        label: status,
        color: 'text-gray-800 bg-gray-100 border-gray-300',
        badgeBg: 'bg-gray-500',
        step: 1,
        description: '',
      };
  }
}

export function getPaymentStatusDetails(status: PaymentStatus) {
  switch (status) {
    case 'LUNAS':
      return {
        label: 'Lunas',
        color: 'text-emerald-800 bg-emerald-100 border-emerald-300',
        icon: 'check',
      };
    case 'SEBAGIAN':
      return {
        label: 'Sebagian (DP)',
        color: 'text-amber-800 bg-amber-100 border-amber-300',
        icon: 'clock',
      };
    case 'BELUM_DIBAYAR':
      return {
        label: 'Belum Lunas',
        color: 'text-rose-800 bg-rose-100 border-rose-300',
        icon: 'alert-circle',
      };
    default:
      return {
        label: status,
        color: 'text-gray-800 bg-gray-100 border-gray-300',
        icon: 'help',
      };
  }
}

export function getPaymentMethodLabel(method: PaymentMethod): string {
  switch (method) {
    case 'TUNAI':
      return 'Tunai (Cash)';
    case 'QRIS':
      return 'QRIS';
    case 'TRANSFER_BANK':
      return 'Transfer Bank';
    case 'E_WALLET':
      return 'E-Wallet';
    default:
      return method;
  }
}
