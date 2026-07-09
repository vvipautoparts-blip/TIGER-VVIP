# VVIP TIGER — Page Flow & User Journey Audit

## Purpose

This audit reviews the visible user journey across public pages, login entry points, private profile access, return navigation, and logout controls.

This audit is documentation-only. It does not modify backend logic, authentication logic, Supabase, RPC, RLS, payments, or security rules.

## Target User Journey

1. Public page
2. Login / sign-in entry
3. Private profile
4. Return to home/public page
5. Logout / sign-out

## Expected Pages

- `index.html` — Found
- `public-profile.html` — Found
- `clerk-private-profile.html` — Found
- `private-profile.html` — Found
- `clerk-test.html` — Found
- `reset-password.html` — Found

## Page Signals

### `auth-flow.html`
- has_clerk: `False`
- has_supabase_reference: `False`
- has_safe_ux_guard: `True`
- has_visual_trust_css: `True`
- has_profile_ux_class: `False`
- has_public_profile_class: `False`
- has_private_profile_class: `False`

### `clerk-private-profile.html`
- has_clerk: `True`
- has_supabase_reference: `True`
- has_safe_ux_guard: `True`
- has_visual_trust_css: `True`
- has_profile_ux_class: `True`
- has_public_profile_class: `False`
- has_private_profile_class: `True`

### `clerk-test.html`
- has_clerk: `True`
- has_supabase_reference: `False`
- has_safe_ux_guard: `True`
- has_visual_trust_css: `True`
- has_profile_ux_class: `False`
- has_public_profile_class: `False`
- has_private_profile_class: `False`

### `data-deletion.html`
- has_clerk: `False`
- has_supabase_reference: `False`
- has_safe_ux_guard: `True`
- has_visual_trust_css: `True`
- has_profile_ux_class: `False`
- has_public_profile_class: `False`
- has_private_profile_class: `False`

### `index.html`
- has_clerk: `True`
- has_supabase_reference: `False`
- has_safe_ux_guard: `True`
- has_visual_trust_css: `True`
- has_profile_ux_class: `False`
- has_public_profile_class: `False`
- has_private_profile_class: `False`

### `privacy-policy.html`
- has_clerk: `False`
- has_supabase_reference: `False`
- has_safe_ux_guard: `True`
- has_visual_trust_css: `True`
- has_profile_ux_class: `False`
- has_public_profile_class: `False`
- has_private_profile_class: `False`

### `private-profile.html`
- has_clerk: `True`
- has_supabase_reference: `False`
- has_safe_ux_guard: `True`
- has_visual_trust_css: `True`
- has_profile_ux_class: `True`
- has_public_profile_class: `False`
- has_private_profile_class: `True`

### `public-profile.html`
- has_clerk: `True`
- has_supabase_reference: `False`
- has_safe_ux_guard: `True`
- has_visual_trust_css: `True`
- has_profile_ux_class: `True`
- has_public_profile_class: `True`
- has_private_profile_class: `False`

### `reset-password.html`
- has_clerk: `False`
- has_supabase_reference: `False`
- has_safe_ux_guard: `True`
- has_visual_trust_css: `True`
- has_profile_ux_class: `False`
- has_public_profile_class: `False`
- has_private_profile_class: `False`

### `terms-of-service.html`
- has_clerk: `False`
- has_supabase_reference: `False`
- has_safe_ux_guard: `True`
- has_visual_trust_css: `True`
- has_profile_ux_class: `False`
- has_public_profile_class: `False`
- has_private_profile_class: `False`

## Journey Signal Map

