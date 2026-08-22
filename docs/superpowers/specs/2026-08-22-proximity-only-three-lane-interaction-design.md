# TIGER Proximity-Only Constitution + Three-Lane Interaction Design

**Status:** OWNER-APPROVED DESIGN AUTHORITY
**Effective:** 2026-08-22
**Branch:** `feat/final-release-closure-20260822`
**Supersedes for this topic:** any older UX, commerce, payment, commission, order, checkout, fulfillment, settlement, deal-closing, share-menu, or post-action design that conflicts with this document or `docs/architecture/OWNER_AUTHORITY_REGISTRY.md`.

## 1. Constitutional purpose

TIGER exists to reduce the distance between a person's intent and the most relevant person, company, institution, shop, independent professional, provider, content item, advertised good, advertised service, or other eligible entity.

The external-deal path is permanently bounded as:

`DISCOVERY -> RELEVANCE -> EXPLANATION -> CONTACT HANDOFF -> TIGER STOPS`

TIGER does not become a party to, broker for, guarantor of, processor of, or success participant in an external deal.

### 1.1 Absolute external-deal exclusions

For advertised goods/services and any other external party-to-party transaction, TIGER must not implement or authorize:

- negotiation on behalf of either party;
- agreement or deal closing;
- external-deal order creation or order lifecycle;
- buyer/seller/provider checkout;
- product/service payment collection or routing;
- external-deal escrow;
- buyer/seller/provider payout;
- transaction settlement;
- fulfillment or shipment execution;
- transaction-value commission;
- success fee;
- revenue linked to whether an external deal happened, succeeded, or to its value;
- any workflow whose business meaning makes TIGER an intermediary in the external deal.

If an old artifact contains such semantics, it is not current authority. It must be retired, tombstoned as historical evidence, or redesigned into discovery/relevance/explanation/contact-handoff behavior.

### 1.2 Allowed platform-owned finance

TIGER may charge only for TIGER-owned economic activity, including:

- advertising;
- campaigns;
- ad credits/packages;
- paid visibility/boost services owned by TIGER;
- other explicitly approved platform-owned services.

Platform-owned advertising/service finance is independent from any external deal outcome or value.

### 1.3 Fail-closed invariants

The platform must be designed and tested so these invariants remain true:

```text
CONTACT_HANDOFF_IS_TERMINAL=true
EXTERNAL_DEAL_STATE_MACHINE=0
ACTIVE_EXTERNAL_DEAL_PAYMENT=0
ACTIVE_EXTERNAL_DEAL_COMMISSION=0
ACTIVE_SUCCESS_FEE=0
ACTIVE_EXTERNAL_DEAL_SETTLEMENT=0
ACTIVE_EXTERNAL_DEAL_FULFILLMENT=0
AD_REVENUE_DEPENDS_ON_DEAL_OUTCOME=false
```

These are semantic invariants. Renaming a prohibited concept does not make it allowed.

## 2. Owner-approved interaction model

The canonical post/listing/discovery interaction model is the following three-lane model:

```text
SHARE   = DISTRIBUTE
•••     = CONTROL
CONTACT = HANDOFF -> TIGER STOPS
```

These lanes must remain conceptually independent.

### 2.1 SHARE lane — distribution, not commerce

The user-facing label remains familiar: **Share / مشاركة**.

Purpose: distribute or reference content. It never starts an external transaction.

A share destination may be rendered only when its runtime capability is real, authorized, and tested. Examples may include:

- share to the user's own feed;
- share to Story when Story runtime is real;
- send through Messages when the required messaging destination runtime is real;
- copy a privacy-safe link;
- invoke the operating-system/web native share surface.

Rules:

- `Capability -> Authorization -> Policy -> Runtime availability -> UI`.
- No capability means no visible control.
- A disabled "coming soon" share destination must not be shown as if usable.
- Sharing must preserve the original content's audience/privacy boundary and provenance.
- Sharing may reference canonical content instead of blindly duplicating it.
- Share must never expose Buy, Order, Checkout, Pay, Make Offer, escrow, settlement, deal completion, or external transaction commission behavior.

Future-safe internal architecture may use a canonical source reference, version/hash, author/provenance metadata, audience policy, destination policy, and revocation state, but these must not complicate the ordinary user experience.

