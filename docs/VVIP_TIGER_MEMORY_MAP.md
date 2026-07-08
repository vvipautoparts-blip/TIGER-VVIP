# VVIP TIGER MEMORY MAP

## Official Reference Link / الربط مع الدستور الرسمي

- This file does not replace the official product constitution.
- The highest reference is [Official Product Blueprint](./VVIP_TIGER_OFFICIAL_PRODUCT_BLUEPRINT.md).
- This file preserves the decision map and the historical and execution context.
- Any new implementation should review the official blueprint first, then this map.
- [Profile Source of Truth Decision](./VVIP_TIGER_PROFILE_SOURCE_OF_TRUTH.md)

## VVIP TIGER — بدء التنفيذ النهائي بعد اعتماد الخطة الكاملة

**Session Name:** استفسارات 1/6 — 7/7/2026  
**Execution Start:** 7/7/2026  
**Project:** VVIP TIGER  
**Status:** Official execution phase after complete approval of additions  
**Rule:** This file is the official project memory map. It is not a brainstorming file.

---

## 1. الهدف الرسمي للمشروع

VVIP TIGER منصة رقمية فخمة، راقية، Mobile First، موجهة لعرض وتواصل منظم داخل قطاعات محددة.

المنصة ليست مجرد صفحات أو تجربة تقنية. الهدف هو بناء منصة احترافية عالمية بأسلوب توليد جديد، بسيطة للمستخدم، قوية للإدارة، قابلة للتوسع، وآمنة من الفوضى.

---

## 2. قرار المرحلة الحالية

انتهت مرحلة الإضافات واعتمدت كاملًا.

من هذه النقطة لا نفتح أفكار جديدة أثناء التنفيذ، ولا نعيد نقاش القرارات المعتمدة إلا إذا طلب مالك المشروع تغييرًا صريحًا.

العمل الآن يكون تنفيذًا فعليًا حسب هذا الترتيب:

1. فحص حالة المشروع Git status
2. إنشاء وتثبيت VVIP TIGER MEMORY MAP الرسمي
3. إنشاء IMPLEMENTATION_CHECKLIST.md
4. البدء بالهيكل التقني والجداول
5. التنفيذ خطوة خطوة بدون تشتيت

---

## 3. وضع المشروع الحالي عند بداية التنفيذ

- Repository path: `/workspaces/TIGER-VVIP`
- Git branch: `main`
- GitHub status: up to date with `origin/main`
- Working tree: clean
- Current project contains approved files, auth files, Supabase files, public/private profile pages, social UI files, and approved snapshots.
- There is no `docs/` folder at the beginning of this execution phase, so it is created now as the official documentation home.

---

## 4. القرارات التقنية المعتمدة

### 4.1 النظام الحالي

- GitHub is the source code repository.
- Clerk is the official authentication layer.
- Supabase is the database, profiles, storage, posts, and platform data layer.
- The current phase continues with Clerk + Supabase + GitHub.
- The system must be AWS-ready, but no full AWS migration now.
- Firebase is not the official future direction for auth.
- Manual authentication should not be rebuilt or reopened unless explicitly requested.
- Reset/password/manual auth flows are not the main direction after adopting Clerk.

### 4.2 معنى AWS-ready

AWS-ready means:

- Clean folder structure.
- Clear environment variables.
- No secrets hardcoded in files.
- Database separated from UI.
- Storage rules organized.
- Auth separated through Clerk.
- Easy future migration or expansion to AWS services if needed.

It does not mean moving the whole project to AWS now.

---

## 5. قرارات الهوية والتصميم

VVIP TIGER must look and feel:

- Premium
- VIP
- Clean
- Calm
- Not crowded
- Mobile First
- Elegant
- Modern
- Trustworthy
- Global-level
- Not experimental

The interface must avoid chaos, visual noise, and unnecessary buttons.

The first user experience must feel like a private, high-value platform, not a normal public marketplace.

No external provider branding should be shown to the user unless technically required and unavoidable.

---

## 6. صفحات وتجربة المستخدم المعتمدة

### 6.1 الصفحات الأساسية

The project already includes:

- `index.html`
- `private-profile.html`
- `public-profile.html`
- `clerk-test.html`
- `clerk-private-profile.html`
- `auth-flow.html`
- `reset-password.html`
- policy pages

The intended product flow includes:

- Public/general feed experience.
- Private profile page.
- Public profile page.
- Account/auth flow through Clerk.
- User profile linked to Supabase.

