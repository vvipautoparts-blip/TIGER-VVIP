# ONE FIELD Runtime Orchestrator Design

## Status
Owner-approved architectural direction for the user-facing ONE FIELD runtime slice. This design extends the exact GREEN convergence head `34f51540132677ee3247036b6efdde7ca303d3d6` and does not replace existing Social, Search, Marketplace, sector, persona, advertising, or security contracts.

## Goal
Make ONE FIELD a real Home-first user experience: one intent field understands what the user wants, retrieves eligible candidates from compatible sources, applies hard constraints before ranking, explains fit, preserves explicit sponsored labeling, and ends at direct contact handoff.

Acceptance phrase:

`أريد كورن فليكس للأطفال بدون سكر`

The runtime must not require a pre-created rigid category path named after the requested item.

## Governing boundaries
- Discovery-only external commerce authority: `DISCOVERY → RELEVANCE → EXPLANATION → CONTACT HANDOFF → TIGER STOPS`.
- No buyer/seller checkout, order execution, escrow, negotiation, settlement, fulfillment, deal-close, or external transaction commission path.
- Platform-owned advertising/ad credits/services finance remains separate and authorized only by its existing authority.
- Organic relevance and sponsored delivery are structurally separated. Sponsored state cannot increase organic fit score or become an organic explanation reason.
- Existing sectors remain additive compatibility sources; no destructive sector removal or forced reclassification.
- Existing Social Search privacy, RLS, cursor, rate-budget, block, and visibility boundaries remain unchanged or stricter.
- Brand strings are presentation-only and must not become semantic identity keys.
- No `main`, Production, Staging, remote Supabase, provider credential, or real-user mutation in this slice.

## User experience
### Home intent field
Add one visible, keyboard-accessible intent entry to Home, independent from the legacy Marketplace search box. The default Arabic placeholder should invite natural language rather than product/category syntax.

Submission states:
- idle
- interpreting
- discovering
- results
- empty
- degraded
- error

The field must preserve input on recoverable error, announce state changes through accessible live regions, and support RTL/LTR without changing semantic behavior.

### Results
The result surface is a unified discovery projection, not a transaction surface. Each organic result may expose:
- title/primary label
- source kind
- fit explanation
- relevant observed facts/constraints
- location/context if public and applicable
- direct contact or details action when authorized

Sponsored results, when present, must be explicitly labeled and rendered from a separate lane. They may coexist visually but cannot be merged into organic ranking calculations.

### Contact handoff
The final action is contact/details handoff. The runtime must not present success copy that implies purchase, booking, payment, contract, order, escrow, or platform-mediated deal completion.

## Architecture
### 1. Intent Runtime Controller
New browser-facing controller owns Home input lifecycle, stale-request cancellation, state transitions, and rendering coordination. It must not know SQL table names or provider credentials.

Proposed file:
- `scripts/discovery/one-field-runtime-controller.js`

Public factory:
- `createOneFieldRuntimeController(options)`

Required dependencies:
- `orchestrator.run(intentRequest)`
- `view.render(state)`
- optional abort/cancellation primitive

### 2. Runtime Orchestrator
Pure orchestration layer receives normalized intent, asks adapters for candidates, applies semantic/hard-constraint processing through existing ONE FIELD modules, and returns bounded projections.

Proposed file:
- `scripts/discovery/one-field-runtime-orchestrator.js`

Public factory:
- `createOneFieldRuntimeOrchestrator(options)`

Primary method:
- `run({ text, locale, context, signal })`

Returns an immutable result:
- `intent`
- `organic[]`
- `sponsored[]`
- `facets[]`
- `status`
- `degradedSources[]`

The orchestrator never performs checkout/payment/order/settlement actions.

### 3. Candidate adapters
Adapters isolate legacy/current sources from the semantic runtime. Initial slice should support only sources already present in the convergence tree and required to demonstrate the user flow.

Proposed file:
- `scripts/discovery/one-field-runtime-adapters.js`

Adapters must emit a bounded candidate contract. They must not leak Clerk subject identifiers, private profile fields, raw ranking scores, secret configuration, or unreviewed database rows.

Initial adapters:
- public Marketplace/listing compatibility adapter
- optional Social Search adapter where a query semantically targets public people/posts and existing Social Search authority permits it

The Marketplace adapter must not force the legacy fixed-sector list as the semantic ontology. Sector remains metadata/compatibility evidence only.

