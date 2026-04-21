/**
 * Order financials: subtotal (sum of lines) → tax 10% + flat shipping.
 * Single place so cart + checkout stay in sync.
 */
const TAX_RATE = 0.1;
const SHIPPING_FLAT_PKR = 200;

function roundMoney(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

/**
 * @param {number} lineItemsSubtotal - sum of order line totals (before tax/shipping)
 */
function computeOrderAmounts(lineItemsSubtotal) {
  const subtotal = roundMoney(lineItemsSubtotal);
  const taxAmount = roundMoney(subtotal * TAX_RATE);
  const shippingCost = SHIPPING_FLAT_PKR;
  const totalAmount = roundMoney(subtotal + taxAmount + shippingCost);
  return {
    subtotal,
    taxAmount,
    shippingCost,
    totalAmount,
  };
}

module.exports = {
  computeOrderAmounts,
  TAX_RATE,
  SHIPPING_FLAT_PKR,
};
