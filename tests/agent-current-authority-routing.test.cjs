'use strict';

const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

const BINDING = 'docs/owner-control/TIGER_OWNER_BINDING_CURRENT.md';

test('all active agent instruction surfaces route to the mandatory current owner binding', () => {
  const surfaces = [
    'AGENTS.md',
    '.clinerules',
    '.cursor/rules/vvip-tiger-governance.mdc',
    '.agent/rules/antigravity-strict-manager.md',
    '.agents/rules/vvip-tiger-delivery-manager.md',
    '.agents/skills/vvip-delivery-manager/SKILL.md',
    'docs/ai/VVIP_AI_OPERATING_MODEL.md',
    'docs/ai/VVIP_ANTIGRAVITY_MANAGER_CHARTER.md',
    'docs/ai/VVIP_ANTIGRAVITY_MANAGER_PROMPT.md'
  ];

  for (const relative of surfaces) {
    const source = read(relative);
    assert.ok(source.includes(BINDING), `${relative} must route to ${BINDING}`);
  }
});

test('agent instructions cannot restore superseded owner launch or product authority', () => {
  const agents = read('AGENTS.md');
  const cline = read('.clinerules');
  const managerSkill = read('.agents/skills/vvip-delivery-manager/SKILL.md');

  assert.doesNotMatch(agents, /OWNER GLOBAL LAUNCH AUTHORIZATION\s*=\s*ACTIVE/i);
  assert.doesNotMatch(agents, /authorization covers progression through merges[\s\S]{0,180}Production/i);
  assert.doesNotMatch(agents, /scripts\/runtime\/vvip-marketplace-repository\.js/);
  assert.doesNotMatch(agents, /active TIGER ONE visual tokens/i);
  assert.match(agents, /PR #349/);
  assert.match(agents, /2\s*\/\s*10\s*\/\s*20\s*\/\s*45/);
  assert.match(agents, /TAX_RESERVE[\s\S]{0,80}(?:CANCELLED|cancelled|ملغ)/i);
  assert.match(agents, /Draft/i);
  assert.match(agents, /runner-executed GREEN/i);

  assert.doesNotMatch(cline, /all Server Actions/i);
  assert.doesNotMatch(cline, /Zod schemas/i);
  assert.doesNotMatch(cline, /TypeScript definitions/i);
  assert.doesNotMatch(cline, /listings \(draft -> pending_review/i);

  assert.doesNotMatch(managerSkill, /> archived material/i);
  assert.match(managerSkill, /Git history/i);
});

test('agent guidance preserves current-only no-merge no-production boundary while verification is blocked', () => {
  for (const relative of [
    'AGENTS.md',
    '.cursor/rules/vvip-tiger-governance.mdc',
    '.agents/rules/vvip-tiger-delivery-manager.md',
    'docs/ai/VVIP_AI_OPERATING_MODEL.md'
  ]) {
    const source = read(relative);
    assert.match(source, /exact-head/i, `${relative} must require exact-head evidence`);
    assert.match(source, /GREEN/i, `${relative} must require GREEN verification`);
    assert.match(source, /Production/i, `${relative} must preserve Production boundary`);
  }
});
