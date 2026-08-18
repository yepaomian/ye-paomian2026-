const { supabase } = require('../db');
const { getOrCreateProfile, getProfile } = require('../services/profile');

async function hydrateSession(req, res, next) {
  const s = req.session;
  if (!s || !s.accessToken) return res.redirect('/login');

  let user = null;
  const { data, error } = await supabase.auth.getUser(s.accessToken);

  if (error || !data.user) {
    // Access token expired — try to refresh.
    if (s.refreshToken) {
      const refreshed = await supabase.auth.refreshSession({
        refresh_token: s.refreshToken,
      });
      if (refreshed.data && refreshed.data.session) {
        s.accessToken = refreshed.data.session.access_token;
        s.refreshToken = refreshed.data.session.refresh_token;
        user = refreshed.data.user;
      }
    }
    if (!user) {
      s.destroy(() => {});
      return res.redirect('/login');
    }
  } else {
    user = data.user;
  }

  req.user = user;
  const profile = await getOrCreateProfile(user.id, user.email);
  req.profile = profile;
  res.locals.user = { email: user.email, plan: profile.plan };
  next();
}

// For pages that should behave differently when logged in, without redirecting.
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
      /* ignore — treat as anonymous */
    }
  }
  next();
}

module.exports = { requireAuth: hydrateSession, optionalAuth };
