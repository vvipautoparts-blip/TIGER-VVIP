# TIGER PRIVATE MARKET GENESIS 2026 — ARCHITECTURE DESIGN

**Status:** `OWNER-APPROVED DIRECTION / WRITTEN SPEC FOR OWNER REVIEW / NOT IMPLEMENTED`

**Date:** 2026-08-23

**Design version:** `1.0-owner-review`

**Product scope:** Marketplace discovery inside TIGER ONE / TIGER SYNAPSE

**Current authority:** `docs/owner-control/TIGER_PRIVATE_MARKET_GENESIS_2026_CURRENT_OWNER_AUTHORITY.md`

**Parent authorities:**

- `docs/owner-control/TIGER_ONE_2026_CURRENT_OWNER_AUTHORITY.md`
- `docs/owner-control/TIGER_SOCIAL_CORE_2026_CURRENT_OWNER_AUTHORITY.md`
- `docs/owner-control/TIGER_PULSE_RING_2026_CURRENT_OWNER_AUTHORITY.md`
- `docs/superpowers/specs/2026-08-18-tiger-synapse-temporal-intent-system-design.md`

## 0. Design statement

TIGER PRIVATE MARKET GENESIS changes Marketplace from a static catalogue that waits for search into a policy-bound compiler that constructs a small, explainable market projection around an authorized private intent.

> **The marketplace does not wait for the user to search it. The market is compiled around the user’s private intent.**

The design does not create a second intent engine. It consumes the existing SYNAPSE Intent Envelope and extends the Marketplace projection of that intent through three versioned contracts:

1. Market Genesis Contract;
2. Ad Genome;
3. Sector Physics Registry.

Real Estate and Auto Parts are the first reference Lenses. They prove that very different market semantics can be expressed without rewriting the compiler.

## 1. Non-negotiable invariants

### 1.1 Automotive scope

> **AUTO PARTS ONLY — WHOLE VEHICLE ADS ARE FORBIDDEN.**

The Auto Parts Lens accepts parts, components, consumables, and explicitly approved accessories. A complete vehicle is not a valid commercial object, regardless of title wording, image content, category alias, price, advertiser status, or paid placement.

Vehicle metadata is allowed only as compatibility context for a part.

### 1.2 Platform role

> **DISCOVERY + ADVERTISEMENT + CONTACT + HANDOFF. NO TRANSACTION.**

The system may discover, rank, explain, advertise, reveal authorized contact paths, and hand users off. It may not form or execute the underlying transaction.

Forbidden Marketplace capabilities include cart, checkout, order acceptance, item payment, escrow, marketplace settlement, seller payout, transaction commission, platform shipping, ownership transfer, warranty execution, or platform-run deal adjudication.

Platform-owned advertising billing is a separate TIGER service and does not alter this boundary.

### 1.3 No duplicate market authority

Living Classified Fabric is superseded. It must not remain as a runtime fallback, feature flag, alternate compiler, parallel active spec, or launch path.

## 2. Goals

The design must:

- compile a bounded market view from a confirmed private intent;
- keep sector policy outside the generic compiler;
- support organic and sponsored discovery with the same admission safety floor;
- preserve user privacy and prevent raw-intent leakage to advertisers;
- make eligibility deterministic and auditable;
- provide safe, understandable relevance explanations;
- terminate Marketplace responsibility at contact/handoff;
- support country and sector variation without forking the core;
- prove extension with Real Estate and Auto Parts;
- reject whole-vehicle commercial objects before publication and paid admission;
- remain compatible with SYNAPSE, Social Core, RLS, moderation, Pulse, and exact-head release governance.

## 3. Non-goals

This design does not introduce:

- a new social network;
- a second Intent Envelope;
- a second messaging product;
- marketplace checkout;
- order management;
- transaction settlement;
- logistics execution;
- seller payouts;
- transaction commissions;
- ownership verification claims;
- a universal AI agent with policy authority;
- an unbounded microservice rewrite;
- a separate payment architecture for goods or services advertised by users.

