# OWNER SOVEREIGN PAYMENT RAIL FABRIC — 2026-08-22

**Status:** ACTIVE — OWNER CONSTITUTIONAL AUTHORITY
**Effective:** 2026-08-22
**Scope:** payments for TIGER-owned services only: advertising, campaigns, ad credits/packages, paid visibility and other explicitly owner-approved platform services.
**Design horizon:** 2026 → 2096+
**Relationship:** this document is a constitutional addendum to `OWNER_FOUNDATIONAL_INVARIANTS_2026-08-22.md` and is machine-enforced by `project-control/owner/OWNER_FOUNDATIONAL_INVARIANTS_2026-08-22.json`.

## 1. Boundary remains absolute

This payment architecture does **not** alter the zero-brokerage constitution.

Allowed payment purpose:
- TIGER advertising;
- TIGER campaigns;
- TIGER ad credits/packages;
- TIGER paid visibility;
- explicitly approved TIGER-owned services.

Forbidden:
- buyer-to-seller product payment;
- buyer-to-service-provider payment;
- checkout for external goods/services;
- escrow;
- external-deal settlement;
- external-deal commission/success fee.

`CONTACT HANDOFF → TIGER STOPS` remains authoritative for external deals.

---

## 2. Owner Sovereign Payment Control

The owner has constitutional root authority over the platform's payment-rail configuration.

Core owner capabilities:

```text
PAYMENT_RAIL_VIEW_ALL
PAYMENT_RAIL_CREATE
PAYMENT_RAIL_EDIT_DRAFT
PAYMENT_DESTINATION_ROTATE
PAYMENT_PROVIDER_ONBOARD
PAYMENT_RAIL_VERIFY
PAYMENT_RAIL_ACTIVATE
PAYMENT_RAIL_SUSPEND
PAYMENT_RAIL_RETIRE
PAYMENT_POLICY_EDIT
PAYMENT_CHANGESET_APPROVE
```

These are sensitive capabilities. Their existence on the owner account does not mean that every high-risk action executes from a permanently reusable token. Activation, destination rotation and retirement require fresh owner step-up and an action-bound authorization lease.

Operational preparation can later be delegated in bounded scope through the Sovereign Capability Fabric, but final activation remains owner-authorized.

---

## 3. Payment Rail Fabric — not hard-coded payment numbers

TIGER must never embed a receiving account number, alias, wallet identifier, merchant ID, API secret or other mutable payment endpoint directly into application logic.

The durable abstraction is:

```text
COUNTRY PAYMENT PROFILE
        │
        ├─ PAYMENT RAIL MANIFEST
        │      ├─ rail type
        │      ├─ provider/acquirer
        │      ├─ currencies
        │      ├─ capabilities
        │      ├─ limits/policy
        │      └─ integration adapter
        │
        └─ VERIFIED PAYMENT DESTINATION
               ├─ endpoint type
               ├─ masked display
               ├─ vault reference
               ├─ verification evidence
               └─ version
```

A country can add a new rail without rebuilding the core platform.

---

## 4. Country Payment Profile

Every country configuration is independent and versioned.

At minimum a profile separates:
- ISO country code;
- legal entity scope;
- applicable currency/currencies;
- approved payment rails;
- approved providers/acquirers;
- payment destination references;
- regulatory/compliance policy reference;
- fees/limits policy;
- supported platform-owned products;
- webhook/callback capabilities where applicable;
- reconciliation adapter;
- availability and maintenance state.

No country becomes the architectural master of the platform.

---

## 5. Payment Route DNA

Each active route has an immutable semantic identity.

Recommended canonical fields:

```text
rail_uid
country_code
legal_entity_scope
purpose_scope
rail_type
provider_or_acquirer_ref
destination_type
destination_vault_ref
supported_currencies
limits_policy_ref
regulatory_policy_ref
verification_evidence_ref
configuration_version
status
created_by
approved_by
activated_at
retired_at
```

Display names, logos and provider labels remain mutable metadata. Runtime identity never depends on the display name.

---

## 6. Verified Route Switch

Changing a payment destination is not an in-place edit of the active route.

The owner workflow is:

```text
CREATE CHANGE SET
      ↓
ENTER NEW DESTINATION / PROVIDER
      ↓
MASK + STORE SECRET/ENDPOINT BY VAULT REFERENCE
      ↓
VALIDATE FORMAT / POLICY / COUNTRY COMPATIBILITY
      ↓
VERIFY PAYEE / ENDPOINT WHERE RAIL SUPPORTS IT
      ↓
SHOW OWNER EXACT BEFORE/AFTER DIFF
      ↓
FRESH PASSKEY / PHISHING-RESISTANT STEP-UP
      ↓
MINT SHORT-LIVED ACTION LEASE
      ↓
ATOMIC ACTIVATE NEW VERSION
      ↓
KEEP PRIOR VERIFIED VERSION FOR AUDIT/ROLLBACK
```

The active configuration is never silently overwritten.

---

## 7. Payment Change Sets

Every create/change/rotate/suspend/retire operation is a versioned Change Set.

Each Change Set binds:
- requester;
- owner approval identity;
- country;
- rail;
- exact old configuration version;
- exact new configuration version;
- reason;
- verification result;
- policy version;
- risk result;
- timestamp;
- action lease;
- audit reference.

A stale Change Set cannot activate over a newer version.

---

## 8. Secure destination storage

Payment endpoints are classified by sensitivity.

