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
const langToggle = document.getElementById("lang-toggle");
const orderForm = document.getElementById("order-form");
const orderProduct = document.getElementById("order-product");
const dashboardList = document.getElementById("dashboard-list");
const dashboardEmpty = document.getElementById("admin-dashboard-empty");
const ordersList = document.getElementById("orders-list");
const ordersEmpty = document.getElementById("orders-empty");
const orderMessage = document.getElementById("order-message");
const authForm = document.getElementById("auth-form");
const authModeToggle = document.getElementById("auth-mode-toggle");
const authMessage = document.getElementById("auth-message");
const userPanel = document.getElementById("user-panel");
const userEmail = document.getElementById("user-email");
const logoutButton = document.getElementById("logout-button");
const supplierForm = document.getElementById("supplier-form");
const supplierMessage = document.getElementById("supplier-message");
const supplierList = document.getElementById("supplier-list");
const supplierSection = document.getElementById("supplier-dashboard");
const adminSection = document.getElementById("admin-dashboard");
const adminNavLink = document.querySelector('a[href="#admin-dashboard"]');
const supplierNavLink = document.querySelector('a[href="#supplier-dashboard"]');
const authNavLink = document.querySelector('a[href="#auth-section"]');
const userRole = document.getElementById("user-role");
const userSubscription = document.getElementById("user-subscription");

let currentLang = "ar";
let orderRequests = [];
let currentUser = null;
let currentUserProfile = null;
let selectedAccountType = null;
let selectedAccountCategory = null;
let buyers = [];

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
const buyerForm = document.getElementById("buyer-form");
const buyerMessage = document.getElementById("buyer-message");
const buyerSearch = document.getElementById("buyer-search");
const buyerList = document.getElementById("buyer-list");
const profilePage = document.getElementById("profile-page");
const profilePicture = document.getElementById("profile-picture");
const profileName = document.getElementById("profile-name");
const profileAccountType = document.getElementById("profile-account-type");
const profileRole = document.getElementById("profile-role");
const profilePhone = document.getElementById("profile-phone");
const profileEmail = document.getElementById("profile-email");
const profileBio = document.getElementById("profile-bio");
const profileAccountTypeDetail = document.getElementById("profile-account-type-detail");
const profileStatus = document.getElementById("profile-status");
const profileSubscription = document.getElementById("profile-subscription");
const profileOrdersCount = document.getElementById("profile-orders-count");
const profileJoined = document.getElementById("profile-joined");
const editProfileButton = document.getElementById("edit-profile-button");

const messages = {
  orderSent: { ar: "تم إرسال الطلب بنجاح. يمكنك متابعة الموافقة من لوحة التحكم.", en: "Request submitted successfully. Track approval in the dashboard." },
  approved: { ar: "تمت الموافقة على الطلب.", en: "The request has been approved." },
  rejected: { ar: "تم رفض الطلب.", en: "The request has been rejected." },
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

async function syncSuppliers() {
  const { data, error } = await fetchSuppliers();
  if (error) {
    console.error(error);
    return;
  }
  supplierList.innerHTML = (data || [])
    .map(
      (supplier) => `
        <article class="supplier-card">
          <h3>${supplier.name}</h3>
          <p>${supplier.email}</p>
          <p>${supplier.phone}</p>
          <p>${supplier.active ? "Active" : "Inactive"}</p>
        </article>
      `
    )
    .join("");
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
    userId: order.user_id || order.userId,
  };
}

function showMessage(text, type = "success", container = orderMessage) {
  container.textContent = text;
  container.className = `form-message ${type}`;
  setTimeout(() => {
    container.className = "form-message";
  }, 4500);
}

function renderProducts(items) {
  productGrid.innerHTML = items
    .map(
      (product, index) => `
      <article class="product-card">
        <h3>${product.title}</h3>
        <p>${product.model}</p>
        <p>${product.description}</p>
        <div class="price">${product.price}</div>
        <button class="btn secondary" type="button" data-action="order" data-index="${index}">اطلب الآن</button>
      </article>
    `
    )
    .join("");
}

