(function () {
  const STORAGE_POSTS_KEY = "autoparts_feed_posts";
  const STORAGE_USER_KEY = "autoparts_user_snapshot";
  const STORAGE_ROLE_KEY = "autoparts_role";
  const STORAGE_LANG_KEY = "autoparts_lang";
  const SUPABASE_URL_KEY = "TIGER_SUPABASE_URL";
  const SUPABASE_ANON_KEY = "TIGER_SUPABASE_ANON_KEY";
  const STORAGE_ANALYTICS_KEY = "autoparts_analytics_events";
  const STORAGE_ADS_KEY = "autoparts_ad_campaign";
  const STORAGE_SAVED_POSTS_KEY = "autoparts_saved_posts";
  const STORAGE_STORIES_KEY = "autoparts_story_items";
  const STORAGE_AI_ENDPOINT_KEY = "TIGER_AI_ENDPOINT";
  const STORAGE_AI_KEY_KEY = "TIGER_AI_KEY";
  const STORAGE_VISION_ENDPOINT_KEY = "TIGER_VISION_ENDPOINT";
  const STORAGE_VISION_KEY_KEY = "TIGER_VISION_KEY";
  const MIN_PENDING_BADGE_MS = 350;
  const AI_REQUEST_DEBOUNCE_MS = 420;
  const currentLang = (function () {
    const raw = String(localStorage.getItem(STORAGE_LANG_KEY) || document.documentElement.lang || "ar").toLowerCase();
    return raw.indexOf("en") === 0 ? "en" : "ar";
  })();

  function tx(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return String(value || "");
    }
    return String(value[currentLang] || value.ar || value.en || "");
  }

  function bi(arText, enText) {
    return { ar: arText, en: enText };
  }

  const UI_TEXT = {
    syncBadge: {
      db: bi("مزامن", "Synced"),
      pending: bi("جاري المزامنة...", "Syncing..."),
      local: bi("محلي", "Local")
    },
    composer: {
      sendingLabel: bi("جاري الإرسال...", "Sending..."),
      publishingStatus: bi("جاري النشر...", "Publishing..."),
      emptyPost: bi("يرجى كتابة نص المنشور قبل النشر.", "Please write post text before publishing."),
      unsafePostBlocked: bi("تم حظر النص لأنه يحتوي على نمط غير آمن.", "The post text was blocked because it contains an unsafe pattern."),
      normalizedPost: bi("تمت تنقية النص تلقائيًا قبل النشر.", "The post text was normalized before publishing."),
      publishSuccessDb: bi("تم نشر المنشور بنجاح (قاعدة البيانات).", "Post published successfully (database)."),
      publishSuccessLocal: bi("تم نشر المنشور محلياً (وضع offline).", "Post published locally (offline mode)."),
      createRestricted: bi("النشر متاح للحسابات التجارية فقط", "Posting is available for business accounts only")
    },
    dbStatus: {
      loadingFeed: bi("حالة البيانات: جاري مزامنة المنشورات...", "Data status: syncing posts..."),
      loadingProfile: bi("حالة البيانات: جاري مزامنة منشورات البروفايل...", "Data status: syncing profile posts..."),
      connected: bi("حالة البيانات: متصل بقاعدة البيانات.", "Data status: connected to database."),
      fallbackConnection: bi("حالة البيانات: تعذر الاتصال، تم التحويل للوضع المحلي.", "Data status: connection failed, switched to local mode."),
      fallbackConfigMissing: bi("حالة البيانات: وضع محلي (لم يتم ضبط Supabase). ", "Data status: local mode (Supabase not configured). "),
      metricSavedLocal: bi("حالة البيانات: تم حفظ التفاعل محلياً (تعذر مزامنة DB). ", "Data status: interaction saved locally (DB sync failed). "),
      publishSavedLocal: bi("حالة البيانات: حفظ محلي (offline fallback).", "Data status: saved locally (offline fallback).")
    },
    profile: {
      defaultBio: bi("حساب نشط على منصة AutoParts مع إدارة مباشرة للطلبات والمنشورات.", "Active AutoParts account with direct management of orders and posts."),
      accountTypePrefix: bi("نوع الحساب: ", "Account Type: ")
    },
    language: {
      switchToArabic: bi("التبديل إلى العربية", "Switch to Arabic"),
      switchToEnglish: bi("التبديل إلى الإنجليزية", "Switch to English")
    },
    pageTitles: {
      public: bi("الصفحة العامة - AutoParts JO", "Public Page - AutoParts JO"),
      private: bi("البروفايل الخاص - AutoParts JO", "Private Profile - AutoParts JO")
    },
    media: {
      videoPreview: bi("معاينة فيديو 16:9", "Video Preview 16:9"),
      imageGallery: bi("معرض صور 4:5", "Image Gallery 4:5")
    },
    feedPaging: {
      loadMore: bi("تحميل المزيد", "Load more"),
      loadingMore: bi("جاري تحميل المزيد...", "Loading more..."),
      noMore: bi("لا توجد منشورات إضافية.", "No more posts.")
    },
    postActions: {
      options: bi("خيارات", "Options"),
      save: bi("🔖 حفظ", "🔖 Save")
    }
  };
  const ROLE_LABELS = {
    company_parts: bi("شركة قطع سيارات", "Auto Parts Company"),
    institution_parts: bi("مؤسسة قطع سيارات", "Auto Parts Institution"),
    buyer: bi("مشتري", "Buyer"),
    shop: bi("محل", "Shop"),
    maintenance_center: bi("مركز صيانة", "Maintenance Center")
  };

  const FEED_PAGE_SIZE = 12;
  const FEED_DOM_WINDOW = 36;
  const ANALYTICS_WINDOW_DAYS = 28;
  const ANALYTICS_MAX_EVENTS = 500;

  let supabaseClientPromise = null;

  function hasSupabaseRuntimeConfig() {
    const url = String(localStorage.getItem(SUPABASE_URL_KEY) || "").trim();
    const anonKey = String(localStorage.getItem(SUPABASE_ANON_KEY) || "").trim();
    return Boolean(url && anonKey && !url.includes("your-project") && !anonKey.includes("your-anon-key"));
  }

  function getSupabaseRuntimeConfig() {
    return {
      url: String(localStorage.getItem(SUPABASE_URL_KEY) || "").trim(),
      anonKey: String(localStorage.getItem(SUPABASE_ANON_KEY) || "").trim()
    };
  }

  async function ensureSupabaseClient() {
    if (!hasSupabaseRuntimeConfig()) return null;
    if (supabaseClientPromise) return supabaseClientPromise;

    supabaseClientPromise = new Promise(function (resolve) {
      const existingFactory = window.supabase && window.supabase.createClient;
      if (existingFactory) {
        const config = getSupabaseRuntimeConfig();
        resolve(existingFactory(config.url, config.anonKey));
        return;
      }

      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
      script.onload = function () {
        if (!window.supabase || !window.supabase.createClient) {
          resolve(null);
          return;
        }
        const config = getSupabaseRuntimeConfig();
        resolve(window.supabase.createClient(config.url, config.anonKey));
      };
      script.onerror = function () {
        resolve(null);
      };
      document.head.appendChild(script);
    });

    return supabaseClientPromise;
  }

  function normalizePostFromDb(row) {
    return {
      id: row.id,
      text: String(row.description || "").trim(),
      type: row.media_kind || "all",
      audience: row.visibility || "all",
      author: row.author_name || "AutoParts User",
      handle: row.author_handle || "autoparts.user",
      likes: Number(row.like_count || 0),
      comments: Number(row.comment_count || 0),
      shares: Number(row.share_count || 0),
      createdAt: row.created_at || "",
      syncState: "db"
    };
  }

  async function fetchPostsFromSupabase(options) {
    const client = await ensureSupabaseClient();
    if (!client) return null;

    const limit = Math.max(1, Math.min(60, Number(options && options.limit) || FEED_PAGE_SIZE));
    const before = options && options.before ? String(options.before).trim() : "";

    let query = client
      .from("feed_posts")
      .select("id,description,media_kind,visibility,author_name,author_handle,like_count,comment_count,share_count,created_at")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (before) {
      query = query.lt("created_at", before);
    }

    const { data, error } = await query;

    if (error || !Array.isArray(data)) return null;
    return data.map(normalizePostFromDb);
  }

  async function insertPostToSupabase(post) {
    const client = await ensureSupabaseClient();
    if (!client) return null;

    const payload = {
      description: post.text,
      media_kind: post.type,
      visibility: post.audience,
      author_name: post.author,
      author_handle: post.handle,
      like_count: 0,
      comment_count: 0,
      share_count: 0
    };

    const { data, error } = await client.from("feed_posts").insert([payload]).select("id,description,media_kind,visibility,author_name,author_handle,like_count,comment_count,share_count,created_at").single();
    if (error || !data) return null;
    return normalizePostFromDb(data);
  }

  function getCurrentRole() {
    return String(localStorage.getItem(STORAGE_ROLE_KEY) || "company_parts").trim();
  }

  function getStoredPosts() {
    try {
      const raw = localStorage.getItem(STORAGE_POSTS_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (_error) {
      return [];
    }
  }

  function getStoredPostsPage(lastVisiblePost, limit) {
    const posts = getStoredPosts();
    const pageSize = Math.max(1, Math.min(60, Number(limit) || FEED_PAGE_SIZE));
    if (!lastVisiblePost) {
      return posts.slice(0, pageSize);
    }

    const index = posts.findIndex(function (post) {
      return String(post.id) === String(lastVisiblePost.id);
    });

    if (index < 0) {
      return posts.slice(0, pageSize);
    }

    return posts.slice(index + 1, index + 1 + pageSize);
  }

  function setStoredPosts(posts) {
    localStorage.setItem(STORAGE_POSTS_KEY, JSON.stringify(posts));
  }

  function readUserSnapshot() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_USER_KEY) || "null");
    } catch (_error) {
      return null;
    }
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function escapeAttribute(value) {
    return escapeHtml(value).replace(/`/g, "&#96;");
  }

  function linkifyPostText(text) {
    const segments = String(text || "").split(/(\s+)/);
    return segments.map(function (segment) {
      if (/^\s+$/.test(segment)) return segment;
      if (/^#[\p{L}\p{N}_-]+$/u.test(segment) || /^@[\p{L}\p{N}_.-]+$/u.test(segment)) {
        return '<a class="post-mention-link" href="' + escapeAttribute(segment) + '">' + escapeHtml(segment) + '</a>';
      }
      return escapeHtml(segment);
    }).join("");
  }

  function sanitizeComposerText(value) {
    const original = String(value || "");
    const trimmed = original.trim();
    const unsafePattern = /<\s*script|<\s*iframe|<\s*object|<\s*embed|on\w+\s*=|javascript:|data:text\/html|vbscript:|eval\s*\(|document\.(cookie|location)|window\.(location|open)/i;
    if (unsafePattern.test(original)) {
      return {
        blocked: true,
        changed: false,
        text: ""
      };
    }

    const cleaned = trimmed
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, " ")
      .replace(/[\u200B-\u200D\uFEFF]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 500);

    return {
      blocked: false,
      changed: cleaned !== trimmed,
      text: cleaned
    };
  }

  function setComposerStatus(node, message, tone) {
    if (!node) return;
    node.classList.remove("is-warning", "is-error");
    if (tone === "warning") {
      node.classList.add("is-warning");
    } else if (tone === "error") {
      node.classList.add("is-error");
    }
    node.textContent = message;
  }

  function setSectionLoading(skeletonNode, contentNode, isLoading) {
    if (skeletonNode) {
      skeletonNode.hidden = !isLoading;
      skeletonNode.setAttribute("aria-hidden", isLoading ? "false" : "true");
    }
    if (contentNode) {
      contentNode.hidden = Boolean(isLoading);
    }
  }

  function ensureToastRoot() {
    let root = document.getElementById("app-toast-root");
    if (root) return root;
    root = document.createElement("div");
    root.id = "app-toast-root";
    root.className = "app-toast-root";
    root.setAttribute("aria-live", "polite");
    root.setAttribute("aria-atomic", "true");
    document.body.appendChild(root);
    return root;
  }

  function showToast(message, tone) {
    if (!message) return;
    const root = ensureToastRoot();
    const toast = document.createElement("div");
    toast.className = "app-toast" + (tone ? " is-" + tone : "");
    toast.textContent = message;
    root.appendChild(toast);
    window.setTimeout(function () {
      toast.classList.add("is-leaving");
      window.setTimeout(function () {
        toast.remove();
      }, 220);
    }, 2200);
  }

  function getLastRenderedPost(feedList) {
    if (!feedList) return null;
    const cards = Array.from(feedList.querySelectorAll(".post-card:not(.hidden)"));
    if (!cards.length) return null;
    const lastCard = cards[cards.length - 1];
    if (!lastCard) return null;
    return {
      id: lastCard.getAttribute("data-post-id") || "",
      createdAt: lastCard.getAttribute("data-created-at") || ""
    };
  }

  function pruneRenderedFeedCards(feedList, maxCount) {
    if (!feedList) return;
    const cards = Array.from(feedList.querySelectorAll(".post-card"));
    const limit = Math.max(1, Number(maxCount) || FEED_DOM_WINDOW);
    if (cards.length <= limit) return;

    const overflow = cards.length - limit;
    for (let index = 0; index < overflow; index += 1) {
      const card = cards[cards.length - 1 - index];
      if (card && card.parentNode === feedList) {
        card.remove();
      }
    }
  }

  function readStoredList(storageKey) {
    try {
      const raw = localStorage.getItem(storageKey);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (_error) {
      return [];
    }
  }

  function writeStoredList(storageKey, value) {
    localStorage.setItem(storageKey, JSON.stringify(value));
  }

  function readSavedPostIds() {
    const saved = readStoredList(STORAGE_SAVED_POSTS_KEY);
    return Array.isArray(saved) ? saved.map(function (id) { return String(id); }) : [];
  }

  function writeSavedPostIds(ids) {
    writeStoredList(STORAGE_SAVED_POSTS_KEY, Array.from(new Set(ids.map(String))));
  }

  function isPostSaved(postId) {
    if (!postId) return false;
    return readSavedPostIds().indexOf(String(postId)) !== -1;
  }

  function toggleSavedPost(postId) {
    if (!postId) return false;
    const current = readSavedPostIds();
    const id = String(postId);
    const exists = current.indexOf(id) !== -1;
    const next = exists ? current.filter(function (value) { return value !== id; }) : current.concat(id);
    writeSavedPostIds(next);
    return !exists;
  }

  function getStoredStories() {
    const fallbackStories = [
      {
        id: "story-1",
        author: currentLang === "en" ? "Tiger Auto Parts" : "شركة النمر",
        handle: "tiger.parts",
        type: "image",
        mediaUrl: "",
        caption: currentLang === "en" ? "New arrivals today" : "وصول شحنات جديدة اليوم",
        expiresAt: Date.now() + 24 * 60 * 60 * 1000
      },
      {
        id: "story-2",
        author: currentLang === "en" ? "VIP Service" : "خدمة VIP",
        handle: "vip.service",
        type: "video",
        mediaUrl: "",
        caption: currentLang === "en" ? "Quick service update" : "تحديث سريع للخدمة",
        expiresAt: Date.now() + 24 * 60 * 60 * 1000
      },
      {
        id: "story-3",
        author: currentLang === "en" ? "Workshop" : "الورشة",
        handle: "workshop.jo",
        type: "image",
        mediaUrl: "",
        caption: currentLang === "en" ? "Before / after" : "قبل / بعد",
        expiresAt: Date.now() + 24 * 60 * 60 * 1000
      }
    ];

    try {
      const raw = localStorage.getItem(STORAGE_STORIES_KEY);
      const parsed = raw ? JSON.parse(raw) : fallbackStories;
      const items = Array.isArray(parsed) ? parsed : fallbackStories;
      return items.filter(function (story) {
        return story && story.expiresAt && Number(story.expiresAt) > Date.now();
      });
    } catch (_error) {
      return fallbackStories;
    }
  }

  function writeStoredStories(stories) {
    writeStoredList(STORAGE_STORIES_KEY, Array.isArray(stories) ? stories : []);
  }

  function getAiRuntimeConfig() {
    return {
      endpoint: String(localStorage.getItem(STORAGE_AI_ENDPOINT_KEY) || "").trim(),
      apiKey: String(localStorage.getItem(STORAGE_AI_KEY_KEY) || "").trim(),
      visionEndpoint: String(localStorage.getItem(STORAGE_VISION_ENDPOINT_KEY) || "").trim(),
      visionApiKey: String(localStorage.getItem(STORAGE_VISION_KEY_KEY) || "").trim()
    };
  }

  function sanitizeHttpEndpoint(value) {
    const url = String(value || "").trim();
    if (!url) return "";
    if (!/^https?:\/\//i.test(url)) return "";
    return url;
  }

  function normalizeAssistantTags(tags, fallbackTags) {
    const source = Array.isArray(tags) ? tags : Array.isArray(fallbackTags) ? fallbackTags : [];
    const normalized = source
      .map(function (tag) { return String(tag || "").trim(); })
      .filter(Boolean)
      .slice(0, 6)
      .map(function (tag) {
        return tag.charAt(0) === "#" ? tag : ("#" + tag.replace(/\s+/g, "_"));
      });
    return normalized.length ? normalized : ["#AutoParts"];
  }

  async function requestAssistantFromApi(draft, fallbackSignals) {
    const config = getAiRuntimeConfig();
    const baseEndpoint = sanitizeHttpEndpoint(config.endpoint);
    const visionEndpoint = sanitizeHttpEndpoint(config.visionEndpoint);
    const useVision = Boolean(draft && draft.mediaUrl && visionEndpoint);
    const endpoint = useVision ? visionEndpoint : baseEndpoint;
    if (!endpoint) return null;

    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timeoutId = window.setTimeout(function () {
      if (controller) controller.abort();
    }, 2500);

    try {
      const headers = {
        "Content-Type": "application/json"
      };
      const token = useVision ? config.visionApiKey : config.apiKey;
      if (token) {
        headers.Authorization = "Bearer " + token;
      }

      const payload = {
        task: "classify_post",
        lang: currentLang,
        context: {
          mode: useVision ? "vision" : "text"
        },
        draft: {
          text: String(draft && draft.text ? draft.text : ""),
          type: String(draft && draft.type ? draft.type : "all"),
          audience: String(draft && draft.audience ? draft.audience : "all"),
          mediaUrl: String(draft && draft.mediaUrl ? draft.mediaUrl : ""),
          mediaCaption: String(draft && draft.mediaCaption ? draft.mediaCaption : "")
        }
      };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(payload),
        signal: controller ? controller.signal : undefined
      });

      if (!response.ok) return null;

      const data = await response.json();
      if (!data || typeof data !== "object") return null;

      const category = String(data.category || fallbackSignals.category || "general");
      const summary = String(data.summary || fallbackSignals.summary || "").trim() || fallbackSignals.summary;
      const tip = String(data.tip || fallbackSignals.tip || "").trim() || fallbackSignals.tip;
      const confidence = String(data.confidence || fallbackSignals.confidence || "").trim() || fallbackSignals.confidence;
      const tags = normalizeAssistantTags(data.tags, fallbackSignals.tags);

      return {
        category: category,
        summary: summary,
        tags: tags,
        tip: tip,
        confidence: confidence,
        source: useVision ? "vision-api" : "ai-api"
      };
    } catch (_error) {
      return null;
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  async function insertAnalyticsEventToSupabase(eventRecord) {
    if (!eventRecord || !eventRecord.id) return false;
    const client = await ensureSupabaseClient();
    if (!client) return false;

    const snapshot = readUserSnapshot() || {};
    const payload = {
      event_id: String(eventRecord.id),
      event_type: String(eventRecord.type || "event"),
      payload_json: eventRecord.payload || {},
      actor_handle: String(snapshot.handle || "autoparts.user"),
      created_at: eventRecord.createdAt || new Date().toISOString()
    };

    const { error } = await client.from("feed_analytics_events").insert([payload]);
    return !error;
  }

  async function fetchAnalyticsEventsFromSupabase(days) {
    const client = await ensureSupabaseClient();
    if (!client) return null;

    const windowDays = Math.max(1, Number(days) || ANALYTICS_WINDOW_DAYS);
    const sinceIso = new Date(Date.now() - (windowDays * 24 * 60 * 60 * 1000)).toISOString();
    const { data, error } = await client
      .from("feed_analytics_events")
      .select("event_id,event_type,payload_json,created_at")
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: false })
      .limit(1000);

    if (error || !Array.isArray(data)) return null;

    return data
      .map(function (row) {
        return {
          id: row.event_id || (String(row.event_type || "event") + "-" + String(row.created_at || "")),
          type: String(row.event_type || "event"),
          payload: row.payload_json || {},
          createdAt: row.created_at || new Date().toISOString()
        };
      })
      .filter(function (item) {
        return Boolean(item.createdAt);
      });
  }

  async function fetchAdCampaignFromSupabase() {
    const client = await ensureSupabaseClient();
    if (!client) return null;

    const snapshot = readUserSnapshot() || {};
    const handle = String(snapshot.handle || "autoparts.user");
    const { data, error } = await client
      .from("ad_campaign_settings")
      .select("location,age_range,interests,budget,start_date,end_date,updated_at")
      .eq("actor_handle", handle)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;

    return {
      location: String(data.location || ""),
      age: String(data.age_range || ""),
      interests: String(data.interests || ""),
      budget: String(data.budget || ""),
      start: String(data.start_date || ""),
      end: String(data.end_date || "")
    };
  }

  async function upsertAdCampaignToSupabase(settings) {
    const client = await ensureSupabaseClient();
    if (!client) return false;

    const snapshot = readUserSnapshot() || {};
    const payload = {
      actor_handle: String(snapshot.handle || "autoparts.user"),
      location: String(settings && settings.location ? settings.location : ""),
      age_range: String(settings && settings.age ? settings.age : ""),
      interests: String(settings && settings.interests ? settings.interests : ""),
      budget: String(settings && settings.budget ? settings.budget : ""),
      start_date: String(settings && settings.start ? settings.start : ""),
      end_date: String(settings && settings.end ? settings.end : "")
    };

    const { error } = await client.from("ad_campaign_settings").insert([payload]);
    return !error;
  }

  function logAnalyticsEvent(eventType, payload) {
    const events = readStoredList(STORAGE_ANALYTICS_KEY);
    const eventRecord = {
      id: eventType + "-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
      type: String(eventType || "event"),
      payload: payload || {},
      createdAt: new Date().toISOString()
    };
    events.unshift(eventRecord);
    writeStoredList(STORAGE_ANALYTICS_KEY, events.slice(0, ANALYTICS_MAX_EVENTS));

    insertAnalyticsEventToSupabase(eventRecord).catch(function () {
      return null;
    });
  }

  function readAnalyticsEvents() {
    const events = readStoredList(STORAGE_ANALYTICS_KEY);
    return events.filter(function (event) {
      return event && event.createdAt;
    });
  }

  function getAnalyticsWindow(days) {
    const limitMs = Math.max(1, Number(days) || ANALYTICS_WINDOW_DAYS) * 24 * 60 * 60 * 1000;
    return readAnalyticsEvents().filter(function (event) {
      const time = new Date(event.createdAt).getTime();
      return !Number.isNaN(time) && (Date.now() - time) <= limitMs;
    });
  }

  function getUserContextSnapshot() {
    const snapshot = readUserSnapshot() || {};
    return {
      handle: String(snapshot.handle || "autoparts.user"),
      displayName: String(snapshot.displayName || "AutoParts User"),
      bio: String(snapshot.bio || ""),
      role: getCurrentRole()
    };
  }

  function normalizeWords(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[\u0600-\u06FF]+/g, function (match) {
        return match;
      })
      .replace(/[^\w\u0600-\u06FF]+/g, " ")
      .split(/\s+/)
      .filter(Boolean);
  }

  function guessContentSignals(draft) {
    const text = String(draft && draft.text ? draft.text : "").toLowerCase();
    const mediaUrl = String(draft && draft.mediaUrl ? draft.mediaUrl : "").toLowerCase();
    const signals = {
      category: "general",
      summary: currentLang === "en" ? "General content" : "محتوى عام",
      tags: ["#AutoParts"],
      tip: currentLang === "en" ? "Add a concrete part number or VIN to improve reach." : "أضف رقم قطعة أو رقم هيكل لرفع التفاعل.",
      confidence: currentLang === "en" ? "Medium confidence" : "ثقة متوسطة"
    };

    const joined = text + " " + mediaUrl;
    if (/\b(vin|شاصي|chassis|oem|original|اصلي|قطع|part|sensor|engine|gear|brake|filter|radiator|cooling)\b/i.test(joined)) {
      signals.category = "auto-parts";
      signals.summary = currentLang === "en" ? "Auto parts / compatibility" : "قطع غيار / توافق";
      signals.tags = ["#قطع_غيار", "#AutoParts", "#VIN"];
      signals.tip = currentLang === "en" ? "Mention the model year and compatibility details." : "اذكر سنة الموديل وتفاصيل التوافق.";
      signals.confidence = currentLang === "en" ? "High confidence" : "ثقة عالية";
    } else if (/\b(video|فيديو|reels|ريلز)\b/i.test(joined)) {
      signals.category = "video";
      signals.summary = currentLang === "en" ? "Short-form video" : "فيديو قصير";
      signals.tags = ["#Video", "#Reels"];
      signals.tip = currentLang === "en" ? "Use a 1-line hook in the first sentence." : "استخدم جملة جذب في السطر الأول.";
    } else if (/\b(photo|image|صورة|صور)\b/i.test(joined)) {
      signals.category = "photo";
      signals.summary = currentLang === "en" ? "Image-led post" : "منشور يعتمد على صورة";
      signals.tags = ["#Photo", "#Showcase"];
      signals.tip = currentLang === "en" ? "Add a before/after note for stronger engagement." : "أضف ملاحظة قبل/بعد لرفع التفاعل.";
    }

    if (normalizeWords(text).length < 6) {
      signals.tip = currentLang === "en" ? "Add a few more details for a stronger caption." : "أضف تفاصيل أكثر ليصبح الوصف أقوى.";
    }

    return signals;
  }

  function summarizeAnalytics(days, externalEvents) {
    const events = Array.isArray(externalEvents) ? externalEvents : getAnalyticsWindow(days);
    const dayBuckets = {};
    const hourBuckets = Array.from({ length: 24 }, function () { return 0; });
    const typeCounts = {};
    let published = 0;
    let interactions = 0;

    events.forEach(function (event) {
      const time = new Date(event.createdAt).getTime();
      if (Number.isNaN(time)) return;
      const dateKey = new Date(time).toISOString().slice(0, 10);
      const hour = new Date(time).getHours();
      dayBuckets[dateKey] = (dayBuckets[dateKey] || 0) + 1;
      hourBuckets[hour] += 1;
      typeCounts[event.type] = (typeCounts[event.type] || 0) + 1;
      if (event.type === "post_publish") published += 1;
      if (event.type === "post_like" || event.type === "post_comment" || event.type === "post_share") interactions += 1;
    });

    const daysWithActivity = Object.keys(dayBuckets).sort().map(function (dateKey) {
      return { date: dateKey, count: dayBuckets[dateKey] };
    });
    const peakHourIndex = hourBuckets.indexOf(Math.max.apply(Math, hourBuckets));
    const peakHourLabel = currentLang === "en"
      ? (peakHourIndex + ":00")
      : (peakHourIndex + ":00");

    const todayFollowerBase = Number((readUserSnapshot() && readUserSnapshot().followers) || 12400) || 12400;
    const projectedDelta = Math.max(0, Math.round((published * 18) + (interactions * 0.6) + (daysWithActivity.length * 6)));
    const projectedFollowers = todayFollowerBase + Math.max(12, projectedDelta);

    const activeDays = daysWithActivity.length || 1;
    const avgPerDay = Math.max(0, Math.round((published + interactions) / activeDays));
    const trendDirection = avgPerDay >= 6 ? (currentLang === "en" ? "accelerating" : "يتسارع") : avgPerDay >= 3 ? (currentLang === "en" ? "steady" : "مستقر") : (currentLang === "en" ? "building" : "في طور النمو");

    return {
      events: events,
      totalEvents: events.length,
      published: published,
      interactions: interactions,
      projectedFollowers: projectedFollowers,
      trendDirection: trendDirection,
      peakHourLabel: peakHourLabel,
      dailySeries: daysWithActivity,
      typeCounts: typeCounts,
      nextAction: currentLang === "en"
        ? "Keep a consistent posting rhythm for the next 14 days."
        : "حافظ على وتيرة نشر ثابتة خلال 14 يومًا القادمة."
    };
  }

  function readAdCampaignSettings() {
    const fallback = {
      location: "",
      age: "",
      interests: "",
      budget: "",
      start: "",
      end: ""
    };
    try {
      return Object.assign(fallback, JSON.parse(localStorage.getItem(STORAGE_ADS_KEY) || "{}"));
    } catch (_error) {
      return fallback;
    }
  }

  function writeAdCampaignSettings(settings) {
    localStorage.setItem(STORAGE_ADS_KEY, JSON.stringify(settings || {}));
  }

  function sanitizeExternalUrl(value) {
    const url = String(value || "").trim();
    if (!url) return "";
    if (/^(https?:)?\/\//i.test(url) || url.indexOf("/") === 0) return url;
    return "";
  }

  function ensureInAppBrowserShell() {
    let shell = document.getElementById("inapp-browser");
    if (shell) return shell;

    shell = document.createElement("aside");
    shell.id = "inapp-browser";
    shell.className = "inapp-browser";
    shell.setAttribute("aria-hidden", "true");
    shell.innerHTML = [
      '<div class="inapp-browser-sheet" role="dialog" aria-modal="true" aria-label="In-app browser">',
      '  <div class="inapp-browser-head">',
      '    <strong>In-app browser</strong>',
      '    <div class="inapp-browser-actions">',
      '      <button id="inapp-browser-open-external" type="button">Open externally</button>',
      '      <button id="inapp-browser-close" type="button">Close</button>',
      '    </div>',
      '  </div>',
      '  <iframe id="inapp-browser-frame" title="In-app browser"></iframe>',
      '</div>'
    ].join("\n");
    document.body.appendChild(shell);
    return shell;
  }

  function openInAppBrowser(url, title) {
    const safeUrl = sanitizeExternalUrl(url);
    if (!safeUrl) return false;
    const shell = ensureInAppBrowserShell();
    const frame = shell.querySelector("#inapp-browser-frame");
    const closeButton = shell.querySelector("#inapp-browser-close");
    const openExternalButton = shell.querySelector("#inapp-browser-open-external");
    if (!frame || !closeButton || !openExternalButton) return false;

    if (title) {
      const heading = shell.querySelector(".inapp-browser-head strong");
      if (heading) heading.textContent = title;
    }

    frame.src = safeUrl;
    shell.classList.add("open");
    shell.setAttribute("aria-hidden", "false");

    closeButton.onclick = function () {
      shell.classList.remove("open");
      shell.setAttribute("aria-hidden", "true");
      frame.src = "about:blank";
    };

    openExternalButton.onclick = function () {
      window.open(safeUrl, "_blank", "noopener,noreferrer");
    };

    shell.onclick = function (event) {
      if (event.target === shell) {
        closeButton.click();
      }
    };

    return true;
  }

  function logPageView(route) {
    logAnalyticsEvent("page_view", { route: route || "unknown" });
  }

  function relativeTimeLabel(value) {
    if (!value) return currentLang === "en" ? "now" : "الآن";
    const time = new Date(value).getTime();
    if (Number.isNaN(time)) return currentLang === "en" ? "now" : "الآن";

    const diffSec = Math.max(0, Math.floor((Date.now() - time) / 1000));
    if (currentLang === "en") {
      if (diffSec < 60) return "now";
      if (diffSec < 3600) {
        const mins = Math.floor(diffSec / 60);
        return mins + " minute" + (mins === 1 ? "" : "s") + " ago";
      }
      if (diffSec < 86400) {
        const hours = Math.floor(diffSec / 3600);
        return hours + " hour" + (hours === 1 ? "" : "s") + " ago";
      }
      const days = Math.floor(diffSec / 86400);
      return days + " day" + (days === 1 ? "" : "s") + " ago";
    }

    if (diffSec < 60) return "الآن";
    if (diffSec < 3600) return "قبل " + Math.floor(diffSec / 60) + " دقيقة";
    if (diffSec < 86400) return "قبل " + Math.floor(diffSec / 3600) + " ساعة";
    return "قبل " + Math.floor(diffSec / 86400) + " يوم";
  }

  function createPostHtml(post, options) {
    const compact = options && options.compact;
    const mediaClass = post.type === "video" ? "media-video" : post.type === "images" ? "media-image" : "";
    const mediaLabel = post.type === "video"
      ? tx(UI_TEXT.media.videoPreview)
      : post.type === "images"
      ? tx(UI_TEXT.media.imageGallery)
      : "";
    const safeId = post.id != null ? escapeHtml(String(post.id)) : "";
    const safeType = escapeHtml(post.type || "all");
    const safeAudience = escapeHtml(post.audience || "all");
    const safeText = linkifyPostText(post.text || "");
    const safeAuthor = escapeHtml(post.author || "AutoParts User");
    const safeHandle = escapeHtml(post.handle || "autoparts.user");
    const safeMediaUrl = escapeHtml(post.mediaUrl || "");
    const safeMediaPoster = escapeHtml(post.mediaPoster || "");
    const safeMediaCaption = escapeHtml(post.mediaCaption || mediaLabel || safeText || safeAuthor);
    const timeLabel = relativeTimeLabel(post.createdAt);
    const syncState = post.syncState === "db" ? "db" : post.syncState === "pending" ? "pending" : "local";
    const syncLabel = tx(UI_TEXT.syncBadge[syncState]);
    const postOptionsLabel = escapeHtml(tx(UI_TEXT.postActions.options));
    const saveActionLabel = escapeHtml(tx(UI_TEXT.postActions.save));

    let mediaMarkup = "";
    if (safeMediaUrl) {
      if (post.type === "video") {
        mediaMarkup = [
          '  <div class="post-media ' + mediaClass + '">',
          '    <video class="post-media-asset post-media-video" controls preload="none" playsinline' + (safeMediaPoster ? ' poster="' + safeMediaPoster + '"' : '') + '>',
          '      <source src="' + safeMediaUrl + '" type="video/mp4" />',
          '    </video>',
          '    <span class="post-media-caption">' + safeMediaCaption + '</span>',
          '  </div>'
        ].join("\n");
      } else {
        mediaMarkup = [
          '  <div class="post-media ' + mediaClass + '">',
          '    <img class="post-media-asset post-media-image" src="' + safeMediaUrl + '" alt="' + safeMediaCaption + '" loading="lazy" decoding="async"' + (safeMediaPoster ? ' data-poster="' + safeMediaPoster + '"' : '') + ' />',
          '    <span class="post-media-caption">' + safeMediaCaption + '</span>',
          '  </div>'
        ].join("\n");
      }
    } else if (mediaClass) {
      mediaMarkup = '  <div class="post-media ' + mediaClass + '" aria-hidden="true">' + mediaLabel + '</div>';
    }

    return [
      '<article class="' + (compact ? "post-card compact" : "post-card") + '" data-post-id="' + safeId + '" data-type="' + safeType + '" data-audience="' + safeAudience + '" data-text="' + safeText + '" data-created-at="' + escapeHtml(post.createdAt || "") + '">',
      '  <header class="post-header">',
      '    <div>',
      '      <h2>' + safeAuthor + '</h2>',
      '      <p>@' + safeHandle + ' • ' + timeLabel + '</p>',
      '      <span class="post-sync-badge sync-' + syncState + '">📡 ' + syncLabel + '</span>',
      '    </div>',
      '    <button class="post-menu" type="button" aria-label="' + postOptionsLabel + '">⋯</button>',
      '  </header>',
      '  <p class="post-copy">' + safeText + '</p>',
      mediaMarkup,
      '  <footer class="post-footer">',
      '    <button class="action-btn like-btn" type="button" data-liked="false">❤ <span>' + (post.likes || 0) + '</span></button>',
      '    <button class="action-btn comment-btn" type="button">💬 <span>' + (post.comments || 0) + '</span></button>',
      '    <button class="action-btn share-btn" type="button">↪ <span>' + (post.shares || 0) + '</span></button>',
      '    <button class="action-btn save-btn" type="button" data-saved="' + (isPostSaved(post.id) ? 'true' : 'false') + '">' + (isPostSaved(post.id) ? (currentLang === 'en' ? 'Saved' : 'محفوظ') : saveActionLabel) + '</button>',
      '  </footer>',
      '</article>'
    ].join("\n");
  }

  function replaceStoredPostById(targetId, nextPost) {
    const posts = getStoredPosts();
    let found = false;
    const updated = posts.map(function (post) {
      if (String(post.id) !== String(targetId)) return post;
      found = true;
      return nextPost;
    });

    if (!found) {
      updated.unshift(nextPost);
    }

    setStoredPosts(updated.slice(0, 60));
  }

  function normalizeMetricCount(value) {
    const source = String(value || "").trim().toLowerCase();
    if (!source) return 0;
    if (source.indexOf("k") !== -1) {
      const parsedK = parseFloat(source.replace(/[^\d.]/g, ""));
      return Number.isNaN(parsedK) ? 0 : Math.round(parsedK * 1000);
    }
    const parsed = parseInt(source.replace(/[^\d]/g, ""), 10);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  function formatMetricCount(value) {
    const safeValue = Math.max(0, Number(value) || 0);
    if (safeValue >= 1000) {
      return (Math.round((safeValue / 1000) * 10) / 10) + "K";
    }
    return String(safeValue);
  }

  function readMetricFromButton(button) {
    const countNode = button.querySelector("span");
    if (!countNode) return 0;
    return normalizeMetricCount(countNode.textContent);
  }

  function writeMetricToButton(button, value) {
    const countNode = button.querySelector("span");
    if (!countNode) return;
    countNode.textContent = formatMetricCount(value);
  }

  function setPostSyncBadgeState(postCard, state) {
    if (!postCard) return;

    const status = state === "db" ? "db" : state === "pending" ? "pending" : "local";
    const label = tx(UI_TEXT.syncBadge[status]);

    let badge = postCard.querySelector(".post-sync-badge");
    if (!badge) {
      const headerMeta = postCard.querySelector(".post-header > div");
      if (!headerMeta) return;
      badge = document.createElement("span");
      badge.className = "post-sync-badge";
      headerMeta.appendChild(badge);
    }

    badge.classList.remove("sync-db", "sync-local", "sync-pending");
    badge.classList.add("sync-" + status);
    badge.textContent = "📡 " + label;
  }

  function setActionButtonSyncState(button, isSyncing) {
    if (!button) return;

    let indicator = button.querySelector(".action-sync-indicator");
    if (isSyncing) {
      if (!indicator) {
        indicator = document.createElement("span");
        indicator.className = "action-sync-indicator";
        indicator.setAttribute("aria-hidden", "true");
        indicator.textContent = "●";
        button.appendChild(indicator);
      }
      button.classList.add("action-sync-pending");
      button.setAttribute("aria-busy", "true");
      return;
    }

    if (indicator) {
      indicator.remove();
    }
    button.classList.remove("action-sync-pending");
    button.removeAttribute("aria-busy");
  }

  function setComposerPublishState(button, isSyncing) {
    if (!button) return;

    let indicator = button.querySelector(".composer-sync-indicator");
    let label = button.querySelector(".composer-sync-label");
    if (isSyncing) {
      if (!indicator) {
        indicator = document.createElement("span");
        indicator.className = "composer-sync-indicator";
        indicator.setAttribute("aria-hidden", "true");
        indicator.textContent = "●";
        button.appendChild(indicator);
      }
      if (!label) {
        label = document.createElement("span");
        label.className = "composer-sync-label";
        label.textContent = tx(UI_TEXT.composer.sendingLabel);
        button.appendChild(label);
      }
      button.classList.add("is-syncing");
      button.setAttribute("aria-busy", "true");
      button.disabled = true;
      return;
    }

    if (indicator) {
      indicator.remove();
    }
    if (label) {
      label.remove();
    }
    button.classList.remove("is-syncing");
    button.removeAttribute("aria-busy");
    button.disabled = false;
  }

  function initLanguageToggle() {
    document.documentElement.lang = currentLang;
    document.documentElement.dir = currentLang === "ar" ? "rtl" : "ltr";

    if (window.location.pathname.indexOf("public-profile.html") !== -1) {
      document.title = tx(UI_TEXT.pageTitles.public);
    }
    if (window.location.pathname.indexOf("private-profile.html") !== -1) {
      document.title = tx(UI_TEXT.pageTitles.private);
    }

    const toggleButtons = Array.from(document.querySelectorAll("[data-lang-toggle]"));
    if (!toggleButtons.length) return;

    const nextLang = currentLang === "ar" ? "en" : "ar";
    const nextLabel = nextLang.toUpperCase();
    const hint = nextLang === "en" ? tx(UI_TEXT.language.switchToEnglish) : tx(UI_TEXT.language.switchToArabic);

    toggleButtons.forEach(function (button) {
      button.textContent = nextLabel;
      button.setAttribute("aria-label", hint);
      button.setAttribute("title", hint);
      button.addEventListener("click", function () {
        localStorage.setItem(STORAGE_LANG_KEY, nextLang);
        window.location.reload();
      });
    });
  }

  function initStaticLocalization() {
    const localizedTextNodes = Array.from(document.querySelectorAll("[data-i18n-ar][data-i18n-en]"));
    localizedTextNodes.forEach(function (node) {
      node.textContent = currentLang === "ar" ? node.getAttribute("data-i18n-ar") : node.getAttribute("data-i18n-en");
    });

    const localizedPlaceholders = Array.from(document.querySelectorAll("[data-i18n-placeholder-ar][data-i18n-placeholder-en]"));
    localizedPlaceholders.forEach(function (node) {
      const value = currentLang === "ar" ? node.getAttribute("data-i18n-placeholder-ar") : node.getAttribute("data-i18n-placeholder-en");
      node.setAttribute("placeholder", value || "");
    });

    const localizedAria = Array.from(document.querySelectorAll("[data-i18n-aria-ar][data-i18n-aria-en]"));
    localizedAria.forEach(function (node) {
      const value = currentLang === "ar" ? node.getAttribute("data-i18n-aria-ar") : node.getAttribute("data-i18n-aria-en");
      node.setAttribute("aria-label", value || "");
    });
  }

  function updateStoredPostMetric(postId, metricKey, nextValue) {
    if (!postId) return;
    const posts = getStoredPosts();
    let changed = false;
    const updated = posts.map(function (post) {
      if (String(post.id) !== String(postId)) return post;
      changed = true;
      return Object.assign({}, post, { [metricKey]: Math.max(0, Number(nextValue) || 0) });
    });
    if (changed) {
      setStoredPosts(updated);
    }
  }

  async function updatePostMetricInSupabase(postId, metricKey, nextValue) {
    if (postId == null || String(postId).trim() === "") return false;
    const normalizedId = String(postId).trim();
    const isNumericId = /^\d+$/.test(normalizedId);
    const isUuidId = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(normalizedId);
    if (!isNumericId && !isUuidId) return false;

    const client = await ensureSupabaseClient();
    if (!client) return false;

    const dbFieldMap = {
      likes: "like_count",
      comments: "comment_count",
      shares: "share_count"
    };

    const dbField = dbFieldMap[metricKey];
    if (!dbField) return false;

    const payload = {};
    payload[dbField] = Math.max(0, Number(nextValue) || 0);
    const { error } = await client.from("feed_posts").update(payload).eq("id", postId);
    return !error;
  }

  function bindPostInteractions(container, options) {
    if (!container) return;

    const commentsSheet = options && options.commentsSheet ? options.commentsSheet : null;
    const onMetricPersist = options && options.onMetricPersist ? options.onMetricPersist : null;
    const saveActionLabel = tx(UI_TEXT.postActions.save);

    container.addEventListener("click", function (event) {
      const target = event.target;
      const likeButton = target.closest(".like-btn");
      const commentButton = target.closest(".comment-btn");
      const shareButton = target.closest(".share-btn");
      const saveButton = target.closest(".save-btn");
      const postCard = target.closest(".post-card");
      const postId = postCard ? postCard.getAttribute("data-post-id") : "";

      if (postCard) {
        logAnalyticsEvent("post_view", {
          postId: postId,
          category: postCard.getAttribute("data-category") || "general"
        });
      }

      if (likeButton) {
        const liked = likeButton.getAttribute("data-liked") === "true";
        likeButton.setAttribute("data-liked", liked ? "false" : "true");
        likeButton.classList.toggle("like-active", !liked);

        const currentLikes = readMetricFromButton(likeButton);
        const nextLikes = liked ? Math.max(0, currentLikes - 1) : currentLikes + 1;
        writeMetricToButton(likeButton, nextLikes);

        if (onMetricPersist) {
          onMetricPersist({
            postId: postId,
            metricKey: "likes",
            nextValue: nextLikes,
            postCard: postCard,
            actionButton: likeButton
          });
        }
        logAnalyticsEvent("post_like", { postId: postId, liked: !liked });
        return;
      }

      if (commentButton) {
        const currentComments = readMetricFromButton(commentButton);
        const nextComments = currentComments + 1;
        writeMetricToButton(commentButton, nextComments);

        if (onMetricPersist) {
          onMetricPersist({
            postId: postId,
            metricKey: "comments",
            nextValue: nextComments,
            postCard: postCard,
            actionButton: commentButton
          });
        }

        logAnalyticsEvent("post_comment", { postId: postId });

        if (commentsSheet) {
          commentsSheet.classList.add("open");
          commentsSheet.setAttribute("aria-hidden", "false");
        }
        return;
      }

      if (shareButton) {
        const currentShares = readMetricFromButton(shareButton);
        const nextShares = currentShares + 1;
        writeMetricToButton(shareButton, nextShares);

        if (onMetricPersist) {
          onMetricPersist({
            postId: postId,
            metricKey: "shares",
            nextValue: nextShares,
            postCard: postCard,
            actionButton: shareButton
          });
        }

        logAnalyticsEvent("post_share", { postId: postId });
        const shareUrl = window.location.origin + window.location.pathname + "#post-" + encodeURIComponent(postId || "share");
        const shareText = (postCard && postCard.querySelector(".post-copy") ? postCard.querySelector(".post-copy").textContent.trim() : "") || shareUrl;
        if (navigator.share) {
          navigator.share({ title: document.title, text: shareText, url: shareUrl }).catch(function () {
            navigator.clipboard.writeText(shareUrl).catch(function () {});
          });
        } else {
          navigator.clipboard.writeText(shareUrl).catch(function () {});
        }
        showToast(currentLang === "en" ? "Share action prepared." : "تم تجهيز المشاركة.", "success");
        return;
      }

      if (saveButton) {
        const nextSaved = toggleSavedPost(postId);
        saveButton.setAttribute("data-saved", nextSaved ? "true" : "false");
        saveButton.textContent = nextSaved ? (currentLang === "en" ? "Saved" : "محفوظ") : saveActionLabel;
        logAnalyticsEvent("post_save", { postId: postId, saved: nextSaved });
        showToast(nextSaved ? (currentLang === "en" ? "Post saved." : "تم حفظ المنشور.") : (currentLang === "en" ? "Post removed from saved items." : "تمت إزالة المنشور من المحفوظات."), "info");
        return;
      }
    });
  }

  function initFeedInteractions() {
    const searchInput = document.getElementById("feed-search");
    const tabButtons = Array.from(document.querySelectorAll(".chip-tab"));
    const feedList = document.getElementById("feed-list");
    const commentsSheet = document.getElementById("comments-sheet");
    const closeComments = document.getElementById("close-comments");
    const composerButton = document.getElementById("open-composer");
    const composerModal = document.getElementById("composer-modal");
    const closeComposer = document.getElementById("close-composer");
    const composerForm = document.getElementById("composer-form");
    const composerText = document.getElementById("composer-text");
    const composerType = document.getElementById("composer-type");
    const composerAudience = document.getElementById("composer-audience");
    const composerStatus = document.getElementById("composer-status");
    const composerPublish = document.getElementById("composer-publish");
    const composerMediaUrl = document.getElementById("composer-media-url");
    const composerMediaPoster = document.getElementById("composer-media-poster");
    const composerMediaCaption = document.getElementById("composer-media-caption");
    const composerAssistantSummary = document.getElementById("composer-assistant-summary");
    const composerAssistantTags = document.getElementById("composer-assistant-tags");
    const composerAssistantBadge = document.getElementById("composer-assistant-badge");
    const feedEmpty = document.getElementById("feed-empty");
    const feedLoadMore = document.getElementById("feed-load-more");
    const feedDbStatus = document.getElementById("feed-db-status");
    const mainCreateButton = document.querySelector(".nav-main");
    const feedSkeleton = document.getElementById("feed-skeleton");
    const storiesList = document.getElementById("stories-list");
    const storiesArchiveToggle = document.getElementById("stories-archive-toggle");
    const storyViewer = document.getElementById("story-viewer");
    const storyViewerTitle = document.getElementById("story-viewer-title");
    const storyViewerMedia = document.getElementById("story-viewer-media");
    const storyViewerMeta = document.getElementById("story-viewer-meta");
    const storyViewerClose = document.getElementById("story-viewer-close");
    const storyViewerPrev = document.getElementById("story-viewer-prev");
    const storyViewerNext = document.getElementById("story-viewer-next");
    const storyViewerReply = document.getElementById("story-viewer-reply");
    let composerAssistantTimer = null;
    let composerAssistantRequestSeq = 0;

    if (!feedList) return;

    logPageView("feed");

    const feedState = {
      source: hasSupabaseRuntimeConfig() ? "db" : "local",
      lastVisiblePost: null,
      hasMore: true,
      loading: false
    };
    const storyState = {
      items: getStoredStories(),
      index: 0
    };

    const role = getCurrentRole();
    const createEnabledRoles = ["company_parts", "institution_parts", "shop", "maintenance_center"];
    const canCreate = createEnabledRoles.includes(role);

    if (!canCreate) {
      if (composerButton) composerButton.disabled = true;
      if (composerButton) composerButton.textContent = tx(UI_TEXT.composer.createRestricted);
      if (mainCreateButton) mainCreateButton.setAttribute("disabled", "disabled");
    }

    function setDbStatus(mode, message) {
      if (!feedDbStatus) return;
      feedDbStatus.classList.remove("db-online", "db-local", "db-loading");
      if (mode) {
        feedDbStatus.classList.add(mode);
      }
      feedDbStatus.textContent = message;
    }

    function renderComposerAssistantLocal() {
      if (!composerAssistantSummary || !composerAssistantTags || !composerAssistantBadge) return;
      const draft = {
        text: composerText ? composerText.value : "",
        type: composerType ? composerType.value : "all",
        audience: composerAudience ? composerAudience.value : "all",
        mediaUrl: composerMediaUrl ? composerMediaUrl.value : "",
        mediaPoster: composerMediaPoster ? composerMediaPoster.value : "",
        mediaCaption: composerMediaCaption ? composerMediaCaption.value : ""
      };
      const assistant = guessContentSignals(draft);
      composerAssistantBadge.textContent = assistant.category === "auto-parts" ? "Vision" : "Context";
      composerAssistantSummary.textContent = assistant.summary + " · " + assistant.tip + " · " + assistant.confidence;
      composerAssistantTags.innerHTML = assistant.tags.map(function (tag) {
        return '<span class="assistant-tag">' + escapeHtml(tag) + '</span>';
      }).join("");
      return { assistant: assistant, draft: draft };
    }

    function renderStories() {
      if (!storiesList) return;
      const activeStories = storyState.items.filter(function (story) {
        return story && story.expiresAt && Number(story.expiresAt) > Date.now();
      });
      storyState.items = activeStories;
      storiesList.innerHTML = activeStories.map(function (story, index) {
        return [
          '<button class="story-card" type="button" data-story-index="' + index + '">',
          '  <span class="story-ring"></span>',
          '  <span class="story-avatar">' + escapeHtml((story.author || "S").charAt(0).toUpperCase()) + '</span>',
          '  <strong>' + escapeHtml(story.author || "Story") + '</strong>',
          '  <small>' + escapeHtml(story.caption || "") + '</small>',
          '</button>'
        ].join("");
      }).join("");
      writeStoredStories(activeStories);
    }

    function openStory(index) {
      if (!storyViewer || !storyViewerMedia || !storyViewerTitle || !storyViewerMeta) return;
      const story = storyState.items[index];
      if (!story) return;
      storyState.index = index;
      storyViewer.classList.add("open");
      storyViewer.setAttribute("aria-hidden", "false");
      storyViewerTitle.textContent = story.author || "Story";
      storyViewerMedia.innerHTML = story.type === "video"
        ? '<div class="story-media story-video">' + escapeHtml(story.caption || "Video story") + '</div>'
        : '<div class="story-media story-image">' + escapeHtml(story.caption || "Image story") + '</div>';
      storyViewerMeta.textContent = "@" + (story.handle || "story") + " • " + (story.caption || "");
    }

    function closeStoryViewer() {
      if (!storyViewer) return;
      storyViewer.classList.remove("open");
      storyViewer.setAttribute("aria-hidden", "true");
    }

    function applyAssistantResult(assistant, sourceLabel) {
      if (!assistant || !composerAssistantSummary || !composerAssistantTags || !composerAssistantBadge) return;
      composerAssistantBadge.textContent = sourceLabel;
      composerAssistantSummary.textContent = assistant.summary + " · " + assistant.tip + " · " + assistant.confidence;
      composerAssistantTags.innerHTML = assistant.tags.map(function (tag) {
        return '<span class="assistant-tag">' + escapeHtml(tag) + '</span>';
      }).join("");
    }


    async function renderComposerAssistant(options) {
      const mode = options || {};
      const localResult = renderComposerAssistantLocal();
      if (!localResult || !localResult.assistant) return null;
      if (mode.ai === false) return localResult.assistant;

      const requestId = ++composerAssistantRequestSeq;
      const remoteAssistant = await requestAssistantFromApi(localResult.draft, localResult.assistant);
      if (requestId !== composerAssistantRequestSeq) {
        return localResult.assistant;
      }
      if (remoteAssistant) {
        const source = remoteAssistant.source === "vision-api" ? "AI Vision" : "AI";
        applyAssistantResult(remoteAssistant, source);
        return remoteAssistant;
      }

      return localResult.assistant;
    }

    function updateComposerAssistantDebounced() {
      if (composerAssistantTimer) {
        window.clearTimeout(composerAssistantTimer);
      }
      composerAssistantTimer = window.setTimeout(function () {
        renderComposerAssistant();
      }, AI_REQUEST_DEBOUNCE_MS);
    }

    function updateFeedLoadMoreState() {
      if (!feedLoadMore) return;
      const hasRenderablePosts = Array.from(feedList.querySelectorAll(".post-card")).length > 0;
      if (!hasRenderablePosts || !feedState.hasMore) {
        feedLoadMore.hidden = !feedState.hasMore || !hasRenderablePosts;
        feedLoadMore.disabled = feedState.loading;
        feedLoadMore.textContent = feedState.hasMore ? tx(UI_TEXT.feedPaging.loadMore) : tx(UI_TEXT.feedPaging.noMore);
        return;
      }

      feedLoadMore.hidden = false;
      feedLoadMore.disabled = feedState.loading;
      feedLoadMore.textContent = feedState.loading ? tx(UI_TEXT.feedPaging.loadingMore) : tx(UI_TEXT.feedPaging.loadMore);
    }

    function renderFeedPosts(posts, options) {
      const append = options && options.append;
      if (!Array.isArray(posts) || !posts.length) return;
      const html = posts.map(function (post) {
        return createPostHtml(post, { compact: false });
      }).join("");
      feedList.insertAdjacentHTML(append ? "beforeend" : "afterbegin", html);
    }

    async function loadFeedPage(options) {
      const append = Boolean(options && options.append);
      if (feedState.loading) return;

      feedState.loading = true;
      if (!append) {
        setSectionLoading(feedSkeleton, feedList, true);
      }
      updateFeedLoadMoreState();
      setDbStatus("db-loading", append ? tx(UI_TEXT.dbStatus.loadingFeed) : tx(UI_TEXT.dbStatus.loadingFeed));

      let nextPosts = [];
      let nextSource = feedState.source;

      if (feedState.source === "db") {
        const cursor = feedState.lastVisiblePost && feedState.lastVisiblePost.createdAt ? feedState.lastVisiblePost.createdAt : "";
        const dbPosts = await fetchPostsFromSupabase({ limit: FEED_PAGE_SIZE, before: cursor });
        if (dbPosts) {
          nextPosts = dbPosts;
          nextSource = "db";
          feedState.hasMore = dbPosts.length === FEED_PAGE_SIZE;
        } else {
          nextSource = "local";
          feedState.hasMore = true;
        }
      }

      if (nextSource === "local") {
        const localPosts = getStoredPostsPage(feedState.lastVisiblePost, FEED_PAGE_SIZE);
        nextPosts = localPosts;
        feedState.hasMore = localPosts.length === FEED_PAGE_SIZE;
      }

      if (!append && nextPosts.length) {
        feedList.innerHTML = "";
      }

      renderFeedPosts(nextPosts, { append: append });
      if (nextPosts.length) {
        feedState.lastVisiblePost = nextPosts[nextPosts.length - 1];
      } else if (!append) {
        feedState.lastVisiblePost = getLastRenderedPost(feedList);
        feedState.hasMore = false;
      }
      pruneRenderedFeedCards(feedList, FEED_DOM_WINDOW);
      feedState.source = nextSource;

      if (nextSource === "db" && feedState.hasMore) {
        setDbStatus("db-online", tx(UI_TEXT.dbStatus.connected));
      } else if (hasSupabaseRuntimeConfig()) {
        setDbStatus("db-local", tx(UI_TEXT.dbStatus.fallbackConnection));
      } else {
        setDbStatus("db-local", tx(UI_TEXT.dbStatus.fallbackConfigMissing));
      }

      feedState.loading = false;
      if (!append) {
        setSectionLoading(feedSkeleton, feedList, false);
      }
      applyFeedFilters();
      updateFeedLoadMoreState();
    }

    (async function hydrateFeed() {
      await loadFeedPage({ append: false });
    })();

    function persistMetricChange(payload) {
      if (!payload || !payload.metricKey) return;

      setPostSyncBadgeState(payload.postCard, "pending");
      setActionButtonSyncState(payload.actionButton, true);

      function finishAs(state) {
        setPostSyncBadgeState(payload.postCard, state);
        setActionButtonSyncState(payload.actionButton, false);
      }

      if (!payload.postId) {
        window.setTimeout(function () {
          finishAs("local");
        }, MIN_PENDING_BADGE_MS);
        return;
      }

      updateStoredPostMetric(payload.postId, payload.metricKey, payload.nextValue);
      const metricStartedAt = Date.now();
      updatePostMetricInSupabase(payload.postId, payload.metricKey, payload.nextValue).then(function (ok) {
        const elapsedMs = Date.now() - metricStartedAt;
        const finalize = function () {
          if (ok) {
            finishAs("db");
            setDbStatus("db-online", tx(UI_TEXT.dbStatus.connected));
          } else {
            finishAs("local");
            if (hasSupabaseRuntimeConfig()) {
              setDbStatus("db-local", tx(UI_TEXT.dbStatus.metricSavedLocal));
            }
          }
        };

        if (elapsedMs < MIN_PENDING_BADGE_MS) {
          window.setTimeout(finalize, MIN_PENDING_BADGE_MS - elapsedMs);
          return;
        }

        finalize();
      });
    }

    function activeFeedTab() {
      const active = document.querySelector(".chip-tab.active");
      return active ? active.getAttribute("data-tab") : "all";
    }

    function applyFeedFilters() {
      const posts = Array.from(document.querySelectorAll(".post-card"));
      const currentTab = activeFeedTab();
      const query = (searchInput && searchInput.value ? searchInput.value : "").trim().toLowerCase();
      let visibleCount = 0;

      logAnalyticsEvent("feed_filter", { tab: currentTab, queryLength: query.length });

      posts.forEach(function (post) {
        const postType = post.getAttribute("data-type") || "all";
        const audience = post.getAttribute("data-audience") || "all";
        const text = (post.getAttribute("data-text") || "").toLowerCase();

        const tabMatch =
          currentTab === "all" ||
          (currentTab === "followed" && audience === "followed") ||
          (currentTab === "video" && postType === "video") ||
          (currentTab === "images" && postType === "images");

        const queryMatch = !query || text.indexOf(query) !== -1;
        const visible = tabMatch && queryMatch;
        if (visible) visibleCount += 1;
        post.classList.toggle("hidden", !visible);
      });

      if (feedEmpty) {
        feedEmpty.hidden = visibleCount !== 0;
      }
    }

    tabButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        tabButtons.forEach(function (item) {
          item.classList.remove("active");
          item.setAttribute("aria-selected", "false");
        });
        button.classList.add("active");
        button.setAttribute("aria-selected", "true");
        logAnalyticsEvent("feed_tab_switch", { tab: button.getAttribute("data-tab") || "all" });
        applyFeedFilters();
      });
    });

    if (searchInput) {
      searchInput.addEventListener("input", function () {
        logAnalyticsEvent("feed_search", { queryLength: String(searchInput.value || "").trim().length });
        applyFeedFilters();
      });
    }

    [composerText, composerType, composerAudience, composerMediaUrl, composerMediaPoster, composerMediaCaption].forEach(function (node) {
      if (!node) return;
      node.addEventListener("input", updateComposerAssistantDebounced);
      node.addEventListener("change", updateComposerAssistantDebounced);
    });

    renderComposerAssistant();
    renderStories();

    if (feedLoadMore) {
      feedLoadMore.addEventListener("click", function () {
        if (feedState.loading || !feedState.hasMore) return;
        logAnalyticsEvent("feed_load_more", { source: feedState.source });
        loadFeedPage({ append: true });
      });
      updateFeedLoadMoreState();
    }

    if (storiesList) {
      storiesList.addEventListener("click", function (event) {
        const button = event.target.closest(".story-card");
        if (!button) return;
        openStory(Number(button.getAttribute("data-story-index") || 0));
        logAnalyticsEvent("story_open", { index: Number(button.getAttribute("data-story-index") || 0) });
      });
    }

    if (storiesArchiveToggle) {
      storiesArchiveToggle.addEventListener("click", function () {
        const archivedCount = Math.max(0, readStoredList(STORAGE_STORIES_KEY).length - storyState.items.length);
        setComposerStatus(composerStatus, currentLang === "en" ? (archivedCount ? archivedCount + " archived story items available." : "No archived stories yet.") : (archivedCount ? "هناك " + archivedCount + " قصة مؤرشفة." : "لا توجد قصص مؤرشفة بعد."));
        showToast(currentLang === "en" ? "Stories archive checked." : "تم فحص أرشيف القصص.", "info");
      });
    }

    if (storyViewerClose) storyViewerClose.addEventListener("click", closeStoryViewer);
    if (storyViewer) {
      storyViewer.addEventListener("click", function (event) {
        if (event.target === storyViewer) closeStoryViewer();
      });
    }
    if (storyViewerPrev) {
      storyViewerPrev.addEventListener("click", function () {
        if (!storyState.items.length) return;
        const nextIndex = (storyState.index - 1 + storyState.items.length) % storyState.items.length;
        openStory(nextIndex);
      });
    }
    if (storyViewerNext) {
      storyViewerNext.addEventListener("click", function () {
        if (!storyState.items.length) return;
        const nextIndex = (storyState.index + 1) % storyState.items.length;
        openStory(nextIndex);
      });
    }
    if (storyViewerReply) {
      storyViewerReply.textContent = currentLang === "en" ? "Reply" : "رد";
      storyViewerReply.addEventListener("click", function () {
        if (!composerModal || !composerText) return;
        composerModal.classList.add("open");
        composerModal.setAttribute("aria-hidden", "false");
        composerText.value = "";
        composerText.focus();
        setComposerStatus(composerStatus, currentLang === "en" ? "Reply to story inside the composer." : "رد على القصة من خلال نافذة النشر.", "warning");
        showToast(currentLang === "en" ? "Reply composer opened." : "تم فتح نافذة الرد.", "warning");
      });
    }

    bindPostInteractions(feedList, {
      commentsSheet: commentsSheet,
      onMetricPersist: persistMetricChange
    });

    if (closeComments && commentsSheet) {
      closeComments.addEventListener("click", function () {
        commentsSheet.classList.remove("open");
        commentsSheet.setAttribute("aria-hidden", "true");
      });
    }

    if (commentsSheet) {
      commentsSheet.addEventListener("click", function (event) {
        if (event.target === commentsSheet) {
          commentsSheet.classList.remove("open");
          commentsSheet.setAttribute("aria-hidden", "true");
        }
      });
    }

    if (composerButton) {
      composerButton.addEventListener("click", function () {
        if (!canCreate || !composerModal) return;
        composerModal.classList.add("open");
        composerModal.setAttribute("aria-hidden", "false");
        if (composerText) composerText.focus();
        logAnalyticsEvent("composer_open", { source: "feed" });
        renderComposerAssistant();
      });
    }

    if (mainCreateButton) {
      mainCreateButton.addEventListener("click", function () {
        if (!canCreate || !composerModal) return;
        composerModal.classList.add("open");
        composerModal.setAttribute("aria-hidden", "false");
        logAnalyticsEvent("composer_open", { source: "bottom-nav" });
        renderComposerAssistant();
      });
    }

    if (closeComposer && composerModal) {
      closeComposer.addEventListener("click", function () {
        composerModal.classList.remove("open");
        composerModal.setAttribute("aria-hidden", "true");
      });
    }

    if (composerModal) {
      composerModal.addEventListener("click", function (event) {
        if (event.target === composerModal) {
          composerModal.classList.remove("open");
          composerModal.setAttribute("aria-hidden", "true");
        }
      });
    }

    if (composerForm) {
      composerForm.addEventListener("submit", async function (event) {
        event.preventDefault();
        if (!composerText || !composerType || !composerAudience || !composerStatus) return;

        const sanitizedText = sanitizeComposerText(composerText.value);
        if (sanitizedText.blocked) {
          setComposerStatus(composerStatus, tx(UI_TEXT.composer.unsafePostBlocked), "error");
          return;
        }

        const text = sanitizedText.text;
        if (!text) {
          setComposerStatus(composerStatus, tx(UI_TEXT.composer.emptyPost), "error");
          return;
        }

        const userSnapshot = JSON.parse(localStorage.getItem(STORAGE_USER_KEY) || "null");
        const displayName = userSnapshot && userSnapshot.displayName ? userSnapshot.displayName : "AutoParts User";
        const handle = userSnapshot && userSnapshot.handle ? userSnapshot.handle : "autoparts.user";

        const draftPost = {
          id: "local-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
          text: text,
          type: composerType.value || "all",
          audience: composerAudience.value || "all",
          author: displayName,
          handle: handle,
          mediaUrl: composerMediaUrl ? sanitizeExternalUrl(composerMediaUrl.value) : "",
          mediaPoster: composerMediaPoster ? sanitizeExternalUrl(composerMediaPoster.value) : "",
          mediaCaption: composerMediaCaption ? String(composerMediaCaption.value || "").trim() : "",
          category: "general",
          tags: ["#AutoParts"],
          likes: 0,
          comments: 0,
          shares: 0,
          createdAt: new Date().toISOString(),
          syncState: "pending"
        };

        setComposerStatus(
          composerStatus,
          sanitizedText.changed
            ? tx(UI_TEXT.composer.publishingStatus) + " " + tx(UI_TEXT.composer.normalizedPost)
            : tx(UI_TEXT.composer.publishingStatus),
          sanitizedText.changed ? "warning" : ""
        );
        setComposerPublishState(composerPublish, true);
        const assistantResult = await renderComposerAssistant({ ai: true });
        if (assistantResult) {
          draftPost.category = assistantResult.category || "general";
          draftPost.tags = normalizeAssistantTags(assistantResult.tags, ["#AutoParts"]);
        }

        logAnalyticsEvent("post_publish_start", { category: draftPost.category, type: draftPost.type });

        try {

          feedList.insertAdjacentHTML("afterbegin", createPostHtml(draftPost, { compact: false }));
          const posts = getStoredPosts();
          posts.unshift(draftPost);
          setStoredPosts(posts.slice(0, 60));
          if (feedState.lastVisiblePost == null) {
            feedState.lastVisiblePost = draftPost;
          }
          pruneRenderedFeedCards(feedList, FEED_DOM_WINDOW);
          applyFeedFilters();

          const startedAt = Date.now();
          const insertedDbPost = await insertPostToSupabase(draftPost);
          const elapsedMs = Date.now() - startedAt;
          if (elapsedMs < MIN_PENDING_BADGE_MS) {
            await new Promise(function (resolve) {
              window.setTimeout(resolve, MIN_PENDING_BADGE_MS - elapsedMs);
            });
          }

          const finalPost = insertedDbPost
            ? insertedDbPost
            : Object.assign({}, draftPost, { syncState: "local" });

          const pendingSelector = '.post-card[data-post-id="' + draftPost.id + '"]';
          const pendingNode = feedList.querySelector(pendingSelector);
          if (pendingNode) {
            pendingNode.outerHTML = createPostHtml(finalPost, { compact: false });
          }

          replaceStoredPostById(draftPost.id, finalPost);
          pruneRenderedFeedCards(feedList, FEED_DOM_WINDOW);

          if (insertedDbPost) {
            setDbStatus("db-online", tx(UI_TEXT.dbStatus.connected));
          } else {
            setDbStatus("db-local", tx(UI_TEXT.dbStatus.publishSavedLocal));
          }

          composerForm.reset();
          setComposerStatus(
            composerStatus,
            insertedDbPost
              ? tx(UI_TEXT.composer.publishSuccessDb)
              : tx(UI_TEXT.composer.publishSuccessLocal),
            ""
          );
          logAnalyticsEvent("post_publish", {
            id: finalPost.id,
            category: finalPost.category || draftPost.category,
            type: finalPost.type,
            source: insertedDbPost ? "db" : "local"
          });
          renderComposerAssistant();
          applyFeedFilters();

          if (composerModal) {
            window.setTimeout(function () {
              composerModal.classList.remove("open");
              composerModal.setAttribute("aria-hidden", "true");
              setComposerStatus(composerStatus, "", "");
            }, 700);
          }
        } finally {
          setComposerPublishState(composerPublish, false);
        }
      });
    }

  }

  function initProfilePosts() {
    const postsList = document.getElementById("profile-posts-list");
    const postsSkeleton = document.getElementById("profile-posts-skeleton");
    const postsStatus = document.getElementById("profile-posts-status");
    const postsEmpty = document.getElementById("profile-posts-empty");
    const postsCountNode = document.getElementById("profile-posts-count");
    if (!postsList || !postsStatus || !postsEmpty) return;

    function setProfileStatus(mode, message) {
      postsStatus.classList.remove("db-online", "db-local", "db-loading");
      if (mode) {
        postsStatus.classList.add(mode);
      }
      postsStatus.textContent = message;
    }

    function persistProfileMetric(payload) {
      if (!payload || !payload.metricKey) return;
      setPostSyncBadgeState(payload.postCard, "pending");
      setActionButtonSyncState(payload.actionButton, true);

      function finishAs(state) {
        setPostSyncBadgeState(payload.postCard, state);
        setActionButtonSyncState(payload.actionButton, false);
      }

      if (!payload.postId) {
        window.setTimeout(function () {
          finishAs("local");
        }, MIN_PENDING_BADGE_MS);
        return;
      }

      updateStoredPostMetric(payload.postId, payload.metricKey, payload.nextValue);
      const metricStartedAt = Date.now();
      updatePostMetricInSupabase(payload.postId, payload.metricKey, payload.nextValue).then(function (ok) {
        const elapsedMs = Date.now() - metricStartedAt;
        const finalize = function () {
          if (ok) {
            finishAs("db");
            setProfileStatus("db-online", tx(UI_TEXT.dbStatus.connected));
          } else {
            finishAs("local");
            if (hasSupabaseRuntimeConfig()) {
              setProfileStatus("db-local", tx(UI_TEXT.dbStatus.metricSavedLocal));
            }

          }
        };

        if (elapsedMs < MIN_PENDING_BADGE_MS) {
          window.setTimeout(finalize, MIN_PENDING_BADGE_MS - elapsedMs);
          return;
        }

        finalize();
      });
    }

    bindPostInteractions(postsList, {
      onMetricPersist: persistProfileMetric
    });

    (async function hydrateProfilePosts() {
      setProfileStatus("db-loading", tx(UI_TEXT.dbStatus.loadingProfile));
      setSectionLoading(postsSkeleton, postsList, true);

      const dbPosts = await fetchPostsFromSupabase();
      const allPosts = dbPosts || getStoredPosts();
      const snapshot = readUserSnapshot();
      const preferredHandle = snapshot && snapshot.handle ? String(snapshot.handle).toLowerCase() : "";

      const profilePosts = allPosts.filter(function (post) {
        if (!preferredHandle) return true;
        return String(post.handle || "").toLowerCase() === preferredHandle;
      });

      if (postsCountNode) {
        postsCountNode.textContent = formatMetricCount(profilePosts.length);
      }

      postsList.innerHTML = "";
      profilePosts.forEach(function (post) {
        postsList.insertAdjacentHTML("beforeend", createPostHtml(post, { compact: true }));
      });

      postsEmpty.hidden = profilePosts.length !== 0;

      if (dbPosts) {
        setProfileStatus("db-online", tx(UI_TEXT.dbStatus.connected));
      } else if (hasSupabaseRuntimeConfig()) {
        setProfileStatus("db-local", tx(UI_TEXT.dbStatus.fallbackConnection));
      } else {
        setProfileStatus("db-local", tx(UI_TEXT.dbStatus.fallbackConfigMissing));
      }

      setSectionLoading(postsSkeleton, postsList, false);
    })();
  }

  function initProfileSnapshot() {
    const profileName = document.getElementById("profile-name");
    const profileHandle = document.getElementById("profile-handle");
    const profileBio = document.getElementById("profile-bio");
    const aboutAccountType = document.getElementById("about-account-type");
    if (!profileName || !profileHandle || !profileBio || !aboutAccountType) return;

    logPageView("profile");

    const snapshot = readUserSnapshot();

    const role = getCurrentRole();

    if (snapshot && snapshot.displayName) {
      profileName.textContent = snapshot.displayName;
      profileHandle.textContent = "@" + (snapshot.handle || "autoparts.user");
      profileBio.textContent = snapshot.bio || tx(UI_TEXT.profile.defaultBio);
    }

    aboutAccountType.textContent = tx(UI_TEXT.profile.accountTypePrefix) + tx(ROLE_LABELS[role] || ROLE_LABELS.company_parts);
  }

  async function renderAnalyticsInsights() {
    const summaryNode = document.getElementById("insights-summary");
    const metricsNode = document.getElementById("insights-metrics");
    const chartNode = document.getElementById("insights-chart");
    const highlightsNode = document.getElementById("insights-highlights");
    if (!summaryNode || !metricsNode || !chartNode || !highlightsNode) return;

    const localEvents = getAnalyticsWindow(ANALYTICS_WINDOW_DAYS);
    let mergedEvents = localEvents;
    const dbEvents = await fetchAnalyticsEventsFromSupabase(ANALYTICS_WINDOW_DAYS);
    if (Array.isArray(dbEvents) && dbEvents.length) {
      const byId = {};
      dbEvents.concat(localEvents).forEach(function (event) {
        if (!event || !event.id) return;
        byId[event.id] = event;
      });
      mergedEvents = Object.keys(byId).map(function (key) {
        return byId[key];
      }).sort(function (a, b) {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    }

    const insights = summarizeAnalytics(ANALYTICS_WINDOW_DAYS, mergedEvents);
    summaryNode.textContent = currentLang === "en"
      ? "Based on the last 28 days of platform events. Trend: " + insights.trendDirection + "."
      : "يتم الحساب من آخر 28 يومًا من أحداث المنصة. الاتجاه: " + insights.trendDirection + ".";

    const metrics = [
      { label: currentLang === "en" ? "Events" : "الأحداث", value: formatMetricCount(insights.totalEvents) },
      { label: currentLang === "en" ? "Published" : "المنشورات", value: formatMetricCount(insights.published) },
      { label: currentLang === "en" ? "Engagements" : "التفاعلات", value: formatMetricCount(insights.interactions) },
      { label: currentLang === "en" ? "Projected followers" : "المتابعون المتوقعون", value: formatMetricCount(insights.projectedFollowers) }
    ];

    metricsNode.innerHTML = metrics.map(function (metric) {
      return '<div class="insight-metric"><strong>' + metric.value + '</strong><span>' + metric.label + '</span></div>';
    }).join("");

    const maxCount = Math.max.apply(Math, insights.dailySeries.map(function (day) { return day.count; }).concat([1]));
    chartNode.innerHTML = insights.dailySeries.map(function (day) {
      const height = Math.max(12, Math.round((day.count / maxCount) * 100));
      return '<div class="insight-bar" style="height:' + height + '%"><span>' + escapeHtml(String(day.count)) + '</span><small>' + escapeHtml(String(day.date).slice(5)) + '</small></div>';
    }).join("") || '<div class="insight-empty">' + (currentLang === "en" ? "No activity yet" : "لا توجد نشاطات بعد") + '</div>';

    const highlights = [
      currentLang === "en" ? "Peak hour: " + insights.peakHourLabel : "ساعة الذروة: " + insights.peakHourLabel,
      currentLang === "en" ? "Next action: " + insights.nextAction : "الخطوة التالية: " + insights.nextAction,
      currentLang === "en" ? "Trend: " + insights.trendDirection : "الاتجاه: " + insights.trendDirection
    ];

    highlightsNode.innerHTML = highlights.map(function (item) {
      return '<li>' + escapeHtml(item) + '</li>';
    }).join("");
  }

  function initAdManager() {
    const form = document.getElementById("ad-manager-form");
    const status = document.getElementById("ad-manager-status");
    const preview = document.getElementById("ad-manager-preview");
    if (!form || !status || !preview) return;

    if (form.dataset.bound === "true") {
      return;
    }
    form.dataset.bound = "true";

    const locationInput = document.getElementById("ad-location");
    const ageInput = document.getElementById("ad-age");
    const interestsInput = document.getElementById("ad-interests");
    const budgetInput = document.getElementById("ad-budget");
    const startInput = document.getElementById("ad-start");
    const endInput = document.getElementById("ad-end");

    const settings = readAdCampaignSettings();
    if (locationInput) locationInput.value = settings.location || "";
    if (ageInput) ageInput.value = settings.age || "";
    if (interestsInput) interestsInput.value = settings.interests || "";
    if (budgetInput) budgetInput.value = settings.budget || "";
    if (startInput) startInput.value = settings.start || "";
    if (endInput) endInput.value = settings.end || "";

    function updatePreview() {
      preview.innerHTML = [
        '<strong>' + (currentLang === "en" ? "Campaign preview" : "معاينة الحملة") + '</strong>',
        '<div>' + escapeHtml((currentLang === "en" ? "Location: " : "الموقع: ") + String(locationInput && locationInput.value || "-")) + '</div>',
        '<div>' + escapeHtml((currentLang === "en" ? "Age: " : "العمر: ") + String(ageInput && ageInput.value || "-")) + '</div>',
        '<div>' + escapeHtml((currentLang === "en" ? "Interests: " : "الاهتمامات: ") + String(interestsInput && interestsInput.value || "-")) + '</div>',
        '<div>' + escapeHtml((currentLang === "en" ? "Budget: " : "الميزانية: ") + String(budgetInput && budgetInput.value || "-")) + '</div>',
        '<div>' + escapeHtml((currentLang === "en" ? "Schedule: " : "الجدولة: ") + String(startInput && startInput.value || "-") + " → " + String(endInput && endInput.value || "-")) + '</div>'
      ].join("");
    }

    [locationInput, ageInput, interestsInput, budgetInput, startInput, endInput].forEach(function (node) {
      if (!node) return;
      node.addEventListener("input", updatePreview);
      node.addEventListener("change", updatePreview);
    });

    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      const nextSettings = {
        location: String(locationInput && locationInput.value || "").trim(),
        age: String(ageInput && ageInput.value || "").trim(),
        interests: String(interestsInput && interestsInput.value || "").trim(),
        budget: String(budgetInput && budgetInput.value || "").trim(),
        start: String(startInput && startInput.value || "").trim(),
        end: String(endInput && endInput.value || "").trim()
      };
      writeAdCampaignSettings(nextSettings);
      const synced = await upsertAdCampaignToSupabase(nextSettings);
      status.textContent = synced
        ? (currentLang === "en" ? "Campaign settings saved to database." : "تم حفظ إعدادات الحملة في قاعدة البيانات.")
        : (currentLang === "en" ? "Campaign settings saved locally." : "تم حفظ إعدادات الحملة محليًا.");
      showToast(synced ? (currentLang === "en" ? "Campaign synced." : "تمت مزامنة الحملة.") : (currentLang === "en" ? "Campaign saved locally." : "تم حفظ الحملة محليًا."), synced ? "success" : "info");
      logAnalyticsEvent("ad_campaign_save", nextSettings);
      updatePreview();
    });

    updatePreview();

    fetchAdCampaignFromSupabase().then(function (remoteSettings) {
      if (!remoteSettings) return;
      if (locationInput) locationInput.value = remoteSettings.location || locationInput.value;
      if (ageInput) ageInput.value = remoteSettings.age || ageInput.value;
      if (interestsInput) interestsInput.value = remoteSettings.interests || interestsInput.value;
      if (budgetInput) budgetInput.value = remoteSettings.budget || budgetInput.value;
      if (startInput) startInput.value = remoteSettings.start || startInput.value;
      if (endInput) endInput.value = remoteSettings.end || endInput.value;
      writeAdCampaignSettings({
        location: String(locationInput && locationInput.value || ""),
        age: String(ageInput && ageInput.value || ""),
        interests: String(interestsInput && interestsInput.value || ""),
        budget: String(budgetInput && budgetInput.value || ""),
        start: String(startInput && startInput.value || ""),
        end: String(endInput && endInput.value || "")
      });
      updatePreview();
    }).catch(function () {
      return null;
    });
  }

  function initInAppBrowserLinks() {
    if (document.body && document.body.dataset.inappBrowserBound === "true") return;
    if (document.body) {
      document.body.dataset.inappBrowserBound = "true";
    }

    document.addEventListener("click", function (event) {
      const anchor = event.target && event.target.closest ? event.target.closest('a[href]') : null;
      if (!anchor) return;

      const href = anchor.getAttribute("href") || "";
      if (!/^https?:\/\//i.test(href) && !anchor.hasAttribute("data-inapp-link")) return;

      event.preventDefault();
      const title = anchor.textContent ? anchor.textContent.trim() : (currentLang === "en" ? "External page" : "صفحة خارجية");
      const opened = openInAppBrowser(href, title);
      logAnalyticsEvent("external_open", { href: href, opened: opened });
      if (!opened) {
        window.open(href, "_blank", "noopener,noreferrer");
      }
    });
  }

  function initPageRail() {
    const rails = Array.from(document.querySelectorAll("[data-page-rail]"));
    if (!rails.length) return;

    const currentPath = window.location.pathname.split("/").pop() || "index.html";
    const currentTarget = currentPath === "" || currentPath === "/" ? "index" : currentPath.replace(/\.html$/i, "");

    rails.forEach(function (rail) {
      const links = Array.from(rail.querySelectorAll(".page-rail-link"));
      links.forEach(function (link) {
        const target = link.getAttribute("data-page-target") || "";
        const isCurrent = target === currentTarget;
        link.classList.toggle("active", isCurrent);
        if (isCurrent) {
          link.setAttribute("aria-current", "page");
        } else {
          link.removeAttribute("aria-current");
        }
      });
    });
  }

  function initProfileTabs() {
    const tabs = Array.from(document.querySelectorAll(".profile-tab"));
    const panels = Array.from(document.querySelectorAll(".tab-panel"));
    if (!tabs.length || !panels.length) return;

    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        const key = tab.getAttribute("data-profile-tab");
        tabs.forEach(function (item) {
          item.classList.remove("active");
          item.setAttribute("aria-selected", "false");
        });
        tab.classList.add("active");
        tab.setAttribute("aria-selected", "true");
          logAnalyticsEvent("profile_tab_switch", { tab: key || "posts" });

        panels.forEach(function (panel) {
          panel.classList.toggle("active", panel.getAttribute("data-panel") === key);
        });

          if (key === "insights") {
            renderAnalyticsInsights();
          }
          if (key === "ads") {
            initAdManager();
          }
      });
    });

    renderAnalyticsInsights();
  }

  function initProfileMenuSheet() {
    const toggle = document.getElementById("profile-menu-toggle");
    const sheet = document.getElementById("profile-menu-sheet");
    const close = document.getElementById("profile-menu-close");
    if (!toggle || !sheet || !close) return;

    function openSheet() {
      sheet.classList.add("open");
      sheet.setAttribute("aria-hidden", "false");
    }

    function closeSheet() {
      sheet.classList.remove("open");
      sheet.setAttribute("aria-hidden", "true");
    }

    toggle.addEventListener("click", openSheet);
    close.addEventListener("click", closeSheet);
    sheet.addEventListener("click", function (event) {
      if (event.target === sheet) {
        closeSheet();
      }
    });
  }

  initLanguageToggle();
  initStaticLocalization();
  initFeedInteractions();
  initProfileSnapshot();
  initProfilePosts();
  initProfileTabs();
  initProfileMenuSheet();
  initAdManager();
  initInAppBrowserLinks();
  initPageRail();
})();
