#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const codeql = read('.github/workflows/codeql.yml');
const dependencyReview = read('.github/workflows/dependency-review.yml');
const dependabot = read('.github/dependabot.yml');

assert.match(codeql, /pull_request:\s*\n\s+branches:\s*\n\s+- main/);
assert.match(codeql, /push:\s*\n\s+branches:\s*\n\s+- main/);
assert.match(codeql, /workflow_dispatch:/);
assert.match(codeql, /permissions:\s*\n\s+contents: read\s*\n\s+security-events: write/);
assert.match(codeql, /timeout-minutes: 30/);
assert.match(codeql, /actions\/checkout@b4ffde65f46336ab88eb53be808477a3936bae11/);
assert.match(codeql, /github\/codeql-action\/init@5595ccaf912efad79be6eef63a5619ff05969be3/);
assert.match(codeql, /github\/codeql-action\/analyze@5595ccaf912efad79be6eef63a5619ff05969be3/);
assert.match(codeql, /languages: javascript-typescript/);
assert.match(codeql, /build-mode: none/);
assert.doesNotMatch(codeql, /continue-on-error/);

assert.match(dependencyReview, /pull_request:\s*\n\s+branches:\s*\n\s+- main/);
assert.match(dependencyReview, /permissions:\s*\n\s+contents: read/);
assert.doesNotMatch(dependencyReview, /security-events:|pull-requests:|actions:/);
assert.match(dependencyReview, /timeout-minutes: 10/);
assert.match(dependencyReview, /actions\/checkout@b4ffde65f46336ab88eb53be808477a3936bae11/);
assert.match(dependencyReview, /actions\/dependency-review-action@a1d282b36b6f3519aa1f3fc636f609c47dddb294/);
assert.match(dependencyReview, /fail-on-severity: high/);
assert.match(dependencyReview, /vulnerability-check: true/);
assert.match(dependencyReview, /license-check: false/);
assert.doesNotMatch(dependencyReview, /continue-on-error|warn-only|allow-licenses|deny-licenses/);

assert.match(dependabot, /package-ecosystem: github-actions/);
assert.match(dependabot, /package-ecosystem: pip/);
assert.doesNotMatch(dependabot, /package-ecosystem: (npm|docker)/);

console.log('PASS: Security CI workflows enforce the approved least-privilege contract');