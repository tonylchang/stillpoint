import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabaseClient";

// ── Habits ──────────────────────────────────────────────────────────
const HABITS = [
  { id: "breathwork", name: "Breathwork", emoji: "🌬️", duration: "3 min", description: "Box breathing: 4s in, 4s hold, 4s out, 4s hold", stackOn: "While the coffee brews", category: "morning" },
  { id: "intention", name: "Set Intention", emoji: "🎯", duration: "2 min", description: "One sentence: what matters most today?", stackOn: "First sip of coffee", category: "morning" },
  { id: "mindful_break", name: "Mindful Break", emoji: "🧘", duration: "5 min", description: "Step away from screen. Stretch, look far away, breathe.", stackOn: "After standup or lunch", category: "midday" },
  { id: "gratitude", name: "Gratitude Note", emoji: "✍️", duration: "2 min", description: "Write down one thing that went well today", stackOn: "Right after your run / workout", category: "afternoon" },
  { id: "screen_cutoff", name: "Screen Sunset", emoji: "🌅", duration: "—", description: "No screens 30 min before bed. Read, stretch, or cook.", stackOn: "After dinner cleanup", category: "evening" },
  { id: "body_scan", name: "Body Scan", emoji: "🌙", duration: "5 min", description: "Lie down, scan from toes to head. Release tension.", stackOn: "After brushing teeth", category: "evening" },
];

const CATEGORY_LABELS = { morning: "Morning", midday: "Midday", afternoon: "Afternoon", evening: "Evening" };
const CATEGORY_COLORS = { morning: "#E8A838", midday: "#5BA67D", afternoon: "#C47A5A", evening: "#6B7DB3" };

// ── Date helpers ────────────────────────────────────────────────────
function getDateKey(date = new Date()) {
  return date.toISOString().split("T")[0];
}

