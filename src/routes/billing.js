const router = require('express').Router();
const config = require('../config');
const { requireAuth } = require('../middleware/auth');
const { setPlan } = require('../services/profile');

router.get('/', requireAuth, (req, res) => {
  res.render('billing', {
    title: 'Billing & plans',
    plans: config.plans,
    currentPlan: req.profile.plan,
    stripeConfigured: Boolean(config.stripeSecretKey && config.stripePriceMonthly && config.stripePriceLifetime),
  });
});

// Demo/dev upgrade — used when Stripe is not configured. DO NOT use in production.
router.post('/dev-upgrade', requireAuth, async (req, res, next) => {
  try {
    if (config.isProduction && config.stripeSecretKey) {
      req.session.flash = { type: 'error', message: 'Use the Stripe checkout in production.' };
      return res.redirect('/billing');
    }
    const planId = req.body.plan;
    if (!['monthly', 'lifetime'].includes(planId)) {
      req.session.flash = { type: 'error', message: 'Invalid plan.' };
      return res.redirect('/billing');
    }
    await setPlan(req.user.id, planId, req.user.email);
    req.session.flash = {
      type: 'success',
      message: `Upgraded to ${config.plans[planId].name}.`,
    };
    return res.redirect('/billing');
  } catch (e) {
    next(e);
  }
});

// Stripe checkout (used when keys are configured).
router.post('/checkout', requireAuth, async (req, res, next) => {
  try {
    if (!config.stripeSecretKey) {
      req.session.flash = { type: 'error', message: 'Stripe is not configured. Use the demo upgrade instead.' };
      return res.redirect('/billing');
    }

    const planId = req.body.plan;
    const priceId =
      planId === 'lifetime' ? config.stripePriceLifetime : config.stripePriceMonthly;
    if (!priceId) {
      req.session.flash = { type: 'error', message: 'Price ID not configured for this plan.' };
      return res.redirect('/billing');
    }

    const stripe = require('stripe')(config.stripeSecretKey);
    const mode = planId === 'lifetime' ? 'payment' : 'subscription';

    const session = await stripe.checkout.sessions.create({
      mode,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${config.baseUrl}/billing`,
      cancel_url: `${config.baseUrl}/billing`,
      client_reference_id: req.user.id,
      metadata: { userId: req.user.id, plan: planId },
    });

    return res.redirect(session.url);
  } catch (e) {
    next(e);
  }
});

module.exports = router;
