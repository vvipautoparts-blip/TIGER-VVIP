// VVIP TIGER - Private Profile Loader
// Loads the real logged-in user's profile from Supabase.

(function () {
  function getSupabaseClient() {
    const possibleClients = [
      window.vvipSupabase,
      window.supabaseClient,
      window.supabaseAuthClient,
      window.SUPABASE_CLIENT,
      window.sbClient
    ];

    for (const client of possibleClients) {
      if (client && client.auth && client.from) {
        return client;
      }
    }

    console.error("VVIP TIGER: Supabase client was not found.");
    return null;
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function setText(selector, value) {
    document.querySelectorAll(selector).forEach((el) => {
      el.textContent = value || "";
    });
  }

  function setImage(selector, value, fallbackText) {
    document.querySelectorAll(selector).forEach((el) => {
      if (value) {
        el.src = value;
      } else {
        el.removeAttribute("src");
      }

      el.alt = fallbackText || "VVIP TIGER profile image";
    });
  }

  function numberText(value) {
    return Number(value || 0).toLocaleString("en-US");
  }

  function firstLetter(profile, user) {
    const source =
      profile.company_name ||
      profile.display_name ||
      profile.email ||
      user.email ||
      "V";

    return source.charAt(0).toUpperCase();
  }

  function ensureFallbackCard(profile, user) {
    const hasRealTargets =
      document.querySelector("[data-profile-company]") ||
      document.querySelector("[data-profile-display-name]") ||
      document.querySelector("[data-profile-bio]");

    if (hasRealTargets) return;

    let card = document.getElementById("vvip-live-profile-card");

    if (!card) {
      card = document.createElement("section");
      card.id = "vvip-live-profile-card";
      card.style.cssText = `
        margin: 18px auto;
        max-width: 920px;
        padding: 22px;
        border-radius: 24px;
        background: linear-gradient(135deg, rgba(18,18,18,.96), rgba(55,37,12,.96));
        color: #fff;
        border: 1px solid rgba(255, 204, 102, .35);
        box-shadow: 0 18px 45px rgba(0,0,0,.22);
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        direction: ltr;
      `;

      document.body.prepend(card);
    }

    const companyName = escapeHtml(profile.company_name || profile.display_name || user.email || "");
    const email = escapeHtml(profile.email || user.email || "");
    const bio = escapeHtml(profile.bio || "");
    const accountType = escapeHtml(profile.account_type || "VIP");
    const avatarLetter = escapeHtml(firstLetter(profile, user));

    const avatarHtml = profile.avatar_url
      ? `<img src="${escapeHtml(profile.avatar_url)}" alt="Profile" style="width:74px;height:74px;border-radius:50%;object-fit:cover;border:2px solid rgba(255,204,102,.7);">`
      : `<div style="width:74px;height:74px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:rgba(255,204,102,.14);border:2px solid rgba(255,204,102,.7);font-weight:800;font-size:26px;">${avatarLetter}</div>`;

    card.innerHTML = `
      <div style="display:flex;gap:18px;align-items:center;">
        ${avatarHtml}
        <div>
          <div style="font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:#ffd980;">
            VVIP TIGER LIVE PROFILE
          </div>
          <h2 style="margin:4px 0 2px;font-size:28px;">
            ${companyName}
          </h2>
          <div style="opacity:.82;">
            ${email}
          </div>
        </div>
      </div>

      <p style="margin:18px 0 0;line-height:1.7;opacity:.92;">
        ${bio}
      </p>

      <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:18px;">
        <span style="padding:8px 12px;border-radius:999px;background:rgba(255,204,102,.15);border:1px solid rgba(255,204,102,.25);">
          Account: ${accountType}
        </span>

        <span style="padding:8px 12px;border-radius:999px;background:rgba(255,255,255,.08);">
          Followers: ${numberText(profile.followers_count)}
        </span>

        <span style="padding:8px 12px;border-radius:999px;background:rgba(255,255,255,.08);">
          Following: ${numberText(profile.following_count)}
        </span>

        <span style="padding:8px 12px;border-radius:999px;background:rgba(255,255,255,.08);">
          Views: ${numberText(profile.profile_views)}
        </span>

        ${
          profile.is_verified
            ? `<span style="padding:8px 12px;border-radius:999px;background:rgba(45,180,110,.22);">Verified VIP</span>`
            : ""
        }
      </div>
    `;
  }

  async function loadPrivateProfile() {
    const supabase = getSupabaseClient();

    if (!supabase) {
      alert("Supabase client غير موجود. تأكد أن supabase-config.js يعمل قبل profile-loader.js");
      return;
    }

    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.warn("VVIP TIGER: No logged-in user found.", userError);
      window.location.href = "index.html";
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select(`
        id,
        email,
        display_name,
        company_name,
        username,
        avatar_url,
        bio,
        account_type,
        followers_count,
        following_count,
        profile_views,
        is_verified,
        created_at,
        updated_at
      `)
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("VVIP TIGER: Profile load error:", profileError);
      alert("حدث خطأ أثناء تحميل بيانات البروفايل من Supabase.");
      return;
    }

    if (!profile) {
      console.warn("VVIP TIGER: No profile row found for this user.");
      alert("لم يتم العثور على بروفايل لهذا المستخدم داخل جدول profiles.");
      return;
    }

    document.title = `${profile.company_name || profile.display_name || "Private Profile"} | VVIP TIGER`;

    setText("[data-profile-company]", profile.company_name || "");
    setText("[data-profile-display-name]", profile.display_name || "");
    setText("[data-profile-email]", profile.email || user.email || "");
    setText("[data-profile-username]", profile.username ? "@" + profile.username : "");
    setText("[data-profile-bio]", profile.bio || "");
    setText("[data-profile-account-type]", profile.account_type || "VIP");
    setText("[data-profile-followers]", numberText(profile.followers_count));
    setText("[data-profile-following]", numberText(profile.following_count));
    setText("[data-profile-views]", numberText(profile.profile_views));
    setText("[data-profile-verified]", profile.is_verified ? "Verified VIP" : "");

    setImage(
      "[data-profile-avatar]",
      profile.avatar_url,
      profile.company_name || profile.display_name || "VVIP TIGER Profile"
    );

    ensureFallbackCard(profile, user);

    console.log("VVIP TIGER: Private profile loaded successfully.", profile);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadPrivateProfile);
  } else {
    loadPrivateProfile();
  }
})();