function getDayLabel(dateKey) {
  const d = new Date(dateKey + "T12:00:00");
  const today = getDateKey();
  const yesterday = getDateKey(new Date(Date.now() - 86400000));
  if (dateKey === today) return "Today";
  if (dateKey === yesterday) return "Yesterday";
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function getLast7Days() {
  const days = [];
  for (let i = 6; i >= 0; i--) days.push(getDateKey(new Date(Date.now() - i * 86400000)));
  return days;
}

function getStreak(log) {
  let streak = 0;
  let d = new Date();
  while (true) {
    const key = getDateKey(d);
    const entry = log[key];
    if (entry && Object.values(entry).some(Boolean)) {
      streak++;
      d = new Date(d.getTime() - 86400000);
    } else if (streak === 0) {
      d = new Date(d.getTime() - 86400000);
      const yEntry = log[getDateKey(d)];
      if (yEntry && Object.values(yEntry).some(Boolean)) {
        streak++;
        d = new Date(d.getTime() - 86400000);
      } else break;
    } else break;
  }
  return streak;
}

// ── localStorage cache ──────────────────────────────────────────────
function cacheGet(key) {
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : null; } catch { return null; }
}
function cacheSet(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

// ── Component ───────────────────────────────────────────────────────
export default function Tracker({ session, onSignOut }) {
  const userId = session.user.id;
  const [log, setLog] = useState(() => cacheGet("stillpoint-log") || {});
  const [journal, setJournal] = useState(() => cacheGet("stillpoint-journal") || {});
  const [selectedDay, setSelectedDay] = useState(getDateKey());
  const [journalInput, setJournalInput] = useState("");
  const [showJournal, setShowJournal] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Load from Supabase on mount
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("wellness_data")
        .select("log, journal")
        .eq("user_id", userId)
        .single();
      if (data) {
        if (data.log) { setLog(data.log); cacheSet("stillpoint-log", data.log); }
        if (data.journal) { setJournal(data.journal); cacheSet("stillpoint-journal", data.journal); }
      }
    })();
  }, [userId]);

  useEffect(() => {
    setJournalInput(journal[selectedDay] || "");
  }, [selectedDay, journal]);

  // Persist to Supabase + localStorage
  const persist = useCallback(async (newLog, newJournal) => {
    cacheSet("stillpoint-log", newLog);
    cacheSet("stillpoint-journal", newJournal);
    setSyncing(true);
    await supabase.from("wellness_data").upsert({
      user_id: userId,
      log: newLog,
      journal: newJournal,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
    setSyncing(false);
  }, [userId]);

  const toggleHabit = (habitId) => {
    const dayLog = log[selectedDay] || {};
    const newLog = { ...log, [selectedDay]: { ...dayLog, [habitId]: !dayLog[habitId] } };
    setLog(newLog);
    persist(newLog, journal);
  };

  const handleJournalSave = () => {
    const newJournal = { ...journal, [selectedDay]: journalInput };
    setJournal(newJournal);
    persist(log, newJournal);
    setShowJournal(false);
  };

  const resetAll = async () => {
    if (confirm("Reset all tracking data? This can't be undone.")) {
      setLog({});
      setJournal({});
      cacheSet("stillpoint-log", {});
      cacheSet("stillpoint-journal", {});
      await supabase.from("wellness_data").delete().eq("user_id", userId);
    }
  };

  const todayLog = log[selectedDay] || {};
  const completedToday = HABITS.filter((h) => todayLog[h.id]).length;
  const pct = Math.round((completedToday / HABITS.length) * 100);
  const streak = getStreak(log);
  const last7 = getLast7Days();

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Stillpoint</h1>
          <p style={styles.subtitle}>
            {syncing ? "Syncing…" : "Synced across devices"}
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <div style={styles.streakBadge}>
            <span style={styles.streakNum}>{streak}</span>
            <span style={styles.streakLabel}>day streak</span>
          </div>
        </div>
      </div>

      {/* Week view */}
      <div style={styles.weekRow}>
        {last7.map((dayKey) => {
          const dayLog2 = log[dayKey] || {};
          const done = HABITS.filter((h) => dayLog2[h.id]).length;
          const isSelected = dayKey === selectedDay;
          const isToday = dayKey === getDateKey();
          const d = new Date(dayKey + "T12:00:00");
          const dayLetter = d.toLocaleDateString("en-US", { weekday: "narrow" });
          return (
            <button key={dayKey} onClick={() => setSelectedDay(dayKey)} style={{
              ...styles.dayBtn,
              background: isSelected ? "#1E293B" : "transparent",
              border: isToday && !isSelected ? "1px solid #334155" : "1px solid transparent",
            }}>
              <span style={{ fontSize: 11, color: isSelected ? "#E2E8F0" : "#64748B", fontWeight: 600 }}>{dayLetter}</span>
              <div style={{
                ...styles.dayDot,
                background: done === HABITS.length ? "#5BA67D" : done > 0 ? "#E8A838" : "#1E293B",
                boxShadow: done === HABITS.length ? "0 0 8px #5BA67D55" : "none",
              }}>
                {done > 0 && <span style={{ fontSize: 10, color: "#fff", fontWeight: 700 }}>{done}</span>}
              </div>
            </button>
          );
        })}
      </div>

      {/* Progress */}
      <div style={styles.progressSection}>
        <div style={styles.progressHeader}>
          <span style={styles.dayTitle}>{getDayLabel(selectedDay)}</span>
          <span style={styles.progressPct}>{completedToday}/{HABITS.length}</span>
        </div>
        <div style={styles.progressTrack}>
          <div style={{ ...styles.progressFill, width: `${pct}%` }} />
        </div>
      </div>

      {/* Habits */}
      {Object.entries(CATEGORY_LABELS).map(([cat, label]) => {
        const habits = HABITS.filter((h) => h.category === cat);
        if (!habits.length) return null;
        return (
          <div key={cat} style={{ marginBottom: 20 }}>
            <div style={styles.catHeader}>
              <div style={{ ...styles.catDot, background: CATEGORY_COLORS[cat] }} />
              <span style={styles.catLabel}>{label}</span>
            </div>
            {habits.map((habit) => {
              const done = !!todayLog[habit.id];
              return (
                <button key={habit.id} onClick={() => toggleHabit(habit.id)} style={{
                  ...styles.habitCard,
                  borderLeft: `3px solid ${done ? CATEGORY_COLORS[cat] : "#1E293B"}`,
                  opacity: done ? 0.7 : 1,
                }}>
                  <div style={styles.habitTop}>
                    <div style={styles.habitLeft}>
                      <span style={{ fontSize: 22 }}>{habit.emoji}</span>
                      <div>
                        <span style={{ ...styles.habitName, textDecoration: done ? "line-through" : "none", color: done ? "#64748B" : "#E2E8F0" }}>{habit.name}</span>
                        <span style={styles.habitDuration}>{habit.duration}</span>
                      </div>
                    </div>
                    <div style={{ ...styles.checkbox, background: done ? CATEGORY_COLORS[cat] : "transparent", borderColor: done ? CATEGORY_COLORS[cat] : "#475569" }}>
                      {done && <span style={{ color: "#fff", fontSize: 14, lineHeight: 1 }}>✓</span>}
                    </div>
                  </div>
                  <p style={styles.habitDesc}>{habit.description}</p>
                  <p style={styles.stackLabel}>↳ Stack on: <em>{habit.stackOn}</em></p>
                </button>
              );
            })}
          </div>
        );
      })}

      {/* Journal */}
      <div style={styles.journalSection}>
        <button onClick={() => setShowJournal(!showJournal)} style={styles.journalToggle}>
          <span>📓 Evening Journal</span>
          <span style={{ color: "#64748B" }}>{showJournal ? "▲" : "▼"}</span>
        </button>
        {showJournal && (
          <div style={{ padding: "0 16px 16px" }}>
            <p style={{ fontSize: 12, color: "#64748B", marginBottom: 8 }}>
              How are you feeling? What's weighing on you? What can you let go of?
            </p>
            <textarea value={journalInput} onChange={(e) => setJournalInput(e.target.value)} placeholder="Write freely..." style={styles.journalArea} rows={4} />
            <button onClick={handleJournalSave} style={styles.saveBtn}>Save</button>
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div style={{ display: "flex", justifyContent: "center", gap: 24, marginTop: 24, paddingBottom: 40 }}>
        <button onClick={resetAll} style={styles.resetBtn}>Reset data</button>
        <button onClick={onSignOut} style={styles.resetBtn}>Sign out</button>
      </div>
    </div>
  );
}

// ── Styles ──────────────────────────────────────────────────────────
const styles = {
  container: { fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif", maxWidth: 480, margin: "0 auto", padding: "24px 16px", background: "#0F172A", minHeight: "100vh", color: "#E2E8F0" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 },
  title: { fontSize: 28, fontWeight: 300, color: "#F1F5F9", margin: 0, letterSpacing: "0.04em" },
  subtitle: { fontSize: 13, color: "#64748B", margin: "4px 0 0", letterSpacing: "0.02em" },
  streakBadge: { display: "flex", flexDirection: "column", alignItems: "center", background: "#1E293B", borderRadius: 12, padding: "10px 16px", minWidth: 56 },
  streakNum: { fontSize: 24, fontWeight: 700, color: "#E8A838", lineHeight: 1 },
  streakLabel: { fontSize: 10, color: "#64748B", marginTop: 2, textTransform: "uppercase", letterSpacing: "0.05em" },
  weekRow: { display: "flex", gap: 6, marginBottom: 24, justifyContent: "space-between" },
  dayBtn: { display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "8px 10px", borderRadius: 10, cursor: "pointer", flex: 1, border: "none", outline: "none", fontFamily: "inherit" },
  dayDot: { width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" },
  progressSection: { marginBottom: 28 },
  progressHeader: { display: "flex", justifyContent: "space-between", marginBottom: 8 },
  dayTitle: { fontSize: 16, fontWeight: 600, color: "#CBD5E1" },
  progressPct: { fontSize: 14, color: "#64748B", fontWeight: 500 },
  progressTrack: { height: 6, background: "#1E293B", borderRadius: 3, overflow: "hidden" },
  progressFill: { height: "100%", background: "linear-gradient(90deg, #5BA67D, #E8A838)", borderRadius: 3, transition: "width 0.4s ease" },
  catHeader: { display: "flex", alignItems: "center", gap: 8, marginBottom: 10, paddingLeft: 4 },
  catDot: { width: 8, height: 8, borderRadius: "50%" },
  catLabel: { fontSize: 12, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.08em" },
  habitCard: { display: "block", width: "100%", textAlign: "left", background: "#1E293B", borderRadius: 12, padding: "14px 16px", marginBottom: 8, cursor: "pointer", border: "none", outline: "none", transition: "transform 0.15s ease", fontFamily: "inherit" },
  habitTop: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  habitLeft: { display: "flex", alignItems: "center", gap: 12 },
  habitName: { display: "block", fontSize: 15, fontWeight: 600, transition: "color 0.2s" },
  habitDuration: { display: "block", fontSize: 11, color: "#64748B", marginTop: 1 },
  checkbox: { width: 24, height: 24, borderRadius: 7, border: "2px solid", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s", flexShrink: 0 },
  habitDesc: { fontSize: 12, color: "#94A3B8", margin: "8px 0 4px 34px", lineHeight: 1.4 },
  stackLabel: { fontSize: 11, color: "#475569", margin: "0 0 0 34px" },
  journalSection: { background: "#1E293B", borderRadius: 12, marginTop: 8, overflow: "hidden" },
  journalToggle: { display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", padding: "14px 16px", background: "transparent", border: "none", color: "#CBD5E1", fontSize: 15, fontWeight: 600, cursor: "pointer", outline: "none", fontFamily: "inherit" },
  journalArea: { width: "100%", background: "#0F172A", border: "1px solid #334155", borderRadius: 8, padding: 12, color: "#E2E8F0", fontSize: 14, resize: "vertical", outline: "none", fontFamily: "inherit", boxSizing: "border-box" },
  saveBtn: { marginTop: 8, padding: "8px 20px", background: "#5BA67D", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },
  resetBtn: { background: "transparent", border: "none", color: "#475569", fontSize: 12, cursor: "pointer", textDecoration: "underline", fontFamily: "inherit" },
};
