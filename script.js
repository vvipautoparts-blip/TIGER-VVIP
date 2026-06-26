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
const orderForm = document.getElementById("order-form");
const orderProduct = document.getElementById("order-product");
const ordersList = document.getElementById("orders-list");
const ordersEmpty = document.getElementById("orders-empty");
const orderMessage = document.getElementById("order-message");
const authForm = document.getElementById("auth-form");
const authModeToggle = document.getElementById("auth-mode-toggle");
const authMessage = document.getElementById("auth-message");
const userPanel = document.getElementById("user-panel");
const userEmail = document.getElementById("user-email");
const logoutButton = document.getElementById("logout-button");
const userRole = document.getElementById("user-role");
const userSubscription = document.getElementById("user-subscription");
const orderRequestNav = document.getElementById("order-request-nav");
const userOrdersNav = document.getElementById("user-orders-nav");
const partManagementSection = document.getElementById("part-management");
const partForm = document.getElementById("part-form");
const partMessage = document.getElementById("part-message");
const representativeNav = document.getElementById("representative-nav");
const approvalsNav = document.getElementById("approvals-nav");
const adminNav = document.getElementById("admin-nav");
const profileRepLink = document.getElementById("profile-rep-link");
const profileApprovalsLink = document.getElementById("profile-approvals-link");
const profileAdminLink = document.getElementById("profile-admin-link");

const forgotForm = document.getElementById("forgot-form");
const forgotMessage = document.getElementById("forgot-message");
const sendForgotOtpButton = document.getElementById("send-forgot-otp");
const forgotEmail = document.getElementById("forgot-email");
const forgotPhone = document.getElementById("forgot-phone");
const forgotOtp = document.getElementById("forgot-otp");
const forgotNewPassword = document.getElementById("forgot-new-password");

let currentLang = "ar";
let orderRequests = [];
let currentUser = null;
let currentUserProfile = null;
let selectedAccountType = null;
let selectedAccountCategory = null;
let registrationOtpVerified = false;
let pendingForgotOtpPhone = null;
let catalogParts = [];
let displayedCatalogParts = [];
let profileServices = [];
let profileGallery = [];
let profileMeta = null;
let approvalRequests = [];
let profileParts = [];
let profileReviewRequests = [];
let adminRepliesByRequest = {};
let authInProgress = false;
let registrationInProgress = false;
let forgotPasswordInProgress = false;

const ADMIN_ROLES = ["super_admin"];
const STAFF_ROLES = ["manager", "supervisor", "representative"];
const SESSION_DEVICE_KEY = "tiger_vvip_device_id";
const WHATSAPP_OTP_ENDPOINT = window.WHATSAPP_OTP_ENDPOINT || "";

function hasWorkingSupabaseConfig() {
  return Boolean(window.__SUPABASE_CONFIG__?.hasRealKeys && window.__SUPABASE_CONFIG__?.hasLibrary);
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
  { label: "متسوق داعم", category: "متسوق" },
];

const registrationForm = document.getElementById("registration-form");
const accountTypeSearch = document.getElementById("account-type-search");
const accountTypeList = document.getElementById("account-type-list");
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
const shopperNav = document.getElementById("shopper-nav");
const floatingCallAction = document.getElementById("floating-call-action");
const floatingWhatsAppAction = document.getElementById("floating-whatsapp-action");
const planSubscriptionSection = document.getElementById("plan-subscription");
const planSubscriptionForm = document.getElementById("plan-subscription-form");
const planSubscriptionMessage = document.getElementById("plan-subscription-message");
const planRequestPlan = document.getElementById("plan-request-plan");
const planRequestName = document.getElementById("plan-request-name");
const planRequestCenter = document.getElementById("plan-request-center");
const planRequestPhone = document.getElementById("plan-request-phone");
const planRequestEmail = document.getElementById("plan-request-email");
const planRequestNotes = document.getElementById("plan-request-notes");
const profitCalculatorForm = document.getElementById("profit-calculator-form");
const calcBasicCount = document.getElementById("calc-basic-count");
const calcProCount = document.getElementById("calc-pro-count");
const calcPremiumCount = document.getElementById("calc-premium-count");
const calcPlusCount = document.getElementById("calc-plus-count");
const calcFixedCost = document.getElementById("calc-fixed-cost");
const calcOtpCost = document.getElementById("calc-otp-cost");
const calcMonthlyOtpCount = document.getElementById("calc-monthly-otp-count");
const calcTotalRevenue = document.getElementById("calc-total-revenue");
const calcTotalCost = document.getElementById("calc-total-cost");
const calcNetProfit = document.getElementById("calc-net-profit");
const calcBreakEven = document.getElementById("calc-break-even");
const calcResultMessage = document.getElementById("calc-result-message");

const PLAN_REQUESTS_KEY = "tiger_vvip_plan_requests";
const PLATFORM_ACTIVITY_KEY = "tiger_vvip_platform_activity";
const ADMIN_MONITOR_REFRESH_MS = 30000;
let adminMonitorTimer = null;

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
    shopper: { ar: "متسوق داعم", en: "Support Shopper" },
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

function validateEmail(value) {
  const normalized = String(value || "").trim();
  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return pattern.test(normalized);
}

function validatePasswordStrength(value) {
  const password = String(value || "");
  if (password.length < 8) return false;
  const hasLetter = /[A-Za-z]/.test(password);
  const hasNumber = /\d/.test(password);
  return hasLetter && hasNumber;
}

function normalizeDigits(value) {
  const text = String(value || "");
  return text
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776));
}

function normalizePhoneNumber(value) {
  const normalizedDigits = normalizeDigits(value).replace(/[\s()-]/g, "");
  return normalizedDigits;
}

function normalizeOtpCode(value) {
  return normalizeDigits(value).replace(/\D/g, "").slice(0, 6);
}

async function fetchProfileByPhoneFlexible(phone) {
  const normalizedPhone = normalizePhoneNumber(phone);
  const primaryRes = await fetchProfileByPhone(normalizedPhone);
  if (primaryRes?.data || !phone || normalizedPhone === String(phone || "").trim()) {
    return { result: primaryRes, normalizedPhone };
  }

  const fallbackRes = await fetchProfileByPhone(String(phone || "").trim());
  if (fallbackRes?.data) {
    return { result: fallbackRes, normalizedPhone };
  }

  return { result: primaryRes, normalizedPhone };
}

