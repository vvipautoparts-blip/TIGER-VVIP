import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(status: number, payload: Record<string, unknown>) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Generate a cryptographically secure token
async function generateSecureToken(): Promise<string> {
  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);
  return Array.from(randomBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Send via Mailgun (primary)
async function sendViaMailgun(
  to: string,
  fromEmail: string,
  fromName: string,
  subject: string,
  htmlBody: string
): Promise<boolean> {
  const apiKey = Deno.env.get("MAILGUN_API_KEY");
  const domain = Deno.env.get("MAILGUN_DOMAIN");

  if (!apiKey || !domain) {
    console.warn("Mailgun not configured, skipping...");
    return false;
  }

  const formData = new FormData();
  formData.append("from", `${fromName} <${fromEmail}>`);
  formData.append("to", to);
  formData.append("subject", subject);
  formData.append("html", htmlBody);

  // Mailgun uses EU or US endpoint based on region
  const region = Deno.env.get("MAILGUN_REGION") || "us";
  const endpoint =
    region === "eu"
      ? `https://api.eu.mailgun.net/v3/${domain}/messages`
      : `https://api.mailgun.net/v3/${domain}/messages`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa("api:" + apiKey)}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("Mailgun error:", response.status, text);
    return false;
  }

  console.log("Email sent via Mailgun ✓");
  return true;
}

// Send via AWS SES (fallback)
async function sendViaAwsSes(
  to: string,
  fromEmail: string,
  fromName: string,
  subject: string,
  htmlBody: string
): Promise<boolean> {
  const accessKey = Deno.env.get("AWS_ACCESS_KEY_ID");
  const secretKey = Deno.env.get("AWS_SECRET_ACCESS_KEY");
  const region = Deno.env.get("AWS_SES_REGION") || "us-east-1";

  if (!accessKey || !secretKey) {
    console.warn("AWS SES not configured, skipping...");
    return false;
  }

  // AWS SES uses SigV4 signing - implement signing
  const service = "ses";
  const host = `email.${region}.amazonaws.com`;
  const endpoint = `https://${host}/`;

  const now = new Date();
  const amzDate = now
    .toISOString()
    .replace(/[:-]|\.\d{3}/g, "")
    .slice(0, 15) + "Z";
  const dateStamp = amzDate.slice(0, 8);

  const body = new URLSearchParams({
    Action: "SendEmail",
    Source: `${fromName} <${fromEmail}>`,
    "Destination.ToAddresses.member.1": to,
    "Message.Subject.Data": subject,
    "Message.Subject.Charset": "UTF-8",
    "Message.Body.Html.Data": htmlBody,
    "Message.Body.Html.Charset": "UTF-8",
  }).toString();

  // Create canonical request
  const payloadHash = await hashSHA256(body);
  const canonicalHeaders = `content-type:application/x-www-form-urlencoded\nhost:${host}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = "content-type;host;x-amz-date";
  const canonicalRequest = [
    "POST",
    "/",
    "",
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  // Create string to sign
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    await hashSHA256(canonicalRequest),
  ].join("\n");

  // Calculate signature
  const signingKey = await getSigningKey(secretKey, dateStamp, region, service);
  const signature = await hmacHex(signingKey, stringToSign);

  const authorizationHeader =
    `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "X-Amz-Date": amzDate,
      Authorization: authorizationHeader,
    },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("AWS SES error:", response.status, text);
    return false;
  }

  console.log("Email sent via AWS SES ✓");
  return true;
}