function displayUser(user) {
  if (!user) {
    userPanel.style.display = "none";
    adminSection.style.display = "none";
    supplierSection.style.display = "none";
    if (adminNavLink) adminNavLink.style.display = "none";
    if (supplierNavLink) supplierNavLink.style.display = "none";
    return;
  }
  userEmail.textContent = user.email;
  userRole.textContent = currentUserProfile?.role || "dealer";
  userSubscription.textContent = currentUserProfile?.subscription || "basic";
  userPanel.style.display = "grid";
  const isAdmin = currentUserProfile?.role === "admin";
  adminSection.style.display = isAdmin ? "block" : "none";
  supplierSection.style.display = isAdmin ? "block" : "none";
  if (adminNavLink) adminNavLink.style.display = isAdmin ? "inline-flex" : "none";
  if (supplierNavLink) supplierNavLink.style.display = isAdmin ? "inline-flex" : "none";
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
  const response = await signIn(email, password);
  if (response.error) {
    showMessage(messages.authError[currentLang], "error", authMessage);
    return null;
  }
  currentUser = response.data.user;

  currentUserProfile = await ensureUserProfile(currentUser.id);
  displayUser(currentUser);
  showMessage(messages.authSignedIn[currentLang], "success", authMessage);
  await syncOrdersFromSupabase();
  await syncSuppliers();
  await syncBuyers();
  window.location.hash = "#profile-page";
  return currentUser;
}

async function showAuthState() {
  const user = await getCurrentUser();
  currentUser = user || null;
  if (currentUser) {
    currentUserProfile = await ensureUserProfile(currentUser.id);
  }
  displayUser(currentUser);
  if (currentUser) {
    await syncOrdersFromSupabase();
    await syncSuppliers();
    await syncBuyers();
    if (!window.location.hash || window.location.hash === "#auth-section" || window.location.hash === "#registration-page") {
      window.location.hash = "#profile-page";
    }
  }
}

function populateProductOptions() {
  orderProduct.innerHTML = products
    .map(
      (product) => `<option value="${product.title}">${product.title} - ${product.model}</option>`
    )
    .join("");
}

function renderDashboard() {
  const adminOrders = currentUserProfile?.role === "admin" ? orderRequests : [];
  if (adminOrders.length === 0) {
    dashboardEmpty.style.display = currentUserProfile?.role === "admin" ? "block" : "none";
    dashboardList.innerHTML = "";
  } else {
    dashboardEmpty.style.display = "none";
    dashboardList.innerHTML = adminOrders
      .map((order, idx) => renderOrderCard(order, idx, true))
      .join("");
  }

  renderUserOrders();
}

function renderUserOrders() {
  const userOrders = orderRequests;
  if (userOrders.length === 0) {
    ordersEmpty.style.display = "block";
    ordersList.innerHTML = "";
    return;
  }

  ordersEmpty.style.display = "none";
  ordersList.innerHTML = userOrders
    .map((order, idx) => renderOrderCard(order, idx, false))
    .join("");
}

