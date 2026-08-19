# TIGER Production Readiness Standard 2026 — Owner Approved Edition

**الحالة:** `CURRENT_ONLY / OWNER APPROVED / EXECUTION AUTHORITY FOR RELEASE READINESS`

**تاريخ الاعتماد:** 2026-08-19

**النطاق:** معيار الجاهزية والإطلاق والتحقق التشغيلي لمنصة VVIP TIGER. لا يحل محل سلطات المنتج أو الهوية أو الإعلانات أو Marketplace؛ بل يحدد متى يُسمح بوصف أي جزء بأنه `VERIFIED` أو `PRODUCTION-ELIGIBLE`.

## 0. قاعدة السلطة

هذا المعيار هو المرجع الحالي والملزم للجاهزية والإطلاق. أي تعليمات أقدم تتعارض معه في نطاق الجاهزية أو الإثبات أو Promotion تُصنف `HISTORICAL_ONLY` ولا تملك سلطة تنفيذية.

لا يعني اعتماد التصميم أنه منفذ. ولا يعني وجود الكود أنه متحقق. الحقيقة النهائية دائمًا هي:

`Requirement → Code → Automated Test → Rehearsal → Evidence → Exact SHA → Release Passport`

وكل Promotion يمر بمبدأ:

`Intent → Policy → Execution → Verification → Evidence`

## 1. قاعدة حالات التنفيذ

لكل محور أربع حالات فقط:

1. `DESIGNED`
2. `IMPLEMENTED`
3. `VERIFIED`
4. `PRODUCTION_ELIGIBLE`

لا يُغلق أي محور قبل Evidence مطابق لنفس exact commit SHA ونفس مصدر الكود الذي سيُرشح للإطلاق.

## 2. Database / Zero-Downtime Migration Standard

- اعتماد Expand/Contract عند التغييرات غير المتوافقة: Expand → Dual Write عند الحاجة → Backfill → Read Cutover → Contract في PR لاحق مستقل.
- لا حذف أو إعادة تسمية مدمرة لعمود مستخدم داخل نفس خطوة التوسع.
- `lock_timeout` حماية fail-fast قابلة للضبط لكل migration؛ قيمة `2s` baseline وليست رقمًا مقدسًا لكل حالة.
- الفهارس الكبيرة التي يمكن أن تحجب الكتابة تُنشأ بمسار PostgreSQL ملائم لـ`CREATE INDEX CONCURRENTLY` خارج transaction غير المتوافقة معه.
- لا يُمنع Sequential Scan مطلقًا؛ الممنوع هو خطة استعلام غير مقصودة أو مكلفة. يستخدم `pg_stat_statements` و`EXPLAIN (ANALYZE, BUFFERS)` عند وجود بيئة وبيانات تسمح بقياس صحيح.
- أي Schema migration يجب أن ينجح في local/isolated rehearsal قبل أي remote promotion.

## 3. Social / External Platform Boundary

- التكاملات الخارجية تستخدم Anti-Corruption Layer وAdapters/DTOs؛ لا تتسرب نماذج Meta/X/TikTok/Google إلى Social Core.
- Webhook idempotency تُحفظ في durable authority مناسبة، لا في ذاكرة مؤقتة وحدها.
- Managed-first baseline للأحداث: SQS + DLQ + EventBridge عند الحاجة؛ Kafka مؤجل إلى احتياج مثبت ولا يُدخل مبكرًا.
- التحقق من التوقيع، replay protection، bounded retries، exponential backoff with jitter، وdead-letter handling إلزامية قبل الاعتماد.

## 4. Messaging / Realtime / Presence

- الهوية server-authoritative وRLS هي خط الدفاع النهائي.
- الاتصال يُدار كـConnection State Machine: reconnect → resync → deduplicate → revalidate → resume.
- لا يُفترض وجود HTTP/3/SSE fallback مضمّن إلا إذا أثبتته المنظومة فعليًا؛ يمكن استخدام HTTP fetch fallback عند الحاجة.
- Presence/typing حالة Ephemeral ولا تُكتب في PostgreSQL الأساسي إلا إذا وُجد سبب منتج مثبت.
- لا يُدّعى استخدام CRDT مدمج إلا إذا كان التنفيذ الفعلي يثبته.
- heartbeat/cadence تُقاس على البطارية والشبكة ولا تُثبت كرقم واحد عالمي بلا قياس.

## 5. Notifications

- فصل In-App Realtime عن Push delivery.
- Push يعمل خارج المسار الحرج للمستخدم عبر worker/queue مناسب.
- APNs وFCM يمران عبر Notification Abstraction Layer؛ لا يُفترض أن `collapse_key` موحد السلوك عبر جميع المزودين.
- deduplication، collapse/grouping، rate limiting، privacy redaction، device-token lifecycle مطلوبة قبل `VERIFIED`.

