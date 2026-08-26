# TIGER SYNAPSE v2 + TIGER VERITY FABRIC 2026

**Status:** OWNER-APPROVED OPTION C — V2 WRITTEN SPEC FOR OWNER REVIEW

**Date:** 2026-08-18

**Design version:** `2.0-owner-review`

**Product scope:** TIGER ONE 2026 evolution after the Social Core baseline

**Baseline dependency:** PR #271 must return to GREEN; this specification does not add SYNAPSE implementation scope to PR #271

**Implementation state:** `APPROVED / NOT IMPLEMENTED`

**Owner entrypoint:** `docs/owner-control/TIGER_OWNER_CURRENT_REFERENCE_AR.md` — navigation only, not a second authority

**Parent authorities:**

- `docs/owner-control/TIGER_ONE_2026_CURRENT_OWNER_AUTHORITY.md`
- `docs/superpowers/specs/2026-08-18-tiger-one-living-surface-design.md`
- `docs/MASTER_PROJECT_STATE.md`

## 0. Authority and truth boundary

TIGER SYNAPSE is the owner-approved product innovation that extends TIGER ONE from a familiar Social Home plus Marketplace into a **Temporal Intent Operating System**. TIGER VERITY FABRIC is the approved trust, evidence, release, and authority framework that proves which exact implementation may represent that product.

It does not replace or weaken the existing federated-identity, authorization, RLS, media-security, release, legal, accessibility, or platform-role boundaries. Where this specification introduces a new product capability, it is the current product authority for that capability. Where it is silent, the stricter compatible existing authority remains binding.

Approval of this design is not implementation evidence. Until exact-head code and tests exist, every SYNAPSE capability is `APPROVED / NOT IMPLEMENTED`. The current PR remains `IN_PROGRESS` and may not be described as ready while its Quality Gate is RED.

### 0.1 Owner finality and anti-resurrection rule

The latest explicit OWNER decision recorded as `CURRENT_ONLY` is final for its decision domain. Any older document, code path, test expectation, configuration, route, generated copy, component contract, or workflow that conflicts with it becomes:

`RETIRED_FROM_CURRENT_PLATFORM / HISTORICAL_ONLY`

The conflicting authority must be removed or disconnected from current runtime, navigation, public artifacts, active tests, active configuration, implementation plans, and current documentation. Compatibility, rollback, feature flags, comments, or archived files may not resurrect it.

Necessary Git or archive evidence may remain for audit, security, provenance, and decision history only. It must stay outside the public platform and carries no product or runtime authority. Physical Git-history deletion is a separately governed destructive operation, not the ordinary meaning of product supersession.

Non-conflicting stricter security, privacy, identity, RLS, financial-integrity, legal, release, and evidence protections remain binding unless the OWNER explicitly replaces them through an equally safe current authority.

The names `TIGER SYNAPSE`, `TIGER NOW Graph`, `Match Constellation`, `Proof-of-Now`, `Mutual Reveal Handshake`, and `Connection Cell` are product identifiers defined by this specification. This document does not claim trademark registration, patent protection, or legal exclusivity; those require separate professional searches and filings.

## 1. Product thesis

Facebook organizes people and content. Conventional marketplaces organize listings. TIGER SYNAPSE organizes **what people need or can offer now, who can satisfy it, where, when, and with what current evidence**.

The product promise is:

> **Express an intent once. Receive a small, explainable constellation of relevant people, offers, content, and opportunities. Reveal only what is needed. Connect directly.**

TIGER is not a social feed with advertisements attached and not a marketplace with social decoration. Social content, commercial objects, active needs, availability, evidence, and direct contact are different projections of one time-aware intent graph.

## 2. Definition of differentiation

The differentiating unit is not a screen, AI button, chat room, or visual theme. It is the combination of five enforceable behaviors:

1. **Intent-first discovery:** a structured need or offer can drive discovery without forcing manual browsing through thousands of listings.
2. **Temporal relevance:** intent, availability, evidence, and relationships decay or expire instead of remaining indefinitely authoritative.
3. **Hybrid private matching:** sensitive exact constraints can remain on-device while the network retrieves broad candidates.
4. **Explainable small results:** the default result is a bounded constellation, not an infinite undifferentiated list.
5. **Progressive mutual disclosure:** identity and contact fields are revealed by explicit, field-scoped consent instead of all-or-nothing exposure.

Visual familiarity from Facebook and marketplace depth from OpenSooq remain interaction references only. Their protected branding, assets, private APIs, ranking models, pixel identity, and product authority are not copied.

## 3. Non-negotiable platform boundaries

VVIP TIGER remains an advertising, discovery, presentation, and direct-contact platform.

TIGER SYNAPSE does not introduce:

- marketplace checkout;
- escrow;
- platform-held buyer or seller money;
- commission on the user-to-user transaction;
- delivery or shipping execution;
- transfer of ownership;
- warranty execution;
- confirmation that a physical handover legally occurred;
- platform-run transaction disputes or compensation;
- a claim that evidence proves legal ownership or eliminates fraud.

The `Connection Cell` may help users organize communication, questions, user-authored price proposals, appointments, and an exportable personal summary. Those records remain user communications outside TIGER transaction authority. The Cell may not claim that TIGER formed, guaranteed, completed, or enforced the underlying deal.

TIGER revenue remains advertising and platform-owned publishing services. Sponsored visibility must be labeled, relevance-gated, budget-bounded, and incapable of overriding safety or eligibility policy.

## 4. Chosen architecture

The approved option C architecture contains two coupled systems with different responsibilities:

1. **TIGER SYNAPSE v2 — Product Intelligence Plane:** a hybrid edge–cloud Temporal Intent Operating System, with progressive device capability, regional retrieval where available, and server-authoritative policy and persistence.
2. **TIGER VERITY FABRIC — Trust and Release Plane:** an authority graph, hermetic build core, exact multi-artifact identity, typed evidence capsules, P01–P20 policy evaluation, and fresh live-runtime witnesses.

Neither plane may grant authority to the other through an unverified claim. SYNAPSE cannot mark itself trusted because a model said so; VERITY cannot describe a product capability as implemented because a specification exists.

