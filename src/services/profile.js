const { admin } = require('../db');

const VALID_PLANS = ['free', 'monthly', 'lifetime'];

async function getProfile(userId) {
  const { data, error } = await admin
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function getOrCreateProfile(userId, email) {
  let profile = await getProfile(userId);
  if (!profile) {
    const { data, error } = await admin
      .from('profiles')
      .insert({ id: userId, email: email || null, plan: 'free' })
      .select()
      .single();
    if (error) throw error;
    profile = data;
  }
  return profile;
}

async function setPlan(userId, planId, email) {
  const plan = VALID_PLANS.includes(planId) ? planId : 'free';
  const existing = await getProfile(userId);
  if (existing) {
    const { data, error } = await admin
      .from('profiles')
      .update({ plan, plan_updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await admin
    .from('profiles')
    .insert({ id: userId, email: email || null, plan })
    .select()
    .single();
  if (error) throw error;
  return data;
}

module.exports = { getProfile, getOrCreateProfile, setPlan };
