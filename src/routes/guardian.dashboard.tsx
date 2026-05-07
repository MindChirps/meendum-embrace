import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { dict, type Lang } from "@/lib/i18n";
import type { Database } from "@/integrations/supabase/types";

type Task = Database["public"]["Tables"]["tasks"]["Row"];
type Log = Database["public"]["Tables"]["activity_logs"]["Row"];
const SESSIONS = ["morning", "afternoon", "evening"] as const;
type SessionType = (typeof SESSIONS)[number];

export const Route = createFileRoute("/guardian/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate();
  const [lang, setLang] = useState<Lang>("en");
  const [recipient, setRecipient] = useState<any>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [resting, setResting] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const t = (k: keyof typeof dict) => dict[k][lang];

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) navigate({ to: "/guardian" });
      else setAuthReady(true);
    });
  }, [navigate]);

  const loadAll = useCallback(async () => {
    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session) return;
    const { data: r } = await supabase
      .from("profiles")
      .select("*")
      .eq("guardian_id", sess.session.user.id)
      .eq("role", "recipient")
      .maybeSingle();
    if (!r) {
      navigate({ to: "/guardian" });
      return;
    }
    setRecipient(r);
    const { data: tdata } = await supabase
      .from("tasks")
      .select("*")
      .eq("recipient_id", r.id)
      .order("sort_order");
    setTasks(tdata ?? []);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { data: ldata } = await supabase
      .from("activity_logs")
      .select("*")
      .eq("recipient_id", r.id)
      .gte("created_at", today.toISOString())
      .order("created_at", { ascending: false });
    setLogs(ldata ?? []);
    const { data: rest } = await supabase
      .from("rest_mode")
      .select("is_resting")
      .eq("recipient_id", r.id)
      .maybeSingle();
    setResting(rest?.is_resting ?? false);
  }, [navigate]);

  useEffect(() => {
    if (authReady) loadAll();
  }, [authReady, loadAll]);

  // realtime: refresh logs
  useEffect(() => {
    if (!recipient) return;
    const ch = supabase
      .channel("guardian-logs")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "activity_logs", filter: `recipient_id=eq.${recipient.id}` },
        (p) => setLogs((cur) => [p.new as Log, ...cur]),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [recipient]);

  async function toggleRest() {
    if (!recipient) return;
    const next = !resting;
    setResting(next);
    await supabase.from("rest_mode").upsert({
      recipient_id: recipient.id,
      is_resting: next,
      updated_at: new Date().toISOString(),
    });
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  if (!recipient) return <div className="min-h-screen bg-background" />;

  return (
    <div className="min-h-screen bg-background pb-32">
      <header className="sticky top-0 bg-background/95 backdrop-blur border-b border-border z-10 px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{t("dashboard")}</h1>
          <p className="text-sm text-muted-foreground">{recipient.custom_name}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setLang(lang === "en" ? "ta" : "en")} className="text-sm px-3 py-1 rounded-full bg-muted">
            {lang === "en" ? "த" : "EN"}
          </button>
          <button onClick={signOut} className="text-sm text-muted-foreground">
            {t("signOut")}
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Pairing code */}
        <section className="bg-card border border-border rounded-2xl p-4">
          <p className="text-sm text-muted-foreground">{t("pairingCode")}</p>
          <p className="text-3xl font-mono tracking-widest mt-1">{recipient.pairing_code}</p>
          <p className="text-xs text-muted-foreground mt-2">{t("givePairCode")} <Link to="/pair" className="underline">/pair</Link></p>
        </section>

        {/* Today's progress */}
        <section className="bg-card border border-border rounded-2xl p-4">
          <h2 className="font-semibold mb-3">{t("todayProgress")}</h2>
          <TodayProgress tasks={tasks} logs={logs} lang={lang} />
        </section>

        {/* Tasks per session */}
        {SESSIONS.map((s) => (
          <SessionBlock
            key={s}
            session={s}
            tasks={tasks.filter((x) => x.session_type === s)}
            recipientId={recipient.id}
            guardianId={recipient.guardian_id ?? ""}
            lang={lang}
            onChange={loadAll}
          />
        ))}
      </main>

      {/* SOS rest toggle */}
      <button
        onClick={toggleRest}
        className={`fixed bottom-4 left-4 right-4 max-w-2xl mx-auto rounded-2xl py-5 text-xl font-semibold shadow-lg ${
          resting ? "bg-accent text-accent-foreground" : "bg-primary text-primary-foreground"
        }`}
      >
        {resting ? t("resumeRecipient") : t("iAmResting")}
      </button>
    </div>
  );
}