function getAuthErrorMessage(error, fallbackAr, fallbackEn) {
  const message = String(error?.message || "").toLowerCase();
  if (message.includes("invalid login credentials")) {
    return currentLang === "ar"
      ? "بيانات الدخول غير صحيحة. تحقق من البريد/الهاتف وكلمة المرور."
      : "Invalid credentials. Check your email/phone and password.";
  }
  if (message.includes("email not confirmed")) {
    return currentLang === "ar"
      ? "يرجى تأكيد البريد الإلكتروني أولاً."
      : "Please confirm your email first.";
  }
  if (message.includes("network") || message.includes("fetch")) {
    return currentLang === "ar"
      ? "تعذر الاتصال بالخادم. تحقق من الشبكة وحاول مرة أخرى."
      : "Could not reach the server. Check your network and try again.";
  }
  return currentLang === "ar" ? fallbackAr : fallbackEn;
}

async function resolveLoginEmail(identifier) {
  const normalized = String(identifier || "").trim();
  if (!normalized) {
    return { email: null, error: currentLang === "ar" ? "أدخل البريد الإلكتروني أو رقم الهاتف." : "Enter email or phone number." };
  }

  if (validateEmail(normalized)) {
    return { email: normalized.toLowerCase(), error: null };
  }

  const normalizedPhone = normalizePhoneNumber(normalized);
  if (!validatePhoneNumber(normalizedPhone)) {
    return {
      email: null,
      error: currentLang === "ar"
        ? "صيغة الإدخال غير صحيحة. استخدم بريدًا صحيحًا أو رقم هاتف دولي مثل +962..."
        : "Invalid format. Use a valid email or international phone like +962...",
    };
  }

  const profileLookup = await fetchProfileByPhoneFlexible(normalizedPhone);
  const profileRes = profileLookup.result;
  if (profileRes.error) {
    return {
      email: null,
      error: getAuthErrorMessage(
        profileRes.error,
        "تعذر التحقق من رقم الهاتف الآن. حاول مرة أخرى.",
        "Unable to validate phone number right now. Please try again."
      ),
    };
  }

  if (!profileRes.data?.email) {
    return {
      email: null,
      error: currentLang === "ar"
        ? "رقم الهاتف غير مرتبط بحساب بريد. استخدم البريد الإلكتروني للدخول."
        : "This phone is not linked to an email account. Sign in using email.",
    };
  }

  return { email: String(profileRes.data.email).toLowerCase(), error: null };
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
  if (!container) return;
  container.textContent = text;
  container.className = `form-message ${type}`;
  container.style.display = "block";
  setTimeout(() => {
    container.className = "form-message";
    container.style.display = "none";
  }, 4500);
}

function showPartMessage(text, type = "success") {
  if (!partMessage) return;
  showMessage(text, type, partMessage);
}

function isPartManager(role) {
  return ["dealer", "representative", "manager", "super_admin"].includes(role);
}

function isReadOnlyShopper(role) {
  return role === "shopper";
}

function getSubscriptionRates() {
  return {
    basic: 59,
    pro: 129,
    premium: 249,
    plus: 449,
    shopper: 1,
  };
}

function getFirstFreeSubscriptionEnd(profile) {
  const createdAt = profile?.created_at ? new Date(profile.created_at) : new Date();
  const end = new Date(createdAt);
  end.setDate(end.getDate() + 30);
  return end;
}

function getSubscriptionDisplayText(profile) {
  if (!profile) return currentLang === "ar" ? "أساسي" : "Basic";

  const role = profile.role || "dealer";
  const freeUntil = getFirstFreeSubscriptionEnd(profile);
  const freeUntilText = freeUntil.toLocaleDateString(currentLang === "ar" ? "ar-SA" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  if (role === "shopper") {
    return currentLang === "ar"
      ? `متسوق داعم - أول اشتراك مجاني حتى ${freeUntilText} ثم 1 د.أ / شهر`
      : `Support Shopper - first subscription free until ${freeUntilText}, then JOD 1 / month`;
  }

  return currentLang === "ar"
    ? `أول اشتراك مجاني حتى ${freeUntilText}`
    : `First subscription free until ${freeUntilText}`;
}

function updateProfitCalculator() {
  if (!calcTotalRevenue || !calcTotalCost || !calcNetProfit || !calcBreakEven) return;

  const rates = getSubscriptionRates();
  const basicCount = Number(calcBasicCount?.value || 0);
  const proCount = Number(calcProCount?.value || 0);
  const premiumCount = Number(calcPremiumCount?.value || 0);
  const plusCount = Number(calcPlusCount?.value || 0);
  const shopperCount = Number(document.getElementById("calc-shopper-count")?.value || 0);
  const fixedCost = Number(calcFixedCost?.value || 0);
  const otpMonthlyCount = Number(calcMonthlyOtpCount?.value || 0);
  const otpCost = Number(calcOtpCost?.value || 0);

  const revenue = (basicCount * rates.basic) + (proCount * rates.pro) + (premiumCount * rates.premium) + (plusCount * rates.plus) + (shopperCount * rates.shopper);
  const variableOtpCost = otpMonthlyCount * otpCost;
  const totalCost = fixedCost + variableOtpCost;
  const netProfit = revenue - totalCost;
  const averageRevenuePerSubscriber = (rates.basic + rates.pro + rates.premium + rates.plus + rates.shopper) / 5;
  const breakEvenSubscribers = averageRevenuePerSubscriber > 0 ? Math.ceil(totalCost / averageRevenuePerSubscriber) : 0;

  calcTotalRevenue.textContent = formatDinar(revenue);
  calcTotalCost.textContent = formatDinar(totalCost);
  calcNetProfit.textContent = formatDinar(netProfit);
  calcBreakEven.textContent = String(breakEvenSubscribers);

  if (calcResultMessage) {
    calcResultMessage.textContent = currentLang === "ar"
      ? `الإيراد الشهري ${formatDinar(revenue)} وصافي الربح ${formatDinar(netProfit)}.`
      : `Monthly revenue is ${formatDinar(revenue)} and net profit is ${formatDinar(netProfit)}.`;
  }
}

function isApprovalReviewerRole(role) {
  return ["representative", "manager", "super_admin"].includes(role);
}

function switchProfileTab(tabName) {
  const buttons = Array.from(document.querySelectorAll(".profile-tab-btn"));
  const panels = Array.from(document.querySelectorAll(".profile-tab-panel"));
  buttons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.profileTab === tabName);
  });
  panels.forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.profilePanel === tabName);
  });
}

function parseLegacyPriceToJod(priceText) {
  const cleaned = String(priceText || "0").replace(/[^\d.]/g, "");
  return Number(cleaned || 0);
}

