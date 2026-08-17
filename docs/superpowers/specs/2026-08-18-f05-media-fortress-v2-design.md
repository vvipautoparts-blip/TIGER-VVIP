# F05 TIGER Media Fortress V2 — Trusted JPEG/WebP Engine Design

## Purpose

Close the trusted image-engine portion of F05 Gate A without changing the existing F05 ownership, Clerk authentication, AWS binding, or HEIC privacy boundaries.

This design keeps both existing canonical output families:

- `Canonical JPEG V1`
- `Canonical WebP V1`

The engine never decodes or converts HEIC/HEIF on the server. Original HEIC/HEIF remains a client-only concern and must never be accepted into this server engine.

## Scope

This change is deliberately limited to the trusted JPEG/WebP engine behind the already-existing F05 ports:

- `imageEngine.inspect(bytes, policy)`
- `imageEngine.rewrite(bytes, policy)`

This design does not modify Clerk, listing ownership, Supabase Production, AWS IAM, DNS, Amplify, production deployment, S3 quarantine wiring, SQS topology, or `main`.

Ingress composition, quarantine storage, durable AWS sinks, and deployed staging/production evidence remain separate follow-on changes after the engine is proven.

## Existing boundary preserved

The current F05 AWS bindings already require an injected image engine with `inspect` and `rewrite` methods and expose runtime metadata stating JPEG/WebP support, metadata stripping, sRGB normalization, animation disabled, and `heicDecode: false`.

Media Fortress V2 plugs into that boundary. It does not introduce a parallel media stack.

## Authority decisions

1. JPEG and WebP remain the only accepted server-side candidate formats.
2. `Canonical JPEG V1` and `Canonical WebP V1` both remain valid outputs.
3. V1 rewriting is family-preserving: structurally verified JPEG bytes produce `Canonical JPEG V1`; structurally verified WebP bytes produce `Canonical WebP V1`. Filename extension and HTTP MIME never select the profile.
4. The input is never repaired in place. Malformed, ambiguous, polyglot, animated, oversized, or structurally inconsistent candidates fail closed.
5. Structural preflight is not treated as trust. It is only a bounded hypothesis before isolated decode.
6. Successful decode is not treated as sufficient trust. Only a canonical rewrite followed by blind re-inspection can produce a trusted output.
7. SHA-256 remains on the security-critical path. Perceptual hashing is explicitly outside acceptance and belongs to later asynchronous abuse intelligence.
8. No server-side HEIC/HEIF decoder, converter, fallback, or storage path may be introduced.

## Architecture

The engine is composed from small, independently testable units:

1. `structuralPreflight(bytes, policy)`
2. `isolatedDecode(bytes, structuralResult, policy)`
3. `normalizeRaster(decoded, policy)`
4. `canonicalEncode(raster, outputProfile, policy)`
5. `blindReinspect(outputBytes, outputProfile, policy)`
6. `attest(outputBytes, normalizedRaster, facts)`

The public adapter remains exactly the existing F05 image-engine shape:

```text
inspect(bytes, policy) -> trusted candidate facts or fail-closed error
rewrite(bytes, policy) -> canonical output bytes + attestable facts or fail-closed error
```

Internal components are injected where practical so the native codec backend can be isolated and version-pinned without coupling the F05 authorization layer to codec internals.

## Data flow

```text
Untrusted JPEG/WebP bytes
  -> bounded structural preflight
  -> format hypothesis: JPEG or WebP
  -> checked dimension / pixel-budget math
  -> isolated native decode
  -> decoded raster facts
  -> dimension + 4:3 policy validation
  -> metadata-destroying raster normalization
  -> sRGB normalization
  -> Canonical JPEG V1 or Canonical WebP V1 encode
  -> blind second-pass structural validation
  -> blind second-pass decode / fact validation
  -> object SHA-256
  -> normalized-pixel SHA-256
  -> frozen attestation record
  -> trusted output
```

Any failure at any step aborts the request. No partial output is trusted or persisted.

## Input envelope assumptions

The engine itself enforces a candidate byte ceiling of `15 MiB` even when the outer ingress also enforces it. This is defense in depth.

The deployed ingress remains responsible for the broader request envelope:

- identity content encoding only;
- request body `<= 16 MiB`;
- candidate image `<= 15 MiB`.

The engine accepts raw candidate bytes only. Compressed HTTP bodies such as gzip, br, or deflate are outside the engine API and must be rejected before invocation.

## Structural preflight

### General rules

Preflight must be bounded and allocation-conscious:

