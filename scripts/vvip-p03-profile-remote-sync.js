(function () {
  "use strict";

  const BUCKET = "vvip-profile-media";
  const MAX_BYTES = 8 * 1024 * 1024;
  const CHANNEL_NAME = "vvip-profile-media-sync";
  const REMOTE_TIMEOUT_MS = 15000;

  let clientPromise = null;
  let broadcastChannel = null;

  class ProfileMediaSyncError extends Error {
    constructor(code, message, details) {
      super(message);
      this.name = "ProfileMediaSyncError";
      this.code = code;
      this.details = details || null;
    }
  }

  function wait(milliseconds) {
    return new Promise((resolve) => {
      window.setTimeout(resolve, milliseconds);
    });
  }

  function withTimeout(promise, milliseconds = REMOTE_TIMEOUT_MS) {
    let timeoutId;
    const timeout = new Promise((_, reject) => {
      timeoutId = window.setTimeout(() => {
        reject(new ProfileMediaSyncError(
          "PROFILE_MEDIA_TIMEOUT",
          "استغرق الاتصال بالحساب وقتًا أطول من المتوقع."
        ));
      }, milliseconds);
    });

    return Promise.race([promise, timeout]).finally(() => {
      window.clearTimeout(timeoutId);
    });
  }

  function isOfflineError(error) {
    if (navigator.onLine === false) return true;
    const text = String(error?.message || error || "");
    return error instanceof TypeError && /fetch|network|offline/i.test(text);
  }

  function firstString(values) {
    return values.find(
      (value) =>
        typeof value === "string" &&
        value.trim()
    )?.trim() || "";
  }

  function resolveSupabaseConfiguration() {
    const configs = [
      window.VVIP_SUPABASE_CONFIG,
      window.SUPABASE_CONFIG,
      window.supabaseConfig,
      window.__SUPABASE_CONFIG__,
      window.vvipSupabaseConfig
    ].filter(
      (item) =>
        item &&
        typeof item === "object"
    );

    const url = firstString([
      window.VVIP_SUPABASE_URL,
      window.SUPABASE_URL,
      window.__SUPABASE_URL__,
      ...configs.flatMap((config) => [
        config.url,
        config.supabaseUrl,
        config.SUPABASE_URL
      ])
    ]);

    const key = firstString([
      window.VVIP_SUPABASE_ANON_KEY,
      window.VVIP_SUPABASE_PUBLISHABLE_KEY,
      window.SUPABASE_PUBLISHABLE_KEY,
      window.SUPABASE_ANON_KEY,
      window.__SUPABASE_PUBLISHABLE_KEY__,
      ...configs.flatMap((config) => [
        config.publishableKey,
        config.anonKey,
        config.key,
        config.supabaseKey,
        config.SUPABASE_PUBLISHABLE_KEY,
        config.SUPABASE_ANON_KEY
      ])
    ]);

    if (!url || !key) {
      throw new ProfileMediaSyncError(
        "SUPABASE_PUBLIC_CONFIG_MISSING",
        "تعذر قراءة رابط Supabase أو المفتاح العام."
      );
    }

    return {
      url: url.replace(/\/+$/, ""),
      key
    };
  }

  async function resolveClerkSession(timeout = 4000) {
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeout) {
      if (window.Clerk) {
        if (
          typeof window.Clerk.load === "function" &&
          !window.Clerk.loaded
        ) {
          try {
            await Promise.race([
              window.Clerk.load(),
              wait(800)
            ]);
          } catch (error) {
            /* نتابع الانتظار ضمن المهلة. */
          }
        }

        if (
          window.Clerk.session &&
          window.Clerk.user
        ) {
          return {
            session: window.Clerk.session,
            user: window.Clerk.user
          };
        }
      }

      await wait(120);
    }

    throw new ProfileMediaSyncError(
      "CLERK_SESSION_MISSING",
      "يجب تسجيل الدخول بالحساب نفسه قبل مزامنة الصور."
    );
  }

  async function createAuthenticatedClient() {
    if (clientPromise) {
      return clientPromise;
    }

    clientPromise = (async () => {
      if (
        !window.supabase ||
        typeof window.supabase.createClient !==
          "function"
      ) {
        throw new ProfileMediaSyncError(
          "SUPABASE_LIBRARY_MISSING",
          "مكتبة Supabase غير محملة."
        );
      }

      const configuration =
        resolveSupabaseConfiguration();

      await resolveClerkSession();

      return window.supabase.createClient(
        configuration.url,
        configuration.key,
        {
          async accessToken() {
            const session = window.Clerk?.session;

            if (!session || typeof session.getToken !== "function") {
              throw new ProfileMediaSyncError(
                "CLERK_SESSION_MISSING",
                "انتهت جلسة المستخدم. يرجى تسجيل الدخول من جديد."
              );
            }

            return session.getToken();
          },
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false
          },
          global: {
            headers: {
              "X-Client-Info":
                "vvip-tiger-profile-media/1.0"
            }
          }
        }
      );
    })();

    try {
      return await clientPromise;
    } catch (error) {
      clientPromise = null;
      throw error;
    }
  }

  function normalizeRow(data) {
    if (Array.isArray(data)) {
      return data[0] || null;
    }

    return data || null;
  }

  async function getRemoteState() {
    const client =
      await createAuthenticatedClient();

    const { data, error } = await withTimeout(
      client.rpc("vvip_get_own_profile_media")
    );

    if (error) {
      throw new ProfileMediaSyncError(
        "PROFILE_MEDIA_STATE_FAILED",
        "تعذر قراءة صور الحساب المركزية.",
        error
      );
    }

    return {
      client,
      row: normalizeRow(data)
    };
  }

  async function downloadToLocalCache(
    client,
    userId,
    store,
    kind,
    path
  ) {
    if (!path) return false;

    const { data, error } = await withTimeout(
      client.storage.from(BUCKET).download(path)
    );

    if (error || !(data instanceof Blob)) {
      throw new ProfileMediaSyncError(
        "PROFILE_MEDIA_DOWNLOAD_FAILED",
        `تعذر تنزيل ${kind} من الحساب المركزي.`,
        error
      );
    }

    await store.saveProcessedImage(
      userId,
      kind,
      data
    );

    return true;
  }

  async function syncDown(options) {
    const {
      userId,
      store
    } = options || {};

    if (
      !userId ||
      !store ||
      typeof store.saveProcessedImage !==
        "function"
    ) {
      throw new ProfileMediaSyncError(
        "PROFILE_MEDIA_SYNC_ARGUMENTS_INVALID",
        "بيانات مزامنة الصور غير مكتملة."
      );
    }

    const { client, row } =
      await getRemoteState();

    if (!row) {
      return {
        available: true,
        avatar: false,
        cover: false,
        empty: true
      };
    }

    const avatar = await downloadToLocalCache(
      client,
      userId,
      store,
      "avatar",
      row.avatar_path
    );

    const cover = await downloadToLocalCache(
      client,
      userId,
      store,
      "cover",
      row.cover_path
    );

    return {
      available: true,
      avatar,
      cover,
      empty:
        !row.avatar_path &&
        !row.cover_path,
      updatedAt:
        row.profile_media_updated_at || null
    };
  }

  function validateUpload(kind, blob) {
    if (!["avatar", "cover"].includes(kind)) {
      throw new ProfileMediaSyncError(
        "PROFILE_MEDIA_KIND_INVALID",
        "نوع صورة الحساب غير صحيح."
      );
    }

    if (!(blob instanceof Blob)) {
      throw new ProfileMediaSyncError(
        "PROFILE_MEDIA_BLOB_INVALID",
        "النسخة المعالجة غير صالحة."
      );
    }

    if (blob.size > MAX_BYTES) {
      throw new ProfileMediaSyncError(
        "PROFILE_MEDIA_TOO_LARGE",
        "حجم الصورة المعالجة يتجاوز 8 ميغابايت."
      );
    }

    if (
      ![
        "image/webp",
        "image/jpeg",
        "image/png"
      ].includes(blob.type)
    ) {
      throw new ProfileMediaSyncError(
        "PROFILE_MEDIA_TYPE_INVALID",
        "صيغة الصورة غير مسموحة."
      );
    }
  }

  function versionedPath(userId, kind) {
    const nonce =
      crypto.randomUUID()
        .replace(/-/g, "")
        .slice(0, 12);

    return (
      `${userId}/${kind}-` +
      `${Date.now()}-${nonce}.webp`
    );
  }

  async function deleteOldPath(
    client,
    userId,
    path
  ) {
    if (
      !path ||
      !path.startsWith(`${userId}/`)
    ) {
      return;
    }

    const { error } = await client
      .storage
      .from(BUCKET)
      .remove([path]);

    if (error) {
      console.warn(
        "VVIP_PROFILE_OLD_MEDIA_DELETE_FAILED",
        error.message
      );
    }
  }

  function broadcast(payload) {
    if ("BroadcastChannel" in window) {
      if (!broadcastChannel) {
        broadcastChannel =
          new BroadcastChannel(CHANNEL_NAME);
      }

      broadcastChannel.postMessage(payload);
    }

    window.dispatchEvent(
      new CustomEvent(
        "vvip:profile-media-updated",
        { detail: payload }
      )
    );
  }

  async function upload(options) {
    const {
      userId,
      kind,
      blob
    } = options || {};

    if (!userId) {
      throw new ProfileMediaSyncError(
        "PROFILE_USER_ID_MISSING",
        "هوية الحساب غير متاحة."
      );
    }

    validateUpload(kind, blob);

    const {
      client,
      row: previous
    } = await getRemoteState();

    const path = versionedPath(
      userId,
      kind
    );

    const { error: uploadError } =
      await withTimeout(client
        .storage
        .from(BUCKET)
        .upload(path, blob, {
          cacheControl: "3600",
          contentType:
            blob.type || "image/webp",
          upsert: false
        }));

    if (uploadError) {
      throw new ProfileMediaSyncError(
        "PROFILE_MEDIA_UPLOAD_FAILED",
        "تعذر رفع الصورة إلى الحساب المركزي.",
        uploadError
      );
    }

    const { error: rpcError } =
      await withTimeout(client.rpc(
        "vvip_set_own_profile_media",
        {
          p_kind: kind,
          p_path: path
        }
      ));

    if (rpcError) {
      await client
        .storage
        .from(BUCKET)
        .remove([path]);

      throw new ProfileMediaSyncError(
        "PROFILE_MEDIA_DATABASE_FAILED",
        "تم إلغاء الرفع لأن حفظ رابط الصورة فشل.",
        rpcError
      );
    }

    const { row: verified } = await getRemoteState();
    const verifiedPath = kind === "avatar"
      ? verified?.avatar_path
      : verified?.cover_path;

    if (verifiedPath !== path) {
      await client.storage.from(BUCKET).remove([path]);
      throw new ProfileMediaSyncError(
        "PROFILE_MEDIA_VERIFY_FAILED",
        "لم يؤكد الحساب المركزي حفظ الصورة."
      );
    }

    const oldPath =
      kind === "avatar"
        ? previous?.avatar_path
        : previous?.cover_path;

    await deleteOldPath(
      client,
      userId,
      oldPath
    );

    const result = verified;

    broadcast({
      kind,
      userId,
      path,
      updatedAt:
        result?.profile_media_updated_at ||
        new Date().toISOString()
    });

    return {
      path,
      state: result
    };
  }

  async function remove(options) {
    const {
      userId,
      kind
    } = options || {};

    if (
      !userId ||
      !["avatar", "cover"].includes(kind)
    ) {
      throw new ProfileMediaSyncError(
        "PROFILE_MEDIA_REMOVE_INVALID",
        "تعذر تحديد الصورة المطلوب حذفها."
      );
    }

    const {
      client,
      row: previous
    } = await getRemoteState();

    const oldPath =
      kind === "avatar"
        ? previous?.avatar_path
        : previous?.cover_path;

    const { error } = await client.rpc(
      "vvip_set_own_profile_media",
      {
        p_kind: kind,
        p_path: null
      }
    );

    if (error) {
      throw new ProfileMediaSyncError(
        "PROFILE_MEDIA_REMOVE_FAILED",
        "تعذر حذف الصورة المركزية.",
        error
      );
    }

    await deleteOldPath(
      client,
      userId,
      oldPath
    );

    broadcast({
      kind,
      userId,
      path: null,
      updatedAt: new Date().toISOString()
    });
  }

  function resetAuthenticatedClient() {
    clientPromise = null;

    if (broadcastChannel) {
      broadcastChannel.close();
      broadcastChannel = null;
    }
  }

  window.VVIP_P03_PROFILE_REMOTE_SYNC =
    Object.freeze({
      syncDown,
      upload,
      remove,
      getRemoteState,
      isOfflineError,
      resetAuthenticatedClient,
      ProfileMediaSyncError
    });
})();