## 4. Chosen architecture

The chosen design is a **versioned policy compiler with pluggable sector physics**.

The compiler receives an authorized intent reference, resolves the current Sector Physics version, transforms eligible commercial records into canonical Ad Genomes, applies deterministic admission, retrieves and ranks candidates, mixes eligible sponsored inventory under Pulse constraints, produces safe explanations, and exposes only authorized contact/handoff capabilities.

The core never asks “is this real estate?” or “is this auto parts?” through permanent hard-coded branching. It asks the registry for the rules attached to the sector/version.

### 4.1 Rejected alternative: sector-specific marketplace engines

Rejected because separate engines duplicate identity, privacy, ranking, advertising, moderation, and release behavior. They drift and create multiple authorities.

### 4.2 Rejected alternative: one giant universal listing schema

Rejected because it pushes every sector into hundreds of nullable fields, weakens validation, makes ranking semantics ambiguous, and eventually reintroduces hard-coded conditionals throughout the core.

### 4.3 Rejected alternative: LLM-first market generation

Rejected as an authority model. AI may assist parsing or explanation, but eligibility, forbidden-object detection, privacy, contact authorization, sponsorship admission, and lifecycle state remain deterministic and server-authoritative.

## 5. Component model

### 5.1 Market Genesis Compiler

The compiler orchestrates one generation request. It has no sector-specific business rules beyond universal invariants.

Responsibilities:

1. resolve authenticated actor and intent server-side;
2. validate intent state and policy version;
3. resolve sector and active Sector Physics version;
4. derive purpose-bound retrieval features;
5. retrieve candidate commercial objects;
6. canonicalize each object as an Ad Genome;
7. apply sector and global eligibility;
8. remove blocked, expired, stale, self-ineligible, duplicate, forbidden, and policy-ineligible objects;
9. score organic relevance;
10. admit only sponsored objects that independently satisfy eligibility and minimum relevance;
11. diversify the result set;
12. produce safe explanations;
13. bind contact capabilities to current authorization and reveal policy;
14. emit an immutable generation/audit record with privacy-minimized evidence.

The compiler may return fewer results than requested when truthful supply is limited. It must not pad with irrelevant or forbidden objects.

### 5.2 Market Genesis Contract

The Market Genesis Contract is the stable boundary between Intent/SYNAPSE and Marketplace discovery.

#### Request fields

Required conceptual fields:

- `request_id` — idempotency key supplied or minted under trusted rules;
- `actor_subject` — server-derived, never browser-authoritative;
- `intent_id` and authoritative revision;
- `intent_direction` — NEED or OFFER where applicable;
- `sector_id`;
- `sector_physics_version` resolved by the server;
- `market_scope` — country/region and coarse location policy;
- `purpose` — discovery, sponsored-discovery, saved-intent refresh, or another allowlisted purpose;
- `visibility_context`;
- `policy_context` — moderation, age, country, and capability constraints;
- `requested_result_bound` within policy limits;
- `request_time` from trusted server time.

The request must not expose raw private intent to downstream advertising systems. Retrieval receives only the minimum derived features needed for the approved purpose.

#### Response fields

The compiled response contains:

- `generation_id`;
- `intent_revision_used`;
- `sector_id` and `sector_physics_version`;
- `results[]` with canonical object references;
- organic score class and safe reason codes;
- sponsored label and advertising-delivery reference where applicable;
- freshness state;
- evidence state where allowed;
- contact capability descriptor;
- disclosure requirements;
- handoff policy;
- pagination/expansion cursor where allowed;
- policy/version digest reference;
- generated-at and expires-at timestamps.

It never contains hidden moderation signals, private competitor constraints, private exact location, or raw advertiser targeting internals.

#### Contract invariants

