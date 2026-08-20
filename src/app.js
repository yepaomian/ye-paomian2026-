const path = require('path');
const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const ejsMate = require('ejs-mate');
const pgSession = require('connect-pg-simple')(session);
const config = require('./config');
const { setPlan } = require('./services/profile');

const app = express();

app.engine('ejs', ejsMate);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(cookieParser());
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use(express.urlencoded({ extended: true }));

app.post(
  '/billing/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    if (!config.stripeSecretKey || !config.stripeWebhookSecret) {
      return res.status(400).send('Stripe webhook not configured.');
    }
    const stripe = require('stripe')(config.stripeSecretKey);
    let event;
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        req.headers['stripe-signature'],
        config.stripeWebhookSecret
      );
    } catch (err) {
      return res.status(400).send(`Webhook signature verification failed: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const userId = session.metadata?.userId || session.client_reference_id;
      const plan = session.metadata?.plan;
      if (userId && plan) {
        try {
          await setPlan(userId, plan, null);
        } catch (err) {
          console.error('Webhook: failed to update plan', err);
        }
      }
    }

    res.json({ received: true });
  }
);

app.use(express.json());

const DATABASE_URL = 'postgresql://postgres.jmtqepzzaadzdqhkuvea:linaizhang198751@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres';

app.use(
  session({
    store: new pgSession({
      conString: DATABASE_URL,
      tableName: 'session'
    }),
    secret: config.sessionSecret || 'abc123xyz',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  })
);

app.use((req, res, next) => {
  res.locals.flash = req.session.flash || null;
  delete req.session.flash;
  res.locals.currentYear = new Date().getFullYear();
  next();
});

app.use('/', require('./routes/pages'));
app.use('/', require('./routes/auth'));
app.use('/reset', require('./routes/reset'));
app.use('/trash', require('./routes/trash'));
app.use('/invoices', require('./routes/invoices'));
app.use('/dashboard', require('./routes/dashboard'));
app.use('/billing', require('./routes/billing'));

app.use((req, res) => {
  res.status(404).render('error', {
    title: 'Not found',
    status: 404,
    message: 'The page you are looking for does not exist.',
    error: {},
  });
});

app.use((err, req, res, next) => {
  console.error(err);
  const status = err.status || 500;
  if (req.headers.accept && req.headers.accept.includes('application/json')) {
    return res.status(status).json({ error: err.message });
  }
  res.status(status).render('error', {
    title: 'Error',
    status,
    message: status >= 500 ? 'Something went wrong on our end.' : err.message,
    error: err,
  });
});

module.exports = app;