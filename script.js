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

renderProducts(products);
populateProductOptions();
renderDashboard();
showAuthState();
updateLanguage();