- `auth-flow.html` — `back_home`
- `auth-flow.html` — `public_entry`
- `clerk-private-profile.html` — `back_home`
- `clerk-private-profile.html` — `login_entry`
- `clerk-private-profile.html` — `logout`
- `clerk-private-profile.html` — `private_profile`
- `clerk-private-profile.html` — `public_entry`
- `clerk-test.html` — `back_home`
- `clerk-test.html` — `login_entry`
- `clerk-test.html` — `logout`
- `clerk-test.html` — `private_profile`
- `data-deletion.html` — `back_home`
- `data-deletion.html` — `private_profile`
- `index.html` — `back_home`
- `index.html` — `login_entry`
- `index.html` — `logout`
- `index.html` — `private_profile`
- `index.html` — `public_entry`
- `privacy-policy.html` — `back_home`
- `privacy-policy.html` — `login_entry`
- `private-profile.html` — `back_home`
- `private-profile.html` — `login_entry`
- `private-profile.html` — `private_profile`
- `public-profile.html` — `back_home`
- `public-profile.html` — `login_entry`
- `public-profile.html` — `private_profile`
- `public-profile.html` — `public_entry`
- `reset-password.html` — `back_home`
- `reset-password.html` — `login_entry`
- `reset-password.html` — `public_entry`
- `terms-of-service.html` — `back_home`
- `terms-of-service.html` — `login_entry`

## Links Overview

- `clerk-private-profile.html:1490` — `العودة لصفحة الدخول` → `index.html`
- `clerk-private-profile.html:1491` — `متابعة إلى الصفحة العامة` → `public-profile.html`
- `clerk-private-profile.html:1493` — `طلب مساعدة عبر Tiger Care` → `public-profile.html`
- `clerk-private-profile.html:1534` — `العودة لصفحة الدخول` → `index.html`
- `clerk-private-profile.html:1535` — `متابعة إلى الصفحة العامة` → `public-profile.html`
- `clerk-private-profile.html:1537` — `طلب مساعدة عبر Tiger Care` → `public-profile.html`
- `clerk-private-profile.html:1911` — `متابعة إلى الصفحة العامة` → `public-profile.html`
- `clerk-private-profile.html:1912` — `العودة إلى الدخول` → `index.html`
- `clerk-test.html:192` — `فتح البروفايل الخاص` → `clerk-private-profile.html`
- `index.html:92` — `هل نسيت كلمة المرور؟` → `reset-password.html`
- `index.html:133` — `(no label)` → `index.html`
- `index.html:134` — `(no label)` → `public-profile.html`
- `index.html:135` — `(no label)` → `clerk-private-profile.html`
- `index.html:136` — `(no label)` → `reset-password.html`
- `index.html:147` — `الشروط` → `terms-of-service.html`
- `index.html:148` — `الخصوصية` → `privacy-policy.html`
- `index.html:149` — `حذف البيانات` → `data-deletion.html`
- `private-profile.html:92` — `فتح البروفايل الرسمي الآن` → `clerk-private-profile.html`
- `public-profile.html:700` — `🏠` → `public-profile.html`
- `public-profile.html:709` — `👤` → `clerk-private-profile.html`
- `public-profile.html:937` — `البروفايل` → `clerk-private-profile.html`
- `public-profile.html:960` — `AJ` → `clerk-private-profile.html`
- `public-profile.html:1155` — `🏠 الرئيسية` → `public-profile.html`
- `public-profile.html:1159` — `👤 بروفايل` → `clerk-private-profile.html`
- `reset-password.html:40` — `العودة لصفحة الدخول` → `index.html`

## Buttons Overview

