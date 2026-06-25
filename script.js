// 🚀 AUTOMATIC CACHE CLEANING AND PERFORMANCE OPTIMIZATION
(function initializePerformance() {
  // Auto-clear old cache entries every 30 minutes
  const CACHE_EXPIRY_MS = 30 * 60 * 1000;
  const CACHE_CLEANUP_KEY = 'last_cache_cleanup';
  
  function cleanOldCache() {
    const now = Date.now();
    const lastCleanup = localStorage.getItem(CACHE_CLEANUP_KEY) || 0;
    
    if (now - lastCleanup > CACHE_EXPIRY_MS) {
      // Clear old temporary data
      const keysToCheck = [
        'reg_temp_email', 'reg_email_verified', 'tempRegEmail',
        'auth_temp_code', 'auth_attempt_count'
      ];
      
      keysToCheck.forEach(key => {
        if (localStorage.getItem(key)) {
          localStorage.removeItem(key);
        }
      });
      
      // Clear service worker cache
      if ('caches' in window) {
        caches.keys().then(cacheNames => {
          cacheNames.forEach(cacheName => {
            caches.open(cacheName).then(cache => {
              cache.keys().then(requests => {
                requests.forEach(request => {
                  if (request.url.includes('old-') || request.url.includes('temp-')) {
                    cache.delete(request);
                  }
                });
              });
            });
          });
        });
      }
      
      localStorage.setItem(CACHE_CLEANUP_KEY, now);
      console.log('✅ Cache cleaned at', new Date().toISOString());
    }
  }
  
  // Run cleanup on app init
  cleanOldCache();
  
  // Schedule cleanup checks
  setInterval(cleanOldCache, 5 * 60 * 1000);
})();

// 💾 AUTO-SAVE STATE
(function initializeAutoSave() {
  const AUTO_SAVE_KEY = 'app_auto_save';
  const AUTO_SAVE_INTERVAL = 10 * 1000; // 10 seconds
  
  function autoSaveState() {
    const state = {
      currentLang: window.currentLang || 'ar',
      currentUser: window.currentUser || null,
      currentPage: window.location.hash || '#auth-section',
      timestamp: Date.now()
    };
    
    try {
      localStorage.setItem(AUTO_SAVE_KEY, JSON.stringify(state));
      console.log('💾 Auto-save completed');
    } catch (e) {
      console.warn('⚠️ Auto-save failed:', e);
    }
  }
  
  // Auto-save on page unload
  window.addEventListener('beforeunload', autoSaveState);
  
  // Periodic auto-save
  setInterval(autoSaveState, AUTO_SAVE_INTERVAL);
})();

// 🔧 PERFORMANCE OPTIMIZATION
(function optimizePerformance() {
  // Lazy load images
  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src || img.src;
          img.classList.add('loaded');
          observer.unobserve(img);
        }
      });
    });
    
    document.querySelectorAll('img[data-src]').forEach(img => imageObserver.observe(img));
  }
  
  // Debounce window resize
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      console.log('📐 Resize event processed');
    }, 250);
  });
})();

const products = [
  {
    title: "فلتر هواء أصلي",
    model: "BMW X5 G05",
    description: "فلتر هواء عالي الجودة للحفاظ على أداء المحرك وسلامته.",
    price: "65 دينار",
  },
  {
    title: "كشاف LED أمامي",
    model: "Mercedes S-Class",
    description: "مصابيح LED فاخرة مع توازن ضوء ممتاز ومقاومة للماء.",
    price: "235 دينار",
  },
  {
    title: "طقم فرامل رياضي",
    model: "Audi Q7",
    description: "فرامل عالية الأداء مع تبريد محسّن وتحمل أكبر.",
    price: "395 دينار",
  },
  {
    title: "غطاء مقعد جلد فئة VVIP",
    model: "Range Rover",
    description: "غطاء مقعد فاخر مع جلد ناعم وحماية إضافية للأثاث.",
    price: "340 دينار",
  },
  {
    title: "بطارية AGM",
    model: "Lexus LX",
    description: "بطارية قوة عالية طويلة العمر لجميع احتياجات السيارات الفاخرة.",
    price: "185 دينار",
  },
  {
    title: "مجموعة صيانة عاجلة",
    model: "Toyota Land Cruiser",
    description: "مجموعة قطع غيار أساسية للصيانة السريعة والخدمة العاجلة.",
    price: "135 دينار",
  },
];

console.log("📝 ===============================");
console.log("📝 script.js loading started");
console.log("📝 ===============================");

const productGrid = document.getElementById("product-grid") || document.getElementById("products-feed-grid");
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
const authLogoutButton = document.getElementById("auth-logout-button");
const authMessage = document.getElementById("auth-message");
const authAvatarClickable = document.getElementById("auth-avatar-clickable");
const authAvatarUploadInput = document.getElementById("auth-avatar-upload");
const authProfileAvatar = document.querySelector(".auth-profile-avatar");
const authProfileName = document.querySelector(".auth-profile-name");
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
const quickNavSelect = null;
const homeFilterDropdown = document.getElementById("home-filter-dropdown");
const homeSignoutLink = document.getElementById("home-signout-link");
const homeLogoutButton = document.getElementById("home-logout-button");
const headerLogoutButton = null;
const navProfileAvatar = null;
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

const ADMIN_ROLES = ["super_admin"];
const STAFF_ROLES = ["representative"];
const SESSION_DEVICE_KEY = "tiger_vvip_device_id";
const AUTH_AVATAR_STORAGE_KEY = "tiger_auth_avatar_data_url";
const WHATSAPP_OTP_ENDPOINT = window.WHATSAPP_OTP_ENDPOINT || "";
const DEMO_USERS_STORAGE_KEY = "tiger_vvip_demo_users";
const DEMO_OTP_CODE = "123456";

let previousAppHash = "";
let currentAppHash = window.location.hash || "#auth-section";

console.log("📝 DOM elements loaded:", {
  authForm: !!authForm,
  authSubmitButton: !!authSubmitButton,
  authMessage: !!authMessage,
  authEmail: !!document.getElementById("auth-email"),
  authPassword: !!document.getElementById("auth-password"),
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
        ? "📭 لا توجد حسابات محفوظة على هذا الجهاز.\n\nأنشئ حساباً جديداً من الصفحة الأولى ثم عُد هنا."
        : "📭 No saved accounts on this device.\n\nCreate a new account from the first page, then come back here."
    );
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
        <p>${currentLang === "ar" ? "أنشئ حساباً جديداً من الصفحة الأولى (إنشاء حساب جديد)." : "Create an account from the first page (Create New Account)."}</p>
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
  let accounts = [];
  try {
    const parsedAccounts = JSON.parse(localStorage.getItem("savedAccounts") || "[]");
    accounts = Array.isArray(parsedAccounts) ? parsedAccounts : [];
  } catch (_error) {
    accounts = [];
  }

  const account = accounts[index];

  if (!account) return;

  // حفظ الحساب الحالي / Save the current account
  localStorage.setItem("currentUser", JSON.stringify(account));
  currentUser = account;
  currentUserProfile = account.profile || {};
  if (authProfileName) {
    authProfileName.textContent = account.name || account.email?.split("@")[0] || "";
  }
  if (authProfileAvatar) {
    const initials = (account.initials || account.name || account.email || "").slice(0, 2).toUpperCase();
    authProfileAvatar.dataset.initials = initials;
  }
  if (account.photoUrl) {
    localStorage.setItem(AUTH_AVATAR_STORAGE_KEY, account.photoUrl);
    setAuthAvatar(account.photoUrl);
  } else {
    localStorage.removeItem(AUTH_AVATAR_STORAGE_KEY);
    setAuthAvatar("");
  }

  // إغلاق Modal والانتقال / Close modal and navigate
  closeAccountsModal();
  
  // رسالة تأكيد / Confirmation message
  showMessage(
    currentLang === "ar"
      ? `✅ تم اختيار الحساب: ${account.email}`
      : `✅ Account selected: ${account.email}`,
    "success",
    authMessage,
    300
  );

  setTimeout(() => {
    window.location.hash = "#auth-section";
    updatePageVisibility();
    updateRoleBasedNavigation();
  }, 500);
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

function rememberSignedInAccount(user, profile = null) {
  if (!user || !user.email) return;

  const email = String(user.email || "").trim().toLowerCase();
  if (!email) return;

  const accountName = String(profile?.full_name || user.email || "").trim();
  const initials = (accountName || email).slice(0, 2).toUpperCase();
  const photoUrl = profile?.avatar_url || localStorage.getItem(AUTH_AVATAR_STORAGE_KEY) || null;

  let accounts = [];
  try {
    const parsed = JSON.parse(localStorage.getItem("savedAccounts") || "[]");
    accounts = Array.isArray(parsed) ? parsed : [];
  } catch (_error) {
    accounts = [];
  }

  const nextAccount = {
    email,
    name: accountName || email.split("@")[0],
    initials,
    photoUrl,
    profile: profile || {},
    id: user.id || Date.now().toString(),
  };

  const existingIndex = accounts.findIndex((account) => String(account?.email || "").toLowerCase() === email);
  if (existingIndex >= 0) {
    accounts[existingIndex] = {
      ...accounts[existingIndex],
      ...nextAccount,
      profile: {
        ...(accounts[existingIndex]?.profile || {}),
        ...(profile || {}),
      },
    };
  } else {
    accounts.push(nextAccount);
  }

  localStorage.setItem("savedAccounts", JSON.stringify(accounts));
}

function setAuthAvatar(dataUrl) {
  if (!authProfileAvatar) return;

  if (dataUrl) {
    authProfileAvatar.style.backgroundImage = `url(${dataUrl})`;
    authProfileAvatar.classList.add("has-image");
    authProfileAvatar.textContent = "";
    return;
  }

  authProfileAvatar.style.backgroundImage = "";
  authProfileAvatar.classList.remove("has-image");
  authProfileAvatar.textContent = authProfileAvatar.dataset.initials || "NZ";
}

/**
 * 🔵 تحديث الصورة الدائرية في شريط العنوان (nav avatar)
 * Sync the header circular avatar with the current user photo / initials
 */
function updateNavAvatar(photoUrl, initials) {
  if (!navProfileAvatar) return;
  if (!photoUrl && !initials) {
    navProfileAvatar.style.display = "none";
    navProfileAvatar.style.backgroundImage = "";
    navProfileAvatar.classList.remove("has-image");
    navProfileAvatar.textContent = "";
    return;
  }
  navProfileAvatar.style.display = "flex";
  navProfileAvatar.style.alignItems = "center";
  navProfileAvatar.style.justifyContent = "center";
  navProfileAvatar.style.backgroundSize = "cover";
  navProfileAvatar.style.backgroundPosition = "center";
  navProfileAvatar.style.backgroundRepeat = "no-repeat";
  if (photoUrl) {
    navProfileAvatar.style.backgroundImage = `url(${photoUrl})`;
    navProfileAvatar.classList.add("has-image");
    navProfileAvatar.textContent = "";
  } else {
    navProfileAvatar.style.backgroundImage = "";
    navProfileAvatar.classList.remove("has-image");
    navProfileAvatar.textContent = (initials || "").slice(0, 2).toUpperCase();
  }
}

function resetAuthIdentityUI() {
  if (authProfileName) {
    authProfileName.textContent = "";
  }

  if (authProfileAvatar) {
    authProfileAvatar.style.backgroundImage = "";
    authProfileAvatar.classList.remove("has-image");
    authProfileAvatar.textContent = "";
  }
}

function handleAuthAvatarFile(file) {
  if (!file) return;
  if (!String(file.type || "").startsWith("image/")) {
    showMessage(currentLang === "ar" ? "الملف يجب أن يكون صورة." : "Please choose an image file.", "error", authMessage);
    return;
  }

  const reader = new FileReader();
  reader.onload = (event) => {
    const dataUrl = String(event.target?.result || "");
    if (!dataUrl) return;
    localStorage.setItem(AUTH_AVATAR_STORAGE_KEY, dataUrl);
    setAuthAvatar(dataUrl);
    showMessage(currentLang === "ar" ? "تم تحديث الصورة." : "Profile photo updated.", "success", authMessage, 250);
  };
  reader.readAsDataURL(file);
}

function initializeAuthAvatarPicker() {
  if (!authProfileAvatar) return;

  authProfileAvatar.dataset.initials = authProfileAvatar.textContent.trim() || "NZ";
  const savedAvatar = localStorage.getItem(AUTH_AVATAR_STORAGE_KEY);
  if (savedAvatar) {
    setAuthAvatar(savedAvatar);
  }

  // On avatar click, open image gallery directly
  authAvatarClickable?.addEventListener("click", () => {
    authAvatarUploadInput?.click();
  });

  // Handle file selection (from gallery or camera)
  authAvatarUploadInput?.addEventListener("change", (event) => {
    const file = event.target?.files?.[0];
    if (file) {
      handleAuthAvatarFile(file);
      event.target.value = "";
    }
  });
}

// ==========================================
// 🌐 FORM SUBMISSION HANDLER
// ==========================================

document.addEventListener("DOMContentLoaded", function () {
  // Selection-only modal: no add/delete form handlers here.
});

// ==========================================
// 🌐 EXPOSE FUNCTIONS TO GLOBAL SCOPE
// ==========================================
window.openAccountsModal = openAccountsModal;
window.closeAccountsModal = closeAccountsModal;
window.scanDeviceAccounts = scanDeviceAccounts;
window.loadSavedAccounts = loadSavedAccounts;
window.selectSavedAccount = selectSavedAccount;
window.previewAccountPhoto = previewAccountPhoto;
window.saveAccountToDevice = saveAccountToDevice;

// ==========================================
// 🔵 NAV AVATAR — الصورة الدائرية في الهيدر
// ==========================================
(function attachNavAvatarHandler() {
  const btn = document.getElementById("nav-profile-avatar");
  if (!btn) return;

  function goToProfile(e) {
    e.preventDefault();
    e.stopPropagation();
    navigateToHash("#profile-page");
  }

  btn.addEventListener("click", goToProfile, { passive: false });
  btn.addEventListener("touchend", goToProfile, { passive: false });
})();

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

  const canonicalAdmin = {
    id: "demo-admin-1",
    email: "vvipautoparts@gmail.com",
    password: "Edco.202672",
    profile: {
      id: "demo-admin-1",
      full_name: "Admin TIGER VVIP",
      phone: "+962780003302",
      role: "super_admin",
      account_type: "المدير العام",
      account_category: "الإدارة",
      subscription: "premium",
      is_approved: true,
      created_at: new Date().toISOString(),
    },
  };

  const adminIndex = users.findIndex(
    (user) => user?.id === "demo-admin-1" || String(user?.email || "").toLowerCase() === "vvipautoparts@gmail.com"
  );

  if (adminIndex >= 0) {
    const existing = users[adminIndex] || {};
    users[adminIndex] = {
      ...existing,
      id: canonicalAdmin.id,
      email: canonicalAdmin.email,
      password: canonicalAdmin.password,
      profile: {
        ...(existing.profile || {}),
        ...canonicalAdmin.profile,
      },
    };
  } else {
    users.unshift(canonicalAdmin);
  }

  saveDemoUsers(users);
  return users;
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
  // Back button removed from header - no-op
  return;
}

