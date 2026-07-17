# MASTER TEST AND ACCEPTANCE PLAN

This master plan consolidates the owner-facing test and acceptance scope. It is documentation only and does not authorize production release.

## Coverage Summary

- Clerk login.
- Google sign-in.
- Forgot password.
- Sign-out.
- Public and private profile.
- Account types.
- Business verification.
- Listing creation.
- Mandatory fields.
- Price greater than zero.
- Seven-image maximum.
- Image crop/zoom/rotate/reorder/cover.
- Four listings per week.
- 120-day lifecycle.
- Search and filters.
- RTL Arabic.
- English.
- Android.
- iPhone.
- Web/PWA.
- Private one-to-one messaging.
- No groups or broadcast.
- Twenty-invite session limit.
- Tiger Care 24-hour message.
- Reporting and moderation.
- Role permissions.
- Access denied.
- RLS future validation.
- Conversation 90-day retention.
- Account deletion 30-day grace.
- No commission.
- No in-platform payment.
- Platform liability disclaimer.
- Accessibility.
- Performance.
- Security.
- Privacy.
- Store readiness.
- Controlled launch.
- Rollback and incident response.

## Acceptance Matrix

| Test ID | Preconditions | Steps | Expected result | Evidence required | Responsible role | Blocking? |
| --- | --- | --- | --- | --- | --- | --- |
| T-001 | Clerk account exists | Sign in with email | User enters authenticated state | Screenshot + log | Owner/Admin | Blocking |
| T-002 | Google enabled | Sign in with Google | Google auth completes | Screenshot + log | Owner/Admin | Blocking |
| T-003 | User signed in | Use forgot password | Reset flow starts | Screenshot | Owner/Admin | Blocking |
| T-004 | User signed in | Sign out | Session ends cleanly | Screenshot | Owner/Admin | Blocking |
| T-005 | Profile exists | Open public/private profile | Correct profile content shown | Screenshot | Product owner | Blocking |
| T-006 | Account type selected | Inspect account type display | Type matches profile policy | Screenshot | Owner/Admin | Blocking |
| T-007 | Business account | Start verification flow | Verification prompts appear | Screenshot + evidence list | Verification reviewer | Blocking |
| T-008 | Seller account | Create listing | Listing form opens and validates | Screen recording | Seller or owner | Blocking |
| T-009 | Listing form | Leave required fields blank | Validation blocks submit | Screenshot | Seller or owner | Blocking |
| T-010 | Listing form | Enter zero price | Validation rejects price | Screenshot | Seller or owner | Blocking |
| T-011 | Listing form | Add more than seven images | Limit is enforced | Screen recording | Seller or owner | Blocking |
| T-012 | Image editor ready | Crop/zoom/rotate/reorder/set cover | Edited image saves correctly | Screen recording | Seller or owner | Blocking |
| T-013 | Posting limit active | Submit 5th listing in a week | Limit is blocked | Screenshot | Seller or owner | Blocking |
| T-014 | Existing listing | Check lifecycle timing | 120-day lifecycle is represented | Evidence log | Product owner | Non-blocking |
| T-015 | Search data exists | Search by sector/category/price/location | Relevant results returned | Screenshot | Any user | Blocking |
| T-016 | Arabic UI | Open RTL surface | RTL is correct | Screenshot | QA/Owner | Blocking |
| T-017 | English UI | Switch to English | LTR is correct | Screenshot | QA/Owner | Blocking |
| T-018 | Android device | Open Android build | Responsive flow works | Device recording | QA | Blocking |
| T-019 | iPhone device | Open iPhone build | Responsive flow works | Device recording | QA | Blocking |
| T-020 | Web/PWA build | Open web/PWA | Web flow works | Screenshot | QA | Blocking |
| T-021 | Private communication enabled | Send one-to-one message | Message sends privately | Screen recording | Buyer/Seller | Blocking |
| T-022 | Friend flow ready | Send friend request | Friend request sent copy appears | Screenshot | Buyer/Seller | Blocking |
| T-023 | Invite limit active | Send 21st invite | Session limit is blocked | Screenshot | Buyer/Seller | Blocking |
| T-024 | Tiger Care form ready | Submit Tiger Care request | 24-hour acknowledgement shows | Screenshot | Any user | Blocking |
| T-025 | Report available | Submit moderation report | Report enters queue | Screenshot | Any user | Blocking |
| T-026 | Restricted user tries action | Open forbidden route | Access denied shown | Screenshot | QA | Blocking |
| T-027 | Role policy loaded | Validate role action | Allowed role action works | Screenshot | Admin/owner | Blocking |
| T-028 | Future RLS checklist ready | Review planned access rules | RLS validation is documented | Review note | Owner/Admin | Non-blocking |
| T-029 | Message history exists | Check retention note | 90-day retention rule is shown | Screenshot | Owner/QA | Non-blocking |
| T-030 | Deletion flow ready | Submit delete request | 30-day grace is shown | Screenshot | Owner/QA | Blocking |
| T-031 | Pricing policy loaded | Check commission copy | 0% commission is shown | Screenshot | Owner/QA | Non-blocking |
| T-032 | Payment boundary copy | Check payment policy | No in-platform payment is shown | Screenshot | Owner/QA | Non-blocking |
| T-033 | Liability copy loaded | Check disclaimer | Platform liability boundary is visible | Screenshot | Owner/QA | Non-blocking |
| T-034 | Accessibility checklist ready | Review accessibility | Accessibility criteria are met | Audit note | QA | Non-blocking |
| T-035 | Performance checklist ready | Review performance | Performance criteria are defined | Audit note | QA | Non-blocking |
| T-036 | Security checklist ready | Review security | Security criteria are defined | Audit note | Security owner | Non-blocking |
| T-037 | Privacy checklist ready | Review privacy | Privacy criteria are defined | Audit note | Legal/owner | Blocking |
| T-038 | Store readiness plan ready | Review store items | Store readiness is documented | Audit note | Product owner | Non-blocking |
| T-039 | Controlled launch plan ready | Review Jordan plan | Go/No-Go and incident controls exist | Audit note | Owner/ops | Blocking |
| T-040 | Rollback plan ready | Simulate rollback | Rollback path is documented | Drill note | Ops/security | Blocking |

## Acceptance Rule

- A test is accepted only when the expected result is met and evidence is recorded.
- Blocking tests must be green before owner review progresses.
- Non-blocking items may be tracked for follow-up if documented clearly.
