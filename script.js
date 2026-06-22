const products = [
  {
    title: "فلتر هواء أصلي",
    model: "BMW X5 G05",
    description: "فلتر هواء عالي الجودة للحفاظ على أداء المحرك وسلامته.",
    price: "350 ريال",
  },
  {
    title: "كشاف LED أمامي",
    model: "Mercedes S-Class",
    description: "مصابيح LED فاخرة مع توازن ضوء ممتاز ومقاومة للماء.",
    price: "1,250 ريال",
  },
  {
    title: "طقم فرامل رياضي",
    model: "Audi Q7",
    description: "فرامل عالية الأداء مع تبريد محسّن وتحمل أكبر.",
    price: "2,100 ريال",
  },
  {
    title: "غطاء مقعد جلد فئة VVIP",
    model: "Range Rover",
    description: "غطاء مقعد فاخر مع جلد ناعم وحماية إضافية للأثاث.",
    price: "1,800 ريال",
  },
  {
    title: "بطارية AGM",
    model: "Lexus LX",
    description: "بطارية قوة عالية طويلة العمر لجميع احتياجات السيارات الفاخرة.",
    price: "980 ريال",
  },
  {
    title: "مجموعة صيانة عاجلة",
    model: "Toyota Land Cruiser",
    description: "مجموعة قطع غيار أساسية للصيانة السريعة والخدمة العاجلة.",
    price: "720 ريال",
  },
];

console.log("📝 ===============================");
console.log("📝 script.js loading started");
console.log("📝 ===============================");

const productGrid = document.getElementById("product-grid");
const searchInput = document.getElementById("search-input");
const filterBrand = document.getElementById("filter-brand");
const filterModel = document.getElementById("filter-model");
const filterYear = document.getElementById("filter-year");
const filterBodyType = document.getElementById("filter-body-type");
const filterCategory = document.getElementById("filter-category");
const applyAdvancedSearchButton = document.getElementById("apply-advanced-search");
const resetAdvancedSearchButton = document.getElementById("reset-advanced-search");
const langToggle = document.getElementById("lang-toggle");
const langText = document.getElementById("lang-text");
const orderForm = document.getElementById("order-form");
const orderProduct = document.getElementById("order-product");
const ordersList = document.getElementById("orders-list");
const ordersEmpty = document.getElementById("orders-empty");
const orderMessage = document.getElementById("order-message");
const authForm = document.getElementById("auth-form");
const authSubmitButton = document.getElementById("auth-submit-button");
const authModeToggle = document.getElementById("auth-mode-toggle");
const authMessage = document.getElementById("auth-message");
const userPanel = document.getElementById("user-panel");
const userEmail = document.getElementById("user-email");
const logoutButton = document.getElementById("logout-button");
const userRole = document.getElementById("user-role");
const userSubscription = document.getElementById("user-subscription");
const partManagementSection = document.getElementById("part-management");
const partForm = document.getElementById("part-form");
const partMessage = document.getElementById("part-message");
const partSaveButton = document.getElementById("part-save-button");
const partNameArInput = document.getElementById("part-name-ar");
const partNameEnInput = document.getElementById("part-name-en");
const partPriceInput = document.getElementById("part-price");
const partImageInput = document.getElementById("part-image");
const partImagePreview = document.getElementById("part-image-preview");
const partPreviewImg = document.getElementById("part-preview-img");
const partVehicleSelect = document.getElementById("part-vehicle-select");
const representativeNav = document.getElementById("representative-nav");
const approvalsNav = document.getElementById("approvals-nav");
const adminNav = document.getElementById("admin-nav");
const profileRepLink = document.getElementById("profile-rep-link");
const profileApprovalsLink = document.getElementById("profile-approvals-link");
const profileAdminLink = document.getElementById("profile-admin-link");
const quickNavSelect = document.getElementById("quick-nav-select");
const homeFilterDropdown = document.getElementById("home-filter-dropdown");
const homeSignoutLink = document.getElementById("home-signout-link");
const profileAdvancedSearchForm = document.getElementById("profile-advanced-search-form");
const profileSearchBrand = document.getElementById("profile-search-brand");
const profileSearchModel = document.getElementById("profile-search-model");
const profileSearchYear = document.getElementById("profile-search-year");
const profileSearchBodyType = document.getElementById("profile-search-body-type");
const profileSearchCategory = document.getElementById("profile-search-category");
const profileSearchReset = document.getElementById("profile-search-reset");
const profileSearchResults = document.getElementById("profile-search-results");
const profileOrdersList = document.getElementById("profile-orders-list");
const profileOrdersEmpty = document.getElementById("profile-orders-empty");
const profilePartsSummary = document.getElementById("profile-parts-summary");



let currentLang = "ar";
let orderRequests = [];
let currentUser = null;
let currentUserProfile = null;
let selectedAccountType = null;
let selectedAccountCategory = null;
let registrationOtpVerified = false;
let catalogParts = [];
let displayedCatalogParts = [];
let profileServices = [];
let profileGallery = [];
let profileMeta = null;
let approvalRequests = [];
let profileParts = [];
let profileReviewRequests = [];
let adminRepliesByRequest = {};

const ADMIN_ROLES = ["admin", "super_admin"];
const STAFF_ROLES = ["manager", "supervisor", "representative"];
const SESSION_DEVICE_KEY = "tiger_vvip_device_id";
const WHATSAPP_OTP_ENDPOINT = window.WHATSAPP_OTP_ENDPOINT || "";
const DEMO_USERS_STORAGE_KEY = "tiger_vvip_demo_users";
const DEMO_OTP_CODE = "123456";
const appBackButton = document.getElementById("app-back-button");

let previousAppHash = "";

console.log("📝 DOM elements loaded:", {
  authForm: !!authForm,
  authSubmitButton: !!authSubmitButton,
  authMessage: !!authMessage,
  authEmail: !!document.getElementById("auth-email"),
  authPassword: !!document.getElementById("auth-password"),
  appBackButton: !!appBackButton,
});
console.log("✓ script.js loaded successfully");

// ==========================================
// 💾 SAVED ACCOUNTS MODAL - CORE FUNCTIONS
// ==========================================

/**
 * 🔐 فتح نافذة اختيار الحسابات المحفوظة
 * Open the saved accounts modal window
 */
function openAccountsModal() {
  const modal = document.getElementById("accounts-modal");
  if (modal) {
    modal.classList.add("active");
    loadSavedAccounts();
  }
}

/**
 * ❌ إغلاق نافذة اختيار الحسابات
 * Close the saved accounts modal window
 */
function closeAccountsModal() {
  const modal = document.getElementById("accounts-modal");
  if (modal) {
    modal.classList.remove("active");
  }
  hideAccountForm();
}

/**
 * 🔍 فحص الحسابات الموجودة في الجهاز
 * Scan and display all saved accounts from localStorage
 */
function scanDeviceAccounts() {
  const accounts = JSON.parse(localStorage.getItem("savedAccounts") || "[]");
  
  if (accounts.length === 0) {
    alert(
      currentLang === "ar"
        ? "📭 لا توجد حسابات محفوظة في الجهاز!\n\n💡 كيفية الإضافة:\n1️⃣ اضغط على 'إضافة حساب جديد'\n2️⃣ أدخل البريد الإلكتروني + كلمة المرور\n3️⃣ اختر صورة من الجهاز\n4️⃣ اضغط 'إضافة والدخول'"
        : "📭 No saved accounts on this device!\n\n💡 How to add:\n1️⃣ Click 'Add New Account'\n2️⃣ Enter email + password\n3️⃣ Choose a photo from device\n4️⃣ Click 'Add & Login'"
    );
    showAccountForm();
  } else {
    loadSavedAccounts();
    const message = currentLang === "ar"
      ? `✅ تم العثور على ${accounts.length} حساب محفوظ`
      : `✅ Found ${accounts.length} saved account(s)`;
    alert(message);
  }
}

/**
 * 📋 تحميل قائمة الحسابات المحفوظة من localStorage
 * Load saved accounts list from localStorage
 */
function loadSavedAccounts() {
  const savedAccountsList = document.getElementById("saved-accounts-list");
  if (!savedAccountsList) return;

  const accounts = JSON.parse(localStorage.getItem("savedAccounts") || "[]");

  if (accounts.length === 0) {
    savedAccountsList.innerHTML = `
      <div class="no-accounts">
        <p>📭 ${currentLang === "ar" ? "لا توجد حسابات محفوظة" : "No saved accounts"}</p>
        <p>${currentLang === "ar" ? "اضغط 'إضافة حساب جديد' لإنشاء حساب أول" : "Click 'Add New Account' to create your first account"}</p>
      </div>
    `;
    return;
  }

  savedAccountsList.innerHTML = accounts
    .map(
      (account, index) => `
    <div class="account-item" onclick="selectSavedAccount(${index})" title="${currentLang === "ar" ? "اختر هذا الحساب" : "Select this account"}">
      <img src="${
        account.photoUrl ||
        'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22%3E%3Crect fill=%22%231877F2%22 width=%22100%22 height=%22100%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 font-size=%2240%22 fill=%22white%22 text-anchor=%22middle%22 dominant-baseline=%22central%22%3E${account.initials || "U"}%3C/text%3E%3C/svg%3E'
      }" 
           class="account-photo" 
           alt="${account.name || account.email}"
           onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22%3E%3Crect fill=%22%231877F2%22 width=%22100%22 height=%22100%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 font-size=%2240%22 fill=%22white%22 text-anchor=%22middle%22 dominant-baseline=%22central%22%3E${account.initials || "U"}%3C/text%3E%3C/svg%3E'">
      <div class="account-info">
        <h3 class="account-username">${account.name || account.email.split("@")[0]}</h3>
        <p class="account-email">${account.email}</p>
      </div>
      <button class="btn-delete-account" type="button" onclick="event.stopPropagation(); deleteAccount(${index})" title="${currentLang === "ar" ? "حذف" : "Delete"}">✕</button>
    </div>
  `
    )
    .join("");

  updateLanguage();
}

/**
 * ✅ اختيار حساب محفوظ وتسجيل الدخول به
 * Select a saved account and log in with it
 */
function selectSavedAccount(index) {
  const accounts = JSON.parse(localStorage.getItem("savedAccounts") || "[]");
  const account = accounts[index];

  if (!account) return;

  // حفظ الحساب الحالي / Save the current account
  localStorage.setItem("currentUser", JSON.stringify(account));
  currentUser = account;
  currentUserProfile = account.profile || {};

  // إغلاق Modal والانتقال / Close modal and navigate
  closeAccountsModal();
  
  // رسالة تأكيد / Confirmation message
  showMessage(
    currentLang === "ar"
      ? `✅ تم تسجيل الدخول بـ ${account.email}`
      : `✅ Logged in as ${account.email}`,
    "success",
    authMessage,
    300
  );

  setTimeout(() => {
    updatePageVisibility();
    displayUser(currentUser);
    updateRoleBasedNavigation();
    window.location.hash = "#profile-page";
    updatePageVisibility();
  }, 500);
}

/**
 * 🗑️ حذف حساب من قائمة الحسابات المحفوظة
 * Delete an account from the saved accounts list
 */
function deleteAccount(index) {
  const accounts = JSON.parse(localStorage.getItem("savedAccounts") || "[]");
  const account = accounts[index];

  // تأكيد الحذف / Confirm deletion
  const confirmMessage =
    currentLang === "ar"
      ? `❌ هل تريد حذف حساب "${account.email}" من الجهاز؟`
      : `❌ Are you sure you want to delete "${account.email}"?`;

  if (!confirm(confirmMessage)) {
    return;
  }

  // حذف الحساب / Delete the account
  accounts.splice(index, 1);
  localStorage.setItem("savedAccounts", JSON.stringify(accounts));

  // رسالة النجاح / Success message
  showMessage(
    currentLang === "ar"
      ? `✅ تم حذف حساب "${account.email}" بنجاح`
      : `✅ Account "${account.email}" deleted successfully`,
    "success",
    authMessage,
    300
  );

  // إعادة تحميل القائمة / Reload the list
  loadSavedAccounts();
}

/**
 * 📝 عرض نموذج إضافة حساب جديد
 * Show the new account form
 */
function showAccountForm() {
  const formSection = document.getElementById("account-form-section");
  if (formSection) {
    formSection.style.display = "block";
    formSection.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
}

/**
 * 🙈 إخفاء نموذج إضافة حساب جديد
 * Hide the new account form
 */
function hideAccountForm() {
  const formSection = document.getElementById("account-form-section");
  const form = document.getElementById("new-account-form");
  const preview = document.getElementById("photo-preview");

  if (formSection) {
    formSection.style.display = "none";
  }
  if (form) {
    form.reset();
  }
  if (preview) {
    preview.style.display = "none";
  }
}

/**
 * 📸 معاينة الصورة المختارة
 * Preview the selected photo
 */
function previewAccountPhoto(input) {
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = function (e) {
      const preview = document.getElementById("photo-preview");
      const previewImg = document.getElementById("preview-image");

      if (preview && previewImg) {
        previewImg.src = e.target.result;
        preview.style.display = "flex";
      }
    };
    reader.readAsDataURL(input.files[0]);
  }
}

/**
 * 💾 حفظ حساب جديد في localStorage
 * Save a new account to localStorage
 */
function saveAccountToDevice(userData) {
  const accounts = JSON.parse(localStorage.getItem("savedAccounts") || "[]");

  // تحقق من عدم تكرار الحساب / Check for duplicates
  const exists = accounts.some((acc) => acc.email === userData.email);
  if (exists) {
    showMessage(
      currentLang === "ar" ? "❌ هذا الحساب موجود بالفعل" : "❌ This account already exists",
      "error"
    );
    return false;
  }

  const newAccount = {
    email: userData.email,
    name: userData.name || userData.email.split("@")[0],
    initials: (userData.name || userData.email).substring(0, 2).toUpperCase(),
    photoUrl: userData.photoUrl || null,
    profile: userData.profile || {},
    id: userData.id || Date.now().toString(),
  };

  accounts.push(newAccount);
  localStorage.setItem("savedAccounts", JSON.stringify(accounts));
  return true;
}

// ==========================================
// 🌐 FORM SUBMISSION HANDLER
// ==========================================

document.addEventListener("DOMContentLoaded", function () {
  const newAccountForm = document.getElementById("new-account-form");

  if (newAccountForm) {
    newAccountForm.addEventListener("submit", async function (e) {
      e.preventDefault();

      const email = document.getElementById("new-account-email").value;
      const password = document.getElementById("new-account-password").value;
      const name = document.getElementById("new-account-name").value;
      const photoInput = document.getElementById("new-account-photo");

      try {
        // معالجة الصورة / Process image
        let photoUrl = null;
        if (photoInput.files.length > 0) {
          const file = photoInput.files[0];
          photoUrl = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsDataURL(file);
          });
        }

        // البيانات الجديدة / New account data
        const newUser = {
          email: email,
          password: password,
          name: name || email.split("@")[0],
          photoUrl: photoUrl,
          role: "user",
          createdAt: new Date().toISOString(),
        };

        // حفظ الحساب / Save account
        if (saveAccountToDevice(newUser)) {
          // حفظ كحساب حالي / Set as current user
          localStorage.setItem("currentUser", JSON.stringify(newUser));
          currentUser = newUser;
          currentUserProfile = newUser.profile || {};

          // رسالة النجاح / Success message
          showMessage(
            currentLang === "ar"
              ? `✅ تم إنشاء الحساب بنجاح!\n📧 ${email}`
              : `✅ Account created successfully!\n📧 ${email}`,
            "success",
            authMessage,
            500
          );

          // إغلاق Modal والانتقال / Close modal and navigate
          setTimeout(() => {
            closeAccountsModal();
            updatePageVisibility();
            displayUser(currentUser);
            updateRoleBasedNavigation();
          }, 800);
        }
      } catch (err) {
        showMessage(
          currentLang === "ar"
            ? `❌ خطأ: ${err.message}`
            : `❌ Error: ${err.message}`,
          "error",
          authMessage
        );
      }
    });
  }
});

// ==========================================
// 🌐 EXPOSE FUNCTIONS TO GLOBAL SCOPE
// ==========================================
window.openAccountsModal = openAccountsModal;
window.closeAccountsModal = closeAccountsModal;
window.scanDeviceAccounts = scanDeviceAccounts;
window.loadSavedAccounts = loadSavedAccounts;
window.selectSavedAccount = selectSavedAccount;
window.deleteAccount = deleteAccount;
window.showAccountForm = showAccountForm;
window.hideAccountForm = hideAccountForm;
window.previewAccountPhoto = previewAccountPhoto;
window.saveAccountToDevice = saveAccountToDevice;

// ==========================================
// 🎯 Close modal when clicking on overlay
// ==========================================
document.addEventListener("DOMContentLoaded", function () {
  const modal = document.getElementById("accounts-modal");
  if (modal) {
    modal.addEventListener("click", function (e) {
      if (e.target === modal.querySelector(".modal-overlay")) {
        closeAccountsModal();
      }
    });
  }
});

// ==========================================

function hasWorkingSupabaseConfig() {
  const hasConfig = Boolean(window.__SUPABASE_CONFIG__?.hasRealKeys && window.__SUPABASE_CONFIG__?.hasLibrary);
  if (!hasConfig) {
    console.log("⚠️ No working Supabase config detected - using demo mode");
  }
  return hasConfig;
}