function TodayProgress({ tasks, logs, lang }: { tasks: Task[]; logs: Log[]; lang: Lang }) {
  const t = (k: keyof typeof dict) => dict[k][lang];
  if (tasks.length === 0) return <p className="text-sm text-muted-foreground">—</p>;
  return (
    <ul className="space-y-2">
      {tasks
        .filter((x) => x.is_active)
        .map((task) => {
          const log = logs.find((l) => l.task_id === task.id);
          const status = log ? log.status : "pending";
          return (
            <li key={task.id} className="flex items-center justify-between text-sm">
              <span>
                <span className="text-xs text-muted-foreground mr-2">{t(task.session_type as any)}</span>
                {task.name}
              </span>
              <span
                className={`px-2 py-1 rounded-full text-xs ${
                  status === "completed"
                    ? "bg-primary/10 text-primary"
                    : status === "skipped"
                      ? "bg-accent/10 text-accent"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {status === "completed" ? t("completed") : status === "skipped" ? `${t("skipped")} · ${log?.skip_reason ? t(log.skip_reason as any) : ""}` : t("pending")}
              </span>
            </li>
          );
        })}
    </ul>
  );
}

function SessionBlock({
  session,
  tasks,
  recipientId,
  guardianId,
  lang,
  onChange,
}: {
  session: SessionType;
  tasks: Task[];
  recipientId: string;
  guardianId: string;
  lang: Lang;
  onChange: () => void;
}) {
  const t = (k: keyof typeof dict) => dict[k][lang];
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [reps, setReps] = useState(1);
  const [err, setErr] = useState<string | null>(null);
  const activeCount = tasks.filter((x) => x.is_active).length;

  async function add() {
    setErr(null);
    if (!name.trim()) return;
    if (activeCount >= 4) {
      setErr(t("maxTasks"));
      return;
    }
    const { error } = await supabase.from("tasks").insert({
      guardian_id: guardianId,
      recipient_id: recipientId,
      name: name.slice(0, 20),
      session_type: session,
      target_reps: reps,
      is_active: true,
      sort_order: tasks.length,
    });
    if (error) setErr(error.message);
    else {
      setName("");
      setReps(1);
      setAdding(false);
      onChange();
    }
  }

  async function toggleActive(task: Task) {
    const { error } = await supabase
      .from("tasks")
      .update({ is_active: !task.is_active })
      .eq("id", task.id);
    if (error) alert(error.message);
    else onChange();
  }

  async function del(task: Task) {
    await supabase.from("tasks").delete().eq("id", task.id);
    onChange();
  }

  return (
    <section className="bg-card border border-border rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold capitalize">{t(session as any)}</h2>
        <span className="text-xs text-muted-foreground">{activeCount}/4</span>
      </div>
      <ul className="space-y-2">
        {tasks.map((task) => (
          <li key={task.id} className="flex items-center justify-between gap-2 bg-background rounded-lg p-2">
            <span className={task.is_active ? "" : "line-through text-muted-foreground"}>
              {task.name} <span className="text-xs text-muted-foreground">×{task.target_reps}</span>
            </span>
            <div className="flex gap-2">
              <button onClick={() => toggleActive(task)} className="text-xs px-2 py-1 rounded bg-muted">
                {task.is_active ? "Off" : "On"}
              </button>
              <button onClick={() => del(task)} className="text-xs px-2 py-1 rounded bg-destructive/10 text-destructive">
                {t("delete")}
              </button>
            </div>
          </li>
        ))}
      </ul>
      {adding ? (
        <div className="mt-3 space-y-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 20))}
            placeholder={t("taskName")}
            className="w-full bg-background border border-input rounded-lg px-3 py-2"
            maxLength={20}
          />
          <div className="flex gap-2 items-center">
            <label className="text-sm text-muted-foreground">{t("reps")}</label>
            <input
              type="number"
              value={reps}
              onChange={(e) => setReps(Math.max(1, parseInt(e.target.value) || 1))}
              min={1}
              max={50}
              className="w-20 bg-background border border-input rounded-lg px-3 py-2"
            />
          </div>
          {err && <p className="text-destructive text-sm">{err}</p>}
          <div className="flex gap-2">
            <button onClick={add} className="flex-1 bg-primary text-primary-foreground rounded-lg py-2">
              {t("save")}
            </button>
            <button onClick={() => setAdding(false)} className="flex-1 bg-muted rounded-lg py-2">
              {t("cancel")}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          disabled={activeCount >= 4}
          className="mt-3 w-full text-sm text-primary border border-dashed border-border rounded-lg py-2 disabled:opacity-50"
        >
          + {t("addTask")}
        </button>
      )}
    </section>
  );
}
