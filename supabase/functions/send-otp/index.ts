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
  return phone.replace(/[^\d+]/g, "");
}

async function sendViaMetaWhatsApp(phone: string, code: string) {
  const accessToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
  const phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
  const templateName = Deno.env.get("WHATSAPP_TEMPLATE_NAME");
  const templateLang = Deno.env.get("WHATSAPP_TEMPLATE_LANG") || "ar";

  if (!accessToken || !phoneNumberId) {
    throw new Error("Missing WhatsApp environment variables.");
  }

  const recipient = normalizePhone(phone).replace(/^\+/, "");
  const endpoint = `https://graph.facebook.com/v22.0/${phoneNumberId}/messages`;

  const payload = templateName
    ? {
        messaging_product: "whatsapp",
        to: recipient,
        type: "template",
        template: {
          name: templateName,
          language: { code: templateLang },
          components: [
            {
              type: "body",
              parameters: [{ type: "text", text: code }],
            },
          ],
        },
      }
    : {
        messaging_product: "whatsapp",
        to: recipient,
        type: "text",
        text: {
          preview_url: false,
          body: `Tiger VVIP verification code: ${code}`,
        },
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
    throw new Error(`WhatsApp API error: ${JSON.stringify(data)}`);
  }

  return data;
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
    const phone = body.phone?.trim();
    const code = body.code?.trim();
    const channel = body.channel?.trim().toLowerCase();

    if (!phone || !code || channel !== "whatsapp") {
      return jsonResponse(400, {
        success: false,
        message: "Invalid payload. Expected phone, code, channel=whatsapp.",
      });
    }

    const provider = (Deno.env.get("WHATSAPP_PROVIDER") || "meta").toLowerCase();

    if (provider !== "meta") {
      return jsonResponse(500, {
        success: false,
        message: `Unsupported provider: ${provider}`,
      });
    }

    const providerResponse = await sendViaMetaWhatsApp(phone, code);

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