function showSupabaseConfigurationMessage(container = authMessage) {
  showMessage(
    currentLang === "ar"
      ? "ربط Supabase غير مكتمل بعد. حدّث القيم الحقيقية في supabase-local.js أولاً."
      : "Supabase is not configured yet. Update the real values in supabase-local.js first.",
    "error",
    container
  );
}

function showWhatsAppOtpConfigurationMessage(container = regMessage) {
  showMessage(
    currentLang === "ar"
      ? "خدمة WhatsApp OTP غير مفعلة بعد. حدّث WHATSAPP_OTP_ENDPOINT في supabase-local.js أولاً."
      : "WhatsApp OTP service is not configured yet. Set WHATSAPP_OTP_ENDPOINT in supabase-local.js first.",
    "error",
    container
  );
}

function getDemoUsers() {
  try {
    const raw = localStorage.getItem(DEMO_USERS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (_error) {
    return [];
  }
}

function saveDemoUsers(users) {
  localStorage.setItem(DEMO_USERS_STORAGE_KEY, JSON.stringify(users));
}

function ensureDemoUsersSeed() {
  const users = getDemoUsers();
  if (users.length > 0) return users;

  const seededUsers = [
    {
      id: "demo-admin-1",
      email: "admin@tigervvip.com",
      password: "Password123!",
      profile: {
        id: "demo-admin-1",
        full_name: "Admin TIGER VVIP",
        phone: "+962780003302",
        role: "admin",
        account_type: "المدير العام",
        account_category: "الإدارة",
        subscription: "premium",
        is_approved: true,
        created_at: new Date().toISOString(),
      },
    },
  ];

  saveDemoUsers(seededUsers);
  return seededUsers;
}

function findDemoUserByEmail(email) {
  const users = ensureDemoUsersSeed();
  return users.find((user) => String(user.email || "").toLowerCase() === String(email || "").toLowerCase()) || null;
}

function findDemoUserByIdentifier(identifier) {
  const normalized = String(identifier || "").trim().toLowerCase();
  if (!normalized) return null;

  const users = ensureDemoUsersSeed();
  return (
    users.find((user) => {
      const byEmail = String(user.email || "").toLowerCase() === normalized;
      const byPhone = String(user.profile?.phone || "").replace(/\s+/g, "") === normalized.replace(/\s+/g, "");
      return byEmail || byPhone;
    }) || null
  );
}

function makeDemoEmailFromIdentifier(identifier) {
  const normalized = String(identifier || "").trim().toLowerCase();
  if (normalized.includes("@")) return normalized;
  const digits = normalized.replace(/[^\d]/g, "") || `${Date.now()}`;
  return `demo-${digits}@tigervvip.local`;
}

function makeDemoPhoneFromIdentifier(identifier) {
  const normalized = String(identifier || "").trim();
  if (normalized.startsWith("+")) {
    return normalized;
  }

  const digits = normalized.replace(/[^\d]/g, "");
  if (digits.length >= 8) {
    return `+${digits}`;
  }

  const fallbackSeed = `${Date.now()}`.slice(-10);
  return `+962${fallbackSeed}`;
}

function createDemoUser(payload) {
  const users = ensureDemoUsersSeed();
  const email = String(payload.email || "").trim().toLowerCase();
  const phone = String(payload.phone || "").trim();

  if (users.some((user) => String(user.email || "").toLowerCase() === email)) {
    return { error: currentLang === "ar" ? "البريد الإلكتروني مستخدم مسبقًا." : "Email is already registered." };
  }

  if (users.some((user) => String(user.profile?.phone || "") === phone)) {
    return { error: currentLang === "ar" ? "رقم الهاتف مستخدم مسبقًا." : "Phone is already registered." };
  }

  const demoId = `demo-${Date.now()}`;
  const newUser = {
    id: demoId,
    email,
    password: payload.password,
    profile: {
      id: demoId,
      full_name: payload.full_name || null,
      phone,
      role: payload.role || "dealer",
      account_type: payload.account_type || "مشتري",
      account_category: payload.account_category || null,
      subscription: "basic",
      is_approved: true,
      created_at: new Date().toISOString(),
      city: payload.address || null,
      address: payload.address || null,
    },
  };

  users.push(newUser);
  saveDemoUsers(users);

  return { user: newUser };
}

function updateBackButtonState() {
  if (!appBackButton) return;
  const hash = window.location.hash || "#auth-section";
  const hideOnRoutes = ["#auth-section", "#home-page"];

  let shouldShow = !hideOnRoutes.includes(hash);

  if (hash === "#auth-section") {
    shouldShow = ["#registration-page"].includes(previousAppHash);
  }

  appBackButton.style.display = shouldShow ? "inline-flex" : "none";
}

function navigateBackInApp() {
  const hash = window.location.hash || "#auth-section";

  if (hash === "#registration-page") {
    navigateToHash("#auth-section");
    return;
  }

  if (previousAppHash && previousAppHash !== (window.location.hash || "")) {
    navigateToHash(previousAppHash);
    return;
  }

  if (!currentUser) {
    if (hash === "#auth-section") {
      navigateToHash("#auth-section");
      return;
    }
    if (hash === "#catalog" || hash === "#order-request") {
      navigateToHash("#auth-section");
      return;
    }
    navigateToHash("#auth-section");
    return;
  }

  if (hash === "#home-page") {
    navigateToHash("#profile-page");
    return;
  }

  if (["#catalog", "#order-request", "#user-orders", "#representative-dashboard", "#approvals-dashboard", "#admin-dashboard"].includes(hash)) {
    navigateToHash("#home-page");
    return;
  }

  navigateToHash("#profile-page");
}

let accountTypes = [
  { label: "المدير العام", category: "الإدارة" },
  { label: "مدير منطقة", category: "الإدارة" },
  { label: "مشرف", category: "الإدارة" },
  { label: "مندوب", category: "الإدارة" },
  { label: "شركة قطع غيار", category: "قطع الغيار" },
  { label: "مؤسسة قطع غيار", category: "قطع الغيار" },
  { label: "مركز قطع غيار", category: "قطع الغيار" },
  { label: "محل بيع قطع غيار", category: "قطع الغيار" },
  { label: "شركة صيانة مركبات", category: "الصيانة" },
  { label: "مؤسسة صيانة مركبات", category: "الصيانة" },
  { label: "مركز صيانة مركبات", category: "الصيانة" },
  { label: "محل صيانة مركبات", category: "الصيانة" },
  { label: "شركة خدمات مركبات", category: "الخدمات" },
  { label: "مؤسسة خدمات مركبات", category: "الخدمات" },
  { label: "مركز خدمات مركبات", category: "الخدمات" },
  { label: "محل خدمات مركبات", category: "الخدمات" },
  { label: "شركة خدمات أخرى للمركبات", category: "خدمات أخرى" },
  { label: "مؤسسة خدمات أخرى للمركبات", category: "خدمات أخرى" },
  { label: "مركز خدمات أخرى للمركبات", category: "خدمات أخرى" },
  { label: "محل خدمات أخرى للمركبات", category: "خدمات أخرى" },
  { label: "مشتري", category: "مشتري" },
];

const registrationForm = document.getElementById("registration-form");
const accountTypeSelect = document.getElementById("account-type-select");
const regMessage = document.getElementById("reg-message");
const otpSection = document.getElementById("otp-section");
const registrationPhone = document.getElementById("registration-phone");
const verifyOtpButton = document.getElementById("verify-otp-button");
const registrationOtp = document.getElementById("registration-otp");
const profileSection = document.getElementById("profile-section");
const registrationProfileForm = document.getElementById("registration-profile-form");
const completeRegistrationButton = document.getElementById("complete-registration-button");
const registrationStepTitle = document.getElementById("registration-step-title");
const stepperItems = Array.from(document.querySelectorAll(".stepper-item"));
const registrationNameRow = document.getElementById("registration-name-row");
const registrationName = document.getElementById("registration-name");
const registrationImageRow = document.getElementById("registration-image-row");
const registrationImage = document.getElementById("registration-image");
const registrationFullnameRow = document.getElementById("registration-fullname-row");
const registrationAddressRow = document.getElementById("registration-address-row");
const cleanRegistrationForm = document.getElementById("reg-form");
const cleanRegistrationEmail = document.getElementById("reg-email");
const cleanVerificationStep = document.getElementById("verification-step");
const cleanContinueToProfileButton = document.getElementById("continue-to-profile");
const profilePage = document.getElementById("profile-page");
const profileCover = document.getElementById("profile-cover");
const profilePicture = document.getElementById("profile-picture");
const profileActiveIndicator = document.getElementById("profile-active-indicator");
const profileName = document.getElementById("profile-name");
const profileVerifiedBadge = document.getElementById("profile-verified-badge");
const profileAccountType = document.getElementById("profile-account-type");
const profileBusinessType = document.getElementById("profile-business-type");
const profilePhone = document.getElementById("profile-phone");
const profileEmail = document.getElementById("profile-email");
const profileBio = document.getElementById("profile-bio");
const profileAccountTypeDetail = document.getElementById("profile-account-type-detail");
const profileStatus = document.getElementById("profile-status");
const profileSubscription = document.getElementById("profile-subscription");
const profileOrdersCount = document.getElementById("profile-orders-count");
const profileJoined = document.getElementById("profile-joined");
const editProfileButton = document.getElementById("edit-profile-button");
const profileQuickPhone = document.getElementById("profile-quick-phone");
const profileQuickCity = document.getElementById("profile-quick-city");
const profileQuickAddress = document.getElementById("profile-quick-address");
const profileQuickPhotos = document.getElementById("profile-quick-photos");
const profileQuickServices = document.getElementById("profile-quick-services");
const profileQuickParts = document.getElementById("profile-quick-parts");
const profileContactPhone = document.getElementById("profile-contact-phone");
const profileContactCity = document.getElementById("profile-contact-city");
const profileContactAddress = document.getElementById("profile-contact-address");
const profileContactEmail = document.getElementById("profile-contact-email");
const profileContactDescription = document.getElementById("profile-contact-description");
const profileGalleryList = document.getElementById("profile-gallery-list");
const profileServicesList = document.getElementById("profile-services-list");
const profilePartsList = document.getElementById("profile-parts-list");
const profileReviewRequestsList = document.getElementById("profile-review-requests-list");
const serviceForm = document.getElementById("service-form");
const serviceMessage = document.getElementById("service-message");
const galleryForm = document.getElementById("gallery-form");
const galleryMessage = document.getElementById("gallery-message");
const approvalsList = document.getElementById("approvals-list");
const approvalsEmpty = document.getElementById("approvals-empty");
const shareProfileButton = document.getElementById("share-profile-button");
const shareProfileWhatsApp = document.getElementById("share-profile-whatsapp");
const floatingCallAction = document.getElementById("floating-call-action");
const floatingWhatsAppAction = document.getElementById("floating-whatsapp-action");

const messages = {
  orderSent: { ar: "تم إرسال الطلب بنجاح. يمكنك متابعة الطلب من لوحة الطلبات.", en: "Request submitted successfully. Track your order in the orders section." },
  authSignedIn: { ar: "تم تسجيل الدخول بنجاح.", en: "Signed in successfully." },
  authSignedOut: { ar: "تم تسجيل الخروج.", en: "Signed out successfully." },
  authError: { ar: "حدث خطأ في تسجيل الدخول.", en: "Authentication failed." },
  supplierSaved: { ar: "تم حفظ المورد بنجاح.", en: "Supplier saved successfully." },
  supplierError: { ar: "حدث خطأ في حفظ المورد.", en: "Supplier save failed." },
};

async function ensureUserProfile(userId) {
  let profile = await fetchUserProfile(userId);
  if (!profile) {
    await createProfile({ id: userId, role: "dealer", created_at: new Date().toISOString() });
    profile = await fetchUserProfile(userId);
  }
  return profile;
}

async function syncOrdersFromSupabase() {
  if (!currentUser) {
    orderRequests = [];
    renderDashboard();
    return;
  }

  const { data, error } = await fetchOrders(currentUser.id, currentUserProfile?.role);
  if (error) {
    console.error(error);
    orderRequests = [];
    renderDashboard();
    return;
  }
  orderRequests = (data || []).map(normalizeOrder);
  renderDashboard();
}

function normalizeOrder(order) {
  return {
    id: order.id,
    customerName: order.customer_name || order.customerName || "",
    company: order.company,
    email: order.email,
    phone: order.phone,
    product: order.product,
    quantity: order.quantity,
    location: order.location,
    priority: order.priority,
    notes: order.notes,
    status: order.status,
    createdAt: order.createdAt || order.created_at,
    completedAt: order.completedAt || order.completed_at,
    commissionAmount: Number(order.commission_amount || 0.75),
    userId: order.user_id || order.userId,
  };
}

function getRoleLabel(role) {
  const labels = {
    admin: { ar: "المدير العام", en: "General Manager" },
    super_admin: { ar: "المدير العام", en: "General Manager" },
    manager: { ar: "مدير منطقة", en: "Area Manager" },
    supervisor: { ar: "مشرف", en: "Supervisor" },
    representative: { ar: "مندوب", en: "Representative" },
    dealer: { ar: "تاجر", en: "Dealer" },
    buyer: { ar: "مشتري", en: "Buyer" },
  };

  return labels[role] || { ar: role || "غير محدد", en: role || "Unknown" };
}

function isCompletedOrder(order) {
  return String(order?.status || "").toLowerCase() === "completed";
}

function getCommissionWindow(days) {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);
  return { start, end };
}

function buildCommissionSummary(orders) {
  const completedOrders = orders.filter(isCompletedOrder);
  const weekWindow = getCommissionWindow(7);
  const monthWindow = getCommissionWindow(30);

  const completedThisWeek = completedOrders.filter((order) => {
    const completedDate = new Date(order.completedAt || order.createdAt);
    return completedDate >= weekWindow.start && completedDate <= weekWindow.end;
  });

  const completedLast30Days = completedOrders.filter((order) => {
    const completedDate = new Date(order.completedAt || order.createdAt);
    return completedDate >= monthWindow.start && completedDate <= monthWindow.end;
  });

  const weeklyTotal = completedThisWeek.reduce((sum, order) => sum + Number(order.commissionAmount || 0.75), 0);
  const monthTotal = completedLast30Days.reduce((sum, order) => sum + Number(order.commissionAmount || 0.75), 0);

  return {
    completedCount: completedOrders.length,
    weeklyCount: completedThisWeek.length,
    weeklyTotal,
    monthCount: completedLast30Days.length,
    monthTotal,
    rate: 0.75,
  };
}

function formatDinar(value) {
  return `${Number(value || 0).toFixed(2)} د.أ`;
}

function renderFinancialSummary(summary) {
  const completedCountEl = document.getElementById("commission-completed-count");
  const weeklyCountEl = document.getElementById("commission-weekly-count");
  const weeklyTotalEl = document.getElementById("commission-weekly-total");
  const monthCountEl = document.getElementById("commission-month-count");
  const monthTotalEl = document.getElementById("commission-month-total");

  if (completedCountEl) completedCountEl.textContent = summary.completedCount.toString();
  if (weeklyCountEl) weeklyCountEl.textContent = summary.weeklyCount.toString();
  if (weeklyTotalEl) weeklyTotalEl.textContent = formatDinar(summary.weeklyTotal);
  if (monthCountEl) monthCountEl.textContent = summary.monthCount.toString();
  if (monthTotalEl) monthTotalEl.textContent = formatDinar(summary.monthTotal);
}

function showMessage(text, type = "success", container = orderMessage) {
  container.textContent = text;
  container.className = `form-message ${type}`;
  setTimeout(() => {
    container.className = "form-message";
  }, 4500);
}

function showPartMessage(text, type = "success") {
  if (!partMessage) return;
  showMessage(text, type, partMessage);
}

function isPartManager(role) {
  return ["dealer", "representative", "manager", "super_admin"].includes(role);
}

function isApprovalReviewerRole(role) {
  return ["representative", "manager", "super_admin"].includes(role);
}

function switchProfileTab(tabName) {
  // دعم التصميم الجديد (fb-tab-btn / profile-tab-*)
  document.querySelectorAll(".fb-tab-btn").forEach(btn => btn.classList.remove("active"));
  document.querySelectorAll(".fb-tab-content").forEach(panel => panel.style.display = "none");
  const activePanel = document.getElementById("profile-tab-" + tabName);
  if (activePanel) activePanel.style.display = "block";
  // تحديد الزر النشط بناءً على data-ar
  document.querySelectorAll(".fb-tab-btn").forEach(btn => {
    const onclick = btn.getAttribute("onclick") || "";
    if (onclick.includes("'" + tabName + "'")) btn.classList.add("active");
  });
  // دعم التصميم القديم أيضاً
  const buttons = Array.from(document.querySelectorAll(".profile-tab-btn"));
  const panels = Array.from(document.querySelectorAll(".profile-tab-panel"));
  buttons.forEach(btn => btn.classList.toggle("active", btn.dataset.profileTab === tabName));
  panels.forEach(panel => panel.classList.toggle("active", panel.dataset.profilePanel === tabName));
}

function parseLegacyPriceToJod(priceText) {
  const cleaned = String(priceText || "0").replace(/[^\d.]/g, "");
  return Number(cleaned || 0);
}

function normalizeGalleryLinks(value) {
  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function getPartName(part) {
  if (currentLang === "en") {
    return part.name_en || part.name || "--";
  }
  return part.name || part.name_en || "--";
}

function getPartConditionLabel(condition) {
  const key = String(condition || "").toLowerCase();
  const labels = {
    new: { ar: "جديد", en: "New" },
    used: { ar: "مستعمل", en: "Used" },
    oem: { ar: "أصلي", en: "OEM" },
    aftermarket: { ar: "تجاري", en: "Aftermarket" },
  };
  const fallback = { ar: "غير محدد", en: "Unknown" };
  const label = labels[key] || fallback;
  return currentLang === "ar" ? label.ar : label.en;
}

function buildPartReference(inputValue) {
  const provided = String(inputValue || "").trim();
  if (provided) return provided;
  const stamp = Date.now().toString().slice(-8);
  return `PART-${stamp}`;
}

function isPartCoreFieldsReady() {
  const nameAr = String(partNameArInput?.value || "").trim();
  const nameEn = String(partNameEnInput?.value || "").trim();
  const price = Number(partPriceInput?.value || 0);
  const hasImage = Boolean(partImageInput?.dataset?.imageData || String(partImageInput?.value || "").trim());
  return Boolean(nameAr && nameEn && price > 0 && hasImage);
}

function updatePartSaveButtonState() {
  if (!partSaveButton) return;
  partSaveButton.disabled = !isPartCoreFieldsReady();
}

function clearPartImagePreview() {
  if (partPreviewImg) {
    partPreviewImg.src = "";
  }
  if (partImagePreview) {
    partImagePreview.style.display = "none";
  }
  if (partImageInput?.dataset?.imageData) {
    delete partImageInput.dataset.imageData;
  }
  updatePartSaveButtonState();
}

function previewPartImage(file) {
  if (!file) {
    clearPartImagePreview();
    return;
  }

  const reader = new FileReader();
  reader.onload = (event) => {
    const imageData = String(event?.target?.result || "");
    if (!imageData) {
      clearPartImagePreview();
      return;
    }

    if (partImageInput) {
      partImageInput.dataset.imageData = imageData;
    }
    if (partPreviewImg) {
      partPreviewImg.src = imageData;
    }
    if (partImagePreview) {
      partImagePreview.style.display = "block";
    }
    updatePartSaveButtonState();
  };
  reader.readAsDataURL(file);
}

function buildVehicleOptionValue(part) {
  const brand = String(part.brand || "").trim();
  const model = String(part.model || "").trim();
  const year = String(part.year || "").trim();
  const bodyType = String(part.body_type || "").trim();
  if (!brand || !model || !year || !bodyType) return "";
  return `${brand}|||${model}|||${year}|||${bodyType}`;
}

function populatePartVehicleOptions() {
  if (!partVehicleSelect) return;

  const currentValue = partVehicleSelect.value;
  const source = [...catalogParts, ...profileParts];
  const uniqueVehicles = new Map();

  source.forEach((part) => {
    const value = buildVehicleOptionValue(part);
    if (!value || uniqueVehicles.has(value)) return;
    uniqueVehicles.set(value, {
      value,
      label: `${part.brand || "-"} ${part.model || "-"} ${part.year || "-"} • ${part.body_type || "-"}`,
    });
  });

  const options = [
    `<option value="" data-ar="اختر مركبة" data-en="Select vehicle">${currentLang === "ar" ? "اختر مركبة" : "Select vehicle"}</option>`,
    ...Array.from(uniqueVehicles.values()).map((vehicle) => `<option value="${vehicle.value}">${vehicle.label}</option>`),
    `<option value="custom" data-ar="إدخال يدوي" data-en="Manual entry">${currentLang === "ar" ? "إدخال يدوي" : "Manual entry"}</option>`,
  ];

  partVehicleSelect.innerHTML = options.join("");
  if (currentValue && partVehicleSelect.querySelector(`option[value="${currentValue}"]`)) {
    partVehicleSelect.value = currentValue;
  }
}

function applySelectedVehicleToPartForm() {
  const value = String(partVehicleSelect?.value || "");
  if (!value || value === "custom") return;

  const [brand, model, year, bodyType] = value.split("|||");
  const partBrand = document.getElementById("part-brand");
  const partModel = document.getElementById("part-model");
  const partYear = document.getElementById("part-year");
  const partBodyType = document.getElementById("part-body-type");

  if (partBrand) partBrand.value = brand || "";
  if (partModel) partModel.value = model || "";
  if (partYear) partYear.value = year || "";
  if (partBodyType) partBodyType.value = bodyType || "";
}

function getFallbackCatalogParts() {
  return products.map((product, index) => {
    const modelTokens = String(product.model || "").split(" ");
    const brand = modelTokens[0] || "Unknown";
    const model = modelTokens.slice(1).join(" ") || product.model || "Unknown";
    return {
      id: `local-${index + 1}`,
      name: product.title,
      name_en: product.title,
      part_reference: `LOCAL-${index + 1}`,
      description: product.description,
      price_jod: parseLegacyPriceToJod(product.price),
      discount_percent: 0,
      condition_type: "new",
      gallery_links: [],
      image_url: "",
      status: "active",
      category: "قطع الغيار",
      brand,
      model,
      year: 2020,
      body_type: "SUV",
      dealer_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      _isLocal: true,
    };
  });
}

function normalizeCatalogPart(part, index = 0) {
  const name = part.name || part.title || `Part ${index + 1}`;
  return {
    id: part.id ?? `local-${index + 1}`,
    name,
    name_en: part.name_en || part.nameEn || name,
    part_reference: part.part_reference || part.partId || part.ref || `PART-${index + 1}`,
    description: part.description || "-",
    price_jod: Number(part.price_jod ?? parseLegacyPriceToJod(part.price)),
    discount_percent: Number(part.discount_percent || 0),
    condition_type: part.condition_type || part.part_condition || "new",
    gallery_links: normalizeGalleryLinks(part.gallery_links),
    image_url: part.image_url || "",
    status: part.status || "active",
    category: part.category || "",
    brand: part.brand || "",
    model: part.model || "",
    year: Number(part.year || 0) || "",
    body_type: part.body_type || "",
    dealer_id: part.dealer_id || null,
    created_at: part.created_at || new Date().toISOString(),
    updated_at: part.updated_at || part.created_at || new Date().toISOString(),
    _isLocal: Boolean(part._isLocal),
  };
}

function getAdvancedFilters() {
  return {
    brand: filterBrand?.value || "",
    model: filterModel?.value || "",
    year: filterYear?.value || "",
    body_type: filterBodyType?.value || "",
    category: filterCategory?.value || "",
  };
}

function uniqueSorted(values) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => String(a).localeCompare(String(b), "ar"));
}

