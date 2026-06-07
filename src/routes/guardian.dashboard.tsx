import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useMemo } from "react";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
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
    const { data: rows } = await supabase
      .from("profiles")
      .select("*")
      .eq("guardian_id", sess.session.user.id)
      .eq("role", "recipient")
      .order("created_at", { ascending: true });
    // Prefer a recipient that already has tasks (the one actually in use)
    let r = rows?.[0];
    if (rows && rows.length > 1) {
      const ids = rows.map((x) => x.id);
      const { data: tcounts } = await supabase
        .from("tasks")
        .select("recipient_id")
        .in("recipient_id", ids);
      if (tcounts && tcounts.length > 0) {
        const counts = new Map<string, number>();
        tcounts.forEach((t) => counts.set(t.recipient_id, (counts.get(t.recipient_id) ?? 0) + 1));
        const best = rows.find((x) => (counts.get(x.id) ?? 0) > 0);
        if (best) r = best;
      }
    }
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

        {/* History & Trends */}
        <HistorySection recipientId={recipient.id} tasks={tasks} lang={lang} />

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

function HistorySection({
  recipientId,
  tasks,
  lang,
}: {
  recipientId: string;
  tasks: Task[];
  lang: Lang;
}) {
  const t = (k: keyof typeof dict) => dict[k][lang];
  const [range, setRange] = useState<7 | 30>(7);
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    since.setDate(since.getDate() - (range - 1));
    supabase
      .from("activity_logs")
      .select("*")
      .eq("recipient_id", recipientId)
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (cancelled) return;
        setLogs(data ?? []);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [recipientId, range]);

  const days = useMemo(() => {
    const arr: { key: string; date: Date; label: string }[] = [];
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (range - 1));
    const locale = lang === "ta" ? "ta-IN" : "en-GB";
    for (let i = 0; i < range; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      arr.push({
        key,
        date: d,
        label: d.toLocaleDateString(locale, { day: "2-digit", month: "2-digit" }),
      });
    }
    return arr;
  }, [range, lang]);

  const consistencyData = useMemo(() => {
    const buckets = new Map<string, { completed: number; skipped: number }>();
    days.forEach((d) => buckets.set(d.key, { completed: 0, skipped: 0 }));
    for (const l of logs) {
      const d = new Date(l.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const b = buckets.get(key);
      if (!b) continue;
      if (l.status === "completed") b.completed += 1;
      else if (l.status === "skipped") b.skipped += 1;
    }
    return days.map((d) => {
      const b = buckets.get(d.key)!;
      return {
        label: d.label,
        total: b.completed + b.skipped,
        hasSkip: b.skipped > 0,
      };
    });
  }, [days, logs]);

  const painFatigueData = useMemo(() => {
    const buckets = new Map<string, { pain: number; fatigue: number }>();
    days.forEach((d) => buckets.set(d.key, { pain: 0, fatigue: 0 }));
    for (const l of logs) {
      if (l.status !== "skipped" || !l.skip_reason) continue;
      const d = new Date(l.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const b = buckets.get(key);
      if (!b) continue;
      if (l.skip_reason === "pain") b.pain += 1;
      else if (l.skip_reason === "fatigue") b.fatigue += 1;
    }
    return days.map((d) => {
      const b = buckets.get(d.key)!;
      return { label: d.label, pain: b.pain, fatigue: b.fatigue };
    });
  }, [days, logs]);

  const painTotal = painFatigueData.reduce((s, d) => s + d.pain, 0);
  const fatigueTotal = painFatigueData.reduce((s, d) => s + d.fatigue, 0);

  const taskStats = useMemo(() => {
    return tasks
      .filter((x) => x.is_active)
      .map((task) => {
        let completed = 0;
        let skipped = 0;
        for (const l of logs) {
          if (l.task_id !== task.id) continue;
          if (l.status === "completed") completed += 1;
          else if (l.status === "skipped") skipped += 1;
        }
        return { task, completed, skipped };
      });
  }, [tasks, logs]);

  const chartHeight = range === 7 ? 160 : 200;
  const empty = !loading && logs.length === 0;

  return (
    <section className="bg-card border border-border rounded-2xl p-4">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between"
        aria-expanded={open}
      >
        <h2 className="font-semibold">{t("history")}</h2>
        <span
          className={`text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        >
          ▾
        </span>
      </button>

      {open && (
        <div className="mt-4 space-y-6">
          {/* Range toggle */}
          <div className="flex gap-2">
            {([7, 30] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1.5 rounded-full text-sm ${
                  range === r
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                }`}
              >
                {r === 7 ? t("last7Days") : t("last30Days")}
              </button>
            ))}
          </div>

          {loading ? (
            <div
              className="rounded-lg bg-muted animate-pulse"
              style={{ height: chartHeight }}
            />
          ) : empty ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {t("noActivityPeriod")}
            </p>
          ) : (
            <>
              {/* Consistency */}
              <div>
                <h3 className="text-sm font-medium mb-2">{t("consistency")}</h3>
                <div style={{ width: "100%", height: chartHeight }}>
                  <ResponsiveContainer>
                    <BarChart data={consistencyData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                        interval={range === 30 ? 3 : 0}
                      />
                      <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                      <RTooltip
                        contentStyle={{
                          background: "var(--card)",
                          border: "1px solid var(--border)",
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                      />
                      <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                        {consistencyData.map((d, i) => (
                          <Cell
                            key={i}
                            fill={d.hasSkip ? "var(--accent)" : "var(--primary)"}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Pain vs Fatigue */}
              <div>
                <h3 className="text-sm font-medium mb-2">{t("painVsFatigue")}</h3>
                <div className="flex gap-4 mb-2">
                  <div className="flex-1 bg-background rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">{t("pain")}</p>
                    <p className="text-2xl font-semibold text-destructive">{painTotal}</p>
                  </div>
                  <div className="flex-1 bg-background rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">{t("fatigue")}</p>
                    <p className="text-2xl font-semibold text-accent">{fatigueTotal}</p>
                  </div>
                </div>
                <div style={{ width: "100%", height: chartHeight }}>
                  <ResponsiveContainer>
                    <BarChart data={painFatigueData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                        interval={range === 30 ? 3 : 0}
                      />
                      <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                      <RTooltip
                        contentStyle={{
                          background: "var(--card)",
                          border: "1px solid var(--border)",
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="pain" name={t("pain")} fill="var(--destructive)" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="fatigue" name={t("fatigue")} fill="var(--accent)" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Per-task adherence */}
              <div>
                <h3 className="text-sm font-medium mb-2">{t("perTaskAdherence")}</h3>
                {taskStats.length === 0 ? (
                  <p className="text-sm text-muted-foreground">—</p>
                ) : (
                  <ul className="space-y-2">
                    {taskStats.map(({ task, completed, skipped }) => (
                      <li
                        key={task.id}
                        className="flex items-center justify-between bg-background rounded-lg p-2 text-sm"
                      >
                        <span className="truncate">
                          <span className="text-xs text-muted-foreground mr-2">
                            {t(task.session_type as any)}
                          </span>
                          {task.name}
                        </span>
                        <span className="flex gap-2 shrink-0">
                          <span className="px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary">
                            ✓ {completed}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-xs bg-accent/10 text-accent">
                            ✗ {skipped}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}
