# مواصفات نظام إدارة الأدوار (Role-Based Admin)
## نفس الصفحات مع صلاحيات إضافية فقط

**التاريخ:** 2026-06-25  
**الحالة:** تحت التطوير  

---

## 1. المبدأ الأساسي

**الفكرة البسيطة**:
- ❌ **لا تُنشئ صفحات منفصلة للمدير**
- ✅ **استخدم نفس الصفحات للجميع**
- ✅ **الفرق فقط في الصلاحيات والبيانات المرئية**

### مثال عملي:
```
المستخدم العادي:
├─ يرى بروفايله فقط
├─ يعدل بياناته فقط
└─ لا يرى بيانات المستخدمين الآخرين

المدير العام (Super Admin):
├─ يدخل من نفس صفحة البروفايل
├─ يرى بروفايله + كل المستخدمين
├─ يعدل أي بروفايل
└─ يرى إحصائيات شاملة
```

---

## 2. التصميم الفني

### 2.1 نظام الأدوار (Roles)
```sql
-- في جدول profiles
- id (UUID)
- role: 'dealer' (مشتري عادي) / 'admin' / 'super_admin'
- ... بيانات أخرى
```

### 2.2 منطق التحكم بالصلاحيات
```javascript
// في script.js
function isAdminRole(role) {
  return ['admin', 'super_admin'].includes(role);
}

function isSuperAdmin(role) {
  return role === 'super_admin';
}
```

### 2.3 معايير إظهار/إخفاء العناصر
```javascript
// إظهار زر "عرض جميع المستخدمين" للمسؤولين فقط
if (isAdminRole(currentUserProfile?.role)) {
  document.getElementById('admin-users-grid').style.display = 'grid';
}

// إظهار زر تعديل الملف الشخصي لمالك البروفايل فقط
if (currentUser?.id === viewingProfileId || isAdminRole(currentUserProfile?.role)) {
  document.getElementById('edit-profile-btn').style.display = 'block';
}
```

---

## 3. سياسات Row-Level Security (RLS) في Supabase

### 3.1 جدول `profiles`

#### Policy 1: المستخدم يرى بروفايله فقط
```sql
CREATE POLICY "Users can view own profile"
ON profiles
FOR SELECT
USING (auth.uid() = id);
```

#### Policy 2: المستخدم يعدل بروفايله فقط
```sql
CREATE POLICY "Users can update own profile"
ON profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
```

#### Policy 3: المدير يرى كل البروفايلات
```sql
CREATE POLICY "Admins can view all profiles"
ON profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM profiles admin_profile
    WHERE admin_profile.id = auth.uid()
    AND admin_profile.role IN ('admin', 'super_admin')
  )
);
```

#### Policy 4: المدير يعدل أي بروفايل
```sql
CREATE POLICY "Admins can update any profile"
ON profiles
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM profiles admin_profile
    WHERE admin_profile.id = auth.uid()
    AND admin_profile.role IN ('admin', 'super_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM profiles admin_profile
    WHERE admin_profile.id = auth.uid()
    AND admin_profile.role IN ('admin', 'super_admin')
  )
);
```

#### Policy 5: المدير يحذف البروفايلات
```sql
CREATE POLICY "Admins can delete profiles"
ON profiles
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM profiles admin_profile
    WHERE admin_profile.id = auth.uid()
    AND admin_profile.role = 'super_admin'
  )
);
```

---

## 4. الكود في Frontend (JavaScript)

### 4.1 دالة عرض البيانات الديناميكية
```javascript
async function renderProfilePage() {
  const profileId = window.location.hash.includes('viewingUser')
    ? window._adminViewingUserId
    : currentUser?.id;
  
  const profile = await fetchProfile(profileId);
  
  if (!profile) {
    showMessage('البروفايل غير موجود', 'error');
    return;
  }
  
  // عرض البيانات
  displayProfileData(profile);
  
  // إظهار/إخفاء أزرار التعديل
  const isOwner = currentUser?.id === profileId;
  const isAdmin = isAdminRole(currentUserProfile?.role);
  
  document.getElementById('edit-profile-btn').style.display = 
    (isOwner || isAdmin) ? 'block' : 'none';
  
  document.getElementById('delete-profile-btn').style.display = 
    (isSuperAdmin(currentUserProfile?.role)) ? 'block' : 'none';
}
```

### 4.2 عرض قائمة المستخدمين (للمسؤولين فقط)
```javascript
async function renderAdminUsersGrid() {
  if (!isAdminRole(currentUserProfile?.role)) {
    console.log('⛔ Access denied: not an admin');
    return;
  }
  
  // جلب كل المستخدمين من Supabase
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('*');
  
  if (error) {
    console.error('❌ Error fetching profiles:', error);
    return;
  }
  
  // عرض الشبكة
  const grid = document.getElementById('admin-users-grid');
  grid.innerHTML = profiles.map(profile => `
    <div class="admin-user-card" onclick="adminViewUser('${profile.id}')">
      <img src="${profile.avatar_url}" alt="${profile.full_name}">
      <h3>${profile.full_name}</h3>
      <p>${profile.role}</p>
    </div>
  `).join('');
}
```

