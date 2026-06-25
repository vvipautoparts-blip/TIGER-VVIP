# 🔐 تطبيق نظام الأدوار - Admin Role System Implementation Guide

## الحالة: جاهز للتطبيق

هذا الدليل يشرح كيفية تنفيذ نظام الأدوار (Role-Based Access Control) باستخدام Supabase RLS.

---

## 📋 المتطلبات (Prerequisites)

- [ ] Supabase project مع جدول `profiles`
- [ ] الوصول إلى SQL Editor في Supabase
- [ ] مستخدمين بأدوار مختلفة (admin, super_admin, dealer)

---

## 🚀 خطوات التطبيق

### الخطوة 1: انسخ SQL Policies

1. افتح [RLS-POLICIES.sql](./RLS-POLICIES.sql)
2. انسخ جميع الـ SQL statements

### الخطوة 2: طبّق في Supabase

1. اذهب إلى Supabase Dashboard
2. اختر مشروعك
3. انتقل إلى **SQL Editor**
4. أنشئ query جديد
5. الصق الـ SQL code
6. اضغط **Run**

### الخطوة 3: تحقق من التطبيق

```sql
-- في SQL Editor، شغّل:
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;
```

**النتيجة المتوقعة: 5 policies**
```
1. "Admins can update any profile"
2. "Admins can view all profiles"
3. "Super admins can delete profiles"
4. "Users can update own profile"
5. "Users can view own profile"
```

---

## 🔍 اختبار السياسات (Testing)

### اختبار 1: عرض البروفايل الخاص
```javascript
// في browser console أو app code
const { data, error } = await supabaseClient
  .from('profiles')
  .select('*')
  .eq('id', currentUser.id)
  .single();

console.log('✅ Your profile:', data);
```
**المتوقع:** يرجع بروفايلك فقط

---

### اختبار 2: محاولة عرض بروفايل شخص آخر (غير admin)
```javascript
const { data, error } = await supabaseClient
  .from('profiles')
  .select('*')
  .eq('id', 'other-user-id')
  .single();

if (error?.code === 'PGRST116') {
  console.log('⛔ Access Denied (Expected for non-admins)');
}
```
**المتوقع:** "Access Denied" error

---

### اختبار 3: عرض جميع البروفايلات كـ Admin
```javascript
// بعد تسجيل الدخول كـ admin
const { data, error } = await supabaseClient
  .from('profiles')
  .select('*');

console.log('✅ Admin can see all profiles:', data?.length);
```
**المتوقع:** يرجع جميع البروفايلات

---

### اختبار 4: تحديث بروفايل آخر كـ Admin
```javascript
// admin يحدث بروفايل مستخدم عادي
const { data, error } = await supabaseClient
  .from('profiles')
  .update({ is_approved: true })
  .eq('id', 'user-id')
  .select()
  .single();

console.log('✅ Updated:', data);
```
**المتوقع:** التحديث ينجح

---

### اختبار 5: محاولة حذف كـ Admin (non-super)
```javascript
const { error } = await supabaseClient
  .from('profiles')
  .delete()
  .eq('id', 'user-id');

if (error?.code === 'PGRST116') {
  console.log('⛔ Delete denied (only super_admin can delete)');
}
```
**المتوقع:** "Access Denied" (فقط super_admin يمكنه الحذف)

---

## 🎯 Frontend Integration

### في script.js، تم بالفعل تطبيق:

```javascript
// 1. التحقق من الدور
function isAdminRole(role) {
  return ['admin', 'super_admin'].includes(role);
}

// 2. إظهار قسم إدارة المستخدمين
if (isAdminRole(currentUserProfile?.role)) {
  document.getElementById('admin-users-section').style.display = 'block';
}

// 3. استدعاء renderAdminUsers() للمسؤولين
async function renderAdminUsers() {
  const { data } = await supabaseClient
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });
  // ... render grid
}
```

### في index.html، تم بالفعل إضافة:

```html
<!-- Admin Users Section (يظهر للمسؤولين فقط) -->
<div class="profile-section" id="admin-users-section">
  <h3 data-ar="إدارة المستخدمين" data-en="User Management">إدارة المستخدمين</h3>
  <input id="admin-users-search" type="text" placeholder="Search...">
  <div id="admin-users-list" class="admin-users-grid"></div>
</div>
```

---

## ✅ قائمة التحقق (Checklist)

- [ ] SQL policies طُبقت في Supabase
- [ ] RLS مُفعّل على جدول profiles
- [ ] 5 policies موجودة وفعالة
- [ ] Frontend code يتحقق من الأدوار
- [ ] Admin users grid يظهر فقط للمسؤولين
- [ ] جميع الاختبارات نجحت

---

## 🐛 استكشاف الأخطاء

### المشكلة: RLS Policy لم تُطبق
**الحل:**
1. تأكد من تشغيل جميع SQL statements
2. تحقق من رسائل الخطأ
3. أعد المحاولة مع query واحد في المرة

### المشكلة: "Permission denied" في الإنتاج
**الحل:**
1. تحقق من أن المستخدم موجود في جدول profiles
2. أضف print statements لـ debug:
   ```sql
   SELECT auth.uid() as current_user, role FROM profiles LIMIT 1;
   ```
3. تأكد من أن RLS مُفعّل

### المشكلة: Admin لا يرى جميع البروفايلات
**الحل:**
```sql
-- تحقق من أن admin profile موجود وله الدور الصحيح:
SELECT id, role FROM profiles WHERE id = 'admin-id';

-- قد تحتاج إلى تحديث:
UPDATE profiles SET role = 'super_admin' WHERE id = 'admin-id';
```

---

## 📚 المراجع

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Row-Level Security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [RLS-POLICIES.sql](./RLS-POLICIES.sql) - الملف الرئيسي بالـ SQL
- [ADMIN-ROLE-SPEC.md](./ADMIN-ROLE-SPEC.md) - المواصفات الفنية

---

## 🎓 الملخص

**ما تم تطبيقه:**
1. ✅ 5 SQL RLS policies جاهزة للنسخ واللصق
2. ✅ Frontend code متوافق (script.js + index.html)
3. ✅ إدارة المستخدمين للمسؤولين
4. ✅ عزل البيانات الآمن

**الخطوة التالية:**
1. طبّق الـ SQL في Supabase
2. اختبر كل scenario
3. انشر التغييرات

---

**آخر تحديث:** 2026-06-25
**الحالة:** جاهز للإنتاج ✅
