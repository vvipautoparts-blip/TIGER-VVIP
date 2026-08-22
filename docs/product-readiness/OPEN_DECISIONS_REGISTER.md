# OPEN DECISIONS REGISTER

Open items only. No final approval is assumed without explicit owner decision.

**Current authority:** Issue #312 controls discovery/commerce. Platform revenue for this architecture is advertising and approved platform-owned advertising services. Transaction-value commission / percentage of external user-to-user or user-to-provider deals is superseded and is not an open monetization option. Commercial-register/business-registration collection as a platform field is also already prohibited by current owner authority, so it is not an open decision here.

Resolved/superseded decisions are intentionally absent from this register rather than left as `Pending` choices that a future agent could reactivate.

| Decision ID | Question | Options | Recommendation | Owner Decision | Status | Dependency |
| --- | --- | --- | --- | --- | --- | --- |
| ODR-002 | What advertiser advertising-service package cadence should follow any free/pilot period? | Monthly / quarterly / annual / campaign-based | Start with a simple monthly advertising-service package, then expand from measured demand | Pending | Open | Advertising billing policy + legal/tax text |
| ODR-005 | What is the final non-commercial-register trust/business verification flow where a real trust signal is needed? | Manual review / hybrid / full automation | Hybrid staged rollout with audit trail and no commercial-register platform field | Pending | Open | Ops tooling + policy |
| ODR-006 | What is the final app direction? | Flutter native / hybrid web app / phased dual path | Keep decision open until post-UAT device evidence | Pending | Open | Engineering capacity and timeline |
| ODR-007 | What is the conversation retention policy? | 30/90/180 days / role-based retention | Start with conservative retention and legal review | Pending | Open | Privacy and legal approval |
| ODR-008 | What is the account deletion policy detail? | Immediate / grace period / staged anonymization | Grace period + reversible path before permanent deletion | Pending | Open | Legal + data lifecycle policy |
| ODR-009 | Which countries follow Jordan and in what order? | GCC first / Levant first / demand-driven | Data-driven expansion after Jordan controlled launch report | Pending | Open | Market readiness and operations scaling |

## Conflict Handling Rule

If a genuinely unresolved requirement conflicts with official references, record a new decision row here and keep status `Open` until owner decision is explicit. Do not reopen an item already resolved by Issue #312 or another later owner authority merely because an older document contains a conflicting option.
