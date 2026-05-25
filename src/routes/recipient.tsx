import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  getRecipientProfile,
  getRecipientTasks,
  logActivity,
  getActivityLogs,
  getRestMode,
} from "@/lib/pairing.functions";
import { getRecipientSession, clearRecipientSession } from "@/lib/recipient-session";
import { dict, type Lang } from "@/lib/i18n";
import { currentSession } from "@/lib/session";
import { playChime, playApplause } from "@/lib/audio";
import { BodyIcon } from "@/components/BodyIcon";
import type { Database } from "@/integrations/supabase/types";

type Task = Database["public"]["Tables"]["tasks"]["Row"];
type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export const Route = createFileRoute("/recipient")({
  component: RecipientPage,
});

function RecipientPage() {
  const navigate = useNavigate();
  const [code, setCode] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set());
  const [resting, setResting] = useState(false);

  const fetchProfile = useServerFn(getRecipientProfile);
  const fetchTasks = useServerFn(getRecipientTasks);
  const fetchLogs = useServerFn(getActivityLogs);
  const fetchRest = useServerFn(getRestMode);
  const sendLog = useServerFn(logActivity);

  useEffect(() => {
    const sess = getRecipientSession();
    if (!sess) {
      navigate({ to: "/pair" });
      return;
    }
    setCode(sess.pairingCode);
    fetchProfile({ data: { code: sess.pairingCode } })
      .then((p) => setProfile(p as Profile))
      .catch(() => {
        clearRecipientSession();
        navigate({ to: "/pair" });
      });
  }, [navigate, fetchProfile]);

  const [session, setSession] = useState<ReturnType<typeof currentSession>>(null);
  useEffect(() => {
    setSession(currentSession());
    const i = setInterval(() => setSession(currentSession()), 60_000);
    return () => clearInterval(i);
  }, []);

  const loadTasks = useCallback(async () => {
    if (!code || !profile) {
      setTasks([]);
      return;
    }
    const tdata = await fetchTasks({ data: { code, sessionType: session ?? null } });
    setTasks(tdata as Task[]);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const ldata = await fetchLogs({ data: { code, sinceIso: today.toISOString() } });
    setDoneIds(new Set((ldata as Array<{ task_id: string }>).map((l) => l.task_id)));
  }, [code, profile, session, fetchTasks, fetchLogs]);

  useEffect(() => {
    if (profile) loadTasks();
  }, [profile, loadTasks]);

  // Poll rest mode every 4s (replaces realtime subscription for the un-authed recipient)
  useEffect(() => {
    if (!code) return;
    let cancelled = false;
    const tick = async () => {
      try {
        const { isResting } = await fetchRest({ data: { code } });
        if (!cancelled) setResting(isResting);
      } catch {
        /* ignore */
      }
    };
    tick();
    const i = setInterval(tick, 4000);
    return () => {
      cancelled = true;
      clearInterval(i);
    };
  }, [code, fetchRest]);

  if (!profile || !code) return <div className="min-h-screen bg-background" />;
  if (resting) return <RestModeScreen lang={profile.preferred_language} />;

  const remaining = tasks.filter((t) => !doneIds.has(t.id));
  const currentTask = remaining[0];

  if (!session && tasks.length === 0) return <NoSession lang={profile.preferred_language} profile={profile} />;
  if (!currentTask) return <SessionDone lang={profile.preferred_language} profile={profile} code={code} />;

  return (
    <TaskScreen
      key={currentTask.id}
      task={currentTask}
      profile={profile}
      onComplete={async (durationSec, skipReason) => {
        await sendLog({
          data: {
            code,
            taskId: currentTask.id,
            status: skipReason ? "skipped" : "completed",
            skipReason: skipReason ?? null,
            durationSeconds: durationSec,
          },
        });
        playChime();
        setDoneIds((s) => new Set(s).add(currentTask.id));
      }}
    />
  );
}

