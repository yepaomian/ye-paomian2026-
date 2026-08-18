require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    console.error('Missing Supabase configuration. Please check your .env file.');
    process.exit(1);
}

// Client used for auth flows (sign up / sign in / token refresh)
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

// Service-role client used for server-side data access (bypasses RLS)
// Never expose this key to the browser.
const admin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } }
);

module.exports = { supabase, admin };
