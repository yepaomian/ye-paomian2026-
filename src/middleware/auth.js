const { supabase } = require('../db');
const { getOrCreateProfile, getProfile } = require('../services/profile');

function isJsonRequest(req) {
    return req.headers.accept && req.headers.accept.includes('application/json');
}

async function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        if (isJsonRequest(req)) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        return res.redirect('/login');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
        if (isJsonRequest(req)) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        return res.redirect('/login');
    }

    try {
        const { data, error } = await supabase.auth.getUser(token);
        if (error || !data.user) {
            if (isJsonRequest(req)) {
                return res.status(401).json({ error: 'Invalid token' });
            }
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
        if (isJsonRequest(req)) {
            return res.status(401).json({ error: 'Auth error' });
        }
        return res.redirect('/login');
    }
}

// 可选登录
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