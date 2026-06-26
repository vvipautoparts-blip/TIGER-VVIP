let __storedSupabaseUrl = "";
let __storedSupabaseAnonKey = "";

try {
	__storedSupabaseUrl = String(localStorage.getItem("TIGER_SUPABASE_URL") || "").trim();
	__storedSupabaseAnonKey = String(localStorage.getItem("TIGER_SUPABASE_ANON_KEY") || "").trim();
} catch (error) {
	console.warn("Local config: unable to read runtime Supabase config from localStorage.", error);
}

window.SUPABASE_URL = window.SUPABASE_URL || __storedSupabaseUrl || "https://zelcngyyvbomuzokvuxo.supabase.co";
window.SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || __storedSupabaseAnonKey || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InplbGNuZ3l5dmJvbXV6b2t2dXhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0MTEzNTMsImV4cCI6MjA5Nzk4NzM1M30.yW9zQ7fRqi9-jbOFbBiLtsWFuYTIExYO2Lul-mFgKkI";
window.WHATSAPP_OTP_ENDPOINT = window.WHATSAPP_OTP_ENDPOINT || "https://zelcngyyvbomuzokvuxo.functions.supabase.co/send-otp";

// ── Email Verification Config ──────────────────────────────────
// الطريقة 1: Mailgun (مجاني - 25,000 بريد/شهر)
// سجّل في https://mailgun.com ثم أضف مفاتيحك هنا
window.MAILGUN_API_KEY = window.MAILGUN_API_KEY || "";    // مثال: "key-xxxxxxxxxxxxxxxxxxxx"
window.MAILGUN_DOMAIN  = window.MAILGUN_DOMAIN  || "";    // مثال: "mg.yourdomain.com"
window.MAILGUN_REGION  = window.MAILGUN_REGION  || "us";  // "us" أو "eu"

// الطريقة 2: AWS SES (احتياطي - مجاني 62,000/شهر للسنة الأولى)
// سجّل في https://aws.amazon.com/ses ثم أضف مفاتيحك هنا
window.AWS_ACCESS_KEY_ID     = window.AWS_ACCESS_KEY_ID     || "";  // مثال: "AKIAIOSFODNN7EXAMPLE"
window.AWS_SECRET_ACCESS_KEY = window.AWS_SECRET_ACCESS_KEY || "";  // مفتاح السر
window.AWS_SES_REGION        = window.AWS_SES_REGION        || "us-east-1"; // أقرب منطقة

// عنوان المرسل (يجب أن يكون محققاً في Mailgun أو SES)
window.EMAIL_FROM      = window.EMAIL_FROM      || "noreply@yourdomain.com";
window.EMAIL_FROM_NAME = window.EMAIL_FROM_NAME || "TIGER VVIP";

// رابط تطبيقك (مهم لبناء رابط التحقق الصحيح)
// مثال: "https://yourdomain.com" أو رابط Supabase
window.APP_URL = window.APP_URL || window.location.origin;

const __isPlaceholderSupabase = window.SUPABASE_URL.includes("your-project") || window.SUPABASE_ANON_KEY === "your-anon-key";
const __configReadiness = {
	supabaseReady: !__isPlaceholderSupabase,
	whatsappOtpReady: Boolean(window.WHATSAPP_OTP_ENDPOINT),
	emailProviderReady: Boolean((window.MAILGUN_API_KEY && window.MAILGUN_DOMAIN) || (window.AWS_ACCESS_KEY_ID && window.AWS_SECRET_ACCESS_KEY)),
	appUrlReady: Boolean(window.APP_URL),
};

window.__LOCAL_CONFIG_READY__ = __configReadiness;

if (!__configReadiness.supabaseReady) {
	console.warn("Local config: Supabase URL/Anon Key are placeholders. Update supabase-local.js with real project values.");
}

if (!__configReadiness.whatsappOtpReady) {
	console.warn("Local config: WHATSAPP_OTP_ENDPOINT is empty. OTP over WhatsApp is disabled.");
}

console.log("✓ supabase-local.js loaded", window.__LOCAL_CONFIG_READY__);

window.setRuntimeSupabaseConfig = function setRuntimeSupabaseConfig(url, anonKey) {
	const normalizedUrl = String(url || "").trim();
	const normalizedAnonKey = String(anonKey || "").trim();

	if (!normalizedUrl || !normalizedAnonKey) {
		return { ok: false, message: "URL and anon key are required" };
	}

	try {
		localStorage.setItem("TIGER_SUPABASE_URL", normalizedUrl);
		localStorage.setItem("TIGER_SUPABASE_ANON_KEY", normalizedAnonKey);
		return { ok: true };
	} catch (error) {
		console.error("Failed to save runtime Supabase config", error);
		return { ok: false, message: "Failed to save config in browser storage" };
	}
};

window.clearRuntimeSupabaseConfig = function clearRuntimeSupabaseConfig() {
	try {
		localStorage.removeItem("TIGER_SUPABASE_URL");
		localStorage.removeItem("TIGER_SUPABASE_ANON_KEY");
		return { ok: true };
	} catch (error) {
		console.error("Failed to clear runtime Supabase config", error);
		return { ok: false, message: "Failed to clear config in browser storage" };
	}
};

