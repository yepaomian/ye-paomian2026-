const { supabase } = require('../db');
const { getOrCreateProfile, getProfile } = require('../services/profile');

// 需要登录的页面 - 从请求头读取 token
async function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.redirect('/login');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
        return res.redirect('/login');
    }

    try {
        const { data, error } = await supabase.auth.getUser(token);
        if (error || !data.user) {
            return res.redirect('/login');
        }

        req.user = data.user;
        const profile = await getOrCreateProfile(data.user.id, data.user.email);
        req.profile = profile;
        res.locals.user = { email: data.user.email, plan: profile.plan };
        res.locals.accessToken = token;

        next();
    } catch (e) {
        console.error('Auth error:', e);
        return res.redirect('/login');
    }
}

// 可选登录（登录了就有 user，没登录也继续）
async function optionalAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
            const { data } = await supabase.auth.getUser(token);
            if (data && data.user) {
                req.user = data.user;
                const profile = await getProfile(data.user.id);
                res.locals.user = {
                    email: data.user.email,
                    plan: profile ? profile.plan : 'free',
                };
                if (profile) req.profile = profile;
                res.locals.accessToken = token;
            }
        } catch (e) {
            /* ignore */
        }
    }
    next();
}

module.exports = { requireAuth, optionalAuth };