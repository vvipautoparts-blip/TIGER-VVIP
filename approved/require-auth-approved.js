// VVIP TIGER - Require Supabase Auth Session

document.addEventListener("DOMContentLoaded", async function () {
  try {
    if (!window.vvipSupabase) {
      console.error("VVIP Supabase client not found");
      window.location.href = "index.html";
      return;
    }

    const { data, error } = await window.vvipSupabase.auth.getSession();

    if (error) {
      console.error("Session check error:", error.message);
      window.location.href = "index.html";
      return;
    }

    if (!data.session) {
      console.warn("No active session. Redirecting to login.");
      window.location.href = "index.html";
      return;
    }

    console.log("Private profile access allowed:", data.session.user.email);
  } catch (err) {
    console.error("Require auth failed:", err);
    window.location.href = "index.html";
  }
});