function populateFilterSelect(selectEl, values) {
  if (!selectEl) return;
  const currentValue = selectEl.value || "";
  const options = [`<option value="">${currentLang === "ar" ? "الكل" : "All"}</option>`]
    .concat(values.map((value) => `<option value="${value}">${value}</option>`));
  selectEl.innerHTML = options.join("");
  if (values.includes(currentValue)) {
    selectEl.value = currentValue;
  }
}

function populateAdvancedSearchFilters(parts) {
  const brands = uniqueSorted(parts.map((p) => p.brand));
  const models = uniqueSorted(parts.map((p) => p.model));
  const years = uniqueSorted(parts.map((p) => p.year).filter(Boolean));
  const bodyTypes = uniqueSorted(parts.map((p) => p.body_type));
  const categories = uniqueSorted(parts.map((p) => p.category));

  populateFilterSelect(filterBrand, brands);
  populateFilterSelect(filterModel, models);
  populateFilterSelect(filterYear, years);
  populateFilterSelect(filterBodyType, bodyTypes);
  populateFilterSelect(filterCategory, categories);
}

function populateProfileSearchFilters(parts) {
  const brands = uniqueSorted(parts.map((p) => p.brand));
  const models = uniqueSorted(parts.map((p) => p.model));
  const years = uniqueSorted(parts.map((p) => p.year).filter(Boolean));
  const bodyTypes = uniqueSorted(parts.map((p) => p.body_type));
  const categories = uniqueSorted(parts.map((p) => p.category));

  populateFilterSelect(profileSearchBrand, brands);
  populateFilterSelect(profileSearchModel, models);
  populateFilterSelect(profileSearchYear, years);
  populateFilterSelect(profileSearchBodyType, bodyTypes);
  populateFilterSelect(profileSearchCategory, categories);
}

function getProfileSearchFilters() {
  return {
    brand: profileSearchBrand?.value || "",
    model: profileSearchModel?.value || "",
    year: profileSearchYear?.value || "",
    body_type: profileSearchBodyType?.value || "",
    category: profileSearchCategory?.value || "",
  };
}

function renderProfileSearchResults(parts) {
  if (!profileSearchResults) return;

  if (!parts.length) {
    profileSearchResults.innerHTML = renderProfileEmptyState(
      "لا توجد نتائج",
      "No results",
      "جرّب تعديل الفلاتر للعثور على قطع مناسبة.",
      "Try changing filters to find matching parts."
    );
    return;
  }

  profileSearchResults.innerHTML = parts.map((part, index) => `
    <article class="profile-data-card">
      <img src="${part.image_url || "https://via.placeholder.com/640x400/F5F7FA/9AA0A6?text=Part"}" alt="${getPartName(part)}" />
      <h4>${getPartName(part)}</h4>
      <p>${currentLang === "ar" ? "السعر" : "Price"}: ${formatDinar(part.price_jod)}</p>
      <p>${currentLang === "ar" ? "المركبة" : "Vehicle"}: ${part.brand || "-"} ${part.model || "-"} ${part.year || "-"}</p>
      <p>${currentLang === "ar" ? "الفئة" : "Category"}: ${part.category || "-"}</p>
      <div class="dashboard-actions">
        <button type="button" class="btn secondary" data-action="order" data-index="${index}">
          ${currentLang === "ar" ? "اطلب الآن" : "Order Now"}
        </button>
      </div>
    </article>
  `).join("");
}

function runProfileSearch() {
  const filters = getProfileSearchFilters();
  const results = applyClientSidePartFilters(catalogParts, "", filters);
  displayedCatalogParts = [...results];
  renderProfileSearchResults(results);
}

async function loadCatalogParts(filters = {}, queryText = "") {
  let rawParts = [];
  let dbError = null;

  if (typeof fetchParts === "function") {
    const response = await fetchParts({ ...filters, query: queryText, status: "active" });
    rawParts = response.data || [];
    dbError = response.error || null;
  }

  if (dbError) {
    console.warn("Failed to fetch parts from Supabase, using local fallback.", dbError.message || dbError);
  }

  const sourceParts = rawParts.length > 0 ? rawParts : getFallbackCatalogParts();
  catalogParts = sourceParts.map(normalizeCatalogPart);
  displayedCatalogParts = [...catalogParts];
  populateAdvancedSearchFilters(catalogParts);
  populateProfileSearchFilters(catalogParts);
  populatePartVehicleOptions();
  renderProducts(displayedCatalogParts);
  populateProductOptions();
  runProfileSearch();
}

async function loadProfileAssets() {
  if (!currentUser) return;

  if (typeof fetchProfileMeta === "function") {
    const metaRes = await fetchProfileMeta(currentUser.id);
    profileMeta = metaRes.data || null;
  }

  if (typeof fetchServiceCenterServices === "function") {
    const servicesRes = await fetchServiceCenterServices({ owner_id: currentUser.id });
    profileServices = servicesRes.data || [];
  }

  if (typeof fetchGalleryImages === "function") {
    const galleryRes = await fetchGalleryImages({ owner_id: currentUser.id });
    profileGallery = galleryRes.data || [];
  }

  if (typeof fetchParts === "function") {
    const partsRes = await fetchParts({ dealer_id: currentUser.id });
    if (!partsRes.error) {
      profileParts = (partsRes.data || []).map(normalizeCatalogPart);
    }
  }

  populatePartVehicleOptions();

  if (typeof fetchReviewRequests === "function") {
    const reviewRequestsRes = await fetchReviewRequests({ requester_id: currentUser.id });
    profileReviewRequests = reviewRequestsRes.data || [];
    const repliesEntries = await Promise.all(
      profileReviewRequests.map(async (request) => {
        const repliesRes = await fetchAdminReplies(request.id);
        return [request.id, repliesRes.data || []];
      })
    );
    adminRepliesByRequest = Object.fromEntries(repliesEntries);
  }
}

function renderProfileEmptyState(titleAr, titleEn, messageAr, messageEn) {
  return `
    <article class="profile-empty-state">
      <strong>${currentLang === "ar" ? titleAr : titleEn}</strong>
      <p>${currentLang === "ar" ? messageAr : messageEn}</p>
    </article>
  `;
}

function renderProfileGallery() {
  if (!profileGalleryList) return;
  if (!profileGallery.length) {
    profileGalleryList.innerHTML = renderProfileEmptyState(
      "ابدأ بأول صورة عرض",
      "Start with your first showcase image",
      "أضف صورة مع وصف مختصر لتظهر جودة العمل للعميل فوراً.",
      "Add an image with a short description so clients can see your quality immediately."
    );
    return;
  }

  profileGalleryList.innerHTML = profileGallery.map((item) => `
    <article class="profile-media-card">
      <img src="${item.image_url}" alt="${item.title || "gallery"}" />
      <div>
        <h4>${item.title || "--"}</h4>
        <p>${item.description || "-"}</p>
        <p>${currentLang === "ar" ? "التصنيف" : "Category"}: ${item.category || "-"}</p>
        <p>${currentLang === "ar" ? "الحالة" : "Status"}: <span class="status ${String(item.status || "pending").toLowerCase()}">${item.status || "pending"}</span></p>
        <p>${currentLang === "ar" ? "رئيسية" : "Featured"}: ${item.is_featured ? (currentLang === "ar" ? "نعم" : "Yes") : (currentLang === "ar" ? "لا" : "No")}</p>
      </div>
    </article>
  `).join("");
}

function renderProfileServices() {
  if (!profileServicesList) return;
  if (!profileServices.length) {
    profileServicesList.innerHTML = renderProfileEmptyState(
      "أضف خدمتك الأولى",
      "Add your first service",
      "اكتب نوع الخدمة وساعات العمل والسعر المبدئي ليبدأ البروفايل بالبيع.",
      "Add service type, working hours, and a starting price so the profile can start converting visitors."
    );
    return;
  }

  profileServicesList.innerHTML = profileServices.map((service) => `
    <article class="profile-data-card">
      <h4>${service.service_type || "--"}</h4>
      <p>${service.description || "-"}</p>
      <p>${currentLang === "ar" ? "ساعات العمل" : "Working Hours"}: ${service.working_hours || "-"}</p>
      <p>${currentLang === "ar" ? "السعر المبدئي" : "Starting Price"}: ${formatDinar(service.starting_price)}</p>
      <p>${currentLang === "ar" ? "الحالة" : "Status"}: <span class="status ${String(service.status || "pending").toLowerCase()}">${service.status || "pending"}</span></p>
    </article>
  `).join("");
}

function renderProfileParts() {
  if (!profilePartsList) return;
  if (!profileParts.length) {
    profilePartsList.innerHTML = renderProfileEmptyState(
      "أضف قطعتك الأولى",
      "Add your first part",
      "ابدأ بقطعة واحدة موثقة بالسعر والموديل لتظهر للعميل أن الحساب جاهز.",
      "Start with one documented part including price and model to show buyers the account is ready."
    );
    return;
  }

  profilePartsList.innerHTML = profileParts.map((part) => `
    <article class="profile-part-card">
      <div class="profile-part-image-wrap">
        <img src="${part.image_url || "https://via.placeholder.com/640x400/F5F7FA/9AA0A6?text=Part"}" alt="${getPartName(part)}" />
        ${Number(part.discount_percent || 0) > 0 ? `<span class="part-discount-badge">-${Number(part.discount_percent).toFixed(0)}%</span>` : ""}
      </div>
      <div class="profile-part-body">
        <h4>${getPartName(part)}</h4>
        <p class="profile-part-ref">${currentLang === "ar" ? "رقم القطعة" : "PartID"}: ${part.part_reference || "-"}</p>
        <p class="profile-part-price">${formatDinar(part.price_jod)}</p>
        <p>${currentLang === "ar" ? "الفئة" : "Category"}: ${part.category || "-"}</p>
        <p>${currentLang === "ar" ? "الحالة" : "Status"}: <span class="status ${String(part.status || "pending").toLowerCase()}">${part.status || "pending"}</span></p>
        <p>${currentLang === "ar" ? "الوصف" : "Description"}: ${part.description || "-"}</p>
        <p>${currentLang === "ar" ? "حالة القطعة" : "Condition"}: ${getPartConditionLabel(part.condition_type)}</p>
        <button class="btn secondary part-details-btn" type="button" data-action="toggle-part-details">${currentLang === "ar" ? "تفاصيل المركبة" : "Vehicle Details"}</button>
        <div class="part-vehicle-details">
          <p><strong>${currentLang === "ar" ? "المركبة" : "Vehicle"}:</strong> ${part.brand || "-"} ${part.model || "-"} ${part.year || "-"}</p>
          <p><strong>${currentLang === "ar" ? "نوع الهيكل" : "Body Type"}:</strong> ${part.body_type || "-"}</p>
          <p><strong>${currentLang === "ar" ? "الاسم الإنجليزي" : "English Name"}:</strong> ${part.name_en || "-"}</p>
        </div>
      </div>
    </article>
  `).join("");
}