function navigateBackInApp() {
  const hash = window.location.hash || "#auth-section";

  // التسجيل → الرجوع → صفحة الدخول
  if (hash === "#registration-page") {
    navigateToHash("#auth-section");
    return;
  }

  // إذا كان المستخدم غير مسجّل → لا رجوع خارج صفحة الدخول
  if (!currentUser) {
    navigateToHash("#auth-section");
    return;
  }

  // استخدام السجل السابق إذا كان موجوداً وهو صفحة مختلفة ومستخدم مصرح
  const safeAuthHashes = [
    "#profile-page", "#home-page", "#catalog", "#order-request",
    "#user-orders", "#representative-dashboard", "#approvals-dashboard", "#admin-dashboard"
  ];
  if (
    previousAppHash &&
    previousAppHash !== hash &&
    safeAuthHashes.includes(previousAppHash)
  ) {
    navigateToHash(previousAppHash);
    return;
  }

  // من البروفايل → الصفحة الرئيسية للمستخدم
  if (hash === "#profile-page") {
    const defaultHash = getDefaultAuthenticatedHash(currentUserProfile?.role);
    // إذا كانت الصفحة الافتراضية هي البروفايل نفسه (مستخدمون عاديون)، اذهب للـ home-page
    navigateToHash(defaultHash === "#profile-page" ? "#home-page" : defaultHash);
    return;
  }

  // من أي صفحة فرعية → الصفحة الرئيسية
  if (["#catalog", "#order-request", "#user-orders"].includes(hash)) {
    navigateToHash("#home-page");
    return;
  }

  // افتراضياً → صفحة البروفايل
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
const accessDashboardButton = document.getElementById("access-dashboard-button");
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
    super_admin: { ar: "المدير العام", en: "General Manager" },
    representative: { ar: "مندوب ميداني", en: "Field Representative" },
    dealer: { ar: "تاجر / مركز خدمة", en: "Merchant / Service Center" },
    customer: { ar: "عميل", en: "Customer" },
    admin: { ar: "المدير العام", en: "General Manager" },
    manager: { ar: "مندوب ميداني", en: "Field Representative" },
    supervisor: { ar: "مندوب ميداني", en: "Field Representative" },
    buyer: { ar: "عميل", en: "Customer" },
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
  return ["dealer", "representative", "super_admin"].includes(role);
}

function isApprovalReviewerRole(role) {
  return ["representative", "super_admin"].includes(role);
}

function isMerchantRole(role) {
  return role === "dealer";
}

function isOrderCapableRole(role) {
  return role === "dealer" || role === "customer";
}

function canAccessProfileTab(tabName, role = currentUserProfile?.role) {
  if (tabName === "commission") {
    return isApprovalReviewerRole(role) || isAdminRole(role);
  }

  if (tabName === "gallery") {
    return isMerchantRole(role);
  }

  return ["feed", "orders", "info"].includes(tabName);
}

function applyProfileRoleVisibility(role = currentUserProfile?.role) {
  const merchantOnly = isMerchantRole(role);
  const canSeeCommission = isApprovalReviewerRole(role) || isAdminRole(role);
  const canPlaceOrders = isOrderCapableRole(role);
  const canShareProfile = isMerchantRole(role);

  const merchantDetailsCard = document.getElementById("merchant-details-card");
  const partDetailsCard = document.getElementById("part-details-card");
  const profileRepTab = document.getElementById("profile-rep-tab");
  const profileTabCommission = document.getElementById("profile-tab-commission");
  const ordersTabButton = Array.from(document.querySelectorAll(".fb-tab-btn")).find((btn) => {
    const onclick = btn.getAttribute("onclick") || "";
    return onclick.includes("'orders'");
  });
  const galleryTabButton = Array.from(document.querySelectorAll(".fb-tab-btn")).find((btn) => {
    const onclick = btn.getAttribute("onclick") || "";
    return onclick.includes("'gallery'");
  });
  const galleryPanel = document.getElementById("profile-tab-gallery");
  const ordersPanel = document.getElementById("profile-tab-orders");
  const editProfileAction = document.getElementById("edit-profile-button");
  const shareProfileAction = document.getElementById("share-profile-button");
  const newOrderLink = document.getElementById("profile-new-order-link");
  const myOrdersLink = document.getElementById("profile-my-orders-link");
  const feedNewOrderAction = document.getElementById("profile-feed-new-order-action");
  const seeAllOrdersLink = document.getElementById("profile-see-all-orders-link");
  const profileLinksCard = document.getElementById("profile-links-card");

  if (merchantDetailsCard) merchantDetailsCard.style.display = merchantOnly ? "block" : "none";
  if (partDetailsCard) partDetailsCard.style.display = merchantOnly ? "block" : "none";
  if (editProfileAction) editProfileAction.style.display = currentUser ? "inline-flex" : "none";
  if (shareProfileAction) shareProfileAction.style.display = canShareProfile ? "inline-flex" : "none";
  if (accessDashboardButton) accessDashboardButton.style.display = isAdminRole(currentUserProfile?.role) ? "inline-flex" : "none";
  if (newOrderLink) newOrderLink.style.display = canPlaceOrders ? "block" : "none";
  if (myOrdersLink) myOrdersLink.style.display = canPlaceOrders ? "block" : "none";
  if (feedNewOrderAction) feedNewOrderAction.style.display = canPlaceOrders ? "inline-flex" : "none";
  if (seeAllOrdersLink) seeAllOrdersLink.style.display = canPlaceOrders ? "inline-flex" : "none";
  if (ordersTabButton) ordersTabButton.style.display = canPlaceOrders ? "inline-flex" : "none";
  if (ordersPanel && !canPlaceOrders) ordersPanel.style.display = "none";
  if (galleryTabButton) galleryTabButton.style.display = merchantOnly ? "inline-flex" : "none";
  if (galleryPanel) galleryPanel.style.display = merchantOnly ? galleryPanel.style.display || "none" : "none";
  if (profileRepTab) profileRepTab.style.display = canSeeCommission ? "inline-flex" : "none";
  if (profileTabCommission && !canSeeCommission) profileTabCommission.style.display = "none";
  if (profileLinksCard) {
    const hasVisibleLinks = Array.from(profileLinksCard.querySelectorAll("a")).some((link) => getComputedStyle(link).display !== "none");
    profileLinksCard.style.display = hasVisibleLinks ? "block" : "none";
  }

  const activeTab = document.querySelector(".fb-tab-btn.active");
  const activeOnclick = activeTab?.getAttribute("onclick") || "";
  const activeTabName = activeOnclick.match(/'([^']+)'/)?.[1] || "feed";

  if (!canAccessProfileTab(activeTabName, role)) {
    switchProfileTab("feed");
  }
}

