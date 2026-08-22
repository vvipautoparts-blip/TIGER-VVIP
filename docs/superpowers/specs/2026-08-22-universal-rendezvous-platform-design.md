# TIGER Universal Rendezvous Platform — Innovation 2

**Status:** OWNER-APPROVED ARCHITECTURAL DIRECTION — WRITTEN SPEC REVIEW REQUIRED BEFORE IMPLEMENTATION
**Effective:** 2026-08-22
**Design horizon:** 2026 → 2096+
**Scope:** the complete TIGER platform, every existing sector, every future additive sector, Social, Search, ONE FIELD, Discovery, Profiles/Personas, Advertising, Mall/Browse projections, Content, Contact Handoff, Trust, Privacy, Intelligence, and future human/agent interfaces.
**Implementation strategy:** preserve → extend → adapt → migrate → retire conflicts. No big-bang rewrite.
**Governing authority:** `docs/architecture/OWNER_AUTHORITY_REGISTRY.md` and `docs/superpowers/specs/2026-08-22-proximity-only-three-lane-interaction-design.md` remain controlling for zero-brokerage, capability-before-UI, advertising separation, and terminal contact handoff.

---

## 1. Executive decision

TIGER shall evolve as **one platform with one shared semantic core and one universal rendezvous architecture** rather than separate applications or duplicated engines for Social, Cars, Real Estate, Food, Services, Mall, or future sectors.

The core product principle is:

> **TIGER understands what a person needs, understands what the world can currently offer, computes a policy-safe and privacy-minimised rendezvous, explains the match, exposes only real capabilities, and ends its external-commercial role at contact handoff.**

The user-facing product must remain familiar and easy. The deep architecture belongs below the surface.

Canonical external-commercial lifecycle remains:

```text
DISCOVERY
  → RELEVANCE
  → EXPLANATION
  → CONTACT HANDOFF
  → TIGER STOPS
```

Innovation 2 does not create an order engine, checkout, escrow, settlement, fulfillment, negotiation engine, success fee, or transaction-value commission.

---

## 2. What “one platform, one core, one rendezvous” means

### 2.1 One platform

The platform remains one product experience with shared identity and navigation. Existing and future experiences are projections of one platform rather than independent products.

Examples of projections include:

- Facebook-like Social Home;
- ONE FIELD intent entry;
- Search/Discovery;
- traditional category browse;
- Digital Mall/Spatial Mall projection;
- entity/profile views;
- map views;
- comparison views;
- future spatial, voice, agent, wearable, vehicle, or unknown interfaces.

A projection may change radically over decades without changing the canonical platform semantics.

### 2.2 One shared core

The platform must not duplicate these responsibilities per sector:

- identity;
- authorization;
- privacy;
- policy;
- intent understanding;
- semantic relationships;
- trust/provenance;
- evidence;
- search/retrieval primitives;
- relevance explanation;
- capability resolution;
- advertising eligibility;
- contact handoff;
- audit;
- country/sector scope enforcement.

Sector differences are supplied through versioned contracts/manifests, vocabularies, semantic mappings, fields, validation rules, and policy extensions.

### 2.3 One Universal Rendezvous

There must not be independent `car_matcher`, `food_matcher`, `property_matcher`, and `service_matcher` architectures with duplicated policy and ranking authority.

The canonical conceptual contract is:

```text
NEED / INTENT
    ×
CAPABILITY / OFFERING
    ×
CONTEXT / POLICY / TRUST / TIME
    ↓
RENDEZVOUS CANDIDATES
    ↓
EXPLANATION
    ↓
AUTHORIZED USER ACTIONS
```

Sector-specific meaning enters through shared contracts, not duplicate engines.

---

## 3. Preserve the 6D foundation and extend it to 9D

The already-approved 6D Sector Fabric remains the base. Innovation 2 extends it; it does not invalidate or fork it.

### D1 — DOMAIN | What domain?

Examples: vehicles, property, furniture, electronics, food, agriculture, professional services, manufacturing, existing sectors, and future sectors.