function renderProfileReviewRequests() {
  if (!profileReviewRequestsList) return;
  if (!profileReviewRequests.length) {
    profileReviewRequestsList.innerHTML = renderProfileEmptyState(
      "لا توجد طلبات مراجعة بعد",
      "No review requests yet",
      "من الكتالوج يمكنك إرسال طلب مراجعة لأي قطعة ومتابعة الرد الإداري هنا.",
      "From the catalog you can submit a review request for any part and track the admin reply here."
    );
    return;
  }

  profileReviewRequestsList.innerHTML = profileReviewRequests.map((request) => {
    const replies = adminRepliesByRequest[request.id] || [];
    const latestReply = replies[0] || null;
    const statusKey = String(request.status || "pending").toLowerCase();
    return `
      <article class="profile-request-card">
        <div class="profile-request-header">
          <div>
            <h4>${currentLang === "ar" ? "طلب مراجعة" : "Review Request"} #${request.id}</h4>
            <p>${request.request_type || "part_review"} • ${new Date(request.created_at).toLocaleString(currentLang === "ar" ? "ar-SA" : "en-US", { dateStyle: "medium", timeStyle: "short" })}</p>
          </div>
          <span class="status ${statusKey}">${request.status || "pending"}</span>
        </div>
        <div class="profile-request-body">
          <p><strong>${currentLang === "ar" ? "رسالتك:" : "Your message:"}</strong> ${request.request_message || "-"}</p>
          <p><strong>${currentLang === "ar" ? "آخر تحديث:" : "Last update:"}</strong> ${new Date(request.updated_at || request.created_at).toLocaleString(currentLang === "ar" ? "ar-SA" : "en-US", { dateStyle: "medium", timeStyle: "short" })}</p>
          <div class="request-timeline">
            <span class="timeline-step done">${currentLang === "ar" ? "تم الإرسال" : "Submitted"}</span>
            <span class="timeline-step ${statusKey !== "pending" ? "done" : ""}">${currentLang === "ar" ? "قيد المعالجة" : "In Review"}</span>
            <span class="timeline-step ${statusKey === "resolved" ? "done" : ""}">${currentLang === "ar" ? "تم الرد" : "Replied"}</span>
          </div>
          <div class="profile-request-replies">
            <strong>${currentLang === "ar" ? "الرد الإداري" : "Admin Reply"}</strong>
            ${latestReply ? `
              <p>${latestReply.reply_message}</p>
              <small>${new Date(latestReply.created_at).toLocaleString(currentLang === "ar" ? "ar-SA" : "en-US", { dateStyle: "medium", timeStyle: "short" })}</small>
            ` : `<p>${currentLang === "ar" ? "لا يوجد رد حتى الآن. سيظهر هنا فور اعتماد الإدارة للرد." : "No reply yet. It will appear here once admin responds."}</p>`}
          </div>
        </div>
      </article>
    `;
  }).join("");
}

function updateFloatingContactActions(phone) {
  const normalizedPhone = String(phone || "+962780003302").replace(/\s+/g, "");
  if (floatingCallAction) {
    floatingCallAction.href = `tel:${normalizedPhone}`;
  }
  if (floatingWhatsAppAction) {
    floatingWhatsAppAction.href = `https://wa.me/${normalizedPhone.replace(/^\+/, "")}`;
  }
}

function buildProfileShareUrl() {
  return `${window.location.origin}${window.location.pathname}#profile-page`;
}

function updateProfileShareActions(profileNameText, phoneText) {
  const shareUrl = buildProfileShareUrl();
  const message = currentLang === "ar"
    ? `شاهد بروفايل ${profileNameText} على منصة Tiger VVIP: ${shareUrl} - للتواصل ${phoneText}`
    : `Check out ${profileNameText}'s profile on Tiger VVIP: ${shareUrl} - contact ${phoneText}`;

  if (shareProfileWhatsApp) {
    shareProfileWhatsApp.href = `https://wa.me/?text=${encodeURIComponent(message)}`;
  }
}

function applyClientSidePartFilters(parts, query, filters) {
  const q = String(query || "").trim().toLowerCase();
  return parts.filter((part) => {
    const matchText = !q ||
      part.name.toLowerCase().includes(q) ||
      String(part.name_en || "").toLowerCase().includes(q) ||
      String(part.part_reference || "").toLowerCase().includes(q) ||
      String(part.description || "").toLowerCase().includes(q) ||
      String(part.brand || "").toLowerCase().includes(q) ||
      String(part.model || "").toLowerCase().includes(q);

    const matchBrand = !filters.brand || part.brand === filters.brand;
    const matchModel = !filters.model || part.model === filters.model;
    const matchYear = !filters.year || String(part.year) === String(filters.year);
    const matchBody = !filters.body_type || part.body_type === filters.body_type;
    const matchCategory = !filters.category || part.category === filters.category;
    return matchText && matchBrand && matchModel && matchYear && matchBody && matchCategory;
  });
}

async function runAdvancedSearch() {
  const filters = getAdvancedFilters();
  const queryText = searchInput?.value?.trim() || "";

  if (typeof fetchParts === "function") {
    const response = await fetchParts({ ...filters, query: queryText, status: "active" });
    if (!response.error) {
      const dbResults = (response.data || []).map(normalizeCatalogPart);
      displayedCatalogParts = dbResults.length > 0
        ? dbResults
        : applyClientSidePartFilters(catalogParts, queryText, filters);
      renderProducts(displayedCatalogParts);
      populateProductOptions();
      return;
    }
  }

  displayedCatalogParts = applyClientSidePartFilters(catalogParts, queryText, filters);
  renderProducts(displayedCatalogParts);
  populateProductOptions();
}

function resetAdvancedSearchControls() {
  if (searchInput) searchInput.value = "";
  if (filterBrand) filterBrand.value = "";
  if (filterModel) filterModel.value = "";
  if (filterYear) filterYear.value = "";
  if (filterBodyType) filterBodyType.value = "";
  if (filterCategory) filterCategory.value = "";
}

async function handleCreatePart() {
  if (!currentUser || !isPartManager(currentUserProfile?.role)) {
    showPartMessage(currentLang === "ar" ? "ليست لديك صلاحية لإضافة القطع." : "You do not have permission to add parts.", "error");
    return;
  }

  const partNameAr = document.getElementById("part-name-ar")?.value.trim();
  const partNameEn = document.getElementById("part-name-en")?.value.trim();
  const partReference = buildPartReference(document.getElementById("part-reference")?.value);
  const galleryLinks = normalizeGalleryLinks(document.getElementById("part-gallery-links")?.value || "");

  const payload = {
    name: partNameAr,
    name_en: partNameEn,
    part_reference: partReference,
    description: document.getElementById("part-description").value.trim(),
    price_jod: Number(document.getElementById("part-price").value || 0),
    image_url: partImageInput?.dataset?.imageData || null,
    discount_percent: Number(document.getElementById("part-discount")?.value || 0),
    condition_type: document.getElementById("part-condition")?.value || "new",
    gallery_links: galleryLinks,
    status: document.getElementById("part-status").value,
    category: document.getElementById("part-category").value.trim(),
    brand: document.getElementById("part-brand").value.trim(),
    model: document.getElementById("part-model").value.trim(),
    year: Number(document.getElementById("part-year").value || 0),
    body_type: document.getElementById("part-body-type").value.trim(),
    dealer_id: currentUser.id,
  };

  if (!payload.name || !payload.name_en || !payload.price_jod || !payload.image_url) {
    showPartMessage(currentLang === "ar" ? "الحقول الأساسية إلزامية: الاسم العربي، الاسم الإنجليزي، السعر، الصورة." : "Core fields are required: Arabic name, English name, price, image.", "error");
    return;
  }

  if (!payload.brand || !payload.model || !payload.category || !payload.body_type || !payload.year) {
    showPartMessage(currentLang === "ar" ? "أكمل بيانات المركبة والتصنيف قبل الحفظ." : "Complete vehicle and category fields before saving.", "error");
    return;
  }

  const result = await createPart(payload);
  if (result.error) {
    showPartMessage(result.error.message || (currentLang === "ar" ? "فشل حفظ القطعة." : "Failed to save part."), "error");
    return;
  }

  const createdPart = (result.data && result.data[0]) || null;
  if (payload.status === "pending" && createdPart && typeof createApprovalRequest === "function") {
    await createApprovalRequest({
      target_type: "part",
      target_id: String(createdPart.id),
      title: payload.name,
      requester_id: currentUser.id,
      details: {
        brand: payload.brand,
        model: payload.model,
        year: payload.year,
      },
      status: "pending",
    });
  }

  showPartMessage(currentLang === "ar" ? "تمت إضافة القطعة بنجاح." : "Part added successfully.", "success");
  if (partForm) {
    partForm.reset();
    clearPartImagePreview();
    updatePartSaveButtonState();
  }
  await loadCatalogParts();
  await loadProfileAssets();
  renderProfileParts();
  await renderApprovalsDashboard();
}

async function handleCreateService() {
  if (!currentUser || !isPartManager(currentUserProfile?.role)) {
    showMessage(currentLang === "ar" ? "ليست لديك صلاحية لإضافة خدمة." : "You do not have permission to add service.", "error", serviceMessage);
    return;
  }

  const payload = {
    owner_id: currentUser.id,
    service_type: document.getElementById("service-type")?.value.trim(),
    description: document.getElementById("service-description")?.value.trim() || null,
    working_hours: document.getElementById("service-working-hours")?.value.trim() || null,
    starting_price: Number(document.getElementById("service-starting-price")?.value || 0),
    image_url: document.getElementById("service-image-url")?.value.trim() || null,
    status: document.getElementById("service-status")?.value || "pending",
    is_public: true,
  };

  if (!payload.service_type) {
    showMessage(currentLang === "ar" ? "أدخل نوع الخدمة." : "Enter service type.", "error", serviceMessage);
    return;
  }

  const result = await createServiceCenterService(payload);
  if (result.error) {
    showMessage(result.error.message || (currentLang === "ar" ? "فشل حفظ الخدمة." : "Failed to save service."), "error", serviceMessage);
    return;
  }

  const createdService = (result.data && result.data[0]) || null;
  if (payload.status === "pending" && createdService && typeof createApprovalRequest === "function") {
    await createApprovalRequest({
      target_type: "service",
      target_id: String(createdService.id),
      title: payload.service_type,
      requester_id: currentUser.id,
      details: { working_hours: payload.working_hours },
      status: "pending",
    });
  }

  if (serviceForm) serviceForm.reset();
  showMessage(currentLang === "ar" ? "تم حفظ الخدمة بنجاح." : "Service saved successfully.", "success", serviceMessage);
  await loadProfileAssets();
  renderProfileServices();
}

async function handleCreateGalleryImage() {
  if (!currentUser || !isPartManager(currentUserProfile?.role)) {
    showMessage(currentLang === "ar" ? "ليست لديك صلاحية لإضافة صورة." : "You do not have permission to add image.", "error", galleryMessage);
    return;
  }

  const payload = {
    owner_id: currentUser.id,
    title: document.getElementById("gallery-title")?.value.trim(),
    description: document.getElementById("gallery-description")?.value.trim() || null,
    category: document.getElementById("gallery-category")?.value.trim() || null,
    image_url: document.getElementById("gallery-image-url")?.value.trim(),
    is_featured: Boolean(document.getElementById("gallery-featured")?.checked),
    is_public: Boolean(document.getElementById("gallery-public")?.checked),
    related_part: document.getElementById("gallery-related-part")?.value.trim() || null,
    related_service: document.getElementById("gallery-related-service")?.value.trim() || null,
    status: document.getElementById("gallery-status")?.value || "pending",
  };

  if (!payload.title || !payload.image_url) {
    showMessage(currentLang === "ar" ? "أدخل اسم الصورة والرابط." : "Enter image title and URL.", "error", galleryMessage);
    return;
  }

  const result = await createGalleryImage(payload);
  if (result.error) {
    showMessage(result.error.message || (currentLang === "ar" ? "فشل حفظ الصورة." : "Failed to save image."), "error", galleryMessage);
    return;
  }

  const createdImage = (result.data && result.data[0]) || null;
  if (payload.status === "pending" && createdImage && typeof createApprovalRequest === "function") {
    await createApprovalRequest({
      target_type: "gallery_image",
      target_id: String(createdImage.id),
      title: payload.title,
      requester_id: currentUser.id,
      details: {
        category: payload.category,
        related_part: payload.related_part,
        related_service: payload.related_service,
      },
      status: "pending",
    });
  }

  if (galleryForm) galleryForm.reset();
  showMessage(currentLang === "ar" ? "تم حفظ الصورة بنجاح." : "Image saved successfully.", "success", galleryMessage);
  await loadProfileAssets();
  renderProfileGallery();
}

async function renderApprovalsDashboard() {
  if (!isApprovalReviewerRole(currentUserProfile?.role)) return;
  const approvalsRes = await fetchApprovalRequests();
  approvalRequests = approvalsRes.data || [];

  if (!approvalsList || !approvalsEmpty) return;

  if (!approvalRequests.length) {
    approvalsList.innerHTML = "";
    approvalsEmpty.style.display = "block";
    return;
  }

  approvalsEmpty.style.display = "none";
  approvalsList.innerHTML = approvalRequests.map((item) => `
    <article class="dashboard-card approval-card">
      <div class="dashboard-card-header">
        <div>
          <h3>${item.title || "--"}</h3>
          <span>${item.target_type || "--"} • #${item.target_id || "--"}</span>
        </div>
        <div class="status ${String(item.status || "pending").toLowerCase()}">${item.status || "pending"}</div>
      </div>
      <p><strong>${currentLang === "ar" ? "تفاصيل" : "Details"}:</strong> ${JSON.stringify(item.details || {})}</p>
      <label>
        <span>${currentLang === "ar" ? "سبب الرفض" : "Rejection reason"}</span>
        <textarea rows="2" data-reject-reason="${item.id}" placeholder="${currentLang === "ar" ? "اكتب سبب الرفض هنا" : "Write rejection reason"}"></textarea>
      </label>
      <div class="dashboard-actions">
        <button type="button" class="btn secondary" data-action="set-pending-request" data-approval-id="${item.id}">${currentLang === "ar" ? "Pending" : "Pending"}</button>
        <button type="button" class="btn secondary" data-action="set-active-request" data-approval-id="${item.id}">${currentLang === "ar" ? "Active" : "Active"}</button>
        <button type="button" class="btn primary" data-action="approve-request" data-approval-id="${item.id}">${currentLang === "ar" ? "موافقة" : "Approve"}</button>
        <button type="button" class="btn secondary" data-action="reject-request" data-approval-id="${item.id}">${currentLang === "ar" ? "رفض" : "Reject"}</button>
      </div>
    </article>
  `).join("");
}

async function applyApprovalToTarget(request, nextStatus, rejectionReason = null) {
  const targetId = Number(request.target_id);
  if (request.target_type === "part") {
    await updatePart(targetId, { status: nextStatus });
  }
  if (request.target_type === "service") {
    await supabaseClient.from("service_center_services").update({ status: nextStatus }).eq("id", targetId);
  }
  if (request.target_type === "gallery_image") {
    await supabaseClient.from("gallery_images").update({ status: nextStatus }).eq("id", targetId);
  }
  if (request.target_type === "account") {
    await updateUserApprovalState(request.target_id, {
      is_approved: nextStatus === "active",
      business_status: nextStatus,
    });
  }

  await updateApprovalRequest(request.id, {
    status: nextStatus,
    rejection_reason: rejectionReason,
    reviewed_by: currentUser.id,
  });
}

async function handleApprovalDecision(requestId, mode) {
  if (!isApprovalReviewerRole(currentUserProfile?.role)) return;

  const request = approvalRequests.find((item) => Number(item.id) === Number(requestId));
  if (!request) return;

  if (mode === "approve" || mode === "active") {
    await applyApprovalToTarget(request, "active", null);
  }

  if (mode === "pending") {
    await applyApprovalToTarget(request, "pending", null);
  }

  if (mode === "reject") {
    const reasonEl = document.querySelector(`textarea[data-reject-reason="${request.id}"]`);
    const reason = reasonEl?.value?.trim() || (currentLang === "ar" ? "تم الرفض بدون ملاحظة." : "Rejected without note.");
    await applyApprovalToTarget(request, "rejected", reason);
  }

  await loadCatalogParts();
  await loadProfileAssets();
  renderProfileGallery();
  renderProfileServices();
  renderProfileParts();
  await renderApprovalsDashboard();
}

async function handleCreateReviewRequest(part) {
  if (!currentUser) {
    showMessage(currentLang === "ar" ? "سجل الدخول أولاً لإرسال طلب مراجعة." : "Sign in first to submit a review request.", "error", orderMessage);
    return;
  }

  const requestMessage = window.prompt(
    currentLang === "ar"
      ? `اكتب ملاحظة المراجعة للقطعة: ${part.name}`
      : `Write your review request note for part: ${part.name}`
  );

  if (!requestMessage) return;

  const result = await createReviewRequest({
    part_id: part.id,
    requester_id: currentUser.id,
    request_type: "part_review",
    request_message: requestMessage,
    status: "pending",
  });

  if (result.error) {
    showMessage(result.error.message || (currentLang === "ar" ? "فشل إرسال طلب المراجعة." : "Failed to submit review request."), "error", orderMessage);
    return;
  }

  await loadProfileAssets();
  renderProfileReviewRequests();
  showMessage(currentLang === "ar" ? "تم إرسال طلب المراجعة بنجاح." : "Review request submitted successfully.", "success", orderMessage);
}

