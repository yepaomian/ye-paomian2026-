require('dotenv').config();

const config = {
  port: process.env.PORT || 3000,
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',
  isProduction: process.env.NODE_ENV === 'production',

  supabaseUrl: process.env.SUPABASE_URL,
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,

  sessionSecret: process.env.SESSION_SECRET || 'dev-insecure-secret-change-me',

  stripeSecretKey: process.env.STRIPE_SECRET_KEY || '',
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  stripePriceMonthly: process.env.STRIPE_PRICE_MONTHLY || '',
  stripePriceLifetime: process.env.STRIPE_PRICE_LIFETIME || '',
};

// --- Plans (single source of truth) ---
config.plans = {
  free: {
    id: 'free',
    name: 'Free',
    tagline: 'For occasional use',
    price: 0,
    interval: 'month',
    monthlyQuota: 1,
    features: ['1 invoice per month', '4 templates', 'PDF export'],
  },
  monthly: {
    id: 'monthly',
    name: 'Premium',
    tagline: 'For freelancers',
    price: 9.99,
    interval: 'month',
    monthlyQuota: 5,
    features: ['5 invoices per month', '4 templates', 'PDF export', 'Priority support'],
  },
  lifetime: {
    id: 'lifetime',
    name: 'Lifetime',
    tagline: 'Pay once, use forever',
    price: 29.99,
    interval: 'one-time',
    monthlyQuota: Infinity,
    features: ['Unlimited invoices', '4 templates', 'PDF export', 'All future updates'],
  },
};

module.exports = config;
