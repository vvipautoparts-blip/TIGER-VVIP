# TIGER SOVEREIGN — Production Go-Live Checklist

Status: **production activation blocker until every applicable row has real PASS evidence**

## Repository and security

- [ ] Fresh VVIP Quality Gate PASS for the exact release head.
- [ ] Fresh CodeQL PASS.
- [ ] Fresh Dependency Review PASS.
- [ ] Project-control integrity PASS.
- [ ] Secret scan PASS.
- [ ] Dangerous-SQL review/gate PASS for the exact migration content.
- [ ] AI security/eval contract PASS.
- [ ] Independent BLACKBOX/security review with no open P0/P1.

## Core VVIP TIGER

- [ ] PR36 real image upload manual acceptance PASS.
- [ ] Core staging acceptance PASS.
- [ ] Production configuration/secrets review PASS.
- [ ] Database migrations/RLS/backup readiness PASS.
- [ ] Launch operations including environment/domain/HTTPS/country/legal/runtime dependencies PASS as applicable to the release.

## TIGER SOVEREIGN staging

- [ ] AI-03 Trust Fabric preview apply PASS.
- [ ] Real RLS/runtime probes PASS.
- [ ] Identity verifier staging PASS.
- [ ] Provider credentials/model/prompt staging configuration PASS.
- [ ] Model Gateway staging smoke PASS.
- [ ] Live read-only evidence adapters staging PASS.
- [ ] Safe Tool Gateway executors staging PASS.
- [ ] Rate/budget/concurrency/kill-switch probes PASS.
- [ ] Observability and alert delivery PASS.
- [ ] Live adversarial model evals PASS.
- [ ] Backup/restore rehearsal PASS.
- [ ] Incident drill PASS.
- [ ] Rollback drill PASS.
- [ ] Browser/mobile/RTL/LTR/accessibility/performance acceptance PASS.

## Governance, privacy and legal

- [ ] Historical secret inventory completed; any real secret requiring rotation has been rotated and verified without exposing the replacement value.
- [ ] Privacy/legal review for AI processing PASS.
- [ ] Data-retention/deletion policy review PASS.
- [ ] Provider data-processing terms/settings review PASS.
- [ ] Country activation/legal/residency/currency/tax scope review PASS for the active market.

## Owner gates — all independent

- [ ] `OWNER_MERGE_APPROVAL=PASS`
- [ ] `OWNER_DB_PROMOTION_APPROVAL=PASS`
- [ ] `OWNER_PRODUCTION_ACTIVATION=PASS`

A general instruction to “finish everything” is not a substitute for these exact protected production decisions. Each protected action is bound to the exact reviewed release/database/environment payload.

## Production promotion

Only after the owner gates above:

- [ ] Approved Supabase production migration apply PASS.
- [ ] Approved AI Gateway production deploy PASS.
- [ ] Live evidence production smoke PASS.
- [ ] Production post-deploy smoke PASS.
- [ ] Production monitoring/alerts verified after deploy.
- [ ] Production backup state verified.
- [ ] Production country configuration verified.

## Final truth condition

`TIGER_SOVEREIGN_READINESS=100%` may be stated only when the machine readiness gate reports:

- `productionReady=true`
- `readinessPercent=100`
- `blockedCount=0`
- no missing, pending, deferred, assumed, simulated or test-fixture evidence
- production sequence valid

Anything less is reported as `TIGER_SOVEREIGN_READINESS_BLOCKED`, even when repository code quality is fully green.
