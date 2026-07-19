"use strict";

(() => {
  function safeDisplayName(user) {
    const fullName = [
      user?.firstName,
      user?.lastName,
    ]
      .filter(Boolean)
      .join(" ")
      .trim();

    const candidate =
      fullName ||
      user?.username ||
      user?.primaryEmailAddress
        ?.emailAddress
        ?.split("@")[0] ||
      "";

    const identityPolicy =
      window.VVIP_IDENTITY_POLICY;

    if (
      identityPolicy &&
      typeof identityPolicy
        .sanitizeDisplayName ===
        "function"
    ) {
      return identityPolicy
        .sanitizeDisplayName(candidate);
    }

    return candidate;
  }

  function entryUrl(parameters = {}) {
    const url = new URL(
      "./index.html",
      document.baseURI
    );

    url.search = "";
    url.hash = "";

    for (const [key, value] of Object.entries(
      parameters
    )) {
      url.searchParams.set(key, value);
    }

    return url;
  }

  function ensureInterface(card) {
    let section = card.querySelector(
      "[data-vvip-remembered-account]"
    );

    if (section) {
      return section;
    }

    section = document.createElement("section");
    section.className =
      "auth-gate__remembered-account";
    section.dataset.vvipRememberedAccount = "";
    section.hidden = true;

    const name = document.createElement("p");
    name.className =
      "auth-gate__account-name";
    name.dataset.vvipAccountName = "";

    const message = document.createElement("p");
    message.className =
      "auth-gate__account-message";
    message.textContent =
      "مرحبًا بعودتك. حسابك ما زال مسجلًا بأمان.";

    const actions = document.createElement("div");
    actions.className =
      "auth-gate__account-actions";

    const continueButton =
      document.createElement("button");

    continueButton.type = "button";
    continueButton.className =
      "auth-gate__account-button " +
      "auth-gate__account-button--primary";
    continueButton.dataset.vvipContinueAccount = "";
    continueButton.textContent =
      "متابعة إلى المنصة";

    const switchButton =
      document.createElement("button");

    switchButton.type = "button";
    switchButton.className =
      "auth-gate__account-button " +
      "auth-gate__account-button--secondary";
    switchButton.dataset.vvipSwitchAccount = "";
    switchButton.textContent =
      "استخدام حساب آخر";

    const logoutButton =
      document.createElement("button");

    logoutButton.type = "button";
    logoutButton.className =
      "auth-gate__account-button " +
      "auth-gate__account-button--logout";
    logoutButton.dataset.vvipLogoutAccount = "";
    logoutButton.textContent =
      "تسجيل الخروج";

    actions.append(
      continueButton,
      switchButton,
      logoutButton
    );

    section.append(
      name,
      message,
      actions
    );

    const identity = card.querySelector(
      ".auth-gate__identity"
    );

    if (identity) {
      identity.after(section);
    } else {
      card.prepend(section);
    }

    return section;
  }

  function ensureAvatar(identity) {
    let avatar = identity.querySelector(
      ".auth-gate__account-avatar"
    );

    if (avatar) {
      return avatar;
    }

    avatar = document.createElement("img");
    avatar.className =
      "auth-gate__account-avatar";
    avatar.alt = "";
    avatar.hidden = true;
    avatar.referrerPolicy = "no-referrer";
    avatar.decoding = "async";

    const mark = identity.querySelector(
      ".auth-gate__mark"
    );

    if (mark) {
      mark.after(avatar);
    } else {
      identity.prepend(avatar);
    }

    return avatar;
  }

  async function signOut(
    clerk,
    destination
  ) {
    if (
      !clerk ||
      typeof clerk.signOut !== "function"
    ) {
      throw new Error(
        "Clerk sign-out is unavailable"
      );
    }

    await clerk.signOut({
      redirectUrl: destination.href,
    });
  }

  async function show({
    clerk,
    continueToApp,
  }) {
    const gate = document.querySelector(
      "[data-vvip-auth-gate]"
    );

    const card = gate?.querySelector(
      ".auth-gate__card"
    );

    const identity = card?.querySelector(
      ".auth-gate__identity"
    );

    const clerkPanel =
      document.getElementById(
        "clerk-main-auth"
      );

    const user = clerk?.user;

    if (
      !gate ||
      !card ||
      !identity ||
      !user
    ) {
      throw new Error(
        "Remembered account context is unavailable"
      );
    }

    const section = ensureInterface(card);
    const avatar = ensureAvatar(identity);
    const mark = identity.querySelector(
      ".auth-gate__mark"
    );

    const accountName =
      safeDisplayName(user);

    const name = section.querySelector(
      "[data-vvip-account-name]"
    );

    if (name) {
      name.textContent = accountName;
      name.hidden = !accountName;
    }

    if (user.imageUrl) {
      avatar.src = user.imageUrl;
      avatar.alt = accountName
        ? `صورة حساب ${accountName}`
        : "صورة الحساب";
      avatar.hidden = false;

      if (mark) {
        mark.hidden = true;
      }
    } else {
      avatar.removeAttribute("src");
      avatar.alt = "";
      avatar.hidden = true;

      if (mark) {
        mark.hidden = false;
      }
    }

    if (clerkPanel) {
      clerkPanel.hidden = true;
    }

    section.hidden = false;
    gate.hidden = false;
    gate.dataset.vvipAuthState =
      "remembered";
    gate.dataset.vvipAuthMode =
      "remembered";

    const continueButton =
      section.querySelector(
        "[data-vvip-continue-account]"
      );

    const switchButton =
      section.querySelector(
        "[data-vvip-switch-account]"
      );

    const logoutButton =
      section.querySelector(
        "[data-vvip-logout-account]"
      );

    continueButton.onclick = () => {
      continueButton.disabled = true;

      const marketplace =
        window.VVIP_PR29;

      if (
        marketplace &&
        typeof marketplace.showHome ===
          "function"
      ) {
        section.hidden = true;
        gate.hidden = true;
        gate.setAttribute(
          "aria-hidden",
          "true"
        );
        gate.style.setProperty(
          "display",
          "none",
          "important"
        );

        marketplace.showHome();
        continueButton.disabled = false;
        return;
      }

      continueButton.disabled = false;

      console.error(
        "VVIP_MARKETPLACE_SHOW_HOME_UNAVAILABLE"
      );
    };

switchButton.onclick = async () => {
      switchButton.disabled = true;
      logoutButton.disabled = true;

      try {
        await signOut(
          clerk,
          entryUrl({
            auth: "sign-in",
            switch: "1",
          })
        );
      } catch (error) {
        switchButton.disabled = false;
        logoutButton.disabled = false;

        console.error(
          "VVIP_SWITCH_ACCOUNT_FAILED",
          error instanceof Error
            ? error.message
            : "Unknown error"
        );
      }
    };

    logoutButton.onclick = async () => {
      logoutButton.disabled = true;
      switchButton.disabled = true;

      try {
        await signOut(
          clerk,
          entryUrl({
            auth: "sign-in",
            signed_out: "1",
          })
        );
      } catch (error) {
        logoutButton.disabled = false;
        switchButton.disabled = false;

        console.error(
          "VVIP_LOGOUT_FAILED",
          error instanceof Error
            ? error.message
            : "Unknown error"
        );
      }
    };

    continueButton.focus({
      preventScroll: true,
    });
  }

  window.VVIP_P09_REMEMBERED_ACCOUNT = {
    show,
  };
})();
