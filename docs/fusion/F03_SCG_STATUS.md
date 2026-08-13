# F03 — SOA + Sovereign Capability Graph Status

**Status:** IN PROGRESS / DRAFT ONLY

**Owner invariant:** `docs/fusion/OWNER_RULE_ADVERTISING_CONNECTION_ONLY_2026.md`

## Implemented in this phase

- fail-closed capability snapshot contract;
- server confirmation required before privileged presentation;
- V13 authority classes and permission catalog reused as authority source;
- V13 authorization TTL envelope reused;
- unknown permissions denied;
- marketplace intermediary capability namespaces denied for checkout, escrow, delivery/shipping, marketplace settlement/commission, and dispute resolution;
- immutable capability presentation output.

## Verification state

Local isolated TDD evidence on 2026-08-14:

- RED: test failed because `scripts/fusion/f03-capability-graph.js` did not exist;
- GREEN: 4 focused tests passed, 0 failed after minimal implementation.

GitHub exact-head CI evidence is still required before F03 can be marked verified.

## Explicit unresolved scope

- Single Surface `⋮` controller integration is not yet complete;
- protected authentication / `index.html` integration remains separately gated;
- no Production deployment, SQL/database apply, RLS change, country activation, money movement, or auth weakening is authorized.

## Owner boundary

VVIP TIGER remains an advertising, discovery, and direct-contact platform only. The platform is not a party to the marketplace transaction or service relationship after contact.
