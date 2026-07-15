(function (window) {
  "use strict";

  const OWNER_MODE = "OWNER_MODE";
  const VISITOR_MODE = "VISITOR_MODE";
  const PUBLISHING_STATES = Object.freeze(["none", "pending", "approved", "rejected", "suspended"]);
  const ACCOUNT_STATES = Object.freeze(["active", "pending", "suspended", "closed"]);
  const RESERVED_USERNAMES = new Set([
    "admin",
    "support",
    "tiger-care",
    "owner",
    "system",
    "root",
    "api",
    "login",
    "signup"
  ]);

  function safeText(value, maxLength) {
    const text = String(value || "").replace(/[<>]/g, "").trim();
    if (!maxLength) return text;
    return text.slice(0, maxLength);
  }

  function sanitizeUsername(value) {
    const normalized = String(value || "").toLowerCase().trim();
    if (!normalized) return "";
    if (!/^[a-z0-9_]{3,32}$/.test(normalized)) return "";
    if (RESERVED_USERNAMES.has(normalized)) return "";
    return normalized;
  }

  function sanitizePublicUrl(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    try {
      const url = new URL(raw, window.location.href);
      if (url.protocol !== "http:" && url.protocol !== "https:") return "";
      return url.href;
    } catch (error) {
      return "";
    }
  }

  function safeReturnPath(value) {
    const candidate = String(value || "").trim();
    const allow = new Set([
      "index.html",
      "private-profile-p03.html",
      "public-profile-p05.html",
      "edit-profile-p05.html",
      "account-settings-p05.html"
    ]);
    return allow.has(candidate) ? candidate : "index.html";
  }

  function resolveAccountType(profileSource, draft) {
    if (profileSource && profileSource.accountType) {
      return safeText(profileSource.accountType, 80);
    }
    if (draft && draft.accountTypeId) {
      return safeText(draft.accountTypeId, 80);
    }
    return "buyer-standard";
  }

  function resolvePublishingPermission(profileSource, draft) {
    const fromProfile = String(profileSource && profileSource.publishingPermission || "");
    if (PUBLISHING_STATES.indexOf(fromProfile) >= 0) return fromProfile;
    const fromDraft = String(draft && draft.publishingPermission || "none");
    return PUBLISHING_STATES.indexOf(fromDraft) >= 0 ? fromDraft : "none";
  }

  function resolveAccountStatus(profileSource) {
    const status = String(profileSource && profileSource.accountStatus || "active");
    return ACCOUNT_STATES.indexOf(status) >= 0 ? status : "active";
  }

  function canMessageForSubject(subject) {
    if (subject.accountType === "buyer-viewer") return false;
    if (subject.accountStatus === "suspended" || subject.accountStatus === "closed") return false;
    return true;
  }

  function createProfileSubject(input) {
    const sessionUser = input && input.sessionUser || null;
    const subjectUserId = safeText(input && input.subjectUserId, 120);
    const profileSource = input && input.profileSource || {};
    const accountTypeDraft = input && input.accountTypeDraft || null;

    const sessionUserId = safeText(sessionUser && sessionUser.id, 120);
    const provenOwner = !!(sessionUserId && subjectUserId && sessionUserId === subjectUserId);
    const mode = provenOwner ? OWNER_MODE : VISITOR_MODE;

    const displayName = safeText(profileSource.displayName || "مستخدم VVIP", 120) || "مستخدم VVIP";
    const publicUsername = sanitizeUsername(profileSource.publicUsername || "");

    const subject = {
      displayName: displayName,
      publicUsername: publicUsername,
      avatarUrl: sanitizePublicUrl(profileSource.avatarUrl),
      coverUrl: sanitizePublicUrl(profileSource.coverUrl),
      publicBio: safeText(profileSource.publicBio || "نبذة عامة ستظهر بعد التفعيل الرسمي.", 220),
      publicLocation: safeText(profileSource.publicLocation || "", 120),
      accountType: resolveAccountType(profileSource, accountTypeDraft),
      publishingPermission: resolvePublishingPermission(profileSource, accountTypeDraft),
      accountStatus: resolveAccountStatus(profileSource),
      isOwner: provenOwner,
      mode: mode,
      canEdit: provenOwner,
      canManageAccount: provenOwner,
      canMessage: false,
      accountTypeDraftOfficial: !!(accountTypeDraft && accountTypeDraft.official === true)
    };

    subject.canMessage = canMessageForSubject(subject);
    return Object.freeze(subject);
  }

  function createOwnerMenuItems(isOwner) {
    if (isOwner) {
      return Object.freeze(["viewAsVisitor", "copy", "settings", "tigerCare", "logout"]);
    }
    return Object.freeze(["copy", "report"]);
  }

  window.VVIP_PR39_PROFILE_CONTRACT = Object.freeze({
    OWNER_MODE: OWNER_MODE,
    VISITOR_MODE: VISITOR_MODE,
    RESERVED_USERNAMES: RESERVED_USERNAMES,
    PUBLISHING_STATES: PUBLISHING_STATES,
    createProfileSubject: createProfileSubject,
    createOwnerMenuItems: createOwnerMenuItems,
    sanitizeUsername: sanitizeUsername,
    sanitizePublicUrl: sanitizePublicUrl,
    safeReturnPath: safeReturnPath
  });
}(window));
