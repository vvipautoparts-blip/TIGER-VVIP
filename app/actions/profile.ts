"use server";

import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ProfileSchema = z.object({
  fullName: z.string().min(3).max(50),
  bio: z.string().max(250).optional(),
  countryCode: z.string().length(2),
  pledgeAccepted: z.boolean().refine((val) => val === true),
});

export async function updateUserProfile(formData: FormData) {
  const { userId } = await auth();
  
  // Guard against null userId for security
  if (!userId) {
    throw new Error("Authentication required: userId is null");
  }

  const rawData = {
    fullName: formData.get("fullName") || "",
    bio: formData.get("bio") || "",
    countryCode: formData.get("countryCode") as string || "US",
    pledgeAccepted: formData.get("pledgeAccepted") === "true",
  };

  const validated = ProfileSchema.parse(rawData);

  const { data, error } = await supabase
    .from("profiles")
    .upsert({
      clerk_id: userId,
      full_name: validated.fullName,
      bio: validated.bio,
      country_code: validated.countryCode,
      pledge_accepted: validated.pledgeAccepted,
      updated_at: new Date().toISOString(),
    }, { onConflict: "clerk_id" })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return { success: true, profile: data };
}
