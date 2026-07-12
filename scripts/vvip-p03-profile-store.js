(function () {
  "use strict";

  const DATABASE_NAME = "vvip-p03-profile-media";
  const DATABASE_VERSION = 1;
  const IMAGE_STORE = "processed-images";
  const META_PREFIX = "vvip:p03:profile-meta:";
  const LEGACY_CLEANUP_PREFIX = "vvip:p03:profile-legacy-cleanup:";
  const PREVIEW_USER_ID = "preview-owner";

  const DEFAULT_META = Object.freeze({
    name: "",
    bio: "",
    work: "",
    education: "",
    location: "",
    publicLink: "",
    verified: false,
    authAvatarUrl: ""
  });

  const LEGACY_MEDIA_KEYS = Object.freeze([
    "vvip_p03_avatar_src",
    "vvip_p03_cover_src"
  ]);

  function wait(milliseconds) {
    return new Promise((resolve) => {
      window.setTimeout(resolve, milliseconds);
    });
  }

  function emailLocalPart(value) {
    const normalized = String(value || "").trim();

    if (!normalized.includes("@")) {
      return normalized;
    }

    return normalized.split("@", 1)[0].trim();
  }

  function firstMeaningful(values, fallback = "مستخدم") {
    for (const value of values) {
      const normalized = String(value || "")
        .replace(/\s+/g, " ")
        .trim();

      if (normalized) {
        return normalized;
      }
    }

    return fallback;
  }

  function clerkIdentity() {
    const user = window.Clerk && window.Clerk.user;

    if (!user) return null;

    const fullName = firstMeaningful([
      user.fullName,
      [user.firstName, user.lastName].filter(Boolean).join(" "),
      user.username,
      user.primaryEmailAddress && user.primaryEmailAddress.emailAddress
        ? emailLocalPart(user.primaryEmailAddress.emailAddress)
        : ""
    ]);

    return {
      userId: user.id || PREVIEW_USER_ID,
      name: fullName,
      avatarUrl: user.imageUrl || ""
    };
  }

  function globalIdentity() {
    const identity = window.VVIP_AUTH_IDENTITY;

    if (!identity || typeof identity !== "object") {
      return null;
    }

    return {
      userId: identity.userId || identity.id || PREVIEW_USER_ID,
      name: firstMeaningful([
        identity.name,
        identity.fullName,
        [identity.firstName, identity.lastName]
          .filter(Boolean)
          .join(" "),
        identity.username,
        emailLocalPart(
          identity.email ||
          identity.primaryEmail ||
          identity.emailAddress ||
          ""
        )
      ]),
      avatarUrl: identity.avatarUrl || identity.imageUrl || ""
    };
  }

  async function resolveIdentity(timeout = 2600) {
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeout) {
      const identity = globalIdentity() || clerkIdentity();

      if (identity) {
        return identity;
      }

      await wait(100);
    }

    return {
      userId: PREVIEW_USER_ID,
      name: "مستخدم",
      avatarUrl: ""
    };
  }

  function metadataKey(userId) {
    return `${META_PREFIX}${encodeURIComponent(userId || PREVIEW_USER_ID)}`;
  }

  function cleanupKey(userId) {
    return `${LEGACY_CLEANUP_PREFIX}${encodeURIComponent(userId || PREVIEW_USER_ID)}`;
  }

  function looksLikeLegacyAvatarUrl(value) {
    return /(legacy|brand|logo)/i.test(String(value || ""));
  }

  function sanitizeMetadata(metadata) {
    const next = {
      ...DEFAULT_META,
      ...(metadata && typeof metadata === "object" ? metadata : {})
    };

    if (
      /^مستخدم\b/.test(String(next.name || "").trim()) &&
      /VVIP/i.test(String(next.name || ""))
    ) {
      next.name = "";
    }

    if (
      /عضو/.test(String(next.bio || "")) &&
      /VVIP/i.test(String(next.bio || ""))
    ) {
      next.bio = "";
    }

    if (next.publicLink === "VVIP TIGER") {
      next.publicLink = "";
    }

    if (looksLikeLegacyAvatarUrl(next.authAvatarUrl)) {
      next.authAvatarUrl = "";
    }

    return next;
  }

  function loadMetadata(userId) {
    try {
      const raw = localStorage.getItem(metadataKey(userId));

      if (!raw) {
        return { ...DEFAULT_META };
      }

      return sanitizeMetadata(JSON.parse(raw));
    } catch (error) {
      return { ...DEFAULT_META };
    }
  }

  function saveMetadata(userId, metadata) {
    localStorage.setItem(
      metadataKey(userId),
      JSON.stringify(sanitizeMetadata(metadata))
    );
  }

  function markLegacyCleanupDone(userId) {
    localStorage.setItem(cleanupKey(userId), "1");
  }

  function isLegacyCleanupDone(userId) {
    return localStorage.getItem(cleanupKey(userId)) === "1";
  }

  function imageKey(userId, imageType) {
    return `${userId || PREVIEW_USER_ID}:${imageType}`;
  }

  function openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(
        DATABASE_NAME,
        DATABASE_VERSION
      );

      request.onupgradeneeded = () => {
        const database = request.result;

        if (!database.objectStoreNames.contains(IMAGE_STORE)) {
          database.createObjectStore(IMAGE_STORE);
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error || new Error("INDEXED_DB_OPEN_FAILED"));
      };
    });
  }

  async function withStore(mode, operation) {
    const database = await openDatabase();

    try {
      return await new Promise((resolve, reject) => {
        const transaction = database.transaction(
          IMAGE_STORE,
          mode
        );

        const store = transaction.objectStore(IMAGE_STORE);
        const request = operation(store);

        request.onsuccess = () => {
          resolve(request.result);
        };

        request.onerror = () => {
          reject(request.error || new Error("INDEXED_DB_REQUEST_FAILED"));
        };

        transaction.onerror = () => {
          reject(
            transaction.error ||
            new Error("INDEXED_DB_TRANSACTION_FAILED")
          );
        };
      });
    } finally {
      database.close();
    }
  }

  async function getProcessedImage(userId, imageType) {
    return withStore(
      "readonly",
      (store) => store.get(imageKey(userId, imageType))
    );
  }

  async function saveProcessedImage(userId, imageType, blob) {
    if (!(blob instanceof Blob)) {
      throw new TypeError("PROCESSED_IMAGE_MUST_BE_BLOB");
    }

    return withStore(
      "readwrite",
      (store) => store.put(
        {
          blob,
          mimeType: blob.type,
          size: blob.size,
          updatedAt: new Date().toISOString()
        },
        imageKey(userId, imageType)
      )
    );
  }

  async function removeProcessedImage(userId, imageType) {
    return withStore(
      "readwrite",
      (store) => store.delete(imageKey(userId, imageType))
    );
  }

  async function migrateLegacyProfileState(userId) {
    if (!userId || isLegacyCleanupDone(userId)) {
      return;
    }

    let shouldClearProcessedMedia = false;

    LEGACY_MEDIA_KEYS.forEach((key) => {
      if (localStorage.getItem(key) !== null) {
        shouldClearProcessedMedia = true;
        localStorage.removeItem(key);
      }
    });

    const rawMetadata = loadMetadata(userId);
    const metadata = sanitizeMetadata(rawMetadata);

    if (
      JSON.stringify(rawMetadata) !== JSON.stringify(metadata) ||
      !String(metadata.name || "").trim() ||
      looksLikeLegacyAvatarUrl(metadata.authAvatarUrl)
    ) {
      shouldClearProcessedMedia = true;
    }

    saveMetadata(userId, metadata);

    if (shouldClearProcessedMedia) {
      await Promise.all([
        removeProcessedImage(userId, "avatar"),
        removeProcessedImage(userId, "cover")
      ]);
    }

    markLegacyCleanupDone(userId);
  }

  window.VVIP_P03_PROFILE_STORE = Object.freeze({
    DEFAULT_META,
    PREVIEW_USER_ID,
    resolveIdentity,
    loadMetadata,
    saveMetadata,
    migrateLegacyProfileState,
    getProcessedImage,
    saveProcessedImage,
    removeProcessedImage
  });
})();