Rules:
- no raw production payment API secrets in Git;
- no durable payment credentials in browser/mobile bundles;
- secret material is referenced through approved Vault/KMS/HSM infrastructure;
- UI displays sensitive destinations in masked form;
- only the minimum non-secret identifier needed for a user payment flow may be exposed;
- server-side authorization decides which endpoint/version can be used;
- logs must not leak full secrets or protected account identifiers.

Where a rail uses public receiving aliases/QR payloads, those values are still versioned and integrity-protected even if they are not cryptographic secrets.

---

## 9. Jordan profile — CliQ

Jordan (`JO`) may support `CliQ` as a country-specific configurable payment rail for TIGER-owned services when TIGER has the required lawful commercial/provider/acquirer relationship.

CliQ manifest capabilities can represent:
- Alias;
- mobile number;
- email;
- IBAN;
- merchant-acquirer QR integration;
- payee confirmation when available through the integration;
- credit/payment confirmation where available.

CliQ uses ISO 20022 in the Jordan payment ecosystem. TIGER should therefore model it through the generic instant-account-to-account rail contract rather than writing Jordan-specific logic throughout the application.

**Important:** this constitutional support does not claim that TIGER is currently contracted, certified or live on CliQ. Actual activation requires real provider/acquirer configuration and evidence.

---

## 10. Global rail portability

The same architecture must accommodate country/regional rails without redesigning the core, for example classes represented by systems such as:
- instant A2A rails;
- domestic QR/account-alias rails;
- card/acquirer rails;
- wallets;
- bank transfers;
- bill-payment rails;
- future regulated payment credentials.

Concrete providers/systems are adapters under the country profile, never constitutional dependencies.

---

## 11. No unsafe automatic fallback

TIGER must not silently redirect a payment to an unverified account, another country, another legal entity or a route outside the user's disclosed payment context.

Failover is permitted only when:
- the alternative route is already approved and verified;
- it is inside the same applicable policy/legal-entity scope;
- currency and fees remain valid/disclosed;
- the user is shown the actual payment method when the switch changes the visible experience;
- reconciliation remains deterministic.

If no verified route is available, the payment path fails closed.

---

## 12. Owner UI — simple outside, sophisticated inside

Owner Dashboard → `Payments` uses country cards, not infrastructure jargon.

Example:

```text
Jordan
────────────
CliQ             Active
Cards            Active
Wallet rail      Not configured

[ Add payment method ]
```

Selecting CliQ:

```text
Receiving destination
•••••••• AYASH

Status: Verified
Currency: JOD
Last changed: 2026-08-22

[ Change destination ]
[ Suspend ]
[ View history ]
```

When changing:

```text
Old: •••• AYASH
New: •••• TIGER
Country: Jordan
Rail: CliQ
Effect: new TIGER-owned-service payments only

[ Verify and activate ]
```

The advanced details remain available under `Details/Audit`, but the default owner interaction stays understandable without payment-infrastructure training.

---

## 13. Verification and authentication

For high-risk route administration:
- use phishing-resistant passkey/FIDO2/WebAuthn where supported;
- bind authorization to the exact Change Set hash;
- use short-lived action leases;
- use replay protection;
- require server-side policy checks;
- use provider/payee confirmation capabilities where supported;
- retain immutable audit evidence.

A password or checkbox alone is not sufficient authority for changing a live payment destination.

---

## 14. Payment state machine

```text
DRAFT
  ↓
VERIFYING
  ↓
READY
  ↓
ACTIVE
  ↙     ↘
SUSPENDED  RETIRED
```

Only verified `READY` configurations can become `ACTIVE`.

Retirement does not erase historical payment/reconciliation evidence.

---

## 15. Research basis — 2026 review

This design is informed by current global payment/security architecture patterns including:
- PCI DSS as the baseline for card-account-data environments;
- FIDO2/WebAuthn/passkeys for phishing-resistant authentication;
- EMV payment tokenisation / evolving digital payment credentials;
- ISO 20022 as a widely used financial messaging model;
- country-specific instant payment rails such as Jordan CliQ, India UPI, Brazil Pix and the U.S. FedNow model.

The constitutional principle is intentionally provider-neutral so the platform survives provider and rail replacement over decades.

---

## 16. Constitutional invariants

```text
OWNER_PAYMENT_RAIL_ROOT_AUTHORITY=true
OWNER_PAYMENT_FINAL_ACTIVATION_REQUIRED=true
OWNER_PAYMENT_HIGH_RISK_REQUIRES_FRESH_STEP_UP=true
PAYMENT_NUMBERS_HARDCODED_IN_APP=false
COUNTRY_PAYMENT_PROFILE_REQUIRED=true
PAYMENT_PROVIDER_NEUTRAL_CORE=true
NEW_PAYMENT_RAIL_REQUIRES_CORE_REBUILD=false
ACTIVE_PAYMENT_CONFIG_VERSIONED_IMMUTABLE=true
PAYMENT_CHANGESET_REQUIRED=true
PAYMENT_ROUTE_ATOMIC_ACTIVATION=true
PAYMENT_ROUTE_ROLLBACK_TO_VERIFIED_VERSION=true
RAW_PAYMENT_SECRETS_IN_CLIENT_OR_REPO=false
UNVERIFIED_PAYMENT_ROUTE_FALLBACK=false
SILENT_CROSS_COUNTRY_PAYMENT_FALLBACK=false
CLIQ_JORDAN_SUPPORTED_AS_CONFIGURABLE_RAIL=true
CLIQ_ASSUMED_LIVE_WITHOUT_REAL_PROVIDER_EVIDENCE=false
EXTERNAL_DEAL_PAYMENT_ALLOWED=false
CONTACT_HANDOFF_IS_TERMINAL=true
```