- identical authoritative inputs and policy versions produce semantically stable deterministic eligibility decisions;
- actor identity is server-derived;
- forbidden entities never enter the rankable set;
- sponsored status never changes sector eligibility;
- contact capability does not imply transaction authority;
- the generated view has an expiry and must be refreshed when authority-relevant state changes.

### 5.3 Ad Genome

The Ad Genome is the canonical representation of an eligible commercial object for Market Genesis. It is not a payment object and not an order.

Required conceptual groups:

#### Identity and provenance

- `ad_id` / commercial object ID;
- owner or advertiser subject reference;
- source type;
- source revision;
- creation/update timestamps;
- provenance and moderation state;
- country and policy version.

#### Taxonomy

- `sector_id`;
- category/subcategory IDs;
- entity type;
- offer mode where relevant;
- sector-specific normalized attribute map validated by Sector Physics.

#### Discovery projection

- normalized title/summary;
- searchable tokens and approved embeddings if used;
- coarse geospatial projection;
- price/value projection only when policy permits;
- availability/freshness projection;
- compatibility or dimensional projection supplied by the sector Lens.

#### Advertising projection

- organic eligibility state;
- sponsorship eligibility state;
- Pulse/campaign reference when sponsored;
- delivery market;
- labeling requirement;
- frequency/cap constraints;
- verified-viewability eligibility where applicable.

#### Contact projection

- contact-capability class;
- reveal policy reference;
- safe public display identity;
- allowed handoff channels;
- block/report constraints.

#### Explicitly absent transaction fields

The Ad Genome must not contain authoritative Marketplace fields for:

- cart quantity;
- checkout total;
- marketplace order status;
- payment authorization;
- escrow state;
- settlement state;
- seller payout state;
- ownership-transfer completion;
- delivery completion;
- transaction commission.

A price attribute may describe an advertisement. It does not create a checkout price or transaction obligation.

### 5.4 Sector Physics Registry

The Sector Physics Registry is a versioned, server-authoritative policy registry. Each active sector version describes what the market object means and how it is allowed to behave.

Each sector definition contains:

- `sector_id` and semantic version;
- allowed entity types;
- forbidden entity types;
- required and optional dimensions;
- normalization rules;
- publication validators;
- discovery validators;
- sponsored-admission validators;
- freshness and expiry policy;
- geography semantics;
- price/value semantics;
- evidence semantics;
- compatibility semantics where applicable;
- ranking feature allowlist;
- explanation reason allowlist;
- contact modes;
- disclosure requirements;
- media requirements;
- country overlays;
- abuse/moderation policy hooks;
- retention/audit class;
- migration compatibility range;
- hard invariants that cannot be overridden by country or campaign configuration.

A Sector Physics version is immutable after activation. Corrections create a new version and an explicit migration policy.

### 5.5 Lens compiler

A Lens is the user-facing and indexing projection produced from a Sector Physics definition. A Lens may define field presentation, query affordances, compatibility selectors, map behavior, explanation vocabulary, and ranking feature mapping.

A Lens may not override global owner invariants or invent transaction features.

## 6. Private-intent processing

Raw intent is treated as private user data, not ad inventory.

The sequence is:

1. user creates or confirms an intent through SYNAPSE;
2. trusted backend validates identity, visibility, sector, and state;
3. a purpose-bound derivation step emits only the features needed for discovery;
4. the compiler searches eligible commercial objects;
5. sponsored systems receive only allowlisted targeting/relevance signals, never the raw Intent Envelope by default;
6. results return to the user with safe explanations;
7. private details remain hidden unless the user explicitly reveals them under the current consent model.

Derived features must have a declared purpose, retention class, and policy version. They are not a permanent shadow profile by default.

## 7. Admission pipeline

The admission sequence is deliberately before ranking:

1. authenticate actor;
2. resolve authoritative intent revision;
3. validate intent lifecycle;
4. resolve Sector Physics;
5. validate candidate provenance;
6. enforce global forbidden-object rules;
7. enforce sector allowed/forbidden entity rules;
8. enforce visibility and block/report policy;
9. enforce country policy;
10. enforce freshness/expiry;
11. enforce moderation;
12. enforce advertising eligibility when sponsored;
13. only then compute relevance and placement.

An object rejected at steps 1–12 receives no ranking score and no paid override path.

## 8. Organic and sponsored ranking

Organic relevance and paid delivery are separate dimensions.

A sponsored object must first qualify as a valid candidate. Then it must meet a minimum relevance threshold. Paid delivery can influence which eligible sponsored item is shown and how campaign budget is consumed, but cannot turn an irrelevant or forbidden object into a match.

Audit data must preserve at least:

- eligibility decision and reason code;
- organic relevance class;
- sponsorship status;
- campaign/delivery reference;
- final placement class;
- policy and Sector Physics versions.

The user-facing UI must clearly label sponsored material.

## 9. Explanation model

Explanations are generated from allowlisted reason codes, not arbitrary hidden-model introspection.

Examples:

- category fit;
- part compatibility fit;
- location-area fit;
- property-type fit;
- price-range overlap;
- current availability;
- freshness;
- evidence freshness;
- sponsored status.

Forbidden explanations include raw private-intent text, private exact location, another party’s private constraints, fraud-score values, moderation internals, or claims of guaranteed ownership/condition.

## 10. Contact and handoff

Every result has one of these contact states:

- `CONTACT_NOT_ALLOWED`;
- `CONTACT_AVAILABLE_PUBLIC`;
- `CONTACT_REQUIRES_REVEAL`;
- `CONTACT_REQUIRES_MUTUAL_ACTION`;
- `CONTACT_BLOCKED_POLICY`.

The result does not expose a transaction action.

When contact succeeds, Marketplace records a `HANDOFF_STARTED` event for UX/audit purposes only. That event means the platform enabled direct communication; it does not mean a deal, payment, delivery, or ownership transfer occurred.

TIGER may continue ordinary social messaging and safety controls under their own authorities. Marketplace does not infer transaction completion from messages.

## 11. Real Estate reference Lens

The Real Estate Lens proves location and dimensional semantics.

### Required physics examples

- entity types: apartment, house, villa, land, office, shop, warehouse, and explicitly approved property classes;
- offer mode: sale or rent;
- property type;
- country/region/city/area with privacy-aware precision;
- floor area and optional land area;
- bedrooms/bathrooms where relevant;
- furnishing state where relevant;
- availability date;
- price semantics and rental period where relevant;
- evidence/freshness policy;
- media minimums;
- contact mode.

### Ranking examples

- area/location fit;
- property-type fit;
- sale/rent mode fit;
- size-range fit;
- price-range fit;
- availability fit;
- freshness.

The Lens remains advertisement/discovery only. No booking deposit, purchase checkout, rent collection, title transfer, or platform brokerage is introduced.

## 12. Auto Parts reference Lens

The Auto Parts Lens proves compatibility semantics and the hard whole-vehicle ban.

### Allowed object examples

- mechanical parts;
- electrical/electronic parts;
- body parts;
- braking/suspension components;
- consumables where approved;
- tyres/wheels where approved;
- OEM or aftermarket replacement parts;
- explicitly approved accessories that are not whole vehicles.

### Required compatibility dimensions

As applicable:

- make;
- model;
- model year or year range;
- trim;
- engine code/displacement;
- transmission where fitment-relevant;
- chassis/platform family;
- side/position;
- part taxonomy;
- OEM number;
- manufacturer/aftermarket number;
- condition;
- compatibility evidence/provenance;
- seller location and availability.

### Whole-vehicle rejection

The Lens must reject any commercial object whose semantic entity is a complete vehicle. Detection must be defense-in-depth:

1. category/entity-type validation;
2. required part-taxonomy validation;
3. forbidden whole-vehicle taxonomy;
4. structured attribute contradictions;
5. title/description policy classifiers as supporting signals;
6. media/content moderation signals as supporting signals;
7. manual moderation escalation for ambiguous objects.

No probabilistic classifier alone grants eligibility. The positive allowlist of part entity types remains authoritative.

Examples that must be rejected:

- “Toyota Camry 2022 for sale”;
- a complete vehicle submitted under “engine parts” without a valid part object;
- a sponsored campaign whose destination advertises the whole vehicle as the commercial object.

Examples that remain eligible subject to policy:

- “Front bumper for Toyota Camry 2022”;
- “OEM alternator compatible with Camry 2.5L 2021–2023”;
- “Left headlamp assembly for model X”.

Vehicle make/model/year in those examples are fitment metadata, not the advertised entity.

## 13. Lifecycle and versioning

### Sector Physics lifecycle

`DRAFT -> REVIEWED -> ACTIVE -> DEPRECATED -> RETIRED`

Only one version per sector/country overlay may be active for new generation requests unless an explicitly bounded migration window exists.

### Ad Genome lifecycle

Conceptual states:

`DRAFT -> ELIGIBILITY_REVIEW -> ACTIVE -> PAUSED -> EXPIRED/REJECTED/REMOVED`

Sponsored delivery adds campaign-delivery state under Pulse authority without changing the underlying object’s Marketplace eligibility state.

### Generation lifecycle

`REQUESTED -> ADMITTED -> COMPILED -> SERVED -> EXPIRED`

A rejected request ends as `REJECTED` with a safe reason code.

## 14. Error model

Errors are typed and privacy-safe.

Classes include:

- `INTENT_NOT_ACTIVE`;
- `SECTOR_NOT_SUPPORTED`;
- `SECTOR_PHYSICS_VERSION_UNAVAILABLE`;
- `POLICY_BLOCKED`;
- `NO_ELIGIBLE_SUPPLY`;
- `CONTACT_NOT_AUTHORIZED`;
- `STALE_GENERATION`;
- `FORBIDDEN_ENTITY_TYPE`;
- `WHOLE_VEHICLE_FORBIDDEN`;
- `SPONSORED_NOT_ELIGIBLE`;
- `RATE_LIMITED`;
- `TEMPORARY_DEPENDENCY_FAILURE`.

User-facing copy must not leak internal safety rules beyond what is necessary for correction and transparency.

## 15. Security and privacy requirements

- server-derived actor identity;
- RLS/FORCE RLS where persistence uses Postgres tables under the existing model;
- purpose-bound access to private intent;
- least-privilege service boundaries;
- no client authority over Sector Physics version or sponsorship eligibility;
- idempotent generation requests where retries are possible;
- bounded result sizes and query cost;
- rate limiting and abuse controls;
- safe text rendering;
- media-security reuse rather than bypass;
- immutable policy/version references in audit records;
- no raw private-intent export to advertisers;
- no precise-location leakage through explanations;
- no hidden transaction state introduced in messaging or analytics.

## 16. Observability and audit

Each generation must be diagnosable without storing unnecessary private content.

Record:

- generation ID;
- hashed/stable references as appropriate;
- intent revision reference;
- sector/version;
- policy digest/reference;
- counts at each eligibility stage;
- typed rejection counts;
- result object IDs/revisions;
- organic/sponsored placement classes;
- contact-capability state;
- timing/latency metrics;
- abuse/rate-limit outcomes.

Do not log raw private intent, secret contact fields, or precise location merely for convenience.

## 17. Required test architecture before implementation is accepted

Implementation is not accepted until tests prove the contracts, not just the UI.

### 17.1 Contract tests

- Market Genesis request/response schema validation;
- server-derived actor authority;
- policy/version binding;
- stale revision rejection;
- deterministic eligibility reason codes;
- bounded output.

