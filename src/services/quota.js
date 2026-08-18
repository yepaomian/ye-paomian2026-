const { admin } = require('../db');
const config = require('../config');

function startOfMonthIso() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

async function getMonthlyCount(userId) {
  const { count, error } = await admin
    .from('invoices')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', startOfMonthIso());
  if (error) throw error;
  return count || 0;
}

async function getQuota(userId, planId) {
  const plan = config.plans[planId] || config.plans.free;
  const used = await getMonthlyCount(userId);

  if (plan.monthlyQuota === Infinity) {
    return { plan, used, limit: Infinity, remaining: Infinity, unlimited: true };
  }

  const limit = plan.monthlyQuota;
  return {
    plan,
    used,
    limit,
    remaining: Math.max(0, limit - used),
    unlimited: false,
  };
}

// Throws a 402-style error if the user has hit their plan limit.
async function assertCanCreate(userId, planId) {
  const quota = await getQuota(userId, planId);
  if (!quota.unlimited && quota.used >= quota.limit) {
    const err = new Error(
      `You've reached your ${quota.plan.name} limit of ${quota.limit} invoice(s) this month. Upgrade your plan to create more.`
    );
    err.status = 402;
    throw err;
  }
  return quota;
}

module.exports = { getQuota, getMonthlyCount, assertCanCreate };
