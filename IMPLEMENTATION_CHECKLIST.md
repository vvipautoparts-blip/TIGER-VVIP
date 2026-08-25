# VVIP TIGER — Current Implementation Checklist

**Role:** execution tracking only. This file is not an independent product or commercial authority.

## Binding references

- [Official Product Blueprint](docs/VVIP_TIGER_OFFICIAL_PRODUCT_BLUEPRINT.md)
- [Current Advertising / QVI Owner Authority](docs/owner-control/TIGER_CAMPAIGN_INTELLIGENCE_2026_CURRENT_OWNER_AUTHORITY.md)
- [Advertising machine contract](project-control/advertising/campaign-intelligence-current-authority.v1.json)

## Current invariants

- [x] Ordinary marketplace publication is not gated by an advertising purchase.
- [x] Advertising is a separate optional promotion flow.
- [x] The current advertising product is Verified Distribution Credit / QVI.
- [x] Campaign quotes are server-authoritative and country/version bound.
- [x] The platform does not process or settle external buyer/seller transaction value.
- [x] Browser success cannot activate a paid campaign.
- [x] Revenue recognition follows eligible verified delivery, not payment receipt alone.
- [x] Parallel commercial authority is not permitted in the current tree.

## Cleanup / convergence gates

- [x] Remove paid-publication gating from marketplace creation runtime.
- [x] Remove paid-publication entitlement API from the marketplace repository.
- [x] Remove current owner documents that acted as conflicting advertising authorities.
- [x] Establish one QVI owner authority and one machine contract in the cleanup branch.
- [ ] Scan current tree for stale commercial catalog/pricing/publication references.
- [ ] Remove or correct stale documentation references that can be interpreted as current authority.
- [ ] Run cleanroom/reference-integrity verification.
- [ ] Run VVIP Quality Gate on the exact cleanup HEAD.
- [ ] Run TIGER CleanGuard, Dependency Review and CodeQL on the exact cleanup HEAD.
- [ ] Confirm V14 Release Candidate gate status.
- [ ] Review PR #327 diff for accidental unrelated changes.
- [ ] Integrate through protected review/merge; do not bypass main/Production protections.
- [ ] Verify post-merge current tree and deployed artifact separately before claiming Production completion.

## Financial / advertising readiness before real money

- [ ] Country pricing certificate/version is approved.
- [ ] Active country payment provider contract is approved.
- [ ] Official settlement account and financial controls are approved.
- [ ] Authenticated provider confirmation/webhook path is verified.
- [ ] Refund and chargeback flows are verified.
- [ ] Idempotency, replay protection and reconciliation are verified.
- [ ] Unearned campaign balance and recognized revenue are separated in accounting.
- [ ] Verified-delivery measurement and invalid-traffic suppression are verified.
- [ ] Production activation is explicitly approved through protected gates.

## Completion rule

This cleanup is complete only when the current tree has one advertising-commercial authority, ordinary publication remains independent of advertising, stale current references are removed/corrected, and required CI gates pass on the exact reviewed SHA.