async function handleUpdatePartPrice(part) {
  if (!currentUser || !isPartManager(currentUserProfile?.role)) return;
  if (String(part.id).startsWith("local-")) {
    showMessage(currentLang === "ar" ? "التحديث متاح للقطع المخزنة في قاعدة البيانات فقط." : "Updates are available only for database-backed parts.", "error", orderMessage);
    return;
  }

  const input = window.prompt(
    currentLang === "ar" ? `أدخل السعر الجديد للقطعة ${part.name}` : `Enter new price for part ${part.name}`,
    String(part.price_jod)
  );
  if (input === null) return;

  const newPrice = Number(input);
  if (Number.isNaN(newPrice) || newPrice < 0) {
    showMessage(currentLang === "ar" ? "قيمة السعر غير صحيحة." : "Invalid price value.", "error", orderMessage);
    return;
  }

  const updateResult = await updatePart(part.id, { price_jod: newPrice });
  if (updateResult.error) {
    showMessage(updateResult.error.message || (currentLang === "ar" ? "فشل تحديث السعر." : "Failed to update price."), "error", orderMessage);
    return;
  }

  await createPartUpdateLog({
    part_id: part.id,
    changed_by: currentUser.id,
    change_type: "price",
    old_value: String(part.price_jod),
    new_value: String(newPrice),
    note: "Price updated from catalog card",
  });

  showMessage(currentLang === "ar" ? "تم تحديث السعر بنجاح." : "Price updated successfully.", "success", orderMessage);
  await loadCatalogParts();
}

async function handleTogglePartStatus(part) {
  if (!currentUser || !isAdminRole(currentUserProfile?.role)) return;
  if (String(part.id).startsWith("local-")) {
    showMessage(currentLang === "ar" ? "التحديث متاح للقطع المخزنة في قاعدة البيانات فقط." : "Updates are available only for database-backed parts.", "error", orderMessage);
    return;
  }

  const nextStatus = part.status === "active" ? "inactive" : "active";
  const updateResult = await updatePart(part.id, { status: nextStatus });
  if (updateResult.error) {
    showMessage(updateResult.error.message || (currentLang === "ar" ? "فشل تحديث الحالة." : "Failed to update status."), "error", orderMessage);
    return;
  }

  await createPartUpdateLog({
    part_id: part.id,
    changed_by: currentUser.id,
    change_type: "status",
    old_value: String(part.status),
    new_value: String(nextStatus),
    note: "Status toggled from catalog card",
  });

  showMessage(currentLang === "ar" ? "تم تحديث حالة القطعة." : "Part status updated.", "success", orderMessage);
  await loadCatalogParts();
}

async function handleAdminReply(reviewRequestId) {
  if (!isAdminRole(currentUserProfile?.role)) return;
  const replyMessage = window.prompt(currentLang === "ar" ? "اكتب الرد الإداري" : "Write admin reply");
  if (!replyMessage) return;

  const replyResult = await createAdminReply({
    review_request_id: reviewRequestId,
    admin_id: currentUser.id,
    reply_message: replyMessage,
  });

  if (replyResult.error) {
    showMessage(replyResult.error.message || (currentLang === "ar" ? "فشل إرسال الرد." : "Failed to send reply."), "error", orderMessage);
    return;
  }

  await updateReviewRequestStatus(reviewRequestId, "resolved");
  showMessage(currentLang === "ar" ? "تم إرسال الرد وتحديث الحالة." : "Reply sent and status updated.", "success", orderMessage);
  await renderAdminDashboard();
}

function isAdminRole(role) {
  return ADMIN_ROLES.includes(role);
}

function isStaffRole(role) {
  return STAFF_ROLES.includes(role) || isAdminRole(role);
}

function canAccessRoute(hash) {
  if (!currentUser) {
    const privateRoutes = [
      "#profile-page",
      "#user-orders",
      "#representative-dashboard",
      "#approvals-dashboard",
      "#admin-dashboard",
    ];
    return !privateRoutes.includes(hash);
  }

  const role = currentUserProfile?.role;
  if (hash === "#admin-dashboard") {
    return isAdminRole(role);
  }
  if (hash === "#representative-dashboard") {
    return role === "representative" || isAdminRole(role);
  }
  if (hash === "#approvals-dashboard") {
    return isApprovalReviewerRole(role);
  }
  return true;
}

function updateRoleBasedNavigation() {
  const role = currentUserProfile?.role;
  const showRep = role === "representative" || isAdminRole(role);
  const showApprovals = isApprovalReviewerRole(role);
  const showAdmin = isAdminRole(role);

  if (representativeNav) representativeNav.style.display = showRep ? "inline-flex" : "none";
  if (approvalsNav) approvalsNav.style.display = showApprovals ? "inline-flex" : "none";
  if (adminNav) adminNav.style.display = showAdmin ? "inline-flex" : "none";
  if (profileRepLink) profileRepLink.style.display = showRep ? "inline-flex" : "none";
  if (profileApprovalsLink) profileApprovalsLink.style.display = showApprovals ? "inline-flex" : "none";
  if (profileAdminLink) profileAdminLink.style.display = showAdmin ? "inline-flex" : "none";
}

function getDeviceId() {
  let deviceId = localStorage.getItem(SESSION_DEVICE_KEY);
  if (!deviceId) {
    deviceId = `device-${crypto.randomUUID()}`;
    localStorage.setItem(SESSION_DEVICE_KEY, deviceId);
  }
  return deviceId;
}

function generateOtpCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function sendWhatsAppOtp(phone, code) {
  if (!WHATSAPP_OTP_ENDPOINT) {
    console.warn("WhatsApp OTP endpoint is not configured. Set window.WHATSAPP_OTP_ENDPOINT.");
    return { success: true, warning: true };
  }

  const response = await fetch(WHATSAPP_OTP_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, code, channel: "whatsapp" }),
  });

  if (!response.ok) {
    throw new Error("Failed to send WhatsApp OTP");
  }

  return { success: true };
}

async function sendRegistrationOtp() {
  if (!hasWorkingSupabaseConfig()) {
    showRegistrationMessage(
      currentLang === "ar"
        ? `وضع تجريبي: استخدم رمز التحقق ${DEMO_OTP_CODE}`
        : `Demo mode: use OTP code ${DEMO_OTP_CODE}`,
      "success"
    );
    return true;
  }

  if (!WHATSAPP_OTP_ENDPOINT) {
    showWhatsAppOtpConfigurationMessage(regMessage);
    return false;
  }

  const phone = registrationPhone.value.trim();
  if (!validatePhoneNumber(phone)) {
    showRegistrationMessage(currentLang === "ar" ? "رقم الهاتف غير صالح." : "Invalid phone number.", "error");
    return false;
  }

  const duplicatePhone = await fetchProfileByPhone(phone);
  if (duplicatePhone.data) {
    showRegistrationMessage(currentLang === "ar" ? "رقم الهاتف مستخدم مسبقًا." : "Phone is already registered.", "error");
    return false;
  }

  const code = generateOtpCode();
  const otpRes = await createOtpCode(phone, code, "registration", 10);
  if (otpRes.error) {
    showRegistrationMessage(currentLang === "ar" ? "تعذر إنشاء رمز التحقق." : "Could not generate OTP.", "error");
    return false;
  }

  try {
    await sendWhatsAppOtp(phone, code);
    showRegistrationMessage(currentLang === "ar" ? "تم إرسال OTP عبر واتساب." : "OTP sent via WhatsApp.", "success");
    return true;
  } catch (_error) {
    showRegistrationMessage(currentLang === "ar" ? "فشل إرسال OTP عبر واتساب." : "Failed to send WhatsApp OTP.", "error");
    return false;
  }
}

async function verifyRegistrationOtp() {
  if (!hasWorkingSupabaseConfig()) {
    const code = registrationOtp.value.trim();
    if (code !== DEMO_OTP_CODE) {
      showRegistrationMessage(
        currentLang === "ar" ? `رمز OTP التجريبي هو ${DEMO_OTP_CODE}` : `Demo OTP code is ${DEMO_OTP_CODE}`,
        "error"
      );
      return false;
    }

    registrationOtpVerified = true;
    showProfileCompletion();
    showRegistrationMessage(currentLang === "ar" ? "تم التحقق بنجاح (وضع تجريبي)." : "Verified successfully (demo mode).", "success");
    return true;
  }

  const code = registrationOtp.value.trim();
  const phone = registrationPhone.value.trim();
  if (!code || code.length < 6) {
    showRegistrationMessage(currentLang === "ar" ? "أدخل OTP صحيح." : "Enter a valid OTP.", "error");
    return false;
  }

  const result = await verifyOtpCode(phone, code, "registration");
  if (!result.valid) {
    showRegistrationMessage(currentLang === "ar" ? "OTP غير صحيح أو منتهي." : "OTP is invalid or expired.", "error");
    return false;
  }

  registrationOtpVerified = true;
  showProfileCompletion();
  showRegistrationMessage(currentLang === "ar" ? "تم التحقق بنجاح." : "Verified successfully.", "success");
  return true;
}

