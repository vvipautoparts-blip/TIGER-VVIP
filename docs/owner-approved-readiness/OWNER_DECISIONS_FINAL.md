# OWNER DECISIONS FINAL

Approved date: 2026-07-17

This file records the nine owner-approved decisions that govern the consolidation package. It is documentation and planning only. It does not authorize Backend implementation, Production work, or phase changes.

## Decision Register

| ODR | Approved decision | Reason | Product impact | In scope | Deferred | Acceptance evidence |
| --- | --- | --- | --- | --- | --- | --- |
| ODR-001 | Revenue model after launch is subscription only. No commission model is adopted. Financial execution stays outside the 60-day launch scope. | Keeps the platform commercially clear while avoiding premature monetization complexity. | Removes commission-based ambiguity and keeps the product aligned with a clean subscription future. | Subscription planning and launch-readiness documentation. | Any financial execution, price activation, tax wiring, and payment gateway work. | Explicit owner decision recorded; traceable future billing specification required. |
| ODR-002 | Users receive four free months from registration. After the free period, a monthly subscription is required for accounts allowed to publish listings. Browsing/buying accounts remain free. Annual billing may be added later. Subscription amount, tax, and gateway details are not authorized here. | Balances adoption with post-launch monetization while protecting non-publishing users. | Establishes the free period, future publisher subscription, and defers pricing details. | Free-period policy, publisher subscription readiness, buyer free access. | Pricing amount, taxes, and payment execution. | Owner-approved policy statement and later financial implementation spec. |
| ODR-003 | Commission is 0%. The platform does not take a percentage from sales, services, or rent. | Preserves trust and avoids platform involvement in private transactions. | Confirms the platform is not a transaction intermediary. | Policy and disclosure documents. | Any commission engine or settlement workflow. | Approved liability and revenue policy with 0% commission. |
| ODR-004 | Business registration is required for Shops, Service centers, Dealers / Distributors, and Companies / Institutions. It is not default-required for Buyer Viewer, Buyer Standard, Individual Seller, or Personal VIP. Service Provider is checked case by case by risk and activity type. | Applies verification where business risk exists and avoids overburdening casual users. | Creates a tiered registration requirement model. | Business-facing account policy and verification workflow. | Any hardcoded legal requirement not documented by the owner. | Registration policy, verification policy, and reviewer checklist. |
| ODR-005 | Business verification is a hybrid staged process: phone/email verification, document upload when needed, human review, administrative approve/reject with reason, audit trail, re-review option, no public exposure of sensitive documents, no password/OTP/token requests. | Provides controlled verification without exposing secrets. | Establishes the verification flow and privacy boundaries. | Verification policy, audit trail, reviewer guidance. | Any automatic full compliance claim or public document exposure. | Verification policy and audit trail documentation. |
| ODR-006 | The application direction is one unified cross-platform app for Android and iPhone, with continued Web/PWA support. No separate sector apps are approved. The final technical framework remains open until technical spike and device tests are completed. | Keeps the product unified and avoids premature framework lock-in. | Confirms one app, three sector filters, and a later technical decision. | Platform direction, mobile strategy, and roadmap. | Exact framework choice and implementation stack lock-in. | Mobile direction document and execution backlog. |
| ODR-007 | Conversation retention is 90 days after last activity. After that, conversations are deleted or anonymized according to the legal/technical policy. Evidence for reports or security cases may be retained separately. Conversations cannot be used for ads or commerce. | Protects privacy while preserving necessary evidence. | Defines message retention and evidence separation. | Messaging policy, privacy draft, and retention design. | Any claim that production retention is already implemented. | Retention policy and data handling draft. |
| ODR-008 | Account deletion is staged: immediate disable on confirmed request, 30-day recovery period, then permanent deletion or anonymization. Only necessary security/reporting/legal records may remain. Deleted data must not be shown publicly. The difference between disable and final delete must be explained clearly. | Balances user control, recovery, and legal retention. | Defines the deletion lifecycle and user-facing distinction. | Account lifecycle policy and support guidance. | Any production deletion engine or public data exposure. | Deletion policy and user copy. |
| ODR-009 | Jordan is the only approved launch country for now. No second country may be approved before the Jordan report and first 60-day data are reviewed. The next country is chosen by a points framework based on demand, legal readiness, local team, customer support, partners, operating cost, and language/payment readiness. No next country is authorized now. | Prevents premature international expansion. | Keeps the launch focused on Jordan and delays expansion. | Expansion framework and launch reporting. | Any international rollout execution. | Country expansion framework and owner decision record. |

## Deferred Implementation Parameters

The following items are intentionally not authorized in this mission:

- Subscription amount.
- Tax handling.
- Payment gateway wiring.
- Accounting/settlement implementation.
- Exact technical framework lock-in.
- Any country expansion execution.

## Owner Approval Statement

All nine ODR items are owner-approved as of 2026-07-17.
