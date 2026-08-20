const router = require('express').Router();
const { admin } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { flatten, normalize } = require('../services/invoice');

router.get('/', requireAuth, async (req, res, next) => {
    try {
        const { data: invoices, error } = await admin
            .from('invoices')
            .select('*')
            .not('deleted_at', 'is', null)
            .eq('user_id', req.user.id)
            .order('deleted_at', { ascending: false });

        if (error) throw error;

        const list = (invoices || []).map((row) => {
            const n = normalize(flatten(row));
            return { ...row, ...n };
        });

        res.render('trash', {
            title: 'Recycle Bin',
            invoices: list,
            user: req.user
        });

    } catch (e) {
        next(e);
    }
});

router.post('/restore/:id', requireAuth, async (req, res, next) => {
    try {
        const { error } = await admin
            .from('invoices')
            .update({ deleted_at: null })
            .eq('id', req.params.id)
            .eq('user_id', req.user.id);

        if (error) throw error;
        res.json({ success: true, message: 'Invoice restored' });

    } catch (e) {
        next(e);
    }
});

router.delete('/permanent/:id', requireAuth, async (req, res, next) => {
    try {
        const { error } = await admin
            .from('invoices')
            .delete()
            .eq('id', req.params.id)
            .eq('user_id', req.user.id);

        if (error) throw error;
        res.json({ success: true, message: 'Invoice permanently deleted' });

    } catch (e) {
        next(e);
    }
});

module.exports = router;