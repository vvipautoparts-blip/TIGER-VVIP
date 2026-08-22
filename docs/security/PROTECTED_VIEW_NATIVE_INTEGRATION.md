# Protected View Native Integration

**Status:** implementation guidance for platform adapters.  
**Scope:** OWNER, FINANCIAL and DISCLOSURE protected surfaces.  
**Authority:** the JavaScript policy returns a decision and adapter requirements; it does not pretend a web page can invoke operating-system security primitives by itself.

## Core rule

Protected views are short-lived, strictly authorized surfaces. A protected view is not a promise that pixels can never be copied. It combines authorization, integrity evidence, capture-risk reaction, redaction, watermarking, short lease lifetimes and native controls where the operating system provides them.

The canonical policy decisions are:

- `ALLOW`
- `REDACT`
- `REQUIRE_STEP_UP`
- `REVOKE_VIEW`

High-risk screens fail closed when authorization is invalid, integrity fails, capture becomes active or other trusted signals require stronger verification.

## Android native adapter

For Android-native protected surfaces, the adapter must treat the policy output as an instruction to configure the actual Android window/surface. The web policy itself does not call Android APIs.

Required native measures include:

- use a secure surface / `FLAG_SECURE` for protected activities or windows where supported and appropriate;
- obtain Play Integrity evidence for server-sensitive actions and evaluate it on a trusted backend rather than trusting a client boolean;
- consume app-access-risk signals when the selected Play Integrity integration provides them and apply server/policy decisions to suspicious overlay, control or capture conditions;
- redact or replace protected content in the app-switcher / recent-apps representation where the application framework permits it;
- revoke or recreate the protected view when authorization or integrity state changes rather than leaving stale pixels indefinitely accessible;
- keep protected-view leases short-lived and bound to the authenticated subject, action and resource scope.

`FLAG_SECURE` reduces ordinary screenshot/screen-recording exposure on supported Android paths. It is defense in depth, not a universal anti-exfiltration guarantee.

## Apple native adapter

For Apple-native protected surfaces, there is no claim that iOS provides a general-purpose equivalent of Android `FLAG_SECURE` for every application surface. The adapter must therefore use the platform mechanisms that actually exist and react to capture state.

Required native measures include:

- observe capture state and redact, pause or revoke protected content when screen capture/mirroring is active according to policy;
- process the platform screenshot event for auditing or user-safety reactions where appropriate, understanding that the notification is not a mechanism that retroactively prevents the screenshot;
- use App Attest for server-sensitive actions where applicable, with validation on a trusted server;
- apply app-switcher redaction / privacy-cover behavior for sensitive screens using the application's lifecycle hooks;
- use short-lived authorization and protected-view leases instead of treating a successful login as permanent authority;
- re-evaluate authorization after foreground/background transitions when the protected resource is high risk.

Apple capture-state and screenshot-event mechanisms are signals. They do not prove that no image was ever captured.

## Web runtime

The web runtime cannot truthfully offer the same capture controls as a native secure window. Web requirements are therefore deliberately different:

- no client secret, owner approval secret, payment secret or reusable bypass credential may be embedded in HTML, JavaScript, storage or delivered view data;
- use strict authorization on the trusted server before returning protected data;
- use short-lived protected views and short-lived leases;
- watermark protected renderings where appropriate so leaked material has useful provenance without pretending the watermark is unremovable;
- redact high-risk fields when capture/integrity signals or authorization state require it;
- minimize protected data sent to the client and do not preload hidden confidential material merely because CSS hides it;
- invalidate/re-fetch protected data when authorization expires rather than keeping a long-lived client cache;
- apply normal browser hardening such as CSP and secure transport, while recognizing these controls do not create a native anti-capture boundary.

## Physical-camera limit

Preventing capture by a physical camera pointed at a display is impossible for software to guarantee. A native app, browser, DRM layer or JavaScript policy cannot prevent a separate physical camera from photographing visible pixels. The architecture must never advertise an absolute “cannot be photographed” or “cannot be copied” property.

The correct claim is narrower: the platform can reduce ordinary digital capture paths, detect or react to some capture/integrity risks, redact protected material, shorten exposure duration, watermark content, and revoke access when trusted policy signals require it.

## Trust boundary

Signals generated on an untrusted client are inputs, not final authority. Server-sensitive disclosure and financial actions must be re-authorized by trusted services using identity, scope, freshness, integrity evidence and applicable policy. Native attestation results must be validated server-side before they can influence authoritative state.

## Integration invariant

```text
WEB_POLICY_DECIDES=true
WEB_POLICY_CALLS_NATIVE_SECURITY_APIS=false
ANDROID_SECURE_SURFACE_ADAPTER_REQUIRED_FOR_HIGH_RISK=true
APPLE_CAPTURE_STATE_ADAPTER_REQUIRED_FOR_HIGH_RISK=true
SERVER_AUTHORIZATION_REMAINS_AUTHORITATIVE=true
PHYSICAL_CAMERA_PREVENTION_GUARANTEE=false
```