### Rejected as sole authority

- **Cloud-only superbrain:** rejected as the sole model because it increases latency, privacy exposure, provider dependency, and inference cost.
- **Device-only decentralized mesh:** rejected as the sole model because device capability, browser support, global reach, moderation, and availability are inconsistent.
- **Unbounded microservices rewrite:** rejected because it would duplicate current authorities and delay product proof.
- **One system described as fully hermetic:** rejected because live AWS, DNS, TLS, identity, email, webhook, and analytics evidence depends on external state and time. Only the build core can be hermetic.
- **A second evidence framework beside TSRF:** rejected because the existing Release DNA and Proof Capsule contracts must be extended, not bypassed or duplicated.

### Hybrid rule

- the device may parse, draft, privately enrich, and privately re-rank;
- the trusted backend validates, persists, filters, authorizes, and emits server-confirmed state;
- regional/edge infrastructure may accelerate eligible retrieval and delivery but does not become a second authority;
- every advanced path has a deterministic non-AI fallback;
- the current static HTML/CSS/JavaScript delivery boundary remains until a separately approved architecture changes it.

### Trust-plane rule

- the hermetic core proves source, build inputs, artifact bytes, policies, and deterministic checks;
- the live witness edge proves time-bounded provider state from read-only observations;
- a Release Proof Root binds both classes without pretending that live observations are hermetic;
- no source document embeds a self-referential commit SHA as proof of the commit that contains it;
- CI-generated attestations bind exact commit SHA, exact tree SHA, authority-document digests, artifact digests, policy digests, and trusted producer identity.

## 5. System components

### 5.1 TIGER Intent Cortex

Converts user-authorized text, voice transcription, image context, marketplace query, social-post action, or structured form input into an `Intent Envelope`.

It must:

- show the normalized intent before activation;
- distinguish a need from an offer;
- separate required constraints from preferences;
- attach an explicit expiry;
- preserve the user's original input for correction locally by default, with server retention only when the activation contract and policy explicitly require it;
- never infer a sensitive attribute that the user did not provide or authorize;
- support a deterministic structured-entry fallback.

Raw voice, image, or document input used only to draft an intent is not uploaded or retained by default. Any server-assisted path must preview the data class, purpose, provider boundary, and retention consequence before consent.

### 5.2 TIGER NOW Graph

A time-aware graph projection over authoritative records. It connects:

- people and businesses;
- social content;
- active needs and offers;
- marketplace listings and services;
- coarse places and travel windows;
- availability windows;
- evidence capsules;
- consent grants;
- connection cells.

The graph is a derived discovery model, not an authorization database. RLS, ownership, moderation, and capability policy remain authoritative outside ranking.

Every temporal edge has a source, creation time, expiry or decay policy, visibility class, and revocation behavior.

### 5.3 Match Fabric

Runs a bounded matching pipeline:

1. validate and normalize the intent;
2. enforce identity, visibility, policy, country, and sector eligibility;
3. retrieve lexical, categorical, vector, geospatial, and social-context candidates;
4. remove blocked, expired, stale, duplicate, self-owned, and ineligible objects;
5. calculate explainable feature contributions;
6. optionally re-rank exact private preferences on-device;
7. diversify the result so one seller or content type cannot dominate;
8. produce a bounded `Match Constellation`.

No large-language-model output may directly grant eligibility, authorization, verification, or paid placement.

### 5.4 Match Constellation

The default result contains **3–7 primary matches** when that many candidates clear policy and relevance thresholds. It may show 0–2 truthful results when supply is limited; it never pads the constellation with weak or ineligible items. Additional results require an explicit expansion action.

Each result explains safe reasons such as:

- category and attribute fit;
- approximate location or travel-time fit;
- price-range overlap;
- current availability;
- evidence freshness;
- relationship or community relevance;
- sponsored status.

Internal risk scores, hidden moderation signals, fraud heuristics, private exact location, and other users' sensitive constraints are never exposed as explanations.

### 5.5 Proof-of-Now

Provides challenge-response evidence that a current capture was completed for a specific listing or offer.

The server generates a short-lived randomized challenge, such as a requested angle, visual gesture, spoken phrase, displayed code, or limited serial fragment. The client captures only the authorized media, applies the approved media-security pipeline, and submits a content digest plus bounded metadata. Accessible challenge alternatives are mandatory; a spoken or visual challenge must not become covert biometric extraction.

Visible result classes are limited to truthful statements such as:

- `Fresh capture completed`;
- `Integrity checks passed`;
- `Challenge expired`;
- `Evidence stale`;
- `Evidence unavailable`.

Proof-of-Now does not state `Owner verified`, `Condition guaranteed`, or `Fraud impossible` unless a separate legally sufficient authority provides that exact credential.

Freshness means the randomized challenge was completed within the stated window and passed the stated integrity checks. It does not independently prove the truth of client-provided time, location, identity, ownership, item condition, or surrounding context.

Precise location is not published. The system stores or exposes only the minimum location precision required by the approved use case and policy.

Replay resistance does not depend on a client clock or a fixed `±5 seconds` tolerance. The trusted backend issues an unpredictable, single-use challenge bound to the actor, object, purpose, policy version, and expiry. Acceptance uses server-observed time, requires the returned challenge and capture digest to match, and atomically consumes the challenge so a second submission fails even inside the validity window. Client timestamps and coordinates remain untrusted claims.

### 5.6 Mutual Reveal Handshake

Controls progressive disclosure between matched parties.

Disclosure is field-scoped. A grant may be revoked for future TIGER access where technically and legally possible, but revocation cannot erase information the recipient already viewed, copied, or exported. The confirmation UX must explain that limit before a sensitive field is revealed. Example grants include:

- display name;
- business identity;
- approximate area;
- phone number;
- external messaging handle;
- appointment window;
- selected evidence.

A reveal request must identify the fields, purpose, recipient, expiry, and user action that authorized it. Silence, scrolling, viewing, or inferred interest is never consent.

### 5.7 Connection Cell

A temporary communication workspace created only after an eligible user action.

It may contain:

