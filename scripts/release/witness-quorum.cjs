'use strict';

function validDigest(value) {
  return /^sha256:[0-9a-f]{64}$/.test(String(value || ''));
}

function verifyWitnessQuorum(input, policy = {}) {
  if (!input || typeof input !== 'object' || !validDigest(input.releaseDigest)) {
    return { ok:false, code:'WITNESS_INPUT_INVALID' };
  }
  const releaseDigest = input.releaseDigest;
  const github = input.github || null;
  const independent = Array.isArray(input.independent) ? input.independent : [];
  const witnesses = [github, ...independent].filter(Boolean);
  if (witnesses.some((witness) => witness.releaseDigest !== releaseDigest)) {
    return { ok:false, code:'WITNESS_RELEASE_MISMATCH' };
  }

  if (policy.requireGithubExecutedGreen === true) {
    if (!github || github.state !== 'EXECUTED_GREEN') {
      return {
        ok:false,
        code:'WITNESS_GITHUB_EXECUTED_GREEN_REQUIRED',
        predecessorPullRequest: policy.predecessorPullRequest || null,
        providerOutageSubstitutionAllowed: policy.allowProviderOutageSubstitution === true
      };
    }
  }

  const minimumIndependent = Math.max(0, Number(policy.minimumIndependentWitnesses) || 0);
  const verifiedIndependent = independent.filter((witness) => witness && witness.state === 'VERIFIED').length;
  if (verifiedIndependent < minimumIndependent) {
    return { ok:false, code:'WITNESS_INDEPENDENT_QUORUM_NOT_MET' };
  }

  return {
    ok:true,
    code:'WITNESS_QUORUM_VALID',
    githubState: github ? github.state : null,
    verifiedIndependent
  };
}

module.exports = Object.freeze({ verifyWitnessQuorum });