### 4. Organic semantic pipeline
Reuse existing byte-verified Phase 2 modules rather than reimplementing them:
- `one-field-intent-scene.js`
- `one-field-semantic-capsule.js`
- `one-field-hybrid-retrieval.js`
- `one-field-fit-facets.js`
- `one-field-concept-lifecycle.js` where proposal lifecycle is needed

Hard structured constraints are applied before ranking. FitExplanation must only cite evidence actually present in the candidate/capsule and allowed by the existing fit contract.

### 5. Sponsored isolation
Sponsored candidates use a separate adapter/lane. This slice may render an empty sponsored lane if no authorized runtime provider is available. It must never synthesize sponsored content or convert paid metadata into organic relevance.

### 6. Home integration
Modify `index.html` only enough to mount the Home intent surface and result region. Preserve existing social feed, composer, navigation, Marketplace, and current feature boundaries.

Do not silently repurpose the Marketplace `data-listing-search` field as ONE FIELD. The new Home field has its own explicit data attributes and controller.

## Data contracts
### IntentRequest
```js
{
  text: string,        // normalized bounded user intent
  locale: string,      // e.g. "ar"
  context: object,     // bounded non-secret public/session context only
  signal?: AbortSignal
}
```

### CandidateProjection
```js
{
  id: string,
  source: "marketplace" | "social_people" | "social_posts" | "other_allowed",
  kind: string,
  label: string,
  summary: string,
  facts: object,
  contact: object | null,
  sponsored: false
}
```

Sponsored candidates use a separate contract with `sponsored: true` and cannot enter organic ranking functions.

### RuntimeResult
```js
{
  status: "results" | "empty" | "degraded",
  intent: object,
  organic: Array<object>,
  sponsored: Array<object>,
  facets: Array<object>,
  degradedSources: Array<string>
}
```

## Error and degradation rules
- A failed source does not fabricate results.
- If at least one authorized source succeeds, return `degraded` with that source named only by safe internal category, not secret/provider detail.
- If every source fails, return a bounded runtime error for the controller to render.
- Stale responses must never overwrite a newer user intent.
- Abort/cancel is not displayed as an error to the user.
- No fake success states.

## Accessibility and responsive requirements
- Keyboard submission and focus-visible controls.
- `aria-live` status for interpreting/discovering/results/error changes.
- Logical DOM order for RTL/LTR.
- Reduced-motion safe; no motion required to understand status.
- Mobile, tablet, desktop layout must keep intent input and result actions operable.
- Result explanation text is readable by screen readers and does not rely on color alone.

## Security and privacy requirements
- Bound and sanitize intent length before adapter calls.
- No raw provider/Clerk identifiers in rendered projections.
- No direct browser access added to protected tables beyond existing reviewed repository boundaries.
- No new remote DB migration is required for the first runtime slice.
- Existing Search rate-budget and visibility rules are preserved where Social Search is used.
- Candidate adapters fail closed on malformed candidate shape.
- Prototype-pollution/secret-bearing rejection from Semantic Capsule remains authoritative.

## Testing strategy
Strict TDD per task.

Required contract coverage:
1. acceptance phrase produces a structured intent without rigid category dependency;
2. hard constraints exclude incompatible candidates before ranking;
3. organic ranking ignores paid/sponsored fields;
4. FitExplanation cites only observed evidence;
5. sponsored lane cannot enter organic lane;
6. adapter rejects secret/private identifiers and malformed candidates;
7. stale request cannot replace newer results;
8. source failure returns degraded/empty/error truthfully;
9. contact handoff contains no checkout/order/payment semantics;
10. Home wiring is accessible and does not repurpose legacy Marketplace search;
11. responsive/RTL/LTR and reduced-motion contracts remain GREEN;
12. full Quality Gate and relevant regression workflows pass on the exact final SHA.

## Non-goals for this slice
- Replacing Marketplace persistence schema.
- New payment, order, checkout, escrow, booking, settlement, negotiation, or fulfillment systems.
- New public/commercial brand naming.
- Destructive replacement of existing sectors/categories.
- Production/Staging deployment.
- Provider activation.
- Solving Messages/Notifications placeholders in this same slice.

## Completion criteria
This slice is complete only when:
- the Home intent field is real and wired;
- the acceptance phrase runs through the orchestrator;
- results expose evidence-backed fit and direct-contact handoff;
- sponsored/organic separation is structurally tested;
- no legacy Marketplace-only search substitution is used;
- no dead/fake control is introduced;
- exact final SHA passes the relevant CI/regression gates.