## 6. Pagination / Weak-Network / Local-First

- Feed والـmutable ordered collections الكبيرة تعتمد Cursor/Keyset pagination، لا OFFSET pagination كمسار أساسي.
- الترتيب must be deterministic، مثل `(created_at, id)` أو cursor مكافئ يضمن الاستقرار.
- deduplication إلزامي عند reconnect/refetch.
- الويب يستخدم IndexedDB عند الحاجة لتخزين محلي آمن؛ SQLite يخص Native shell عندما يكون موجودًا فعليًا.
- Optimistic UI لا يُعتمد بلا server reconciliation، idempotency، retry policy، rollback/error state واضحة.

## 7. Preview / Staging / Dual Identity

- لا يوجد Preview معتمد إلا إذا كان HTTPS فعليًا، معزولًا، ومبنيًا من exact head المطلوب.
- Preview لا يغيّر `main` ولا Production، ويستخدم Staging backend وsynthetic/sanitized data.
- يجب إثبات User A/User B isolation، session separation، RLS، realtime، privacy، cache boundaries.
- `NO VALID PREVIEW YET` أفضل من رابط قديم أو غير مطابق.

## 8. Android ↔ iPhone Acceptance

- التحقق على Chromium/Android وWebKit/iOS.
- يشمل safe areas، keyboard/viewport، gestures، browser close/reopen، logout purge، PWA/SW lifecycle.
- chaos network scenarios تشمل disconnect/reconnect وhigh latency وpacket loss simulation عندما تتوفر بيئة قياس موثوقة.
- النجاح لا يُستنتج من desktop emulator وحده إذا كان شرط الإطلاق يتطلب سلوك جهاز فعلي.

## 9. Identity / Recovery / 2FA / Passkeys / Sessions

- Identity Provider المعتمد يبقى مصدر الحقيقة؛ لا تُنشأ Token Authority موازية بلا حاجة مثبتة.
- Passkeys/FIDO2/WebAuthn تُستخدم عبر سلطة الهوية المعتمدة عندما تكون مدعومة ومفعلة.
- access/session lifetime، rotation، revocation، recovery، TOTP/backup codes تُنفذ وفق قدرات السلطة الحالية ولا تُعاد هندستها محليًا بلا سبب.
- اختبارات session revocation، recovery single-use، logout purge، multi-session controls شرط للإغلاق.

## 10. Marketplace Boundary — Current TIGER Rule

- Marketplace في VVIP TIGER هو إعلانات/تصنيفات/بحث/اكتشاف/تواصل مباشر.
- المنصة ليست متجرًا، ولا تحجز مخزون البائع، ولا تنفذ صفقة السلعة أو الخدمة، ولا تعمل كوسيط دفع بين البائع والمشتري.
- لذلك تُرفض أي متطلبات `SELECT ... FOR UPDATE` لحجز مخزون أو refund لصفقة المستخدمين ما لم يتغير نموذج المنتج بقرار مالك صريح لاحق.
- اختبارات E2E المعتمدة تركز على: إنشاء الإعلان، البحث، التفاصيل، الخصوصية، التواصل، البلاغ، إدارة الإعلان، وعزل الحالة بين المستخدمين.

## 11. Campaign / Ledger / Payments

- أموال TIGER تخص خدمات الإعلان/الرصيد/الحملات التي تملكها المنصة، لا ثمن سلع أو خدمات الأطراف.
- Ledger المالي append-only/double-entry مع reversal entries بدل تعديل السجل التاريخي.
- invariant لكل batch/transaction-set مالي معتمد: `Σ Debits - Σ Credits = 0`.
- Payment provider لا يُثبت عالميًا؛ كل دولة تستخدم `Country Payment Profile` بعد Legal/Tax/Provider approval والاختبارات.
- webhook signatures، idempotency، delayed events، chargeback/reversal، reconciliation وsandbox evidence شرط قبل تفعيل أي مزود.

## 12. AWS / Edge / Backup / DR

- Managed-first baseline: CloudFront/WAF/managed compute/database/backup حيث تنطبق البنية المعتمدة.
- PITR، encrypted backups، KMS، وcross-region strategy تُفعل وفق تصنيف البيانات والتكلفة والحاجة القانونية.
- `RPO < 1 minute` و`RTO < 15 minutes` أهداف SLO وليست حقيقة جاهزة للإعلان. لا تصبح `VERIFIED` إلا بعد DR rehearsal فعلي يقيسها.
- لا يتم إدخال Kubernetes/EKS أو multi-region active-active مبكرًا بلا ضغط أو احتياج مثبت.

## 13. Observability / Owner Cockpit

