const router = require('express').Router();
const { supabase } = require('../db');
const { getOrCreateProfile } = require('../services/profile');
const { optionalAuth } = require('../middleware/auth');

// ========== 注册页面 ==========
router.get('/register', optionalAuth, (req, res) => {
    if (req.user) return res.redirect('/dashboard');
    res.render('register', { title: 'Sign up', values: {} });
});

// ========== 注册提交 ==========
router.post('/register', async (req, res, next) => {
    try {
        const email = String(req.body.email || '').trim();
        const password = String(req.body.password || '');

        if (!email || password.length < 6) {
            req.session.flash = {
                type: 'error',
                message: 'Please provide a valid email and a password of at least 6 characters.'
            };
            return res.redirect('/register');
        }

        const { data, error } = await supabase.auth.signUp({ email, password });

        if (error) {
            req.session.flash = { type: 'error', message: error.message };
            return res.redirect('/register');
        }

        if (data.user) {
            await getOrCreateProfile(data.user.id, data.user.email);
        }

        if (data.session) {
            req.session.accessToken = data.session.access_token;
            req.session.refreshToken = data.session.refresh_token;
            req.session.flash = { type: 'success', message: 'Welcome! Your account is ready.' };
            req.session.save((err) => {
                if (err) console.error('Session save error:', err);
                return res.redirect('/dashboard');
            });
            return;
        }

        req.session.flash = {
            type: 'info',
            message: 'Check your email to confirm your account, then log in.'
        };
        return res.redirect('/login');

    } catch (e) {
        next(e);
    }
});

// ========== 登录页面 ==========
router.get('/login', optionalAuth, (req, res) => {
    if (req.user) return res.redirect('/dashboard');
    res.render('login', { title: 'Log in', values: {} });
});

// ========== 登录提交 ==========
router.post('/login', async (req, res, next) => {
    try {
        const email = String(req.body.email || '').trim();
        const password = String(req.body.password || '');

        const { data, error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
            req.session.flash = { type: 'error', message: 'Invalid email or password.' };
            return res.redirect('/login');
        }

        // 调试日志：看登录返回的数据里到底有什么
        console.error('🔐 登录返回的数据:', JSON.stringify(data));

        req.session.accessToken = data.session.access_token;
        req.session.refreshToken = data.session.refresh_token;
        await getOrCreateProfile(data.user.id, data.user.email);

        req.session.flash = { type: 'success', message: 'Logged in.' };
        
        req.session.save((err) => {
            if (err) console.error('Session save error:', err);
            return res.redirect('/dashboard');
        });

    } catch (e) {
        next(e);
    }
});

// ========== 登出 ==========
router.post('/logout', (req, res) => {
    req.session.destroy(() => res.redirect('/'));
});

module.exports = router;