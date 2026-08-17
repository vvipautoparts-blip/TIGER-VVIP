# F03 — SOA + Sovereign Capability Graph Status

**Status:** IMPLEMENTED / EXACT-HEAD VERIFIED

**Owner invariant:** `docs/fusion/OWNER_RULE_ADVERTISING_CONNECTION_ONLY_2026.md`

## Implemented in this phase

- fail-closed capability snapshot contract;
- server confirmation required before privileged presentation;
- V13 authority classes and permission catalog reused as authority source;
- V13 authorization TTL envelope reused;
- unknown permissions denied;
- marketplace intermediary capability namespaces denied for checkout, escrow, delivery/shipping, marketplace settlement/commission, and dispute resolution;
- immutable capability presentation output;
- Single Surface `⋮` capability controller wired to an explicit capability entries host;
- capability menu renders only entries produced by validated immutable capability output;
- F00 exact authority foundations preserved while the OWNER advertising/direct-contact boundary remains independently explicit.

## TDD and verification state

F03 focused contract evidence:

- capability graph: 5/5 focused tests PASS;
- Single Surface capability menu: 3/3 focused tests PASS;
- combined F03 focused tests: 8/8 PASS.

Mandatory verification is performed through the repository CI gates. The V14 Release Candidate workflow checks out `github.event.pull_request.head.sha`, verifies the actual checkout SHA equals that exact source SHA, and then runs the full VVIP quality gate before release-candidate tests/build evidence.

Final run numbers and the final branch SHA are maintained on PR #234 and verification-only PR #235 so this status document does not require another source commit solely to refresh evidence identifiers.

## Protected integration boundary

- protected authentication / `index.html` production integration remains a separately gated closure step and is not weakened by F03;
- F03 does not authorize Production deployment, SQL/database apply, Production RLS change, country activation, secrets mutation, marketplace money movement, or protected-auth weakening.

## Owner boundary

VVIP TIGER remains an advertising, discovery, and direct-contact platform only. It reduces distance between seller/buyer and service-provider/beneficiary. The platform is not a party to the marketplace transaction or service relationship after contact.

Platform-owned advertising pricing/billing/accounting, security, moderation, technical operations, account controls, and legally required compliance remain in scope. Marketplace checkout, escrow, delivery/shipping, transaction settlement/payment, transaction commission payout, warranty/compensation execution, and platform-run marketplace dispute resolution remain out of scope unless a future explicit OWNER decision plus separate legal/product approval changes that boundary.
