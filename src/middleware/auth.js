const { supabase } = require('../db');
const { getOrCreateProfile, getProfile } = require('../services/profile');

async function hydrateSession(req, res, next) {
  const s = req.session;
  
  // ===== 调试日志 =====
  console.error('🔴 Session check:', s ? 'exists' : 'null', s?.accessToken ? 'has token' : 'no token');
  
  if (!s || !s.accessToken) {
    console.error('❌ No session or accessToken, redirecting to /login');
    return res.redirect('/login');
  }

  let user = null;
  const { data, error } = await supabase.auth.getUser(s.accessToken);

  if (error || !data.user) {
    console.error('❌ getUser failed:', error?.message || 'no user');
    if (s.refreshToken) {
      console.error('🔄 Trying to refresh token...');
      const refreshed = await supabase.auth.refreshSession({
        refresh_token: s.refreshToken,
      });
      if (refreshed.data && refreshed.data.session) {
        s.accessToken = refreshed.data.session.access_token;
        s.refreshToken = refreshed.data.session.refresh_token;
        user = refreshed.data.user;
        console.error('✅ Token refreshed successfully');
      }
    }
    if (!user) {
      console.error('❌ No user after refresh, redirecting to /login');
      s.destroy(() => {});
      return res.redirect('/login');
    }
  } else {
    user = data.user;
    console.error('✅ User found:', user.email);
  }

  req.user = user;
  const profile = await getOrCreateProfile(user.id, user.email);
  req.profile = profile;
  res.locals.user = { email: user.email, plan: profile.plan };
  next();
}

async function optionalAuth(req, res, next) {
  if (req.session && req.session.accessToken) {
    try {
      const { data } = await supabase.auth.getUser(req.session.accessToken);
      if (data && data.user) {
        req.user = data.user;
        const profile = await getProfile(data.user.id);
        res.locals.user = {
          email: data.user.email,
          plan: profile ? profile.plan : 'free',
        };
        if (profile) req.profile = profile;
      }
    } catch (e) {
      /* ignore */
    }
  }
  next();
}

module.exports = { requireAuth: hydrateSession, optionalAuth };