### 6.2 منطق الصفحات حسب الرؤية

- Page 3: public/general feed style.
- Page 4: private profile style.
- The user wants the final experience to feel close to the simplicity and familiarity of major social platforms, but with VVIP TIGER luxury identity.

---

## 7. قرارات التسجيل والدخول

### 7.1 Clerk

Clerk is officially adopted for:

- Login
- Create account
- Logout
- Forgot password
- User management
- Google login
- Facebook login if enabled/available
- Email login

### 7.2 Supabase profile link

After Clerk creates/identifies the user, the platform must link that identity to a Supabase profile.

The future model:

- Clerk user = identity/auth account
- Supabase profile = platform profile and business data
- Supabase stores sector, profile details, posts, account status, images, reports, and platform records

### 7.3 Support rule

Support/admin users must never see user passwords.

Support may see:

- Account status
- Verification status
- Profile status
- Subscription/free period status
- Ticket/support history
- Admin notes where permitted

---

## 8. القطاعات المعتمدة من البداية

The platform starts with three sectors:

1. Auto parts and car services
2. Materials and supplies
3. Real estate

The user should be able to search and communicate across sectors without requiring a new subscription for every sector, according to the adopted platform direction.

---

## 9. قواعد المنشورات والمحتوى

### 9.1 Posting limits

- Maximum 4 posts per week per account.
- Maximum 7 images per post.
- Price is required.
- Price must be greater than 0.
- No video uploads.
- No video feature in the final adopted scope.

### 9.2 Image rules

- Images only.
- Fixed-size image flow.
- User can upload or use camera.
- User can crop/adjust inside a fixed frame.
- The platform saves only the cropped/compressed image.
- The original image should not remain as the final stored public asset.
- Images should be optimized for mobile speed and storage control.

### 9.3 Auto deletion

- Posts/content are automatically deleted after 120 days according to the adopted rule.
- This rule is fixed unless the owner explicitly changes it.

---

## 10. الدور القانوني والتشغيلي للمنصة

VVIP TIGER is a display and communication platform.

The platform is not a party to:

- Buying
- Selling
- Payments
- Delivery
- Guarantees between users
- Direct agreements between users
- External contracts

The platform organizes display, search, account status, communication, moderation, and admin workflow.

---

## 11. الإدارة والصلاحيات

### 11.1 Roles from day one

Roles and permissions must exist from the beginning, not as a later patch.

Expected roles include:

- Owner / Super Admin
- Platform Admin
- Sector Manager
- Support / Tiger Care Team
- Moderator
- Regular User
- Business/User Account types if needed by implementation

### 11.2 Admin by sector

Administration must support separation by sector:

- Auto parts/car services admin scope
- Materials/supplies admin scope
- Real estate admin scope

Each sector may have its own management, reports, review queues, and escalation.

### 11.3 Admin logs

Admin and security activity logs are required from the start.

Logs should cover important actions such as:

- Login/account status changes
- Profile approval/rejection
- Post approval/rejection
- Admin notes
- Escalations
- Ticket status changes
- Security-sensitive actions

---

## 12. Tiger Care Contact Request

Tiger Care Contact Request / طلب تواصل رسمي مع إدارة VVIP TIGER is officially adopted as a core customer/admin communication module.

Users must not see direct phone numbers for management, leaders, or admin.

Instead, users submit structured requests inside the platform through a controlled flow such as form/chat/ticket.

The request is routed by:

- Request type
- Sector
- Priority
- Responsible team
- Account/user
- Status

The user receives in-app confirmation and email confirmation:

"تم استلام طلبك، وسيتم التواصل معك خلال 24 ساعة."

The module connects to:

- Tiger Care Dashboard
- Support tickets
- Escalation to sector managers/admin
- Internal notes
- Ticket statuses
- SLA tracking
- Reports

Purpose:

- Protect management from random calls
- Give users premium and documented communication
- Keep every request trackable
- Build professional trust

---

## 13. الحسابات والاشتراك

Adopted business rules:

- One account per user as the base rule.
- Free period: 4 months per user.
- Subscription comes later.
- The system should be prepared for account status and subscription status even if payment is not implemented now.
- No payment execution is required in the current early implementation unless explicitly started later.

---

## 14. تقارير الإدارة الأولية

Initial admin reports should prepare for:

- Number of users
- New accounts
- Active accounts
- Posts by sector
- Posts pending review
- Expiring posts
- Deleted/expired posts
- Contact requests
- SLA status
- Support workload
- Abuse/violation signals
- Admin activity