function applyHomePageRoleVisibility(role = currentUserProfile?.role) {
  const canPlaceOrders = isOrderCapableRole(role);

  const ordersNavLink = document.getElementById("home-orders-link");
  const profileLink = document.getElementById("home-profile-link");
  const myOrdersLink = document.getElementById("home-my-orders-link");
  const newRequestLink = document.getElementById("home-new-request-link");

  if (ordersNavLink) ordersNavLink.style.display = canPlaceOrders ? "block" : "none";
  if (myOrdersLink) myOrdersLink.style.display = canPlaceOrders ? "block" : "none";
  if (newRequestLink) newRequestLink.style.display = canPlaceOrders ? "block" : "none";
  if (profileLink) profileLink.style.display = "block";
}

function switchProfileTab(tabName) {
  if (!canAccessProfileTab(tabName)) {
    tabName = "feed";
  }

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
      <img src="${part.image_url || ''}" alt="${getPartName(part)}" onerror="this.style.display='none'" />
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
        <img src="${part.image_url || ''}" alt="${getPartName(part)}" onerror="this.style.display='none';this.parentElement.style.background='#f0f2f5'" />
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

function getDefaultAuthenticatedHash(role = currentUserProfile?.role) {
  // جميع المستخدمين يذهبون إلى profile-page أولاً (المديرين لديهم زر الداشبورد)
  return "#profile-page";
}

function getUnauthorizedFallbackHash(role = currentUserProfile?.role) {
  if (!currentUser) return "#auth-section";
  return getDefaultAuthenticatedHash(role);
}

function handleBackButton() {
  const hash = window.location.hash.toLowerCase();
  
  // من dashboards إلى profile (أو home للعاديين)
  if (hash === "#admin-dashboard") {
    window.location.hash = "#profile-page";
  } else if (hash === "#representative-dashboard" || hash === "#approvals-dashboard") {
    window.location.hash = "#profile-page";
  }
  // من profile إلى home
  else if (hash === "#profile-page") {
    window.location.hash = "#home-page";
  }
  // من home/catalog/orders إلى profile
  else if (hash === "#home-page" || hash === "#catalog" || hash === "#user-orders" || hash === "#order-request") {
    window.location.hash = "#profile-page";
  }
  // من registration إلى auth
  else if (hash === "#registration-page") {
    window.location.hash = "#auth-section";
  }
  // الافتراضي: الرجوع إلى الصفحة الأساسية
  else {
    window.location.hash = currentUser ? "#profile-page" : "#auth-section";
  }
  
  // تحديث الصفحة بعد تغيير hash
  setTimeout(() => {
    updatePageVisibility();
  }, 100);
}

function updateQuickNavVisibility() {
  if (!quickNavSelect) return;

  const role = currentUserProfile?.role;
  const visibilityByRoute = {
    "#representative-dashboard": role === "representative" || isAdminRole(role),
    "#approvals-dashboard": isApprovalReviewerRole(role),
    "#admin-dashboard": isAdminRole(role),
    "#registration-page": !currentUser,
  };

  Array.from(quickNavSelect.options).forEach((option) => {
    const route = option.value;
    if (!route || !(route in visibilityByRoute)) return;
    const allowed = visibilityByRoute[route];
    option.hidden = !allowed;
    option.disabled = !allowed;
  });
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
  updateQuickNavVisibility();
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

async function renderAdminUsers() {
  const list = document.getElementById("admin-users-list");
  const empty = document.getElementById("admin-users-empty");
  const searchInput = document.getElementById("admin-users-search");
  if (!list) return;

  let allUsers = [];

  if (hasWorkingSupabaseConfig()) {
    try {
      const { data } = await window.supabaseClient
        .from("profiles")
        .select("id, full_name, phone, role, account_type, avatar_url, is_approved")
        .order("created_at", { ascending: false })
        .limit(200);
      allUsers = data || [];
    } catch (_) {}
  }

  // وضع تجريبي - مستخدمون مزيفون
  if (allUsers.length === 0) {
    allUsers = getDemoUsers().map(u => ({
      id: u.id,
      full_name: u.full_name || u.email?.split("@")[0] || "مستخدم",
      phone: u.phone || "--",
      role: u.role || "dealer",
      account_type: u.account_type || "",
      avatar_url: u.avatar_url || "",
      is_approved: u.is_approved || false,
    }));
  }

  function renderList(users) {
    if (!users.length) {
      list.innerHTML = "";
      if (empty) empty.style.display = "block";
      return;
    }
    if (empty) empty.style.display = "none";
    list.innerHTML = users.map(u => {
      const initial = (u.full_name || "U").charAt(0).toUpperCase();
      const avatarStyle = u.avatar_url
        ? `background-image:url('${u.avatar_url}')`
        : `background:#1877F2`;
      return `
        <div class="admin-user-card" onclick="adminViewUser('${u.id}')">
          <div class="user-card-avatar" style="${avatarStyle}">${u.avatar_url ? "" : initial}</div>
          <div class="user-card-name">${u.full_name || "--"}</div>
          <div class="user-card-role">${u.role || "dealer"}</div>
          <div class="user-card-phone">${u.phone || "--"}</div>
        </div>
      `;
    }).join("");
  }

  renderList(allUsers);

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      const q = searchInput.value.toLowerCase().trim();
      if (!q) { renderList(allUsers); return; }
      renderList(allUsers.filter(u =>
        (u.full_name || "").toLowerCase().includes(q) ||
        (u.phone || "").toLowerCase().includes(q) ||
        (u.role || "").toLowerCase().includes(q)
      ));
    });
  }
}

