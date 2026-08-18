const router = require('express').Router();
const config = require('../config');
const { optionalAuth } = require('../middleware/auth');

router.get('/', optionalAuth, (req, res) => {
  if (req.user) return res.redirect('/dashboard');
  res.render('index', {
    title: 'Invoice Tool — Create professional invoices',
    plans: config.plans,
  });
});

module.exports = router;
