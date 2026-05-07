import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { dict, type Lang } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const [lang, setLang] = useState<Lang>("ta");
  const t = (k: keyof typeof dict) => dict[k][lang];

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="absolute top-4 right-4 flex gap-2">
        <button
          onClick={() => setLang("en")}
          className={`px-3 py-1 rounded-full text-sm ${lang === "en" ? "bg-foreground text-background" : "bg-muted"}`}
        >
          EN
        </button>
        <button
          onClick={() => setLang("ta")}
          className={`px-3 py-1 rounded-full text-sm ${lang === "ta" ? "bg-foreground text-background" : "bg-muted"}`}
        >
          த
        </button>
      </div>

      <h1 className="text-5xl font-semibold text-foreground mb-2 tracking-tight">{t("appName")}</h1>
      <p className="text-muted-foreground mb-12 text-center max-w-md">{t("chooseRole")}</p>

      <div className="flex flex-col gap-4 w-full max-w-sm">
        <Link
          to="/recipient"
          className="bg-primary text-primary-foreground rounded-2xl py-8 px-6 text-2xl font-semibold text-center shadow-lg active:scale-95 transition"
        >
          {t("iAmRecipient")}
        </Link>
        <Link
          to="/guardian"
          className="bg-card border border-border rounded-2xl py-6 px-6 text-lg text-center text-foreground active:scale-95 transition"
        >
          {t("iAmGuardian")}
        </Link>
      </div>
    </div>
  );
}
