const CURRENCY_SYMBOLS = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  AUD: 'A$',
  CAD: 'C$',
  JPY: '¥',
  CNY: '¥',
  HKD: 'HK$',
  SGD: 'S$',
  NZD: 'NZ$',
  CHF: 'CHF ',
};

function symbolFor(currency) {
  return CURRENCY_SYMBOLS[currency] || (currency ? `${currency} ` : '');
}

function money(amount, currency) {
  const c = (currency || 'USD').toUpperCase();
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: c }).format(
    Number(amount) || 0
  );
}

// Compute subtotal / discount / tax / total from raw invoice fields.
function compute(invoice) {
  const items = (invoice.items || []).map((it) => {
    const quantity = Number(it.quantity) || 0;
    const rate = Number(it.rate) || 0;
    return { ...it, quantity, rate, amount: quantity * rate };
  });

  const subtotal = items.reduce((sum, it) => sum + it.amount, 0);

  const discount = Number(invoice.discount) || 0;
  const discountType = invoice.discount_type === 'percent' ? 'percent' : 'flat';
  const discountAmount =
    discountType === 'percent' ? (subtotal * discount) / 100 : discount;

  const taxable = Math.max(0, subtotal - discountAmount);
  const taxRate = Number(invoice.tax_rate) || 0;
  const taxAmount = (taxable * taxRate) / 100;
  const total = taxable + taxAmount;

  return {
    ...invoice,
    items,
    subtotal,
    discount,
    discountAmount,
    taxRate,
    taxAmount,
    total,
  };
}

// Flatten a DB row (jsonb columns) into the shape templates expect.
function flatten(row) {
  const from = row.from_json || {};
  const to = row.to_json || {};
  return {
    id: row.id,
    invoice_number: row.invoice_number,
    issue_date: row.issue_date,
    due_date: row.due_date,
    currency: row.currency,
    tax_rate: row.tax_rate,
    discount: row.discount,
    discount_type: row.discount_type,
    status: row.status,
    template: row.template,
    notes: row.notes,
    created_at: row.created_at,
    from: {
      name: from.name,
      email: from.email,
      phone: from.phone,
      address: from.address,
      city: from.city,
      country: from.country,
      taxId: from.taxId,
    },
    to: {
      name: to.name,
      company: to.company,
      email: to.email,
      address: to.address,
      city: to.city,
      country: to.country,
    },
    items: row.items || [],
  };
}

// Fully normalized invoice with computed totals + formatted strings, ready for templates.
function normalize(invoice) {
  const c = compute(invoice);
  const currency = (c.currency || 'USD').toUpperCase();
  const fmt = (n) => money(n, currency);
  const fmtDate = (d) =>
    d
      ? new Date(d).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })
      : '';

  return {
    ...c,
    currency,
    currencySymbol: symbolFor(currency),
    issueDateFmt: fmtDate(c.issue_date),
    dueDateFmt: fmtDate(c.due_date),
    items: c.items.map((it) => ({
      ...it,
      rateFmt: fmt(it.rate),
      amountFmt: fmt(it.amount),
    })),
    subtotalFmt: fmt(c.subtotal),
    discountAmountFmt: fmt(c.discountAmount),
    taxAmountFmt: fmt(c.taxAmount),
    totalFmt: fmt(c.total),
  };
}

function generateInvoiceNumber() {
  const d = new Date();
  const ym = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `INV-${ym}-${rand}`;
}

module.exports = { compute, flatten, normalize, generateInvoiceNumber, money, symbolFor };