### 2.2 ••• lane — user control, not a fixed legacy menu

The user-facing surface remains the familiar **•••** control.

Purpose: give the user contextual control over content, recommendations, privacy, moderation, and their own discovery experience.

The menu is generated from actual viewer/content capabilities rather than a fixed list.

Potential contextual actions include, only when real and authorized:

- Save;
- Hide;
- Why am I seeing this?;
- More like this;
- Less like this;
- mute/snooze/unfollow where the underlying relationship model supports it;
- Report;
- owner-only edit/audience/archive/trash actions;
- managed-entity actions when the viewer actually has the corresponding role;
- discovery-feedback actions such as "show me more direct manufacturers", "less used items", "closer to me", or equivalent natural-language preference refinement.

The control lane may update ranking/discovery intent. It must not negotiate, place orders, execute transactions, or act for either external party.

### 2.3 CONTACT lane — proximity handoff

The distinct **Contact / تواصل** lane is the terminal commercial/discovery handoff.

Purpose: reduce distance between the user and the relevant entity, then stop TIGER's role in the external deal.

A contact sheet may expose only real, authorized communication endpoints associated with the entity, for example:

- phone call;
- WhatsApp/external messaging deep link;
- email;
- official website;
- location/directions;
- an internal communication capability only when that capability is actually implemented and does not create brokerage semantics.

The user experience should clearly communicate the boundary, e.g. in equivalent product language:

> TIGER introduces the parties. Communication and anything after handoff are directly between them.

After the handoff action is initiated, TIGER must not create an external-deal order, payment, commission, settlement, fulfillment, or success state.

## 3. Familiar surface, advanced internals

The product should remain immediately understandable. The ordinary social post keeps a familiar interaction grammar such as:

`Reaction | Comment | Share | •••`

Commercial/discovery cards may additionally expose a distinct **Contact** action and an explanation of relevance.

The innovation belongs primarily beneath the surface:

- intent-aware discovery;
- relevance ranking;
- explanation;
- policy/capability resolution;
- privacy-safe sharing;
- contextual action resolution;
- contact handoff.

Do not force users to learn architectural terminology such as Distribution Router, Capability Graph, Policy Engine, or Handoff Engine.

## 4. Capability-before-UI rule

No interface control may be presented as real before the complete backend/runtime contract exists.

Required order:

```text
Capability
  -> authorization
  -> content/audience policy
  -> runtime availability
  -> user-visible control
```

Therefore:

- no visible disabled future Share action;
- no visible disabled future ••• menu;
- no Messages/Notifications/Story/Group destination unless that destination is end-to-end real;
- no placeholder action that communicates a capability the product cannot perform;
- hidden experimental metadata is not enough if the actual control still renders.

When a capability is unavailable, omit it from the rendered UI. Do not weaken this rule to manufacture visual completeness.

## 5. Proximity intelligence boundary

Intent intelligence may do all of the following:

- understand a natural-language need;
- normalize category/sector/entity context;
- find relevant candidates;
- rank candidates by fit, distance, freshness, availability metadata, user-stated preferences, trust/provenance signals, and other lawful discovery signals;
- explain why an item/entity/ad was matched;
- let the user correct the system's understanding;
- recommend relevant advertisements/providers/entities;
- hand off contact.

Intent intelligence must not infer authority to conclude a deal or financially participate in it.

## 6. Advertising boundary

Advertising remains TIGER's own paid product.

Paid advertising may buy eligible platform-owned distribution/visibility according to country policy and campaign rules. Paid status must not silently redefine organic relevance, create external-deal success fees, or make TIGER a party to an external transaction.

The system may measure platform-owned advertising delivery/engagement within its approved advertising model. It must not require external transaction value or external deal completion to calculate TIGER's advertising revenue.

## 7. Legacy-conflict treatment

Any old code, schema, UI, event, document, fixture, migration, test, or roadmap that conflicts with this constitution is handled using the existing owner-authority classifications:

- `KEEP_PLATFORM_FINANCE` only for TIGER-owned advertising/services;
- `RETIRE_BROKERAGE` for external-deal execution semantics;
- `REDESIGN_DISCOVERY_ONLY` when useful discovery/contact meaning can survive without brokerage;
- `HISTORICAL_EVIDENCE_ONLY` when retained solely for provenance/audit.

