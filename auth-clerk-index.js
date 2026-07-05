window.addEventListener("load", async function () {
  const card = document.querySelector(".fb-card");

  if (!card) {
    console.error("VVIP TIGER: login card not found");
    return;
  }

  try {
    card.innerHTML = `
      <div id="clerk-main-auth" class="vvip-clerk-main">
        <div class="status-message">جاري تحميل بوابة الدخول الآمنة...</div>
      </div>
    `;

    await window.Clerk.load({
      ui: { ClerkUI: window.__internal_ClerkUICtor }
    });

    function renderClerkIndex() {
      const authBox = document.getElementById("clerk-main-auth");
      if (!authBox) return;

      authBox.innerHTML = "";

      if (window.Clerk.isSignedIn) {
        const email =
          window.Clerk.user &&
          window.Clerk.user.primaryEmailAddress &&
          window.Clerk.user.primaryEmailAddress.emailAddress
            ? window.Clerk.user.primaryEmailAddress.emailAddress
            : "VIP Member";

        authBox.innerHTML = `
          <div class="success-box">
            <h2>تم تسجيل الدخول بنجاح ✅</h2>
            <p>أهلًا بك في VVIP TIGER.</p>
            <p><strong>${email}</strong></p>

            <div id="clerk-user-button" style="margin:16px 0;"></div>

            <div class="vvip-actions" style="margin-top:18px;display:flex;gap:10px;justify-content:center;align-items:center;flex-wrap:wrap;">
              <a href="clerk-private-profile.html" style="border:0;border-radius:14px;padding:12px 16px;background:#1877f2;color:white;text-decoration:none;font-weight:800;display:inline-flex;align-items:center;justify-content:center;min-width:150px;">فتح البروفايل الخاص</a>
              <a href="public-profile.html" style="border:0;border-radius:14px;padding:12px 16px;background:#0f172a;color:white;text-decoration:none;font-weight:800;display:inline-flex;align-items:center;justify-content:center;min-width:150px;">متابعة إلى الصفحة العامة</a>
              <button id="clerk-sign-out-btn" type="button" style="border:1px solid rgba(15,23,42,.18);border-radius:14px;padding:12px 16px;background:white;color:#0f172a;font-weight:800;cursor:pointer;min-width:130px;">تسجيل الخروج</button>
            </div>
          </div>
        `;

        const userButtonDiv = document.getElementById("clerk-user-button");
        if (userButtonDiv) {
          window.Clerk.mountUserButton(userButtonDiv);
        }

        const signOutBtn = document.getElementById("clerk-sign-out-btn");
        if (signOutBtn) {
          signOutBtn.addEventListener("click", async function () {
            await window.Clerk.signOut();
            window.location.href = "index.html";
          });
        }

        return;
      }

      authBox.innerHTML = '<div id="clerk-sign-in"></div>';

      const signInDiv = document.getElementById("clerk-sign-in");
      const clerkRedirectUrl = window.location.origin + "/index.html";

      window.Clerk.mountSignIn(signInDiv, {
        routing: "hash",
        fallbackRedirectUrl: clerkRedirectUrl,
        forceRedirectUrl: clerkRedirectUrl,
        signUpFallbackRedirectUrl: clerkRedirectUrl,
        signUpForceRedirectUrl: clerkRedirectUrl
      });
    }

    renderClerkIndex();

    if (typeof window.Clerk.addListener === "function") {
      window.Clerk.addListener(function () {
        renderClerkIndex();
      });
    }
  } catch (error) {
    console.error("VVIP TIGER Clerk index error:", error);

    card.innerHTML = `
      <div class="status-message">
        تعذر تحميل Clerk. افتح Console وصوّر الخطأ الأحمر.
      </div>
    `;
  }
});
