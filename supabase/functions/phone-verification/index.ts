import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type OtpRequest = {
  phone?: string;
  code?: string;
  channel?: string;
};

function jsonResponse(status: number, payload: Record<string, unknown>) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function normalizePhone(phone: string) {
  return String(phone || "").replace(/[^\d]/g, "");
}

async function sendViaMetaWhatsApp(phone: string, code: string) {
  const accessToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
  const phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
  const templateName = Deno.env.get("WHATSAPP_TEMPLATE_NAME");
  const templateLang = Deno.env.get("WHATSAPP_TEMPLATE_LANG") || "ar";
  const includeCodeParam = (Deno.env.get("WHATSAPP_TEMPLATE_INCLUDE_CODE") || "true").toLowerCase() === "true";

  if (!accessToken || !phoneNumberId || !templateName) {
    throw new Error("Missing WhatsApp environment variables.");
  }

  const recipient = normalizePhone(phone);
  if (!recipient) {
    throw new Error("Invalid recipient phone.");
  }

  const endpoint = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;

  const templatePayload: Record<string, unknown> = {
    name: templateName,
    language: { code: templateLang },
  };

  if (includeCodeParam) {
    templatePayload.components = [
      {
        type: "body",
        parameters: [{ type: "text", text: code }],
      },
    ];
  }

  const payload = {
    messaging_product: "whatsapp",
    to: recipient,
    type: "template",
    template: templatePayload,
  };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const details = data?.error?.message || data?.message || JSON.stringify(data);
    throw new Error(`WhatsApp API error: ${details}`);
  }

  return data;
}

function sendViaInternalVerification(phone: string, code: string) {
  const recipient = normalizePhone(phone);

  if (!recipient) {
    throw new Error("Invalid recipient phone.");
  }

  return {
    accepted: true,
    mode: "internal",
    phone: recipient,
    codeLength: code.length,
    deliveredExternally: false,
  };
}

serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse(405, {
      success: false,
      message: "Method not allowed",
    });
  }

  try {
    const body = (await request.json()) as OtpRequest;
    const phone = normalizePhone(body.phone || "");
    const code = String(body.code || "").trim();
    const channel = String(body.channel || "").trim().toLowerCase();

    if (!phone || !code) {
      return jsonResponse(400, {
        success: false,
        message: "Invalid payload. Expected phone and code.",
      });
    }

    const provider = (Deno.env.get("WHATSAPP_PROVIDER") || "internal").toLowerCase();
    let providerResponse: unknown;

    if (provider === "meta") {
      if (channel && channel !== "whatsapp") {
        return jsonResponse(400, {
          success: false,
          message: "Meta delivery requires channel=whatsapp.",
        });
      }

      providerResponse = await sendViaMetaWhatsApp(phone, code);
    } else if (provider === "internal") {
      providerResponse = sendViaInternalVerification(phone, code);
    } else {
      return jsonResponse(500, {
        success: false,
        message: `Unsupported provider: ${provider}`,
      });
    }

    return jsonResponse(200, {
      success: true,
      provider: provider,
      providerResponse,
    });
  } catch (error) {
    return jsonResponse(500, {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});