- `clerk-private-profile.html:1492` — `إعادة المحاولة` — type `button` — hook `retry-profile-btn`
- `clerk-private-profile.html:1536` — `إعادة المحاولة` — type `button` — hook `retry-profile-btn`
- `clerk-private-profile.html:1893` — `إرسال طلب تواصل رسمي` — type `submit` — hook `(no hook)`
- `clerk-private-profile.html:1913` — `تسجيل الخروج` — type `button` — hook `sign-out-btn`
- `clerk-test.html:193` — `تسجيل الخروج` — type `button` — hook `sign-out-btn`
- `index.html:38` — `العربية` — type `button` — hook `(no hook)`
- `index.html:39` — `English` — type `button` — hook `(no hook)`
- `index.html:89` — `تسجيل الدخول` — type `button` — hook `email-login-btn`
- `index.html:99` — `Google` — type `button` — hook `google-btn`
- `index.html:108` — `Facebook` — type `button` — hook `facebook-btn`
- `index.html:122` — `متابعة إلى الصفحة العامة` — type `button` — hook `continue-public-btn`
- `index.html:124` — `U` — type `button` — hook `avatar-fallback`
- `index.html:127` — `تسجيل الخروج` — type `button` — hook `logout-btn`
- `index.html:160` — `فهمت` — type `button` — hook `close-verification`
- `index.html:170` — `تسجيل الخروج` — type `button` — hook `confirm-logout-btn`
- `index.html:171` — `إلغاء` — type `button` — hook `cancel-logout-btn`
- `public-profile.html:701` — `🎥` — type `button` — hook `desktop-nav-video`
- `public-profile.html:702` — `👥` — type `button` — hook `desktop-nav-members`
- `public-profile.html:703` — `💼` — type `button` — hook `desktop-nav-shortcuts`
- `public-profile.html:704` — `✨` — type `button` — hook `desktop-nav-ai`
- `public-profile.html:707` — `🔔` — type `button` — hook `desktop-notifications-btn`
- `public-profile.html:708` — `💬` — type `button` — hook `desktop-messages-btn`
- `public-profile.html:713` — `الكل` — type `button` — hook `public-profile-control-1`
- `public-profile.html:714` — `المتابعين` — type `button` — hook `public-profile-control-2`
- `public-profile.html:715` — `فيديو` — type `button` — hook `public-profile-control-3`
- `public-profile.html:716` — `صور` — type `button` — hook `public-profile-control-4`
- `public-profile.html:717` — `فعاليات` — type `button` — hook `public-profile-control-5`
- `public-profile.html:726` — `عرض الكل` — type `button` — hook `desktop-members-view-all`
- `public-profile.html:769` — `الأرشيف` — type `button` — hook `desktop-stories-archive`
- `public-profile.html:831` — `📷 صورة` — type `button` — hook `desktop-compose-photo`
- `public-profile.html:832` — `🎥 فيديو` — type `button` — hook `desktop-compose-video`
- `public-profile.html:833` — `✨ AI` — type `button` — hook `desktop-compose-ai`
- `public-profile.html:834` — `نشر الآن` — type `button` — hook `desktop-compose-publish`
- `public-profile.html:848` — `⋯` — type `button` — hook `(no hook)`
- `public-profile.html:853` — `👍 0` — type `button` — hook `(no hook)`
- `public-profile.html:854` — `💬 0` — type `button` — hook `(no hook)`
- `public-profile.html:855` — `↗ 0` — type `button` — hook `(no hook)`
- `public-profile.html:860` — `إرسال` — type `button` — hook `(no hook)`
- `public-profile.html:874` — `⋯` — type `button` — hook `(no hook)`
- `public-profile.html:878` — `👍 متابعة` — type `button` — hook `(no hook)`
- `public-profile.html:879` — `💬 0` — type `button` — hook `(no hook)`
- `public-profile.html:880` — `🔖 حفظ` — type `button` — hook `(no hook)`
- `public-profile.html:885` — `إرسال` — type `button` — hook `(no hook)`
- `public-profile.html:896` — `إدارة` — type `button` — hook `desktop-shortcuts-manage`
- `public-profile.html:899` — `📦 عروض اليوم` — type `button` — hook `(no hook)`
- `public-profile.html:900` — `🚚 حالة الشحن` — type `button` — hook `(no hook)`
- `public-profile.html:901` — `🛡 مجتمع الثقة` — type `button` — hook `(no hook)`
- `public-profile.html:902` — `⭐ ملفات VIP` — type `button` — hook `(no hook)`
- `public-profile.html:928` — `الرئيسية` — type `button` — hook `(no hook)`
- `public-profile.html:931` — `مقاطع الفيديو` — type `button` — hook `(no hook)`
- `public-profile.html:934` — `السوق` — type `button` — hook `(no hook)`
- `public-profile.html:942` — `✦` — type `button` — hook `ai-assistant-trigger`
- `public-profile.html:943` — `☰` — type `button` — hook `public-menu-btn`
- `public-profile.html:946` — `AI` — type `button` — hook `ai-search-trigger`
- `public-profile.html:948` — `الكل` — type `button` — hook `(no hook)`
- `public-profile.html:949` — `المتابعون` — type `button` — hook `(no hook)`
- `public-profile.html:950` — `فيديو` — type `button` — hook `(no hook)`
- `public-profile.html:951` — `صور` — type `button` — hook `(no hook)`
- `public-profile.html:961` — `بم تفكر؟` — type `button` — hook `open-composer`
- `public-profile.html:964` — `🎬 ريل` — type `button` — hook `(no hook)`
- `public-profile.html:967` — `📷 صورة/فيديو` — type `button` — hook `(no hook)`
- `public-profile.html:970` — `✦ AI` — type `button` — hook `composer-ai-trigger`
- `public-profile.html:973` — `🖼` — type `button` — hook `(no hook)`
- `public-profile.html:980` — `الأرشيف` — type `button` — hook `stories-archive-toggle`
- `public-profile.html:1008` — `✕` — type `button` — hook `close-composer`
- `public-profile.html:1051` — `نشر الآن` — type `submit` — hook `composer-publish`
- `public-profile.html:1085` — `⋯` — type `button` — hook `(no hook)`
- `public-profile.html:1094` — `👍 إعجاب` — type `button` — hook `(no hook)`
- `public-profile.html:1098` — `💬 تعليق` — type `button` — hook `(no hook)`
- `public-profile.html:1102` — `↪ مشاركة` — type `button` — hook `(no hook)`
- `public-profile.html:1106` — `🔖 حفظ` — type `button` — hook `(no hook)`
- `public-profile.html:1122` — `⋯` — type `button` — hook `(no hook)`
- `public-profile.html:1131` — `👍 إعجاب` — type `button` — hook `(no hook)`
- `public-profile.html:1135` — `💬 تعليق` — type `button` — hook `(no hook)`
- `public-profile.html:1139` — `↪ مشاركة` — type `button` — hook `(no hook)`
- `public-profile.html:1143` — `🔖 حفظ` — type `button` — hook `(no hook)`
- `public-profile.html:1152` — `تحميل المزيد` — type `button` — hook `feed-load-more`
- `public-profile.html:1156` — `🔎 بحث` — type `button` — hook `feed-search-trigger`
- `public-profile.html:1157` — `＋ إنشاء` — type `button` — hook `(no hook)`
- `public-profile.html:1158` — `✦ ذكاء` — type `button` — hook `ai-nav-trigger`
- `public-profile.html:1167` — `✕` — type `button` — hook `close-comments`
- `public-profile.html:1181` — `إرسال` — type `submit` — hook `send-public-profile-message`
- `public-profile.html:1191` — `فتح خارجي` — type `button` — hook `inapp-browser-open-external`
- `public-profile.html:1192` — `إغلاق` — type `button` — hook `inapp-browser-close`
- `public-profile.html:1203` — `✕` — type `button` — hook `story-viewer-close`
- `public-profile.html:1208` — `‹` — type `button` — hook `story-viewer-prev`
- `public-profile.html:1209` — `Reply` — type `button` — hook `story-viewer-reply`
- `public-profile.html:1210` — `›` — type `button` — hook `story-viewer-next`
- `reset-password.html:36` — `إرسال رابط إعادة التعيين` — type `submit` — hook `(no hook)`

