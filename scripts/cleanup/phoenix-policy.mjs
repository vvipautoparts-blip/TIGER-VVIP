import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const POLICY_KEYS = new Set([
  'schema_version','policy_id','domain','status','owner_decision_path','owner_decision_sha256',
  'aion','classes','hard_locks','unknown_default','rules'
]);
const AION_KEYS = new Set(['runtime_contract','required','may_bypass','deletion_chain']);
const RULE_KEYS = new Set(['id','match','class']);
export const STORAGE_CLASSES = Object.freeze(['S0_SOVEREIGN','S1_EVIDENCE','S2_REBUILDABLE','S3_EPHEMERAL','S4_STATEFUL_LOCAL']);
export const REQUIRED_HARD_LOCKS = Object.freeze([
  'CURRENT_ONLY_OWNER_AUTHORITY','CANONICAL_SOURCE_REQUIRED_BY_CURRENT_RUNTIME','REQUIRED_MIGRATIONS',
  'PRODUCTION_CONFIGURATION','PROTECTED_RELEASE_IDENTITY','PROTECTED_RELEASE_PROVENANCE',
  'SECURITY_SENSITIVE_MATERIAL','UNBACKED_STATEFUL_VOLUMES','UNBACKED_UNIQUE_NON_VOLUME_STATE',
  'ACTIVE_CANONICAL_RELEASE_EVIDENCE','ACTIVE_CANONICAL_SECURITY_EVIDENCE','GIT_HISTORY_REWRITE','UNIQUE_PR_BRANCH_COMMITS'
]);
const REQUIRED_AION_CHAIN = Object.freeze(['DETECT','CLASSIFY','EXPLAIN','APPROVE','QUARANTINE','REHEARSE','VERIFY','DELETE','SEAL']);

function rejectUnknownKeys(value, allowed, label) {
  for (const key of Object.keys(value ?? {})) {
    if (!allowed.has(key)) throw new Error(`${label}_UNKNOWN_KEY:${key}`);
  }
}
function sha256(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}
function stableMatch(candidate, match) {
  return Object.entries(match).every(([key, expected]) => candidate?.[key] === expected);
}

export function loadCleanupPolicy(policyPath, options = {}) {
  const raw = fs.readFileSync(policyPath);
  const policy = JSON.parse(raw.toString('utf8'));
  rejectUnknownKeys(policy, POLICY_KEYS, 'POLICY');
  if (policy.schema_version !== 'TIGER-PHOENIX-CLEANROOM-POLICY-1') throw new Error('POLICY_SCHEMA_INVALID');
  if (policy.domain !== 'cleanup-governance' || policy.status !== 'CURRENT_ONLY') throw new Error('POLICY_AUTHORITY_INVALID');
  if (!Array.isArray(policy.classes) || policy.classes.length !== STORAGE_CLASSES.length || !STORAGE_CLASSES.every((v,i)=>policy.classes[i]===v)) throw new Error('POLICY_CLASSES_INVALID');
  if (policy.unknown_default !== 'LOCK') throw new Error('POLICY_UNKNOWN_MUST_LOCK');
  if (!Array.isArray(policy.hard_locks) || !REQUIRED_HARD_LOCKS.every((lock)=>policy.hard_locks.includes(lock))) throw new Error('POLICY_HARD_LOCKS_INCOMPLETE');
  rejectUnknownKeys(policy.aion, AION_KEYS, 'AION');
  if (policy.aion?.required !== true || policy.aion?.may_bypass !== false || policy.aion?.runtime_contract !== 'project-control/aion/metabolism.mjs') throw new Error('POLICY_AION_BINDING_INVALID');
  if (JSON.stringify(policy.aion.deletion_chain) !== JSON.stringify(REQUIRED_AION_CHAIN)) throw new Error('POLICY_AION_CHAIN_INVALID');
  const seen = new Set();
  for (const rule of policy.rules ?? []) {
    rejectUnknownKeys(rule, RULE_KEYS, 'RULE');
    if (!rule.id || seen.has(rule.id)) throw new Error(`POLICY_DUPLICATE_RULE:${rule.id ?? ''}`);
    seen.add(rule.id);
    if (!STORAGE_CLASSES.includes(rule.class)) throw new Error(`POLICY_RULE_CLASS_INVALID:${rule.id}`);
    if (!rule.match || typeof rule.match !== 'object' || Array.isArray(rule.match) || Object.keys(rule.match).length === 0) throw new Error(`POLICY_RULE_MATCH_INVALID:${rule.id}`);
  }
  const repoRoot = options.repoRoot ?? path.resolve(path.dirname(policyPath), '..', '..');
  const ownerPath = options.ownerDecisionPath ?? path.resolve(repoRoot, policy.owner_decision_path);
  const ownerRaw = fs.readFileSync(ownerPath);
  const actualOwnerDigest = sha256(ownerRaw);
  if (actualOwnerDigest !== policy.owner_decision_sha256) throw new Error('POLICY_OWNER_DECISION_DIGEST_MISMATCH');
  if (options.expectedOwnerDecisionDigest && options.expectedOwnerDecisionDigest !== actualOwnerDigest) throw new Error('CALLER_OWNER_DECISION_DIGEST_MISMATCH');
  return Object.freeze({...policy, policy_sha256: sha256(raw), verified_owner_decision_sha256: actualOwnerDigest});
}

export function classifyCandidate(candidate, policy) {
  if (!candidate || typeof candidate !== 'object') return Object.freeze({classification:'S0_SOVEREIGN', locked:true, reason:'UNKNOWN_CANDIDATE'});
  if (!policy || policy.unknown_default !== 'LOCK') throw new Error('UNTRUSTED_POLICY');
  const matching = (policy.rules ?? []).filter((rule)=>stableMatch(candidate, rule.match));
  if (matching.length === 0) return Object.freeze({classification:'S0_SOVEREIGN', locked:true, reason:'UNKNOWN_LOCK'});
  if (matching.length !== 1) return Object.freeze({classification:'S0_SOVEREIGN', locked:true, reason:'AMBIGUOUS_CLASSIFICATION'});
  const classification = matching[0].class;
  return Object.freeze({classification, locked: classification === 'S0_SOVEREIGN' || classification === 'S4_STATEFUL_LOCAL', rule_id: matching[0].id});
}
