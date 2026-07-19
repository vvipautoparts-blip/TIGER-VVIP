# VVIP TIGER — Final Authentication Decision

Date: 2026-07-19
Status: Final owner approval

- Clerk is the only live authentication authority.
- Sign-out ends the Clerk session only.
- No user, listing, image, profile, or Supabase data is deleted.
- Google users authenticate through Google.
- Email/password users use Clerk password recovery.
- Deprecated and conflicting authentication runtime files are removed.
- Legacy experimental identities are removed from platform runtime.
- The legacy name displayed on accounts.google.com belongs to the external Google profile.
- No production deployment or SQL execution occurred.