function TaskScreen({
  task,
  profile,
  onComplete,
}: {
  task: Task;
  profile: Profile;
  onComplete: (durationSec: number, skipReason?: "pain" | "fatigue") => Promise<void>;
}) {
  const lang = profile.preferred_language as Lang;
  const t = (k: keyof typeof dict) => dict[k][lang];
  const [phase, setPhase] = useState<"idle" | "running" | "skip">("idle");
  const startRef = useRef<number>(0);

  function start() {
    startRef.current = Date.now();
    setPhase("running");
  }
  async function done() {
    const dur = Math.round((Date.now() - startRef.current) / 1000);
    await onComplete(dur);
  }
  async function skip(reason: "pain" | "fatigue") {
    await onComplete(0, reason);
  }

  return (
    <div className="min-h-screen bg-background flex flex-col p-4">
      <div className="self-center bg-accent/10 text-accent text-sm font-medium px-4 py-1 rounded-full">
        🧘 {t("sitStraight")}
      </div>

      <div className="flex-shrink-0 flex justify-center mt-4">
        <BodyIcon affected={profile.affected_side as "left" | "right" | null} size={120} />
      </div>

      <h1 className="text-center text-4xl font-bold mt-4 px-4 text-foreground">
        {task.name}
        {task.target_reps > 1 && <span className="block text-2xl text-muted-foreground mt-1">×{task.target_reps}</span>}
      </h1>

      <div className="flex-1 flex items-center justify-center my-6">
        {phase === "idle" && (
          <button
            onClick={start}
            className="bg-primary text-primary-foreground rounded-full font-bold text-4xl shadow-2xl active:scale-95 transition"
            style={{ width: "75vw", height: "75vw", maxWidth: 360, maxHeight: 360 }}
          >
            ▶ {t("start")}
          </button>
        )}
        {phase === "running" && (
          <button
            onClick={done}
            className="relative bg-primary text-primary-foreground rounded-full font-bold text-4xl shadow-2xl active:scale-95 transition flex items-center justify-center"
            style={{ width: "75vw", height: "75vw", maxWidth: 360, maxHeight: 360 }}
          >
            <span className="absolute inset-0 rounded-full bg-primary/30 animate-ping" style={{ animationDuration: "4s" }} />
            <span className="relative">✓ {t("done")}</span>
          </button>
        )}
        {phase === "skip" && (
          <div className="grid grid-cols-2 gap-4 w-full">
            <button
              onClick={() => skip("pain")}
              className="bg-card border-2 border-accent rounded-3xl py-12 text-2xl font-semibold active:scale-95"
            >
              <div className="text-6xl mb-2">🤕</div>
              {t("pain")}
            </button>
            <button
              onClick={() => skip("fatigue")}
              className="bg-card border-2 border-accent rounded-3xl py-12 text-2xl font-semibold active:scale-95"
            >
              <div className="text-6xl mb-2">🥱</div>
              {t("fatigue")}
            </button>
          </div>
        )}
      </div>

      {phase === "running" && (
        <p className="text-center text-muted-foreground text-lg mb-2">{t("breatheSlow")}</p>
      )}

      {phase !== "skip" && (
        <button
          onClick={() => setPhase("skip")}
          className="self-center text-muted-foreground text-lg underline py-3 px-6"
        >
          {t("skip")}
        </button>
      )}
    </div>
  );
}

function NoSession({ lang, profile }: { lang: Lang; profile: Profile }) {
  const t = (k: keyof typeof dict) => dict[k][lang];
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
      <BodyIcon affected={profile.affected_side as any} size={140} />
      <p className="mt-6 text-2xl font-semibold">{t("noTasksNow")}</p>
    </div>
  );
}

function SessionDone({ lang, profile, code }: { lang: Lang; profile: Profile; code: string }) {
  const t = (k: keyof typeof dict) => dict[k][lang];
  const [week, setWeek] = useState<boolean[]>([false, false, false, false, false, false, false]);
  const fetchLogs = useServerFn(getActivityLogs);

  useEffect(() => {
    playApplause();
    const start = new Date();
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    fetchLogs({ data: { code, sinceIso: start.toISOString() } })
      .then((data) => {
        const days = [false, false, false, false, false, false, false];
        (data as Array<{ created_at: string }>).forEach((l) => {
          const d = new Date(l.created_at);
          d.setHours(0, 0, 0, 0);
          const idx = 6 - Math.floor((Date.now() - d.getTime()) / 86400000);
          if (idx >= 0 && idx < 7) days[idx] = true;
        });
        setWeek(days);
      })
      .catch(() => {});
  }, [code, profile.id, fetchLogs]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
      <div className="text-7xl mb-4">🌸</div>
      <h1 className="text-3xl font-bold mb-2">{t("allDone")}</h1>
      <p className="text-muted-foreground text-lg mb-8">{t("restNow")}</p>

      <p className="text-sm text-muted-foreground mb-2">{t("weeklyConsistency")}</p>
      <div className="flex gap-2">
        {week.map((on, i) => (
          <div
            key={i}
            className={`w-8 h-8 rounded-full ${on ? "bg-primary" : "bg-muted border border-border"}`}
          />
        ))}
      </div>
    </div>
  );
}

function RestModeScreen({ lang }: { lang: Lang }) {
  const t = (k: keyof typeof dict) => dict[k][lang];
  return (
    <div className="min-h-screen bg-accent/5 flex flex-col items-center justify-center p-6 text-center">
      <div className="text-7xl mb-6">🌙</div>
      <h1 className="text-3xl font-bold mb-2">{t("caregiverResting")}</h1>
      <p className="text-muted-foreground text-lg">{t("pleaseWait")}</p>
    </div>
  );
}
