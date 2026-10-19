import { describe, expect, it } from 'vitest';
import {
  addDiscountChip,
  calculateDiscount,
  calculateFinalTotal,
  calculateItemSubtotal,
  calculateOrderEstimatedDuration,
  calculatePaymentDetails,
  calculateQuickDP,
  calculateSubtotal,
  calculateTargetCompletionDate,
  validateInitialPayment,
} from '../shared/calculations';

describe('Transaction Calculations Test Suite', () => {
  describe('Subtotal Calculations', () => {
    it('calculates single item subtotal for integer quantities', () => {
      expect(calculateItemSubtotal(3, 7000)).toBe(21000);
      expect(calculateItemSubtotal(1, 15000)).toBe(15000);
      expect(calculateItemSubtotal(5, 10000)).toBe(50000);
    });

    it('calculates single item subtotal for decimal quantities with rounding', () => {
      // 2.5 kg * Rp 8.000 = Rp 20.000
      expect(calculateItemSubtotal(2.5, 8000)).toBe(20000);
      // 1.75 kg * Rp 7.000 = Rp 12.250
      expect(calculateItemSubtotal(1.75, 7000)).toBe(12250);
      // 3.333 kg * Rp 6.000 = Rp 19.998
      expect(calculateItemSubtotal(3.333, 6000)).toBe(19998);
    });

    it('handles zero or negative item quantities and prices gracefully', () => {
      expect(calculateItemSubtotal(0, 10000)).toBe(0);
      expect(calculateItemSubtotal(-2, 10000)).toBe(0);
      expect(calculateItemSubtotal(2, 0)).toBe(0);
      expect(calculateItemSubtotal(2, -5000)).toBe(0);
    });

    it('calculates total subtotal across multiple items', () => {
      const items = [
        { quantity: 3.5, pricePerUnit: 8000 }, // 28.000
        { quantity: 2, pricePerUnit: 15000 },   // 30.000
        { quantity: 1, pricePerUnit: 25000 },   // 25.000
      ];
      // Total = 28000 + 30000 + 25000 = 83000
      expect(calculateSubtotal(items)).toBe(83000);
    });

    it('returns 0 subtotal when item list is empty', () => {
      expect(calculateSubtotal([])).toBe(0);
    });
  });

  describe('Discount Logic', () => {
    const subtotal = 50000;

    it('applies standard discount correctly', () => {
      expect(calculateDiscount(subtotal, 10000)).toBe(10000);
      expect(calculateFinalTotal(subtotal, 10000)).toBe(40000);
    });

    it('clamps discount so it cannot exceed subtotal', () => {
      // User inputs Rp 75.000 discount on a Rp 50.000 order
      expect(calculateDiscount(subtotal, 75000)).toBe(50000);
      expect(calculateFinalTotal(subtotal, 75000)).toBe(0);
    });

    it('prevents negative discount inputs and clamps to 0', () => {
      expect(calculateDiscount(subtotal, -5000)).toBe(0);
      expect(calculateFinalTotal(subtotal, -5000)).toBe(50000);
    });

    it('handles non-numeric or empty string discount safely', () => {
      expect(calculateDiscount(subtotal, NaN)).toBe(0);
      expect(calculateDiscount(subtotal, '')).toBe(0);
      expect(calculateFinalTotal(subtotal, '')).toBe(50000);
    });

    it('handles zero subtotal correctly', () => {
      expect(calculateDiscount(0, 5000)).toBe(0);
      expect(calculateFinalTotal(0, 5000)).toBe(0);
    });

    it('supports quick discount chips without exceeding subtotal', () => {
      let currentDiscount = 0;
      // Add +5.000 chip
      currentDiscount = addDiscountChip(currentDiscount, 5000, subtotal);
      expect(currentDiscount).toBe(5000);

      // Add +10.000 chip
      currentDiscount = addDiscountChip(currentDiscount, 10000, subtotal);
      expect(currentDiscount).toBe(15000);

      // Add +50.000 chip (would be 65.000, clamped to 50.000)
      currentDiscount = addDiscountChip(currentDiscount, 50000, subtotal);
      expect(currentDiscount).toBe(50000);
    });
  });

  describe('Remaining Balance & Payment Status Updates', () => {
    const finalTotal = 60000;

    it('updates balance when no payment is entered (BELUM_DIBAYAR)', () => {
      const result = calculatePaymentDetails(finalTotal, 0);
      expect(result.enteredPayment).toBe(0);
      expect(result.remainingAmount).toBe(60000);
      expect(result.isFullyPaid).toBe(false);
      expect(result.paymentStatus).toBe('BELUM_DIBAYAR');
    });

    it('updates balance for partial payment / DP (SEBAGIAN)', () => {
      const result = calculatePaymentDetails(finalTotal, 25000);
      expect(result.enteredPayment).toBe(25000);
      expect(result.remainingAmount).toBe(35000);
      expect(result.isFullyPaid).toBe(false);
      expect(result.paymentStatus).toBe('SEBAGIAN');
    });

    it('updates balance for full payment (LUNAS)', () => {
      const result = calculatePaymentDetails(finalTotal, 60000);
      expect(result.enteredPayment).toBe(60000);
      expect(result.remainingAmount).toBe(0);
      expect(result.isFullyPaid).toBe(true);
      expect(result.paymentStatus).toBe('LUNAS');
    });

    it('detects overpayment and sets isOverpaid flag', () => {
      const result = calculatePaymentDetails(finalTotal, 70000);
      expect(result.enteredPayment).toBe(70000);
      expect(result.remainingAmount).toBe(0);
      expect(result.isOverpaid).toBe(true);
      expect(result.overpaidAmount).toBe(10000);
      expect(result.paymentStatus).toBe('LUNAS');
    });

    it('validates initial payment to prevent overpayment during order creation', () => {
      const validPay = validateInitialPayment(finalTotal, 30000);
      expect(validPay.isValid).toBe(true);
      expect(validPay.errorMessage).toBeUndefined();

      const exactPay = validateInitialPayment(finalTotal, 60000);
      expect(exactPay.isValid).toBe(true);

      const invalidPay = validateInitialPayment(finalTotal, 65000);
      expect(invalidPay.isValid).toBe(false);
      expect(invalidPay.errorMessage).toBe('Pembayaran awal tidak boleh melebihi total tagihan!');
    });

    it('calculates quick DP (50%) accurately', () => {
      expect(calculateQuickDP(60000, 50)).toBe(30000);
      expect(calculateQuickDP(35000, 50)).toBe(17500);
      expect(calculateQuickDP(15233, 50)).toBe(7617);
    });

    it('handles zero total order correctly (LUNAS by default)', () => {
      const result = calculatePaymentDetails(0, 0);
      expect(result.enteredPayment).toBe(0);
      expect(result.remainingAmount).toBe(0);
      expect(result.isFullyPaid).toBe(true);
      expect(result.paymentStatus).toBe('LUNAS');
    });
  });

  describe('Order Estimation Logic (Automatic from Master Layanan)', () => {
    const mockServices = [
      { id: 'SRV-EXP-4', name: 'Cuci Express 4 Jam', estimatedDurationHours: 4 },
      { id: 'SRV-KILAT-24', name: 'Cuci Kilat 1 Hari', estimatedDurationHours: 24 },
      { id: 'SRV-REG-48', name: 'Cuci Reguler 2 Hari', estimatedDurationHours: 48 },
      { id: 'SRV-BEDCOVER-72', name: 'Cuci Bedcover 3 Hari', estimatedDurationHours: 72 },
    ];

    it('returns default 24h when items list is empty', () => {
      const result = calculateOrderEstimatedDuration([], mockServices);
      expect(result.durationHours).toBe(24);
      expect(result.formattedDuration).toBe('24 Jam (1 Hari)');
    });

    it('determines duration from single express service', () => {
      const items = [{ serviceId: 'SRV-EXP-4', serviceName: 'Cuci Express 4 Jam' }];
      const result = calculateOrderEstimatedDuration(items, mockServices);
      expect(result.durationHours).toBe(4);
      expect(result.longestServiceName).toBe('Cuci Express 4 Jam');
      expect(result.formattedDuration).toBe('4 Jam');
    });

    it('determines duration from single regular service (48 Jam / 2 Hari)', () => {
      const items = [{ serviceId: 'SRV-REG-48', serviceName: 'Cuci Reguler 2 Hari' }];
      const result = calculateOrderEstimatedDuration(items, mockServices);
      expect(result.durationHours).toBe(48);
      expect(result.longestServiceName).toBe('Cuci Reguler 2 Hari');
      expect(result.formattedDuration).toBe('48 Jam (2 Hari)');
    });

    it('automatically picks the longest turnaround duration when order has multiple mixed items', () => {
      // Cart contains: Express 4h + Reguler 48h + Bedcover 72h
      // Order completion must wait for Bedcover 72h!
      const items = [
        { serviceId: 'SRV-EXP-4', serviceName: 'Cuci Express 4 Jam' },
        { serviceId: 'SRV-REG-48', serviceName: 'Cuci Reguler 2 Hari' },
        { serviceId: 'SRV-BEDCOVER-72', serviceName: 'Cuci Bedcover 3 Hari' },
      ];
      const result = calculateOrderEstimatedDuration(items, mockServices);
      expect(result.durationHours).toBe(72);
      expect(result.longestServiceName).toBe('Cuci Bedcover 3 Hari');
      expect(result.formattedDuration).toBe('72 Jam (3 Hari)');
    });

    it('calculates target completion Date accurately from start time', () => {
      const baseDate = new Date('2026-10-19T10:00:00.000Z');
      const target4h = calculateTargetCompletionDate(4, baseDate);
      expect(target4h.toISOString()).toBe('2026-10-19T14:00:00.000Z');

      const target24h = calculateTargetCompletionDate(24, baseDate);
      expect(target24h.toISOString()).toBe('2026-10-20T10:00:00.000Z');

      const target48h = calculateTargetCompletionDate(48, baseDate);
      expect(target48h.toISOString()).toBe('2026-10-21T10:00:00.000Z');
    });
  });
});
