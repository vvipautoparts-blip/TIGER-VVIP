# VVIP TIGER Authentication System Spec

## 1) Objective
Build a full Facebook-grade authentication experience (UX + flows + security) with VVIP TIGER branding, no implementation guessing.

## 2) Required Screens
1. Splash
2. Welcome
3. Language Selection
4. Login
5. Sign Up
6. Phone Verification
7. Email Verification
8. Create Password
9. Choose Username
10. Upload Profile Image
11. Select Interests
12. Terms Consent
13. Account Completion
14. Forgot Password
15. Reset Password
16. Logout
17. Device Management
18. Two-Factor Authentication (2FA)
19. Account Lock
20. Account Recovery

## 3) UX Rules (Global)
- Primary button height: 56px
- Primary button radius: 18px
- Press state scale: 0.97
- Press animation duration: 120ms
- Double-click prevention: required
- Loading indicator appears if action exceeds 300ms
- Error state must show actionable message under field or button
- Success transitions use fade animation 250ms
- Offline retry modal required for critical auth actions

## 4) Field Behavior Rules
### Email or Phone Field
- Real-time validation while typing
- Paste sanitization and trimming
- Invalid characters blocked
- Success icon on valid input
- Error colors for invalid state
- Keyboard optimized per field type

### Password Field
- Show/Hide toggle required
- Strength meter required
- Minimum and maximum length enforced
- Weak password dictionary blocked
- Optional leaked-password check
- Clipboard policy: copy disabled, paste allowed

## 5) Forgot Password Flow (Required)
1. Enter email/phone
2. Resolve account
3. Show masked identity
4. Select recovery channel (SMS / Email / Trusted device / Support)
5. Enter OTP (6 cells, auto-advance, full paste support)
6. Create new password
7. Optional logout from all other devices

## 6) Security Requirements
- Rate limiting and lockout thresholds
- Temporary lock duration policy
- New device detection and alerts
- Trusted device remember period (30 days)
- Last login time + IP + device logging
- Session revocation from device management screen

## 7) Edge Cases (Mandatory)
- App closed mid-onboarding
- OTP expired / OTP requested too many times
- Duplicate email/phone sign-up attempts
- Blocked / inactive accounts
- Slow network and mid-upload disconnects
- Lost phone/email scenarios

## 8) Current UI Decision (Implemented)
- In public and private profiles, AI insights are opened from post three-dots menu.
- AI actions are available via dedicated AI controls, but persistent intrusive notices are avoided.

## 9) Acceptance Criteria
- Every button has defined behavior and fallback
- No dead-end button in auth flow
- No silent failures
- All state transitions (loading, success, error, offline) are defined
- Security events auditable

## 10) Implementation Notes for Developers
- Keep static multi-page architecture unless explicitly changed
- Reuse existing bilingual pattern and currentLang state
- Preserve RTL/LTR behavior and role/session rules