Reports should be simple at first, then expandable.

---

## 15. مكافحة الفوضى Anti-Chaos Rules

The platform must prevent chaos through:

- Posting limits
- Required price
- Fixed image count
- No video
- Auto deletion after 120 days
- Sector separation
- Admin roles
- Moderation/review ability
- Logs
- Ticket routing
- Clear account status
- Clean mobile UI
- No random direct management phone calls

---

## 16. الأمن والبيانات

Security principles:

- No secret keys in public files.
- No Supabase service role key in frontend.
- No private keys in GitHub.
- Environment variables must be used for secrets.
- Public anon keys may exist only where technically safe.
- Row Level Security must be respected in Supabase.
- Admin operations must be separated from normal user operations.
- User data must not be exposed unnecessarily.
- File uploads must be controlled by type, size, path, and ownership.

---

## 17. الملفات الحالية المهمة في المشروع

Current important files include:

- `index.html`
- `private-profile.html`
- `public-profile.html`
- `styles.css`
- `enhanced-components.css`
- `social-ui.js`
- `auth.js`
- `auth-supabase.js`
- `auth-clerk-index.js`
- `scripts/supabase-config.js`
- `scripts/supabase-auth-bridge.js`
- `scripts/require-auth.js`
- `scripts/profile-loader.js`
- `supabase-schema.sql`
- `supabase/migrations`
- `approved/`
- Existing setup and QA documentation files

These must not be deleted or broken during the execution phase without a clear reason and Git checkpoint.

---

## 18. قاعدة العمل مع الذكاء الاصطناعي داخل VS Code

AI inside VS Code may be used for:

- Formatting files
- Suggesting code
- Explaining errors
- Helping generate repetitive structure
- Reviewing simple syntax

AI inside VS Code must not be used to:

- Change approved decisions
- Invent a new architecture
- Replace this memory map
- Remove security rules
- Reopen Firebase/manual auth decisions
- Add video
- Add chaos or unnecessary features
- Modify secrets or expose keys

The project decisions come from this MEMORY MAP and the owner-approved plan.

---

## 19. أسلوب العمل مع مالك المشروع

The owner is not treated as a programmer.

Execution style must be:

- Arabic explanation
- One command at a time when possible
- Clear location for every command
- Clear expected result
- Verify before moving to next step
- No hidden assumptions
- No long unexplained technical jumps
- No deleting files without backup/checkpoint
- No reopening approved decisions unless owner requests

---

## 20. Git workflow

Before changes:

- Check `pwd`
- Check `git status`
- Confirm branch
- Confirm working tree state

After important changes:

- Recheck `git status`
- Review changed files
- Commit only after confirming the content is correct
- Commit messages should be clear and professional

Recommended commit style:

- `docs: add official VVIP TIGER memory map`
- `docs: add implementation checklist`
- `db: add initial platform schema`
- `auth: link Clerk identity to Supabase profiles`
- `ui: refine mobile-first profile experience`

---

## 21. التنفيذ القادم بعد هذا الملف

After this memory map, the next official file is:

`IMPLEMENTATION_CHECKLIST.md`

It should divide work into clear phases:

1. Documentation lock
2. Current project audit
3. Auth decision cleanup
4. Supabase schema planning
5. Clerk-to-Supabase profile link
6. Sectors tables
7. Posts/images tables
8. Tiger Care tickets
9. Roles and permissions
10. Admin reports
11. Mobile-first UI polishing
12. QA and deployment readiness

---

## 22. قرارات لا يعاد فتحها إلا بطلب صريح

Do not reopen these unless the owner explicitly requests:

- Clerk is the official auth layer.
- Supabase is the platform data/storage layer.
- GitHub remains source control.
- AWS-ready, but no full AWS migration now.
- No video.
- Images only.
- 7 images max per post.
- 4 posts per week.
- Auto delete after 120 days.
- Three sectors from start.
- Tiger Care Contact Request is core.
- No direct management phone numbers to users.
- The platform is not party to sales/payments/delivery/contracts.
- Execution phase now, not new ideas phase.

---

## 23. الخلاصة الرسمية

VVIP TIGER is now in final execution mode.

The project must move forward with discipline, luxury identity, Mobile First thinking, clean architecture, Clerk + Supabase + GitHub now, AWS-ready structure, and no distraction.

This MEMORY MAP is the official reference for future implementation.
