'use strict';

const fs = require('node:fs');
const path = require('node:path');
const policy = require('../../../project-control/tsn26/repository-governance-policy.v1.json');
const { evaluateRepositoryGovernance } = require('./repository-governance-proof.cjs');

function requiredEnv(name) {
  const value = String(process.env[name] || '').trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

async function githubJson(url, token) {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'tiger-tsn26-repository-governance-proof',
    },
  });
  if (!response.ok) throw new Error(`GitHub API ${response.status} for ${url}`);
  return response.json();
}

function chooseBestProof(proofs) {
  const passing = proofs.find((proof) => proof.status === 'PASS');
  if (passing) return passing;
  return [...proofs].sort((a, b) => a.failures.length - b.failures.length || (a.ruleset_id || 0) - (b.ruleset_id || 0))[0] || null;
}

async function main() {
  const repository = requiredEnv('GITHUB_REPOSITORY');
  const sourceSha = requiredEnv('TSN26_SOURCE_SHA').toLowerCase();
  const token = requiredEnv('GITHUB_TOKEN');
  const apiBase = 'https://api.github.com';
  const targetBranch = policy.target_branch;

  const branch = await githubJson(`${apiBase}/repos/${repository}/branches/${encodeURIComponent(targetBranch)}`, token);
  const rulesets = await githubJson(`${apiBase}/repos/${repository}/rulesets`, token);
  const activeCandidates = Array.isArray(rulesets)
    ? rulesets.filter((ruleset) => ruleset && ruleset.target === 'branch' && ruleset.enforcement === 'active')
    : [];

  const detailedRulesets = [];
  for (const ruleset of activeCandidates) {
    detailedRulesets.push(await githubJson(`${apiBase}/repos/${repository}/rulesets/${ruleset.id}`, token));
  }

  const evaluatedAt = new Date();
  const proofs = detailedRulesets.map((ruleset) => evaluateRepositoryGovernance({
    repository,
    candidate_source_sha: sourceSha,
    target_branch: targetBranch,
    target_sha: branch && branch.commit && branch.commit.sha,
    target_protected: branch && branch.protected === true,
    ruleset,
  }, { policy, evaluatedAt }));

  let proof = chooseBestProof(proofs);
  if (!proof) {
    proof = evaluateRepositoryGovernance({
      repository,
      candidate_source_sha: sourceSha,
      target_branch: targetBranch,
      target_sha: branch && branch.commit && branch.commit.sha,
      target_protected: branch && branch.protected === true,
      ruleset: {},
    }, { policy, evaluatedAt });
  }

  const reportDir = path.resolve(process.cwd(), 'reports/tsn26');
  fs.mkdirSync(reportDir, { recursive: true });
  const reportPath = path.join(reportDir, 'repository-governance-proof.json');
  fs.writeFileSync(reportPath, `${JSON.stringify(proof, null, 2)}\n`, 'utf8');

  process.stdout.write(`${JSON.stringify(proof)}\n`);
  if (proof.status !== 'PASS') {
    throw new Error(`TSN26_REPOSITORY_GOVERNANCE=FAIL:${proof.failures.join(',')}`);
  }
  process.stdout.write(`TSN26_REPOSITORY_GOVERNANCE=PASS ref=${proof.ref} digest=${proof.digest}\n`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error && error.stack ? error.stack : String(error));
    process.exitCode = 1;
  });
}

module.exports = Object.freeze({ chooseBestProof, githubJson });