// AWS SigV4 helpers
async function hashSHA256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hmacHex(key: CryptoKey, message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const sig = await crypto.subtle.sign("HMAC", key, msgBuffer);
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hmacKey(key: ArrayBuffer | CryptoKey, message: string): Promise<CryptoKey> {
  let rawKey: ArrayBuffer;
  if (key instanceof CryptoKey) {
    rawKey = await crypto.subtle.exportKey("raw", key);
  } else {
    rawKey = key;
  }
  return crypto.subtle.importKey(
    "raw",
    rawKey,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
}

async function getSigningKey(
  secretKey: string,
  dateStamp: string,
  region: string,
  service: string
): Promise<CryptoKey> {
  const kDate = await hmacKey(
    new TextEncoder().encode("AWS4" + secretKey).buffer as ArrayBuffer,
    dateStamp
  );
  const kRegion = await hmacKey(kDate, region);
  const kService = await hmacKey(kRegion, service);
  return hmacKey(kService, "aws4_request");
}

// Build verification email HTML
function buildEmailHtml(
  email: string,
  verifyUrl: string,
  lang: string
): string {
  const isAr = lang === "ar";
  const dir = isAr ? "rtl" : "ltr";
  const title = isAr ? "تفعيل حسابك في TIGER VVIP" : "Verify Your TIGER VVIP Account";
  const greeting = isAr ? "مرحباً،" : "Hello,";
  const body1 = isAr
    ? "شكراً لتسجيلك في منصة TIGER VVIP لقطع غيار السيارات الفاخرة. لإكمال التسجيل وتفعيل حسابك، يرجى النقر على الزر أدناه:"
    : "Thank you for registering on TIGER VVIP auto parts platform. To complete your registration and activate your account, please click the button below:";
  const btnText = isAr ? "تفعيل الحساب" : "Activate Account";
  const note = isAr
    ? "هذا الرابط صالح لمدة 24 ساعة فقط. إذا لم تطلب هذا، يمكنك تجاهل هذه الرسالة."
    : "This link is valid for 24 hours only. If you didn't request this, you can ignore this email.";
  const footer = isAr
    ? "فريق TIGER VVIP — منصة قطع الغيار الفاخرة"
    : "TIGER VVIP Team — Premium Auto Parts Platform";

  return `<!DOCTYPE html>
<html dir="${dir}" lang="${lang}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f0f2f5;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f2f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.1);max-width:100%;">
          
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%);padding:32px 40px;text-align:center;">
              <h1 style="color:#e2b96b;margin:0;font-size:28px;font-weight:800;letter-spacing:2px;">🐯 TIGER VVIP</h1>
              <p style="color:#a0b0c0;margin:8px 0 0;font-size:13px;">${isAr ? "قطع غيار فاخرة موثوقة" : "Premium Auto Parts"}</p>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding:40px;direction:${dir};">
              <h2 style="color:#1c1e21;margin:0 0 16px;font-size:22px;">${title}</h2>
              <p style="color:#444;line-height:1.7;margin:0 0 16px;">${greeting}</p>
              <p style="color:#444;line-height:1.7;margin:0 0 28px;">${body1}</p>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:8px 0 28px;">
                    <a href="${verifyUrl}"
                       style="display:inline-block;background:#1877f2;color:#ffffff;text-decoration:none;padding:16px 40px;border-radius:8px;font-weight:700;font-size:16px;letter-spacing:0.5px;">
                      ${btnText}
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Token link fallback -->
              <p style="color:#777;font-size:13px;margin:0 0 8px;">${isAr ? "إذا لم يعمل الزر، انسخ هذا الرابط في متصفحك:" : "If the button doesn't work, copy this link to your browser:"}</p>
              <p style="word-break:break-all;color:#1877f2;font-size:12px;margin:0 0 24px;">${verifyUrl}</p>
              
              <!-- Note -->
              <p style="color:#888;font-size:13px;border-top:1px solid #e4e6eb;padding-top:20px;margin:0;">${note}</p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background:#f7f8fa;padding:20px 40px;text-align:center;border-top:1px solid #e4e6eb;">
              <p style="color:#aaa;font-size:12px;margin:0;">${footer}</p>
              <p style="color:#ccc;font-size:11px;margin:4px 0 0;">${email}</p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseServiceKey) {
    return jsonResponse(500, { error: "Server configuration error." });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  let body: { email?: string; action?: string; token?: string; lang?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse(400, { error: "Invalid JSON body." });
  }

  const { email, action = "send", token, lang = "ar" } = body;

  // ============================================================
  // ACTION: send — إرسال بريد التحقق
  // ============================================================
  if (action === "send") {
    if (!email || typeof email !== "string") {
      return jsonResponse(400, { error: "Email is required." });
    }

    const emailLower = email.trim().toLowerCase();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(emailLower)) {
      return jsonResponse(400, { error: "Invalid email format." });
    }

    // حذف التوكنات القديمة لنفس الإيميل
    await supabase
      .from("email_verifications")
      .delete()
      .eq("email", emailLower)
      .lt("expires_at", new Date().toISOString());

    // إنشاء توكن جديد
    const verifyToken = await generateSecureToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

    const { error: insertError } = await supabase
      .from("email_verifications")
      .insert({
        email: emailLower,
        token: verifyToken,
        expires_at: expiresAt,
        verified_at: null,
        ip_address: req.headers.get("x-forwarded-for") || null,
      });

    if (insertError) {
      console.error("Token insert error:", insertError);
      return jsonResponse(500, { error: "Failed to create verification token." });
    }

    // بناء رابط التحقق
    const appUrl = Deno.env.get("APP_URL") || supabaseUrl.replace(".supabase.co", "");
    const verifyUrl = `${appUrl}?verify_token=${verifyToken}&verify_email=${encodeURIComponent(emailLower)}#registration-page`;

    const fromEmail = Deno.env.get("EMAIL_FROM") || "noreply@tigervvip.com";
    const fromName = Deno.env.get("EMAIL_FROM_NAME") || "TIGER VVIP";
    const subject = lang === "ar"
      ? "تفعيل حسابك في TIGER VVIP"
      : "Verify Your TIGER VVIP Account";

    const htmlBody = buildEmailHtml(emailLower, verifyUrl, lang);

    // محاولة الإرسال عبر Mailgun أولاً
    let sent = await sendViaMailgun(emailLower, fromEmail, fromName, subject, htmlBody);

    // fallback إلى AWS SES
    if (!sent) {
      console.log("Mailgun failed, trying AWS SES...");
      sent = await sendViaAwsSes(emailLower, fromEmail, fromName, subject, htmlBody);
    }

    if (!sent) {
      // حذف التوكن إذا فشل الإرسال
      await supabase
        .from("email_verifications")
        .delete()
        .eq("email", emailLower)
        .eq("token", verifyToken);

      return jsonResponse(503, {
        error: "Email delivery failed. Please try again or contact support.",
      });
    }

    return jsonResponse(200, {
      success: true,
      message: "Verification email sent successfully.",
    });
  }

  // ============================================================
  // ACTION: verify — التحقق من التوكن
  // ============================================================
  if (action === "verify") {
    if (!token || !email) {
      return jsonResponse(400, { error: "Token and email are required." });
    }

    const emailLower = email.trim().toLowerCase();

    const { data: record, error: fetchError } = await supabase
      .from("email_verifications")
      .select("*")
      .eq("email", emailLower)
      .eq("token", token)
      .single();

    if (fetchError || !record) {
      return jsonResponse(400, {
        error: lang === "ar"
          ? "رابط التحقق غير صالح أو انتهت صلاحيته."
          : "Invalid or expired verification link.",
      });
    }

    if (record.verified_at) {
      // مسبقاً تم التحقق
      return jsonResponse(200, {
        success: true,
        alreadyVerified: true,
        message: lang === "ar" ? "البريد الإلكتروني محقق مسبقاً." : "Email already verified.",
      });
    }

    if (new Date(record.expires_at) < new Date()) {
      return jsonResponse(400, {
        error: lang === "ar"
          ? "انتهت صلاحية رابط التحقق (24 ساعة). يرجى طلب رابط جديد."
          : "Verification link expired (24 hours). Please request a new one.",
      });
    }

    // تأكيد التحقق
    const { error: updateError } = await supabase
      .from("email_verifications")
      .update({ verified_at: new Date().toISOString() })
      .eq("email", emailLower)
      .eq("token", token);

    if (updateError) {
      console.error("Verification update error:", updateError);
      return jsonResponse(500, { error: "Verification update failed." });
    }

    return jsonResponse(200, {
      success: true,
      verified: true,
      email: emailLower,
      message: lang === "ar"
        ? "تم تفعيل بريدك الإلكتروني بنجاح!"
        : "Your email has been verified successfully!",
    });
  }

  return jsonResponse(400, { error: "Unknown action." });
});
