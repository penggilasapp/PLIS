import { Transaction } from '../types';

export interface DeadlineInfo {
  state: 'OVERDUE' | 'APPROACHING' | 'ON_TRACK' | 'COMPLETED';
  label: string;
  badgeClass: string;
  minutesRemaining: number;
}

/**
 * Calculates deadline status based on estimated completion time
 */
export function getDeadlineInfo(trx: Transaction, targetDate = new Date()): DeadlineInfo {
  if (trx.laundryStatus === 'SELESAI') {
    return {
      state: 'COMPLETED',
      label: 'Selesai',
      badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
      minutesRemaining: 0,
    };
  }

  if (trx.laundryStatus === 'SIAP_DIAMBIL') {
    return {
      state: 'COMPLETED',
      label: 'Siap Diambil di Rak',
      badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      minutesRemaining: 0,
    };
  }

  if (!trx.estimatedCompletionAt) {
    return {
      state: 'ON_TRACK',
      label: 'Estimasi Normal',
      badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
      minutesRemaining: 9999,
    };
  }

  const estTime = new Date(trx.estimatedCompletionAt).getTime();
  const nowTime = targetDate.getTime();
  const diffMs = estTime - nowTime;
  const diffMins = Math.round(diffMs / (1000 * 60));

  if (diffMins < 0) {
    const overdueMins = Math.abs(diffMins);
    const hours = Math.floor(overdueMins / 60);
    const mins = overdueMins % 60;
    const timeText = hours > 0 ? `${hours} jam ${mins} mnt` : `${mins} menit`;

    return {
      state: 'OVERDUE',
      label: `Lewat Tenggat (${timeText})`,
      badgeClass: 'bg-rose-100 text-rose-800 border-rose-300 animate-pulse font-bold',
      minutesRemaining: diffMins,
    };
  }

  // Approaching deadline: less than 4 hours (240 minutes)
  if (diffMins <= 240) {
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    const timeText = hours > 0 ? `${hours}j ${mins}m` : `${mins} menit`;

    return {
      state: 'APPROACHING',
      label: `Mendekati Tenggat (Sisa ${timeText})`,
      badgeClass: 'bg-amber-100 text-amber-900 border-amber-300 font-bold',
      minutesRemaining: diffMins,
    };
  }

  const hours = Math.floor(diffMins / 60);
  return {
    state: 'ON_TRACK',
    label: `Sisa ${hours} jam`,
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    minutesRemaining: diffMins,
  };
}

/**
 * Filter transactions that are approaching deadline or overdue
 */
export function getUrgentDeadlineTransactions(transactions: Transaction[]): Transaction[] {
  return transactions
    .filter((t) => t.laundryStatus === 'DITERIMA' || t.laundryStatus === 'DIPROSES')
    .filter((t) => {
      const info = getDeadlineInfo(t);
      return info.state === 'OVERDUE' || info.state === 'APPROACHING';
    })
    .sort((a, b) => {
      const timeA = new Date(a.estimatedCompletionAt || a.createdAt).getTime();
      const timeB = new Date(b.estimatedCompletionAt || b.createdAt).getTime();
      return timeA - timeB; // Most urgent / overdue first
    });
}