### 17.2 Ad Genome tests

- canonicalization from supported sources;
- forbidden transaction fields absent from authoritative schema;
- sponsorship cannot bypass eligibility;
- expiry/freshness handling;
- contact projection respects reveal policy.

### 17.3 Sector Physics tests

- immutable active version behavior;
- required dimensions;
- allowed and forbidden entity types;
- country overlay cannot override global hard invariants;
- unknown sector fails closed;
- invalid/missing physics fails closed.

### 17.4 Auto Parts negative tests

Must reject:

- whole-vehicle entity type;
- vehicle classified as a part through category alias;
- whole-vehicle sponsored object;
- ambiguous object lacking a valid part taxonomy;
- client attempt to override the ban;
- country overlay or campaign configuration attempting to allow a whole vehicle.

### 17.5 No-transaction negative tests

The current public/runtime publication set must prove there is no active Marketplace capability for:

- checkout;
- order creation/acceptance;
- item payment;
- escrow;
- settlement;
- seller payout;
- transaction commission;
- platform delivery confirmation;
- ownership transfer.

### 17.6 Privacy tests

- advertiser projection never contains raw Intent Envelope;
- precise private location is not emitted;
- safe explanation allowlist;
- blocked users/items cannot re-enter through sponsored paths;
- private contact data requires current authorization.

### 17.7 Integration tests

- Real Estate Lens compiles without sector-specific core branching;
- Auto Parts Lens compiles without sector-specific core branching;
- same compiler contract supports both;
- SYNAPSE Intent Envelope revision is respected;
- Social Core navigation remains single-product;
- Pulse labeling and delivery remain separate from organic ranking.

## 18. Migration strategy

Implementation should be incremental and non-destructive to current verified Social Core behavior.

### Phase M0 — authority and spec

- establish current owner authority;
- establish this written design;
- update owner index and current project state;
- identify any conflicting old active Marketplace authority.

### Phase M1 — contracts only

- implement Market Genesis Contract types/validators;
- implement Ad Genome canonical schema;
- implement Sector Physics Registry interface and immutable version contract;
- write failing tests first;
- no user-facing Lens claim yet.

### Phase M2 — Real Estate Lens

- add Real Estate physics definition;
- add canonicalization and retrieval mapping;
- prove compiler genericity.

### Phase M3 — Auto Parts Lens

- add Auto Parts physics definition;
- enforce positive part allowlist and whole-vehicle ban;
- add compatibility/fitment semantics;
- prove sponsored rejection path.

### Phase M4 — contact/handoff convergence

- bind result contact actions to existing reveal/messaging authority;
- add explicit handoff semantics;
- prove no transaction capability appears.

### Phase M5 — release evidence

- exact-head tests;
- repository Quality Gate;
- DB rehearsal where migrations exist;
- security and privacy review;
- no preview/readiness claim until the exact published head passes all required gates.

## 19. Definition of done

Private Market Genesis is `IMPLEMENTED` only when:

- all three contracts exist in code and are versioned;
- the compiler consumes Sector Physics rather than hard-coded sector branches;
- Real Estate and Auto Parts compile through the same core;
- whole-vehicle ads are deterministically rejected before ranking and sponsorship;
- organic/sponsored privacy boundaries are proven;
- contact/handoff is functional and transaction capabilities remain absent;
- active docs/tests/config point only to Private Market Genesis for this domain.

It is `VERIFIED` only when the exact source head passes the required repository, database, security, privacy, and release gates.

## 20. Review boundary

This document formalizes the owner-approved architectural direction. It intentionally does not claim implementation.

The next implementation artifact, after owner review of this written specification, is a TDD implementation plan for:

1. Market Genesis Contract;
2. Ad Genome;
3. Sector Physics Registry;
4. Real Estate Lens;
5. Auto Parts Lens;
6. contact/handoff convergence;
7. exact-head verification.