function renderOrderCard(order, idx, isAdmin) {
  return `
      <article class="dashboard-card">
        <div class="dashboard-card-header">
          <div>
            <h3>${order.customerName}</h3>
            <span>${order.company}</span>
          </div>
          <div class="status ${order.status.toLowerCase()}">${order.status}</div>
        </div>
        <p><strong data-ar="القطعة:" data-en="Part:">القطعة:</strong> ${order.product}</p>
        <p><strong data-ar="الكمية:" data-en="Quantity:">الكمية:</strong> ${order.quantity}</p>
        <p><strong data-ar="أولوية الطلب:" data-en="Priority:">أولوية الطلب:</strong> ${order.priority}</p>
        <p><strong data-ar="التسليم إلى:" data-en="Delivery:">التسليم إلى:</strong> ${order.location}</p>
        <p><strong data-ar="ملاحظات:" data-en="Notes:">ملاحظات:</strong> ${order.notes || "-"}</p>
        <p><strong data-ar="تاريخ الطلب:" data-en="Requested on:">تاريخ الطلب:</strong> ${new Date(order.createdAt || order.created_at).toLocaleString(currentLang === "ar" ? "ar-SA" : "en-US", { dateStyle: "medium", timeStyle: "short" })}</p>
        <div class="dashboard-actions">
          ${isAdmin ? `
            <button type="button" class="btn secondary" data-action="approve" data-index="${idx}" data-ar="موافقة" data-en="Approve">موافقة</button>
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
  langToggle.textContent = currentLang === "ar" ? "English" : "العربية";
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

function renderBuyerTable(filter = "") {
  const query = filter.trim().toLowerCase();
  const rows = buyers
    .filter((buyer) => {
      if (!query) return true;
      return (
        buyer.name?.toLowerCase().includes(query) ||
        buyer.phone?.toLowerCase().includes(query)
      );
    })
    .map(
      (buyer) => `
      <tr>
        <td>${buyer.name}</td>
        <td>${buyer.phone}</td>
        <td>${new Date(buyer.created_at || buyer.createdAt || Date.now()).toLocaleDateString(currentLang === "ar" ? "ar-SA" : "en-US")}</td>
      </tr>
    `
    )
    .join("");

  buyerList.innerHTML = rows || `<tr><td colspan="3">${currentLang === "ar" ? "لا يوجد مشترين." : "No buyers found."}</td></tr>`;
}

function renderProfilePage() {
  if (!profilePage) return;
  if (!currentUser || !currentUserProfile) {
    profilePage.style.display = "none";
    return;
  }

  profilePage.style.display = "block";
  const profileNameText = currentUserProfile.full_name || currentUser.email || "TIGER VVIP";
  profileName.textContent = profileNameText;
  profileAccountType.textContent = currentUserProfile.account_type || currentUserProfile.role || "";
  if (profileRole) {
    profileRole.textContent = currentUserProfile.role ? currentUserProfile.role.charAt(0).toUpperCase() + currentUserProfile.role.slice(1) : "VVIP";
  }
  profilePhone.textContent = currentUserProfile.phone || currentUser.phone || "";
  profileEmail.textContent = currentUser.email || "";
  if (profileAccountTypeDetail) {
    profileAccountTypeDetail.textContent = currentUserProfile.account_type || currentUserProfile.role || "غير محدد";
  }
  if (profileStatus) {
    profileStatus.textContent = currentUserProfile.active === false ? (currentLang === "ar" ? "موقوف" : "Inactive") : (currentLang === "ar" ? "نشط" : "Active");
  }
  if (profileSubscription) {
    profileSubscription.textContent = currentUserProfile.subscription || "أساسي";
  }
  if (profileOrdersCount) {
    profileOrdersCount.textContent = orderRequests.length || 0;
  }
  if (profileJoined) {
    const createdAt = currentUserProfile.created_at ? new Date(currentUserProfile.created_at) : new Date();
    profileJoined.textContent = createdAt.toLocaleDateString(currentLang === "ar" ? "ar-SA" : "en-US", { year: "numeric", month: "short" });
  }
  const initial = (profileNameText || "T").charAt(0).toUpperCase();
  if (profilePicture) {
    profilePicture.src = currentUserProfile.avatar_url || `https://via.placeholder.com/168/1877F2/ffffff?text=${initial}`;
  }
  profileBio.textContent = currentLang === "ar"
    ? "هذا ملفك الشخصي. يمكنك التحكم في معلومات حسابك من هنا."
    : "This is your profile. Manage your account information from here.";
}

if (editProfileButton) {
  editProfileButton.addEventListener("click", () => {
    window.location.hash = "#registration-page";
  });
}

async function syncBuyers() {
  if (!currentUser || currentUserProfile?.role !== "admin") {
    buyers = [];
    renderBuyerTable();
    return;
  }

  const { data, error } = await fetchBuyers();
  if (error) {
    console.error(error);
    buyers = [];
    renderBuyerTable();
    return;
  }

  buyers = data || [];
  renderBuyerTable();
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

registrationForm.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!accountTypeSearch.value.trim() || !selectedAccountType) {
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

  showRegistrationMessage(currentLang === "ar" ? "تم قبول البيانات الأولية. يرجى إدخال رمز التحقق." : "Primary data accepted. Please enter the verification code.", "success");
  completeInitialRegistration();
});

verifyOtpButton.addEventListener("click", () => {
  const code = registrationOtp.value.trim();
  if (code !== "123456") {
    showRegistrationMessage(currentLang === "ar" ? "رمز التحقق غير صحيح. حاول مرة أخرى." : "Verification code is invalid. Try again.", "error");
    return;
  }
  showProfileCompletion();
  showRegistrationMessage(currentLang === "ar" ? "تم التحقق بنجاح! أكمل بياناتك لإنشاء الحساب." : "Verified successfully! Complete your information to create the account.", "success");
});