- never allocate from attacker-declared dimensions or chunk lengths;
- use checked integer arithmetic for offsets, lengths, dimensions, and pixel counts;
- reject integer overflow, truncation, offset wraparound, contradictory lengths, and trailing payload beyond the accepted container boundary;
- enforce the `15 MiB` candidate ceiling before format parsing;
- never treat filename extension or request `Content-Type` as authority.

### JPEG

JPEG preflight must verify a coherent marker stream, not only SOI/EOI magic bytes.

Required properties:

- starts with SOI;
- terminates at the expected EOI boundary;
- marker segment lengths remain inside the candidate buffer;
- no segment length underflow/overflow;
- image dimensions are obtained only from a valid frame header;
- multiple contradictory frame geometries are rejected;
- trailing bytes after the accepted EOI boundary are rejected;
- malformed marker ordering or truncation fails closed.

Presence of EXIF, XMP, ICC, COM, or application-specific metadata does not make the candidate trusted. Those segments may be observed only as bounded structural facts; they are not recursively parsed by the preflight layer. All source metadata is destroyed by canonical rasterization.

### WebP

WebP preflight must verify the full RIFF container relationship rather than checking only the first magic bytes.

Required properties:

- `RIFF` container signature;
- declared RIFF size is structurally consistent with the actual candidate bytes;
- `WEBP` form type;
- supported image payload family is structurally valid;
- all chunk lengths, alignment padding, and offsets remain within the candidate boundary;
- unknown or malformed chunk layout fails closed when it prevents an unambiguous single still-image interpretation;
- `ANIM` or `ANMF` presence is rejected;
- animation feature indication is rejected;
- contradictory extended-header flags fail closed;
- trailing data outside the valid RIFF boundary is rejected.

## Dimension and memory policy

The platform's final geometric ceiling is authoritative:

- `width <= 1600`
- `height <= 1200`
- `pixelCount <= 1,920,000`
- aspect ratio must satisfy the existing F05 4:3 policy

All multiplication and buffer-size calculations use checked arithmetic.

The engine must reject a candidate before full raster allocation when declared or decoded geometry violates the policy.

Initial deployed worker safety targets are explicit and conservative:

- hard worker memory ceiling: `256 MiB`;
- one in-flight decode/rewrite operation per isolated worker;
- wall-clock processing timeout: `2500 ms` per candidate;
- zero automatic retry after timeout, crash, or fatal codec error;
- the failed worker is discarded before another candidate is accepted.

These are deployment ceilings, not attacker-controlled parameters. Staging load/soak evidence may justify a reviewed configuration change before production promotion, but the candidate itself can never raise them.

A timeout, crash, resource-limit breach, or malformed native-codec response is converted into one stable fail-closed engine-unavailable error at the F05 boundary.

## Decoder isolation

The recommended implementation is a mature native image backend such as a pinned Sharp/libvips adapter behind a narrow worker boundary, not a hand-written JPEG/WebP decoder in application JavaScript.

The native codec boundary must be isolated from the request handler so codec failure does not corrupt application state.

Required runtime properties for the worker execution tier:

- bytes are passed as memory buffers, never request-supplied file paths;
- no request-driven filesystem path access;
- no request-driven network access;
- no shell or child-process invocation from image data;
- no dynamic plugin selection from untrusted input;
- pinned backend and version metadata;
- explicit timeout and termination path;
- worker replacement after crash or fatal codec error.

A WASI/Wuffs/Rust implementation may be evaluated later as a higher-isolation codec tier, but it is not required for this V2 engine contract and must not create a second authority.

## Parser/decoder disagreement rule

Preflight facts and decoder facts are independently derived.

The candidate is rejected if they disagree on any security-relevant property, including:

- format;
- width;
- height;
- still-image status;
- container completeness;
- supported color interpretation where applicable.

`disagreement = reject`; there is no repair fallback.

## Canonical rasterization

The decode stage yields only pixel content and minimal geometry/color facts required for normalization.

The canonical rewrite path intentionally discards all source metadata surfaces, including where present:

- EXIF;
- GPS;
- XMP;
- MakerNotes;
- comments;
- source software identifiers;
- timestamps;
- arbitrary application markers;
- source ICC payload after color conversion.

The output encoder must not re-emit source metadata.

## Color normalization

The normalized raster is converted into the platform canonical color space: sRGB.

Rules:

- source color information may be consumed only inside the isolated codec worker as necessary to correctly transform pixels;
- malformed or unsupported color-profile state fails closed if correct normalization cannot be proven;
- source ICC/profile bytes are not copied into output as attacker-controlled metadata;
- the post-encode re-inspection must prove the final output satisfies the canonical sRGB policy expected by F05.