- OpenTelemetry هو معيار التتبع عندما يدعم المسار الفعلي ذلك.
- المقاييس الأساسية: latency P50/P95/P99، 4xx/5xx، saturation، queue age/depth، DB health، realtime reconnect/error rates، release/version identity.
- Owner Cockpit يعرض الحقيقة التشغيلية ولا يختلق نجاحًا؛ كل PASS قابل للعودة إلى Evidence/Exact SHA.
- البيانات المالية في لوحة المالك تُفصل عن بيانات صفقات المستخدمين غير التابعة للمنصة.

## 14. Legal / Country Activation

- Country activation يمر بحالات محكومة: `Draft → Legal_Approved → Tax_Configured → Active → Suspended` أو النسخة الحالية المطابقة للعقد السيادي.
- Feature flags، currencies، payment profiles، taxes، data residency، consent/privacy controls تُربط بسلطة الدولة المناسبة.
- GDPR والأنظمة الإقليمية تُعامل كمتطلبات قابلة للإثبات حسب الدولة والنشاط، لا كشعار امتثال عالمي مطلق.

## 15. Load / Stress / Chaos / Security Gate

- Load وStress يحددان saturation/breaking point وgraceful degradation؛ لا يُستخدم رقم حمل وهمي كدليل جاهزية.
- Chaos tests تُنفذ في بيئة معزولة أو controlled staging، وليس بضرب Production عشوائيًا.
- SAST/DAST/dependency/secret scanning جزء من بوابة الإطلاق حيث تنطبق الأدوات.
- لا يجوز قول “صفر ثغرات”. شرط الإطلاق هو:
  - `P0 = 0`
  - `P1 = 0`
  - لا Critical أو High غير مقبول/غير mitigated وفق policy موثقة.

## 16. Production Gate

| المحور | شرط التأهل |
|---|---|
| DB / RLS / Realtime | Rehearsal ناجح + invariants الأمنية ناجحة + قياسات realtime عند توفر بيئة القياس |
| Identity | Recovery/2FA/Passkeys/Sessions/Revocation حسب السلطة الفعلية مع اختبارات ناجحة |
| Privacy / Media | لا تسرب عبر API/Realtime/Storage/Cache/By-ID وprivate media غير public/guessable |
| Marketplace | E2E للإعلان/البحث/التواصل دون إدخال TIGER في صفقة المستخدمين |
| Campaign / Ledger | Sandbox reconciliation متوازن 100% للقيود المعتمدة وعدم وجود silent money |
| Infrastructure / DR | أدلة backup/restore وقياسات RPO/RTO الفعلية بدل الادعاء |
| Security | P0=0، P1=0، ولا Critical/High غير مقبول أو غير mitigated |
| Release | Release Passport مطابق لنفس exact commit/tree/artifacts |

## 17. ترتيب التنفيذ الملزم الحالي

لا تُنفذ المحاور الأربعة عشر ككتلة واحدة. ترتيب الاعتماد هو:

1. Privacy / DB Proof — إغلاق PR #285.
2. Media Security Boundary.
3. Messaging / Realtime.
4. Notifications Realtime/Push abstraction.
5. Pagination / Resilience / Offline behavior.
6. Identity closure: Login / Recovery / 2FA / Passkeys / Sessions.
7. Exact-SHA Preview + User A/User B.
8. Android ↔ iPhone acceptance / PWA chaos.
9. Marketplace E2E ضمن حدود الإعلان/التواصل فقط.
10. Campaign + Ledger Sandbox + Country Payment Profile sandbox.
11. AWS / WAF / Backups / DR.
12. Observability + Owner Cockpit.
13. Legal / Country Activation gates.
14. Load / Stress / Chaos / Security Launch Tests.
15. Owner Release Passport → Production Candidate → Production فقط بعد Promotion صريح ومستوفٍ للبوابات.

## 18. قواعد غير قابلة للتفاوض

- لا Mutation مباشرة لـProduction أو `main` ضمن اختبار أو rehearsal.
- لا real-money أثناء Sandbox.
- لا public/private data leakage لإثبات الاختبار.
- لا تخفيض RLS أو الأمان فقط لجعل CI أخضر.
- لا wildcard security suppression عند وجود بديل exact-hash/exact-fingerprint.
- لا ادعاء Preview أو DR أو أداء أو امتثال أو أمان بلا Evidence حي ومطابق.
- أي تعارض مع سلطات Marketplace/Payments/Identity الحالية يُحل لصالح أحدث Owner Authority صريح في نطاقه، مع تحديث هذا المعيار إذا لزم.

## 19. عبارة المالك الملزمة

> **الإطلاق ليس زرًا، بل سلسلة أدلة. لا يُعتمد أي جزء لأنه مكتوب أو موجود؛ يُعتمد فقط عندما يصبح Requirement وCode وTest وRehearsal وEvidence وExact SHA وRelease Passport حقيقة واحدة متطابقة.**