function getWeeklyPeriod() {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = (day + 6) % 7;
  const start = new Date(now);
  start.setDate(now.getDate() - diffToMonday);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function renderList(container, rowsHtml, emptyEl) {
  if (!container || !emptyEl) return;
  if (!rowsHtml.length) {
    container.innerHTML = "";
    emptyEl.style.display = "block";
    return;
  }
  emptyEl.style.display = "none";
  container.innerHTML = rowsHtml.join("");
}

async function renderRepresentativeDashboard() {
  if (!currentUser) return;

  const summaryRes = await fetchCommissionSummary(currentUser.id, 30);
  const lastSalaryRes = await fetchLastSalaryPayment(currentUser.id);

  const totalCommissions = summaryRes.data?.totalAmount || 0;
  const completedCount = summaryRes.data?.completedCount || 0;
  const lastSalary = lastSalaryRes.data || null;

  const totalEl = document.getElementById("rep-total-commissions");
  const completedEl = document.getElementById("rep-completed-operations");
  const lastAmountEl = document.getElementById("rep-last-salary-amount");
  const lastDateEl = document.getElementById("rep-last-salary-date");

  if (totalEl) totalEl.textContent = formatDinar(totalCommissions);
  if (completedEl) completedEl.textContent = String(completedCount);
  if (lastAmountEl) lastAmountEl.textContent = formatDinar(lastSalary?.total_amount || 0);
  if (lastDateEl) {
    lastDateEl.textContent = lastSalary?.payment_date
      ? new Date(lastSalary.payment_date).toLocaleDateString(currentLang === "ar" ? "ar-SA" : "en-US")
      : "--";
  }
}

async function handleApproveProfile(userId) {
  if (!isAdminRole(currentUserProfile?.role)) return;
  const res = await approveUserProfile(userId);
  if (res.error) {
    showMessage(currentLang === "ar" ? "تعذر اعتماد المستخدم." : "Could not approve user.", "error", orderMessage);
    return;
  }
  await renderAdminDashboard();
}

async function handleWeeklyPay(userId) {
  if (!isAdminRole(currentUserProfile?.role)) return;
  const week = getWeeklyPeriod();
  const summary = await fetchCommissionSummary(userId, 7);
  const total = Number(summary.data?.totalAmount || 0);

  if (total <= 0) {
    showMessage(currentLang === "ar" ? "لا توجد عمولات مستحقة لهذا الأسبوع." : "No payable commissions this week.", "error", orderMessage);
    return;
  }

  const paymentRes = await createSalaryPayment({
    user_id: userId,
    total_amount: total,
    period_start: week.start.toISOString().slice(0, 10),
    period_end: week.end.toISOString().slice(0, 10),
    created_by: currentUser.id,
    notes: "Weekly payroll auto payment",
  });

  if (paymentRes.error) {
    showMessage(currentLang === "ar" ? "فشل إنشاء دفعة الراتب." : "Failed to create salary payment.", "error", orderMessage);
    return;
  }

  await markCommissionsPaid(userId);
  showMessage(currentLang === "ar" ? "تم صرف الراتب الأسبوعي." : "Weekly salary paid.", "success", orderMessage);
  await renderAdminDashboard();
  if (currentUserProfile.role === "representative") {
    await renderRepresentativeDashboard();
  }
}

async function renderAdminDashboard() {
  if (!isAdminRole(currentUserProfile?.role)) return;

  await resetCommissionsAfter30Days();
  const dashboard = await fetchGlobalCommissionDashboard();
  const pending = await fetchPendingApprovals();
  const reviews = await fetchReviewRequests("pending");
  const commissions = dashboard.commissions.data || [];
  const payments = dashboard.payments.data || [];
  const pendingApprovals = pending.data || [];
  const pendingReviews = reviews.data || [];
  const dueByUser = commissions
    .filter((item) => item.status === "earned")
    .reduce((map, item) => {
      map[item.user_id] = Number(map[item.user_id] || 0) + Number(item.amount || 0);
      return map;
    }, {});

  const totalCommissions = commissions.reduce((sum, c) => sum + Number(c.amount || 0), 0);
  const totalOperations = commissions.length;
  const totalPayments = payments.reduce((sum, p) => sum + Number(p.total_amount || 0), 0);

  const totalCommissionsEl = document.getElementById("admin-total-commissions");
  const totalOperationsEl = document.getElementById("admin-total-operations");
  const pendingEl = document.getElementById("admin-pending-approvals");
  const weeklyPaymentsEl = document.getElementById("admin-weekly-payments");
  if (totalCommissionsEl) totalCommissionsEl.textContent = formatDinar(totalCommissions);
  if (totalOperationsEl) totalOperationsEl.textContent = String(totalOperations);
  if (pendingEl) pendingEl.textContent = String(pendingApprovals.length);
  if (weeklyPaymentsEl) weeklyPaymentsEl.textContent = formatDinar(totalPayments);

  const approvalsRows = pendingApprovals.map((p) => `
    <article class="dashboard-row">
      <div>
        <strong>${p.full_name || "--"}</strong>
        <p>${p.phone || "--"} • ${p.account_type || p.role || "--"}</p>
      </div>
      <button type="button" class="btn primary" data-action="approve-user" data-user-id="${p.id}">
        ${currentLang === "ar" ? "اعتماد" : "Approve"}
      </button>
    </article>
  `);

  const dueRows = Object.entries(dueByUser)
    .filter(([, amount]) => Number(amount) > 0)
    .map(([userId, amount]) => `
    <article class="dashboard-row">
      <div>
        <strong>${formatDinar(amount)}</strong>
        <p>${currentLang === "ar" ? "مستحق هذا الأسبوع" : "Due this week"} • ${userId}</p>
      </div>
      <button type="button" class="btn primary" data-action="pay-weekly" data-user-id="${userId}">
        ${currentLang === "ar" ? "صرف أسبوعي" : "Pay Weekly"}
      </button>
    </article>
  `);

  const paidRows = payments.slice(0, 20).map((p) => `
    <article class="dashboard-row">
      <div>
        <strong>${formatDinar(p.total_amount)}</strong>
        <p>${new Date(p.payment_date).toLocaleDateString(currentLang === "ar" ? "ar-SA" : "en-US")} • ${p.period_start} - ${p.period_end}</p>
      </div>
      <span class="status completed">${currentLang === "ar" ? "مصروف" : "Paid"}</span>
    </article>
  `);

  renderList(
    document.getElementById("admin-approvals-list"),
    approvalsRows,
    document.getElementById("admin-approvals-empty")
  );

  renderList(
    document.getElementById("admin-payments-list"),
    [...dueRows, ...paidRows],
    document.getElementById("admin-payments-empty")
  );

  const reviewRows = pendingReviews.map((review) => `
    <article class="dashboard-row">
      <div>
        <strong>${currentLang === "ar" ? "طلب مراجعة" : "Review Request"} #${review.id}</strong>
        <p>${review.request_message || "--"}</p>
      </div>
      <button type="button" class="btn primary" data-action="reply-review" data-review-id="${review.id}">
        ${currentLang === "ar" ? "رد إداري" : "Admin Reply"}
      </button>
    </article>
  `);

  renderList(
    document.getElementById("admin-reviews-list"),
    reviewRows,
    document.getElementById("admin-reviews-empty")
  );
}

function renderProducts(items) {
  if (!Array.isArray(items) || items.length === 0) {
    productGrid.innerHTML = `<article class="dashboard-empty">${currentLang === "ar" ? "لا توجد نتائج مطابقة حالياً." : "No matching results right now."}</article>`;
    return;
  }

  productGrid.innerHTML = items
    .map(
      (product, index) => {
        const canUpdatePrice = isPartManager(currentUserProfile?.role);
        const canToggleStatus = isAdminRole(currentUserProfile?.role);
        return `
      <article class="product-card">
        <h3>${product.name}</h3>
        <p><strong data-ar="الماركة:" data-en="Brand:">الماركة:</strong> ${product.brand || "-"}</p>
        <p><strong data-ar="الطراز:" data-en="Model:">الطراز:</strong> ${product.model || "-"}</p>
        <p><strong data-ar="السنة:" data-en="Year:">السنة:</strong> ${product.year || "-"}</p>
        <p><strong data-ar="الهيكل:" data-en="Body:">الهيكل:</strong> ${product.body_type || "-"}</p>
        <p><strong data-ar="الفئة:" data-en="Category:">الفئة:</strong> ${product.category || "-"}</p>
        <p><strong data-ar="رقم القطعة:" data-en="PartID:">رقم القطعة:</strong> ${product.part_reference || "-"}</p>
        <p><strong data-ar="الحالة:" data-en="Status:">الحالة:</strong> ${product.status || "-"}</p>
        <p>${product.description}</p>
        <div class="price">${formatDinar(product.price_jod)}</div>
        <button class="btn secondary" type="button" data-action="order" data-index="${index}">اطلب الآن</button>
        <button class="btn secondary" type="button" data-action="request-review" data-index="${index}">${currentLang === "ar" ? "طلب مراجعة" : "Review Request"}</button>
        ${canUpdatePrice ? `<button class="btn secondary" type="button" data-action="update-part-price" data-index="${index}">${currentLang === "ar" ? "تحديث السعر" : "Update Price"}</button>` : ""}
        ${canToggleStatus ? `<button class="btn secondary" type="button" data-action="toggle-part-status" data-index="${index}">${currentLang === "ar" ? "تبديل الحالة" : "Toggle Status"}</button>` : ""}
      </article>
    `;
      }
    )
    .join("");
}

function displayUser(user) {
  if (!user) {
    userPanel.style.display = "none";
    if (partManagementSection) partManagementSection.style.display = "none";
    return;
  }
  userEmail.textContent = user.email;
  const roleLabel = getRoleLabel(currentUserProfile?.role || "dealer");
  userRole.textContent = currentLang === "ar" ? roleLabel.ar : roleLabel.en;
  userSubscription.textContent = currentUserProfile?.subscription || "basic";
  userPanel.style.display = "grid";
  if (partManagementSection) {
    partManagementSection.style.display = isPartManager(currentUserProfile?.role) ? "block" : "none";
  }
}

async function fetchUserProfile(userId) {
  const { data, error } = await fetchProfile(userId);
  if (error) {
    console.error(error);
    return null;
  }
  return data;
}

async function handleAuthForm(email, password) {
  console.log("🔐 [handleAuthForm] Starting with email:", email);
  if (!hasWorkingSupabaseConfig()) {
    console.log("🔐 [handleAuthForm] Using demo mode (no Supabase config)");
    const identifier = String(email || "").trim();
    const secret = String(password || "").trim();
    if (!identifier || !secret) {
      showMessage(
        currentLang === "ar" ? "أدخل البريد/الهاتف وكلمة المرور أولاً." : "Enter email/phone and password first.",
        "error",
        authMessage
      );
      return null;
    }

    let demoUser = findDemoUserByIdentifier(identifier);

    if (!demoUser) {
      const created = createDemoUser({
        email: makeDemoEmailFromIdentifier(identifier),
        password: secret,
        full_name: identifier,
        phone: makeDemoPhoneFromIdentifier(identifier),
        role: "dealer",
        account_type: "مشتري",
        account_category: "مشتري",
      });

      if (created.error) {
        showMessage(created.error, "error", authMessage);
        return null;
      }

      demoUser = created.user;
    }

    if (demoUser.password !== secret) {
      showMessage(
        currentLang === "ar"
          ? "كلمة المرور غير صحيحة. جرّب Password123! لحساب الإدارة أو سجّل حسابًا جديدًا."
          : "Incorrect password. Try Password123! for admin or create a new account.",
        "error",
        authMessage
      );
      return null;
    }

    console.log("✅ [handleAuthForm] Demo user authenticated successfully");
    currentUser = { id: demoUser.id, email: demoUser.email };
    currentUserProfile = { ...(demoUser.profile || {}) };
    updateRoleBasedNavigation();
    displayUser(currentUser);
    showMessage(currentLang === "ar" ? "تم تسجيل الدخول (وضع تجريبي)." : "Signed in (demo mode).", "success", authMessage);
    window.location.hash = "#profile-page";
    updatePageVisibility();
    return currentUser;
  }

  const response = await signIn(email, password);
  if (response.error) {
    showMessage(messages.authError[currentLang], "error", authMessage);
    return null;
  }
  currentUser = response.data.user;

  currentUserProfile = await ensureUserProfile(currentUser.id);
  if (currentUserProfile?.is_approved === false) {
    await signOut();
    currentUser = null;
    currentUserProfile = null;
    showMessage(
      currentLang === "ar"
        ? "الحساب قيد المراجعة. يجب اعتمادك من المدير أولاً."
        : "Your account is pending approval by admin.",
      "error",
      authMessage
    );
    return null;
  }

  const deviceId = getDeviceId();
  const existingSession = await supabaseClient
    .from("user_sessions")
    .select("id")
    .eq("user_id", currentUser.id)
    .eq("device_id", deviceId)
    .eq("is_active", true)
    .maybeSingle();

  const activeSessions = await fetchActiveSessionsCount(currentUser.id);
  if (activeSessions.error) {
    showMessage(messages.authError[currentLang], "error", authMessage);
    return null;
  }

  const isAdminUser = isAdminRole(currentUserProfile?.role);
  const willExceed = !isAdminUser && !existingSession.data && activeSessions.count >= 3;
  if (willExceed) {
    await signOut();
    currentUser = null;
    currentUserProfile = null;
    showMessage(
      currentLang === "ar"
        ? "تم الوصول للحد الأقصى (3 أجهزة). اطلب من المدير تسجيل الخروج من جهاز آخر."
        : "Maximum devices reached (3). Ask admin to release a session.",
      "error",
      authMessage
    );
    return null;
  }

  const upsert = await upsertUserSession(currentUser.id, deviceId, navigator.userAgent || "web");
  if (upsert.error) {
    await signOut();
    currentUser = null;
    currentUserProfile = null;
    showMessage(messages.authError[currentLang], "error", authMessage);
    return null;
  }

  updateRoleBasedNavigation();
  displayUser(currentUser);
  showMessage(messages.authSignedIn[currentLang], "success", authMessage);
  await syncOrdersFromSupabase();
  await loadProfileAssets();
  await renderRepresentativeDashboard();
  await renderAdminDashboard();
  await renderApprovalsDashboard();
  
  // Redirect to profile immediately after login
  setTimeout(() => {
    window.location.hash = "#profile-page";
    updatePageVisibility();
  }, 800);
  
  return currentUser;
}

async function handleLogout() {
  if (currentUser) {
    await deactivateAllSessions(currentUser.id);
  }
  await signOut();
  currentUser = null;
  currentUserProfile = null;
  updateRoleBasedNavigation();
  displayUser(null);
  showMessage(messages.authSignedOut[currentLang], "success", authMessage);
  
  // Redirect to login immediately after logout
  setTimeout(() => {
    window.location.hash = "#registration-page";
    updatePageVisibility();
  }, 600);
}

window.handleLogout = handleLogout;

async function showAuthState() {
  const user = await getCurrentUser();
  currentUser = user || null;
  if (currentUser) {
    currentUserProfile = await ensureUserProfile(currentUser.id);
  } else {
    currentUserProfile = null;
  }
  updateRoleBasedNavigation();
  displayUser(currentUser);
  if (currentUser) {
    await syncOrdersFromSupabase();
    await loadProfileAssets();
    await renderRepresentativeDashboard();
    await renderAdminDashboard();
    await renderApprovalsDashboard();
    if (!window.location.hash || window.location.hash === "#auth-section" || window.location.hash === "#registration-page") {
      window.location.hash = "#profile-page";
    }
  }
  updatePageVisibility();
}

function updatePageVisibility() {
  let hash = window.location.hash.toLowerCase();
  const isAuth = !!currentUser;

  if (!hash) {
    window.location.hash = isAuth ? "#profile-page" : "#registration-page";
    return;
  }

  const isOnAuthPages = hash === "#auth-section" || hash === "#registration-page";

  if (!canAccessRoute(hash)) {
    window.location.hash = isAuth ? "#profile-page" : "#registration-page";
    return;
  }
  
  // Remove all page classes
  document.body.classList.remove("login-page", "profile-page", "home-page");
  
  // Hide all main sections except active
  const allSections = document.querySelectorAll("main > section");
  allSections.forEach(section => {
    section.style.display = "none";
  });
  
  if (isOnAuthPages) {
    // Show auth section
    if (hash === "#registration-page") {
      document.getElementById("registration-page").style.display = "block";
    } else {
      document.getElementById("auth-section").style.display = "block";
    }
    document.body.classList.add("login-page");
  } else if (hash === "#profile-page") {
    // Show profile page
    if (!isAuth) {
      window.location.hash = "#auth-section";
      return;
    }
    document.getElementById("profile-page").style.display = "block";
    document.body.classList.add("profile-page");
    renderProfilePage();
  } else if (hash === "#home-page") {
    // Show home page
    if (!isAuth) {
      window.location.hash = "#auth-section";
      return;
    }
    document.getElementById("home-page").style.display = "block";
    document.body.classList.add("home-page");
  } else if (hash === "#representative-dashboard") {
    document.getElementById("representative-dashboard").style.display = "block";
    renderRepresentativeDashboard();
  } else if (hash === "#approvals-dashboard") {
    document.getElementById("approvals-dashboard").style.display = "block";
    renderApprovalsDashboard();
  } else if (hash === "#admin-dashboard") {
    document.getElementById("admin-dashboard").style.display = "block";
    renderAdminDashboard();
  } else {
    // Show catalog/order sections
    const sectionId = hash.replace("#", "");
    const section = document.getElementById(sectionId || "hero");
    if (section) {
      section.style.display = "block";
    }
  }
}

function populateProductOptions() {
  orderProduct.innerHTML = catalogParts
    .map(
      (product) => `<option value="${product.name}">${product.name} - ${product.brand} ${product.model} ${product.year || ""}</option>`
    )
    .join("");
}

function renderDashboard() {
  const canManageOrders = ["admin", "super_admin", "manager", "supervisor", "representative"].includes(currentUserProfile?.role);
  renderUserOrders(canManageOrders);
}

function renderUserOrders(canManageOrders = false) {
  const userOrders = orderRequests;
  if (userOrders.length === 0) {
    ordersEmpty.style.display = "block";
    ordersList.innerHTML = "";
    return;
  }

  ordersEmpty.style.display = "none";
  ordersList.innerHTML = userOrders
    .map((order, idx) => renderOrderCard(order, idx, canManageOrders))
    .join("");
}

function renderProfileOrders(canManageOrders = false) {
  if (!profileOrdersList || !profileOrdersEmpty) return;
  const userOrders = orderRequests;
  if (userOrders.length === 0) {
    profileOrdersEmpty.style.display = "block";
    profileOrdersList.innerHTML = "";
    return;
  }

  profileOrdersEmpty.style.display = "none";
  profileOrdersList.innerHTML = userOrders
    .map((order, idx) => renderOrderCard(order, idx, canManageOrders))
    .join("");
}

function renderOrderCard(order, idx, canManageOrders) {
  const isCompleted = isCompletedOrder(order);
  return `
      <article class="dashboard-card">
        <div class="dashboard-card-header">
          <div>
            <h3>${order.customerName}</h3>
            <span>${order.company}</span>
          </div>
          <div class="status ${String(order.status || "").toLowerCase()}">${order.status}</div>
        </div>
        <p><strong data-ar="القطعة:" data-en="Part:">القطعة:</strong> ${order.product}</p>
        <p><strong data-ar="الكمية:" data-en="Quantity:">الكمية:</strong> ${order.quantity}</p>
        <p><strong data-ar="أولوية الطلب:" data-en="Priority:">أولوية الطلب:</strong> ${order.priority}</p>
        <p><strong data-ar="التسليم إلى:" data-en="Delivery:">التسليم إلى:</strong> ${order.location}</p>
        <p><strong data-ar="ملاحظات:" data-en="Notes:">ملاحظات:</strong> ${order.notes || "-"}</p>
        ${isCompleted ? `<p><strong data-ar="العمولة:" data-en="Commission:">العمولة:</strong> ${formatDinar(order.commissionAmount)}</p>` : ""}
        <p><strong data-ar="تاريخ الطلب:" data-en="Requested on:">تاريخ الطلب:</strong> ${new Date(order.createdAt || order.created_at).toLocaleString(currentLang === "ar" ? "ar-SA" : "en-US", { dateStyle: "medium", timeStyle: "short" })}</p>
        <div class="dashboard-actions">
          ${canManageOrders && !isCompleted ? `
            <button type="button" class="btn secondary" data-action="complete" data-index="${idx}" data-ar="إكمال العملية" data-en="Complete Operation">إكمال العملية</button>
            <button type="button" class="btn secondary" data-action="reject" data-index="${idx}" data-ar="رفض" data-en="Reject">رفض</button>
          ` : ""}
        </div>
      </article>
    `;
}

function updateLanguage() {
  document.documentElement.lang = currentLang;
  document.documentElement.dir = currentLang === "ar" ? "rtl" : "ltr";
  document.querySelectorAll("[data-ar]").forEach((el) => {
    el.textContent = currentLang === "ar" ? el.dataset.ar : el.dataset.en;
  });
  document.querySelectorAll("[data-ar-placeholder]").forEach((el) => {
    el.placeholder = currentLang === "ar" ? el.dataset.arPlaceholder : el.dataset.enPlaceholder;
  });
  if (langToggle) {
    langToggle.textContent = currentLang === "ar" ? "العربية | English" : "English | العربية";
  }
  if (langText) {
    langText.textContent = currentLang === "ar" ? "EN" : "AR";
  }
}

function toggleLang() {
  currentLang = currentLang === "ar" ? "en" : "ar";
  updateLanguage();
}

window.toggleLang = toggleLang;

function populateAccountTypeSelect() {
  if (!accountTypeSelect) return;

  const placeholder = currentLang === "ar" ? "اختر نوع الحساب" : "Select account type";
  accountTypeSelect.innerHTML = `<option value="">${placeholder}</option>`;

  accountTypes.forEach((item) => {
    const option = document.createElement("option");
    option.value = item.label;
    option.textContent = item.label;
    option.dataset.category = item.category || "";
    accountTypeSelect.appendChild(option);
  });

  if (selectedAccountType) {
    accountTypeSelect.value = selectedAccountType;
  }
}

async function loadAccountTypes() {
  if (typeof fetchAccountTypes !== "function") {
    populateAccountTypeSelect();
    return;
  }

  const { data, error } = await fetchAccountTypes();
  if (!error && Array.isArray(data) && data.length > 0) {
    accountTypes = data.map((item) => ({ label: item.label, category: item.category }));
  }

  populateAccountTypeSelect();
}

function setRegistrationStep(step) {
  stepperItems.forEach((item) => {
    item.classList.toggle("active", Number(item.dataset.step) === step);
  });
}

function renderProfilePage() {
  const profilePageElement = document.getElementById("profile-page");
  if (!profilePageElement) return;
  if (!currentUser || !currentUserProfile) {
    profilePageElement.style.display = "none";
    return;
  }

  profilePageElement.style.display = "block";
  const profileNameText = currentUserProfile.full_name || currentUser.email || "TIGER VVIP";

  const profileNameEl = document.getElementById("profile-name");
  const profileAccountTypeEl = document.getElementById("profile-account-type");
  const profilePhoneEl = document.getElementById("profile-phone");
  const profileEmailEl = document.getElementById("profile-email");
  const profilePictureEl = document.getElementById("profile-picture");
  const profileAccountTypeDetailEl = document.getElementById("profile-account-type-detail");
  const profileStatusEl = document.getElementById("profile-status");
  const profileSubscriptionEl = document.getElementById("profile-subscription");
  const profileOrdersCountEl = document.getElementById("profile-orders-count");
  const profileJoinedEl = document.getElementById("profile-joined");

  const cityText = currentUserProfile.city || currentUserProfile.location || profileMeta?.city || "--";
  const addressText = currentUserProfile.address || profileMeta?.address || currentUserProfile.location || "--";
  const phoneText = currentUserProfile.phone || currentUser.phone || "--";

  if (profileNameEl) profileNameEl.textContent = profileNameText;
  if (profileAccountTypeEl) profileAccountTypeEl.textContent = currentUserProfile.account_type || currentUserProfile.role || "";
  if (profileBusinessType) {
    profileBusinessType.textContent = currentUserProfile.specialization || currentUserProfile.account_category || "--";
  }
  if (profilePhoneEl) profilePhoneEl.textContent = phoneText;
  if (profileEmailEl) profileEmailEl.textContent = currentUser.email || "";

  if (profileAccountTypeDetailEl) {
    profileAccountTypeDetailEl.textContent = currentUserProfile.account_type || currentUserProfile.role || "غير محدد";
  }
  if (profileStatusEl) {
    profileStatusEl.textContent = currentUserProfile.business_status || (currentUserProfile.active === false ? (currentLang === "ar" ? "موقوف" : "Inactive") : (currentLang === "ar" ? "نشط" : "Active"));
  }
  if (profileSubscriptionEl) {
    profileSubscriptionEl.textContent = currentUserProfile.subscription || "أساسي";
  }
  if (profileOrdersCountEl) {
    profileOrdersCountEl.textContent = orderRequests.length || 0;
  }
  if (profileJoinedEl) {
    const createdAt = currentUserProfile.created_at ? new Date(currentUserProfile.created_at) : new Date();
    profileJoinedEl.textContent = createdAt.toLocaleDateString(currentLang === "ar" ? "ar-SA" : "en-US", { year: "numeric", month: "short" });
  }

  if (profileBio) {
    profileBio.textContent = currentUserProfile.business_description || profileMeta?.about_text || (currentLang === "ar" ? "هذا ملفك الشخصي. يمكنك التحكم في معلومات حسابك من هنا." : "This is your profile page.");
  }

  if (profileQuickPhone) profileQuickPhone.textContent = phoneText;
  if (profileQuickCity) profileQuickCity.textContent = cityText;
  if (profileQuickAddress) profileQuickAddress.textContent = addressText;
  if (profileQuickPhotos) profileQuickPhotos.textContent = String(profileGallery.length || 0);
  if (profileQuickServices) profileQuickServices.textContent = String(profileServices.length || 0);
  if (profileQuickParts) profileQuickParts.textContent = String(profileParts.length || 0);
  if (profilePartsSummary) profilePartsSummary.textContent = String(profileParts.length || 0);

  if (profileContactPhone) profileContactPhone.textContent = phoneText;
  if (profileContactCity) profileContactCity.textContent = cityText;
  if (profileContactAddress) profileContactAddress.textContent = addressText;
  if (profileContactEmail) profileContactEmail.textContent = currentUser.email || "--";
  if (profileContactDescription) {
    profileContactDescription.textContent = currentUserProfile.business_description || profileMeta?.about_text || "--";
  }

  if (profileVerifiedBadge) {
    profileVerifiedBadge.style.display = currentUserProfile.is_approved ? "inline-flex" : "none";
  }
  if (profileActiveIndicator) {
    profileActiveIndicator.style.display = currentUser ? "block" : "none";
  }

  renderFinancialSummary(buildCommissionSummary(orderRequests));

  const initial = (profileNameText || "T").charAt(0).toUpperCase();
  if (profilePictureEl) {
    profilePictureEl.src = currentUserProfile.avatar_url || `https://via.placeholder.com/168/1877F2/ffffff?text=${initial}`;
    profilePictureEl.alt = profileNameText;
  }
  if (profileCover) {
    const coverUrl = currentUserProfile.cover_url || profileMeta?.cover_image_url || "";
    profileCover.style.backgroundImage = coverUrl ? `url('${coverUrl}')` : "linear-gradient(120deg, #dfe9f3 0%, #ffffff 100%)";
  }

  updateFloatingContactActions(phoneText);
  updateProfileShareActions(profileNameText, phoneText);

  renderProfileGallery();
  renderProfileServices();
  renderProfileParts();
  renderProfileReviewRequests();
  renderProfileOrders(isStaffRole(currentUserProfile?.role));

    // ملء عناصر تصميم فيسبوك الجديدة
    const initial = (profileNameText || "T").charAt(0).toUpperCase();
    const miniAvatar = document.getElementById("fb-mini-avatar-text");
    if (miniAvatar) miniAvatar.textContent = initial;

    const aboutType = document.getElementById("profile-about-type");
    const aboutSub = document.getElementById("profile-about-sub");
    const aboutStatus = document.getElementById("profile-about-status");
    const aboutJoined = document.getElementById("profile-about-joined");
    const aboutCity = document.getElementById("profile-about-city");
    const aboutEmail = document.getElementById("profile-about-email");
    const ordersCountSide = document.getElementById("profile-orders-count-side");
    const partsSide = document.getElementById("profile-parts-side");

    if (aboutType) aboutType.textContent = currentUserProfile.account_type || currentUserProfile.role || "غير محدد";
    if (aboutSub) aboutSub.textContent = currentUserProfile.subscription || "أساسي";
    if (aboutStatus) aboutStatus.textContent = currentUserProfile.business_status || (currentLang === "ar" ? "نشط" : "Active");
    if (aboutJoined) {
      const createdAt2 = currentUserProfile.created_at ? new Date(currentUserProfile.created_at) : new Date();
      aboutJoined.textContent = createdAt2.toLocaleDateString(currentLang === "ar" ? "ar-SA" : "en-US", { year: "numeric", month: "long" });
    }
    if (aboutCity) aboutCity.textContent = currentUserProfile.city || currentUserProfile.location || "--";
    if (aboutEmail) aboutEmail.textContent = currentUser.email || "--";
    if (ordersCountSide) ordersCountSide.textContent = orderRequests.length || 0;
    if (partsSide) partsSide.textContent = String(profileParts.length || 0);

    // تبويب المندوب - العمولات
    const repTab = document.getElementById("profile-rep-tab");
    if (repTab) repTab.style.display = isStaffRole(currentUserProfile?.role) ? "block" : "none";

    // عرض آخر الطلبات في الفيد
    const ordersListMini = document.getElementById("profile-orders-list");
    const ordersListFull = document.getElementById("profile-orders-full");
    if (ordersListMini || ordersListFull) {
      const recentOrders = orderRequests.slice(0, 3);
      const allOrdersHtml = orderRequests.map(o => `
        <div class="fb-order-item">
          <div class="fb-order-icon">📦</div>
          <div class="fb-order-info">
            <strong>${o.product || o.part_name || "طلب"}</strong>
            <span>${o.company || o.customer_name || ""} • ${new Date(o.created_at || Date.now()).toLocaleDateString("ar-SA")}</span>
          </div>
          <span class="fb-order-status ${o.status === 'Approved' ? 'approved' : o.status === 'Rejected' ? 'rejected' : 'pending'}">${o.status || "معلق"}</span>
        </div>`).join("") || `<p class="fb-empty-state" data-ar="لا توجد طلبات بعد" data-en="No orders yet">لا توجد طلبات بعد</p>`;
      const recentHtml = recentOrders.map(o => `
        <div class="fb-order-item">
          <div class="fb-order-icon">📦</div>
          <div class="fb-order-info">
            <strong>${o.product || o.part_name || "طلب"}</strong>
            <span>${o.company || o.customer_name || ""} • ${new Date(o.created_at || Date.now()).toLocaleDateString("ar-SA")}</span>
          </div>
          <span class="fb-order-status ${o.status === 'Approved' ? 'approved' : o.status === 'Rejected' ? 'rejected' : 'pending'}">${o.status || "معلق"}</span>
        </div>`).join("") || `<p class="fb-empty-state">لا توجد طلبات بعد</p>`;
      if (ordersListMini) ordersListMini.innerHTML = recentHtml;
      if (ordersListFull) ordersListFull.innerHTML = allOrdersHtml;
    }
  runProfileSearch();
}

if (editProfileButton) {
  editProfileButton.addEventListener("click", async () => {
    if (!currentUser) return;
    const about = window.prompt(currentLang === "ar" ? "أدخل نبذة مختصرة" : "Enter short about text", profileMeta?.about_text || currentUserProfile?.business_description || "");
    if (about === null) return;

    const cover = window.prompt(currentLang === "ar" ? "أدخل رابط صورة الغلاف" : "Enter cover image URL", profileMeta?.cover_image_url || currentUserProfile?.cover_url || "");
    if (cover === null) return;

    const metaPayload = {
      user_id: currentUser.id,
      about_text: about,
      cover_image_url: cover || null,
      contact_phone: currentUserProfile.phone || null,
      city: currentUserProfile.city || currentUserProfile.location || null,
      address: currentUserProfile.address || currentUserProfile.location || null,
    };

    const metaRes = await upsertProfileMeta(metaPayload);
    if (metaRes.error) {
      showMessage(metaRes.error.message || (currentLang === "ar" ? "فشل تحديث بيانات البروفايل." : "Failed to update profile."), "error", orderMessage);
      return;
    }

    profileMeta = { ...(profileMeta || {}), ...metaPayload };
    renderProfilePage();
    showMessage(currentLang === "ar" ? "تم تحديث البروفايل." : "Profile updated.", "success", orderMessage);
  });
}

document.querySelectorAll(".profile-tab-btn").forEach((button) => {
  button.addEventListener("click", () => {
    switchProfileTab(button.dataset.profileTab);
  });
});

if (shareProfileButton) {
  shareProfileButton.addEventListener("click", async () => {
    const shareUrl = buildProfileShareUrl();
    try {
      await navigator.clipboard.writeText(shareUrl);
      showMessage(currentLang === "ar" ? "تم نسخ رابط البروفايل." : "Profile link copied.", "success", orderMessage);
    } catch (_error) {
      showMessage(currentLang === "ar" ? `انسخ الرابط يدوياً: ${shareUrl}` : `Copy this link manually: ${shareUrl}`, "success", orderMessage);
    }
  });
}

function renderHomeFeed() {
  const feedContent = document.getElementById("home-feed-content");
  if (!feedContent) return;

  const source = catalogParts.length > 0 ? catalogParts : getFallbackCatalogParts().map(normalizeCatalogPart);
  const sortedSource = [...source].sort((left, right) => {
    const sortMode = homeFilterDropdown?.value || "recent";

    if (sortMode === "price-low") {
      return Number(left.price_jod || 0) - Number(right.price_jod || 0);
    }

    if (sortMode === "price-high") {
      return Number(right.price_jod || 0) - Number(left.price_jod || 0);
    }

    if (sortMode === "popular") {
      const leftPopularity = Number(left.request_count || left.order_count || left.review_count || 0);
      const rightPopularity = Number(right.request_count || right.order_count || right.review_count || 0);
      return rightPopularity - leftPopularity;
    }

    const leftCreatedAt = new Date(left.created_at || 0).getTime();
    const rightCreatedAt = new Date(right.created_at || 0).getTime();
    return rightCreatedAt - leftCreatedAt;
  });
  
  feedContent.innerHTML = sortedSource
    .map(product => `
      <div class="service-card">
        <h3>${product.name}</h3>
        <p><strong data-ar="الماركة:" data-en="Brand:">الماركة:</strong> ${product.brand || "-"}</p>
        <p><strong data-ar="الموديل:" data-en="Model:">الموديل:</strong> ${product.model || "-"}</p>
        <p>${product.description}</p>
        <div class="price">${formatDinar(product.price_jod)}</div>
        <div class="service-actions">
           <a href="tel:+962780003302" class="call-button" data-ar="اتصال" data-en="Call">📞 اتصال</a>
           <a href="https://wa.me/962780003302?text=أنا%20مهتم%20ب${encodeURIComponent(product.name)}" target="_blank" class="whatsapp-button" data-ar="واتساب" data-en="WhatsApp">💬 واتساب</a>
        </div>
      </div>
    `)
    .join("");
  updateLanguage();
}

function showRegistrationMessage(text, type = "success") {
  regMessage.textContent = text;
  regMessage.className = `form-message ${type}`;
  regMessage.style.display = "block";
  setTimeout(() => {
    regMessage.style.display = "none";
    regMessage.className = "form-message";
  }, 5000);
}

function validatePhoneNumber(value) {
  const normalized = value.trim();
  const pattern = /^\+\d[\d\s()-]{7,24}$/;
  return pattern.test(normalized);
}

function resetRegistrationFlow() {
  selectedAccountType = null;
  selectedAccountCategory = null;
  if (accountTypeSelect) {
    accountTypeSelect.value = "";
  }
  registrationPhone.value = "";
  registrationName?.value && (registrationName.value = "");
  registrationOtp.value = "";
  registrationProfileForm.reset();
  registrationForm.classList.remove("hidden");
  otpSection.classList.add("hidden");
  profileSection.classList.add("hidden");
  registrationNameRow?.classList.add("hidden");
  registrationImageRow?.classList.add("hidden");
  registrationFullnameRow?.classList.remove("hidden");
  registrationAddressRow?.classList.remove("hidden");
  setRegistrationStep(1);
  registrationOtpVerified = false;
}

function completeInitialRegistration() {
  registrationForm.classList.add("hidden");
  otpSection.classList.remove("hidden");
  setRegistrationStep(2);
  registrationStepTitle.textContent = currentLang === "ar" ? "الخطوة 2: التحقق من رقم الهاتف" : "Step 2: Verify your phone";
}

function updateRegistrationMode() {
  const isBuyer = selectedAccountType === "مشتري";
  registrationNameRow?.classList.toggle("hidden", !isBuyer);
  registrationImageRow?.classList.toggle("hidden", !isBuyer);
  registrationFullnameRow?.classList.toggle("hidden", isBuyer);
  registrationAddressRow?.classList.toggle("hidden", isBuyer);

  const profileDescription = document.getElementById("profile-section-description");
  if (profileDescription) {
    profileDescription.textContent = isBuyer
      ? currentLang === "ar"
        ? "للمشترين يكفي إكمال البريد وكلمة المرور لإنشاء الحساب."
        : "Buyers only need email and password to create the account."
      : currentLang === "ar"
        ? "أكمل معلوماتك الأساسية لإتمام التسجيل."
        : "Complete your basic information to finish registration.";
  }
}

function showProfileCompletion() {
  otpSection.classList.add("hidden");
  profileSection.classList.remove("hidden");
  setRegistrationStep(3);
  registrationStepTitle.textContent = currentLang === "ar" ? "الخطوة 3: أكمل بياناتك الأساسية" : "Step 3: Complete your profile";
}

if (accountTypeSelect) {
  accountTypeSelect.addEventListener("change", () => {
    selectedAccountType = accountTypeSelect.value || null;
    const selectedOption = accountTypeSelect.options[accountTypeSelect.selectedIndex];
    selectedAccountCategory = selectedOption?.dataset.category || null;
    updateRegistrationMode();
  });
}

if (registrationForm) {
registrationForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (accountTypeSelect && !selectedAccountType) {
    selectedAccountType = accountTypeSelect.value || null;
    const selectedOption = accountTypeSelect.options[accountTypeSelect.selectedIndex];
    selectedAccountCategory = selectedOption?.dataset.category || null;
  }

  if (!selectedAccountType) {
    showRegistrationMessage(currentLang === "ar" ? "اختر نوع الحساب من القائمة أولاً." : "Choose an account type from the list first.", "error");
    return;
  }

  const phoneValue = registrationPhone.value.trim();
  if (!validatePhoneNumber(phoneValue)) {
    showRegistrationMessage(currentLang === "ar" ? "أدخل رقم هاتف صحيح مع رمز الدولة." : "Enter a valid phone number with country code.", "error");
    return;
  }

  if (selectedAccountType === "مشتري") {
    if (!registrationName.value.trim()) {
      showRegistrationMessage(currentLang === "ar" ? "يرجى إدخال اسم المشتري." : "Please enter the buyer name.", "error");
      return;
    }
    if (registrationImage && registrationImage.files.length === 0) {
      showRegistrationMessage(currentLang === "ar" ? "يرجى رفع صورة خاصة بالمشتري." : "Please upload a buyer image.", "error");
      return;
    }
  }

  const sent = await sendRegistrationOtp();
  if (sent) {
    showRegistrationMessage(currentLang === "ar" ? "تم قبول البيانات الأولية. يرجى إدخال رمز التحقق." : "Primary data accepted. Please enter the verification code.", "success");
    completeInitialRegistration();
  }
});
}