Rules:

- sector names are mutable labels;
- stable sector IDs are canonical;
- sector activation remains country/policy scoped;
- a new sector is additive through the registry/manifest model.

### D2 — ENTITY | Who or what participates?

Canonical entity classes may include:

- person;
- company;
- institution;
- factory;
- farm;
- importer/exporter;
- distributor;
- mall;
- shop;
- freelancer;
- service provider;
- product;
- service;
- content;
- place;
- event;
- future registered entity classes.

One account may operate through multiple authorized personas/managed entities without creating multiple platform cores.

### D3 — OFFER / INTERACTION MODE | What is being presented?

This dimension describes the discovery meaning and must not create TIGER transaction authority.

Examples:

- new;
- used;
- refurbished;
- retail;
- wholesale;
- B2B;
- B2C;
- C2C;
- service availability;
- rental information;
- request/need;
- informational availability;
- made-to-order indication.

Global product condition remains conceptually compatible with:

```text
condition = new | used | refurbished
```

Category/sector contracts may restrict allowed values.

### D4 — GEO / JURISDICTION | Where and under what rules?

Includes:

- country;
- city/region;
- approximate/local geography where permitted;
- language/locale;
- legal disclosures;
- country contract;
- sector activation;
- moderation policy;
- data-residency controls;
- advertising rules;
- contact rules;
- country-specific capabilities.

Client-provided geography or sector identifiers never create authorization.

### D5 — TRUST / LINEAGE / PROVENANCE | Where did the assertion come from?

Combines and extends Product Passport, Entity Passport, Origin Chain, Content DNA, credentials, provenance, verification, and evidence.

A claim must not be stored as an unqualified “fact” merely because a user, business, advertiser, AI model, or crawler stated it.

Canonical claim states include:

```text
VERIFIED
ASSERTED_BY_ENTITY
USER_PROVIDED
OBSERVED
AI_INFERRED
STALE
CONFLICTED
DISPUTED
UNKNOWN
```

Every material claim should support, where applicable:

- source;
- issuer/assertor;
- evidence reference;
- observation time;
- semantic version;
- verification state;
- confidence/uncertainty;
- expiry/freshness;
- provenance chain.

### D6 — INTENT / CONTEXT | What does the user want now?

The canonical ONE FIELD/intent system remains the normal entry point but the canonical intent contract must be input-channel independent.

Intent may originate from:

- text;
- voice;
- image/object context;
- a post/content context;
- an explicit filter/browse action;
- an authorized external agent;
- future input modalities.

Intent understanding may include:

- goal;
- subject;
- hard constraints;
- soft preferences;
- exclusions;
- urgency;
- time;
- geography;
- quality/cost priorities;
- privacy classification;
- lifetime;
- uncertainty;
- required clarification.

### D7 — RELATION / SEMANTICS | How are things meaningfully connected?

Innovation 2 generalizes the older Social Commerce Graph into a **Semantic World Graph**.

Representative relations include:

```text
produced_by
provided_by
located_at
compatible_with
belongs_to
related_to
talks_about
verified_by
available_from
similar_to
managed_by
member_of
satisfies_intent
supersedes
valid_during
```

The graph is a semantic contract, not a requirement to use any one graph database technology.

### D8 — TIME / PULSE | What is true or relevant now?

Combines:

- TIGER PULSE;
- World Pulse;
- Intent Beacon;
- Intent Half-Life;
- Dormant Intent;
- freshness;
- availability recency;
- seasonal/local context;
- aggregated Intent Weather.

Time must be attached to both user intent and world claims.

A strong semantic match with stale availability must not be treated as equivalent to a fresh match.

### D9 — CAPABILITY / SOVEREIGNTY | What may actually happen?

The final UI is downstream from a real capability decision.

Canonical sequence:

```text
Principal
  + Action
  + Resource
  + Context
  + Country/Sector Policy
  + Privacy
  + Runtime Availability
  → ALLOW / DENY
```