### 7.1 Remove vs preserve

"Remove old" means remove its active/runtime authority and active user-facing path completely. Historical evidence may be retained only when needed for audit/provenance and must be explicitly tombstoned so no consumer can treat it as current authority.

Do not delete unrelated security controls, user data, sector registries, audit evidence, RLS protections, or non-conflicting platform capabilities.

### 7.2 Semantic scan targets

Repository cleanup must search for active semantics equivalent to:

- buyer/seller/provider checkout;
- order lifecycle for external goods/services;
- external-deal payment/payout;
- escrow;
- settlement;
- fulfillment/shipment execution;
- transaction-value commission;
- success fee;
- deal close/complete state;
- visible disabled future controls;
- fake contact/share/action destinations.

The scan must inspect meaning, not only exact English keywords.

## 8. Current known UI conflict

At the time this design was adopted, `scripts/social/feed-controller.js` still creates visible disabled future controls for:

- the post `•••` menu;
- `Share / مشاركة`.

They carry `data-social-feature-state="future-hidden"` but are still appended into the rendered post DOM. Metadata alone does not satisfy the capability-before-UI rule.

Required implementation outcome:

1. first introduce regression tests that fail while these dead controls are rendered;
2. remove/hide the dead rendered controls without deleting the approved final product concepts;
3. preserve working reactions and comments;
4. later expose Share/••• again only behind real capability contracts and tests.

## 9. Data and API design constraints

New external-commerce APIs should use discovery/handoff language rather than transactional brokerage language where semantics are truly discovery-only.

Preferred conceptual domain terms include:

- intent;
- candidate;
- relevant entity;
- discovery result;
- relevance reason;
- contact endpoint;
- contact handoff;
- content reference;
- capability;
- policy decision;
- user preference signal.

Do not introduce an external-deal `order`, `checkout`, `payout`, `escrow`, `settlement`, `commission`, or `success_fee` model under a new alias.

## 10. Security and privacy

- Authorization is enforced server-side/database-side where relevant; hiding a button is not an authorization boundary.
- Contact endpoint exposure must follow entity privacy/role/policy rules.
- Share must not widen a source audience beyond policy.
- Discovery preference signals must be minimised, purpose-limited, and user-controllable where feasible.
- High-impact actions require explicit user intent; an AI/agent must not silently execute sensitive actions.
- Future agent-facing capabilities must call the same policy-checked action contracts as the human UI.

## 11. Testing and release gates

Implementation is incomplete until tests prove all applicable invariants.

Minimum repository-controlled tests for this topic:

1. authority test for the proximity-only constitution and terminal handoff;
2. semantic zero-brokerage scan for current-authority/runtime paths;
3. no visible dead Share/••• controls when their runtimes are absent;
4. preserve working reaction/comment controls;
5. forbid generic external Buy/Order/Checkout/Pay/Make Offer actions owned by TIGER;
6. advertising finance remains explicitly platform-owned and deal-outcome-independent;
7. contact handoff cannot create external order/payment/commission/settlement/fulfillment state;
8. legacy current-authority docs/tests cannot revive superseded brokerage semantics.

No CI result alone proves staging/production/legal/device readiness; those remain separately evidenced release gates.

## 12. Non-goals

This design does not:

- turn TIGER into a marketplace operator or broker;
- add an external transaction engine;
- process buyer/seller/provider deal payments;
- guarantee external parties or outcomes;
- require a giant mall/catalog UI;
- rename every familiar user-facing social control;
- expose unimplemented future capabilities;
- delete non-conflicting sectors or approved Social/ONE FIELD capabilities.

## 13. Canonical summary

The owner-approved rule for this topic is:

> TIGER reduces distance. It understands intent, discovers, ranks, explains, advertises, and hands off contact. Then TIGER stops. TIGER's own paid product is advertising/platform-owned services, not participation in an external deal.

And the owner-approved interaction grammar is:

```text
SHARE   = DISTRIBUTE
•••     = CONTROL
CONTACT = HANDOFF -> TIGER STOPS
```

Any implementation or historical authority that conflicts with these rules is superseded for this topic and must fail closed until retired or redesigned.