if (cleanRegistrationForm) {
  cleanRegistrationForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const emailValue = cleanRegistrationEmail?.value.trim();
    if (!emailValue) {
      return;
    }

    if (cleanVerificationStep) {
      cleanVerificationStep.style.display = "block";
    }
  });
}

if (cleanContinueToProfileButton) {
  cleanContinueToProfileButton.addEventListener("click", () => {
    window.location.hash = "#profile-page";
    updatePageVisibility();
  });
}

if (verifyOtpButton) {
  verifyOtpButton.addEventListener("click", async () => {
    await verifyRegistrationOtp();
  });
}

if (completeRegistrationButton) {
completeRegistrationButton.addEventListener("click", async () => {
  if (!hasWorkingSupabaseConfig()) {
    const emailDemo = document.getElementById("registration-email").value.trim();
    const passwordDemo = document.getElementById("registration-password").value.trim();
    const fullnameDemo = selectedAccountType === "مشتري" ? registrationName.value.trim() : document.getElementById("registration-fullname").value.trim();
    const addressDemo = document.getElementById("registration-address").value.trim();

    if (!emailDemo || !passwordDemo) {
      showRegistrationMessage(currentLang === "ar" ? "يرجى إدخال البريد الإلكتروني وكلمة المرور." : "Please enter email and password.", "error");
      return;
    }

    if (!registrationOtpVerified) {
      showRegistrationMessage(currentLang === "ar" ? "يجب التحقق من OTP أولاً." : "You must verify OTP first.", "error");
      return;
    }

    const isBuyerDemo = selectedAccountType === "مشتري";
    let roleDemo = "dealer";
    if (isBuyerDemo) {
      roleDemo = "buyer";
    } else if (selectedAccountType === "المدير العام") {
      roleDemo = "admin";
    } else if (selectedAccountType === "مدير منطقة") {
      roleDemo = "manager";
    } else if (selectedAccountType === "مشرف") {
      roleDemo = "supervisor";
    } else if (selectedAccountType === "مندوب") {
      roleDemo = "representative";
    }

    const createdDemo = createDemoUser({
      email: emailDemo,
      password: passwordDemo,
      full_name: fullnameDemo,
      phone: registrationPhone.value.trim(),
      role: roleDemo,
      account_type: selectedAccountType,
      account_category: selectedAccountCategory,
      address: addressDemo,
    });

    if (createdDemo.error) {
      showRegistrationMessage(createdDemo.error, "error");
      return;
    }

    currentUser = { id: createdDemo.user.id, email: createdDemo.user.email };
    currentUserProfile = { ...(createdDemo.user.profile || {}) };
    updateRoleBasedNavigation();
    displayUser(currentUser);
    resetRegistrationFlow();
    showRegistrationMessage(currentLang === "ar" ? "تم إنشاء الحساب (وضع تجريبي)." : "Account created (demo mode).", "success");
    window.location.hash = "#profile-page";
    updatePageVisibility();
    return;
  }

  const email = document.getElementById("registration-email").value.trim();
  const password = document.getElementById("registration-password").value.trim();
  const fullnameValue = selectedAccountType === "مشتري" ? registrationName.value.trim() : document.getElementById("registration-fullname").value.trim();
  const address = document.getElementById("registration-address").value.trim();

  if (!email || !password) {
    showRegistrationMessage(currentLang === "ar" ? "يرجى إدخال البريد الإلكتروني وكلمة المرور." : "Please enter email and password.", "error");
    return;
  }

  const duplicateEmail = await fetchProfileByEmail(email);
  if (duplicateEmail.data) {
    showRegistrationMessage(currentLang === "ar" ? "البريد الإلكتروني مستخدم مسبقًا." : "Email is already registered.", "error");
    return;
  }

  if (!registrationOtpVerified) {
    showRegistrationMessage(currentLang === "ar" ? "يجب التحقق من OTP أولاً." : "You must verify OTP first.", "error");
    return;
  }

  const duplicatePhone = await fetchProfileByPhone(registrationPhone.value.trim());
  if (duplicatePhone.data) {
    showRegistrationMessage(currentLang === "ar" ? "رقم الهاتف مستخدم مسبقًا." : "Phone is already registered.", "error");
    return;
  }

  const response = await signUp(email, password);
  if (response.error) {
    showRegistrationMessage(response.error.message || (currentLang === "ar" ? "حدث خطأ أثناء إنشاء الحساب." : "An error occurred while creating the account."), "error");
    return;
  }

  const isBuyer = selectedAccountType === "مشتري";
  let role = "dealer";
  if (isBuyer) {
    role = "buyer";
  } else if (selectedAccountType === "المدير العام") {
    role = "admin";
  } else if (selectedAccountType === "مدير منطقة") {
    role = "manager";
  } else if (selectedAccountType === "مشرف") {
    role = "supervisor";
  } else if (selectedAccountType === "مندوب") {
    role = "representative";
  }

  const requiresApproval = isStaffRole(role) || role === "admin";

  const profilePayload = {
    id: response.data.user.id,
    full_name: fullnameValue || null,
    company: isBuyer ? null : selectedAccountCategory || null,
    email,
    role,
    is_approved: !requiresApproval,
    subscription: "basic",
    phone: registrationPhone.value.trim(),
    account_type: selectedAccountType,
    account_category: selectedAccountCategory,
    created_at: new Date().toISOString(),
  };

  const profileResult = await createProfile(profilePayload);
  if (profileResult.error) {
    showRegistrationMessage(profileResult.error.message || (currentLang === "ar" ? "فشل حفظ البيانات الأساسية." : "Failed to save profile data."), "error");
    return;
  }

  currentUser = response.data.user;
  currentUserProfile = await ensureUserProfile(currentUser.id);

  if (requiresApproval) {
    if (typeof createApprovalRequest === "function") {
      await createApprovalRequest({
        target_type: "account",
        target_id: response.data.user.id,
        title: fullnameValue || email,
        requester_id: response.data.user.id,
        details: {
          account_type: selectedAccountType,
          account_category: selectedAccountCategory,
          phone: registrationPhone.value.trim(),
        },
        status: "pending",
      });
    }

    await signOut();
    currentUser = null;
    currentUserProfile = null;
    resetRegistrationFlow();
    window.location.hash = "#registration-page";
    showRegistrationMessage(
      currentLang === "ar"
        ? "تم إنشاء الحساب بنجاح وهو الآن بانتظار اعتماد المدير."
        : "Account created and pending admin approval.",
      "success"
    );
    return;
  }

  updateRoleBasedNavigation();
  displayUser(currentUser);
  await syncOrdersFromSupabase();
  await loadProfileAssets();
  resetRegistrationFlow();
  window.location.hash = "#profile-page";
});
}

