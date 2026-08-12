'use strict';

const fs = require('node:fs');
const path = require('node:path');

const REQUIRED_ENVIRONMENTS = ['local', 'ci', 'staging', 'production'];
const REQUIRED_SERVICES = [
  'static_delivery', 'database', 'object_storage', 'edge_server_compute',
  'ai_inference', 'high_volume_observability', 'sms_otp_delivery', 'video_processing'
];
const CREDENTIAL_PATTERNS = [
  /service_role\s*[:=]/i,
  /SUPABASE_DB_PASSWORD\s*[:=]/i,
  /BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY/i,
  /sk_(live|test)_[A-Za-z0-9]+/i,
  /api[_-]?key\s*[:=]\s*[A-Za-z0-9._-]{12,}/i
];

function validatePolicy(policy) {
  const errors = [];
  if (!policy || typeof policy !== 'object' || Array.isArray(policy)) {
    return { ok: false, errors: ['policy must be an object'] };
  }
  if (policy.schema_version !== 'VVIP-COST-1') errors.push('schema_version must be VVIP-COST-1');
  if (policy.platform !== 'VVIP TIGER') errors.push('platform must be VVIP TIGER');
  if (policy.currency !== 'USD') errors.push('currency must be USD in COST-01');
  if (policy.accounting_unit !== 'minor') errors.push('accounting_unit must be minor');
  if (policy.production_mutation_authorized !== false) errors.push('production_mutation_authorized must remain false in COST-01');
  if (policy.real_charge_authorized !== false) errors.push('real_charge_authorized must remain false in COST-01');
  if (policy.hard_limit_increase_approval_class !== 'OWNER_PROTECTED_COST_APPROVAL') {
    errors.push('hard_limit_increase_approval_class must be OWNER_PROTECTED_COST_APPROVAL');
  }

  if (!policy.environments || typeof policy.environments !== 'object') {
    errors.push('environments must be an object');
  } else {
    for (const name of REQUIRED_ENVIRONMENTS) {
      const env = policy.environments[name];
      if (!env || typeof env !== 'object') {
        errors.push(`environment ${name} is required`);
        continue;
      }
      for (const key of ['soft_limit_minor', 'hard_limit_minor']) {
        if (!Number.isSafeInteger(env[key]) || env[key] < 0) errors.push(`${name}.${key} must be a non-negative safe integer`);
      }
      if (Number.isSafeInteger(env.soft_limit_minor) && Number.isSafeInteger(env.hard_limit_minor) && env.hard_limit_minor < env.soft_limit_minor) {
        errors.push(`${name}.hard_limit_minor must be >= soft_limit_minor`);
      }
    }
  }

  if (!Array.isArray(policy.services)) {
    errors.push('services must be an array');
  } else {
    const seen = new Set();
    for (const service of policy.services) {
      if (!service || typeof service.id !== 'string' || !service.id) {
        errors.push('service id is required');
        continue;
      }
      if (seen.has(service.id)) errors.push(`duplicate service id: ${service.id}`);
      seen.add(service.id);
      if (typeof service.optional_high_cost !== 'boolean') errors.push(`${service.id}.optional_high_cost must be boolean`);
      if (typeof service.default_enabled !== 'boolean') errors.push(`${service.id}.default_enabled must be boolean`);
      if (service.optional_high_cost === true && service.default_enabled !== false) errors.push(`${service.id} optional high-cost service must default disabled`);
    }
    for (const id of REQUIRED_SERVICES) if (!seen.has(id)) errors.push(`required service missing: ${id}`);
  }

  if (!Array.isArray(policy.scaling_rules) || policy.scaling_rules.length === 0) {
    errors.push('scaling_rules must contain at least one rule');
  } else {
    for (const rule of policy.scaling_rules) {
      if (!rule || typeof rule.id !== 'string' || !rule.id) errors.push('scaling rule id is required');
      if (!Array.isArray(rule.required_evidence) || rule.required_evidence.length === 0 || rule.required_evidence.some((item) => typeof item !== 'string' || !item.trim())) {
        errors.push(`${rule?.id || 'scaling rule'}.required_evidence must contain measurable evidence keys`);
      }
      if (rule.owner_approval_required_for_production_hard_limit_increase !== true) {
        errors.push(`${rule?.id || 'scaling rule'} must require owner approval for production hard-limit increase`);
      }
    }
  }

  const serialized = JSON.stringify(policy);
  for (const pattern of CREDENTIAL_PATTERNS) {
    if (pattern.test(serialized)) {
      errors.push('policy contains credential-like material');
      break;
    }
  }

  return { ok: errors.length === 0, errors };
}

function main() {
  const defaultPath = path.join(__dirname, 'lean-cost-policy.v1.json');
  const inputPath = process.argv[2] ? path.resolve(process.argv[2]) : defaultPath;
  try {
    const policy = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
    const result = validatePolicy(policy);
    if (!result.ok) {
      for (const error of result.errors) console.error(`COST_POLICY_ERROR=${error}`);
      process.exitCode = 1;
      return;
    }
    console.log('VVIP_LEAN_COST_POLICY=PASS');
  } catch (error) {
    console.error(`COST_POLICY_ERROR=${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { validatePolicy };

if (require.main === module) main();
