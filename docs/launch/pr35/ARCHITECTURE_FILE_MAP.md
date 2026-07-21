# PR35 Architecture File Map

## Canonical integration files

- `index.html`: canonical home/marketplace; unchanged in this implementation.
- `private-profile-p03.html`: canonical private account and Tiger Care mount.
- `scripts/vvip-pr30-resilience.js`: registers new known actions without becoming policy.
- `scripts/qa-smoke.sh`: canonical runtime and PR35 contract checks.

## New runtime files

- `owner-control.html`: protected owner console view.
- `scripts/pr35/`: contracts, sanitize, scope, policy, audit, Tiger Care, routing, SLA, network, drafts, adapters, controllers, i18n, and bootstrap modules.
- `styles/vvip-pr35-owner-care.css`: shared Arabic-first responsive components.

## Tests and review-only design

- `tests/pr35/`: Node domain and DOM-contract tests plus fixtures.
- `scripts/qa-pr35-owner-control-tiger-care.sh`: deterministic aggregate preliminary gate.
- `docs/security/sql-review/pr35/`: schema/RLS review artifact only.
- `docs/launch/pr35/qa/`: preliminary executable evidence.

## Explicit non-targets

`private-profile.html` and `clerk-private-profile.html` are redirect shims. The retired feed runtime and public-profile files are absent and must not be restored. Historical source snapshots are available from Git history; root legacy auth/style files, migrations, Edge Functions, Firebase configuration, and Clerk configuration were outside PR35.
