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
const dashboardEmpty = document.getElementById("dashboard-empty");
const ordersList = document.getElementById("orders-list");
const ordersEmpty = document.getElementById("orders-empty");
const orderMessage = document.getElementById("order-message");
const authForm = document.getElementById("auth-form");
const authModeToggle = document.getElementById("auth-mode-toggle");
const authMessage = document.getElementById("auth-message");
const authRoleField = document.getElementById("auth-role-field");
const authRoleSelect = document.getElementById("auth-role");
const authSubscriptionField = document.getElementById("auth-subscription-field");
const authSubscriptionSelect = document.getElementById("auth-subscription");
const googleLoginButton = document.getElementById("google-login");
const facebookLoginButton = document.getElementById("facebook-login");
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
const userRole = document.getElementById("user-role");
const userSubscription = document.getElementById("user-subscription");

let currentLang = "ar";
let orderRequests = [];
let authMode = "signin";
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
const registrationImageRow = document.getElementById("registration-image-row");
const registrationImage = document.getElementById("registration-image");
const buyerForm = document.getElementById("buyer-form");
const buyerMessage = document.getElementById("buyer-message");
const buyerSearch = document.getElementById("buyer-search");
const buyerList = document.getElementById("buyer-list");

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
  const response = authMode === "signin" ? await signIn(email, password) : await signUp(email, password);
  if (response.error) {
    showMessage(messages.authError[currentLang], "error", authMessage);
    return null;
  }
  currentUser = response.data.user;

  if (authMode === "signup" && currentUser) {
    const role = authRoleSelect.value || "dealer";
    const subscription = authSubscriptionSelect.value || "basic";
    await createProfile({ id: currentUser.id, role, subscription, created_at: new Date().toISOString() });
  }

  currentUserProfile = await ensureUserProfile(currentUser.id);
  displayUser(currentUser);
  showMessage(messages.authSignedIn[currentLang], "success", authMessage);
  await syncOrdersFromSupabase();
  await syncSuppliers();
  await syncBuyers();
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

async function handleSocialSignIn(provider) {
  const { data, error } = await signInWithOAuth(provider);
  if (error) {
    showMessage(error.message || messages.authError[currentLang], "error", authMessage);
    return;
  }
  if (data?.url) {
    window.location.href = data.url;
  }
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
  registrationOtp.value = "";
  registrationProfileForm.reset();
  registrationForm.classList.remove("hidden");
  otpSection.classList.add("hidden");
  profileSection.classList.add("hidden");
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
  registrationImageRow?.classList.toggle("hidden", !isBuyer);
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

  if (selectedAccountType === "مشتري" && registrationImage && registrationImage.files.length === 0) {
    showRegistrationMessage(currentLang === "ar" ? "يرجى رفع صورة خاصة بالمشتري." : "Please upload a buyer image.", "error");
    return;
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
  const fullName = document.getElementById("registration-fullname").value.trim();
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
    full_name: fullName || null,
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

  showRegistrationMessage(currentLang === "ar" ? "تم إنشاء الحساب بنجاح! جاري تسجيل الدخول..." : "Account created successfully! Logging in...", "success");
  currentUser = response.data.user;
  currentUserProfile = await ensureUserProfile(currentUser.id);
  displayUser(currentUser);
  await syncOrdersFromSupabase();
  await syncSuppliers();
  resetRegistrationFlow();
  window.location.hash = "#user-orders";
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
  authMode = authMode === "signin" ? "signup" : "signin";
  authModeToggle.textContent = authMode === "signin" ? "أنشئ حساب" : "دخول";
  authForm.querySelector("button[type=submit]").textContent = authMode === "signin" ? "دخول" : "إنشاء حساب";
  authRoleField.style.display = authMode === "signup" ? "grid" : "none";
  authSubscriptionField.style.display = authMode === "signup" ? "grid" : "none";
});

googleLoginButton.addEventListener("click", async () => {
  await handleSocialSignIn("google");
});

facebookLoginButton.addEventListener("click", async () => {
  await handleSocialSignIn("facebook");
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

loadAccountTypes().finally(() => {
  renderProducts(products);
  populateProductOptions();
});
renderDashboard();
showAuthState();
updateLanguage();
