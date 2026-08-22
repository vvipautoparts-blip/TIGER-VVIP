# ONE FIELD — Living Discovery Fabric Design

**Date:** 2026-08-22
**Status:** OWNER APPROVED — IMPLEMENTATION AUTHORIZED
**Branch:** `feat/one-field-living-discovery-20260822`
**Authority:** Issue #312 is the controlling commercial/discovery boundary.
**Brand note:** `TIGER`, `VVIP TIGER`, `ONE FIELD`, `Mall`, sector labels, and all other human-facing names are current working/presentation labels only unless a later owner decision explicitly freezes a commercial brand.
**Public-repository note:** this specification intentionally defines interfaces, invariants, and acceptance behavior without publishing proprietary ranking weights, secret promotion thresholds, fraud heuristics, or patent-sensitive implementation constants.

## 1. Decision

The platform adopts **ONE FIELD / Invisible Semantic Discovery Fabric** as the current internal architecture for cross-sector social discovery. Neither the platform name nor the architecture name is a permanent identity contract. Both may be renamed without changing semantic identifiers, stored relationships, authorization, discovery contracts, integration contracts, or data ownership.

The governing formula is:

> ONE SURFACE + ONE SEMANTIC FIELD + INFINITE VIEWS + INVISIBLE AI + EXPLAINABLE RELEVANCE + ZERO BROKERAGE

The user experience remains familiar and stable. Intelligence is ambient and hidden inside search, posting, enrichment, discovery, filtering, and rendering. The platform must not require a visible chatbot persona to make the system usable.

### 1.1 Brand Abstraction Layer

The commercial brand is presentation metadata, never a primary key or domain invariant.

```text
platform_brand_id = brand_current
brand_aliases = [current public name, localized names, future replacement names]
canonical_platform_subject = platform_core
```

Required behavior:

- changing the public platform name must not require a database migration of domain records;
- canonical IDs must never embed the mutable commercial brand;
- authorization permissions, policy keys, event semantics, semantic concepts, personas, listing identities, and evidence hashes must be brand-neutral;
- public routes/domains may be redirected or aliased through a controlled brand/routing layer without changing canonical object IDs;
- UI copy, logos, locale strings, SEO metadata, email display names, and app-store labels are projections of the active brand profile;
- compatibility aliases may preserve old URLs or names during a rename, but old labels must not remain authoritative business logic;
- internal source filenames may retain historical names during migration, but new core contracts must use neutral semantic terminology where practical.

This rule also applies recursively to sector/domain/view/category names.

## 2. Non-negotiable invariants

1. **The platform brand/name is a presentation alias.** `TIGER`, `VVIP TIGER`, and any future replacement name are mutable labels. Stable brand-neutral internal IDs and contracts are authoritative.
2. **All sector/domain/view names are presentation aliases.** Stable internal semantic IDs are authoritative. Renaming a sector/domain/view must not require data migration or code forks.
3. **No new sector replaces an existing sector or feature.** New domains/views are additive through shared registries and contracts.
4. **Personas are not sectors.** Individual, company, institution, shop, freelancer, factory, farm, importer, wholesaler, supermarket, and future organization types are actor/persona types that may operate across multiple domains.
5. **Posting identity is explicit.** A post/listing stores the authorized `persona_id` used to publish it. AI may suggest a persona; it may never silently select or change one.
6. **Product meaning is independent of seller/persona.** A product/concept does not store `seller_type_id` as identity. The relation is `Actor -> Persona -> Listing/Post -> Product/Service/Object`.
7. **No rigid taxonomy owns discovery.** Categories and subcategories remain supported for conventional browse, but are projections over the semantic field, not the source of truth.
8. **Condition is semantic and policy-bound.** `new`, `used`, `refurbished`, `open_box`, freshness, grade, harvest/expiry/package state, and future states are vocabulary concepts with applicability policies. Nonsensical combinations fail closed (for example, `used` sugar).
9. **AI cannot directly mutate canonical ontology.** It may propose concepts, aliases, attributes, relations, merges, and experience manifests. Promotion to canonical state follows deterministic validation and governance.
10. **Organic relevance and paid delivery are separate systems.** Advertising budget may buy eligible exposure; it must not buy semantic truth, evidence, trust, or organic fit score.
11. **Zero brokerage is absolute for user-to-user/provider commerce.** Allowed flow: `Discovery -> Relevance/Explanation -> Contact Handoff -> Platform Stops`. No order creation, checkout, buyer/seller payment, escrow, negotiation, deal close, fulfillment, or sales/deal commission.
12. **Platform-owned finance remains allowed only for the platform's own advertising/services** under Issue #312 policy.
13. **The stable shell remains familiar.** Home/feed, stories, composer, search/intent entry, messages, notifications, profile, and browse anchors remain predictable while discovery content may adapt.

