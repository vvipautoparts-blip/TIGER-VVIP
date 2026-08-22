# OWNER PAYMENT SECURITY — 18-LAYER SOVEREIGN DEFENSE

**Status:** ACTIVE — OWNER SECURITY AUTHORITY
**Effective:** 2026-08-22
**Scope:** owner administration and runtime activation of TIGER payment rails for TIGER-owned services only.
**Design horizon:** 2026 → 2096+

## Security objective

The payment-control plane is a sovereign protected zone. It must not depend on one perimeter, one password, one device signal, one cloud provider, one client control, or one cryptographic algorithm.

The invariant is:

> **Failure or bypass of one layer MUST NOT, by itself, grant payment-route authority.**

TIGER does not claim to be impossible to hack. It requires independent controls, fail-closed authorization, strong evidence, rapid revocation and recoverability.

---

## The 18 security layers

### Layer 01 — Isolated Sovereign Payment Control Plane
Payment administration is separated from ordinary Social/Search/Discovery traffic and exposed only through dedicated owner/admin service boundaries. No public client route may directly mutate active payment configuration.

### Layer 02 — Phishing-Resistant Owner Identity
High-risk payment administration requires a passkey/FIDO2/WebAuthn-class phishing-resistant owner authentication method where the platform supports it. Password-only approval is insufficient.

### Layer 03 — Fresh Action-Bound Step-Up
Every activation, destination rotation, suspension/retirement or high-risk policy change requires fresh step-up. Authorization is bound to the exact Change Set digest, action, target rail, country, old version, new version and expiry.

### Layer 04 — Short-Lived Capability Lease
After successful step-up, the server issues a short-lived single-purpose capability lease. The lease cannot be reused for another route, another country or another action and expires quickly.

### Layer 05 — Device and App Attestation
Where supported, critical requests require verified app/device integrity signals. Android uses Play Integrity-class signals; Apple uses App Attest-class assertions. Missing/weak signals are handled according to risk policy and never converted into implicit trust.

### Layer 06 — Zero-Trust Context and Continuous Risk Check
Network location never grants trust. The server evaluates identity, device, app integrity, session age, request freshness, route sensitivity, geo/context anomalies and current revocation state at authorization time.

### Layer 07 — Server-Side Fine-Grained Authorization
The browser/mobile checkbox is never the authority. The final server/database decision evaluates principal + capability + resource + country + legal-entity scope + purpose + policy version + lease state.

### Layer 08 — Payment Destination Vault + HSM/KMS Protection
Secrets, API credentials, private payment keys and protected endpoint values are stored through Vault/KMS/HSM references. Cryptographic keys are never committed to Git or exposed as durable plaintext client secrets.

### Layer 09 — Tokenisation and Minimum Secret Exposure
Where card/account data or provider credentials require protection, use tokenisation or provider-hosted references so TIGER stores the minimum necessary sensitive material. Logs and UI expose masked/derived values only.

### Layer 10 — Verified Payee / Endpoint Binding
A new receiving destination cannot become ACTIVE merely because a string matches a format. Where the rail/provider supports it, TIGER verifies the beneficiary/payee or merchant endpoint and stores verification evidence with the route version.

### Layer 11 — Immutable Versioned Change Sets
The ACTIVE payment configuration is never edited in place. Every change produces a new immutable configuration version with a before/after diff, creator, verifier, owner approver, policy version and evidence references.

### Layer 12 — Atomic Activation + Stale-Write/Replays Defense
Activation uses compare-and-swap/version preconditions, nonce/request binding and replay prevention. A stale Change Set cannot overwrite a newer active route. Activation either completes as one state transition or fails without partial configuration.

### Layer 13 — Network and Service Segmentation
Payment administration and secret-management paths are isolated behind narrowly scoped service identities, private service boundaries where practical, strict egress/ingress rules, TLS, and service-to-service authentication. Public application services receive no ambient payment-admin credentials.

### Layer 14 — Runtime Anti-Tamper and Capture-Risk Controls
Native payment-owner screens use the platform's protected-view policy, app integrity checks, anti-tamper/anti-debug/RASP controls where justified, screen-capture risk signals and redaction. These controls increase resistance but never replace server authorization.

### Layer 15 — Signed Build and Software-Supply-Chain Provenance
Payment-control code reaches production only through verified builds with dependency pinning/scanning, signed artifacts, SBOM/provenance where supported, CI policy gates and traceable source revision. Unverified/tampered builds cannot gain payment-admin authority merely by imitating the UI.

### Layer 16 — Real-Time Anomaly Detection and Adaptive Response
High-risk changes are evaluated for unusual device/session behavior, impossible or unexpected context changes, rapid repeated attempts, abnormal route churn and other fraud indicators. Policy can require re-authentication, hold activation, revoke leases or lock the payment-control plane.