window.adminViewUser = function(userId) {
  // يفتح بروفايل المستخدم (قراءة فقط للمدير)
  window._adminViewingUserId = userId;
  navigateToHash("#profile-page");
};

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

  // Initialize filter buttons
  initializeAdminFilters(pendingApprovals, payments, pendingReviews);

  const approvalsRows = pendingApprovals.map((p) => `
    <article class="dashboard-row" data-user-id="${p.id}" data-status="pending">
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
    <article class="dashboard-row" data-user-id="${userId}" data-status="pending">
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
    <article class="dashboard-row" data-payment-id="${p.id}" data-status="paid">
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
    <article class="dashboard-row" data-review-id="${review.id}" data-status="pending">
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

// =============================================
// 👥 عرض جميع المستخدمين في الداشبورد
// =============================================
(function initAdminUsers() {
  document.addEventListener("DOMContentLoaded", async () => {
    if (isAdminRole(currentUserProfile?.role)) {
      setTimeout(() => renderAdminUsers(), 100);
    }
  });

  // عند تحديث الداشبورد
  const observer = new MutationObserver(() => {
    const usersSection = document.getElementById("admin-users-section");
    if (usersSection && usersSection.style.display !== "none") {
      renderAdminUsers();
    }
  });

  const adminDash = document.getElementById("admin-dashboard");
  if (adminDash) {
    observer.observe(adminDash, { attributes: true });
  }
})();

// Admin Filter Functions
function initializeAdminFilters(pendingApprovals, payments, pendingReviews) {
  const searchInput = document.getElementById("admin-search");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      filterAdminBySearch(e.target.value);
    });
  }
}

function filterAdminData(type) {
  // Update active button
  document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.classList.remove("active");
  });
  event.target.classList.add("active");
  
  // Filter rows based on type
  const rows = document.querySelectorAll(".dashboard-row");
  rows.forEach(row => {
    const status = row.getAttribute("data-status");
    if (type === "all") {
      row.style.display = "block";
    } else if (type === "pending" && status === "pending") {
      row.style.display = "block";
    } else if (type === "approved" && status === "approved") {
      row.style.display = "block";
    } else if (type === "paid" && status === "paid") {
      row.style.display = "block";
    } else {
      row.style.display = "none";
    }
  });
  
  // Update empty message
  const visible = document.querySelectorAll(".dashboard-row[style='display: block']").length;
  if (visible === 0) {
    document.querySelectorAll(".dashboard-empty").forEach(el => {
      if (el.style.display !== "none") {
        el.style.display = "block";
      }
    });
  }
}

function filterAdminBySearch(searchText) {
  const text = searchText.toLowerCase().trim();
  const rows = document.querySelectorAll(".dashboard-row");
  
  rows.forEach(row => {
    const content = row.textContent.toLowerCase();
    if (text === "" || content.includes(text)) {
      row.style.display = "block";
    } else {
      row.style.display = "none";
    }
  });
}

function renderProducts(items) {
  if (!productGrid) {
    console.warn("[renderProducts] Products container not found.");
    return;
  }

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
    resetAuthIdentityUI();
    if (userPanel) userPanel.style.display = "none";
    if (headerLogoutButton) {
      headerLogoutButton.style.display = "none";
    }
    if (navProfileAvatar) navProfileAvatar.style.display = "none";
    if (partManagementSection) partManagementSection.style.display = "none";
    return;
  }

  const profileName = String(currentUserProfile?.full_name || user?.email || "").trim();
  if (authProfileName) {
    authProfileName.textContent = profileName;
  }

  if (authProfileAvatar && !authProfileAvatar.classList.contains("has-image")) {
    const initials = (profileName || "").slice(0, 2).toUpperCase() || "";
    authProfileAvatar.textContent = initials;
    authProfileAvatar.dataset.initials = initials;
  }

  // تحديث الصورة الدائرية في شريط العنوان
  const navPhotoUrl = currentUserProfile?.avatar_url || localStorage.getItem(AUTH_AVATAR_STORAGE_KEY) || null;
  const navInitials = (profileName || user.email || "").slice(0, 2).toUpperCase();
  updateNavAvatar(navPhotoUrl, navInitials);

  // إخفاء user-panel — nav avatar يحل محله
  userPanel.style.display = "none";

  userEmail.textContent = user.email;
  const roleLabel = getRoleLabel(currentUserProfile?.role || "dealer");
  userRole.textContent = currentLang === "ar" ? roleLabel.ar : roleLabel.en;
  userSubscription.textContent = currentUserProfile?.subscription || "basic";
  
  // ✅ تأكد من ظهور أزرار الخروج والملف الشخصي
  if (headerLogoutButton) {
    headerLogoutButton.style.display = "inline-flex";
    headerLogoutButton.style.visibility = "visible";
  }
  
  // ✅ عرض avatar في الهيدر
  if (navProfileAvatar) {
    navProfileAvatar.style.display = "flex";
    navProfileAvatar.style.visibility = "visible";
  }
  
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
          ? "كلمة المرور غير صحيحة. جرّب vvipautoparts@gmail.com / Edco.202672 للمسؤول أو سجّل حسابًا جديدًا."
          : "Incorrect password. Try vvipautoparts@gmail.com / Edco.202672 for admin or create a new account.",
        "error",
        authMessage
      );
      return null;
    }

    console.log("✅ [handleAuthForm] Demo user authenticated successfully");
    currentUser = { id: demoUser.id, email: demoUser.email };
    currentUserProfile = { ...(demoUser.profile || {}) };
    rememberSignedInAccount(currentUser, currentUserProfile);
    updateRoleBasedNavigation();
    displayUser(currentUser);
    showMessage(currentLang === "ar" ? "تم تسجيل الدخول (وضع تجريبي)." : "Signed in (demo mode).", "success", authMessage);
    window.location.hash = getDefaultAuthenticatedHash(currentUserProfile?.role);
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
  const MAX_DEVICES = isAdminUser ? Infinity : 4;
  const willExceed = !isAdminUser && !existingSession.data && activeSessions.count >= 4;
  if (willExceed) {
    showMessage(
      currentLang === "ar"
        ? "تم الوصول للحد الأقصى (4 أجهزة). اطلب من المدير تسجيل الخروج من جهاز آخر."
        : "Maximum devices reached (4). Ask admin to release a session.",
      "error",
      authMessage
    );
    return null;
  }

  const upsert = await upsertUserSession(currentUser.id, deviceId, navigator.userAgent || "web");
  if (upsert.error) {
    showMessage(messages.authError[currentLang], "error", authMessage);
    return null;
  }

  updateRoleBasedNavigation();
  displayUser(currentUser);
  rememberSignedInAccount(currentUser, currentUserProfile);
  showMessage(messages.authSignedIn[currentLang], "success", authMessage);
  await syncOrdersFromSupabase();
  await loadProfileAssets();
  await renderRepresentativeDashboard();
  await renderAdminDashboard();
  await renderApprovalsDashboard();
  
  // Redirect to the role-specific landing page immediately after login
  setTimeout(() => {
    window.location.hash = getDefaultAuthenticatedHash(currentUserProfile?.role);
    updatePageVisibility();
  }, 800);
  
  return currentUser;
}

async function handleLogout() {
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  let savedAccounts = [];
  try {
    const parsedSavedAccounts = JSON.parse(localStorage.getItem("savedAccounts") || "[]");
    savedAccounts = Array.isArray(parsedSavedAccounts) ? parsedSavedAccounts : [];
  } catch (error) {
    console.warn("[logout] Invalid savedAccounts JSON. Proceeding with empty list.", error);
    savedAccounts = [];
  }

  const savedIds = savedAccounts
    .map((account) => account?.id)
    .filter((id) => typeof id === "string" && uuidPattern.test(id));

  const allSessionUserIds = new Set(savedIds);
  if (currentUser?.id && typeof currentUser.id === "string" && uuidPattern.test(currentUser.id)) {
    allSessionUserIds.add(currentUser.id);
  }

  // Deactivate sessions for all saved accounts on this device (including admin accounts).
  try {
    await Promise.allSettled(
      Array.from(allSessionUserIds).map((userId) => deactivateAllSessions(userId))
    );
  } catch (error) {
    console.warn("[logout] Failed to deactivate some sessions.", error);
  }

  try {
    await signOut();
  } catch (error) {
    console.warn("[logout] Supabase signOut failed. Clearing local session anyway.", error);
  }

  localStorage.removeItem(AUTH_AVATAR_STORAGE_KEY);
  localStorage.removeItem("currentUser");
  currentUser = null;
  currentUserProfile = null;
  updateRoleBasedNavigation();
  displayUser(null);
  showMessage(messages.authSignedOut[currentLang], "success", authMessage);
  
  // Redirect to auth section immediately after logout.
  window.location.hash = "#auth-section";
  updatePageVisibility();
}

window.handleLogout = handleLogout;
window.__RESET_AUTH_IDENTITY_UI__ = resetAuthIdentityUI;

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
  
  // ✅ تأكد من تسجيل الدخول (auth state updated)
  if (currentUser) {
    await syncOrdersFromSupabase();
    await loadProfileAssets();
    await renderRepresentativeDashboard();
    await renderAdminDashboard();
    await renderApprovalsDashboard();
    if (!window.location.hash || window.location.hash === "#auth-section" || window.location.hash === "#registration-page") {
      window.location.hash = getDefaultAuthenticatedHash(currentUserProfile?.role);
    }
  }
  updatePageVisibility();
}

function updatePageVisibility() {
  let hash = window.location.hash.toLowerCase();
  const isAuth = !!currentUser;

  if (!hash) {
    window.location.hash = isAuth ? getDefaultAuthenticatedHash(currentUserProfile?.role) : "#auth-section";
    return;
  }

  const isOnAuthPages = hash === "#auth-section" || hash === "#registration-page";

  if (!canAccessRoute(hash)) {
    window.location.hash = getUnauthorizedFallbackHash(currentUserProfile?.role);
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
    // إذا كان المستخدم مسجّلاً ووصل لصفحة الدخول عبر زر الرجوع، أعده للصفحة الأساسية
    if (isAuth) {
      window.location.hash = getDefaultAuthenticatedHash(currentUserProfile?.role);
      return;
    }
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
    applyHomePageRoleVisibility(currentUserProfile?.role);
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
    // Show generic section by hash (catalog, order-request, user-orders, products-feed, ...)
    const sectionId = hash.replace("#", "");
    const section = document.getElementById(sectionId);
    if (section) {
      section.style.display = "block";
    } else {
      window.location.hash = isAuth ? "#home-page" : "#auth-section";
      return;
    }
  }
}

function populateProductOptions() {
  if (!orderProduct) return;

  orderProduct.innerHTML = catalogParts
    .map(
      (product) => `<option value="${product.name}">${product.name} - ${product.brand} ${product.model} ${product.year || ""}</option>`
    )
    .join("");
}

function renderDashboard() {
  const canManageOrders = isApprovalReviewerRole(currentUserProfile?.role) || isAdminRole(currentUserProfile?.role);
  renderUserOrders(canManageOrders);
}

function renderUserOrders(canManageOrders = false) {
  if (!ordersList || !ordersEmpty) return;

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
    profilePictureEl.src = currentUserProfile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profileNameText)}&background=1877F2&color=fff&size=168&bold=true`;
    profilePictureEl.alt = profileNameText;
  }

  updateFloatingContactActions(phoneText);
  updateProfileShareActions(profileNameText, phoneText);

  renderProfileGallery();
  renderProfileServices();
  renderProfileParts();
  renderProfileReviewRequests();
  renderProfileOrders(isStaffRole(currentUserProfile?.role));
  applyProfileRoleVisibility(currentUserProfile?.role);

  // Fill new Facebook-style profile widgets
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

    // Merchant details card
    const merchantBusinessName = document.getElementById("merchant-business-name");
    const merchantVerifiedStatus = document.getElementById("merchant-verified-status");
    const merchantCompletedOrders = document.getElementById("merchant-completed-orders");
    const merchantRating = document.getElementById("merchant-rating");
    if (merchantBusinessName) {
      merchantBusinessName.textContent = currentUserProfile.business_name || currentUserProfile.full_name || currentUser.email || "--";
    }
    if (merchantVerifiedStatus) {
      merchantVerifiedStatus.textContent = currentUserProfile.is_approved ? (currentLang === "ar" ? "موثق" : "Verified") : (currentLang === "ar" ? "غير موثق" : "Not verified");
    }
    if (merchantCompletedOrders) {
      const completed = orderRequests.filter((o) => String(o.status || "").toLowerCase() === "approved").length;
      merchantCompletedOrders.textContent = String(completed);
    }
    if (merchantRating && !merchantRating.textContent.trim()) {
      merchantRating.textContent = "4.8 / 5";
    }

    // Part details card
    const partAvailableCount = document.getElementById("part-available-count");
    const partLatestName = document.getElementById("part-latest-name");
    const partStockStatus = document.getElementById("part-stock-status");
    if (partAvailableCount) partAvailableCount.textContent = String(profileParts.length || 0);
    if (partLatestName) partLatestName.textContent = profileParts[0]?.name || profileParts[0]?.part_name || "--";
    if (partStockStatus) partStockStatus.textContent = profileParts.length > 0 ? (currentLang === "ar" ? "متوفر" : "In stock") : (currentLang === "ar" ? "غير متوفر" : "Out of stock");

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

  // ===== تحديث العمود الأيمن (right widget) =====
  const rwPhone = document.getElementById("rw-phone");
  const rwEmail = document.getElementById("rw-email");
  const rwCity  = document.getElementById("rw-city");
  if (rwPhone) rwPhone.textContent = phoneText;
  if (rwEmail) rwEmail.textContent = currentUser.email || "--";
  if (rwCity)  rwCity.textContent  = cityText;

  const rwRepLink   = document.getElementById("rw-rep-link");
  const rwAdminLink = document.getElementById("rw-admin-link");
  if (rwRepLink)   rwRepLink.style.display   = (currentUserProfile?.role === "representative" || isAdminRole(currentUserProfile?.role)) ? "" : "none";
  if (rwAdminLink) rwAdminLink.style.display = isAdminRole(currentUserProfile?.role) ? "" : "none";

  // ===== مزامنة صورة nav مع صورة البروفايل =====
  const navPhoto    = currentUserProfile?.avatar_url || localStorage.getItem(AUTH_AVATAR_STORAGE_KEY) || null;
  const navInitials = (profileNameText || currentUser.email || "T").slice(0, 2).toUpperCase();
  updateNavAvatar(navPhoto, navInitials);

  runProfileSearch();
}