## 3. Core model

### 3.1 Semantic Concept

A canonical concept is identified by an immutable `concept_id` and may represent a domain, product family, product model, service kind, attribute, condition, audience, material, place, policy-relevant property, or other meaning.

Human-readable names are localized aliases:

```text
concept_id = cpt_xxx
aliases = ["Furniture", "الأثاث", ...]
```

Changing aliases does not change identity.

### 3.2 Persona

A persona is the identity under which an authorized actor publishes or communicates.

Representative kinds include:

```text
individual
company
institution
shop
freelancer
factory
farm
importer
wholesaler
supermarket
```

The list is extensible through registry data, not hard-coded UI forks.

### 3.3 Listing/Post

A listing or post references:

- the publishing `persona_id`;
- one or more semantic concepts/domains;
- the advertised object/product/service where applicable;
- structured and unstructured content;
- media;
- geography/time;
- evidence/trust metadata;
- policy version and lifecycle.

Existing canonical listing contracts remain valid where non-conflicting, but fixed sector/category allowlists must evolve behind compatibility adapters rather than being deleted blindly.

### 3.4 Semantic Capsule

Every discoverable object can expose a normalized semantic capsule projection:

```text
capsule_id
source_object_id
source_object_type
canonical_concepts[]
aliases/languages[]
structured_attributes{}
relations[]
multimodal_representations[]
persona_id
domain_views[]
condition_state
geo_context
time/freshness
availability_signal
evidence_refs[]
trust_projection
country/policy_context
```

The capsule is a discovery projection, not a second transactional product database.

## 4. Universal Composer — Posting As

The existing social composer evolves into a **Universal Composer** while preserving the familiar interaction pattern.

At creation time the user sees an explicit `Posting as` selector. The server verifies that the authenticated actor is authorized to act as the selected persona. A browser-supplied `persona_id` is never sufficient proof of authority.

Flow:

```text
Authenticated Actor
  -> choose/confirm Persona
  -> compose text/media
  -> optional AI semantic suggestions
  -> user confirms material facts
  -> server authorization
  -> create Post/Listing
  -> build/update Semantic Capsule
```

AI can suggest: likely domain, product family, attributes, condition, media-derived facts, and a likely persona. It may not impersonate a persona, publish without authorization, invent evidence, or silently accept safety/policy-critical claims.

## 5. One Intent Entry

The platform supports one principal intent entry in Home while retaining traditional browse.

Input may progressively support text, voice, image, video, barcode/QR, location, and object context. Input modality is normalized into an **Intent Frame** rather than forcing the user through a category tree.

Canonical acceptance example:

> أريد كورن فليكس للأطفال بدون سكر.

The system should derive, where evidence permits:

```text
product_family: breakfast cereal
audience: children
nutrition_constraint: sugar-free / no-added-sugar intent
important_attributes: sugar, ingredients, allergens, age suitability, pack size, brand, price, location
possible_persona_sources: supermarket, importer, wholesaler, shop
```

The request must work even if no permanent `Kids > Sugar Free > Cereal` category exists.

## 6. Discovery Scene

The response to intent is a **Discovery Scene**, not a new permanent page or taxonomy branch.

A scene is a bounded, temporary experience manifest assembled from approved UI components. It may include:

- intent summary;
- relevant listings/posts/entities;
- generated facets;
- source/persona groupings;
- geo-aware options where appropriate;
- evidence/trust explanations;
- clearly labeled sponsored inventory;
- contact handoff actions.

The system must not generate arbitrary executable React/JavaScript from an LLM. A scene references approved component types and validated props through an `ExperienceManifest` contract.

Example conceptual manifest:

```text
scene_type: intent_discovery
components:
  - IntentSummary
  - DynamicFacetBar
  - ListingRail
  - EntityRail
  - EvidenceHint
  - SponsoredRail
  - ContactHandoff
```

This provides generative UX without generative-code security risk.

## 7. Hybrid Meaning Engine

Discovery combines independent signals rather than relying on vector similarity alone:

```text
lexical retrieval
+ multimodal semantic retrieval
+ structured attribute constraints
+ graph relationships
+ geography
+ time/freshness
+ evidence/trust
+ country policy
+ availability signals
```

Signal fusion is deterministic at the contract boundary and auditable by version. Proprietary weights remain implementation-private.

### 7.1 Semantic Gravity

For each Intent Frame, the platform computes which attributes matter most to that intent. The UI exposes a small bounded set of the most useful facets (target experience: approximately 5–8 primary facets, with expansion available), not every attribute in the schema.

For cereal, sugar/allergens/ingredients may dominate. For a used sofa, dimensions/condition/material/location may dominate. Attribute importance is therefore query-scoped, not globally static.

### 7.2 Explainable relevance

A discovery item can return a bounded `FitExplanation` containing only evidence-backed reasons such as:

```text
matches requested product family
matches no-added-sugar constraint
available near requested geography
published by a requested/eligible persona type
```

Paid status is a separate label and may never be represented as a fit reason.

## 8. Bidirectional Ontology Evolution

The platform learns candidate concepts from both supply and demand without allowing uncontrolled ontology mutation.

Lifecycle:

```text
new signal
 -> ephemeral concept
 -> observation window
 -> supply evidence + demand evidence + quality/duplication checks
 -> canonical candidate
 -> policy/governance validation
 -> promote | merge | alias | reject | retire
```

AI operations are proposals only:

```text
PROPOSE_CONCEPT
PROPOSE_ATTRIBUTE
PROPOSE_ALIAS
PROPOSE_RELATION
PROPOSE_MERGE
PROPOSE_EXPERIENCE
```

There is no `AI_DIRECT_CANONICAL_WRITE` capability.

Promotion thresholds, fraud rules, and ranking formulas are intentionally not specified in this public repository document.

## 9. Condition and attribute applicability

Condition uses vocabulary plus domain/category applicability policies.

Examples:

```text
Furniture: new | used | refurbished
Electronics: new | used | refurbished | open_box
Suitable personal accessories: new | used (policy dependent)
Packaged food: no used; expiry/package-state attributes apply
Fresh produce: freshness | grade | harvest attributes apply
```

Attributes are composable capability packs, not table-per-sector inheritance. A concept may activate multiple packs when needed.

Representative packs:

```text
DurableGoods
Electronics
FoodNutrition
FreshProduce
Furniture
```

The registry remains extensible for future domains without schema forks.

## 10. Browse compatibility

Traditional browsing remains a first-class accessibility and usability path:

```text
Browse -> View/Sector Alias -> Category Projection -> Facets -> Results
```

The browse tree and the intent engine consume the same semantic source of truth. There must not be an AI taxonomy database and a separate manual taxonomy database that drift independently.

Existing sectors are migrated gradually through compatibility mappings from legacy sector/category values to stable concepts/views. No sector is removed merely because ONE FIELD exists.

## 11. Privacy and on-device/edge evolution

The architecture allows optional local preprocessing for privacy and latency where browser/device support is appropriate:

- media preprocessing;
- local lightweight intent hints;
- PII redaction;
- local feature extraction.

These are accelerators, not correctness dependencies. Core functionality must degrade safely when unavailable.

Interfaces should also permit a future higher-privacy discovery tier without forcing encrypted vector search into every request.

## 12. Security and authorization

