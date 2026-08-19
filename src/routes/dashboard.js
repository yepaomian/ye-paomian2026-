const router = require('express').Router();
const { admin } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { getQuota } = require('../services/quota');
const { flatten, normalize } = require('../services/invoice');

// 仪表板页面 - 返回 JSON 数据
router.get('/data', requireAuth, async (req, res, next) => {
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
                ...row,
                ...n,
            };
        });

        const quota = await getQuota(req.user.id, req.profile.plan);

        res.json({
            user: { email: req.user.email },
            quota: {
                used: quota.used || 0,
                limit: quota.limit || 1,
                remaining: quota.remaining || 0,
                plan: quota.plan || { name: 'Free' }
            },
            invoices: list
        });

    } catch (e) {
        next(e);
    }
});

// 仪表板页面入口 - 渲染 HTML
router.get('/', requireAuth, async (req, res, next) => {
    res.render('dashboard', {
        title: 'Dashboard',
        user: req.user,
        profile: req.profile
    });
});

module.exports = router;