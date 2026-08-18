const router = require('express').Router();
const { admin } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { assertCanCreate } = require('../services/quota');
const { flatten, normalize, generateInvoiceNumber } = require('../services/invoice');
const { generatePdf } = require('../services/pdf');

const TEMPLATES = ['1', '2', '3', '4'];
const STATUSES = ['draft', 'sent', 'paid'];

function parseInvoice(body) {
  const rawItems = Array.isArray(body.items) ? body.items : [];
  const items = rawItems
    .filter((it) => it && (it.description || it.quantity))
    .map((it) => ({
      description: String(it.description || '').trim(),
      quantity: Number(it.quantity) || 0,
      rate: Number(it.rate) || 0,
    }));

  return {
    invoice_number:
      String(body.invoice_number || '').trim() || generateInvoiceNumber(),
    issue_date: body.issue_date || null,
    due_date: body.due_date || null,
    currency: String(body.currency || 'USD').toUpperCase(),
    tax_rate: Number(body.tax_rate) || 0,
    discount: Number(body.discount) || 0,
    discount_type: body.discount_type === 'percent' ? 'percent' : 'flat',
    status: STATUSES.includes(body.status) ? body.status : 'draft',
    template: TEMPLATES.includes(body.template) ? body.template : '1',
    from_json: {
      name: body.from_name,
      email: body.from_email,
      phone: body.from_phone,
      address: body.from_address,
      city: body.from_city,
      country: body.from_country,
      taxId: body.from_tax_id,
    },
    to_json: {
      name: body.to_name,
      company: body.to_company,
      email: body.to_email,
      address: body.to_address,
      city: body.to_city,
      country: body.to_country,
    },
    items,
    notes: body.notes || '',
  };
}

function emptyInvoice() {
  return {
    invoice_number: '',
    issue_date: new Date().toISOString().slice(0, 10),
    due_date: '',
    currency: 'USD',
    tax_rate: '',
    discount: '',
    discount_type: 'flat',
    status: 'draft',
    template: '1',
    from: { name: '', email: '', phone: '', address: '', city: '', country: '', taxId: '' },
    to: { name: '', company: '', email: '', address: '', city: '', country: '' },
    items: [{ description: '', quantity: 1, rate: '' }],
    notes: '',
  };
}

async function getOwnedInvoice(req, res) {
  const { data, error } = await admin
    .from('invoices')
    .select('*')
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    const err = new Error('Invoice not found.');
    err.status = 404;
    throw err;
  }
  return data;
}

router.get('/new', requireAuth, (req, res) => {
  res.render('invoice-form', {
    title: 'New invoice',
    invoice: emptyInvoice(),
    mode: 'create',
  });
});

router.post('/', requireAuth, async (req, res, next) => {
  try {
    await assertCanCreate(req.user.id, req.profile.plan);
    const invoice = parseInvoice(req.body);
    const { data, error } = await admin
      .from('invoices')
      .insert({ ...invoice, user_id: req.user.id })
      .select()
      .single();
    if (error) throw error;
    req.session.flash = { type: 'success', message: 'Invoice created.' };
    return res.redirect(`/invoices/${data.id}`);
  } catch (e) {
    if (e.status === 402) {
      req.session.flash = { type: 'error', message: e.message };
      return res.redirect('/billing');
    }
    next(e);
  }
});

router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const row = await getOwnedInvoice(req, res);
    const invoice = normalize(flatten(row));
    res.render('invoice-view', {
      title: `Invoice ${row.invoice_number}`,
      invoice,
    });
  } catch (e) {
    next(e);
  }
});

router.get('/:id/edit', requireAuth, async (req, res, next) => {
  try {
    const row = await getOwnedInvoice(req, res);
    res.render('invoice-form', {
      title: `Edit ${row.invoice_number}`,
      invoice: flatten(row),
      mode: 'edit',
    });
  } catch (e) {
    next(e);
  }
});

router.post('/:id/update', requireAuth, async (req, res, next) => {
  try {
    await getOwnedInvoice(req, res);
    const invoice = parseInvoice(req.body);
    const { data, error } = await admin
      .from('invoices')
      .update({ ...invoice, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .select()
      .single();
    if (error) throw error;
    req.session.flash = { type: 'success', message: 'Invoice updated.' };
    return res.redirect(`/invoices/${data.id}`);
  } catch (e) {
    next(e);
  }
});

router.post('/:id/delete', requireAuth, async (req, res, next) => {
  try {
    await getOwnedInvoice(req, res);
    const { error } = await admin
      .from('invoices')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user.id);
    if (error) throw error;
    req.session.flash = { type: 'success', message: 'Invoice deleted.' };
    return res.redirect('/dashboard');
  } catch (e) {
    next(e);
  }
});

router.get('/:id/pdf', requireAuth, async (req, res, next) => {
  try {
    const row = await getOwnedInvoice(req, res);
    const pdf = await generatePdf(flatten(row));
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${row.invoice_number}.pdf"`
    );
    return res.send(Buffer.from(pdf));
  } catch (e) {
    next(e);
  }
});

module.exports = router;