ONE FIELD extends the repository's existing fail-closed authorization approach.

Required properties:

- authenticated actor and active account;
- explicit `act_as_persona` authorization for Posting As;
- country/scope policy evaluated server-side;
- client cannot author trusted persona authority, trust, evidence, canonical promotion, or ranking-policy fields;
- semantic enrichment is untrusted until validated;
- canonical changes are versioned and auditable;
- generated experience manifests use allowlisted component schemas;
- no secret values in semantic capsules, logs, prompts, or client manifests;
- crypto implementations remain replaceable behind provider interfaces;
- no authorization decision may depend on a mutable commercial brand string.

Any historical authorization language that permits commercial mediation must be treated as superseded where it conflicts with Issue #312.

## 13. Discovery-only events and API boundary

Permitted event vocabulary includes examples such as:

```text
DISCOVERY.INTENT.RECEIVED
DISCOVERY.SCENE.SHOWN
DISCOVERY.MATCH.SHOWN
DISCOVERY.FIT.EXPLAINED
DISCOVERY.SAVED
DISCOVERY.CONTACT_HANDOFF
AD.IMPRESSION
AD.VIEW.VERIFIED
AD.OPENED
SEMANTIC.CONCEPT.PROPOSED
SEMANTIC.CONCEPT.PROMOTED
```

The user-to-provider discovery domain must not expose active APIs/events equivalent to:

```text
ORDER.CREATE
CHECKOUT.START
BUYER_PAYMENT
SELLER_PAYMENT
ESCROW
NEGOTIATION
DEAL.CLOSE
FULFILLMENT
SALE.COMPLETED
SALE_COMMISSION
```

Platform-owned advertising finance remains isolated under its own policy boundary.

## 14. Integration strategy

Implementation must be incremental and additive.

Phase boundaries should preserve current behavior while introducing compatibility contracts:

1. brand-neutral canonical identifiers plus brand/alias projection;
2. semantic IDs/aliases and persona registry contracts;
3. semantic capsule projection over existing posts/listings;
4. condition/applicability vocabulary;
5. intent frame and deterministic parser boundary;
6. hybrid retrieval interfaces with local/test adapters first;
7. discovery scene/experience manifest contracts;
8. Universal Composer `Posting As` authorization path;
9. generated facets and fit explanations;
10. ephemeral concept proposal lifecycle;
11. progressive domain/view onboarding, including the temporary Mall view.

No phase may require an automatic merge to `main`, production migration, or deletion of legacy data.

## 15. Required acceptance tests

At minimum, implementation planning must include tests proving:

- renaming the platform brand does not change canonical IDs, authorization subjects, stored relationships, semantic concepts, event semantics, or evidence ownership;
- renaming a sector/view alias does not change canonical IDs or stored relationships;
- adding a new domain/view does not change or remove existing sectors;
- one persona can publish across multiple eligible domains when authorized;
- a product concept is reusable across factory/importer/shop/individual listings without seller identity embedded in product identity;
- unauthorized `Posting As` fails closed;
- AI suggestion cannot publish or mutate canonical ontology directly;
- `used` is allowed for eligible durable goods and rejected for ineligible food concepts;
- the Arabic cereal intent resolves without requiring a pre-created rigid category path;
- generated facets are intent-relevant and schema-bounded;
- sponsored eligibility cannot alter organic fit evidence;
- contact handoff is available while brokerage/transaction APIs remain absent/denied;
- legacy sectors remain accessible through compatibility projections;
- scene manifests reject unknown executable component types/props.

## 16. Definition of done for this architecture slice

This design is implementation-authorized only when:

- owner accepts this written specification and its brand-abstraction amendment;
- repository impact mapping identifies the exact existing files/contracts/tests/migrations to extend or supersede;
- Issue #312 conflict audit is respected;
- the implementation plan names exact files and test commands from repository truth;
- production code follows test-first RED -> GREEN -> REFACTOR with observed failing tests before implementation;
- work proceeds on isolated branches/PRs with real test output and exact commit SHAs;
- no production or `main` mutation occurs without explicit owner approval.