if (registrationProfileForm && completeRegistrationButton) {
  registrationProfileForm.addEventListener("submit", (event) => {
    event.preventDefault();
    completeRegistrationButton.click();
  });
}

if (searchInput) {
  searchInput.addEventListener("input", () => {
    runAdvancedSearch();
  });
}

if (applyAdvancedSearchButton) {
  applyAdvancedSearchButton.addEventListener("click", () => {
    runAdvancedSearch();
  });
}

if (resetAdvancedSearchButton) {
  resetAdvancedSearchButton.addEventListener("click", async () => {
    resetAdvancedSearchControls();
    await loadCatalogParts();
  });
}

if (profileAdvancedSearchForm) {
  profileAdvancedSearchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    runProfileSearch();
  });
}

if (profileSearchReset) {
  profileSearchReset.addEventListener("click", () => {
    if (profileSearchBrand) profileSearchBrand.value = "";
    if (profileSearchModel) profileSearchModel.value = "";
    if (profileSearchYear) profileSearchYear.value = "";
    if (profileSearchBodyType) profileSearchBodyType.value = "";
    if (profileSearchCategory) profileSearchCategory.value = "";
    runProfileSearch();
  });
}

[profileSearchBrand, profileSearchModel, profileSearchYear, profileSearchBodyType, profileSearchCategory].forEach((control) => {
  if (!control) return;
  control.addEventListener("change", runProfileSearch);
});

[filterBrand, filterModel, filterYear, filterBodyType, filterCategory].forEach((control) => {
  if (!control) return;
  control.addEventListener("change", () => {
    runAdvancedSearch();
  });
});

if (partForm) {
  [partNameArInput, partNameEnInput, partPriceInput, partImageInput].forEach((field) => {
    if (!field) return;
    field.addEventListener("input", updatePartSaveButtonState);
    field.addEventListener("change", updatePartSaveButtonState);
  });

  if (partImageInput) {
    partImageInput.addEventListener("change", () => {
      const file = partImageInput.files && partImageInput.files[0];
      previewPartImage(file || null);
    });
  }

  if (partVehicleSelect) {
    partVehicleSelect.addEventListener("change", applySelectedVehicleToPartForm);
  }

  updatePartSaveButtonState();

  partForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await handleCreatePart();
    renderHomeFeed();
  });
}

if (serviceForm) {
  serviceForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await handleCreateService();
  });
}

if (galleryForm) {
  galleryForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await handleCreateGalleryImage();
  });
}

document.addEventListener("click", (event) => {
  const routeLink = event.target.closest('a[href^="#"]');
  if (routeLink) {
    const targetHash = routeLink.getAttribute("href");
    if (targetHash && targetHash !== "#") {
      event.preventDefault();
      navigateToHash(targetHash);
      return;
    }
  }

  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const action = button.dataset.action;
  const index = Number(button.dataset.index);
  const userId = button.dataset.userId;
  const reviewId = Number(button.dataset.reviewId);
  const approvalId = Number(button.dataset.approvalId);

  if (action === "order") {
    productGrid.scrollIntoView({ behavior: "smooth" });
    if (displayedCatalogParts[index]) {
      orderProduct.value = displayedCatalogParts[index].name;
    }
    return;
  }

  if (action === "request-review" && displayedCatalogParts[index]) {
    handleCreateReviewRequest(displayedCatalogParts[index]);
    return;
  }

  if (action === "toggle-part-details") {
    const card = button.closest(".profile-part-card");
    if (card) {
      card.classList.toggle("details-open");
    }
    return;
  }

  if (action === "update-part-price" && displayedCatalogParts[index]) {
    handleUpdatePartPrice(displayedCatalogParts[index]);
    return;
  }

  if (action === "toggle-part-status" && displayedCatalogParts[index]) {
    handleTogglePartStatus(displayedCatalogParts[index]);
    return;
  }

  if ((action === "complete" || action === "reject") && orderRequests[index]) {
    handleOrderStatusAction(action, orderRequests[index]);
  }

  if (action === "approve-user" && userId) {
    handleApproveProfile(userId);
  }

  if (action === "pay-weekly" && userId) {
    handleWeeklyPay(userId);
  }

  if (action === "reply-review" && reviewId) {
    handleAdminReply(reviewId);
  }

  if (action === "approve-request" && approvalId) {
    handleApprovalDecision(approvalId, "approve");
    return;
  }

  if (action === "reject-request" && approvalId) {
    handleApprovalDecision(approvalId, "reject");
    return;
  }

  if (action === "set-pending-request" && approvalId) {
    handleApprovalDecision(approvalId, "pending");
    return;
  }

  if (action === "set-active-request" && approvalId) {
    handleApprovalDecision(approvalId, "active");
    return;
  }
});

async function handleOrderStatusAction(action, order) {
  if (!currentUser || !currentUserProfile) {
    return;
  }

  const nextStatus = action === "complete" ? "Completed" : "Rejected";
  const { error } = await updateOrderStatus(order.id, nextStatus, currentUser.id);
  if (error) {
    showMessage(messages.authError[currentLang], "error", orderMessage);
    return;
  }

  if (nextStatus === "Completed") {
    const completedAt = new Date().toISOString();
    const periodStart = getCommissionWindow(7).start.toISOString().slice(0, 10);
    const periodEnd = getCommissionWindow(7).end.toISOString().slice(0, 10);
    try {
      await createCommissionEntry({
        user_id: currentUser.id,
        order_id: order.id,
        amount: Number(order.commissionAmount || 0.75),
        status: "earned",
        cycle_type: "weekly",
        period_start: periodStart,
        period_end: periodEnd,
        earned_at: completedAt,
        notes: `Auto earned from ${order.id}`,
      });
    } catch (commissionError) {
      console.error(commissionError);
    }
  }

  await syncOrdersFromSupabase();
  await renderRepresentativeDashboard();
  await renderAdminDashboard();
  if (window.location.hash === "#profile-page") {
    renderProfilePage();
  }
}

async function submitAuthFormFromUI() {
  console.log("🔐 [auth] submitAuthFormFromUI called");
  window.__tigerAuthHandledAt = Date.now();
  const emailInput = document.getElementById("auth-email");
  const passwordInput = document.getElementById("auth-password");
  const email = emailInput?.value?.trim() || "";
  const password = passwordInput?.value?.trim() || "";
  console.log("🔐 [auth] inputs captured, calling handleAuthForm");
  await handleAuthForm(email, password);
  console.log("🔐 [auth] handleAuthForm completed");
}

if (authForm) {
  console.log("✓ authForm found, attaching submit listener");
  authForm.addEventListener("submit", async (event) => {
    console.log("🎯 authForm submit event triggered");
    event.preventDefault();
    await submitAuthFormFromUI();
  });
} else {
  console.warn("⚠️ authForm NOT found in DOM!");
}

if (authSubmitButton) {
  console.log("✓ authSubmitButton found, attaching click listener");
  authSubmitButton.addEventListener("click", async (event) => {
    console.log("🎯 authSubmitButton click event triggered");
    event.preventDefault();

    // If a user session already exists on this device, go directly to profile.
    if (currentUser && (currentUser.id || currentUser.email)) {
      window.location.hash = "#profile-page";
      updatePageVisibility();
      renderProfilePage();
      return;
    }

    await submitAuthFormFromUI();
  });
} else {
  console.warn("⚠️ authSubmitButton NOT found in DOM!");
}

if (authModeToggle) {
  authModeToggle.addEventListener("click", () => {
    // Open the saved accounts modal
    openAccountsModal();
  });
}

if (langToggle) {
  langToggle.addEventListener("click", toggleLang);
}

if (logoutButton) {
  logoutButton.addEventListener("click", async () => {
    await handleLogout();
  });
}

if (orderForm) {
orderForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!currentUser) {
    showMessage(messages.authError[currentLang], "error", orderMessage);
    return;
  }

  const newOrder = {
    customer_name: document.getElementById("order-name").value.trim(),
    company: document.getElementById("order-company").value.trim(),
    email: document.getElementById("order-email").value.trim(),
    phone: document.getElementById("order-phone").value.trim(),
    product: document.getElementById("order-product").value,
    quantity: Number(document.getElementById("order-quantity").value),
    location: document.getElementById("order-location").value.trim(),
    priority: document.getElementById("order-priority").value,
    notes: document.getElementById("order-notes").value.trim(),
    status: "Pending",
    created_at: new Date().toISOString(),
    user_id: currentUser.id,
  };

  const { error } = await createOrder(newOrder);
  if (error) {
    showMessage(messages.authError[currentLang], "error", orderMessage);
    return;
  }

  showMessage(messages.orderSent[currentLang], "success", orderMessage);
  orderForm.reset();
  if (catalogParts.length > 0) {
    orderProduct.value = catalogParts[0].name;
  }
  await syncOrdersFromSupabase();
  window.location.hash = "#user-orders";
});
}

function updateAuthPageMode() {
  const currentHash = window.location.hash;
  const isAuthFlow = currentHash === "#auth-section" || currentHash === "#registration-page";
  const isProfile = currentHash === "#profile-page";
  const isCleanRegistration = currentHash === "#registration-page";

  document.body.classList.toggle("login-page", isAuthFlow);
  document.body.classList.toggle("profile-page", isProfile);
  document.body.classList.toggle("clean-registration-page", isCleanRegistration);

  if (profilePage) {
    profilePage.style.display = isProfile ? "block" : "none";
  }

  if (isProfile) {
    renderProfilePage();
  }
}

function syncQuickNavWithHash() {
  if (!quickNavSelect) return;
  const currentHash = window.location.hash || "#auth-section";
  const hasOption = Array.from(quickNavSelect.options).some((option) => option.value === currentHash);
  quickNavSelect.value = hasOption ? currentHash : "";
}

function navigateToHash(targetHash) {
  const normalizedHash = targetHash?.startsWith("#") ? targetHash : `#${targetHash || ""}`;
  if (!normalizedHash || normalizedHash === "#") return;

  if (window.location.hash !== normalizedHash) {
    window.location.hash = normalizedHash;
    return;
  }

  updateAuthPageMode();
  updatePageVisibility();
  syncQuickNavWithHash();

  const targetSection = document.getElementById(normalizedHash.slice(1));
  targetSection?.scrollIntoView({ behavior: "smooth", block: "start" });
}

window.addEventListener("hashchange", () => {
  previousAppHash = currentAppHash;
  currentAppHash = window.location.hash || "#auth-section";
  updateAuthPageMode();
  updatePageVisibility();
  syncQuickNavWithHash();
  updateBackButtonState();
});

if (quickNavSelect) {
  quickNavSelect.addEventListener("change", () => {
    const selectedHash = quickNavSelect.value;
    if (!selectedHash) return;
    navigateToHash(selectedHash);
  });
}

if (homeFilterDropdown) {
  homeFilterDropdown.addEventListener("change", () => {
    renderHomeFeed();
  });
}

if (homeSignoutLink) {
  homeSignoutLink.addEventListener("click", async (event) => {
    event.preventDefault();
    await handleLogout();
  });
}

if (appBackButton) {
  appBackButton.addEventListener("click", () => {
    navigateBackInApp();
  });
}

async function initializeApp() {
  console.log("📊 [init] loadAccountTypes starting...");
  try {
    await loadAccountTypes();
    console.log("✓ [init] loadAccountTypes complete");
  } catch (error) {
    console.error("[init] loadAccountTypes failed:", error);
    populateAccountTypeSelect();
  }

  console.log("📊 [init] loadCatalogParts starting...");
  try {
    await loadCatalogParts();
    console.log("✓ [init] loadCatalogParts complete");
  } catch (error) {
    console.error("[init] loadCatalogParts failed:", error);
    catalogParts = getFallbackCatalogParts().map(normalizeCatalogPart);
    displayedCatalogParts = [...catalogParts];
    populateAdvancedSearchFilters(catalogParts);
    renderProducts(displayedCatalogParts);
    populateProductOptions();
  }

  console.log("📊 [init] renderHomeFeed, renderDashboard, updateLanguage...");
  renderHomeFeed();
  renderDashboard();
  updateLanguage();
  updateAuthPageMode();
  syncQuickNavWithHash();
  updateBackButtonState();

  console.log("📊 [init] showAuthState starting...");
  try {
    await showAuthState();
    console.log("✓ [init] showAuthState complete");
  } catch (error) {
    console.error("[init] showAuthState failed:", error);
    currentUser = null;
    currentUserProfile = null;
    updateRoleBasedNavigation();
    displayUser(null);
    updatePageVisibility();
  }
  
  console.log("✓ App initialized successfully");
}

(async function startApp() {
  try {
    console.log("🔄 Starting app initialization...");
    await initializeApp();
    console.log("✅ App initialization complete");
  } catch (error) {
    console.error("❌ CRITICAL: App initialization failed:", error);
    console.error("Error stack:", error?.stack);
  }
})();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    const cacheResetKey = "tiger_vvip_cache_reset_v3";

    (async () => {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.unregister()));

        if ("caches" in window) {
          const cacheKeys = await caches.keys();
          await Promise.all(cacheKeys.map((key) => caches.delete(key)));
        }

        if (!sessionStorage.getItem(cacheResetKey)) {
          sessionStorage.setItem(cacheResetKey, "1");
          const url = new URL(window.location.href);
          url.searchParams.set("refresh", String(Date.now()));
          window.location.replace(url.toString());
          return;
        }
      } catch (error) {
        console.error("SW/cache reset failed", error);
      }
    })();
  });
}