## Aspect-ratio enforcement

The existing platform geometry policy remains authoritative.

The engine validates the actual decoded pixel dimensions, not only header claims.

No automatic crop, pad, stretch, or repair is performed by this server engine to force 4:3. A candidate that does not meet the accepted geometry contract fails closed.

## Canonical profile selection

Profile selection is derived from the structurally verified byte family, never from extension or HTTP MIME:

- verified JPEG -> `Canonical JPEG V1`;
- verified WebP -> `Canonical WebP V1`.

The caller policy may deny one of the two allowed families, but it may not reinterpret JPEG bytes as WebP or vice versa and may not introduce any third format.

## Canonical JPEG V1

V1 is fixed as:

- format: JPEG;
- quality: `88`;
- chroma subsampling: `4:2:0`;
- progressive: `false`;
- optimized entropy coding: `true` when supported by the pinned backend without changing the profile contract;
- metadata: disabled;
- canonical raster input: sRGB;
- source comments/software markers/timestamps: never copied;
- alpha: not applicable;
- backend and exact backend version: recorded in external attestation, not image metadata.

A backend that cannot implement these V1 semantics must fail startup/configuration validation rather than silently weakening the profile.

## Canonical WebP V1

V1 is fixed as:

- format: WebP still image;
- lossless: `false`;
- near-lossless: `false`;
- quality: `86`;
- alpha quality: `100` when alpha exists;
- smart subsampling: `true` when supported by the pinned backend;
- encoding effort: `4` when supported by the pinned backend;
- animation: disabled;
- metadata: disabled;
- canonical raster input: sRGB;
- backend and exact backend version: recorded in external attestation, not image metadata.

A backend that cannot implement the mandatory V1 semantics must fail startup/configuration validation. Optional backend optimizations may be disabled if their cross-version semantics are not stable enough for V1.

## Reproducibility rule

The engine does not promise byte-for-byte identity across different codec versions, CPU architectures, or future profiles.

Reproducibility is defined within one pinned canonical profile, backend version, and supported runtime architecture.

Future codec changes require a new explicit profile version rather than silently changing V1 behavior.

## Blind second-pass validation

Canonical output is treated as untrusted again.

The second pass must not reuse trusted flags from the first decode. It receives only the encoded output bytes and the expected canonical profile. It runs from fresh validation state; a fresh worker instance may be used where the implementation plan determines the isolation cost is justified.

It repeats the relevant structural and decode validations and proves:

- output format equals the selected canonical profile;
- still image only;
- width/height exactly equal normalized raster geometry;
- pixel count remains within policy;
- 4:3 policy still holds;
- no forbidden metadata surface is present;
- canonical sRGB policy holds;
- no trailing polyglot payload exists;
- the output can be decoded successfully by the trusted backend.

Failure of second-pass validation discards the output and fails closed.

## Cryptographic attestation

The security-critical path produces two cryptographic digests:

1. `objectSha256`: SHA-256 of final canonical encoded bytes.
2. `pixelSha256`: SHA-256 of a versioned normalized raster byte representation before encoding.

The normalized raster hash input is itself canonicalized: schema/version tag + width + height + channel layout + row-major pixel bytes. This prevents ambiguity between different raster layouts that happen to share raw byte sequences.

These digests serve different purposes:

- object hash attests exact stored/transmitted bytes;
- pixel hash distinguishes equivalent canonical raster content from codec/container byte differences.

The engine returns a frozen attestation object containing only non-secret facts such as:

- schema version;
- canonical profile;
- engine backend/version;
- width;
- height;
- output MIME;
- object SHA-256;
- pixel SHA-256;
- policy version.

Actor identity, listing identity, and audit correlation remain the responsibility of the surrounding F05 composition layer and are not embedded in image metadata.

## Perceptual hashing

`pHash`, `dHash`, or similar fingerprints are explicitly excluded from the acceptance-critical path.

They may be generated asynchronously after a trusted canonical output exists and fed into abuse/spam intelligence. Their failure must never turn a safe image into an unsafe image or vice versa.

## Error model

Externally visible errors remain deliberately coarse and stable.

Internal categories may distinguish:

- candidate_too_large;
- malformed_container;
- unsupported_format;
- animated_image;
- geometry_rejected;
- color_normalization_failed;
- decoder_timeout;
- decoder_unavailable;
- rewrite_failed;
- second_pass_failed;
- attestation_failed.

The public F05 boundary maps unexpected dependency/protocol failures to a stable fail-closed media-engine unavailable error and never exposes native codec stack traces or attacker-controlled metadata.

## Circuit isolation

The engine emits privacy-safe health counters suitable for the existing trusted circuit-policy plane.