### 4.3 معالج النقر على بطاقة مستخدم (للمسؤول)
```javascript
function adminViewUser(userId) {
  if (!isAdminRole(currentUserProfile?.role)) return;
  window._adminViewingUserId = userId;
  navigateToHash('#profile-page');
}
```

---

## 5. HTML Structure (نفس الصفحة)

```html
<!-- صفحة البروفايل الواحدة تخدم الجميع -->
<section id="profile-page">
  
  <!-- معلومات البروفايل الأساسية -->
  <div class="profile-header">
    <img id="profile-avatar" src="">
    <h1 id="profile-name"></h1>
    <p id="profile-role"></p>
  </div>
  
  <!-- أزرار التعديل (تظهر للمالك أو للمدير) -->
  <div id="profile-actions">
    <button id="edit-profile-btn" style="display:none;" 
            onclick="startEditProfile()">
      تعديل البروفايل
    </button>
    <button id="delete-profile-btn" style="display:none;" 
            onclick="deleteProfile()">
      حذف الحساب
    </button>
  </div>
  
  <!-- قسم إدارة المستخدمين (يظهر للمسؤولين فقط) -->
  <div id="admin-users-section" style="display:none;">
    <h2>جميع المستخدمين</h2>
    <input id="admin-users-search" type="text" placeholder="ابحث...">
    <div id="admin-users-grid" class="grid"></div>
  </div>
  
</section>
```

---

## 6. CSS - إخفاء/عرض العناصر الإدارية

```css
/* إخفاء افتراضي */
#admin-users-section {
  display: none;
}

#edit-profile-btn,
#delete-profile-btn {
  display: none;
}

/* إظهار عند الحاجة عبر JavaScript */
#admin-users-section.visible {
  display: block;
}

.admin-user-card {
  cursor: pointer;
  border: 1px solid #ddd;
  padding: 12px;
  border-radius: 8px;
  transition: all 0.3s;
}

.admin-user-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}
```

---

## 7. تدفق العمل الكامل

```
1. المستخدم يسجل الدخول
   ↓
2. تحميل بروفايله من Supabase
   ↓
3. تحديد الدور (role)
   ↓
4. إذا كان admin/super_admin:
   ├─ عرض زر "جميع المستخدمين"
   ├─ تحميل قائمة المستخدمين
   └─ تفعيل أزرار التعديل/الحذف
   ↓
5. إذا كان مستخدم عادي:
   ├─ إخفاء قائمة المستخدمين
   ├─ تعطيل أزرار الإدارة
   └─ عرض بروفايله فقط
```

---

## 8. نقاط آمنة (Security Considerations)

✅ **لا تعتمد على Frontend فقط للأمان**
```javascript
// ❌ خطير
if (isAdminRole(currentUserProfile?.role)) {
  // يمكن للمستخدم تغيير localStorage!
}

// ✅ آمن
// اعتمد على Supabase RLS - قاعدة البيانات هي المرجعية الأساسية
```

✅ **تحقق من الصلاحيات في كل استدعاء Supabase**
```javascript
// عند جلب بيانات حساس
const { data, error } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', userId);
  
// Supabase RLS سيسمح/يمنع بناءً على سياسات الأمان
if (error && error.code === 'PGRST104') {
  // Access denied - يحقق تلقائياً أن المستخدم غير مصرح
}
```

---

## 9. سيناريوهات الاختبار

| السيناريو | المستخدم | النتيجة المتوقعة |
|---------|---------|-----------------|
| دخول مستخدم عادي | dealer | يرى بروفايله فقط، لا أزرار إدارة |
| دخول مدير | admin | يرى بروفايله + جميع المستخدمين + أزرار تعديل |
| محاولة عرض بروفايل آخر (عادي) | dealer | خطأ: "غير مصرح" (RLS يحجب) |
| محاولة عرض بروفايل آخر (مدير) | admin | نجاح: يرى البروفايل ويمكنه التعديل |
| حذف حساب (عادي) | dealer | خطأ: "لا توجد صلاحيات" (RLS يحجب) |
| حذف حساب (super_admin) | super_admin | نجاح: الحساب يُحذف |

---

## 10. الخلاصة

✅ **قم بـ**:
- استخدم دالة `isAdminRole()` للتحقق من الصلاحيات
- اعتمد على RLS في Supabase كقاعدة أمان
- أظهر/أخفِ العناصر بناءً على الدور
- اختبر جميع السيناريوهات

❌ **لا تفعل**:
- لا تنشئ صفحات منفصلة للمدير
- لا تعتمد على Frontend للأمان
- لا تسمح بتعديل localStorage للتحايل على الصلاحيات

---

## 11. المراجع

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [JavaScript onboarding patterns](https://github.com/topics/role-based-access-control)