Innovation 2 adds **short-lived Capability Leases** for context-sensitive user-visible actions where appropriate.

A capability lease may bind:

- principal;
- action;
- resource;
- policy version;
- reason;
- scope;
- issued time;
- expiry;
- evidence/audit reference.

A lease is not a client-side security boundary; authoritative authorization remains server/database/policy enforced.

---

## 4. Six architectural planes

To prevent name explosion and duplicate systems, implementation concepts are grouped into six planes.

### 4.1 EXPERIENCE PLANE

Purpose: present the easiest possible experience for the current task.

Contains:

- familiar Social Home;
- ONE FIELD surface;
- Personal World Compiler;
- Intent Scenes / temporary task worlds;
- trusted generative UI composition;
- Derived Sector Lens;
- traditional browse/Mall projections;
- maps, comparison, explanation, profile/entity surfaces;
- accessibility and low-connectivity behavior.

### 4.2 INTENT PLANE

Purpose: represent and govern what the user wants.

Contains:

- IntentFrame/Semantic Capsule contracts already present where compatible;
- Private Intent Field;
- Intent Constellation for compound needs;
- Intent Memory;
- Intent Half-Life;
- Intent Beacon;
- Active/Dormant/Resolved/Expired/Superseded lifecycle;
- Shared/Consensus Intent where later approved.

### 4.3 WORLD PLANE

Purpose: describe what exists and what it can provide.

Contains:

- 9D Fabric;
- Sector Registry;
- Semantic World Graph;
- Entity/Product/Content passports;
- provenance;
- temporal claims;
- World Pulse.

### 4.4 RENDEZVOUS PLANE

Purpose: compute the best policy-safe meeting points between an intent and relevant world capabilities.

Contains:

- hybrid retrieval;
- reciprocal semantic matching;
- candidate eligibility;
- organic ranking;
- freshness/trust/constraint checks;
- FitExplanation / Proof of Relevance;
- Counterfactual Relevance;
- Reverse Discovery.

### 4.5 SOVEREIGNTY PLANE

Purpose: ensure intelligence never becomes ungoverned authority.

Contains:

- Trust Constitution;
- authorization/policy;
- Epistemic Truth Layer;
- Minimum Semantic Disclosure;
- Capability Graph/Leases;
- manipulation resistance;
- evidence/audit;
- privacy controls;
- human/owner approval gates where required;
- fail-closed behavior.

### 4.6 CONTINUITY PLANE

Purpose: preserve meaning and rights while replacing technology over a 70-year design horizon.

Contains:

- permanent semantic IDs;
- versioned contracts;
- Temporal Semantic Ledger;
- Evolution Graph;
- schema translations;
- technology tombstones;
- model/provider abstraction;
- persistence abstraction where justified;
- protocol adapters;
- crypto inventory/agility;
- evidence renewal;
- migration provenance;
- Platform Genome Manifest.

---

## 5. Personal World Compiler — user-visible differentiator

Innovation 2 must not merely return “search results.”

For a meaningful intent, TIGER may compile a temporary **Intent Scene / Micro-World** using approved components and real capabilities.

Example input:

```text
أريد كورن فليكس للأطفال بدون سكر
```

Possible compiled scene:

- interpreted constraints;
- strongest matching products/entities;
- why each appears;
- source/evidence status;
- what remains uncertain;
- nearby/available options where permitted;
- comparison;
- relevant content;
- optional map;
- real contact actions.

The user may refine naturally:

```text
لا أريد مستورد
الجودة أهم من القرب
أرني الأرخص
لا تستخدم هذا التفضيل للإعلانات
```

The scene updates without requiring the user to relearn a category tree.

### 5.1 Stable shell, adaptive center

Stable muscle-memory surfaces should include, where applicable:

- global header/navigation;
- Home entry;
- profile/account entry;
- ONE FIELD entry;
- familiar Social grammar;
- consistent Share / ••• / Contact meaning.

Adaptive surfaces may include:

- result cards;
- comparison layouts;
- explanation panels;
- derived filters/lenses;
- maps;
- task-specific information order;
- contextually relevant actions.

