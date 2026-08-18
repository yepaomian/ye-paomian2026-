const router = require('express').Router();
const { admin } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { getQuota } = require('../services/quota');
const { flatten, normalize } = require('../services/invoice');

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { data: invoices, error } = await admin
      .from('invoices')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const list = (invoices || []).map((row) => {
      const n = normalize(flatten(row));
      return {
        id: row.id,
        invoice_number: row.invoice_number,
        status: row.status,
        template: row.template,
        created_at: row.created_at,
        totalFmt: n.totalFmt,
        client: (row.to_json && row.to_json.name) || '—',
      };
    });

    const quota = await getQuota(req.user.id, req.profile.plan);

    res.render('dashboard', {
      title: 'Dashboard',
      invoices: list,
      quota,
    });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
