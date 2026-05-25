import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";

function genCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return s;
}

async function userFromToken(token: string) {
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) throw new Error("Unauthorized");
  return data.user;
}

async function recipientFromCode(code: string) {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("pairing_code", code)
    .eq("role", "recipient")
    .maybeSingle();
  if (error || !data) throw new Error("Invalid pairing code");
  return data;
}

const codeSchema = z.string().trim().toUpperCase().length(6);

// Guardian creates a recipient — no synthetic auth user is created.
export const createRecipient = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        accessToken: z.string().min(10),
        recipientName: z.string().trim().min(1).max(40),
        affectedSide: z.enum(["left", "right"]),
        preferredLanguage: z.enum(["en", "ta"]).default("ta"),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const user = await userFromToken(data.accessToken);
    const guardianId = user.id;

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

    const recipientId = crypto.randomUUID();

    await supabaseAdmin.from("profiles").upsert({
      id: recipientId,
      role: "recipient",
      custom_name: data.recipientName,
      preferred_language: data.preferredLanguage,
      affected_side: data.affectedSide,
      guardian_id: guardianId,
      pairing_code: code,
    });
    await supabaseAdmin.from("rest_mode").upsert({
      recipient_id: recipientId,
      is_resting: false,
    });

    return { recipientId, pairingCode: code };
  });

export const redeemPairingCode = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ code: codeSchema }).parse(d))
  .handler(async ({ data }) => {
    const p = await recipientFromCode(data.code);
    return {
      recipientId: p.id,
      name: p.custom_name,
      preferredLanguage: p.preferred_language,
      affectedSide: p.affected_side,
    };
  });

export const getRecipientProfile = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ code: codeSchema }).parse(d))
  .handler(async ({ data }) => {
    const p = await recipientFromCode(data.code);
    return p;
  });

export const getRecipientTasks = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        code: codeSchema,
        sessionType: z.enum(["morning", "afternoon", "evening"]).nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const p = await recipientFromCode(data.code);
    let q = supabaseAdmin
      .from("tasks")
      .select("*")
      .eq("recipient_id", p.id)
      .eq("is_active", true)
      .order("sort_order");
    if (data.sessionType) q = q.eq("session_type", data.sessionType);
    const { data: tasks, error } = await q;
    if (error) throw new Error(error.message);
    return tasks ?? [];
  });

export const logActivity = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        code: codeSchema,
        taskId: z.string().uuid(),
        status: z.enum(["completed", "skipped"]),
        skipReason: z.enum(["pain", "fatigue"]).nullable().optional(),
        durationSeconds: z.number().int().min(0).max(86400),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const p = await recipientFromCode(data.code);
    const { error } = await supabaseAdmin.from("activity_logs").insert({
      task_id: data.taskId,
      recipient_id: p.id,
      status: data.status,
      skip_reason: data.skipReason ?? null,
      duration_seconds: data.durationSeconds,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getActivityLogs = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        code: codeSchema,
        sinceIso: z.string().datetime(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const p = await recipientFromCode(data.code);
    const { data: logs, error } = await supabaseAdmin
      .from("activity_logs")
      .select("*")
      .eq("recipient_id", p.id)
      .gte("created_at", data.sinceIso);
    if (error) throw new Error(error.message);
    return logs ?? [];
  });

export const getRestMode = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ code: codeSchema }).parse(d))
  .handler(async ({ data }) => {
    const p = await recipientFromCode(data.code);
    const { data: r } = await supabaseAdmin
      .from("rest_mode")
      .select("is_resting")
      .eq("recipient_id", p.id)
      .maybeSingle();
    return { isResting: r?.is_resting ?? false };
  });
