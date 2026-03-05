"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

console.log("SUPABASE URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log("SUPABASE KEY exists:", !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("register");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      // Read body ONCE, as text (works whether server returns JSON or not)
      const text = await res.text();

      if (!res.ok) {
        // Show something useful even if server returned HTML/plain text
        setError(text || `Authentication failed (${res.status})`);
        return;
      }

      router.push("/");
      router.refresh();
    } catch (err: any) {
      console.error("SUBMIT ERROR", err);
      setError(err?.message || String(err) || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 40, maxWidth: 420 }}>
      <h1>{mode === "login" ? "Login" : "Register"}</h1>

      <div style={{ margin: "12px 0" }}>
        <button
          type="button"
          onClick={() => setMode("register")}
          disabled={loading}
          style={{ marginRight: 8 }}
        >
          Register
        </button>
        <button type="button" onClick={() => setMode("login")} disabled={loading}>
          Login
        </button>
      </div>

      <form onSubmit={onSubmit}>
        <label>
          Username
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={{ display: "block", width: "100%", margin: "6px 0 12px" }}
            autoComplete="username"
          />
        </label>

        <label>
          Password
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            style={{ display: "block", width: "100%", margin: "6px 0 12px" }}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
          />
        </label>

        <button type="submit" disabled={loading || !username || !password}>
          {loading ? "Working…" : mode === "login" ? "Login" : "Register"}
        </button>
      </form>

      {error && (
        <p style={{ marginTop: 12, color: "crimson", whiteSpace: "pre-wrap" }}>
          {error}
        </p>
      )}
    </div>
  );
}