- messages and attachments;
- structured questions and answers;
- user-authored price proposals clearly outside TIGER transaction authority;
- appointment options;
- selected evidence capsules;
- a user-exportable summary;
- block, report, leave, and expire controls.

It does not contain platform payment, delivery confirmation, escrow, ownership transfer, or binding dispute adjudication.

### 5.8 TIGER Co-Pilot

Assists without taking user authority. It may:

- improve intent wording;
- identify missing constraints;
- compare the visible matches;
- summarize a connection cell;
- translate user-authorized content;
- warn about contradictions or stale evidence;
- suggest the next safe action.

It may not:

- activate an intent without confirmation;
- reveal contact information;
- publish a post or listing;
- accept or reject an offer;
- impersonate a user;
- move money;
- claim legal, ownership, safety, or quality certainty;
- bypass moderation or server policy.

### 5.9 Living Surface

SYNAPSE appears through one coherent TIGER ONE surface rather than separate mini-products.

- **Social Home:** familiar feed, Composer, Stories when implemented, and one compact `أحتاج / I need` entry.
- **Constellation mode:** the focused intent workspace and bounded matches.
- **Marketplace:** ordinary search remains available; complex or zero-result searches may become editable draft intents.
- **Social post:** eligible posts expose `أريد شيئًا مشابهًا / I need something like this` and `يمكنني توفيره / I can offer this`.
- **Profile:** active, paused, expired, and saved intents appear under explicit privacy rules.
- **Messages:** eligible mutual matches open a Connection Cell rather than an unrelated chat product.

Only one primary action is dominant in each context. Advanced details reveal progressively. Duplicate permanent navigation bars, emoji navigation, decorative AI buttons, and separate visual identities are prohibited.

### 5.10 Qualified Intent Advertising

Paid content participates only after ordinary eligibility and minimum relevance are satisfied.

Rules:

- a paid item is always labeled;
- payment cannot repair an unsafe, expired, blocked, or irrelevant item;
- organic and sponsored scores are independently observable in audit data;
- frequency and budget are bounded;
- impression accounting follows the current authoritative visibility and anti-duplication rules;
- the user can understand why the item is relevant and why it is sponsored;
- ad spend does not purchase private intent details or precise location;
- advertisers receive neither the raw intent nor the user's identity, private constraints, contact fields, or exact location; targeting uses only policy-approved, purpose-bound features.

## 6. Core domain model

### 6.1 Intent Envelope

Required fields:

- stable intent ID;
- actor subject reference owned by the trusted backend;
- `NEED` or `OFFER` direction;
- sector and category;
- normalized summary;
- required constraints;
- optional preferences;
- coarse market and location policy;
- activation mode;
- visibility class;
- creation and expiry times;
- status;
- source provenance;
- schema and policy versions;
- authoritative revision for concurrency and reconciliation.

The browser never chooses the authoritative actor subject.

Lifecycle states and allowed transitions:

| From | To | Authority condition |
|---|---|---|
| `DRAFT_LOCAL` | `CONFIRMED` | explicit user confirmation |
| `CONFIRMED` | `MATCHING` | authenticated, actor-bound command accepted |
| `MATCHING` | `ACTIVE` | policy and visibility admission succeeds |
| `ACTIVE` | `PAUSED` | user or authorized safety action |
| `PAUSED` | `ACTIVE` | fresh authorization and policy revalidation |
| `CONFIRMED`, `MATCHING` | `REJECTED` | validation or policy admission fails |
| `CONFIRMED`, `MATCHING`, `ACTIVE`, `PAUSED` | `CANCELLED` | user or authorized terminal cancellation |
| `ACTIVE`, `PAUSED` | `EXPIRED` | authoritative expiry is reached |

`REJECTED`, `CANCELLED`, and `EXPIRED` are terminal for that intent version. A correction creates a new version or draft; it does not rewrite terminal history. Invalid, unauthorized, stale, or policy-deficient transitions fail closed.

### 6.2 Match

A match references an intent and one eligible candidate. It stores bounded scoring features, safe explanations, rank version, expiry, sponsored state, and the policy snapshot used to admit it.

Lifecycle states and allowed transitions:

- `CANDIDATE → EXPLAINED` after safe explanation generation;
- `EXPLAINED → SHORTLISTED` only from an explicit user action;
- `SHORTLISTED → REVEAL_REQUESTED` only through a bounded request;
- `REVEAL_REQUESTED → MUTUALLY_REVEALED` only after valid reciprocal consent;
- any eligible nonterminal state may become `EXPIRED` when its authoritative window closes;
- user rejection may produce `DISMISSED` or `DECLINED` without exposing a private reason;
- `MUTUALLY_REVEALED → CLOSED` ends active matching without asserting transaction outcome.

`DISMISSED`, `DECLINED`, `EXPIRED`, and `CLOSED` are terminal. Ranking is never proof of trust or transaction success.

### 6.3 Evidence Capsule

An Evidence Capsule references the challenge, capture digest, safe media derivative, capture time, freshness window, validation results, issuer, revocation state, and disclosure policy.

Lifecycle transitions:

- `REQUESTED → CAPTURED → INTEGRITY_CHECKED → FRESH` is the successful path;
- a short-lived request that is not completed becomes `EXPIRED`;
- a failed capture or integrity check becomes `REJECTED` with a safe reason class;
- `FRESH → STALE` when the freshness window ends;
- `FRESH` or `STALE` may become `REVOKED` through the authorized policy path.

### 6.4 Disclosure Grant

A Disclosure Grant binds one field set to one recipient, purpose, expiry, and consent event. It cannot broaden itself after creation.

Lifecycle transitions:

- `REQUESTED → GRANTED | REJECTED | EXPIRED`;
- `GRANTED → REVOKED | EXPIRED`.

`REVOKED` blocks subsequent authorized retrieval through TIGER. It does not promise deletion from a recipient's memory, screenshots, device, or lawful records.

### 6.5 Connection Cell

A Connection Cell references eligible participants, originating match, retention class, lifecycle state, and bounded participant actions. It enters `OPEN` only after participant eligibility and the required mutual grant are server-confirmed.