A later deployed runtime may temporarily disable one format independently when its codec path exhibits abnormal crash, timeout, or malformed-input rates.

Example:

```text
JPEG = healthy
WebP = isolated
```

This mechanism is advisory to the already-existing trusted policy authority. The image engine itself must not accept attacker-controlled circuit commands.

## Concurrency and scaling principles

The trusted engine must be stateless between requests.

Worker concurrency is bounded; overload is handled by outer queue/backpressure rather than unbounded in-process parallelism.

The later deployed architecture is expected to separate the control plane from heavy image bytes, using quarantine/object storage plus queue-driven workers. That topology is intentionally not implemented in this engine PR.

## Security invariants

- No HEIC/HEIF decode or conversion server-side.
- No manual image repair of malformed input.
- No trust in filename extension or request MIME.
- No trust from magic bytes alone.
- No unchecked attacker-controlled allocation math.
- No animated WebP.
- No trailing polyglot bytes.
- No source metadata in canonical output.
- No source-controlled ICC payload copied into output.
- Canonical sRGB only.
- Existing 1600x1200 and 4:3 policy remains authoritative.
- JPEG remains JPEG and WebP remains WebP under V1.
- Blind re-inspection is mandatory after encoding.
- SHA-256 attestation is mandatory before trusted output is returned.
- No pHash/dHash requirement in the security acceptance path.
- No filesystem/network/shell authority derived from image bytes.
- No credentials, AWS keys, Supabase keys, Clerk secrets, or deployment configuration inside this engine module.
- No deployment or Production mutation in this change.

## Testing strategy

Use TDD with injected or isolated codec dependencies.

Required RED/GREEN contract coverage includes:

1. implementation module intentionally absent before RED proof;
2. valid canonical JPEG candidate succeeds as `Canonical JPEG V1`;
3. valid canonical WebP still image succeeds as `Canonical WebP V1`;
4. forged MIME with wrong bytes is rejected;
5. malformed JPEG marker length is rejected;
6. JPEG trailing bytes/polyglot is rejected;
7. malformed/truncated RIFF is rejected;
8. WebP RIFF declared-size mismatch is rejected;
9. `ANIM`/`ANMF` or animation feature state is rejected;
10. contradictory structural/decode facts are rejected;
11. dimension overflow and checked-arithmetic cases are rejected before large allocation;
12. width/height/pixel ceilings are enforced;
13. non-4:3 decoded geometry is rejected;
14. metadata-bearing input rewrites to output with no forbidden metadata;
15. non-sRGB input normalizes to canonical sRGB or fails closed when conversion cannot be proven;
16. decoder timeout/crash maps to stable failure and does not poison the next worker request;
17. rewrite failure returns no trusted output;
18. blind second-pass failure discards output;
19. object SHA-256 matches final bytes;
20. pixel SHA-256 matches the versioned normalized raster representation;
21. JPEG bytes cannot be switched to WebP by forged MIME or extension;
22. WebP bytes cannot be switched to JPEG by forged MIME or extension;
23. backend startup/configuration rejects inability to honor mandatory V1 profile semantics;
24. no executable server HEIC/HEIF decoder/converter is introduced;
25. source scan proves no env credential reads, shell spawning, request-driven filesystem/network path, or metadata logging primitives are introduced by the engine adapter;
26. existing F05 authorization, Clerk, ownership, and AWS binding tests remain green;
27. VVIP Quality Gate, TIGER CleanGuard, Zero-Residue Full History, and Project Control Integrity all pass on one exact final SHA.

## Non-goals

This spec does not:

- deploy the engine to AWS;
- create S3 buckets or SQS queues;
- configure production ingress;
- modify Clerk Dashboard settings;
- modify Supabase Production;
- add AWS IAM permissions;
- modify DNS or Amplify;
- implement HEIC/HEIF conversion on the server;
- implement real-device Gate B tests;
- implement pHash/dHash abuse processing;
- close F05 Gate A by itself;
- merge PR #264 to `main`.

## Integration sequence after this engine

After this engine is implemented, independently reviewed, merged into the F05 parent branch, and re-verified, Gate A continues in this order:

1. deployed ingress + reviewed Clerk authenticator composition;
2. exact request-envelope enforcement;
3. quarantine/object-storage + queue-driven processing topology;
4. durable audit/telemetry/alert/circuit-policy sinks;
5. staging runtime deployment;
6. mandatory live bypass tests from issue #240;
7. production promotion only after evidence and human approval.

Gate B real-device evidence (#241) starts only after the relevant Gate A server path is stable enough to test end-to-end.
