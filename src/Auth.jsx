import { useState } from "react";
import { supabase } from "./supabaseClient";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
    setLoading(false);
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Stillpoint</h1>
        <p style={styles.subtitle}>Your daily mental wellness practice</p>

        {sent ? (
          <div style={styles.sentBox}>
            <span style={{ fontSize: 32 }}>📬</span>
            <p style={styles.sentText}>
              Check your email for a magic link to sign in.
            </p>
            <button onClick={() => setSent(false)} style={styles.backBtn}>
              Try a different email
            </button>
          </div>
        ) : (
          <>
            <p style={styles.desc}>
              Sign in to sync your wellness data across all your devices.
            </p>
            <div>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin(e)}
                style={styles.input}
                autoFocus
              />
              <button
                onClick={handleLogin}
                disabled={loading || !email}
                style={{
                  ...styles.btn,
                  opacity: loading || !email ? 0.5 : 1,
                }}
              >
                {loading ? "Sending…" : "Send magic link"}
              </button>
            </div>
            {error && <p style={styles.error}>{error}</p>}
          </>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif",
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#0F172A",
    padding: 20,
  },
  card: {
    background: "#1E293B",
    borderRadius: 16,
    padding: "48px 36px",
    maxWidth: 400,
    width: "100%",
    textAlign: "center",
  },
  title: {
    fontSize: 32,
    fontWeight: 300,
    color: "#F1F5F9",
    margin: 0,
    letterSpacing: "0.04em",
  },
  subtitle: {
    fontSize: 14,
    color: "#64748B",
    margin: "6px 0 28px",
    letterSpacing: "0.02em",
  },
  desc: {
    fontSize: 13,
    color: "#94A3B8",
    marginBottom: 20,
    lineHeight: 1.5,
  },
  input: {
    width: "100%",
    padding: "12px 16px",
    background: "#0F172A",
    border: "1px solid #334155",
    borderRadius: 10,
    color: "#E2E8F0",
    fontSize: 15,
    outline: "none",
    fontFamily: "inherit",
    marginBottom: 12,
    boxSizing: "border-box",
  },
  btn: {
    width: "100%",
    padding: "12px 20px",
    background: "#5BA67D",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  error: {
    color: "#EF4444",
    fontSize: 13,
    marginTop: 12,
  },
  sentBox: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 12,
    padding: "20px 0",
  },
  sentText: {
    color: "#CBD5E1",
    fontSize: 15,
    lineHeight: 1.5,
  },
  backBtn: {
    background: "transparent",
    border: "none",
    color: "#64748B",
    fontSize: 13,
    cursor: "pointer",
    textDecoration: "underline",
    fontFamily: "inherit",
    marginTop: 4,
  },
};