function getFallbackCatalogParts() {
  return products.map((product, index) => {
    const modelTokens = String(product.model || "").split(" ");
    const brand = modelTokens[0] || "Unknown";
    const model = modelTokens.slice(1).join(" ") || product.model || "Unknown";
    return {
      id: `local-${index + 1}`,
      name: product.title,
      description: product.description,
      price_jod: parseLegacyPriceToJod(product.price),
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
    description: part.description || "-",
    price_jod: Number(part.price_jod ?? parseLegacyPriceToJod(part.price)),
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
  renderProducts(displayedCatalogParts);
  populateProductOptions();
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
    <article class="profile-data-card">
      <h4>${part.name}</h4>
      <p>${part.brand || "-"} ${part.model || "-"} ${part.year || ""}</p>
      <p>${currentLang === "ar" ? "الفئة" : "Category"}: ${part.category || "-"}</p>
      <p>${currentLang === "ar" ? "السعر" : "Price"}: ${formatDinar(part.price_jod)}</p>
      <p>${currentLang === "ar" ? "الحالة" : "Status"}: <span class="status ${String(part.status || "pending").toLowerCase()}">${part.status || "pending"}</span></p>
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

  const payload = {
    name: document.getElementById("part-name").value.trim(),
    description: document.getElementById("part-description").value.trim(),
    price_jod: Number(document.getElementById("part-price").value || 0),
    image_url: document.getElementById("part-image").value.trim() || null,
    status: document.getElementById("part-status").value,
    category: document.getElementById("part-category").value.trim(),
    brand: document.getElementById("part-brand").value.trim(),
    model: document.getElementById("part-model").value.trim(),
    year: Number(document.getElementById("part-year").value || 0),
    body_type: document.getElementById("part-body-type").value.trim(),
    dealer_id: currentUser.id,
  };

  if (!payload.name || !payload.brand || !payload.model || !payload.category || !payload.body_type || !payload.year) {
    showPartMessage(currentLang === "ar" ? "يرجى تعبئة كل الحقول الإلزامية." : "Please fill all required fields.", "error");
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
  if (partForm) partForm.reset();
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
  recordPlatformActivity(
    "review",
    currentLang === "ar" ? "رد إداري على مراجعة" : "Admin reply sent",
    String(reviewRequestId),
    "approved"
  );
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
    return ["#auth-section", "#registration-page", "#forgot-password", "#plans-section", "#shopper-section", ""].includes(hash);
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
  const shopper = isReadOnlyShopper(role);

  if (representativeNav) representativeNav.style.display = showRep ? "inline-flex" : "none";
  if (approvalsNav) approvalsNav.style.display = showApprovals ? "inline-flex" : "none";
  if (adminNav) adminNav.style.display = showAdmin ? "inline-flex" : "none";
  if (orderRequestNav) orderRequestNav.style.display = shopper ? "none" : "inline-flex";
  if (userOrdersNav) userOrdersNav.style.display = shopper ? "none" : "inline-flex";
  if (profileRepLink) profileRepLink.style.display = showRep ? "inline-flex" : "none";
  if (profileApprovalsLink) profileApprovalsLink.style.display = showApprovals ? "inline-flex" : "none";
  if (profileAdminLink) profileAdminLink.style.display = showAdmin ? "inline-flex" : "none";
  if (floatingCallAction) floatingCallAction.style.display = shopper ? "inline-flex" : "none";
  if (floatingWhatsAppAction) floatingWhatsAppAction.style.display = shopper ? "inline-flex" : "none";
  if (shopperNav) shopperNav.classList.toggle("shopper-featured", shopper);
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
    showSupabaseConfigurationMessage(regMessage);
    return false;
  }

  if (!WHATSAPP_OTP_ENDPOINT) {
    showWhatsAppOtpConfigurationMessage(regMessage);
    return false;
  }

  const phone = normalizePhoneNumber(registrationPhone.value.trim());
  registrationPhone.value = phone;
  if (!validatePhoneNumber(phone)) {
    showRegistrationMessage(currentLang === "ar" ? "رقم الهاتف غير صالح." : "Invalid phone number.", "error");
    return false;
  }

  const duplicatePhoneLookup = await fetchProfileByPhoneFlexible(phone);
  const duplicatePhone = duplicatePhoneLookup.result;
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
    showSupabaseConfigurationMessage(regMessage);
    return false;
  }

  const code = normalizeOtpCode(registrationOtp.value.trim());
  registrationOtp.value = code;
  const phone = normalizePhoneNumber(registrationPhone.value.trim());
  registrationPhone.value = phone;
  if (!/^\d{6}$/.test(code)) {
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
  recordPlatformActivity(
    "approval",
    currentLang === "ar" ? "تم اعتماد مستخدم" : "User approved",
    userId,
    "approved"
  );
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
  recordPlatformActivity(
    "payment",
    currentLang === "ar" ? "تم صرف راتب أسبوعي" : "Weekly salary paid",
    `${userId} • ${formatDinar(total)}`,
    "completed"
  );
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

async function renderSuperAdminControlCenter() {
  const section = document.getElementById("super-admin-control-center");
  if (!section) return;

  if (!isAdminRole(currentUserProfile?.role)) {
    section.style.display = "none";
    stopAdminMonitorAutoRefresh();
    return;
  }

  section.style.display = "block";

  const monitorStatusEl = document.getElementById("admin-monitor-status");
  const monitorUpdatedEl = document.getElementById("admin-monitor-updated");
  const operationsEl = document.getElementById("gm-achievement-operations");
  const commissionsEl = document.getElementById("gm-achievement-commissions");
  const dueUsersEl = document.getElementById("gm-due-users");
  const dueTotalEl = document.getElementById("gm-due-total");
  const pendingQueueEl = document.getElementById("gm-pending-queue");
  const dueListEl = document.getElementById("gm-due-list");
  const trackingListEl = document.getElementById("gm-tracking-list");
  const insightsEl = document.getElementById("gm-ai-insights");

  const dashboard = await fetchGlobalCommissionDashboard();
  const pendingProfilesRes = await fetchPendingApprovals();
  const pendingReviewsRes = await fetchReviewRequests("pending");
  const approvalRequestsRes = typeof fetchApprovalRequests === "function"
    ? await fetchApprovalRequests("pending")
    : { data: [] };

  const commissions = dashboard?.commissions?.data || [];
  const payments = dashboard?.payments?.data || [];
  const pendingProfiles = pendingProfilesRes?.data || [];
  const pendingReviews = pendingReviewsRes?.data || [];
  const pendingApprovalRequests = approvalRequestsRes?.data || [];
  const planRequests = loadPlanRequests().filter((item) => item?.status === "new");

  const dueMap = commissions
    .filter((item) => item?.status === "earned")
    .reduce((acc, item) => {
      const key = item.user_id || "unknown";
      acc[key] = Number(acc[key] || 0) + Number(item.amount || 0);
      return acc;
    }, {});

  const dueRows = Object.entries(dueMap)
    .filter(([, amount]) => Number(amount) > 0)
    .sort((a, b) => Number(b[1]) - Number(a[1]));

  const totalDueAmount = dueRows.reduce((sum, [, amount]) => sum + Number(amount || 0), 0);
  const pendingQueue = pendingProfiles.length + pendingReviews.length + pendingApprovalRequests.length + planRequests.length;

  if (operationsEl) operationsEl.textContent = String(commissions.length);
  if (commissionsEl) commissionsEl.textContent = formatDinar(commissions.reduce((sum, item) => sum + Number(item.amount || 0), 0));
  if (dueUsersEl) dueUsersEl.textContent = String(dueRows.length);
  if (dueTotalEl) dueTotalEl.textContent = formatDinar(totalDueAmount);
  if (pendingQueueEl) pendingQueueEl.textContent = String(pendingQueue);
  if (monitorUpdatedEl) monitorUpdatedEl.textContent = getMonitorTimestampText();
  if (monitorStatusEl) monitorStatusEl.textContent = currentLang === "ar" ? "متابعة تلقائية" : "Auto Monitoring";

  if (dueListEl) {
    if (!dueRows.length) {
      dueListEl.innerHTML = `<article class="dashboard-empty">${currentLang === "ar" ? "لا يوجد استحقاقات حالياً." : "No due payments currently."}</article>`;
    } else {
      dueListEl.innerHTML = dueRows.slice(0, 10).map(([userId, amount]) => `
        <article class="dashboard-row">
          <div>
            <strong>${formatDinar(amount)}</strong>
            <p>${currentLang === "ar" ? "مستخدم" : "User"}: ${userId}</p>
          </div>
          <button type="button" class="btn primary" data-action="pay-weekly" data-user-id="${userId}">
            ${currentLang === "ar" ? "صرف الآن" : "Pay Now"}
          </button>
        </article>
      `).join("");
    }
  }

  if (trackingListEl) {
    const trackingRows = [];
    const activityLog = loadPlatformActivity().slice(0, 8);

    activityLog.forEach((entry) => {
      trackingRows.push(`
        <article class="dashboard-row ai-insight-row">
          <div>
            <strong>${entry.title || (currentLang === "ar" ? "نشاط منصة" : "Platform activity")}</strong>
            <p>${entry.detail || "--"} • ${new Date(entry.created_at).toLocaleString(currentLang === "ar" ? "ar-SA" : "en-US", { dateStyle: "medium", timeStyle: "short" })}</p>
          </div>
          <span class="status ${entry.level || "active"}">${entry.type || "log"}</span>
        </article>
      `);
    });

    pendingProfiles.slice(0, 3).forEach((item) => {
      trackingRows.push(`
        <article class="dashboard-row">
          <div>
            <strong>${currentLang === "ar" ? "طلب اعتماد مستخدم" : "User approval request"}</strong>
            <p>${item.full_name || "--"} • ${item.account_type || item.role || "--"}</p>
          </div>
          <button type="button" class="btn secondary" data-action="approve-user" data-user-id="${item.id}">
            ${currentLang === "ar" ? "اعتماد" : "Approve"}
          </button>
        </article>
      `);
    });

    pendingReviews.slice(0, 3).forEach((item) => {
      trackingRows.push(`
        <article class="dashboard-row">
          <div>
            <strong>${currentLang === "ar" ? "طلب مراجعة" : "Review request"} #${item.id}</strong>
            <p>${item.request_message || "--"}</p>
          </div>
          <button type="button" class="btn secondary" data-action="reply-review" data-review-id="${item.id}">
            ${currentLang === "ar" ? "رد" : "Reply"}
          </button>
        </article>
      `);
    });

    payments.slice(0, 3).forEach((item) => {
      trackingRows.push(`
        <article class="dashboard-row">
          <div>
            <strong>${currentLang === "ar" ? "دفعة راتب" : "Salary payment"}</strong>
            <p>${formatDinar(item.total_amount || 0)} • ${(item.payment_date || "").slice(0, 10)}</p>
          </div>
          <span class="status completed">${currentLang === "ar" ? "منفذة" : "Executed"}</span>
        </article>
      `);
    });

    planRequests.slice(0, 3).forEach((item) => {
      trackingRows.push(`
        <article class="dashboard-row">
          <div>
            <strong>${currentLang === "ar" ? "طلب اشتراك باقة" : "Plan subscription request"}</strong>
            <p>${item.center || "--"} • ${item.plan || "basic"}</p>
          </div>
          <span class="status pending">${currentLang === "ar" ? "جديد" : "New"}</span>
        </article>
      `);
    });

    trackingListEl.innerHTML = trackingRows.length
      ? trackingRows.join("")
      : `<article class="dashboard-empty">${currentLang === "ar" ? "لا توجد أحداث جديدة الآن." : "No new events right now."}</article>`;
  }

  if (insightsEl) {
    const insights = buildAiInsights({
      pendingQueue,
      totalDueAmount,
      dueUsersCount: dueRows.length,
      pendingReviews: pendingReviews.length,
    });

    insightsEl.innerHTML = insights.map((text) => `
      <article class="dashboard-row ai-insight-row">
        <div>
          <strong>${currentLang === "ar" ? "توصية ذكية" : "AI Insight"}</strong>
          <p>${text}</p>
        </div>
      </article>
    `).join("");
  }
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
        const shopperOnly = isReadOnlyShopper(currentUserProfile?.role);
        return `
      <article class="product-card">
        <h3>${product.name}</h3>
        <p><strong data-ar="الماركة:" data-en="Brand:">الماركة:</strong> ${product.brand || "-"}</p>
        <p><strong data-ar="الطراز:" data-en="Model:">الطراز:</strong> ${product.model || "-"}</p>
        <p><strong data-ar="السنة:" data-en="Year:">السنة:</strong> ${product.year || "-"}</p>
        <p><strong data-ar="الهيكل:" data-en="Body:">الهيكل:</strong> ${product.body_type || "-"}</p>
        <p><strong data-ar="الفئة:" data-en="Category:">الفئة:</strong> ${product.category || "-"}</p>
        <p><strong data-ar="الحالة:" data-en="Status:">الحالة:</strong> ${product.status || "-"}</p>
        <p>${product.description}</p>
        <div class="price">${formatDinar(product.price_jod)}</div>
        ${shopperOnly ? `<a class="btn primary" href="tel:+962780003302">${currentLang === "ar" ? "اتصل الآن" : "Call Now"}</a>` : `<button class="btn secondary" type="button" data-action="order" data-index="${index}">اطلب الآن</button>`}
        ${shopperOnly ? `<a class="btn secondary" href="https://wa.me/962780003302" target="_blank" rel="noopener">${currentLang === "ar" ? "واتساب" : "WhatsApp"}</a>` : `<button class="btn secondary" type="button" data-action="request-review" data-index="${index}">${currentLang === "ar" ? "طلب مراجعة" : "Review Request"}</button>`}
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
  userSubscription.textContent = getSubscriptionDisplayText(currentUserProfile);
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
  if (authInProgress) {
    return null;
  }

  if (!hasWorkingSupabaseConfig()) {
    showSupabaseConfigurationMessage(authMessage);
    return null;
  }

  const submitButton = authForm?.querySelector('button[type="submit"]');
  authInProgress = true;
  if (submitButton) submitButton.disabled = true;

  try {
    const resolved = await resolveLoginEmail(email);
    if (resolved.error) {
      showMessage(resolved.error, "error", authMessage);
      return null;
    }

    if (!password || password.length < 8) {
      showMessage(
        currentLang === "ar"
          ? "كلمة المرور غير صالحة. الحد الأدنى 8 أحرف."
          : "Invalid password. Minimum 8 characters.",
        "error",
        authMessage
      );
      return null;
    }

    const response = await signIn(resolved.email, password);
    if (response.error) {
      showMessage(
        getAuthErrorMessage(response.error, messages.authError.ar, messages.authError.en),
        "error",
        authMessage
      );
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
    const [existingSession, activeSessions] = await Promise.all([
      supabaseClient
        .from("user_sessions")
        .select("id")
        .eq("user_id", currentUser.id)
        .eq("device_id", deviceId)
        .eq("is_active", true)
        .maybeSingle(),
      fetchActiveSessionsCount(currentUser.id),
    ]);

    if (activeSessions.error) {
      showMessage(messages.authError[currentLang], "error", authMessage);
      return null;
    }

    const willExceed = !existingSession.data && activeSessions.count >= 3;
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
    recordPlatformActivity(
      "auth",
      currentLang === "ar" ? "تسجيل دخول ناجح" : "Successful sign in",
      `${currentUser.email} • ${currentUserProfile?.role || "dealer"}`,
      "approved"
    );
    await syncOrdersFromSupabase();
    await loadProfileAssets();
    await renderRepresentativeDashboard();
    await renderAdminDashboard();
    await renderApprovalsDashboard();

    setTimeout(() => {
      window.location.hash = "#profile-page";
      updatePageVisibility();
    }, 500);

    return currentUser;
  } finally {
    authInProgress = false;
    if (submitButton) submitButton.disabled = false;
  }
}

async function handleLogout() {
  recordPlatformActivity(
    "auth",
    currentLang === "ar" ? "تسجيل خروج" : "Sign out",
    currentUser?.email || "--",
    "pending"
  );
  stopAdminMonitorAutoRefresh();
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
    window.location.hash = "#auth-section";
    updatePageVisibility();
  }, 600);
}

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
    if (isReadOnlyShopper(currentUserProfile?.role)) {
      if (!window.location.hash || window.location.hash === "#auth-section" || window.location.hash === "#registration-page" || window.location.hash === "#profile-page") {
        window.location.hash = "#shopper-section";
      }
    } else if (!window.location.hash || window.location.hash === "#auth-section" || window.location.hash === "#registration-page") {
      window.location.hash = "#profile-page";
    }
  }
  updatePageVisibility();
}

function updatePageVisibility() {
  const hash = window.location.hash.toLowerCase();
  const isAuth = !!currentUser;
  const isOnAuthPages = hash === "#auth-section" || hash === "#registration-page" || hash === "#forgot-password" || hash === "#plans-section" || hash === "";
  const isShopperPage = hash === "#shopper-section";

  if (hash === "#admin-dashboard") {
    window.location.hash = "#profile-page";
    return;
  }

  if (isReadOnlyShopper(currentUserProfile?.role) && (hash === "#order-request" || hash === "#user-orders")) {
    window.location.hash = "#profile-page";
    return;
  }

  if (!canAccessRoute(hash)) {
    window.location.hash = isAuth ? "#profile-page" : "#auth-section";
    return;
  }
  
  // Remove all page classes
  document.body.classList.remove("login-page", "profile-page");
  
  // Hide all main sections except active
  const allSections = document.querySelectorAll("main > section");
  allSections.forEach(section => {
    section.style.display = "none";
  });
  
  if (isOnAuthPages) {
    stopAdminMonitorAutoRefresh();
    if (hash === "#forgot-password") {
      document.getElementById("forgot-password").style.display = "block";
    } else if (hash === "#plans-section") {
      document.getElementById("plans-section").style.display = "block";
    } else if (hash === "#registration-page") {
      document.getElementById("registration-page").style.display = "block";
    } else {
      document.getElementById("auth-section").style.display = "block";
    }
    document.body.classList.add("login-page");
  } else if (isShopperPage) {
    document.getElementById("shopper-section").style.display = "block";
  } else if (hash === "#profile-page") {
    // Show profile page
    if (!isAuth) {
      window.location.hash = "#auth-section";
      return;
    }
    document.getElementById("profile-page").style.display = "block";
    document.body.classList.add("profile-page");
    renderProfilePage();
    startAdminMonitorAutoRefresh();
  } else if (hash === "#representative-dashboard") {
    stopAdminMonitorAutoRefresh();
    document.getElementById("representative-dashboard").style.display = "block";
    renderRepresentativeDashboard();
  } else if (hash === "#approvals-dashboard") {
    stopAdminMonitorAutoRefresh();
    document.getElementById("approvals-dashboard").style.display = "block";
    renderApprovalsDashboard();
  } else {
    stopAdminMonitorAutoRefresh();
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
  applyDataI18nBindings();
  document.querySelectorAll("[data-ar]").forEach((el) => {
    el.textContent = currentLang === "ar" ? el.dataset.ar : el.dataset.en;
  });
  document.querySelectorAll("[data-ar-placeholder]").forEach((el) => {
    el.placeholder = currentLang === "ar" ? el.dataset.arPlaceholder : el.dataset.enPlaceholder;
  });
  langToggle.textContent = currentLang === "ar" ? "English" : "العربية";
  updateProfitCalculator();
}

function openPlanSubscription(planCode = "basic") {
  if (!planSubscriptionSection) return;
  if (planRequestPlan) {
    planRequestPlan.value = planCode;
  }
  planSubscriptionSection.scrollIntoView({ behavior: "smooth", block: "start" });
  setTimeout(() => planRequestName?.focus(), 250);
}

function loadPlanRequests() {
  try {
    const raw = localStorage.getItem(PLAN_REQUESTS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (_error) {
    return [];
  }
}

function savePlanRequest(payload) {
  const requests = loadPlanRequests();
  requests.unshift(payload);
  localStorage.setItem(PLAN_REQUESTS_KEY, JSON.stringify(requests.slice(0, 200)));
}

function loadPlatformActivity() {
  try {
    const raw = localStorage.getItem(PLATFORM_ACTIVITY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (_error) {
    return [];
  }
}

function recordPlatformActivity(type, title, detail = "", level = "info") {
  const entry = {
    id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    title,
    detail,
    level,
    created_at: new Date().toISOString(),
  };
  const entries = loadPlatformActivity();
  entries.unshift(entry);
  localStorage.setItem(PLATFORM_ACTIVITY_KEY, JSON.stringify(entries.slice(0, 200)));
  return entry;
}

function getMonitorTimestampText() {
  const stamp = new Date().toLocaleString(currentLang === "ar" ? "ar-SA" : "en-US");
  return currentLang === "ar" ? `آخر تحديث: ${stamp}` : `Last update: ${stamp}`;
}

function buildAiInsights(metrics) {
  const insights = [];
  if (metrics.pendingQueue > 8) {
    insights.push(currentLang === "ar"
      ? "AI: يوجد تكدس مرتفع في الطلبات المعلقة. الأولوية الحالية: الاعتمادات ثم طلبات المراجعة."
      : "AI: High pending queue detected. Current priority: approvals then review requests.");
  }
  if (metrics.totalDueAmount > 0 && metrics.dueUsersCount > 0) {
    insights.push(currentLang === "ar"
      ? `AI: لديك ${metrics.dueUsersCount} مستخدمين باستحقاق إجمالي ${formatDinar(metrics.totalDueAmount)}. يوصى بجدولة صرف أسبوعي اليوم.`
      : `AI: ${metrics.dueUsersCount} users are due for a total of ${formatDinar(metrics.totalDueAmount)}. Weekly payout is recommended today.`);
  }
  if (metrics.pendingReviews > 0) {
    insights.push(currentLang === "ar"
      ? `AI: توجد ${metrics.pendingReviews} طلبات مراجعة بلا رد. الرد السريع يقلل زمن الإغلاق التشغيلي.`
      : `AI: ${metrics.pendingReviews} review requests are waiting without reply. Fast response reduces operational cycle time.`);
  }
  if (!insights.length) {
    insights.push(currentLang === "ar"
      ? "AI: الأداء مستقر حاليا. حافظ على التحديث التلقائي لمتابعة أي تغير فوري."
      : "AI: Performance is currently stable. Keep auto-monitoring on for immediate changes.");
  }
  return insights;
}

function stopAdminMonitorAutoRefresh() {
  if (adminMonitorTimer) {
    clearInterval(adminMonitorTimer);
    adminMonitorTimer = null;
  }
}

function startAdminMonitorAutoRefresh() {
  stopAdminMonitorAutoRefresh();
  if (!isAdminRole(currentUserProfile?.role)) return;
  if (window.location.hash.toLowerCase() !== "#profile-page") return;

  adminMonitorTimer = setInterval(async () => {
    await renderSuperAdminControlCenter();
  }, ADMIN_MONITOR_REFRESH_MS);
}

if (profitCalculatorForm) {
  profitCalculatorForm.addEventListener("input", () => {
    updateProfitCalculator();
  });
  updateProfitCalculator();
}

function getI18nDictionary() {
  return window.__I18N_TEXT__ || window.i18nText || {};
}

function applyDataI18nBindings() {
  const dictionary = getI18nDictionary();
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.dataset.i18n;
    if (!key) return;

    const entry = dictionary[key];
    if (entry && typeof entry === "object") {
      if (!el.dataset.ar && typeof entry.ar === "string") {
        el.dataset.ar = entry.ar;
      }
      if (!el.dataset.en && typeof entry.en === "string") {
        el.dataset.en = entry.en;
      }
      if (!el.dataset.arPlaceholder && typeof entry.ar_placeholder === "string") {
        el.dataset.arPlaceholder = entry.ar_placeholder;
      }
      if (!el.dataset.enPlaceholder && typeof entry.en_placeholder === "string") {
        el.dataset.enPlaceholder = entry.en_placeholder;
      }
    }
  });
}

function renderAccountTypeOptions(filter = "") {
  const normalized = filter.trim().toLowerCase();
  const results = accountTypes.filter((item) => {
    return (
      item.label.toLowerCase().includes(normalized) ||
      item.category.toLowerCase().includes(normalized)
    );
  });

  if (results.length === 0) {
    accountTypeList.innerHTML = `<div class="dropdown-item" tabindex="0"><span>${currentLang === "ar" ? "لا توجد نتائج" : "No results found"}</span></div>`;
    accountTypeList.classList.add("visible");
    return;
  }

  accountTypeList.innerHTML = results
    .map(
      (item) => `
      <button type="button" class="dropdown-item" data-label="${item.label}" data-category="${item.category}">
        <div>${item.label}</div>
        <span>${item.category}</span>
      </button>
    `
    )
    .join("");
  accountTypeList.classList.add("visible");
}

function closeAccountTypeOptions() {
  accountTypeList.classList.remove("visible");
}

async function loadAccountTypes() {
  if (typeof fetchAccountTypes !== "function") {
    return;
  }

  const { data, error } = await fetchAccountTypes();
  if (!error && Array.isArray(data) && data.length > 0) {
    accountTypes = data.map((item) => ({ label: item.label, category: item.category }));
  }
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
    profileSubscriptionEl.textContent = getSubscriptionDisplayText(currentUserProfile);
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

  const shopperMode = isReadOnlyShopper(currentUserProfile?.role);
  if (editProfileButton) {
    editProfileButton.style.display = shopperMode ? "none" : "inline-flex";
  }
  document.querySelectorAll(".profile-tab-btn").forEach((button) => {
    const tabName = button.dataset.profileTab;
    const visibleForShopper = ["info", "contact"].includes(tabName);
    button.style.display = shopperMode && !visibleForShopper ? "none" : "inline-flex";
  });
  document.querySelectorAll(".profile-tab-panel").forEach((panel) => {
    const panelName = panel.dataset.profilePanel;
    const visibleForShopper = ["info", "contact"].includes(panelName);
    if (shopperMode) {
      panel.style.display = visibleForShopper ? "block" : "none";
    } else {
      panel.style.display = "";
    }
  });
  if (shopperMode && profileBio) {
    profileBio.textContent = currentLang === "ar"
      ? "هذا حساب متسوق للمشاهدة والتواصل فقط. لا يمكنه نشر أو إضافة محتوى داخل المنصة."
      : "This is a read-only shopper account for viewing and contact only. It cannot publish or add content inside the platform.";
  }

  updateFloatingContactActions(phoneText);
  updateProfileShareActions(profileNameText, phoneText);

  renderProfileGallery();
  renderProfileServices();
  renderProfileParts();
  renderProfileReviewRequests();
  renderSuperAdminControlCenter();
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
  accountTypeSearch.value = "";
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
  document.getElementById("registration-email")?.focus();
}

accountTypeSearch.addEventListener("focus", () => {
  renderAccountTypeOptions(accountTypeSearch.value);
});

accountTypeSearch.addEventListener("input", (event) => {
  renderAccountTypeOptions(event.target.value);
});

document.addEventListener("click", (event) => {
  const dropdownItem = event.target.closest(".dropdown-item");
  if (dropdownItem && dropdownItem.dataset.label) {
    selectedAccountType = dropdownItem.dataset.label;
    selectedAccountCategory = dropdownItem.dataset.category;
    accountTypeSearch.value = selectedAccountType;
    updateRegistrationMode();
    closeAccountTypeOptions();
    return;
  }

  if (!event.target.closest(".account-type-dropdown")) {
    closeAccountTypeOptions();
  }
});

registrationForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (registrationInProgress) {
    return;
  }

  if (!accountTypeSearch.value.trim() || !selectedAccountType) {
    showRegistrationMessage(currentLang === "ar" ? "اختر نوع الحساب من القائمة أولاً." : "Choose an account type from the list first.", "error");
    return;
  }

  const phoneValue = registrationPhone.value.trim();
  const normalizedPhoneValue = normalizePhoneNumber(phoneValue);
  registrationPhone.value = normalizedPhoneValue;
  if (!validatePhoneNumber(normalizedPhoneValue)) {
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

  registrationInProgress = true;
  const submitButton = registrationForm.querySelector('button[type="submit"]');
  if (submitButton) submitButton.disabled = true;
  try {
    const sent = await sendRegistrationOtp();
    if (sent) {
      showRegistrationMessage(currentLang === "ar" ? "تم قبول البيانات الأولية. يرجى إدخال رمز التحقق." : "Primary data accepted. Please enter the verification code.", "success");
      completeInitialRegistration();
      registrationOtp.focus();
    }
  } finally {
    registrationInProgress = false;
    if (submitButton) submitButton.disabled = false;
  }
});

verifyOtpButton.addEventListener("click", async () => {
  await verifyRegistrationOtp();
});

completeRegistrationButton.addEventListener("click", async () => {
  if (registrationInProgress) {
    return;
  }

  registrationInProgress = true;
  completeRegistrationButton.disabled = true;

  try {
  if (!hasWorkingSupabaseConfig()) {
    showSupabaseConfigurationMessage(regMessage);
    return;
  }

  const email = document.getElementById("registration-email").value.trim();
  const password = document.getElementById("registration-password").value.trim();
  const fullnameValue = selectedAccountType === "مشتري" ? registrationName.value.trim() : document.getElementById("registration-fullname").value.trim();
  const address = document.getElementById("registration-address").value.trim();
  const normalizedRegistrationPhone = normalizePhoneNumber(registrationPhone.value.trim());
  registrationPhone.value = normalizedRegistrationPhone;

  if (!email || !password) {
    showRegistrationMessage(currentLang === "ar" ? "يرجى إدخال البريد الإلكتروني وكلمة المرور." : "Please enter email and password.", "error");
    return;
  }

  if (!validateEmail(email)) {
    showRegistrationMessage(currentLang === "ar" ? "صيغة البريد الإلكتروني غير صحيحة." : "Invalid email format.", "error");
    return;
  }

  if (!validatePasswordStrength(password)) {
    showRegistrationMessage(
      currentLang === "ar"
        ? "كلمة المرور يجب أن تكون 8 أحرف على الأقل وتحتوي على أحرف وأرقام."
        : "Password must be at least 8 characters and include letters and numbers.",
      "error"
    );
    return;
  }

  if (!fullnameValue || fullnameValue.length < 3) {
    showRegistrationMessage(currentLang === "ar" ? "الاسم الكامل يجب أن يكون 3 أحرف على الأقل." : "Full name must be at least 3 characters.", "error");
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

  const duplicatePhoneLookup = await fetchProfileByPhoneFlexible(normalizedRegistrationPhone);
  const duplicatePhone = duplicatePhoneLookup.result;
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
  } else if (selectedAccountType === "متسوق داعم" || selectedAccountType === "متسوق") {
    role = "shopper";
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
    subscription: role === "shopper" ? "shopper" : "basic",
    subscription_started_at: new Date().toISOString(),
    subscription_free_until: getFirstFreeSubscriptionEnd({ created_at: new Date().toISOString() }).toISOString(),
    phone: normalizedRegistrationPhone,
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
          phone: normalizedRegistrationPhone,
        },
        status: "pending",
      });
    }

    await signOut();
    currentUser = null;
    currentUserProfile = null;
    resetRegistrationFlow();
    window.location.hash = "#auth-section";
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
  window.location.hash = isReadOnlyShopper(currentUserProfile?.role) ? "#shopper-section" : "#profile-page";
  } finally {
    registrationInProgress = false;
    completeRegistrationButton.disabled = false;
  }
});

searchInput.addEventListener("input", (event) => {
  runAdvancedSearch();
});

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

[filterBrand, filterModel, filterYear, filterBodyType, filterCategory].forEach((control) => {
  if (!control) return;
  control.addEventListener("change", () => {
    runAdvancedSearch();
  });
});

if (partForm) {
  partForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await handleCreatePart();
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

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = document.getElementById("auth-email").value.trim();
  const password = document.getElementById("auth-password").value.trim();
  await handleAuthForm(email, password);
});

authModeToggle.addEventListener("click", () => {
  window.location.hash = "#registration-page";
});

langToggle.addEventListener("click", () => {
  currentLang = currentLang === "ar" ? "en" : "ar";
  updateLanguage();
});

document.querySelectorAll(".plan-action-btn").forEach((button) => {
  button.addEventListener("click", () => {
    openPlanSubscription(button.dataset.plan || "basic");
  });
});

document.querySelectorAll(".plan-compare-btn").forEach((button) => {
  button.addEventListener("click", () => {
    document.getElementById("plans-compare-table")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});

if (planSubscriptionForm) {
  planSubscriptionForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const name = planRequestName?.value.trim() || "";
    const center = planRequestCenter?.value.trim() || "";
    const phone = normalizePhoneNumber(planRequestPhone?.value.trim() || "");
    const email = (planRequestEmail?.value || "").trim().toLowerCase();
    const notes = planRequestNotes?.value.trim() || "";
    const plan = planRequestPlan?.value || "basic";

    if (!name || !center || !phone || !email) {
      showMessage(
        currentLang === "ar" ? "الرجاء تعبئة الحقول الإلزامية." : "Please fill all required fields.",
        "error",
        planSubscriptionMessage
      );
      return;
    }

    if (!validatePhoneNumber(phone)) {
      showMessage(
        currentLang === "ar" ? "صيغة رقم الهاتف غير صحيحة." : "Invalid phone format.",
        "error",
        planSubscriptionMessage
      );
      return;
    }

    if (!validateEmail(email)) {
      showMessage(
        currentLang === "ar" ? "صيغة البريد الإلكتروني غير صحيحة." : "Invalid email format.",
        "error",
        planSubscriptionMessage
      );
      return;
    }

    savePlanRequest({
      id: `plan-${Date.now()}`,
      plan,
      name,
      center,
      phone,
      email,
      notes,
      created_at: new Date().toISOString(),
      status: "new",
    });

    recordPlatformActivity(
      "subscription",
      currentLang === "ar" ? "طلب اشتراك باقة جديد" : "New plan subscription request",
      `${center} • ${plan}`,
      "pending"
    );

    showMessage(
      currentLang === "ar"
        ? "تم استلام طلب الاشتراك بنجاح. سيتواصل فريقنا معك قريباً."
        : "Your subscription request was received successfully. Our team will contact you soon.",
      "success",
      planSubscriptionMessage
    );

    planSubscriptionForm.reset();
    if (planRequestPlan) planRequestPlan.value = plan;
  });
}

logoutButton.addEventListener("click", async () => {
  await handleLogout();
});

if (sendForgotOtpButton) {
  sendForgotOtpButton.addEventListener("click", async () => {
    if (forgotPasswordInProgress) {
      return;
    }

    if (!hasWorkingSupabaseConfig()) {
      showSupabaseConfigurationMessage(forgotMessage);
      return;
    }

    if (!WHATSAPP_OTP_ENDPOINT) {
      showWhatsAppOtpConfigurationMessage(forgotMessage);
      return;
    }

    const phone = forgotPhone.value.trim();
    const email = forgotEmail.value.trim();
    if (!phone || !email) {
      showMessage(currentLang === "ar" ? "أدخل البريد والهاتف أولاً." : "Enter email and phone first.", "error", forgotMessage);
      return;
    }

    if (!validateEmail(email)) {
      showMessage(currentLang === "ar" ? "صيغة البريد الإلكتروني غير صحيحة." : "Invalid email format.", "error", forgotMessage);
      return;
    }

    const normalizedForgotPhone = normalizePhoneNumber(phone);
    forgotPhone.value = normalizedForgotPhone;

    if (!validatePhoneNumber(normalizedForgotPhone)) {
      showMessage(currentLang === "ar" ? "صيغة رقم الهاتف غير صحيحة." : "Invalid phone format.", "error", forgotMessage);
      return;
    }

    forgotPasswordInProgress = true;
    sendForgotOtpButton.disabled = true;
    try {
      const profileLookup = await fetchProfileByPhoneFlexible(normalizedForgotPhone);
      const profileRes = profileLookup.result;
      if (!profileRes.data) {
        showMessage(currentLang === "ar" ? "رقم الهاتف غير موجود." : "Phone is not registered.", "error", forgotMessage);
        return;
      }

      if ((profileRes.data.email || "").toLowerCase() !== email.toLowerCase()) {
        showMessage(currentLang === "ar" ? "البريد لا يطابق رقم الهاتف." : "Email does not match the phone number.", "error", forgotMessage);
        return;
      }

      const code = generateOtpCode();
      const otpRes = await createOtpCode(normalizedForgotPhone, code, "forgot_password", 10);
      if (otpRes.error) {
        showMessage(currentLang === "ar" ? "تعذر إنشاء OTP." : "Failed to generate OTP.", "error", forgotMessage);
        return;
      }

      try {
        await sendWhatsAppOtp(normalizedForgotPhone, code);
        pendingForgotOtpPhone = normalizedForgotPhone;
        showMessage(currentLang === "ar" ? "تم إرسال OTP عبر واتساب." : "OTP sent via WhatsApp.", "success", forgotMessage);
        forgotOtp.focus();
      } catch (_error) {
        showMessage(currentLang === "ar" ? "فشل إرسال OTP." : "Failed to send OTP.", "error", forgotMessage);
      }
    } finally {
      forgotPasswordInProgress = false;
      sendForgotOtpButton.disabled = false;
    }
  });
}

if (forgotForm) {
  forgotForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!hasWorkingSupabaseConfig()) {
      showSupabaseConfigurationMessage(forgotMessage);
      return;
    }

    const code = normalizeOtpCode(forgotOtp.value.trim());
    forgotOtp.value = code;
    const password = forgotNewPassword.value.trim();
    const phone = normalizePhoneNumber(forgotPhone.value.trim());
    forgotPhone.value = phone;

    if (!/^\d{6}$/.test(code)) {
      showMessage(currentLang === "ar" ? "OTP يجب أن يكون 6 أرقام." : "OTP must be 6 digits.", "error", forgotMessage);
      return;
    }

    if (!validatePasswordStrength(password)) {
      showMessage(
        currentLang === "ar"
          ? "كلمة المرور يجب أن تكون 8 أحرف على الأقل وتحتوي على أحرف وأرقام."
          : "Password must be at least 8 characters and include letters and numbers.",
        "error",
        forgotMessage
      );
      return;
    }

    if (!pendingForgotOtpPhone || pendingForgotOtpPhone !== phone) {
      showMessage(currentLang === "ar" ? "أرسل OTP أولاً." : "Send OTP first.", "error", forgotMessage);
      return;
    }

    const verify = await verifyOtpCode(phone, code, "forgot_password");
    if (!verify.valid) {
      showMessage(currentLang === "ar" ? "OTP غير صالح." : "Invalid OTP.", "error", forgotMessage);
      return;
    }

    let resetError = null;
    if (currentUser && currentUser.email && currentUser.email.toLowerCase() === forgotEmail.value.trim().toLowerCase()) {
      const result = await supabaseClient.auth.updateUser({ password });
      resetError = result.error || null;
    } else {
      const result = await supabaseClient.auth.resetPasswordForEmail(forgotEmail.value.trim(), {
        redirectTo: `${window.location.origin}/index.html#auth-section`,
      });
      resetError = result.error || null;
    }

    if (resetError) {
      showMessage(resetError.message || (currentLang === "ar" ? "فشل تحديث كلمة المرور." : "Failed to update password."), "error", forgotMessage);
      return;
    }

    pendingForgotOtpPhone = null;
    forgotForm.reset();
    showMessage(currentLang === "ar" ? "تم التحقق. أكمل تحديث كلمة المرور من رابط البريد عند الحاجة." : "Verified. Complete password reset using the email link if needed.", "success", forgotMessage);
  });
}

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

window.addEventListener("hashchange", () => {
  updatePageVisibility();
});

loadAccountTypes().finally(() => {
  loadCatalogParts();
});
renderDashboard();
showAuthState();
updateLanguage();
updatePageVisibility();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch((error) => console.error("SW register failed", error));
  });
}
