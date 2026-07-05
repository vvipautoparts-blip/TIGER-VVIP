// VVIP TIGER - Load private profile from Supabase public.profiles
(function () {
  "use strict";

  function getSupabaseClient() {
    if (window.vvipSupabase) return window.vvipSupabase;
    if (window.supabaseClient) return window.supabaseClient;
    if (window.VVIP_SUPABASE) return window.VVIP_SUPABASE;

    const supabaseUrl = window.SUPABASE_URL || window.VVIP_SUPABASE_URL;
    const publishableKey =
      window.SUPABASE_PUBLISHABLE_KEY ||
      window.SUPABASE_ANON_KEY ||
      window.VVIP_SUPABASE_ANON_KEY ||
      window.VVIP_SUPABASE_PUBLISHABLE_KEY;

    if (
      window.supabase &&
      typeof window.supabase.createClient === "function" &&
      supabaseUrl &&
      publishableKey
    ) {
      const client = window.supabase.createClient(supabaseUrl, publishableKey);
      window.vvipSupabase = client;
      window.supabaseClient = client;
      window.VVIP_SUPABASE = client;
      return client;
    }

    return null;
  }

  function clean(value) {
    return String(value || "").trim();
  }

  function emailLocalPart(email) {
    const value = clean(email);
    if (!value || !value.includes("@")) return "vvipautoparts";
    return value.split("@")[0] || "vvipautoparts";
  }

  function firstAvailable() {
    for (const value of arguments) {
      const cleaned = clean(value);
      if (cleaned) return cleaned;
    }
    return "";
  }

  function initialsFromLabel(label) {
    const value = clean(label).replace(/[^\p{L}\p{N}\s]/gu, " ").trim();
    if (!value) return "VP";

    const parts = value.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
  }

  function setText(id, value) {
    const node = document.getElementById(id);
    if (node) node.textContent = clean(value);
  }

  function setStatus(message) {
    setText("profile-posts-status", message);
  }

  function setAboutAccountType(value) {
    const node = document.getElementById("about-account-type");
    if (!node) return;

    const suffix = clean(value) || "VIP";
    const textNode = Array.from(node.childNodes).find(function (child) {
      return child.nodeType === Node.TEXT_NODE;
    });

    if (textNode) {
      textNode.nodeValue = " " + suffix;
      return;
    }

    node.appendChild(document.createTextNode(" " + suffix));
  }

  function applyAvatar(selector, source) {
    const node = document.querySelector(selector);
    if (!node) return;

    node.textContent = source.initials || "VP";

    if (source.imageUrl) {
      node.style.backgroundImage = "url('" + source.imageUrl.replace(/'/g, "%27") + "')";
      node.style.backgroundSize = "cover";
      node.style.backgroundPosition = "center";
      node.textContent = "";
    }
  }

  function buildSource(profile, user) {
    const metadata = (user && user.user_metadata) || {};
    const sessionEmail = clean(user && user.email);
    const profileEmail = clean(profile && profile.email);
    const email = profileEmail || sessionEmail;

    const displayName = firstAvailable(
      profile && profile.display_name,
      profile && profile.full_name,
      profile && profile.name,
      profile && profile.company_name,
      profile && profile.company,
      profile && profile.business_name,
      metadata.full_name,
      metadata.name,
      "VVIP Auto Parts"
    );

    const companyName = firstAvailable(
      profile && profile.company_name,
      profile && profile.company,
      profile && profile.business_name,
      displayName
    );

    const username = firstAvailable(
      profile && profile.username,
      profile && profile.handle,
      profile && profile.company_code,
      metadata.username,
      emailLocalPart(email)
    );

    const accountType = firstAvailable(
      profile && profile.account_type,
      profile && profile.account_category,
      profile && profile.role,
      metadata.account_type,
      "VIP"
    );

    const bio = firstAvailable(
      profile && profile.bio,
      profile && profile.business_description,
      profile && profile.specialization,
      metadata.bio,
      "VVIP Auto Parts"
    );

    const imageUrl = firstAvailable(
      profile && profile.avatar_url,
      profile && profile.image_url,
      profile && profile.photo_url,
      metadata.avatar_url,
      metadata.picture
    );

    return {
      email: email,
      displayName: displayName,
      companyName: companyName,
      username: username,
      accountType: accountType,
      bio: bio,
      imageUrl: imageUrl,
      initials: initialsFromLabel(displayName || companyName || username || email)
    };
  }

  function renderProfile(profile, user) {
    const source = buildSource(profile || {}, user || {});

    document.title = source.displayName + " - VVIP TIGER";

    setText("profile-name", source.displayName);
    setText("profile-handle", "@" + source.username);
    setText("profile-bio", source.bio);
    setText("profile-menu-account-name", source.displayName);
    setText("insights-summary", source.companyName + " · " + source.email);
    setText("profile-posts-status", "تم تحميل بيانات الملف الشخصي من public.profiles.");

    setAboutAccountType(source.accountType);

    applyAvatar(".hero-avatar-large", source);
    applyAvatar(".profile-menu-avatar", source);
  }

  async function loadProfile() {
    const client = getSupabaseClient();

    if (!client || !client.auth) {
      setStatus("تعذر تحميل Supabase. أعد تحميل الصفحة.");
      console.error("Supabase client is missing in profile-loader.js");
      return;
    }

    try {
      const sessionResult = await client.auth.getSession();
      const session = sessionResult && sessionResult.data ? sessionResult.data.session : null;

      if (!session || !session.user) {
        window.location.href = "index.html";
        return;
      }

      const user = session.user;

      const profileResult = await client
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (profileResult.error) {
        console.error("Profile load error:", profileResult.error);
        setStatus("تعذر تحميل بيانات public.profiles.");
        renderProfile({}, user);
        return;
      }

      renderProfile(profileResult.data || {}, user);
    } catch (error) {
      console.error("Profile loader failed:", error);
      setStatus("حدث خطأ أثناء تحميل بيانات الملف الشخصي.");
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadProfile);
  } else {
    loadProfile();
  }
})();