## Forms Overview

- `clerk-private-profile.html:1846` — action `(missing)` — method `(missing)` — id `tiger-care-form` — class ``
- `public-profile.html:1010` — action `(missing)` — method `(missing)` — id `composer-form` — class `composer-form`
- `public-profile.html:1179` — action `(missing)` — method `(missing)` — id `` — class `sheet-input`
- `reset-password.html:33` — action `(missing)` — method `(missing)` — id `reset-form` — class ``

## Shared Assets Overview

- `auth-flow.html` — script — `scripts/vvip-safe-ux-guard.js`
- `auth-flow.html` — link:stylesheet — `styles/vvip-visual-trust-layer.css`
- `clerk-private-profile.html` — script — `https://accurate-mule-28.clerk.accounts.dev/npm/@clerk/clerk-js@6/dist/clerk.browser.js`
- `clerk-private-profile.html` — script — `https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2`
- `clerk-private-profile.html` — script — `scripts/vvip-safe-ux-guard.js`
- `clerk-private-profile.html` — link:stylesheet — `vvip-identity.css?v=20260708-7-1`
- `clerk-private-profile.html` — link:stylesheet — `styles/vvip-visual-trust-layer.css`
- `clerk-test.html` — script — `https://accurate-mule-28.clerk.accounts.dev/npm/@clerk/ui@1/dist/ui.browser.js`
- `clerk-test.html` — script — `https://accurate-mule-28.clerk.accounts.dev/npm/@clerk/clerk-js@6/dist/clerk.browser.js`
- `clerk-test.html` — script — `scripts/vvip-safe-ux-guard.js`
- `clerk-test.html` — link:stylesheet — `styles/vvip-visual-trust-layer.css`
- `data-deletion.html` — script — `scripts/vvip-safe-ux-guard.js`
- `data-deletion.html` — link:stylesheet — `styles/vvip-visual-trust-layer.css`
- `index.html` — script — `https://accurate-mule-28.clerk.accounts.dev/npm/@clerk/ui@1/dist/ui.browser.js`
- `index.html` — script — `https://accurate-mule-28.clerk.accounts.dev/npm/@clerk/clerk-js@6/dist/clerk.browser.js`
- `index.html` — script — `auth-clerk-index.js?v=20260707-vvip-gate`
- `index.html` — script — `scripts/vvip-safe-ux-guard.js`
- `index.html` — link:manifest — `manifest.webmanifest`
- `index.html` — link:preconnect — `https://fonts.googleapis.com`
- `index.html` — link:preconnect — `https://fonts.gstatic.com`
- `index.html` — link:stylesheet — `https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&family=Roboto:wght@400;700&display=swap`
- `index.html` — link:stylesheet — `styles.css?v=20260707-vvip-gate`
- `index.html` — link:stylesheet — `vvip-identity.css?v=20260708-7-1`
- `index.html` — link:stylesheet — `styles/vvip-visual-trust-layer.css`
- `privacy-policy.html` — script — `scripts/vvip-safe-ux-guard.js`
- `privacy-policy.html` — link:stylesheet — `styles/vvip-visual-trust-layer.css`
- `private-profile.html` — script — `scripts/vvip-safe-ux-guard.js`
- `private-profile.html` — link:stylesheet — `https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap`
- `private-profile.html` — link:stylesheet — `vvip-identity.css?v=20260708-7-1`
- `private-profile.html` — link:stylesheet — `styles/vvip-visual-trust-layer.css`
- `public-profile.html` — script — `social-ui.js?v=20260708-post-options-menu`
- `public-profile.html` — script — `scripts/vvip-safe-ux-guard.js`
- `public-profile.html` — link:preconnect — `https://fonts.googleapis.com`
- `public-profile.html` — link:preconnect — `https://fonts.gstatic.com`
- `public-profile.html` — link:stylesheet — `https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap`
- `public-profile.html` — link:stylesheet — `styles.css?v=20260703e`
- `public-profile.html` — link:stylesheet — `enhanced-components.css?v=20260703f`
- `public-profile.html` — link:stylesheet — `vvip-identity.css?v=20260708-7-1`
- `public-profile.html` — link:stylesheet — `styles/vvip-visual-trust-layer.css`
- `reset-password.html` — script — `https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js`
- `reset-password.html` — script — `https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js`
- `reset-password.html` — script — `reset-password.js?v=20260703g`
- `reset-password.html` — script — `scripts/vvip-safe-ux-guard.js`
- `reset-password.html` — link:preconnect — `https://fonts.googleapis.com`
- `reset-password.html` — link:preconnect — `https://fonts.gstatic.com`
- `reset-password.html` — link:stylesheet — `https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap`
- `reset-password.html` — link:stylesheet — `styles.css?v=20260703e`
- `reset-password.html` — link:stylesheet — `styles/vvip-visual-trust-layer.css`
- `terms-of-service.html` — script — `scripts/vvip-safe-ux-guard.js`
- `terms-of-service.html` — link:stylesheet — `styles/vvip-visual-trust-layer.css`

## Possible Journey Gaps

- `private-profile.html` may need clearer logout/sign-out access.
- `private-profile.html` may need clearer home/public-profile navigation.

## Recommended Next Step

Review the possible journey gaps first. Apply only a small controlled patch for visible navigation clarity if needed.

Do not touch Supabase/RPC/RLS/backend logic in this phase.

---

Generated: 2026-07-09 19:22:45 UTC
