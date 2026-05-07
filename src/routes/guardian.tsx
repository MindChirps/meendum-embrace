import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { createRecipient, getMyRecipient } from "@/lib/pairing.functions";
import { dict, type Lang } from "@/lib/i18n";

export const Route = createFileRoute("/guardian")({
  component: GuardianGate,
});

function GuardianGate() {
  const [ready, setReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user.id ?? null);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user.id ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!ready) return <div className="min-h-screen bg-background" />;
  if (!userId) return <AuthForm />;
  return <GuardianHome />;
}

function AuthForm() {
  const [lang, setLang] = useState<Lang>("en");
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const t = (k: keyof typeof dict) => dict[k][lang];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/guardian`, data: { name } },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <form onSubmit={submit} className="w-full max-w-sm bg-card rounded-2xl p-6 shadow-md border border-border space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold">{mode === "signup" ? t("signUp") : t("signIn")}</h1>
          <button type="button" onClick={() => setLang(lang === "en" ? "ta" : "en")} className="text-sm text-muted-foreground">
            {lang === "en" ? "த" : "EN"}
          </button>
        </div>
        {mode === "signup" && (
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("yourName")}
            className="w-full bg-background border border-input rounded-lg px-4 py-3"
            required
          />
        )}
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t("email")}
          className="w-full bg-background border border-input rounded-lg px-4 py-3"
          required
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t("password")}
          className="w-full bg-background border border-input rounded-lg px-4 py-3"
          required
          minLength={8}
        />
        {err && <p className="text-destructive text-sm">{err}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary text-primary-foreground rounded-lg py-3 font-semibold"
        >
          {loading ? "..." : mode === "signup" ? t("signUp") : t("signIn")}
        </button>
        <button
          type="button"
          onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
          className="w-full text-sm text-muted-foreground"
        >
          {mode === "signup" ? t("alreadyHave") : t("needAccount")}
        </button>
      </form>
    </div>
  );
}

function GuardianHome() {
  const navigate = useNavigate();
  const fetchRecipient = useServerFn(getMyRecipient);
  const [state, setState] = useState<"loading" | "needs-recipient">("loading");

  useEffect(() => {
    let cancelled = false;
    fetchRecipient()
      .then((r) => {
        if (cancelled) return;
        if (r) navigate({ to: "/guardian/dashboard" });
        else setState("needs-recipient");
      })
      .catch((e) => {
        console.error("getMyRecipient failed", e);
        if (!cancelled) setState("needs-recipient");
      });
    return () => {
      cancelled = true;
    };
  }, [fetchRecipient, navigate]);

  if (state === "loading") return <div className="min-h-screen bg-background" />;
  return <CreateRecipientForm onCreated={() => navigate({ to: "/guardian/dashboard" })} />;
}

function CreateRecipientForm({ onCreated }: { onCreated: () => void }) {
  const [lang, setLang] = useState<Lang>("en");
  const [name, setName] = useState("");
  const [side, setSide] = useState<"left" | "right">("right");
  const [recipientLang, setRecipientLang] = useState<Lang>("ta");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const create = useServerFn(createRecipient);
  const t = (k: keyof typeof dict) => dict[k][lang];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    try {
      await create({
        data: { recipientName: name, affectedSide: side, preferredLanguage: recipientLang },
      });
      onCreated();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <form onSubmit={submit} className="w-full max-w-md bg-card rounded-2xl p-6 shadow-md border border-border space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold">{t("recipientName")}</h1>
          <button type="button" onClick={() => setLang(lang === "en" ? "ta" : "en")} className="text-sm text-muted-foreground">
            {lang === "en" ? "த" : "EN"}
          </button>
        </div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("recipientName")}
          className="w-full bg-background border border-input rounded-lg px-4 py-3"
          required
          maxLength={40}
        />
        <div>
          <p className="text-sm text-muted-foreground mb-2">{t("affectedSide")}</p>
          <div className="grid grid-cols-2 gap-2">
            {(["left", "right"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSide(s)}
                className={`py-3 rounded-lg border ${side === s ? "bg-accent text-accent-foreground border-accent" : "border-border"}`}
              >
                {t(s)}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-sm text-muted-foreground mb-2">{t("appName")}: {t("english")} / {t("tamil")}</p>
          <div className="grid grid-cols-2 gap-2">
            {(["en", "ta"] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setRecipientLang(l)}
                className={`py-3 rounded-lg border ${recipientLang === l ? "bg-accent text-accent-foreground border-accent" : "border-border"}`}
              >
                {l === "en" ? t("english") : t("tamil")}
              </button>
            ))}
          </div>
        </div>
        {err && <p className="text-destructive text-sm">{err}</p>}
        <button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground rounded-lg py-3 font-semibold">
          {loading ? "..." : t("save")}
        </button>
        <button type="button" onClick={signOut} className="w-full text-sm text-muted-foreground">
          {t("signOut")}
        </button>
      </form>
    </div>
  );
}