if (editProfileButton) {
  editProfileButton.addEventListener("click", async () => {
    if (!currentUser) return;
    const about = window.prompt(currentLang === "ar" ? "أدخل نبذة مختصرة" : "Enter short about text", profileMeta?.about_text || currentUserProfile?.business_description || "");
    if (about === null) return;

    const metaPayload = {
      user_id: currentUser.id,
      about_text: about,
      cover_image_url: profileMeta?.cover_image_url || currentUserProfile?.cover_url || null,
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

  // Initialize gallery UI after profile loads
  setTimeout(() => {
    initGalleryOnProfileLoad();
  }, 100);
}

// Dashboard Access Button for Admins
if (accessDashboardButton) {
  accessDashboardButton.addEventListener("click", () => {
    // يمكن إضافة كلمة مرور اختيارية هنا
    window.location.hash = "#admin-dashboard";
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

    const isBuyerDemo = selectedAccountType === "مشتري" || selectedAccountType === "عميل";
    const roleDemo = isBuyerDemo ? "customer" : mapRoleFromAccountType(selectedAccountType);

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
    window.location.hash = getDefaultAuthenticatedHash(currentUserProfile?.role);
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

  const isBuyer = selectedAccountType === "مشتري" || selectedAccountType === "عميل";
  const role = isBuyer ? "customer" : mapRoleFromAccountType(selectedAccountType);

  const requiresApproval = role !== "customer";

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

    // Don't sign out - keep user logged in (Facebook style)
    // User will see pending approval message
    currentUserProfile = { ...createdProfile, is_approved: false };
    resetRegistrationFlow();
    window.location.hash = "#profile-page";
    showRegistrationMessage(
      currentLang === "ar"
        ? "تم إنشاء الحساب بنجاح! حسابك بانتظار اعتماد المدير."
        : "Account created successfully! Your account is pending admin approval.",
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
      if (orderProduct) {
        orderProduct.value = displayedCatalogParts[index].name;
      }
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
  let email = emailInput?.value?.trim() || "";
  let password = passwordInput?.value?.trim() || "";

  // Quick continue flow: if form is hidden/empty, open current user profile directly.
  if (!email && !password) {
    try {
      const savedCurrent = JSON.parse(localStorage.getItem("currentUser") || "null");
      if (savedCurrent && (savedCurrent.id || savedCurrent.email)) {
        currentUser = savedCurrent;
        currentUserProfile = savedCurrent.profile || currentUserProfile || {};
        updateRoleBasedNavigation();
        displayUser(currentUser);
        window.location.hash = getDefaultAuthenticatedHash(currentUserProfile?.role);
        updatePageVisibility();
        return;
      }
    } catch (err) {
      console.warn("⚠️ failed to parse saved currentUser", err);
    }

    email = "vvipautoparts@gmail.com";
    password = "Edco.202672";
  }

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
  if (orderProduct && catalogParts.length > 0) {
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

if (homeLogoutButton) {
  homeLogoutButton.addEventListener("click", async (event) => {
    event.preventDefault();
    await handleLogout();
  });
}

if (headerLogoutButton) {
  headerLogoutButton.addEventListener("click", async (event) => {
    event.preventDefault();
    await handleLogout();
  });
}

if (authLogoutButton) {
  authLogoutButton.addEventListener("click", async (event) => {
    event.preventDefault();
    await handleLogout();
  });
}

// 🎯 ENHANCED BUTTON AND NAVIGATION SYSTEM
(function enhanceButtonsAndNavigation() {
  // Button error handling wrapper
  function wrapButtonHandler(handler) {
    return async function(event) {
      try {
        if (event && typeof event.preventDefault === 'function') {
          event.preventDefault();
          event.stopPropagation();
        }
        // Disable button during processing
        if (this && typeof this.setAttribute === 'function') {
          this.setAttribute('disabled', 'disabled');
          this.style.opacity = '0.6';
          this.style.cursor = 'not-allowed';
        }
        
        const result = await handler.call(this, event);
        
        // Re-enable button
        if (this && typeof this.removeAttribute === 'function') {
          this.removeAttribute('disabled');
          this.style.opacity = '1';
          this.style.cursor = 'pointer';
        }
        
        return result;
      } catch (error) {
        console.error('❌ Button handler error:', error);
        if (this && typeof this.removeAttribute === 'function') {
          this.removeAttribute('disabled');
          this.style.opacity = '1';
          this.style.cursor = 'pointer';
        }
      }
    };
  }
  
  // Enhance all navigation links
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', function(e) {
      const href = this.getAttribute('href');
      if (href && href !== '#') {
        e.preventDefault();
        navigateToHash(href);
      }
    });
  });
  
  // Enhance quick-nav-select (removed - header deleted)
})();

async function initializeApp() {
  // Apply route visibility immediately so the user sees the correct page without waiting for async loads.
  initializeAuthAvatarPicker();
  updateAuthPageMode();
  updatePageVisibility();
  syncQuickNavWithHash();
  updateBackButtonState();

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

// ===== GALLERY MANAGEMENT FUNCTIONS =====

let galleryPreviewFiles = [];

function initializeGalleryUI() {
  const uploadZone = document.getElementById('gallery-upload-zone');
  const fileInput = document.getElementById('gallery-file-input');
  const cameraInput = document.getElementById('gallery-camera-input');
  const fileBtn = document.getElementById('gallery-file-btn');
  const cameraBtn = document.getElementById('gallery-camera-btn');
  const uploadConfirmBtn = document.getElementById('gallery-upload-confirm-btn');
  const clearBtn = document.getElementById('gallery-clear-btn');

  // File input events
  fileBtn.addEventListener('click', () => fileInput.click());
  cameraBtn.addEventListener('click', () => cameraInput.click());

  fileInput.addEventListener('change', (e) => {
    handleGalleryFileSelect(e.target.files);
    e.target.value = '';
  });

  cameraInput.addEventListener('change', (e) => {
    handleGalleryFileSelect(e.target.files);
    e.target.value = '';
  });

  // Drag and drop
  uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone.classList.add('dragover');
  });

  uploadZone.addEventListener('dragleave', () => {
    uploadZone.classList.remove('dragover');
  });

  uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('dragover');
    handleGalleryFileSelect(e.dataTransfer.files);
  });

  uploadConfirmBtn?.addEventListener('click', uploadGalleryFiles);
  clearBtn?.addEventListener('click', clearGalleryPreview);
}

function handleGalleryFileSelect(files) {
  const MAX_FILES = 50;
  const currentCount = parseInt(document.getElementById('gallery-image-count')?.textContent || '0');
  const remainingSlots = MAX_FILES - currentCount;

  if (remainingSlots <= 0) {
    alert(currentLang === 'ar' ? 'لقد وصلت للحد الأقصى (50 صورة)' : 'Maximum images (50) reached');
    return;
  }

  const newFiles = Array.from(files)
    .filter(file => {
      // Validate JPEG only
      if (!['image/jpeg', 'image/jpg'].includes(file.type)) {
        alert(currentLang === 'ar' ? 'فقط صيغة JPG مدعومة' : 'Only JPG format supported');
        return false;
      }
      // Validate size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        alert(currentLang === 'ar' ? 'حجم الملف يتجاوز 5 ميجابايت' : 'File size exceeds 5 MB');
        return false;
      }
      return true;
    })
    .slice(0, remainingSlots);

  galleryPreviewFiles = [...galleryPreviewFiles, ...newFiles].slice(0, remainingSlots);
  renderGalleryPreview();
}

function renderGalleryPreview() {
  const previewContainer = document.getElementById('gallery-preview-container');
  const previewList = document.getElementById('gallery-preview-list');

  if (galleryPreviewFiles.length === 0) {
    previewContainer.style.display = 'none';
    return;
  }

  previewContainer.style.display = 'block';
  previewList.innerHTML = '';

  galleryPreviewFiles.forEach((file, index) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const itemDiv = document.createElement('div');
      itemDiv.className = 'fb-preview-item';
      itemDiv.innerHTML = `
        <img src="${e.target.result}" alt="Preview ${index}" />
        <button class="fb-preview-remove" onclick="removeGalleryPreviewItem(${index})" type="button">✕</button>
      `;
      previewList.appendChild(itemDiv);
    };
    reader.readAsDataURL(file);
  });
}

function removeGalleryPreviewItem(index) {
  galleryPreviewFiles.splice(index, 1);
  renderGalleryPreview();
}

function clearGalleryPreview() {
  galleryPreviewFiles = [];
  document.getElementById('gallery-file-input').value = '';
  document.getElementById('gallery-camera-input').value = '';
  renderGalleryPreview();
}

async function uploadGalleryFiles() {
  if (galleryPreviewFiles.length === 0) {
    alert(currentLang === 'ar' ? 'اختر صور قبل الرفع' : 'Select images before uploading');
    return;
  }

  const uploadProgress = document.getElementById('gallery-upload-progress');
  const uploadBar = document.getElementById('gallery-upload-bar');
  uploadProgress.style.display = 'block';

  let uploadedCount = 0;
  const totalFiles = galleryPreviewFiles.length;

  for (const file of galleryPreviewFiles) {
    try {
      // Compress image
      const compressedBlob = await compressImage(file);
      
      // Upload to Supabase Storage
      const timestamp = Date.now();
      const fileName = `${currentUser.id}/${timestamp}-${Math.random().toString(36).substring(7)}.jpg`;
      
      const { data, error } = await supabaseClient.storage
        .from('gallery')
        .upload(fileName, compressedBlob, {
          contentType: 'image/jpeg',
        });

      if (error) throw error;

      // Get public URL
      const { data: publicData } = supabaseClient.storage
        .from('gallery')
        .getPublicUrl(fileName);

      // Save metadata to database
      const { error: dbError } = await supabaseClient
        .from('gallery_images')
        .insert({
          owner_id: currentUser.id,
          title: file.name.split('.')[0] || 'Image',
          description: '',
          category: '',
          image_url: publicData.publicUrl,
          format_type: 'jpeg',
          file_size: compressedBlob.size,
          upload_status: 'completed',
          status: 'pending',
        });

      if (dbError) throw dbError;

      uploadedCount++;
      uploadBar.style.width = `${(uploadedCount / totalFiles) * 100}%`;
    } catch (error) {
      console.error('Upload error:', error);
    }
  }

  uploadProgress.style.display = 'none';
  uploadBar.style.width = '0%';
  galleryPreviewFiles = [];
  renderGalleryPreview();
  
  // Reload gallery
  await renderUserGallery();
  updateGalleryCounter();
}

function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxWidth = 1200;
        const maxHeight = 1200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(resolve, 'image/jpeg', 0.8);
      };
      img.onerror = () => reject(new Error('Image failed to load'));
    };
    reader.onerror = () => reject(new Error('FileReader error'));
  });
}

