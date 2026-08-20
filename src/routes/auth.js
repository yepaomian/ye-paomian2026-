const router = require('express').Router();
const { supabase } = require('../db');
const { getOrCreateProfile } = require('../services/profile');
const { optionalAuth } = require('../middleware/auth');

router.get('/register', optionalAuth, (req, res) => {
    if (req.user) return res.redirect('/dashboard');
    res.render('register', { title: 'Sign up', values: {} });
});

router.post('/register', async (req, res, next) => {
    try {
        const email = String(req.body.email || '').trim();
        const password = String(req.body.password || '');

        if (!email || password.length < 6) {
            return res.status(400).json({
                success: false,
                error: 'Please provide a valid email and a password of at least 6 characters.'
            });
        }

        const { data, error } = await supabase.auth.signUp({ email, password });

        if (error) {
            return res.status(400).json({ success: false, error: error.message });
        }

        if (data.user) {
            await getOrCreateProfile(data.user.id, data.user.email);
        }

        if (data.session) {
            return res.json({
                success: true,
                accessToken: data.session.access_token,
                refreshToken: data.session.refresh_token,
                user: { id: data.user.id, email: data.user.email }
            });
        }

        return res.json({
            success: true,
            message: 'Please check your email to confirm your account.'
        });

    } catch (e) {
        next(e);
    }
});

router.get('/login', optionalAuth, (req, res) => {
    if (req.user) return res.redirect('/dashboard');
    res.render('login', { title: 'Log in', values: {} });
});

router.post('/login', async (req, res, next) => {
    try {
        const email = String(req.body.email || '').trim();
        const password = String(req.body.password || '');

        const { data, error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
            return res.status(400).json({
                success: false,
                error: 'Invalid email or password.'
            });
        }

        if (!data.session) {
            return res.status(400).json({
                success: false,
                error: 'No session returned. Please check your email confirmation.'
            });
        }

        await getOrCreateProfile(data.user.id, data.user.email);

        return res.json({
            success: true,
            accessToken: data.session.access_token,
            refreshToken: data.session.refresh_token,
            user: {
                id: data.user.id,
                email: data.user.email
            }
        });

    } catch (e) {
        next(e);
    }
});

router.post('/logout', (req, res) => {
    req.session.destroy(() => res.redirect('/'));
});

module.exports = router;