Lifecycle transitions:

- `OPEN → EXPIRED | LEFT | MODERATION_LOCKED | ARCHIVED`;
- `MODERATION_LOCKED → OPEN | ARCHIVED` only through authorized moderation policy;
- an expired or left Cell may be archived according to retention policy but cannot silently reopen.

There is no `PAID`, `DELIVERED`, or `DISPUTE_RESOLVED` state.

### 6.6 Retention and derived-data rule

Every server-side intent, match, evidence capsule, disclosure grant, Connection Cell, audit event, and derived search or graph record carries a policy-owned retention class and deletion eligibility. Expiry removes the object from active discovery immediately; asynchronous cleanup must also retire derived indexes, embeddings, caches, and notification payloads within the applicable policy window. Legal or security holds require a separately authorized reason and audit trail and do not restore product visibility.

## 7. Intent activation modes

All three owner-requested modes exist, but the user controls them per intent:

### `PRIVATE_LOCAL`

The draft and exact private preferences remain on the device. The user may use local organization and manual marketplace search without network activation.

### `ASSISTED`

The device or trusted service suggests normalization and candidate categories. Nothing becomes an active network intent until the user confirms the preview.

### `LIVE_NETWORK`

The confirmed, minimum-necessary Intent Envelope is published to the eligible matching network for an explicit duration. A persistent visible indicator, pause action, and expiry are mandatory.

Automatic cloud inference may create a **draft suggestion only**. It may never silently create `LIVE_NETWORK` state.

### Signal authority classes

Signals are separated by authority, not merely by weight:

1. **Declared Intent:** explicit user input that may become authoritative only after preview and confirmation.
2. **Ephemeral Context:** dwell, active tab, local sequence, and similar interaction hints; local-only by default, short-lived, non-authoritative, and never sufficient to create or expose an intent.
3. **Network Intent:** the minimum confirmed envelope admitted by server policy under `LIVE_NETWORK`.

Location interaction, passive viewing, dwell time, scrolling, inferred demographic traits, or hidden model output never activate `LIVE_NETWORK`, reveal a field, or create a durable advertising profile by themselves.

## 8. End-to-end data flows

### 8.1 Home to Constellation

1. User selects `أحتاج`.
2. Cortex accepts text, structured entry, authorized voice transcription, or authorized image context.
3. A local preview shows normalized meaning, sensitive fields, market, and expiry.
4. User edits and confirms.
5. Trusted runtime validates and creates the intent through a bounded command.
6. Match Fabric returns a small first constellation.
7. Later server-confirmed updates stream without replacing the user's scroll or focus context.

### 8.2 Marketplace query rescue

1. User enters a complex query or receives no useful results.
2. TIGER offers to convert the query into an editable intent draft.
3. No intent is activated until confirmation.
4. Existing listings and future eligible offers may satisfy the intent through the same Match Fabric.

### 8.3 Social content to intent

1. User invokes `أريد شيئًا مشابهًا` on eligible content.
2. TIGER copies only safe referenced attributes into a draft.
3. Private post content, author identity, or media is not silently republished.
4. User reviews and confirms the new intent.

### 8.4 Match to Connection Cell

1. User shortlists a match.
2. The first party requests bounded disclosure or contact.
3. The other party receives an explicit request.
4. Mutual consent creates the grant and eligible Connection Cell.
5. Revocation, leave, block, report, expiry, and retention rules remain available.

### 8.5 Offline and recovery

1. Local drafts remain clearly local.
2. Commands enter an outbox with idempotency identity.
3. UI shows `Pending`, never false success.
4. Reconnect revalidates auth, policy, expiry, and current object version.
5. Accepted commands reconcile into server-confirmed state; rejected commands show a safe correction path.

## 9. Matching and explainability policy

### 9.1 Temporal intent model

The baseline intent-strength model uses signal-specific time and half-life rather than one shared timestamp and decay constant:

$$
I_{u,c}(t)=\operatorname{clip}\left(
\sum_i a_i q_i w_{k_i} g(S_i)
e^{-\ln(2)(t-t_i)/h_{k_i}}
-\sum_j p_j,
0,
1
\right)
$$

Where:

- $a_i \in \{0,1\}$ is policy and consent admissibility;
- $q_i \in [0,1]$ is bounded signal quality/confidence;
- $w_{k_i}$ is the versioned weight for signal class $k_i$;
- $t_i$ is that signal's server-confirmed or safely local event time;
- $h_{k_i}$ is the class-specific half-life;
- $g(S_i)$ is a bounded normalization function;
- $p_j$ represents explicit rejection, hide, duplication, staleness, or other safe negative evidence;
- `clip` prevents an unbounded or misleading score.

Private/local-only signals are evaluated on-device and are not logged merely to reproduce a score. The formula is a deterministic baseline and evaluation contract, not permission to collect a signal. Every included class requires a documented purpose, retention rule, abuse review, and user control.

Eligibility is a hard policy boundary before ranking:

$$
R(c)=E(c)\times\operatorname{Calibrate}\left(
\alpha I+\beta F+\gamma N+\delta D-\zeta K
\right)
$$

Where $E(c)$ is exactly `0` or `1` after authorization, visibility, sector, market, moderation, expiry, and safety policy; $F$ is structured fit; $N$ is freshness/availability; $D$ is diversity value; and $K$ is a bounded risk penalty. Payment never changes $E(c)$ from `0` to `1` and sponsored selection remains separately labeled and audited.

Weights, half-lives, calibration, and thresholds are versioned configuration validated by offline evaluation and controlled experiments. They are not hard-coded marketing claims and cannot be changed by an advertiser or generative model.

### 9.2 Candidate generation and explanations

Candidate generation may combine:

- exact structured filters;
- taxonomy and attribute compatibility;
- normalized full-text search;
- semantic vector similarity;
- coarse geospatial and travel-window constraints;
- social or business relationship context allowed by privacy policy;
- freshness and availability;
- evidence freshness;
- diversity and duplicate suppression.

Ranking must be versioned and auditable. The system records enough bounded feature evidence to reproduce why an item was admitted and ordered without logging raw private text unnecessarily.

