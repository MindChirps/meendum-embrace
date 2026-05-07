import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { redeemPairingCode } from "@/lib/pairing.functions";
import { supabase } from "@/integrations/supabase/client";
import { dict, type Lang } from "@/lib/i18n";

export const Route = createFileRoute("/pair")({
  component: PairPage,
});

function PairPage() {
  const navigate = useNavigate();
  const [lang, setLang] = useState<Lang>("ta");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const redeem = useServerFn(redeemPairingCode);
  const t = (k: keyof typeof dict) => dict[k][lang];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    try {
      const { email, password } = await redeem({ data: { code } });
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      navigate({ to: "/recipient" });
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <form onSubmit={submit} className="w-full max-w-md bg-card border border-border rounded-2xl p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold">{t("pair")}</h1>
          <button type="button" onClick={() => setLang(lang === "en" ? "ta" : "en")} className="text-sm text-muted-foreground">
            {lang === "en" ? "த" : "EN"}
          </button>
        </div>
        <p className="text-sm text-muted-foreground">{t("enterCode")}</p>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
          maxLength={6}
          className="w-full bg-background border border-input rounded-xl px-4 py-6 text-center text-3xl font-mono tracking-widest"
          autoFocus
        />
        {err && <p className="text-destructive text-sm">{err}</p>}
        <button
          type="submit"
          disabled={loading || code.length !== 6}
          className="w-full bg-primary text-primary-foreground rounded-xl py-4 font-semibold text-lg disabled:opacity-50"
        >
          {loading ? "..." : t("pair")}
        </button>
      </form>
    </div>
  );
}