AI must not unpredictably move critical safety/navigation controls.

### 5.2 Trusted generative UI

The AI/intent layer may emit a declarative presentation plan, not arbitrary runtime code.

```text
Intent / Context
  → Presentation Plan
  → Capability + Policy Validation
  → Approved TIGER Component Catalog
  → Render
```

Only approved components, actions, schemas, destinations, and data contracts may render.

---

## 6. Universal Rendezvous semantics

### 6.1 Reciprocal match

Ranking must not rely only on text/vector similarity.

It should evaluate:

- user requirements;
- entity/product/service declared capabilities;
- verified evidence;
- explicit constraints;
- semantic relationships;
- freshness;
- availability metadata;
- geography where permitted;
- user priorities;
- country/sector policy;
- privacy limits;
- organic/sponsored separation.

### 6.2 Intent tension and trade-offs

When user constraints conflict, TIGER should not silently invent one “best” answer.

It may surface trade-offs such as:

- best overall fit;
- best quality;
- closest;
- lowest stated price where applicable;
- strongest verification;
- best balance.

The user retains the decision.

### 6.3 Semantic uncertainty gate

If ambiguity materially changes the outcome and cannot be safely resolved, the system should ask the smallest necessary clarification or explicitly state uncertainty.

The platform must support:

```text
KNOWN
LIKELY
UNCERTAIN
CONFLICTED
UNKNOWN
```

rather than forcing false certainty.

### 6.4 Counterfactual relevance

Where useful, a user may ask or trigger:

```text
ماذا لو القرب غير مهم؟
ماذا لو أقبل مستعملًا؟
ماذا لو الجودة أهم من السعر؟
```

The platform may show how ranking changes without hiding the changed assumption.

---

## 7. Epistemic Truth Layer

Every material ranking-affecting claim must retain epistemic state.

Example:

```yaml
claim: sugar_content
value: zero
source_type: manufacturer_assertion
evidence_ref: label_or_credential_ref
verification_state: asserted_or_verified
observed_at: timestamp
valid_until: timestamp_or_null
confidence: bounded_value_or_null
semantic_version: claim_schema_version
```

### 7.1 Required separation

The system must distinguish:

```text
what an entity says
≠ what evidence proves
≠ what TIGER observes
≠ what AI infers
```

### 7.2 Freshness

Time-sensitive claims such as availability must carry freshness semantics. A stale claim can still be shown when useful but must not masquerade as current truth.

### 7.3 Conflict handling

Conflicting claims must not be collapsed into one silent value. The system should retain conflict provenance and use conservative ranking/presentation rules.

---

## 8. Privacy architecture

### 8.1 Minimum Semantic Disclosure

The platform should disclose only the minimum attributes required for a computation or external capability.

Example:

A local search may require:

```text
category
approximate_area_or_radius_bucket
availability_window
```

without requiring exact location or full raw intent when unnecessary.

### 8.2 Intelligence ladder

Preferred execution order where practical:

```text
1. deterministic rule
2. indexed/SQL computation
3. small/local/on-device model
4. privacy/confidential computation
5. server model when necessary
6. graceful non-AI fallback
```

No hidden paid or external-model dependency may become the only path for a core platform function without explicit architecture approval.

### 8.3 Governable Intent Memory

Users should be able to inspect and control persistent understanding where the product retains it.

Controls may include:

- correct;
- delete;
- make temporary;
- shorten lifetime;
- prevent use for advertising;
- disable a persistent preference;
- export when later supported.

An AI inference is not an immutable user fact.

---

## 9. Intent lifecycle

Canonical conceptual lifecycle:

```text
DRAFT
→ ACTIVE
→ REFINED
→ DORMANT
→ RESOLVED
```

Alternative terminal states may include:

```text
EXPIRED
ABANDONED
SUPERSEDED
USER_DELETED
```

A resolved or expired intent must stop unnecessary recommendation/Beacon activity according to retention policy.