The following never determine eligibility by themselves:

- generative-model opinion;
- paid spend;
- client-provided trust flags;
- email or phone ownership without current identity authority;
- hidden client role strings;
- self-asserted verification.

Users receive safe explanations and controls to hide, report, refine, broaden, or narrow future results.

## 10. Security, identity, and privacy

- Clerk/external federated identity remains authentication authority.
- VVIP authorization, RLS, moderation, audit, and capability policy remain server authoritative.
- Passkeys/WebAuthn may provide strong user-presence or step-up proof through the approved identity layer; browser code does not mint privileged authority.
- Verifiable Credentials may carry issuer-signed claims when an approved issuer and policy exist. They do not convert self-claims into truth.
- Selective disclosure is preferred over revealing full credentials.
- exact location, budget, private messages, contact fields, hidden risk data, and raw inference traces are minimized and purpose-bound.
- all public and participant-visible text is rendered through safe text APIs; no raw user HTML is trusted.
- media follows the current F05/Media Fortress finalization and privacy rules.
- every sensitive command is actor-bound, idempotent where required, rate-limited, auditable, and fail-closed.

No passive behavior grants consent. No AI model receives unrestricted repository secrets, provider tokens, private message history, or exact user data unrelated to the current purpose.

## 11. Realtime, offline, and consistency

Realtime presentation uses a replaceable event adapter. Domain state remains durable and queryable outside the realtime transport.

Rules:

- server sequence/version controls ordering;
- duplicate events are idempotently suppressed;
- reconnect performs bounded reconciliation rather than trusting missed events;
- stale client updates cannot overwrite newer server state;
- optimistic presentation is limited to reversible local feedback;
- publication, disclosure, messaging, moderation, paid placement, and verification remain pending until server confirmation;
- private cached content follows explicit cache and retention policy;
- Data Saver suppresses nonessential media, animation, prefetch, and model download.

## 12. Performance budgets

The following are engineering targets to verify on defined devices and networks, not unconditional marketing guarantees:

- local press feedback: `≤ 50 ms` target;
- local intent draft normalization on capable devices: `≤ 250 ms` target;
- structured fallback normalization: `≤ 600 ms` target;
- warm regional first constellation: `P95 ≤ 800 ms` target;
- cold or weak-network first useful state: `≤ 2.5 s` target with immediate skeleton/text feedback;
- eligible realtime update presentation: `≤ 2 s` target while online;
- steady feed and constellation scrolling: `60 fps` target on the agreed reference device class;
- layout shift: stable reserved geometry with no avoidable late insertion;
- bounded memory: old feed, match, and media nodes are released outside the active window;
- bounded bytes: no mandatory large local model download for core access.

No requirement uses `0 ms latency`. Measurements must report device, browser/app version, network class, sample size, percentile, and exact source SHA.

## 13. AI portability and fallback

Built-in browser AI is treated as progressive enhancement because support and hardware requirements differ across browsers and mobile devices.

The product contract is provider-neutral:

- feature-detect local capability;
- prefer a small purpose-specific local model or deterministic parser where useful;
- use approved cloud inference only for the minimum authorized payload;
- cache no sensitive prompt by default;
- version prompts, models, schemas, safety policy, and evaluation sets;
- expose deterministic correction when AI is unavailable or wrong;
- never block core Social Home, Marketplace search, or structured intent creation on AI availability.

## 14. Global and geographical behavior

SYNAPSE respects the existing four geography layers:

- identity country;
- active market country;
- legal entity country;
- data residency country.

Intent matching uses active-market and user-authorized location policy. Tax, legal, advertising, moderation, sector, and data-residency rules remain configuration and policy driven.

Arabic and English use one component and domain system. Currency, number, date, distance, time-window, and travel-time presentation are locale aware. Exact location is never inferred from language or identity country.

## 15. Safety, abuse, and failure behavior

The system must cover:

- intent spam and duplicate flooding;
- seller-response spam;
- scraping and enumeration;
- stalking and location triangulation;
- discriminatory targeting;
- fake or replayed evidence;
- manipulated media;
- impersonation;
- prohibited goods and services;
- model prompt injection and adversarial content;
- coordinated ranking manipulation;
- sponsored-result abuse;
- harassment inside Connection Cells;
- minors and legally restricted categories where applicable.

Safety actions include eligibility filtering, rate limits, progressive friction, evidence challenge rotation, block, mute, report, moderation lock, visibility reduction, and safe account-state handling.

Failure UX distinguishes retryable network failure, user-correctable input, policy unavailability, authorization denial, stale state, evidence failure, and integrity failure. It never exposes private resource existence or internal abuse signals.

## 16. Accessibility and interaction quality

Critical journeys target WCAG 2.2 AA quality.

Required behavior includes:

- full keyboard and screen-reader access;
- visible focus and logical restoration after sheets/modes;
- minimum comfortable touch targets;
- text scaling without clipping;
- reduced motion;
- high-contrast and non-color-only states;
- Arabic RTL and English LTR ordering;
- accessible match reasons and sponsored labels;
- live updates that do not steal focus or create excessive announcements;
- a non-AI path for every core action;
- no drag-only, swipe-only, or hidden-gesture critical action.

## 17. Current-stack integration boundary

The first implementation must extend current authority rather than create a parallel application:

- `index.html` remains the authoritative unified entry point;
- TIGER ONE semantic tokens and type roles remain visual authority;
- Social Home remains the default familiar surface;
- Marketplace remains a module inside the unified surface;
- browser runtime uses bounded adapters and server-owned actor identity;
- Supabase/PostgreSQL migrations remain current schema authority;
- RLS and bounded RPCs remain mandatory for browser-accessible data;
- the release builder must exact-allowlist every new public module;
- no framework, bundler, or package-wide application rewrite is introduced without separate approval;
- future AWS components require their planned ADRs and cannot form a second live authority beside the current runtime.

### 17.1 F05 media-preservation contract

Option C preserves the verified local-first F05/Media Fortress contract unless a benchmarked, separately approved media decision replaces it:

- HEIC/HEIF source ceiling: `15 MiB`;
- decoded-content ceiling: `40,000,000 pixels`;
- conservative admission estimate: `12 bytes/pixel + 32 MiB` overhead;
- maximum WASM memory budget: `384 MiB`;
- HEIF decode concurrency: `1`;
- current hard per-photo worker timeout: `20 seconds`;
- canonical client derivative: JPEG/WebP, maximum `1600×1200`, metadata/privacy checked;
- trusted server finalizer input: JPEG/WebP only, maximum `10 MiB`, strict container and decoded-dimension checks, complete sRGB re-encode, and server-recorded digest;
- original HEIC/HEIF bytes never become public or server-side conversion input through the normal F05 path.

An `8 second` goal may be measured as a performance objective on named devices, but it does not replace the current safe timeout without representative low-memory/mobile evidence. A larger compressed-file limit never substitutes for decoded-pixel, codec, sequence, memory, concurrency, and output-surface admission.

## 18. TIGER VERITY FABRIC

### 18.1 Owner Authority Graph

The owner returns through one stable entrypoint:

`docs/owner-control/TIGER_OWNER_CURRENT_REFERENCE_AR.md`

That entrypoint routes to the current human authority, current domain specifications, machine contract, and exact-source evidence. It is not a second copy of mutable project status.

Every current authority document must expose a machine-readable record, directly or through the authority registry, containing:

- stable `authority_id`;
- decision domain;
- semantic authority version;
- `CURRENT_ONLY`, `HISTORICAL_ONLY`, or bounded migration status;
- owner decision reference;
- explicit `supersedes` relationships;
- protected boundaries it does not replace;
- repository-relative canonical path.

The record does not embed a self-referential SHA for the commit that contains it. CI derives the document digest and binds it to trusted Git commit/tree identity in an external attestation.

The Authority Graph must be acyclic and permit exactly one current decision per domain. A conflict, duplicate current authority, broken supersession reference, or attempted resurrection fails closed.

### 18.2 Hermetic Build Core and sealed artifacts

The release is a set of separately sealed subjects, never one ambiguous folder:

1. **Web Artifact:** exact-file allowlist generated by `tools/vvip_public_release.py`; no prefix or extension wildcard automatically publishes a new file.
2. **Media Finalizer OCI Image:** immutable digest of the Node.js 24/Sharp container plus its dependency and base-image evidence.
3. **Migration Bundle:** ordered immutable migration digests and schema-compatibility metadata; SQL is never included in the public web artifact.

Each subject receives its own SHA-256 digest, CycloneDX SBOM, build provenance, vulnerability policy result, and signature/attestation. The umbrella release references the three subject digests; it does not copy the Lambda service or migration sources into the public site.

Hermetic checks cover trusted source bytes, pinned tools/images, deterministic inputs, exact allowlists, generated manifests, tests, and artifact hashing. Network-dependent external-state checks are excluded from the hermetic claim.

### 18.3 Release DNA and Release Proof Root

The existing TSRF Release DNA and Proof Capsule implementation remains the foundation. VERITY extends it rather than creating `project-control/evidence-templates/` as a parallel, weaker authority.

The final Release Proof Root binds:

```text
Release Proof Root
├── exact commit SHA and exact tree SHA
├── authority graph digest
├── Web Artifact digest + SBOM + provenance
├── Media Finalizer image digest + SBOM + provenance
├── Migration Bundle digest + compatibility contract
├── P01–P19 typed evidence results
└── P20 fresh live-runtime witness
```

The root is derived from canonical serialized records and authenticated producer context. A caller cannot supply approval, production readiness, trusted runner identity, or secret-bearing metadata inside a proof payload.

### 18.4 P01–P20 Gate Compiler

The current P01–P20 list becomes executable policy through two strict schemas.

Each **Gate Definition** includes:

- gate ID and control version;
- subject types and environments;
- prerequisite gates;
- required evidence classes;
- trusted producer and verifier policy;
- freshness/expiry policy;
- deterministic pass expression;
- failure severity and block behavior;
- rollback and recovery reference.

Each **Evidence Envelope** includes:

- evidence and gate IDs;
- schema/control version;
- exact source and subject digests;
- environment class;
- trusted producer identity;
- observation start/completion/generation times;
- expiry where evidence is time-bound;
- bounded validation facts;
- evidence artifact name/digest;
- `PASS` or `BLOCKED` result.

Evidence never grants itself authority. Human notes may explain a block but cannot convert a failed machine fact into PASS. A formal exception, when legally unavoidable, is a separate owner-signed time-bounded risk acceptance that never falsifies the underlying gate result.

### 18.5 Runtime Witness Edge

AWS, DNS, TLS, identity, email, webhooks, analytics, and error tracking are observed through least-privilege read-only provider access. Each witness:

- names the exact artifact/release digest it observed;
- records provider/account/environment identifiers without secrets;
- uses server/provider time;
- has an explicit freshness window;
- distinguishes unavailable evidence from a negative result;
- cannot be reused for another release digest;
- is regenerated after deployment, rollback, DNS change, certificate change, or expiry.

P20 passes only when the live AWS runtime serves the sealed release subject and fresh health/smoke evidence matches the expected digest. A historical successful deployment is not current proof.

### 18.6 Authority linter and anti-zombie policy

The replacement for a broad string-based `zombie_doc_scanner.py` is a scoped **Authority Linter**:

- parse registered current/historical authority metadata;
- enforce one current authority per domain;
- verify supersession links and prevent cycles;
- reject historical documents from active indexes, public artifacts, generated current references, and runtime imports;
- scan protected runtime/public-authority paths for retired domains, forbidden Preview URLs, fake-live markers, test credentials, and legacy entrypoints;
- require any allowed migration adapter to declare owner, removal condition, observable usage, and expiry;
- emit an exact machine report bound to the source tree.

The linter does not fail every `TODO` or every historical mention across the repository. Protected-path TODO/FIXME debt requires a registered owner, issue/reference, reason, and expiry; unregistered debt fails. Historical evidence remains searchable for audit but cannot become active authority.

