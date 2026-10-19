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
  CalculationItemInput,
  validateInitialPayment,
} from '../shared/calculations';

interface MockCartState {
  items: Array<CalculationItemInput & { name: string }>;
  discount: number;
  paymentAmount: string;
}

function computeCartSummary(state: MockCartState) {
  const subtotal = calculateSubtotal(state.items);
  const clampedDiscount = calculateDiscount(subtotal, state.discount);
  const finalTotal = calculateFinalTotal(subtotal, clampedDiscount);
  const paymentDetails = calculatePaymentDetails(finalTotal, state.paymentAmount);
  const validation = validateInitialPayment(finalTotal, state.paymentAmount);

  return {
    subtotal,
    discount: clampedDiscount,
    finalTotal,
    paymentDetails,
    validation,
  };
}

describe('TransactionFormView User Workflow Simulations', () => {
  it('simulates a full customer order workflow from item addition to full cash payment', () => {
    const cart: MockCartState = {
      items: [],
      discount: 0,
      paymentAmount: '0',
    };

    // 1. Initial empty cart
    let summary = computeCartSummary(cart);
    expect(summary.subtotal).toBe(0);
    expect(summary.finalTotal).toBe(0);
    expect(summary.paymentDetails.remainingAmount).toBe(0);

    // 2. Add Cuci Komplit Reguler: 4.5 kg @ Rp 8.000/kg
    cart.items.push({
      name: 'Cuci Komplit Reguler',
      quantity: 4.5,
      pricePerUnit: 8000,
    });
    summary = computeCartSummary(cart);
    expect(summary.subtotal).toBe(36000);
    expect(summary.finalTotal).toBe(36000);
    expect(summary.paymentDetails.remainingAmount).toBe(36000);
    expect(summary.paymentDetails.paymentStatus).toBe('BELUM_DIBAYAR');

    // 3. Add Bedcover Besar: 1 pcs @ Rp 25.000/pcs
    cart.items.push({
      name: 'Bedcover Besar',
      quantity: 1,
      pricePerUnit: 25000,
    });
    summary = computeCartSummary(cart);
    // Subtotal = 36.000 + 25.000 = 61.000
    expect(summary.subtotal).toBe(61000);
    expect(summary.finalTotal).toBe(61000);
    expect(summary.paymentDetails.remainingAmount).toBe(61000);

    // 4. Kasir clicks "+Rp 5.000" and "+Rp 10.000" promo chips
    cart.discount = addDiscountChip(cart.discount, 5000, summary.subtotal);
    cart.discount = addDiscountChip(cart.discount, 10000, summary.subtotal);
    expect(cart.discount).toBe(15000);

    summary = computeCartSummary(cart);
    // Final Total = 61.000 - 15.000 = 46.000
    expect(summary.finalTotal).toBe(46000);
    expect(summary.paymentDetails.remainingAmount).toBe(46000);

    // 5. Kasir clicks "Bayar Lunas" button
    cart.paymentAmount = summary.finalTotal.toString();
    summary = computeCartSummary(cart);
    expect(summary.paymentDetails.enteredPayment).toBe(46000);
    expect(summary.paymentDetails.remainingAmount).toBe(0);
    expect(summary.paymentDetails.isFullyPaid).toBe(true);
    expect(summary.paymentDetails.paymentStatus).toBe('LUNAS');
    expect(summary.validation.isValid).toBe(true);
  });

  it('simulates DP 50% partial payment workflow and remaining balance calculation', () => {
    const cart: MockCartState = {
      items: [
        { name: 'Cuci Selimut Tebal', quantity: 2, pricePerUnit: 20000 }, // 40.000
        { name: 'Cuci Jas / Blazer', quantity: 2, pricePerUnit: 35000 },  // 70.000
      ],
      discount: 10000,
      paymentAmount: '0',
    };

    let summary = computeCartSummary(cart);
    // Subtotal = 110.000, Discount = 10.000, Final Total = 100.000
    expect(summary.subtotal).toBe(110000);
    expect(summary.discount).toBe(10000);
    expect(summary.finalTotal).toBe(100000);

    // Click "DP 50%" button
    const dpAmount = calculateQuickDP(summary.finalTotal, 50);
    expect(dpAmount).toBe(50000);
    cart.paymentAmount = dpAmount.toString();

    summary = computeCartSummary(cart);
    expect(summary.paymentDetails.enteredPayment).toBe(50000);
    expect(summary.paymentDetails.remainingAmount).toBe(50000);
    expect(summary.paymentDetails.isFullyPaid).toBe(false);
    expect(summary.paymentDetails.paymentStatus).toBe('SEBAGIAN');
    expect(summary.validation.isValid).toBe(true);

    // Customer decides to pay Rp 70.000 DP instead
    cart.paymentAmount = '70000';
    summary = computeCartSummary(cart);
    expect(summary.paymentDetails.enteredPayment).toBe(70000);
    expect(summary.paymentDetails.remainingAmount).toBe(30000);
    expect(summary.paymentDetails.paymentStatus).toBe('SEBAGIAN');
    expect(summary.validation.isValid).toBe(true);
  });

  it('correctly recalculates when an item is removed from the cart', () => {
    const cart: MockCartState = {
      items: [
        { name: 'Item A', quantity: 1, pricePerUnit: 20000 },
        { name: 'Item B', quantity: 1, pricePerUnit: 30000 },
      ],
      discount: 25000,
      paymentAmount: '15000',
    };

    let summary = computeCartSummary(cart);
    // Subtotal = 50.000, Discount = 25.000, Final = 25.000, Paid = 15.000, Remaining = 10.000
    expect(summary.subtotal).toBe(50000);
    expect(summary.finalTotal).toBe(25000);
    expect(summary.paymentDetails.remainingAmount).toBe(10000);

    // Remove Item B (Rp 30.000)
    cart.items.splice(1, 1);
    // Subtotal becomes 20.000. Discount 25.000 must be clamped to 20.000!
    summary = computeCartSummary(cart);
    expect(summary.subtotal).toBe(20000);
    expect(summary.discount).toBe(20000); // clamped to new subtotal
    expect(summary.finalTotal).toBe(0);
    // If paid was 15.000 but total is now 0, overpayment is detected
    expect(summary.paymentDetails.isOverpaid).toBe(true);
    expect(summary.validation.isValid).toBe(false);
  });

  it('rejects initial payment exceeding total tagihan', () => {
    const cart: MockCartState = {
      items: [{ name: 'Gordyn Tipis', quantity: 5, pricePerUnit: 10000 }], // 50.000
      discount: 0,
      paymentAmount: '55000', // exceeds 50.000
    };

    const summary = computeCartSummary(cart);
    expect(summary.finalTotal).toBe(50000);
    expect(summary.paymentDetails.enteredPayment).toBe(55000);
    expect(summary.validation.isValid).toBe(false);
    expect(summary.validation.errorMessage).toContain('tidak boleh melebihi');
  });

  it('automatically calculates turnaround estimation from selected services without manual input', () => {
    const services = [
      { id: 'S1', name: 'Cuci Kilat 1 Hari', estimatedDurationHours: 24 },
      { id: 'S2', name: 'Cuci Bedcover 3 Hari', estimatedDurationHours: 72 },
    ];

    // 1. Initial order with 1 service (24h)
    let estimation = calculateOrderEstimatedDuration([{ serviceId: 'S1' }], services);
    expect(estimation.durationHours).toBe(24);
    expect(estimation.longestServiceName).toBe('Cuci Kilat 1 Hari');

    // 2. Add second service requiring longer turnaround (72h) - order follows the longest service
    estimation = calculateOrderEstimatedDuration(
      [{ serviceId: 'S1' }, { serviceId: 'S2' }],
      services
    );
    expect(estimation.durationHours).toBe(72);
    expect(estimation.longestServiceName).toBe('Cuci Bedcover 3 Hari');
    expect(estimation.formattedDuration).toBe('72 Jam (3 Hari)');
  });
});
