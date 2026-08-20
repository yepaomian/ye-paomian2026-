const router = require('express').Router();
const { admin } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { assertCanCreate } = require('../services/quota');
const { flatten, normalize } = require('../services/invoice');

// 新建发票页面（前端渲染，不需要验证）
router.get('/new', async (req, res, next) => {
    res.render('invoice-form', {
        title: 'New Invoice',
        user: null,
        invoice: null
    });
});

// 保存发票（需要 token 验证）
router.post('/', requireAuth, async (req, res, next) => {
    try {
        await assertCanCreate(req.user.id, req.profile.plan);
        const data = req.body;
        const { error } = await admin.from('invoices').insert({
            user_id: req.user.id,
            invoice_number: data.invoice_number || `INV-${Date.now()}`,
            issue_date: data.issue_date || new Date().toISOString().split('T')[0],
            due_date: data.due_date,
            currency: data.currency || 'USD',
            tax_rate: parseFloat(data.tax_rate) || 0,
            discount: parseFloat(data.discount) || 0,
            discount_type: data.discount_type || 'flat',
            status: data.status || 'draft',
            template: data.template || 'classic',
            from_json: {
                name: data.from_name,
                email: data.from_email,
                phone: data.from_phone,
                tax_id: data.from_tax_id,
                address: data.from_address,
                city: data.from_city,
                country: data.from_country
            },
            to_json: {
                name: data.to_name,
                company: data.to_company,
                email: data.to_email,
                city: data.to_city,
                country: data.to_country
            },
            items: data.items || [],
            notes: data.notes
        });
        if (error) throw error;
        res.json({ success: true, message: 'Invoice created' });
    } catch (e) {
        if (e.message && e.message.includes('limit')) {
            return res.status(402).json({ success: false, error: e.message });
        }
        next(e);
    }
});

// 发票列表数据
router.get('/list', requireAuth, async (req, res, next) => {
    try {
        const { data: invoices, error } = await admin
            .from('invoices')
            .select('*')
            .eq('user_id', req.user.id)
            .order('created_at', { ascending: false });
        if (error) throw error;
        const list = (invoices || []).map((row) => {
            const n = normalize(flatten(row));
            return { ...row, ...n };
        });
        res.json({ invoices: list });
    } catch (e) {
        next(e);
    }
});

// 发票详情数据
router.get('/data/:id', requireAuth, async (req, res, next) => {
    try {
        const { data, error } = await admin
            .from('invoices')
            .select('*')
            .eq('id', req.params.id)
            .eq('user_id', req.user.id)
            .single();
        if (error || !data) {
            return res.status(404).json({ success: false, error: 'Invoice not found' });
        }
        const invoice = normalize(flatten(data));
        res.json({ invoice });
    } catch (e) {
        next(e);
    }
});

// 发票详情页面（前端渲染）
router.get('/:id', async (req, res, next) => {
    res.render('invoice-view', {
        title: 'Invoice',
        user: null,
        invoice: null
    });
});

module.exports = router;