Internal links and canonical paths are checked hermetically. External-link availability is a separate time-bound observation so a transient website outage cannot rewrite source truth.

### 18.7 Forward-Compatible Rollback Contract

Rollback promotes a previously built, signed, immutable artifact; it does not rebuild old source during an incident.

Every release declares:

- minimum and maximum compatible schema versions;
- expand/migrate/contract phase and irreversible-operation status;
- feature/format versions understood by the old and new runtimes;
- required kill switches and traffic-shift controls;
- data backfill state;
- rollback health checks and maximum decision window;
- current vulnerability-policy result for the rollback artifact and its dependencies.

An SBOM differential is evidence, not the sole decision. Rollback is blocked if the target artifact fails signature/provenance verification, current security policy, configuration compatibility, or schema compatibility. Destructive down migrations are not an ordinary application rollback mechanism.

### 18.8 VERITY failure behavior

- missing material evidence becomes `INSUFFICIENT_EVIDENCE` or `BLOCKED`, never assumed PASS;
- stale live evidence cannot satisfy a current gate;
- conflicting digests block promotion;
- unavailable third-party evidence remains an explicit external blocker;
- a failed product gate cannot be hidden by a successful security gate, and vice versa;
- no UI, README, PR description, or owner summary may claim readiness beyond the strongest exact evidence.

## 19. Implementation decomposition

TIGER SYNAPSE and TIGER VERITY FABRIC are too large for one safe implementation PR. They are one north-star architecture delivered through two ordered lanes of independently verifiable slices. `S0` is the first hard prerequisite; no new lane may hide the existing Social Core RED state.

### S0 — Restore Social Core GREEN

Complete comments/replies and the existing PR #271 Quality Gate before claiming a SYNAPSE implementation baseline.

### S1 — Intent domain foundation

Intent Envelope normalization, state machine, bounded storage/RPC contract, privacy modes, expiry, and static tests.

### S2 — Match Fabric foundation

Eligibility filtering, deterministic baseline matching, safe explanations, diversity, versioning, and evaluation fixtures. AI/vector ranking remains an optional enhancer after the deterministic contract works.

### S3 — Living Surface integration

Home entry, Constellation mode, Marketplace query rescue, social-to-intent actions, accessibility, and mobile/desktop continuity.

### S4 — Proof-of-Now

Challenge service contract, safe capture pipeline, evidence states, freshness, replay resistance, privacy, and explicit non-guarantee copy.

### S5 — Mutual Reveal and Connection Cell

Field-scoped grants, request/accept/reject/expire flows, bounded messaging adapter, block/report, retention, and exportable personal summary.

### S6 — Hybrid intelligence and realtime

Local capability detection, deterministic fallback, approved cloud adapter, event transport, outbox/reconciliation, offline and Data Saver behavior.

### S7 — Qualified Intent Advertising

Relevance floor, sponsorship labels, impression accounting integration, frequency limits, audit separation, and advertiser reporting.

### S8 — Global hardening

Performance evidence, multilingual/RTL, abuse evaluations, privacy review, accessibility review, operational recovery, exact-head Preview, and production-bound ADRs.

### V0 — Owner Authority Graph foundation

Owner entrypoint, authority metadata/registry, one-current-per-domain validator, supersession graph, anti-resurrection rules, and current/historical index separation.

### V1 — Typed P01–P20 evidence contracts

Extend TSRF Release DNA and Proof Capsules with Gate Definition and Evidence Envelope schemas, gate dependencies, freshness, trusted producer policy, canonical results, and negative tests.

### V2 — Sealed multi-artifact release

Separate Web Artifact, Media Finalizer OCI Image, and Migration Bundle identities; generate per-subject digests, CycloneDX SBOMs, provenance/attestations, vulnerability results, and the Release Proof Root.

### V3 — Runtime Witness and rollback

Read-only AWS/DNS/TLS/identity witness adapters, time-bounded P20 proof, immutable rollback target verification, schema compatibility, kill switches, and post-rollback health evidence.

### V4 — VERITY convergence

Authority-linter rollout, migration-adapter retirement, external-evidence expiry rehearsal, recovery exercise, exact-head owner summary, and proof that no conflicting historical authority enters the platform or public artifact.

Each slice requires its own focused spec or bounded design, test-first plan, exact-head verification, and rollback boundary. No slice may claim completion from visual mockups alone.

## 20. Verification contract

Verification must cover three independent axes:

### Product specification

- all three intent modes work as defined;
- all eligible product surfaces use one Intent authority;
- bounded constellation and explanations are correct;
- mutual disclosure requires explicit consent;
- Proof-of-Now copy remains truthful;
- platform role and ad-only revenue boundary remain intact.

### Engineering quality

- authorization and RLS negative cases;
- lifecycle and concurrency invariants;
- idempotency and reconnect behavior;
- privacy and data minimization;
- model/fallback parity;
- ranking evaluation and sponsored separation;
- accessibility and bidi behavior;
- performance percentiles and memory pressure;
- weak network, offline, stale, and error recovery;
- release allowlist and exact-SHA artifact evidence.

### Authority and release proof

- one owner entrypoint and one current authority per domain;
- conflicting legacy paths absent from runtime, active tests/configuration, current indexes, and public artifacts;
- authority graph uniqueness, acyclicity, and supersession integrity;
- no self-referential source SHA field masquerading as attestation;
- separate Web, OCI, and Migration subjects with exact digests;
- typed P01–P20 evidence with trusted producer context and negative cases;
- stale, missing, forged, wrong-environment, wrong-subject, and wrong-release evidence fails closed;
- fresh live witnesses bind the deployed artifact digest;
- rollback signature, vulnerability, configuration, and schema compatibility;
- owner summary never exceeds exact machine evidence.

Passing unit tests alone is insufficient for realtime, media, accessibility, performance, or mobile Preview claims.

## 21. Acceptance criteria for the north-star architecture

TIGER SYNAPSE v2 and TIGER VERITY FABRIC are architecturally converged only when one exact source state and its fresh bound runtime evidence prove all of the following:

1. one current Intent authority serves Home, Constellation, Marketplace, social-content actions, Profile, and eligible messaging;
2. no silent `LIVE_NETWORK` activation exists;
3. exact private constraints may remain local without blocking deterministic matching access;
4. every active intent has actor binding, policy version, visibility, status, and expiry;
5. matching filters policy before ranking and never lets spend bypass eligibility;
6. default primary results are bounded to 3–7 explainable matches;
7. internal risk signals and private constraints never leak through explanations;
8. field-scoped disclosure requires explicit mutual consent;
9. Connection Cells contain no platform payment, delivery, ownership-transfer, or dispute authority;
10. Proof-of-Now is challenge-based, replay-resistant, privacy-bounded, and never marketed as ownership or condition guarantee;
11. AI is optional for core access and has deterministic correction/fallback;
12. realtime events are reconciled against durable server state;
13. offline UI never fabricates publication, disclosure, verification, message delivery, or paid-placement success;
14. current identity, RLS, F05, moderation, release, and platform-role invariants remain intact;
15. advertising is labeled, relevance-gated, frequency-bounded, and separately auditable;
16. Arabic RTL and English LTR critical journeys meet accessibility requirements;
17. performance claims are backed by reproducible percentile evidence on named devices and networks;
18. the exact public artifact contains only allowlisted modules and no secrets, retired links, fake-live data, or implementation-only documents;
19. Quality Gate and slice-specific security/rehearsal checks are GREEN on the same final head;
20. the isolated mobile-accessible Preview comes from that exact head without changing `main` or Production;
21. `docs/owner-control/TIGER_OWNER_CURRENT_REFERENCE_AR.md` remains the stable owner entrypoint and routes to, rather than duplicates, current mutable truth;
22. the Authority Graph contains exactly one current authority per domain, has no cycle, and classifies every conflicting predecessor as `RETIRED_FROM_CURRENT_PLATFORM / HISTORICAL_ONLY`;
23. no conflicting legacy path remains active in runtime, navigation, public artifacts, active tests, active configuration, current plans, or generated current documentation;
24. no authority document relies on a self-referential embedded commit SHA; trusted CI binds its digest to exact commit/tree identity;
25. Web Artifact, Media Finalizer OCI Image, and Migration Bundle are independent sealed subjects with exact digests, SBOMs, and provenance;
26. the Release Proof Root binds authority, source, subject, gate-policy, and evidence digests without accepting caller-supplied authority;
27. every P01–P20 result is evaluated from typed evidence with explicit producer, environment, freshness, prerequisites, and fail-closed behavior;
28. AWS/DNS/TLS/identity and other live witnesses expire and cannot be reused for another release or after material provider change;
29. rollback promotes a previously built verified artifact only when current signature, vulnerability, configuration, and schema compatibility checks pass;
30. F05 media limits remain at the verified contract until a separately approved benchmark proves a safe replacement.

## 22. Current decisions fixed by owner direction

- Product name: **TIGER SYNAPSE v2**.
- Category: **Temporal Intent Operating System**.
- Trust and release plane: **TIGER VERITY FABRIC**.
- Architecture: hybrid device + trusted backend + replaceable regional/edge acceleration.
- Owner entrypoint: `docs/owner-control/TIGER_OWNER_CURRENT_REFERENCE_AR.md`.
- Finality: the latest owner-approved `CURRENT_ONLY` decision wins; conflicting older authority is permanently retired from the current platform and cannot be resurrected.
- Historical retention: audit/security/provenance only, outside the public platform, with no current authority.
- Product surface: Social Home first, with Constellation and Marketplace integration.
- Intent activation: `PRIVATE_LOCAL`, `ASSISTED`, and explicit `LIVE_NETWORK` all supported.
- Match presentation: bounded, explainable constellation.
- Trust innovation: challenge-response Proof-of-Now with no absolute ownership/fraud claim.
- Contact innovation: Mutual Reveal plus temporary Connection Cell.
- AI role: assistant and ranking enhancer, never user or policy authority.
- Revenue: advertising and platform publishing services, not transaction commission.
- Execution: small ordered slices; no big-bang rewrite.
- Build truth: hermetic build core plus separate time-bounded live-runtime witnesses.
- Evidence: extend existing TSRF Release DNA and Proof Capsules; do not create a second evidence authority.
- Release subjects: separate sealed Web, Media Finalizer OCI, and Migration artifacts joined by one Release Proof Root.
- Media: preserve current F05 limits until fresh device benchmarks and owner approval prove a safe change.
- Rollback: previously built signed immutable artifacts with forward-compatible schema contracts; no incident-time rebuild or ordinary destructive down migration.
- Preview: exact-head, isolated, mobile-accessible, GREEN-only; no retired link reuse.

## 23. Standards and technology references

- W3C Verifiable Credentials Data Model v2.0: `https://www.w3.org/TR/vc-data-model-2.0/`
- W3C Securing Verifiable Credentials using JOSE and COSE: `https://www.w3.org/TR/vc-jose-cose/`
- W3C Web Authentication Level 3: `https://www.w3.org/TR/webauthn-3/`
- W3C Service Workers: `https://www.w3.org/TR/service-workers/`
- Chrome built-in AI / Prompt API capability notes: `https://developer.chrome.com/docs/ai/prompt-api`
- SLSA Provenance: `https://slsa.dev/provenance`
- in-toto Attestation Framework: `https://github.com/in-toto/attestation/blob/main/spec/README.md`
- GitHub Artifact Attestations: `https://docs.github.com/en/actions/concepts/security/artifact-attestations`
- Sigstore Cosign verification and attestations: `https://docs.sigstore.dev/cosign/verifying/attestation/`
- CycloneDX specification overview: `https://cyclonedx.org/specification/overview/`
- AWS Lambda Node.js 24 runtime: `https://aws.amazon.com/blogs/compute/node-js-24-runtime-now-available-in-aws-lambda/`
- Sharp output and metadata behavior: `https://sharp.pixelplumbing.com/api-output/`

These standards inform implementation seams. Their existence does not prove browser support, issuer availability, legal sufficiency, device compatibility, or completed TIGER implementation. Every slice must feature-detect, fail safely, and verify its actual target environment.