The platform may know that a user marked an intent resolved without learning the external transaction outcome, value, payment, or agreement.

---

## 10. Reverse Discovery

An intent may remain dormant for a user-approved lifetime.

A future world change may reactivate relevance evaluation when:

- a new entity/content/product appears;
- availability changes;
- a meaningful temporal/world signal changes;
- a previously missing constraint becomes satisfiable.

Notification should occur only above a meaningful threshold and according to user notification/privacy controls.

Reverse Discovery must never become an automatic buying/order process.

---

## 11. Shared / Consensus Intent

Future approved implementations may allow multiple users to contribute to a shared intent.

Each participant may have:

- public/shared constraints;
- private constraints;
- veto constraints;
- preference weights where explicitly chosen.

The system may compute a common fit without unnecessarily exposing one participant’s private constraints to other participants.

This capability is additive and must remain separately gated until its privacy and social-authority contracts are approved.

---

## 12. Social is a first-class projection, not a separate system

The Facebook-like Home remains familiar.

Supported social capabilities remain governed by real runtime availability:

- posts;
- media;
- reactions;
- comments;
- sharing;
- profiles/personas;
- follow/friend relationships where implemented;
- stories/messages/notifications where end-to-end real.

Content may participate in the Semantic World Graph.

A post may link semantically to:

- people;
- businesses;
- products;
- services;
- places;
- sectors;
- topics;
- credentials/provenance;
- intents.

A user may transform content context into an intent, for example:

```text
أريد مثل هذا
أريد مثل هذا لكن مستعمل
أريد جهة تقدم هذه الخدمة قريبة مني
```

This must reuse the same intent/rendezvous contracts rather than create a Social-only matcher.

---

## 13. Sector Lens and Mall

### 13.1 Derived Sector Lens

Sector Lens remains useful but should normally be derivable from intent/context rather than forcing a user to navigate a large category hierarchy first.

Example:

```text
أريد طاولة مكتب مستعملة
→ derived lens: Furniture / Office / Used
```

The user may remove or change the derived lens.

### 13.2 Traditional browse remains available

Intent-first is the primary intelligence model, not a prohibition on browsing.

Users who prefer traditional exploration may navigate category/sector/Mall projections.

The Mall must reuse the same canonical world/entity/product data and rendezvous/trust/capability engines. It must not become an independent marketplace database or separate commerce core.

---

## 14. Advertising and World Pulse

### 14.1 Organic and sponsored separation

Organic fit must be independent from payment.

```text
ORGANIC_RELEVANCE_SCORE
≠ SPONSORED_DELIVERY_ELIGIBILITY
```

Sponsored content must be clearly labeled and must not secretly alter the organic FitExplanation.

### 14.2 World Pulse / Intent Weather

Aggregated, privacy-preserving signals may identify changing contextual demand such as:

- rising interest in a topic/category;
- local/seasonal demand changes;
- emerging service needs;
- changes in content/entity attention.

The product should prefer aggregated contextual intelligence over exposing individual raw intent to advertisers.

Advertisers buy TIGER-owned eligible visibility/distribution, not access to a user’s private intent or success in an external deal.

---

## 15. Outcome-Blind Learning

The recommendation/discovery system may learn from platform-internal relevance signals such as:

- user corrections;
- save/hide;
- more/less like this;
- intent refinements;
- explanation usefulness;
- contact initiation;
- user-declared intent resolution.

It must not require knowledge of:

- external deal value;
- external payment;
- negotiated terms;
- whether an external deal legally closed;
- success commission data.

`CONTACT HANDOFF` is also a learning boundary for external deal semantics.

---

## 16. Three-Lane UX remains canonical

Innovation 2 preserves:

```text
SHARE   = DISTRIBUTE
•••     = CONTROL
CONTACT = HANDOFF -> TIGER STOPS
```

The `•••` lane becomes the natural place for contextual controls such as:

- Save;
- Hide;
- Why am I seeing this?;
- More/Less like this;
- correct TIGER’s understanding;
- adjust discovery preference;
- privacy preference;
- Report;
- owner/managed-entity controls when authorized.

