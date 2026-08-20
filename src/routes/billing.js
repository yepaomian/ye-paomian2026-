const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const { getQuota } = require('../services/quota');

// 账单页面（前端渲染，不验证）
router.get('/', async (req, res, next) => {
    res.render('billing', {
        title: 'Billing & Plans',
        user: null,
        quota: null
    });
});

// 获取用户套餐数据（需要 token 验证）
router.get('/data', requireAuth, async (req, res, next) => {
    try {
        const quota = await getQuota(req.user.id, req.profile.plan);
        res.json({
            user: { email: req.user.email },
            quota: {
                used: quota.used || 0,
                limit: quota.limit || 1,
                remaining: quota.remaining || 0,
                plan: quota.plan || { name: 'Free' }
            }
        });
    } catch (e) {
        next(e);
    }
});

module.exports = router;