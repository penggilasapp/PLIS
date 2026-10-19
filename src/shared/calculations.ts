import { PaymentStatus } from '../types';

export interface CalculationItemInput {
  quantity: number;
  pricePerUnit: number;
}

export interface PaymentCalculationResult {
  enteredPayment: number;
  remainingAmount: number;
  isFullyPaid: boolean;
  isOverpaid: boolean;
  overpaidAmount: number;
  paymentStatus: PaymentStatus;
}

/**
 * Calculates subtotal for an individual transaction item.
 * Supports decimal quantities (e.g. 2.5 kg) and rounds to nearest whole Rupiah.
 */
export function calculateItemSubtotal(quantity: number, pricePerUnit: number): number {
  if (!quantity || quantity <= 0 || !pricePerUnit || pricePerUnit <= 0) {
    return 0;
  }
  return Math.round(quantity * pricePerUnit);
}

/**
 * Calculates total subtotal across all transaction items in the cart/draft.
 */
export function calculateSubtotal(items: CalculationItemInput[]): number {
  if (!items || items.length === 0) {
    return 0;
  }
  return items.reduce((acc, it) => acc + calculateItemSubtotal(it.quantity, it.pricePerUnit), 0);
}

/**
 * Validates and clamps discount nominal.
 * - Minimum: 0
 * - Maximum: cannot exceed subtotal (discount <= subtotal)
 * - Prevents negative values and handles invalid/NaN inputs safely.
 */
export function calculateDiscount(subtotal: number, discountInput: number | string): number {
  const safeSubtotal = Math.max(0, subtotal || 0);
  const parsed = typeof discountInput === 'string' ? parseFloat(discountInput) : discountInput;
  const num = isNaN(parsed) || !isFinite(parsed) ? 0 : Math.floor(parsed);

  if (num <= 0) return 0;
  return Math.min(num, safeSubtotal);
}

/**
 * Computes final payable total after applying clamped discount.
 * Final amount is guaranteed >= 0.
 */
export function calculateFinalTotal(subtotal: number, discount: number | string): number {
  const safeSubtotal = Math.max(0, subtotal || 0);
  const clampedDiscount = calculateDiscount(safeSubtotal, discount);
  return Math.max(0, safeSubtotal - clampedDiscount);
}

/**
 * Computes remaining balance, payment status, and overpayment detection.
 */
export function calculatePaymentDetails(
  finalTotal: number,
  paymentInput: number | string
): PaymentCalculationResult {
  const safeTotal = Math.max(0, finalTotal || 0);
  const parsed = typeof paymentInput === 'string' ? parseFloat(paymentInput) : paymentInput;
  const enteredPayment = isNaN(parsed) || !isFinite(parsed) || parsed < 0 ? 0 : Math.round(parsed);

  const isOverpaid = enteredPayment > safeTotal;
  const overpaidAmount = isOverpaid ? enteredPayment - safeTotal : 0;
  const remainingAmount = Math.max(0, safeTotal - enteredPayment);
  const isFullyPaid = enteredPayment >= safeTotal;

  let paymentStatus: PaymentStatus = 'BELUM_DIBAYAR';
  if (safeTotal === 0 || isFullyPaid) {
    paymentStatus = 'LUNAS';
  } else if (enteredPayment > 0) {
    paymentStatus = 'SEBAGIAN';
  }

  return {
    enteredPayment,
    remainingAmount,
    isFullyPaid,
    isOverpaid,
    overpaidAmount,
    paymentStatus,
  };
}

/**
 * Calculates preset Down Payment (DP) amount (default 50%).
 */
export function calculateQuickDP(finalTotal: number, percentage = 50): number {
  const safeTotal = Math.max(0, finalTotal || 0);
  return Math.round((safeTotal * percentage) / 100);
}

/**
 * Adds quick discount chip nominal while preventing discount from exceeding subtotal.
 */
export function addDiscountChip(
  currentDiscount: number,
  chipAmount: number,
  subtotal: number
): number {
  const safeCurrent = Math.max(0, currentDiscount || 0);
  const safeChip = Math.max(0, chipAmount || 0);
  return calculateDiscount(subtotal, safeCurrent + safeChip);
}

/**
 * Validates initial payment during checkout.
 * Returns error if user attempts to enter initial payment exceeding the final total bill.
 */
export function validateInitialPayment(
  finalTotal: number,
  enteredPayment: number | string
): { isValid: boolean; errorMessage?: string } {
  const { isOverpaid } = calculatePaymentDetails(finalTotal, enteredPayment);
  if (isOverpaid) {
    return {
      isValid: false,
      errorMessage: 'Pembayaran awal tidak boleh melebihi total tagihan!',
    };
  }
  return { isValid: true };
}
