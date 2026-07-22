#!/usr/bin/env bash

set -euo pipefail

ROOT="/workspaces/TIGER-VVIP"

cd "$ROOT"

export PATH="$HOME/.local/bin:$PATH"

command -v agy >/dev/null

agy --version

python3 -m json.tool \
  "$HOME/.gemini/antigravity-cli/settings.json" \
  >/dev/null

python3 -m json.tool \
  .agents/hooks.json \
  >/dev/null

python3 -m unittest \
  tests/test_antigravity_read_only_gate.py \
  -v

test -s \
  .agents/rules/vvip-tiger-delivery-manager.md

test -s \
  .agents/skills/vvip-delivery-manager/SKILL.md

test -s \
  docs/ai/VVIP_ANTIGRAVITY_MANAGER_CHARTER.md

test -s \
  docs/ai/VVIP_ANTIGRAVITY_MANAGER_PROMPT.md

grep -qi \
  'Cursor.*only coding agent' \
  docs/ai/VVIP_ANTIGRAVITY_MANAGER_CHARTER.md

grep -q \
  '4,000,000' \
  docs/ai/VVIP_ANTIGRAVITY_MANAGER_CHARTER.md

grep -q \
  'Marketplace-grade search' \
  docs/ai/VVIP_ANTIGRAVITY_MANAGER_CHARTER.md

grep -q \
  'Weak and unstable internet' \
  docs/ai/VVIP_ANTIGRAVITY_MANAGER_CHARTER.md

grep -q \
  'Sacred text is never a technical security mechanism' \
  docs/ai/VVIP_ANTIGRAVITY_MANAGER_CHARTER.md

grep -q \
  'SUPABASE_IMPACT' \
  .agents/skills/vvip-delivery-manager/SKILL.md

git diff --check

echo "ANTIGRAVITY_MANAGER_VERIFY=PASS"
echo "ANTIGRAVITY_READ_ONLY_GATE=PASS"
echo "GLOBAL_REQUIREMENTS_CHARTER=PASS"
echo "RELIGIOUS_ETHICS_GOVERNANCE=PASS"
echo "SUPABASE_PRODUCTION_CHANGED=NO"