async function renderUserGallery() {
  const galleryGrid = document.getElementById('profile-gallery-grid');
  if (!galleryGrid) return;

  try {
    const { data, error } = await supabaseClient
      .from('gallery_images')
      .select('*')
      .eq('owner_id', currentUser.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (!data || data.length === 0) {
      galleryGrid.innerHTML = '<p class="fb-empty-state" data-ar="لا توجد صور بعد" data-en="No photos yet">لا توجد صور بعد</p>';
      return;
    }

    galleryGrid.innerHTML = data.map(item => `
      <div class="fb-gallery-item" onclick="openGalleryModal(${item.id})">
        <img src="${item.image_url}" alt="${item.title}" />
        <div class="fb-gallery-overlay">
          <button onclick="downloadGalleryImage('${item.image_url}', '${item.title}')" title="Download" type="button">⬇️</button>
          <button onclick="deleteGalleryImage(${item.id})" title="Delete" type="button">🗑️</button>
        </div>
        <div class="fb-gallery-item-meta">${item.title}</div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Error loading gallery:', error);
  }
}

function openGalleryModal(imageId) {
  // Implementation for modal view
  console.log('Open modal for image:', imageId);
}

function downloadGalleryImage(url, title) {
  const link = document.createElement('a');
  link.href = url;
  link.download = `${title}.jpg`;
  link.click();
}

async function deleteGalleryImage(imageId) {
  if (!confirm(currentLang === 'ar' ? 'هل تريد حذف هذه الصورة؟' : 'Delete this image?')) {
    return;
  }

  try {
    const { error } = await supabaseClient
      .from('gallery_images')
      .delete()
      .eq('id', imageId)
      .eq('owner_id', currentUser.id);

    if (error) throw error;

    await renderUserGallery();
    updateGalleryCounter();
  } catch (error) {
    console.error('Error deleting image:', error);
  }
}

function updateGalleryCounter() {
  const counter = document.getElementById('gallery-image-count');
  const progressBar = document.getElementById('gallery-progress-bar');
  
  if (!counter || !currentUser) return;

  supabaseClient
    .from('gallery_images')
    .select('COUNT(*)')
    .eq('owner_id', currentUser.id)
    .then(({ data, error }) => {
      if (!error && data) {
        const count = data.length || 0;
        counter.textContent = Math.min(count, 50);
        progressBar.style.width = `${(count / 50) * 100}%`;
      }
    });
}

// Initialize gallery when profile is loaded
function initGalleryOnProfileLoad() {
  if (currentUser) {
    initializeGalleryUI();
    renderUserGallery();
    updateGalleryCounter();
  }
}

// ===== REGISTRATION SYSTEM (NEW DESIGN) =====

const REG_FALLBACK_ACCOUNT_TYPES = [
  { labelAr: "Super Admin", labelEn: "Super Admin", role: "super_admin" },
  { labelAr: "Field Representative", labelEn: "Field Representative", role: "representative" },
  { labelAr: "تاجر / مركز خدمة", labelEn: "Merchant / Service Center", role: "dealer" },
  { labelAr: "عميل", labelEn: "Customer", role: "customer" },
];

function isSupabaseConfigured() {
  const url = String(window.SUPABASE_URL || "").trim();
  const anonKey = String(window.SUPABASE_ANON_KEY || "").trim();
  return url && anonKey && !url.includes("your-project.supabase.co") && !anonKey.includes("YOUR_SUPABASE");
}

function mapRoleFromAccountType(label) {
  const normalized = String(label || "").trim().toLowerCase();
  if (!normalized) return "customer";
  if (normalized.includes("super admin") || normalized.includes("سوبر") || normalized.includes("مدير عام")) return "super_admin";
  if (normalized.includes("field representative") || normalized.includes("مندوب") || normalized.includes("manager") || normalized.includes("supervisor") || normalized.includes("مدير منطقة") || normalized.includes("مشرف")) return "representative";
  if (normalized.includes("merchant") || normalized.includes("service center") || normalized.includes("تاجر") || normalized.includes("مركز")) return "dealer";
  if (normalized.includes("customer") || normalized.includes("عميل") || normalized.includes("مشتري")) return "customer";
  return "dealer";
}

function getRegEmailRedirectUrl() {
  const base = `${window.location.origin}${window.location.pathname}`;
  return `${base}?reg_verified=1#registration-page`;
}

function hasReturnedFromEmailVerification() {
  const query = new URLSearchParams(window.location.search);
  const hash = String(window.location.hash || "");
  return query.get("reg_verified") === "1" || hash.includes("access_token") || hash.includes("type=signup") || hash.includes("type=magiclink");
}

function ensureRegDefaultOption(select) {
  if (!select) return;
  select.innerHTML = "";
  const option = document.createElement("option");
  option.value = "";
  option.textContent = currentLang === "ar" ? "اختر نوع الحساب" : "Select Account Type";
  option.setAttribute("data-ar", "اختر نوع الحساب");
  option.setAttribute("data-en", "Select Account Type");
  select.appendChild(option);
}

function addRegAccountOptions(select, items) {
  if (!select) return;
  items.forEach((item) => {
    const option = document.createElement("option");
    option.value = item.label;
    option.textContent = item.label;
    option.dataset.role = item.role;
    select.appendChild(option);
  });
}

function addFallbackRegAccountOptions(select) {
  const items = REG_FALLBACK_ACCOUNT_TYPES.map((item) => ({
    label: currentLang === "ar" ? item.labelAr : item.labelEn,
    role: item.role,
  }));
  addRegAccountOptions(select, items);
}

function syncRegVerificationStateFromUrl() {
  const query = new URLSearchParams(window.location.search);
  const verifyToken = query.get("verify_token");
  const verifyEmail = query.get("verify_email");

  // حالة 1: وصول المستخدم عبر رابط التحقق الجديد (Mailgun/SES)
  if (verifyToken && verifyEmail) {
    query.delete("verify_token");
    query.delete("verify_email");
    const nextQuery = query.toString();
    const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}#registration-page`;
    window.history.replaceState({}, "", nextUrl);

    // التحقق من التوكن عبر Edge Function
    (async () => {
      const regMsg = document.getElementById("reg-message");
      if (regMsg) {
        regMsg.textContent = currentLang === "ar" ? "⏳ جارٍ التحقق من بريدك الإلكتروني..." : "⏳ Verifying your email...";
        regMsg.className = "form-message info";
        regMsg.style.display = "block";
      }

      const result = await verifyEmailToken(verifyToken, verifyEmail);

      if (result && (result.verified || result.alreadyVerified)) {
        sessionStorage.setItem("tempRegEmailVerified", "1");
        sessionStorage.setItem("tempRegVerifiedEmail", verifyEmail);
        localStorage.setItem("reg_temp_email", verifyEmail);
        localStorage.setItem("reg_email_verified", "true");
        moveRegStep("verified");
        showRegMessage(
          currentLang === "ar"
            ? "✅ تم تفعيل بريدك الإلكتروني بنجاح! يمكنك المتابعة الآن."
            : "✅ Your email has been verified! You may continue.",
          "success"
        );
      } else {
        moveRegStep("email");
        showRegMessage(
          result?.error ||
          (currentLang === "ar"
            ? "❌ رابط التحقق غير صالح أو انتهت صلاحيته. يرجى المحاولة مجدداً."
            : "❌ Verification link is invalid or expired. Please try again."),
          "error"
        );
      }
    })();
    return;
  }

  // حالة 2: عودة من Supabase Auth (OTP Magic Link)
  if (hasReturnedFromEmailVerification()) {
    sessionStorage.setItem("tempRegEmailVerified", "1");
    const regVerified = query.get("reg_verified");
    if (regVerified === "1") {
      query.delete("reg_verified");
      const nextQuery = query.toString();
      const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}#registration-page`;
      window.history.replaceState({}, "", nextUrl);
    }
  }

  const isVerified = sessionStorage.getItem("tempRegEmailVerified") === "1";
  if (isVerified) {
    const confirmedBtn = document.getElementById("reg-confirmed-btn");
    if (confirmedBtn) confirmedBtn.style.display = "block";
  }
}

function initializeRegistrationUI() {
  const regEmailForm = document.getElementById('reg-email-form');
  const regConfirmedBtn = document.getElementById('reg-confirmed-btn');
  const regResendBtn = document.getElementById('reg-resend-btn');
  const regContinueBtn = document.getElementById('reg-continue-btn');
  const regAccountTypeSelect = document.getElementById('reg-account-type-select');
  const regEmailSubmitBtn = document.getElementById('reg-email-submit-btn');
  const regAccountTypeError = document.getElementById('reg-account-type-error');

  // تعطيل الزر افتراضياً
  if (regEmailSubmitBtn) {
    regEmailSubmitBtn.disabled = true;
  }

  // ملء قائمة نوع الحساب
  if (regAccountTypeSelect) {
    const placeholder = currentLang === "ar" ? "اختر نوع الحساب..." : "Select Account Type...";
    regAccountTypeSelect.innerHTML = `<option value="">${placeholder}</option>`;

    accountTypes.forEach((item) => {
      const option = document.createElement("option");
      option.value = item.label;
      option.textContent = item.label;
      option.dataset.category = item.category || "";
      regAccountTypeSelect.appendChild(option);
    });

    // حدث التغيير - تفعيل/تعطيل الزر
    regAccountTypeSelect.addEventListener('change', () => {
      const isSelected = regAccountTypeSelect.value.trim() !== "";
      
      if (regEmailSubmitBtn) {
        regEmailSubmitBtn.disabled = !isSelected;
      }

      if (regAccountTypeError) {
        if (isSelected) {
          regAccountTypeError.style.display = 'none';
        }
      }

      // حفظ الاختيار
      selectedAccountType = regAccountTypeSelect.value;
      if (selectedAccountType) {
        const selected = accountTypes.find(t => t.label === selectedAccountType);
        selectedAccountCategory = selected?.category || null;
      }
    });
  }

  if (regEmailForm) {
    regEmailForm.addEventListener('submit', (event) => {
      // التحقق من اختيار نوع الحساب
      if (!selectedAccountType || selectedAccountType.trim() === "") {
        event.preventDefault();
        if (regAccountTypeError) {
          regAccountTypeError.style.display = 'block';
        }
        if (regEmailSubmitBtn) {
          regEmailSubmitBtn.disabled = true;
        }
        return;
      }

      handleRegEmailSubmit(event);
    });
  }

  if (regConfirmedBtn) {
    regConfirmedBtn.addEventListener('click', handleRegEmailVerified);
  }

  if (regResendBtn) {
    regResendBtn.addEventListener('click', handleRegResendEmail);
  }

  if (regContinueBtn) {
    regContinueBtn.addEventListener('click', handleRegContinueToProfile);
  }

  syncRegVerificationStateFromUrl();
}

function normalizeEmailAddress(value) {
  return String(value || "").trim().toLowerCase();
}

async function isEmailAlreadyRegistered(email) {
  const normalizedEmail = normalizeEmailAddress(email);
  if (!normalizedEmail) return false;

  // Demo/offline users
  if (findDemoUserByEmail(normalizedEmail)) {
    return true;
  }

  // Saved local accounts (Facebook-style remembered accounts)
  try {
    const saved = JSON.parse(localStorage.getItem("savedAccounts") || "[]");
    if (Array.isArray(saved)) {
      const found = saved.some((account) => normalizeEmailAddress(account?.email) === normalizedEmail);
      if (found) return true;
    }
  } catch (_error) {
    // Ignore malformed local data and continue with server check.
  }

  // Supabase profiles check when available
  if (hasWorkingSupabaseConfig() && typeof fetchProfileByEmail === "function") {
    try {
      const result = await fetchProfileByEmail(normalizedEmail);
      if (result?.data) return true;
    } catch (_error) {
      // Ignore transient failures here; final signup step still validates.
    }
  }

  return false;
}

async function sendAccountRecoveryEmail(email) {
  const normalizedEmail = normalizeEmailAddress(email);
  if (!normalizedEmail) {
    showRegMessage(currentLang === "ar" ? "البريد الإلكتروني مطلوب" : "Email is required", "error");
    return false;
  }

  const redirectTo = `${window.location.origin}${window.location.pathname}#auth-section`;

  if (!hasWorkingSupabaseConfig()) {
    const authEmailInput = document.getElementById("auth-email");
    if (authEmailInput) {
      authEmailInput.value = normalizedEmail;
    }
    window.location.hash = "#auth-section";
    updatePageVisibility();
    showMessage(
      currentLang === "ar"
        ? "لاستعادة الحساب حاليًا: أدخل كلمة المرور لهذا البريد أو أنشئ كلمة مرور جديدة بعد تفعيل Supabase."
        : "For now: sign in with this email password, or enable Supabase to send a reset link.",
      "info",
      authMessage
    );
    return true;
  }

  try {
    const { error } = await supabaseClient.auth.resetPasswordForEmail(normalizedEmail, { redirectTo });
    if (error) {
      throw error;
    }

    showRegMessage(
      currentLang === "ar"
        ? `📩 تم إرسال رابط استعادة الحساب إلى ${normalizedEmail}`
        : `📩 Recovery link sent to ${normalizedEmail}`,
      "success"
    );
    return true;
  } catch (error) {
    showRegMessage(
      error?.message || (currentLang === "ar" ? "تعذّر إرسال رابط الاستعادة." : "Failed to send recovery link."),
      "error"
    );
    return false;
  }
}

function showDuplicateEmailActions(email) {
  const msgEl = document.getElementById("reg-message");
  if (!msgEl) return;

  const normalizedEmail = normalizeEmailAddress(email);
  msgEl.className = "form-message error";
  msgEl.style.display = "block";
  msgEl.innerHTML = `
    <div>${currentLang === "ar" ? "هذا البريد مستخدم بالفعل." : "This email is already in use."}</div>
    <div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap;">
      <button type="button" id="reg-login-now-btn" class="reg-btn-secondary">${currentLang === "ar" ? "دخول الآن" : "Sign In Now"}</button>
      <button type="button" id="reg-recover-account-btn" class="reg-btn-secondary">${currentLang === "ar" ? "استعادة الحساب" : "Recover Account"}</button>
    </div>
  `;

  const loginNowBtn = document.getElementById("reg-login-now-btn");
  if (loginNowBtn) {
    loginNowBtn.addEventListener("click", () => {
      const authEmailInput = document.getElementById("auth-email");
      if (authEmailInput) {
        authEmailInput.value = normalizedEmail;
      }
      window.location.hash = "#auth-section";
      updatePageVisibility();
      showMessage(
        currentLang === "ar" ? "يمكنك تسجيل الدخول مباشرة بهذا البريد." : "You can sign in directly with this email.",
        "info",
        authMessage
      );
    }, { once: true });
  }

  const recoverBtn = document.getElementById("reg-recover-account-btn");
  if (recoverBtn) {
    recoverBtn.addEventListener("click", async () => {
      recoverBtn.disabled = true;
      recoverBtn.textContent = currentLang === "ar" ? "جارٍ الإرسال..." : "Sending...";
      await sendAccountRecoveryEmail(normalizedEmail);
      recoverBtn.disabled = false;
      recoverBtn.textContent = currentLang === "ar" ? "استعادة الحساب" : "Recover Account";
    });
  }
}

/**
 * عند إدخال الإيميل والضغط على "التحقق من البريد"
 */
/**
 * ========================================
 * Email Selector System
 * اختيار البريد الإلكتروني من قائمة المحفوظ
 * ========================================
 */

const SAVED_EMAILS_KEY = 'TIGER_VVIP_SAVED_EMAILS';
const MAX_SAVED_EMAILS = 5;

/**
 * 📧 الحصول على قائمة البريدات المحفوظة
 */
function getSavedEmails() {
  try {
    const stored = localStorage.getItem(SAVED_EMAILS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (err) {
    console.error('❌ Error reading saved emails:', err);
    return [];
  }
}

/**
 * 💾 حفظ بريد جديد في القائمة
 */
function addSavedEmail(email) {
  if (!email || !email.includes('@')) return;
  
  const emails = getSavedEmails();
  const normalizedEmail = email.toLowerCase().trim();
  
  // إزالة البريد إذا كان موجود (لنقله للأول)
  const filtered = emails.filter(e => e.email !== normalizedEmail);
  
  // إضافة البريد الجديد في الأول
  const updated = [
    { email: normalizedEmail, timestamp: Date.now() },
    ...filtered
  ].slice(0, MAX_SAVED_EMAILS);
  
  localStorage.setItem(SAVED_EMAILS_KEY, JSON.stringify(updated));
  renderSavedEmails();
  renderEmailDatalist();
}

/**
 * 🗑️ حذف بريد من القائمة
 */
function deleteSavedEmail(email) {
  const emails = getSavedEmails();
  const updated = emails.filter(e => e.email !== email.toLowerCase().trim());
  localStorage.setItem(SAVED_EMAILS_KEY, JSON.stringify(updated));
  renderSavedEmails();
  renderEmailDatalist();
}

/**
 * 🎯 اختيار بريد من القائمة
 */
function selectEmailFromList(email) {
  const input = document.getElementById('reg-email-input');
  if (input) {
    input.value = email;
    input.focus();
  }
  toggleEmailSelector();
}

/**
 * 📋 عرض قائمة البريدات المحفوظة (Dropdown)
 */
function renderSavedEmails() {
  const container = document.getElementById('saved-emails-container');
  if (!container) return;
  
  const emails = getSavedEmails();
  
  if (emails.length === 0) {
    container.innerHTML = `
      <div class="email-selector-empty">
        <span data-ar="لا توجد بريدات محفوظة" data-en="No saved emails">لا توجد بريدات محفوظة</span>
      </div>
    `;
    return;
  }
  
  container.innerHTML = emails.map(item => {
    const date = new Date(item.timestamp);
    const timeStr = currentLang === 'ar' 
      ? date.toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' })
      : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    return `
      <div class="email-selector-item" onclick="selectEmailFromList('${item.email}')">
        <span class="email-selector-item-icon">✓</span>
        <div class="email-selector-item-text">
          <span class="email-selector-item-email">${item.email}</span>
          <span class="email-selector-item-time">${timeStr}</span>
        </div>
        <button 
          type="button" 
          class="email-selector-item-delete" 
          onclick="event.stopPropagation(); deleteSavedEmail('${item.email}')"
          title="Delete"
        >
          ×
        </button>
      </div>
    `;
  }).join('');
}

/**
 * 📝 عرض قائمة البريدات في datalist (للـ autocomplete)
 */
function renderEmailDatalist() {
  const datalist = document.getElementById('saved-emails-list');
  if (!datalist) return;
  
  const emails = getSavedEmails();
  datalist.innerHTML = emails.map(item => 
    `<option value="${item.email}" label="${new Date(item.timestamp).toLocaleDateString()}">`
  ).join('');
}

/**
 * 🎚️ فتح/إغلاق قائمة البريدات
 */
function toggleEmailSelector(event) {
  if (event) event.preventDefault();
  
  const dropdown = document.getElementById('email-selector-dropdown');
  if (!dropdown) return;
  
  const isVisible = dropdown.style.display !== 'none';
  dropdown.style.display = isVisible ? 'none' : 'block';
  
  if (!isVisible) {
    renderSavedEmails();
  }
}

/**
 * 🔄 تهيئة Email Selector عند تحميل صفحة التسجيل
 */
function initializeEmailSelector() {
  const input = document.getElementById('reg-email-input');
  if (!input) return;
  
  // عرض البريدات المحفوظة عند التركيز
  input.addEventListener('focus', () => {
    if (getSavedEmails().length > 0) {
      // إظهار تلميح
      input.setAttribute('placeholder', 
        currentLang === 'ar'
          ? 'اختر من القائمة أعلاه ↑'
          : 'Choose from list above ↑'
      );
    }
  });
  
  // إخفاء القائمة عند فقدان التركيز
  input.addEventListener('blur', () => {
    setTimeout(() => {
      const dropdown = document.getElementById('email-selector-dropdown');
      if (dropdown) dropdown.style.display = 'none';
    }, 200);
  });
  
  // تحديث datalist عند التحميل
  renderEmailDatalist();
  renderSavedEmails();
}

/**
 * ✅ حفظ البريد المستخدم بعد التحقق الناجح
 */
function saveCurrentEmail() {
  const email = localStorage.getItem('reg_temp_email');
  if (email) {
    addSavedEmail(email);
  }
}

// تهيئة عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => initializeEmailSelector(), 300);
});

async function handleRegEmailSubmit(e) {
  e.preventDefault();
  const emailInput = document.getElementById('reg-email-input');
  const submitBtn = document.querySelector('#reg-email-form .reg-btn-primary');
  const email = normalizeEmailAddress(emailInput.value);

  if (!email) {
    showRegMessage(currentLang === 'ar' ? 'البريد الإلكتروني مطلوب' : 'Email is required', 'error');
    return;
  }

  // التحقق من صيغة البريد
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) {
    showRegMessage(currentLang === 'ar' ? 'البريد الإلكتروني غير صحيح' : 'Invalid email address', 'error');
    return;
  }

  const duplicateEmail = await isEmailAlreadyRegistered(email);
  if (duplicateEmail) {
    showDuplicateEmailActions(email);
    moveRegStep('email');
    return;
  }

  // حفظ الإيميل مؤقتاً
  localStorage.setItem('reg_temp_email', email);
  localStorage.setItem('reg_email_verified', 'false');

  // تعطيل الزر أثناء الإرسال
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = currentLang === 'ar' ? 'جارٍ الإرسال...' : 'Sending...';
  }

  try {
    const sent = await sendVerificationEmail(email);

    if (sent) {
      // الانتقال إلى خطوة التحقق
      moveRegStep('verification');
      const configured = isSupabaseConfigured();
      showRegMessage(
        configured
          ? (currentLang === 'ar'
              ? `✅ تم إرسال رابط التحقق إلى ${email} — تحقق من بريدك وعد للضغط على "تم التأكيد"`
              : `✅ Verification link sent to ${email} — Check your inbox then click "Verified"`)
          : (currentLang === 'ar'
              ? `✅ وضع تجريبي — اضغط "تم التأكيد" للمتابعة مباشرة`
              : `✅ Demo mode — Click "Verified" to continue directly`),
        'success'
      );
    } else {
      showRegMessage(
        currentLang === 'ar'
          ? '❌ تعذّر إرسال البريد. تأكد من البريد وحاول مجدداً.'
          : '❌ Failed to send email. Check the address and try again.',
        'error'
      );
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = currentLang === 'ar' ? 'التحقق من البريد' : 'Verify Email';
    }
  }
}