No unimplemented capability is rendered as a usable or disabled future promise.

---

## 17. Semantic Manipulation Shield

The platform must expect adversarial attempts to game semantic ranking.

Examples:

- keyword/claim stuffing;
- unsupported “official”, “original”, “verified”, “zero sugar”, “best”, “guaranteed”, or equivalent claims;
- generated content intended solely to resemble high-value intents;
- provenance laundering;
- freshness manipulation;
- duplicate entity/listing amplification.

Defenses should separate:

```text
assertion
→ evidence
→ verification
→ ranking eligibility
```

Repeated claims do not create stronger truth.

Advertising status does not create organic evidence.

---

## 18. Completion-First product philosophy

TIGER should optimise for reducing unnecessary distance and effort, not maximising endless session duration.

Useful product metrics may include:

- intent-to-useful-result latency;
- steps to useful candidate;
- number of forced reformulations;
- explanation correction rate;
- stale-result rate;
- false-capability rate;
- user-declared resolution;
- privacy disclosure minimisation;
- contact-handoff success as a platform action only.

These metrics must not infer external deal success.

---

## 19. 70-year Continuity Genome

### 19.1 Permanent vs replaceable

Permanent conceptual assets:

```text
Semantic IDs
Identity meaning
Intent contracts
Entity semantics
User rights
Policy constitution
Evidence meaning
Provenance
Contact boundary
Sector contracts
Migration lineage
```

Replaceable technologies:

```text
AI models/providers
Databases
Search engines
Vector engines
Graph stores
Cloud providers
UI frameworks
Mobile frameworks
Protocols
Cryptographic suites
Storage technologies
```

### 19.2 Technology neutrality

No current provider or technology becomes the definition of the domain.

Examples:

```text
TIGER Identity != one auth vendor
TIGER Intelligence != one AI vendor/model
Semantic World Graph != one graph database
Rendezvous != one vector engine
TIGER Protocol != REST/MCP/A2A alone
```

### 19.3 Temporal Semantic Ledger

Canonical concepts and claims must support semantic version history so future systems can determine what a stored value meant at the time it was created.

### 19.4 Evolution Graph

Migrations should preserve machine-readable lineage where practical:

```text
V1 ↔ V2 ↔ V3 ↔ V4
```

not rely on undocumented one-time rewrites.

### 19.5 Technology tombstones

Retired technologies/capabilities should record:

- introduced version/time;
- retired version/time;
- replacement;
- reason;
- migration state;
- residual dependencies;
- authority status.

Historical evidence must not remain as a parallel runtime authority.

### 19.6 Crypto agility

Long-lived protected data/evidence must avoid hard-coding one cryptographic algorithm forever.

Maintain, where applicable:

- cryptographic inventory;
- suite/version identifiers;
- key versioning;
- rotation;
- migration path;
- signature/evidence renewal strategy;
- retirement records.

---

## 20. Data-contract principles

### 20.1 Stable identifiers

Prefer stable immutable IDs for canonical concepts/entities over mutable display names.

Examples:

```text
sector_uid
entity_uid
content_uid
intent_uid
claim_uid
policy_uid
capability_uid
credential_uid
```

### 20.2 Labels are not authority

Display names, translated labels, marketing names, sector names, and the public platform brand may change without changing canonical IDs or business meaning.

### 20.3 Registries over closed enums where future expansion is expected

A future entity/sector/capability type should be addable through an authoritative registry/versioned contract where safe rather than requiring core rewrites.

Closed enums remain appropriate for true constitutional invariants.

---

## 21. Agent-ready, human-sovereign

Human intent remains primary product authority.

Future agents may use the same policy-checked capabilities as human interfaces, for example:

```text
discover
refine_intent
explain
save
share
contact
```

The architecture must not expose external-deal capabilities such as:

```text
buy
checkout
negotiate
settle
escrow
complete_external_deal
```

because those capabilities do not exist in TIGER’s external-deal constitution.