### Layer 17 — Immutable Audit, Alerting and Owner Truth
Every read of protected destination data and every create/verify/approve/activate/suspend/retire event creates an append-only audit event with actor, time, target, policy version, evidence and result. High-risk changes generate owner-visible alerts. Audit history cannot be silently rewritten by ordinary application roles.

### Layer 18 — Fail-Closed Recovery, Kill Switch and Verified Rollback
If integrity, verification, reconciliation or authorization is uncertain, new payment activation fails closed. The owner has an emergency suspend/kill capability protected by fresh step-up. Recovery can atomically restore only a previously verified configuration version; rollback never erases the incident or accounting/audit trail.

---

## Independence requirement

The 18 layers must not collapse into one shared secret or one shared admin account. In particular:
- stealing an application password is insufficient;
- controlling a UI client is insufficient;
- knowing a payment alias is insufficient;
- obtaining a stale capability lease is insufficient;
- compromising an ordinary application service is insufficient;
- compromising one CI runner is insufficient without satisfying release and runtime trust controls;
- bypassing screenshot protection is insufficient;
- bypassing obfuscation is insufficient.

The authoritative mutation still requires the server-side chain of identity, fresh approval, scoped capability, verified target/version and audit state.

---

## Owner UX

The owner sees a simple status, not 18 technical switches:

```text
Payment Security
────────────────────────
Protection posture: Strong / Action required
Route integrity: Verified
Owner step-up: Required for changes
Device/app trust: Verified / Not available / Risk
Destination: Verified
Last configuration: v17
Last owner approval: <time>

[ Change payment route ]
[ Emergency suspend ]
[ Security details ]
```

`Security details` expands the 18-layer state for audit and troubleshooting. A layer that cannot be evaluated is shown as `UNKNOWN/UNAVAILABLE`, never silently reported as secure.

---

## Cryptographic longevity

The design is crypto-agile. Algorithms, key sizes, HSM vendors and attestation providers are implementation profiles, not permanent constitutional dependencies. Payment data and evidence must retain algorithm/profile/version metadata so future cryptographic migration can occur without rebuilding the semantic core.

---

## Evidence basis

The architecture follows defense-in-depth principles reflected in current 2026 security guidance:
- NIST Zero Trust: no implicit trust from network location; authorize access to resources based on identity/context;
- NIST key-management and FIPS 140-3 ecosystem guidance for cryptographic key protection;
- PCI tokenisation guidance that strongly protects tokenisation keys, including HSM/SCD use;
- OWASP MASVS control families for storage, cryptography, authentication, network, code, resilience and privacy, including anti-tamper/static/dynamic-analysis resilience;
- Android Play Integrity hardware-backed and app-access-risk signals for device/app/capture/control risk;
- Apple App Attest hardware-backed keys and signed server assertions for legitimate app instances.

These sources inform implementation controls. They do not create a claim of absolute invulnerability.

---

## Constitutional invariants

```text
PAYMENT_SECURITY_LAYER_COUNT=18
PAYMENT_SINGLE_LAYER_BYPASS_GRANTS_AUTHORITY=false
PAYMENT_CONTROL_PLANE_ISOLATED=true
PAYMENT_OWNER_PHISHING_RESISTANT_AUTH_REQUIRED_FOR_HIGH_RISK=true
PAYMENT_ACTION_BOUND_STEP_UP=true
PAYMENT_SHORT_LIVED_CAPABILITY_LEASE=true
PAYMENT_DEVICE_APP_ATTESTATION_RISK_AWARE=true
PAYMENT_ZERO_TRUST_CONTEXT_CHECK=true
PAYMENT_AUTHORIZATION_SERVER_SIDE=true
PAYMENT_SECRET_VAULT_HSM_KMS=true
PAYMENT_MINIMUM_SECRET_EXPOSURE=true
PAYMENT_DESTINATION_VERIFICATION_REQUIRED_WHERE_SUPPORTED=true
PAYMENT_CONFIG_IMMUTABLE_VERSIONED=true
PAYMENT_ATOMIC_ACTIVATION_AND_REPLAY_DEFENSE=true
PAYMENT_SERVICE_SEGMENTATION=true
PAYMENT_RUNTIME_ANTI_TAMPER_DEFENSE_IN_DEPTH=true
PAYMENT_SIGNED_BUILD_PROVENANCE=true
PAYMENT_ANOMALY_ADAPTIVE_RESPONSE=true
PAYMENT_IMMUTABLE_AUDIT_OWNER_ALERT=true
PAYMENT_FAIL_CLOSED_KILL_SWITCH_VERIFIED_ROLLBACK=true
PAYMENT_ABSOLUTE_UNHACKABLE_CLAIM=false
```