/**
 * إرسال بريد التحقق عبر Edge Function (Mailgun + AWS SES)
 * أو Supabase OTP كبديل، أو وضع تجريبي
 */
async function sendVerificationEmail(email) {
  const supabaseUrl = String(window.SUPABASE_URL || "").trim();
  const configured = isSupabaseConfigured();

  // ── الطريقة 1: Edge Function مع Mailgun/SES (الأفضل) ──
  const edgeFnConfigured =
    configured &&
    String(window.MAILGUN_API_KEY || window.AWS_ACCESS_KEY_ID || "").trim().length > 4;

  if (edgeFnConfigured) {
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/send-verification-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: String(window.SUPABASE_ANON_KEY || ""),
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          action: "send",
          lang: currentLang || "ar",
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        console.log("✅ Verification email sent via Edge Function (Mailgun/SES)");
        return true;
      }

      console.warn("Edge Function error:", data.error);
    } catch (err) {
      console.warn("Edge Function request failed:", err);
    }
  }

  // ── الطريقة 2: Supabase Auth Magic Link (مجاني - يرسل من خوادم Supabase) ──
  if (configured) {
    try {
      const { error } = await supabaseClient.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: getRegEmailRedirectUrl() },
      });

      if (!error) {
        console.log("✅ Verification email sent via Supabase Magic Link");
        return true;
      }

      console.warn("Supabase OTP error:", error.message);
    } catch (err) {
      console.warn("Supabase OTP request failed:", err);
    }
  }

  // ── الطريقة 3: وضع تجريبي - كود تجاوز تلقائي ──
  console.log("⚠️ Demo mode - using bypass code: 123456");
  // حفظ الكود التجريبي تلقائياً للتحقق
  localStorage.setItem('demo_verify_code_' + email.toLowerCase(), '123456');
  return true; // يعيد true حتى تنتقل إلى خطوة التحقق
}