completeRegistrationButton.addEventListener("click", async () => {
  const email = document.getElementById("registration-email").value.trim();
  const password = document.getElementById("registration-password").value.trim();
  const fullnameValue = selectedAccountType === "مشتري" ? registrationName.value.trim() : document.getElementById("registration-fullname").value.trim();
  const address = document.getElementById("registration-address").value.trim();

  if (!email || !password) {
    showRegistrationMessage(currentLang === "ar" ? "يرجى إدخال البريد الإلكتروني وكلمة المرور." : "Please enter email and password.", "error");
    return;
  }

  const response = await signUp(email, password);
  if (response.error) {
    showRegistrationMessage(response.error.message || (currentLang === "ar" ? "حدث خطأ أثناء إنشاء الحساب." : "An error occurred while creating the account."), "error");
    return;
  }

  const isBuyer = selectedAccountType === "مشتري";
  const profilePayload = {
    id: response.data.user.id,
    full_name: fullnameValue || null,
    company: isBuyer ? null : selectedAccountCategory || null,
    role: isBuyer ? "buyer" : selectedAccountCategory === "الإدارة" ? "admin" : "dealer",
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
  displayUser(currentUser);
  await syncOrdersFromSupabase();
  await syncSuppliers();
  resetRegistrationFlow();
  window.location.hash = "#profile-page";
});

searchInput.addEventListener("input", (event) => {
  const query = event.target.value.toLowerCase();
  const filtered = products.filter(
    (product) =>
      product.title.toLowerCase().includes(query) ||
      product.model.toLowerCase().includes(query) ||
      product.description.toLowerCase().includes(query)
  );
  renderProducts(filtered);
});

document.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const action = button.dataset.action;
  const index = Number(button.dataset.index);

  if (action === "order") {
    productGrid.scrollIntoView({ behavior: "smooth" });
    orderProduct.value = products[index].title;
  }

  if (action === "approve" || action === "reject") {
    const status = action === "approve" ? "Approved" : "Rejected";
    const order = orderRequests[index];
    if (!order) return;
    updateOrderStatus(order.id, status).then(({ error }) => {
      if (error) {
        console.error(error);
        return;
      }
      orderRequests[index].status = status;
      renderDashboard();
      showMessage(messages[status.toLowerCase()][currentLang], "success");
    });
  }
});

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = document.getElementById("auth-email").value.trim();
  const password = document.getElementById("auth-password").value.trim();
  await handleAuthForm(email, password);
});

buyerSearch.addEventListener("input", () => {
  renderBuyerTable(buyerSearch.value.trim());
});

buyerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!currentUser || currentUserProfile?.role !== "admin") {
    showMessage(messages.authError[currentLang], "error", buyerMessage);
    return;
  }

  const buyer = {
    name: document.getElementById("buyer-name").value.trim(),
    phone: document.getElementById("buyer-phone").value.trim(),
  };

  if (!buyer.name || !validatePhoneNumber(buyer.phone)) {
    showMessage(currentLang === "ar" ? "يرجى إدخال اسم ورقم هاتف صالح للمشتري." : "Please enter a valid buyer name and phone.", "error", buyerMessage);
    return;
  }

  const { error } = await createBuyer(buyer);
  if (error) {
    showMessage(error.message || (currentLang === "ar" ? "فشل إضافة المشتري." : "Failed to add buyer."), "error", buyerMessage);
    return;
  }

  showMessage(currentLang === "ar" ? "تم إضافة المشتري بنجاح." : "Buyer added successfully.", "success", buyerMessage);
  buyerForm.reset();
  await syncBuyers();
});

authModeToggle.addEventListener("click", () => {
  window.location.hash = "#registration-page";
});

langToggle.addEventListener("click", () => {
  currentLang = currentLang === "ar" ? "en" : "ar";
  updateLanguage();
});

logoutButton.addEventListener("click", async () => {
  await signOut();
  currentUser = null;
  currentUserProfile = null;
  orderRequests = [];
  displayUser(null);
  renderDashboard();
  showMessage(messages.authSignedOut[currentLang], "success", authMessage);
});

supplierForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!currentUser || currentUserProfile?.role !== "admin") {
    showMessage(messages.authError[currentLang], "error", supplierMessage);
    return;
  }

  const supplier = {
    name: document.getElementById("supplier-name").value.trim(),
    email: document.getElementById("supplier-email").value.trim(),
    phone: document.getElementById("supplier-phone").value.trim(),
    active: document.getElementById("supplier-active").value === "true",
  };

  const { error } = await createSupplier(supplier);
  if (error) {
    showMessage(messages.supplierError[currentLang], "error", supplierMessage);
    return;
  }

  showMessage(messages.supplierSaved[currentLang], "success", supplierMessage);
  supplierForm.reset();
  syncSuppliers();
});

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
  orderProduct.value = products[0].title;
  await syncOrdersFromSupabase();
  window.location.hash = currentUserProfile?.role === "admin" ? "#admin-dashboard" : "#user-orders";
});

function updateAuthPageMode() {
  const currentHash = window.location.hash;
  const isAuthFlow = currentHash === "#auth-section" || currentHash === "#registration-page";
  const isProfile = currentHash === "#profile-page";

  document.body.classList.toggle("login-page", isAuthFlow);
  document.body.classList.toggle("profile-page", isProfile);

  if (profilePage) {
    profilePage.style.display = isProfile ? "block" : "none";
  }

  if (isProfile) {
    renderProfilePage();
  }
}

window.addEventListener("hashchange", updateAuthPageMode);

loadAccountTypes().finally(() => {
  renderProducts(products);
  populateProductOptions();
});
renderDashboard();
showAuthState();
updateLanguage();
updateAuthPageMode();