AI does not hold sovereign authority. Policy/capability/owner controls remain authoritative.

---

## 22. Failure handling

### 22.1 Intent ambiguity

If uncertainty materially changes the result, ask the minimum necessary clarification or expose the ambiguity.

### 22.2 World data unavailable

Do not fabricate availability, credentials, price, location, or provenance.

Show `unknown`, stale state, or absence of evidence when appropriate.

### 22.3 Partial subsystem failure

The platform should degrade gracefully.

Examples:

- generative presentation unavailable → deterministic results layout;
- model unavailable → deterministic/indexed search fallback;
- map unavailable → textual/location results remain;
- pulse subsystem unavailable → ordinary discovery remains;
- explanation subsystem degraded → do not fabricate explanations;
- contact endpoint unavailable → omit endpoint/control.

### 22.4 Policy uncertainty

Fail closed for sensitive capability decisions.

### 22.5 Offline/weak network

Preserve existing resilience goals:

- lightweight shell;
- local cached safe state;
- progressive loading;
- resilient retries;
- stale markers;
- no false “sent/completed” mutation state;
- recoverable context.

---

## 23. Security requirements

- Server/database policy remains authoritative; UI hiding is not authorization.
- Sensitive intent data must be minimised and purpose-limited.
- AI output is untrusted input until validated against contracts and policy.
- Generated presentation may use only approved components/capabilities.
- Prompt/content injection must not grant capabilities.
- Entity claims do not become verified evidence by repetition.
- Contact endpoint exposure follows entity/privacy/policy scope.
- Agents call the same policy layer as the human UI.
- Audit sensitive policy/capability actions.
- Unknown actions fail closed.
- No external-deal execution may emerge through renamed capabilities.

---

## 24. Accessibility and simplicity requirements

The innovation must not increase cognitive burden.

The ordinary user should not need to understand:

- 9D;
- Semantic World Graph;
- Capability Leases;
- Epistemic Truth;
- policy engines;
- continuity architecture.

The product must instead communicate familiar concepts such as:

- “ماذا تريد؟”
- “لماذا ظهر هذا؟”
- “غير مؤكد”
- “تم التحديث منذ…”
- “صحح ما فهمته TIGER”
- “تواصل”
- “تم / وجدت ما أريد”

Accessibility remains mandatory across mobile/desktop, RTL/LTR, keyboard, focus, screen readers, reduced motion, loading, empty, error, and offline states.

---

## 25. Migration strategy — no rebuild from zero

Innovation 2 uses forward evolution.

### KEEP

Preserve all verified non-conflicting capabilities, including:

- existing sectors and stable IDs;
- Social capabilities that are real;
- ONE FIELD contracts that are current and compatible;
- identity/persona authority;
- security/RLS protections;
- zero-brokerage authority;
- capability-before-UI rule;
- advertising authority;
- evidence/audit;
- release safeguards.

### MERGE

Unify overlapping concepts into shared contracts:

- Social Commerce Graph → Semantic World Graph;
- Product DNA + Product Passport + Origin Chain → Entity/Product Passport + provenance claims;
- PULSE + Intent Weather + temporal availability → World Pulse;
- Intent Beacon + Half-Life → Intent lifecycle/Reverse Discovery;
- Proof of Relevance + FitExplanation + counterfactuals → Explainable Rendezvous;
- Capability Graph + runtime action resolution → Capability/Sovereignty plane.

### RENAME / GENERALISE

- `Commerce` dimension → `Offer / Interaction Mode` to avoid transaction-engine semantics;
- `Sector Lens` → Derived Sector Lens when inferred from intent;
- `Social Commerce Graph` → Semantic World Graph;
- `Living Intent Space` → user-facing compiled Intent Scene/Micro-World concept;
- `Private Discovery Rendezvous` → Universal Rendezvous architecture spanning the complete platform while preserving its privacy/zero-brokerage principles.

### SUPERSEDE

Supersede only narrower design assumptions that conflict with this platform-wide architecture, such as:

- separate matcher per sector;
- giant sector Mall as primary discovery path;
- fixed search-results-only presentation;
- hidden immutable user profile assumptions;
- treating AI inference as verified fact;
- binding the platform core to a specific AI/database/protocol/provider.

### RETIRE

Retire active runtime authority for:

- external-deal order/checkout/payment/escrow/settlement/fulfillment/commission;
- dead/disabled future controls;
- duplicate engines that create parallel authority;
- stale compatibility paths that violate current authority after safe migration;
- unsupported claims used as organic trust/ranking proof.

Historical evidence may remain only as tombstoned provenance/audit where necessary.

---

## 26. Design-level acceptance criteria

Implementation plans derived from this design must prove at least the following:

1. one shared rendezvous contract can support materially different sectors without duplicating core policy/intent logic;
2. existing sector IDs/data are preserved or migrated with explicit lineage;
3. Social can create/refine intent through shared contracts rather than a Social-only matcher;
4. ONE FIELD remains compatible with current IntentFrame/Semantic Capsule/FitExplanation contracts rather than creating competing implementations;
5. organic relevance is independent from paid delivery;
6. claims carry source/verification/freshness semantics where they affect trust/ranking;
7. unavailable capabilities do not render;
8. external deal state cannot be created after contact handoff;
9. generative UI can degrade to deterministic approved components;
10. AI/model unavailability does not eliminate core discovery where deterministic/indexed alternatives exist;
11. the user can correct or expire retained intent state where retention is enabled;
12. a future sector can join through registry/contracts without a new platform core;
13. platform semantics are not coupled to one model, database, UI framework, auth provider, or protocol;
14. migration provenance and current-only authority rules prevent parallel legacy cores;
15. repository, staging, production, legal, device, security and operational evidence remain separate gates; documentation alone never proves runtime readiness.

---

## 27. Non-goals

Innovation 2 does not:

- rebuild TIGER from zero;
- create independent sector applications;
- replace the Social Home with an AI chat screen;
- require every user to use natural-language intent;
- remove traditional browsing;
- create an autonomous purchasing agent;
- process external-party product/service transactions;
- guarantee that every claim is verified;
- make AI the authorization authority;
- require a graph database, one LLM, one cloud, one protocol, or one UI framework;
- claim 70 years of unchanged code.

The 70-year objective means **semantic and constitutional continuity under continuous technology replacement**.

---

## 28. Final architecture

```text
                         TIGER PLATFORM
                               │
                               ▼
                       UNIVERSAL 9D FABRIC
                               │
             ┌─────────────────┼─────────────────┐
             ▼                 ▼                 ▼
          INTENT             WORLD          SOVEREIGNTY
             │                 │                 │
             └─────────────────┼─────────────────┘
                               ▼
                    UNIVERSAL RENDEZVOUS
                               │
                 ┌─────────────┼─────────────┐
                 ▼             ▼             ▼
              Social         Search       Discovery
                 │             │             │
                 └─────────────┼─────────────┘
                               ▼
                   PERSONAL WORLD COMPILER
                               │
                               ▼
                    PROOF / EXPLANATION
                               │
                               ▼
                     CAPABILITY DECISION
                               │
                               ▼
                           CONTACT
                               │
                               ▼
                         TIGER STOPS

           CONTINUITY GENOME UNDER ALL LAYERS: 2026 → 2096+
```

The user-visible ideal remains radically simple:

> **TIGER واحدة تفهم أي مجال، بدل أن نبني TIGER جديدة لكل مجال.**

And the platform-wide technical invariant is:

> **One semantic core. One policy authority. One universal rendezvous. Unlimited additive sectors. Replaceable technology.**

---

## 29. Implementation gate

This document records the owner-approved architectural direction but is intentionally a **design artifact only**.

No feature implementation is authorised by this document alone until the owner reviews this written specification. After written-spec approval, the next required artifact is a dedicated implementation plan that decomposes migration into isolated, testable, forward-only phases and respects the repository’s current Quality Gate and exact-SHA release state.