/**
 * التحقق من توكن البريد عبر Edge Function
 */
async function verifyEmailToken(token, email) {
  const supabaseUrl = String(window.SUPABASE_URL || "").trim();
  const configured = isSupabaseConfigured();

  if (!configured) return { verified: false, error: "Not configured" };

  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/send-verification-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: String(window.SUPABASE_ANON_KEY || ""),
      },
      body: JSON.stringify({
        action: "verify",
        token,
        email,
        lang: currentLang || "ar",
      }),
    });

    const data = await res.json();
    return data;
  } catch (err) {
    console.error("Token verification failed:", err);
    return { verified: false, error: "Network error" };
  }
}

/**
 * عند التحقق من الإيميل
 */
function handleRegEmailVerified() {
  localStorage.setItem('reg_email_verified', 'true');
  
  // 💾 حفظ البريد المستخدم في القائمة
  saveCurrentEmail();
  
  moveRegStep('verified');

  showRegMessage(
    currentLang === 'ar'
      ? '✅ تم التحقق من بريدك الإلكتروني بنجاح!'
      : '✅ Your email has been verified successfully!',
    'success'
  );
}

/**
 * إعادة إرسال بريد التحقق
 */
async function handleRegResendEmail() {
  const email = localStorage.getItem('reg_temp_email');
  if (!email) {
    showRegMessage(
      currentLang === 'ar' ? 'حدث خطأ. حاول من البداية.' : 'Error. Start over.',
      'error'
    );
    moveRegStep('email');
    return;
  }

  const sent = await sendVerificationEmail(email);
  if (sent) {
    showRegMessage(
      currentLang === 'ar'
        ? '📧 تم إعادة إرسال رابط التحقق إلى: ' + email
        : '📧 Verification link resent to: ' + email,
      'success'
    );
    return;
  }

  showRegMessage(
    currentLang === 'ar'
      ? '❌ تعذر إعادة الإرسال. حاول مرة أخرى.'
      : '❌ Resend failed. Please try again.',
    'error'
  );
}

/**
 * المتابعة إلى الملف الشخصي
 */
function handleRegContinueToProfile() {
  // بعد التحقق من البريد، انتظر قليلاً ثم انتقل للملف الشخصي
  // الملف الشخصي سيحمل البيانات من الـ localStorage
  setTimeout(() => {
    window.location.hash = '#profile-page';
    updatePageVisibility();
  }, 300);
}

/**
 * الانتقال بين خطوات التسجيل بسلاسة
 */
function moveRegStep(step) {
  const emailFormWrapper = document.getElementById('reg-email-form-wrapper');
  const verificationWrapper = document.getElementById('reg-verification-wrapper');
  const verifiedWrapper = document.getElementById('reg-verified-wrapper');
  const emailDisplay = document.getElementById('reg-email-display');

  // Fade out all wrappers
  const fadeOutClass = 'fade-out';
  if (emailFormWrapper) emailFormWrapper.classList.add(fadeOutClass);
  if (verificationWrapper) verificationWrapper.classList.add(fadeOutClass);
  if (verifiedWrapper) verifiedWrapper.classList.add(fadeOutClass);

  setTimeout(() => {
    // إخفاء الكل
    if (emailFormWrapper) emailFormWrapper.style.display = 'none';
    if (verificationWrapper) verificationWrapper.style.display = 'none';
    if (verifiedWrapper) verifiedWrapper.style.display = 'none';

    // عرض المطلوب
    if (step === 'email' && emailFormWrapper) {
      emailFormWrapper.classList.remove(fadeOutClass);
      emailFormWrapper.style.display = 'block';
    } else if (step === 'verification' && verificationWrapper) {
      verificationWrapper.classList.remove(fadeOutClass);
      verificationWrapper.style.display = 'block';
      if (emailDisplay) {
        emailDisplay.textContent = localStorage.getItem('reg_temp_email') || '';
      }
    } else if (step === 'verified' && verifiedWrapper) {
      verifiedWrapper.classList.remove(fadeOutClass);
      verifiedWrapper.style.display = 'block';
    }
  }, 200);
}

function showRegMessage(message, type = 'info') {
  const msgEl = document.getElementById('reg-message');
  if (!msgEl) return;

  msgEl.textContent = message;
  msgEl.className = `form-message ${type}`;
  msgEl.style.display = 'block';

  setTimeout(() => {
    msgEl.style.display = 'none';
  }, 5000);
}

async function loadAccountTypesForReg() {
  const select = document.getElementById('reg-account-type');
  if (!select) return;

  ensureRegDefaultOption(select);

  if (!isSupabaseConfigured()) {
    addFallbackRegAccountOptions(select);
    return;
  }

  try {
    const { data, error } = await supabaseClient
      .from('account_types')
      .select('label, category, role')
      .eq('active', true)
      .order('category', { ascending: true })
      .order('label', { ascending: true });

    if (error) throw error;

    const normalized = (data || []).map((type) => ({
      label: type.label,
      role: type.role || mapRoleFromAccountType(type.label),
    }));

    if (!normalized.length) {
      addFallbackRegAccountOptions(select);
      return;
    }

    addRegAccountOptions(select, normalized);
  } catch (error) {
    console.error('Failed to load account types:', error);
    addFallbackRegAccountOptions(select);
  }
}

// 🎯 PRODUCTS FEED SECTION - Facebook Style
function initializeProductsFeed() {
  const OFFICIAL_CALL_NUMBER = "+962780003302";
  const OFFICIAL_WHATSAPP_NUMBER = "962796960886";

  const productsData = [
    {
      title: "فلتر هواء أصلي",
      brand: "BMW",
      model: "BMW X5 G05",
      description: "فلتر هواء عالي الجودة للحفاظ على أداء المحرك",
      price: 65,
      image: "icons/tiger-logo.png",
      category: "مرشحات",
      phone: OFFICIAL_CALL_NUMBER
    },
    {
      title: "كشاف LED أمامي",
      brand: "Mercedes",
      model: "Mercedes S-Class",
      description: "مصابيح LED فاخرة مع توازن ضوء ممتاز",
      price: 235,
      image: "icons/tiger-logo.png",
      category: "إضاءة",
      phone: OFFICIAL_CALL_NUMBER
    },
    {
      title: "طقم فرامل رياضي",
      brand: "Audi",
      model: "Audi Q7",
      description: "فرامل عالية الأداء مع تبريد محسّن",
      price: 395,
      image: "icons/tiger-logo.png",
      category: "فرامل",
      phone: OFFICIAL_CALL_NUMBER
    },
    {
      title: "غطاء مقعد جلد",
      brand: "Range Rover",
      model: "Range Rover",
      description: "غطاء مقعد فاخر مع جلد ناعم",
      price: 340,
      image: "icons/tiger-logo.png",
      category: "ملحقات",
      phone: OFFICIAL_CALL_NUMBER
    },
    {
      title: "بطارية AGM",
      brand: "Lexus",
      model: "Lexus LX",
      description: "بطارية قوة عالية طويلة العمر",
      price: 185,
      image: "icons/tiger-logo.png",
      category: "بطاريات",
      phone: OFFICIAL_CALL_NUMBER
    },
    {
      title: "مجموعة صيانة",
      brand: "Toyota",
      model: "Toyota Land Cruiser",
      description: "مجموعة قطع غيار أساسية للصيانة",
      price: 135,
      image: "icons/tiger-logo.png",
      category: "صيانة",
      phone: OFFICIAL_CALL_NUMBER
    }
  ];

  const feedGrid = document.getElementById('products-feed-grid');
  const emptyState = document.getElementById('feed-empty-state');
  const filterBrand = document.getElementById('feed-filter-brand');
  const filterCategory = document.getElementById('feed-filter-category');
  const filterPrice = document.getElementById('feed-filter-price');
  const searchInput = document.getElementById('feed-search');
  const priceValue = document.getElementById('feed-price-value');
  const resetBtn = document.getElementById('feed-reset-filters');

  // Populate filter dropdowns
  const brands = [...new Set(productsData.map(p => p.brand))];
  const categories = [...new Set(productsData.map(p => p.category))];

  brands.forEach(brand => {
    const option = document.createElement('option');
    option.value = brand;
    option.textContent = brand;
    filterBrand.appendChild(option);
  });

  categories.forEach(category => {
    const option = document.createElement('option');
    option.value = category;
    option.textContent = category;
    filterCategory.appendChild(option);
  });

  function renderProducts(data) {
    feedGrid.innerHTML = '';
    if (data.length === 0) {
      emptyState.style.display = 'block';
      return;
    }
    emptyState.style.display = 'none';

    data.forEach(product => {
      const card = document.createElement('div');
      card.className = 'feed-product-card';
      card.innerHTML = `
        <img src="${product.image}" alt="${product.title}" class="feed-product-image" />
        <div class="feed-product-header">
          <div class="feed-product-brand">${product.brand}</div>
          <h3 class="feed-product-title">${product.title}</h3>
          <p class="feed-product-desc">${product.description}</p>
          <div class="feed-product-price">${product.price} دينار</div>
          <p class="feed-product-specs">الطراز: ${product.model}</p>
        </div>
        <div class="feed-product-actions">
          <a href="https://wa.me/${OFFICIAL_WHATSAPP_NUMBER}" 
             class="feed-contact-btn whatsapp" target="_blank">
            📱 اتصال WhatsApp
          </a>
          <a href="tel:${product.phone}" class="feed-contact-btn call">
            ☎️ اتصال مباشر
          </a>
        </div>
      `;
      feedGrid.appendChild(card);
    });
  }

  function applyFilters() {
    let filtered = productsData;

    // Brand filter
    const selectedBrand = filterBrand.value;
    if (selectedBrand) {
      filtered = filtered.filter(p => p.brand === selectedBrand);
    }

    // Category filter
    const selectedCategory = filterCategory.value;
    if (selectedCategory) {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }

    // Price filter
    const maxPrice = parseInt(filterPrice.value);
    filtered = filtered.filter(p => p.price <= maxPrice);

    // Search filter
    const searchTerm = searchInput.value.toLowerCase();
    if (searchTerm) {
      filtered = filtered.filter(p => 
        p.title.toLowerCase().includes(searchTerm) ||
        p.brand.toLowerCase().includes(searchTerm) ||
        p.model.toLowerCase().includes(searchTerm) ||
        p.description.toLowerCase().includes(searchTerm)
      );
    }

    renderProducts(filtered);
  }

  // Event listeners
  filterBrand.addEventListener('change', applyFilters);
  filterCategory.addEventListener('change', applyFilters);
  filterPrice.addEventListener('input', (e) => {
    priceValue.textContent = e.target.value;
    applyFilters();
  });
  searchInput.addEventListener('input', applyFilters);

  resetBtn.addEventListener('click', () => {
    filterBrand.value = '';
    filterCategory.value = '';
    filterPrice.value = '500';
    searchInput.value = '';
    priceValue.textContent = '500';
    renderProducts(productsData);
  });

  // Initial render
  renderProducts(productsData);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  initializeRegistrationUI();
  initializeProductsFeed();
});

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
