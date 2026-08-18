# Invoice Tool

An overseas invoice generator with 4 templates, PDF export, tiered plans, and a user dashboard.
Built with **Node.js + Express + Supabase**.

> **Disclaimer:** This tool generates invoice templates for informational purposes only. Not legal/tax advice.

## Features

- **Register / login** via Supabase Auth (email + password)
- **Invoice form** with sender, client, line items, tax, discount, notes, and template selection
- **4 templates** — Classic, Modern, Minimal, Bold
- **PDF export** (server-side, A4, via Puppeteer) plus a browser print fallback
- **User dashboard** — quota status + invoice list
- **Tiered plans** (enforced on the backend):
  - Free — 1 invoice/month
  - Premium — $9.99/month, 5 invoices/month
  - Lifetime — $29.99 one-time, unlimited
- **Responsive** English UI (mobile + desktop)
- **Backend permission validation** — every invoice read/write is scoped to the logged-in user

## Project structure

```
invoice-tool/
├── src/
│   ├── server.js            # entry point
│   ├── app.js               # Express app, sessions, webhook, error handling
│   ├── config.js            # env + plan definitions
│   ├── db.js                # Supabase clients (anon + service role)
│   ├── middleware/auth.js   # requireAuth / optionalAuth
│   ├── routes/
│   │   ├── pages.js         # landing page
│   │   ├── auth.js          # register / login / logout
│   │   ├── invoices.js      # CRUD + PDF export (quota-checked)
│   │   ├── dashboard.js     # user dashboard
│   │   └── billing.js       # plans + upgrades
│   ├── services/
│   │   ├── profile.js       # profile read/create/plan update
│   │   ├── quota.js         # monthly quota enforcement
│   │   ├── invoice.js       # amount computation + formatting
│   │   └── pdf.js           # HTML → PDF (Puppeteer)
│   └── views/               # EJS templates
│       ├── templates/       # the 4 invoice designs
│       └── ...
├── public/css/style.css
├── public/js/app.js
├── supabase/schema.sql
└── .env.example
```

## Setup

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Run `supabase/schema.sql` in the SQL Editor.
3. **Disable email confirmation** for local dev: *Authentication → Providers → Email → Confirm email = OFF*
   (or keep it on and confirm the signup link).
4. Copy your URL + anon key + service-role key from *Project Settings → API*.

### 2. Install & configure

```bash
cd invoice-tool
npm install
copy .env.example .env   # Windows  (or: cp .env.example .env)
```

Fill in `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and a random `SESSION_SECRET`.

### 3. Run

```bash
npm start       # or: npm run dev (auto-reload)
```

Open http://localhost:3000.

## Payments (Stripe)

By default the app runs in **demo mode**: the Billing page lets you upgrade instantly
without a payment provider (clearly labeled, for development only).

To accept real payments:

1. Set `STRIPE_SECRET_KEY` and price IDs `STRIPE_PRICE_MONTHLY` / `STRIPE_PRICE_LIFETIME` in `.env`.
2. Set `STRIPE_WEBHOOK_SECRET` and point Stripe's webhook at `https://your-domain/billing/webhook`
   (event: `checkout.session.completed`).
3. Deploy with `NODE_ENV=production`.

The webhook updates the user's plan automatically after a successful checkout.

## Notes

- **PDF generation** uses Puppeteer, which downloads Chromium on `npm install`.
  If install fails, set `PUPPETEER_SKIP_DOWNLOAD=true` and point it at an existing Chrome.
- **Sessions** use the default in-memory store — fine for dev. For production, use a
  persistent store (e.g. `connect-pg-simple` against your Supabase Postgres).
- Quota counts invoices created in the **current calendar month** for Free/Premium plans.

## Disclaimer

This tool generates invoice templates for informational purposes only. Not legal/tax advice.
