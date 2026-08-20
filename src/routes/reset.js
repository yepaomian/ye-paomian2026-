const router = require('express').Router();
const { supabase } = require('../db');

// 显示重置密码页面
router.get('/', (req, res) => {
    res.render('reset', { title: 'Reset Password', message: null, error: null });
});

// 发送重置邮件
router.post('/', async (req, res, next) => {
    try {
        const email = req.body.email;
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: 'https://ye-paomian2026.vercel.app/update-password'
        });

        if (error) {
            return res.render('reset', {
                title: 'Reset Password',
                error: error.message,
                message: null
            });
        }

        res.render('reset', {
            title: 'Reset Password',
            message: 'Check your email for a password reset link.',
            error: null
        });

    } catch (e) {
        next(e);
    }
});

module.exports = router;