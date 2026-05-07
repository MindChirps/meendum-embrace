import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

function genCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return s;
}

// Guardian creates the recipient: auth user, profile, credentials, pairing code.
export const createRecipient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        recipientName: z.string().trim().min(1).max(40),
        affectedSide: z.enum(["left", "right"]),
        preferredLanguage: z.enum(["en", "ta"]).default("ta"),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const guardianId = context.userId;

    // generate unique pairing code
    let code = genCode();
    for (let i = 0; i < 5; i++) {
      const { data: existing } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("pairing_code", code)
        .maybeSingle();
      if (!existing) break;
      code = genCode();
    }

    // create auth user for recipient
    const email = `recipient-${code.toLowerCase()}-${Date.now()}@meendum.app`;
    const password = crypto.randomUUID() + crypto.randomUUID();
    const { data: created, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (authErr || !created.user) throw new Error(authErr?.message || "auth failed");
    const recipientId = created.user.id;

    // profile (overrides any auto-created guardian-trigger row)
    await supabaseAdmin.from("profiles").upsert({
      id: recipientId,
      role: "recipient",
      custom_name: data.recipientName,
      preferred_language: data.preferredLanguage,
      affected_side: data.affectedSide,
      guardian_id: guardianId,
      pairing_code: code,
    });

    await supabaseAdmin.from("recipient_credentials").upsert({
      recipient_id: recipientId,
      email,
      password,
    });

    await supabaseAdmin.from("rest_mode").upsert({
      recipient_id: recipientId,
      is_resting: false,
    });

    return { recipientId, pairingCode: code };
  });

// Recipient device redeems a pairing code -> returns credentials to sign in
export const redeemPairingCode = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ code: z.string().trim().toUpperCase().length(6) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { data: profile, error } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("pairing_code", data.code)
      .eq("role", "recipient")
      .maybeSingle();
    if (error || !profile) throw new Error("Invalid pairing code");

    const { data: creds } = await supabaseAdmin
      .from("recipient_credentials")
      .select("email, password")
      .eq("recipient_id", profile.id)
      .maybeSingle();
    if (!creds) throw new Error("No credentials");
    return { email: creds.email, password: creds.password, recipientId: profile.id };
  });

// Guardian fetches code for their recipient
export const getMyRecipient = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await supabaseAdmin
      .from("profiles")
      .select("id, custom_name, preferred_language, affected_side, pairing_code")
      .eq("guardian_id", context.userId)
      .eq("role", "recipient")
      .maybeSingle();
    return data;
  });
